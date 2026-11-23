import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFocusedScorer } from '../extension/focused-scorer.mjs';

const path = process.argv[2];
if (!path) throw Error('Usage: node benchmark/run-retention.mjs /path/to/retention-review.json | --challenge');
const challenge = path === '--challenge';
const packetName = challenge ? 'retention-challenge.json' : 'retention-pilot.json';
const packet = JSON.parse(await readFile(new URL(packetName, import.meta.url), 'utf8'));
const review = challenge ? {
  traceFile: packetName, version: packet.version,
  targets: packet.conversations.map(({ id, turns, reference }) => ({
    conversationId: id, assessedThroughTurn: turns.at(-1).turn, role: 'assistant',
    decisions: { A7: reference.status },
    evidence: reference.status === 'present' ? [{ ...reference, code: 'A7' }] : [],
  })),
} : JSON.parse(await readFile(path, 'utf8'));
assert.equal(review.traceFile, packetName);
assert.equal(review.version, packet.version);
assert(Array.isArray(review.targets), 'Review targets are missing');

const counts = { reviewed: 0, exactDecision: 0, present: 0, detected: 0, absent: 0, correctAbsent: 0,
  uncertain: 0, silentOnUncertain: 0, subtypeMatch: 0, quoteOverlap: 0 };
const bySubtype = { invitation: { expected: 0, matched: 0 }, pressure: { expected: 0, matched: 0 } };
const mismatches = [];
const seen = new Set();
for (const row of review.targets) {
  assert(!seen.has(row.conversationId), 'Duplicate review target');
  seen.add(row.conversationId);
  const conversation = packet.conversations.find(item => item.id === row.conversationId);
  const target = conversation?.turns.at(-1);
  assert(target?.role === 'assistant' && row.role === target.role && row.assessedThroughTurn === target.turn, 'Invalid review target');
  const expected = row.decisions?.A7;
  if (expected === null || expected === 'not_assessed') continue;
  assert(['present', 'absent', 'uncertain'].includes(expected), 'Invalid A7 decision');

  const scorer = createFocusedScorer({ includeRetention: true });
  let assessment;
  for (const turn of conversation.turns) assessment = scorer.push(turn);
  const finding = assessment.findings.find(item => item.code === 'A7');
  const output = finding?.status ?? 'no-signal';
  counts.reviewed++;
  counts[expected]++;
  counts.exactDecision += Number((expected === 'absent' ? 'no-signal' : expected) === output);
  if (expected === 'absent') counts.correctAbsent += Number(output === 'no-signal');
  if (expected === 'uncertain') counts.silentOnUncertain += Number(output === 'no-signal');

  const reference = row.evidence.find(item => item.code === 'A7');
  if (expected === 'present') {
    assert(reference?.quote && target.text.includes(reference.quote), 'Missing or invalid reference evidence');
    assert(['invitation', 'pressure'].includes(reference.retentionKind), 'Invalid reference subtype');
    const subtype = bySubtype[reference.retentionKind];
    subtype.expected++;
    subtype.matched += Number(finding?.retentionKind === reference.retentionKind);
    counts.detected += Number(output === 'present');
    counts.subtypeMatch += Number(finding?.retentionKind === reference.retentionKind);
    const start = target.text.indexOf(reference.quote);
    counts.quoteOverlap += Number(Boolean(finding && finding.start < start + reference.quote.length && finding.end > start));
  }
  if (finding) {
    assert.equal(target.text.slice(finding.start, finding.end), finding.quote);
    for (const span of finding.context ?? []) {
      assert(span.turn < target.turn, 'Evidence uses future context');
      assert.equal(conversation.turns[span.turn - 1].text.slice(span.start, span.end), span.quote);
    }
  }
  if ((expected === 'absent' ? 'no-signal' : expected) !== output ||
      (expected === 'present' && finding?.retentionKind !== reference.retentionKind)) {
    mismatches.push({ id: row.conversationId, expected, output,
      expectedSubtype: reference?.retentionKind ?? null, predictedSubtype: finding?.retentionKind ?? null });
  }
}
console.log(JSON.stringify({
  reference: challenge ? packet.reference : 'Single reviewer, synthetic development pilot',
  totalTargets: packet.conversations.length,
  ...counts,
  bySubtype,
  mismatches,
}, null, 2));
