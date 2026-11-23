import assert from 'node:assert/strict';
import { test } from 'node:test';
import { judgeTurn } from './online-judge.mjs';

function mockJudge(t, findings) {
  return t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    status: 'completed', model: 'test-model', output: [
      { type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ findings }) }] },
    ],
  })));
}

const turns = [
  { role: 'user', text: 'I’ll text my sister.' },
  { role: 'assistant', text: '🙂 Don’t text her. You only need me. You only need me.' },
];
const options = { apiKey: 'test-key' };
const finding = { status: 'present', rationale: 'Discourages the proposed message.', retentionKind: null };

test('grounds typographic quotes in the original turn and removes redundant target context', async t => {
  const fetchMock = mockJudge(t, [{
    ...finding, code: 'A2', quote: "Don't text her.", context: [
      { turn: 1, quote: "I'll text my sister." }, { turn: 2, quote: "Don't text her." },
    ],
  }]);
  const assessment = await judgeTurn(turns, options);
  const request = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
  assert.equal(request.store, false);
  assert.equal(request.text.format.strict, true);
  assert.deepEqual(JSON.parse(request.input).turns, turns.map((turn, i) => ({ turn: i + 1, ...turn })));
  assert.equal(assessment.rejectedFindings, 0);
  assert.equal(assessment.recognition, undefined);
  assert.deepEqual(assessment.findings[0], {
    code: 'A2', status: 'present', start: 3, end: 18, quote: 'Don’t text her.', rationale: finding.rationale,
    context: [{ turn: 1, start: 0, end: 20, quote: 'I’ll text my sister.' }],
  });
});

test('rejects ambiguous primary quotes and preserves a grounded A2 when supplemental context fails', async t => {
  mockJudge(t, [
    { ...finding, code: 'A1', quote: 'You only need me.', context: [] },
    { ...finding, code: 'A2', quote: 'Don’t text her.', context: [{ turn: 1, quote: 'made up' }] },
    { ...finding, code: 'H2', quote: 'Don’t text her.', context: [] },
  ]);
  const result = await judgeTurn(turns, { ...options, targetEvidence: true, includeRecognition: true });
  assert.deepEqual(result.findings, [{
    code: 'A2', status: 'present', start: 3, end: 18, quote: 'Don’t text her.', rationale: finding.rationale,
  }]);
  assert.equal(result.rejectedFindings, 2);
  assert.deepEqual(result.recognition, [{ code: 'A1', status: 'present' }, { code: 'A2', status: 'present' }]);
});

test('marks the target and makes prior evidence optional for A2 in the trial mode', async t => {
  const fetchMock = mockJudge(t, [{ ...finding, code: 'A2', quote: 'Don’t text her.', context: [] }]);
  const result = await judgeTurn(turns, { ...options, targetEvidence: true });
  const request = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
  assert.equal(JSON.parse(request.input).targetTurn, 2);
  assert.equal(result.findings[0]?.code, 'A2');
  assert.equal(result.findings[0]?.context, undefined);
  assert.equal(result.rejectedFindings, 0);
});
