import assert from 'node:assert/strict';
import { categories, createScorer, detectorVersion, rubricVersion } from '../extension/scorer.mjs';
import { cases } from './cases.mjs';

const kinds = ['concern', 'helpful', 'repair'];
const categoryIds = Object.keys(categories);
const keys = categoryIds.flatMap(category => kinds.map(kind => `${category}/${kind}`));
const keyOf = ({ category, kind }) => `${category}/${kind}`;
const caseIds = new Set();
const totals = Object.fromEntries(keys.map(key => [key, { tp: 0, fp: 0, fn: 0 }]));
const evidence = { behavior: { total: 0, exact: 0, overlap: 0 }, context: { total: 0, exact: 0, overlap: 0 } };
const repairs = { expected: 0, correct: 0, incorrect: 0, missed: 0 };
const uncertainty = { targets: 0, noSignal: 0 };
const disagreements = [];
let turns = 0;
let targets = 0;
let exactTargets = 0;
let invalidSpans = 0;
let falseAlerts = 0;
let falseAlertConversations = 0;
let benignConversations = 0;
let benignAlertConversations = 0;

function referenceSpan(test, turn, quote) {
  const text = test.turns[turn - 1]?.text;
  const start = text?.indexOf(quote);
  assert(quote && start >= 0 && text.indexOf(quote, start + 1) === -1,
    `${test.id}: reference quote must occur exactly once on turn ${turn}`);
  return { turnId: String(turn), start, end: start + quote.length };
}

function compareEvidence(test, target, expected, predicted) {
  const needs = [
    { role: expected.kind === 'repair' ? 'repair' : 'behavior', bucket: 'behavior', span: referenceSpan(test, target, expected.quote) },
  ];
  if (expected.context) {
    const { turn, quote } = expected.context;
    needs.push({ role: 'context', bucket: 'context', span: referenceSpan(test, turn, quote) });
  }
  for (const { role, bucket, span } of needs) {
    const sameTurn = predicted?.evidence.filter(item => item.role === role && item.turnId === span.turnId) ?? [];
    evidence[bucket].total++;
    if (sameTurn.some(item => item.start === span.start && item.end === span.end)) evidence[bucket].exact++;
    if (sameTurn.some(item => item.start < span.end && item.end > span.start)) evidence[bucket].overlap++;
  }
}

