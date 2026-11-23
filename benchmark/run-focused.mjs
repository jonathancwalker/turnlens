import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { createFocusedScorer, focusedCodesBySpeaker, focusedDetectorVersion } from '../extension/focused-scorer.mjs';

const args = process.argv.slice(2);
function argument(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw Error(`Expected a file after ${flag}`);
  return value;
}
const packetPath = argument('--packet');
const reviewPath = argument('--review');
const pilot = JSON.parse(await readFile(packetPath ?? new URL('focused-pilot.json', import.meta.url), 'utf8'));
const review = reviewPath ? JSON.parse(await readFile(reviewPath, 'utf8')) : null;
const key = (id, turn) => JSON.stringify([id, turn]);
const allowed = new Map(
  pilot.conversations.flatMap(c => c.turns.map(t => [key(c.id, t.turn), t.role])),
);
const provided = new Map();
if (review) {
  assert.equal(review.traceFile, packetPath ? basename(packetPath) : 'focused-pilot.json', 'Review and trace packet differ');
  assert.equal(review.version, pilot.version, 'Review packet version differs');
  assert(Array.isArray(review.targets), 'Review targets are missing');
  for (const row of review.targets) {
    const id = key(row.conversationId, row.assessedThroughTurn);
    assert(allowed.has(id), 'Unknown review target');
    assert(!provided.has(id), 'Duplicate review target');
    assert.equal(row.role, allowed.get(id), 'Incorrect role in review target');
    assert(row.decisions && typeof row.decisions === 'object', 'Missing decision map');
    for (const [code, status] of Object.entries(row.decisions)) {
      assert(pilot.codesBySpeaker[row.role].includes(code), 'Code does not apply to this speaker');
      assert([null, 'not_assessed', 'present', 'absent', 'uncertain'].includes(status), 'Invalid review decision');
    }
    provided.set(id, row);
  }
}
for (const [role, codes] of Object.entries(pilot.codesBySpeaker)) {
  assert.deepEqual([...focusedCodesBySpeaker[role]].sort(), [...codes].sort(), 'Scorer and packet codes differ');
}

const metrics = Object.fromEntries(Object.values(pilot.codesBySpeaker).flat().map(code => [
  code, { tp: 0, fp: 0, fn: 0, correctAbsent: 0, expectedUncertain: 0, predictedUncertainOnUncertain: 0,
    silentOnUncertain: 0, decisiveOnUncertain: 0, unexpectedUncertain: 0, unreviewed: 0 },
]));
const evidence = { target: { exact: 0, overlap: 0, total: 0 }, context: { exact: 0, overlap: 0, total: 0 } };
const disagreements = [];
let totalTargets = 0;
let reviewedTargets = 0;
let emittedSpans = 0;
let exactTargets = 0;
let fullyReviewedTargets = 0;

function compareSpan(bucket, reference, prediction, text) {
  assert(typeof reference === 'string' && reference.length > 0 && text?.includes(reference),
    'Reference quote is missing from its source turn');
  bucket.total++;
  if (!prediction.length) return;
  let start = text.indexOf(reference);
  let exact = false;
  let overlap = false;
  while (start !== -1) {
    const end = start + reference.length;
    exact ||= prediction.some(span => span.start === start && span.end === end);
    overlap ||= prediction.some(span => span.start < end && span.end > start);
    start = text.indexOf(reference, start + 1);
  }
  bucket.exact += Number(exact);
  bucket.overlap += Number(overlap);
}

function assertSpan(span, turn, label) {
  assert(turn && Number.isInteger(span.start) && Number.isInteger(span.end) &&
    span.start >= 0 && span.end <= turn.text.length && span.end > span.start &&
    turn.text.slice(span.start, span.end) === span.quote, label + ': invalid emitted source span');
  emittedSpans++;
}

