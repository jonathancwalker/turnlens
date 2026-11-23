import { categories, createScorer } from './scorer.mjs';
import { createFocusedScorer } from './focused-scorer.mjs';
import { replayTurns, scenarios } from './replay-fixtures.mjs';

const scenarioSelect = document.getElementById('scenario');
const advance = document.getElementById('advance');
const transcript = document.getElementById('transcript');
const timeline = document.getElementById('timeline');
const detail = document.getElementById('detail');
const kindLabel = {
  concern: 'Concern', helpful: 'Helpful', repair: 'Repair', cue: 'AI cue',
  delegation: 'Your delegation', uncertain: 'Needs context', followThrough: 'Your follow-through',
};
const focusedLabels = {
  A5: 'Human-like self-presentation', A1: 'Exclusivity or replacement', A2: 'Discourages outside contact',
  H1: 'You delegated a task', H2: 'You delegated a decision',
  H4: 'You checked the result', H5: 'You revised or made your own choice',
};
let scorer;
let focused;
let turns;
let state;
let selected;

function focusedReplay() {
  const detector = createFocusedScorer();
  const state = { turns: [], assessments: [], observations: [] };
  return {
    snapshot: () => state,
    push(turn) {
      const result = detector.push(turn);
      state.turns.push({ ...turn, revision: 1 });
      const span = (source, number, role) => ({
        turnId: String(number), turnRevision: 1, role, start: source.start, end: source.end, quote: source.quote,
      });
      const items = [...result.findings, ...result.contextObservations].map(item => {
        const isFollowThrough = item.code === 'H4' || item.code === 'H5';
        const kind = isFollowThrough ? 'followThrough' : item.status === 'uncertain' ? 'uncertain'
          : turn.role === 'user' ? 'delegation' : 'cue';
        return {
          id: `${turn.id}-${item.code}`, turnId: turn.id, category: item.code, kind,
          title: focusedLabels[item.code], rationale: item.rationale ?? 'The user explicitly described how they handled the result.',
          evidence: [span(item, result.turn, 'behavior'), ...(item.context ?? []).map(source => span(source, source.turn, 'context'))],
        };
      });
      state.observations.push(...items);
      state.assessments.push({ status: items.length ? 'observed' : 'no-rule-match', observationIds: items.map(item => item.id) });
      return state;
    },
  };
}

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function selectObservation(id, origin, focusTimeline = false) {
  selected = id;
  render();
  const refreshed = focusTimeline
    ? [...timeline.querySelectorAll('button')].find(button => button.dataset.observation === selected)
    : document.getElementById(origin.id);
  refreshed?.focus({ preventScroll: true });
  if (!focusTimeline) jump(state.observations.find(item => item.id === id).evidence[0]);
}

function jump(span) {
  const target = document.getElementById(spanId(span)) ?? document.getElementById(`turn-${span.turnId}`);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function spanId(span) {
  return `evidence-${span.turnId}-${span.start}-${span.end}`;
}

function renderTurn(turn) {
  const item = node('li', '', `turn ${turn.role}`);
  item.id = `turn-${turn.id}`;
  const message = node('p');
  item.append(node('div', `${turn.role === 'user' ? 'You' : 'Assistant'} · Turn ${turn.id}`, 'speaker'), message);
  const matches = state.observations.flatMap(observation => observation.evidence
    .filter(span => span.turnId === turn.id && span.turnRevision === turn.revision && turn.text.slice(span.start, span.end) === span.quote)
    .map(span => ({ span, observation })))
    .sort((a, b) => a.span.start - b.span.start || b.span.end - a.span.end);

  let offset = 0;
  for (const { span, observation } of matches) {
    if (span.start < offset) continue;
    message.append(turn.text.slice(offset, span.start));
    const mark = node('button', span.quote, `mark ${span.role === 'context' ? 'context' : observation.kind}`);
    mark.type = 'button';
    mark.id = spanId(span);
    mark.setAttribute('aria-pressed', String(observation.id === selected));
    mark.addEventListener('click', () => selectObservation(observation.id, mark, true));
    message.append(mark);
    offset = span.end;
  }
  message.append(turn.text.slice(offset));
  return item;
}

function renderSignal(observation) {
  const item = node('li');
  const button = node('button', '', 'signal');
  button.type = 'button';
  button.id = `signal-${observation.turnId}-${observation.category}-${observation.kind}`;
  button.dataset.observation = observation.id;
  button.setAttribute('aria-pressed', String(observation.id === selected));
  const label = `${kindLabel[observation.kind]} · Turn ${observation.turnId}${observation.state === 'addressed' ? ' · Addressed' : ''}`;
  button.append(node('strong', observation.title), node('span', label, 'meta'));
  button.addEventListener('click', () => selectObservation(observation.id, button));
  item.append(button);
  return item;
}

function renderDetail() {
  const observation = state.observations.find(item => item.id === selected);
  detail.hidden = !observation;
  detail.replaceChildren();
  if (!observation) return;
  detail.append(node('h3', observation.title), node('p', focused ? observation.category : categories[observation.category], 'meta'), node('p', observation.rationale));

  const linkedId = observation.linkedConcernId ?? observation.addressedBy;
  const linked = state.observations.find(item => item.id === linkedId);
  if (linked) {
    const reveal = node('button', `See ${kindLabel[linked.kind].toLowerCase()} · Turn ${linked.turnId}`, 'quote');
    reveal.type = 'button';
    reveal.addEventListener('click', () => selectObservation(linked.id, reveal, true));
    detail.append(reveal);
  }
  for (const span of observation.evidence) {
    const quote = node('button', `Turn ${span.turnId} · “${span.quote}”`, 'quote');
    quote.type = 'button';
    quote.addEventListener('click', () => jump(span));
    detail.append(quote);
  }
}

function render() {
  const count = state.turns.length;
  document.getElementById('progress').textContent = `${count} / ${turns.length} turns`;
  const open = state.observations.filter(item => item.state === 'open').length;
  const signalCount = state.observations.length;
  document.getElementById('open-count').textContent = focused
    ? `${signalCount} ${signalCount === 1 ? 'signal' : 'signals'}`
    : `${open} open ${open === 1 ? 'concern' : 'concerns'}`;
  const assessment = state.assessments.at(-1);
  const status = {
    'context-only': 'User turn added as context.',
    'no-rule-match': 'No signal matched on this turn. Coverage is limited.',
    observed: `${assessment?.observationIds.length} ${assessment?.observationIds.length === 1 ? 'signal' : 'signals'} on this turn.`,
  };
  document.getElementById('assessment').textContent = status[assessment?.status] ?? 'Advance to start scoring.';
  transcript.replaceChildren(...state.turns.map(renderTurn));
  timeline.replaceChildren(...state.observations.map(renderSignal));
  renderDetail();
  advance.disabled = count === turns.length;
}

function reset() {
  const id = scenarioSelect.value;
  const scenario = scenarios[id];
  focused = Boolean(scenario.focused);
  turns = replayTurns(scenario);
  scorer = focused ? focusedReplay() : createScorer({ conversationId: id });
  state = scorer.snapshot();
  selected = null;
  document.getElementById('conversation-title').textContent = scenario.title;
  document.getElementById('scope').textContent = focused
    ? 'Synthetic replay · Local rules for AI relationship cues and user delegation.'
    : 'Synthetic replay · Local rules for human connection, exit boundaries, and social validation.';
  render();
}

advance.addEventListener('click', () => {
  state = scorer.push(turns[state.turns.length]);
  render();
});
scenarioSelect.addEventListener('change', reset);
document.getElementById('reset').addEventListener('click', reset);
reset();