for (const test of cases) {
  assert(!caseIds.has(test.id), `Duplicate case id ${test.id}`);
  caseIds.add(test.id);
  const scorer = createScorer({ conversationId: test.id });
  const benign = !test.turns.some(turn => turn.expected?.some(({ kind }) => kind === 'concern') || turn.uncertain?.length);
  if (benign) benignConversations++;
  let conversationFalseAlerts = 0;
  let priorState = scorer.snapshot();
  for (const [index, turn] of test.turns.entries()) {
    const target = index + 1;
    const id = String(target);
    const state = scorer.push({ id, role: turn.role, text: turn.text });
    turns++;
    assert.deepEqual(state.assessments.slice(0, -1), priorState.assessments, `${test.id}: mutated an earlier assessment`);
    assert(state.observations.length >= priorState.observations.length, `${test.id}: lost an earlier finding`);
    priorState = state;
    const latest = state.assessments.at(-1);
    assert.equal(latest.assessedThroughTurnId, id);
    assert.equal(state.turns.length, target);
    const found = state.observations.filter(item => item.turnId === id);
    if (turn.role === 'user') {
      assert.equal(latest.status, 'context-only');
      assert.deepEqual(found, []);
      continue;
    }

    const expected = new Map(turn.expected.map(item => [keyOf(item), item]));
    const predicted = new Map(found.map(item => [keyOf(item), item]));
    assert.equal(expected.size, turn.expected.length, `${test.id}: duplicate reference labels`);
    assert.equal(predicted.size, found.length, `${test.id}: duplicate predictions`);
    assert([...expected.keys(), ...predicted.keys()].every(key => keys.includes(key)), `${test.id}: unknown label`);
    const uncertain = turn.uncertain ?? [];
    assert(uncertain.every(category => categoryIds.includes(category)));
    if (uncertain.length) {
      uncertainty.targets++;
      if (found.every(item => !uncertain.includes(item.category))) uncertainty.noSignal++;
    }

    const missing = [];
    const extra = [];
    for (const key of keys) {
      const reference = expected.get(key);
      const prediction = predicted.get(key);
      if (uncertain.includes(key.split('/')[0])) {
        assert(!reference, `${test.id}: label marked both positive and uncertain`);
        continue;
      }
      if (reference) {
        totals[key][prediction ? 'tp' : 'fn']++;
        if (!prediction) missing.push(key);
        compareEvidence(test, target, reference, prediction);
      } else if (prediction) {
        totals[key].fp++;
        extra.push(key);
        if (prediction.kind === 'concern') conversationFalseAlerts++;
      }
    }
    for (const item of found) {
      for (const span of item.evidence) {
        const source = state.turns.find(candidate => candidate.id === span.turnId);
        if (!source || source.revision !== span.turnRevision || !Number.isInteger(span.start) ||
            !Number.isInteger(span.end) || span.start < 0 || span.end <= span.start ||
            span.end > source.text.length || source.text.slice(span.start, span.end) !== span.quote ||
            (span.role === 'context' ? source.role !== 'user' : source.role !== 'assistant')) invalidSpans++;
      }
    }

    for (const item of turn.expected.filter(entry => entry.kind === 'repair')) {
      repairs.expected++;
      const original = test.turns[item.repairs - 1];
      assert(item.repairs < target && original?.expected?.some(entry => entry.category === item.category && entry.kind === 'concern'),
        `${test.id}: invalid repair target`);
      const repair = predicted.get(keyOf(item));
      const prior = state.observations.find(entry => entry.id === repair?.linkedConcernId);
      if (!repair) repairs.missed++;
      else if (prior?.turnId === String(item.repairs) && prior.category === item.category &&
          prior.state === 'addressed' && prior.addressedBy === repair.id) repairs.correct++;
      else repairs.incorrect++;
    }
    repairs.incorrect += found.filter(item => item.kind === 'repair' && !expected.has(keyOf(item))).length;

    if (!uncertain.length) {
      targets++;
      if (!missing.length && !extra.length) exactTargets++;
    }
    if (missing.length || extra.length) disagreements.push({ case: test.id, turn: target, missing, extra });
  }
  if (conversationFalseAlerts) {
    falseAlertConversations++;
    if (benign) benignAlertConversations++;
  }
  falseAlerts += conversationFalseAlerts;
}

const ratio = (value, total) => total ? value / total : null;
const metrics = ({ tp, fp, fn }) => ({
  support: tp + fn, tp, fp, fn, precision: ratio(tp, tp + fp),
  recall: ratio(tp, tp + fn), f1: ratio(2 * tp, 2 * tp + fp + fn),
});
const summary = {
  detectorVersion, rubricVersion, collection: 'Synthetic prefix challenge pilot',
  conversations: cases.length, turns, assistantTargets: targets + uncertainty.targets, exactTargets,
  comparableTargets: targets, perCode: Object.fromEntries(keys.map(key => [key, metrics(totals[key])])),
  evidence, invalidSpans, repairs, uncertainty,
  falseAlerts: { count: falseAlerts, conversations: falseAlertConversations, benignConversations, benignAlertConversations },
  disagreements,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  const percent = value => value === null ? '—' : `${Math.round(100 * value)}%`;
  console.log(`${summary.collection} · ${summary.conversations} conversations · ${summary.assistantTargets} assistant targets`);
  console.log(`Exact label sets: ${exactTargets}/${targets} comparable targets`);
  console.table(Object.fromEntries(Object.entries(summary.perCode).map(([key, row]) => [key, {
    ...row, precision: percent(row.precision), recall: percent(row.recall), f1: percent(row.f1),
  }])));
  console.log('Evidence across all reference findings (missed findings count against coverage):', evidence);
  console.log(`Invalid emitted spans: ${invalidSpans} · Repairs: ${repairs.correct}/${repairs.expected} linked, ${repairs.incorrect} incorrect`);
  console.log(`False concerns: ${falseAlerts} across ${falseAlertConversations} conversations, ${benignAlertConversations}/${benignConversations} benign conversations affected`);
  console.log(`Uncertain targets with no signal in the uncertain category: ${uncertainty.noSignal}/${uncertainty.targets}`);
  for (const item of disagreements) {
    console.log(`- ${item.case}, turn ${item.turn}: ${[
      ...item.missing.map(key => `missed ${key}`), ...item.extra.map(key => `extra ${key}`),
    ].join(', ')}`);
  }
}

if (invalidSpans) process.exitCode = 1;