for (const conversation of pilot.conversations) {
  const scorer = createFocusedScorer();
  assert.equal(conversation.targets.length, conversation.turns.length, 'Missing reference target');
  for (const [index, turn] of conversation.turns.entries()) {
    totalTargets++;
    const label = `${conversation.id}/${turn.turn}`;
    const assessment = scorer.push({ role: turn.role, text: turn.text });
    assert.equal(assessment.turn, turn.turn, label);
    assert.equal(assessment.role, turn.role, label);
    const predictions = new Map(assessment.findings.map(item => [item.code, item]));
    const applicable = pilot.codesBySpeaker[turn.role];
    assert.equal(predictions.size, assessment.findings.length, label + ': duplicate findings');
    for (const finding of assessment.findings) {
      assert(applicable.includes(finding.code) && ['present', 'uncertain'].includes(finding.status), label + ': invalid code or status');
      assertSpan(finding, turn, label);
      for (const span of finding.context ?? []) {
        assert(Number.isInteger(span.turn) && span.turn < turn.turn, label + ': invalid prefix reference');
        assertSpan(span, conversation.turns[span.turn - 1], label);
      }
    }
    for (const observation of assessment.contextObservations) assertSpan(observation, turn, label);

    const exportedRow = provided.get(key(conversation.id, turn.turn));
    const reference = conversation.targets[index];
    assert.equal(reference.turn, turn.turn);
    const quotes = new Map((review ? exportedRow?.evidence ?? [] : reference.findings).map(item => [item.code, item]));
    const decisions = applicable.map(code => [code, review
      ? exportedRow?.decisions[code]
      : quotes.get(code)?.status ?? 'absent']);
    const comparable = decisions.filter(([, status]) => ['present', 'absent', 'uncertain'].includes(status));
    if (comparable.length) reviewedTargets++;
    if (comparable.length === applicable.length) fullyReviewedTargets++;
    let exact = true;
    for (const [code, expected] of decisions) {
      const tally = metrics[code];
      const prediction = predictions.get(code);
      const output = prediction?.status ?? 'no-signal';
      if (!['present', 'absent', 'uncertain'].includes(expected)) {
        tally.unreviewed++;
        continue;
      }
      if (expected === 'present') {
        tally[output === 'present' ? 'tp' : 'fn']++;
        const gold = quotes.get(code);
        assert(gold, label + ': reference evidence missing for ' + code);
        const matching = output === 'present' ? [prediction] : [];
        compareSpan(evidence.target, gold.quote, matching, turn.text);
        for (const span of gold.context ?? []) {
          assert(span.turn < turn.turn, label + ': reference uses future context');
          compareSpan(evidence.context, span.quote, (matching[0]?.context ?? []).filter(item => item.turn === span.turn),
            conversation.turns[span.turn - 1]?.text);
        }
      } else if (expected === 'absent') {
        if (output === 'present') tally.fp++;
        else if (output === 'no-signal') tally.correctAbsent++;
        else tally.unexpectedUncertain++;
      } else {
        tally.expectedUncertain++;
        const metric = output === 'uncertain' ? 'predictedUncertainOnUncertain'
          : output === 'no-signal' ? 'silentOnUncertain' : 'decisiveOnUncertain';
        tally[metric]++;
      }
      if (output !== (expected === 'absent' ? 'no-signal' : expected)) {
        exact = false;
        disagreements.push({ conversation: conversation.id, turn: turn.turn, code, expected, output });
      }
    }
    if (comparable.length === applicable.length && exact) exactTargets++;
  }
}
const divide = (numerator, denominator) => denominator ? numerator / denominator : null;
const perCode = Object.fromEntries(Object.entries(metrics).map(([code, row]) => [code, {
  ...row, precision: divide(row.tp, row.tp + row.fp), recall: divide(row.tp, row.tp + row.fn),
}]));
const report = {
  detector: focusedDetectorVersion,
  reference: review ? 'Imported reviewer decisions' : 'Authored synthetic development references',
  conversations: pilot.conversations.length,
  targets: { total: totalTargets, reviewed: reviewedTargets, fullyReviewed: fullyReviewedTargets, exact: exactTargets },
  perCode, evidence, validEmittedSpans: emittedSpans, disagreements,
};
if (args.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`${report.reference} · ${report.detector} · ${reviewedTargets}/${totalTargets} targets reviewed`);
  console.log(`Exact decisions: ${exactTargets}/${fullyReviewedTargets} fully reviewed turns`);
  console.table(perCode);
  console.log('Evidence against present reference labels, including misses:', evidence);
  console.log(`Validated ${emittedSpans} emitted spans against source turns.`);
  for (const item of disagreements) {
    console.log(`- ${item.conversation} turn ${item.turn}: ${item.code} expected ${item.expected}, got ${item.output}`);
  }
}
