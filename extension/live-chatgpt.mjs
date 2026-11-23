const transcriptSelector = '[data-rail-chat-transcript="true"][data-chatgpt-conversation-selection-target]';
const unitSelector = '[data-content-search-unit-key]';
const highlightName = 'conversation-lens-evidence';
const assistantMarks = 'conversation-lens-assistant';
const userMarks = 'conversation-lens-user';
const hoverName = 'conversation-lens-hover';
const blockTags = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'PRE', 'BLOCKQUOTE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TABLE', 'TR']);
const harnessSelector = '[data-lens-transcript]';

function harnessTurns() {
  const transcript = document.querySelector(harnessSelector);
  if (!transcript) return [];
  return [...transcript.children].flatMap(row => {
    const { lensRole: role, lensTurnId: id } = row.dataset;
    const body = row.querySelector('[data-lens-message]');
    if (!id || !body || !['user', 'assistant'].includes(role)) return [];
    const { text } = readText(body);
    return text ? [{ id, role, text, body }] : [];
  });
}

function currentConversation() {
  // ChatGPT first assigns a local-chatgpt ID. Its transcript can retain that
  // provisional identity after the address bar changes to the saved chat.
  return location.pathname.match(/^\/c\/([a-f\d-]+)\/?$/i)?.[1] ?? null;
}

function readText(body) {
  const segments = [];
  let raw = '';

  function lineBreak() {
    if (raw && !raw.endsWith('\n')) raw += '\n';
  }

  function visit(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.data) return;
      segments.push({ node, start: raw.length, end: raw.length + node.data.length });
      raw += node.data;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE ||
        node.matches('button, script, style, [hidden], [aria-hidden="true"]')) return;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    if (node.tagName === 'BR') {
      lineBreak();
      return;
    }
    const block = blockTags.has(node.tagName);
    if (block) lineBreak();
    for (const child of node.childNodes) visit(child);
    if (block) lineBreak();
  }

  visit(body);
  return { text: raw.trim(), segments, leading: raw.length - raw.trimStart().length };
}

function evidenceRange(body, text, start, end) {
  const current = readText(body);
  if (current.text !== text) return null;
  const first = current.leading + start;
  const last = current.leading + end - 1;
  const from = current.segments.find(segment => first >= segment.start && first < segment.end);
  const to = current.segments.find(segment => last >= segment.start && last < segment.end);
  if (!from || !to) return null;
  const range = document.createRange();
  range.setStart(from.node, first - from.start);
  range.setEnd(to.node, last - to.start + 1);
  return range;
}

function transcriptKey(element) {
  return element.getAttribute('data-chatgpt-conversation-selection-target');
}

function readCompletedTurns(transcript) {
  const turns = new Map();
  if (!transcript) return [];

  for (const unit of transcript.querySelectorAll(unitSelector)) {
    const role = unit.getAttribute('data-content-search-unit-key').split(':').at(-1);
    if (role !== 'user' && role !== 'assistant') continue;
    if (role === 'assistant' &&
        unit.closest('[data-talvt-turn-state]')?.getAttribute('data-talvt-turn-state') !== 'complete') continue;
    const body = role === 'user'
      ? unit.querySelector('[data-user-message-bubble] [data-search-result-target]')
      : unit.querySelector('[data-response-body] [data-dil-response]');
    const id = unit.closest('[data-chatgpt-search-message-ids]')
      ?.getAttribute('data-chatgpt-search-message-ids')?.trim().split(/\s+/)[0];
    if (!id || !body?.checkVisibility({ visibilityProperty: true }) || turns.has(id)) continue;
    const { text } = readText(body);
    if (text) turns.set(id, { id, role, text, body });
  }
  return [...turns.values()];
}

export function mountLiveChat({ harness = false } = {}) {
  const runtime = chrome.runtime;
  const getConversation = harness
    ? () => document.querySelector(harnessSelector)?.dataset.conversationId ?? null
    : currentConversation;
  let conversationId = getConversation();
  const provisionalOwners = new Map();
  let allowNewProvisional = !harness && conversationId !== null;
  let enabled = false;
  let following = false;
  let records = [];
  let manualThrough = 0;
  let reviewThrough = 0;
  const assessments = new Map();
  const failures = new Set();
  let pending;
  let scheduled = false;
  let highlightStyle;
  let activeEvidence;
  let markedSpans = [];
  let selectionRequest;
  let selectionSequence = 0;
  let hoverMark;

  function invalidate() {
    try {
      // The sidebar can be closed, or the extension may have just been reloaded.
      runtime.sendMessage({ type: 'live/updated' }).catch(() => {});
    } catch {}
  }

  function clearHighlight() {
    const wasInspecting = Boolean(activeEvidence);
    activeEvidence = undefined;
    CSS.highlights.delete(highlightName);
    document.documentElement.removeAttribute('data-lens-active-role');
    if (harness && wasInspecting) document.dispatchEvent(new CustomEvent('lens:evidence-state', { detail: false }));
  }

  function reset() {
    cancelPending();
    records = [];
    following = false;
    manualThrough = 0;
    reviewThrough = 0;
    assessments.clear();
    failures.clear();
    selectionRequest = undefined;
    clearHighlight();
    paintMarks();
  }

  function syncConversation() {
    const next = getConversation();
    if (conversationId === next) return false;
    // A new chat can keep its temporary root when the saved URL first appears.
    // A saved-to-saved navigation can briefly leave the previous root visible.
    allowNewProvisional = !harness && conversationId === null && next !== null;
    conversationId = next;
    enabled = false;
    reset();
    invalidate();
    return true;
  }

  function resolveTranscript() {
    if (!conversationId) return null;
    const visible = [...document.querySelectorAll(transcriptSelector)].filter(element =>
      element.checkVisibility({ visibilityProperty: true }));
    const exact = visible.find(element => transcriptKey(element) === conversationId);
    if (exact) return exact;
    if (visible.length !== 1) return null;
    const [candidate] = visible;
    const key = transcriptKey(candidate);
    if (!key?.startsWith('local-chatgpt:')) return null;
    if (!provisionalOwners.has(key) && allowNewProvisional) {
      provisionalOwners.set(key, conversationId);
      allowNewProvisional = false;
    }
    return provisionalOwners.get(key) === conversationId ? candidate : null;
  }

  function scan() {
    syncConversation();
    // Associate root identity before consent, without reading message text.
    const transcript = harness ? null : resolveTranscript();
    if (!enabled) return false;
    const next = harness ? harnessTurns() : readCompletedTurns(transcript);
    let shared = 0;
    while (shared < records.length && shared < next.length) {
      const old = records[shared];
      const turn = next[shared];
      if (old.id !== turn.id || old.role !== turn.role || old.text !== turn.text) break;
      shared++;
    }
    const changed = shared !== records.length || shared !== next.length;
    const bodiesChanged = next.some((turn, index) => turn.body !== records[index]?.body);
    if (shared < records.length) {
      if (pending?.index >= shared) cancelPending();
      for (const index of assessments.keys()) if (index >= shared) assessments.delete(index);
      for (const index of failures) if (index >= shared) failures.delete(index);
      manualThrough = Math.min(manualThrough, shared);
      reviewThrough = Math.min(reviewThrough, shared);
      clearHighlight();
    }
    // The host can replace nodes even when the message IDs and text are unchanged.
    records = next;
    if (following) reviewThrough = records.length;
    if (changed || bodiesChanged) paintMarks();
    if (changed) {
      scoreNext();
      invalidate();
    }
    return changed;
  }

  function cancelPending() {
    const previous = pending;
    pending = undefined;
    previous?.port.disconnect();
  }

  function scoreNext() {
    if (!enabled || pending) return;
    for (let index = 0; index < reviewThrough; index++) {
      if (assessments.has(index) || failures.has(index)) continue;
      if (startScore(index)) return;
      failures.add(index);
    }
  }

  function startScore(index) {
    const turns = [];
    let budget = 250_000;
    let first = index;
    for (let prior = index; prior >= 0 && turns.length < 60; prior--) {
      const { role, text } = records[prior];
      const size = new TextEncoder().encode(JSON.stringify({ role, text })).length + 1;
      if (text.length > 32_000 || size > budget) break;
      turns.unshift({ role, text });
      budget -= size;
      first = prior;
    }
    if (!turns.length) return false;
    let port;
    try {
      port = runtime.connect({ name: 'live/judge' });
      const job = { index, port };
      pending = job;
      const finish = ({ assessment } = {}) => {
        if (pending !== job) return;
        scan();
        if (pending !== job) return;
        cancelPending();
        if (assessment?.turn === turns.length && assessment.role === records[index]?.role &&
            Array.isArray(assessment.findings) && Array.isArray(assessment.contextObservations)) {
          assessments.set(index, {
            ...assessment, turn: index + 1,
            findings: assessment.findings.map(item => ({
              ...item, context: item.context?.map(span => ({ ...span, turn: span.turn + first })),
            })),
          });
        } else {
          failures.add(index);
        }
        paintMarks();
        scoreNext();
        invalidate();
      };
      port.onMessage.addListener(finish);
      port.onDisconnect.addListener(() => {
        void runtime.lastError;
        finish();
      });
      port.postMessage({ turns });
      return true;
    } catch {
      if (pending?.port === port) cancelPending();
      return false;
    }
  }

  function snapshot() {
    return {
      enabled, following, conversationId, host: harness ? 'harness' : 'chatgpt',
      turns: records.map(({ id, role, text }, index) => ({ id, role, text, turn: index + 1 })),
      assessments: [...assessments.values()],
      pending: Math.max(0, reviewThrough - assessments.size - failures.size),
      unreviewed: records.length - reviewThrough,
      failures: failures.size,
      failedTurns: [...failures].map(index => index + 1),
      activeEvidence,
      selectionRequest,
    };
  }

  function rangeFor({ turn, id, start, end, quote }) {
    const record = records[turn - 1];
    if (!record || record.id !== id || !Number.isInteger(start) || !Number.isInteger(end) ||
        start < 0 || end <= start || end > record.text.length || record.text.slice(start, end) !== quote) return null;
    return evidenceRange(record.body, record.text, start, end);
  }

  function installHighlightStyle() {
    if (highlightStyle) return;
    highlightStyle = new CSSStyleSheet();
    highlightStyle.replaceSync(`
      ::highlight(${assistantMarks}) { background-color: #68867728; }
      ::highlight(${userMarks}) { background-color: #6396cd25; }
      html[data-lens-active-role="user"] { --clens-active-mark: #75a4d861; }
      ::highlight(${highlightName}) { background-color: var(--clens-active-mark, #68867763); }
      ::highlight(${hoverName}) { text-decoration: underline; }
      [data-lens-mark-hover], [data-lens-mark-hover] * { cursor: pointer; }
    `);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, highlightStyle];
  }

  function paintMarks() {
    setHoverMark();
    const next = [];
    for (const [index, assessment] of assessments) {
      const record = records[index];
      if (!record) continue;
      for (const item of [...assessment.findings, ...assessment.contextObservations]) {
        const span = { turn: index + 1, id: record.id, start: item.start, end: item.end, quote: item.quote };
        const range = rangeFor(span);
        if (range) next.push({ span, range, role: record.role, body: record.body, signalId: `${span.turn}:${item.code}` });
      }
    }
    markedSpans = next;
    for (const [role, name] of [['assistant', assistantMarks], ['user', userMarks]]) {
      const ranges = next.filter(mark => mark.role === role).map(mark => mark.range);
      if (!ranges.length) {
        CSS.highlights.delete(name);
        continue;
      }
      installHighlightStyle();
      CSS.highlights.set(name, new Highlight(...ranges));
    }
    if (activeEvidence) {
      const range = rangeFor(activeEvidence);
      if (range) paintActive(range);
      else clearHighlight();
    }
  }

  function paintActive(range) {
    const highlight = new Highlight(range);
    highlight.priority = 1;
    CSS.highlights.set(highlightName, highlight);
  }

  function highlightEvidence(span, range, reveal) {
    installHighlightStyle();
    activeEvidence = span;
    document.documentElement.dataset.lensActiveRole = records[span.turn - 1].role;
    paintActive(range);
    if (harness) document.dispatchEvent(new CustomEvent('lens:evidence-state', { detail: true }));
    if (!reveal) return;
    const scroll = harness && document.getElementById('chat-scroll');
    if (scroll) {
      const quoteBox = range.getBoundingClientRect();
      if (quoteBox.top < scroll.getBoundingClientRect().top || quoteBox.bottom > scroll.getBoundingClientRect().bottom) {
        scroll.scrollTop += quoteBox.top + quoteBox.height / 2 - scroll.getBoundingClientRect().top - scroll.clientHeight / 2;
      }
    } else {
      const box = range.getBoundingClientRect();
      if (box.top < 0 || box.bottom > window.innerHeight) {
        range.startContainer.parentElement.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }
  }

  function jump(message) {
    scan();
    const { turn, start, end, quote, id } = message;
    if (!enabled || message.conversationId !== conversationId || !Number.isInteger(turn) ||
        (message.findingTurn !== undefined && !assessments.has(message.findingTurn - 1))) {
      return { ok: false };
    }
    const span = { turn, id, start, end, quote, signalId: message.signalId };
    const range = rangeFor(span);
    if (!range) return { ok: false };
    highlightEvidence(span, range, true);
    invalidate();
    return { ok: true };
  }

  function clearEvidence(message, latest = false) {
    scan();
    if (!enabled || message.conversationId !== conversationId) return { ok: false };
    selectionRequest = undefined;
    clearHighlight();
    if (latest) records.at(-1)?.body.scrollIntoView({ block: 'end', behavior: 'instant' });
    invalidate();
    return { ok: true };
  }

  function markAt(event) {
    if (!markedSpans.length || !(event.target instanceof Element) ||
        event.target.closest('a, button, input, textarea, [contenteditable="true"]')) return null;
    const onPoint = mark => mark.body.contains(event.target) && [...mark.range.getClientRects()].some(rect =>
      event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom);
    const preferred = markedSpans.find(mark => activeEvidence?.signalId === mark.signalId && onPoint(mark));
    return preferred ?? markedSpans.find(onPoint);
  }

  function setHoverMark(mark) {
    if (mark === hoverMark) return;
    hoverMark?.body.removeAttribute('data-lens-mark-hover');
    hoverMark = mark;
    if (mark) {
      mark.body.setAttribute('data-lens-mark-hover', '');
      const underline = new Highlight(mark.range);
      underline.priority = 2;
      CSS.highlights.set(hoverName, underline);
    } else {
      CSS.highlights.delete(hoverName);
    }
  }

  document.addEventListener('pointermove', event => setHoverMark(event.buttons ? undefined : markAt(event) ?? undefined), { passive: true });
  document.addEventListener('pointerleave', () => setHoverMark());
  document.addEventListener('click', event => {
    if (!event.isTrusted || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey ||
        !window.getSelection()?.isCollapsed) return;
    if (!markAt(event)) return;
    scan();
    const mark = markAt(event);
    if (!mark) return;
    highlightEvidence({ ...mark.span, signalId: mark.signalId }, mark.range, false);
    selectionRequest = { id: mark.signalId, sequence: ++selectionSequence };
    try {
      runtime.sendMessage({ type: 'live/open-panel' }).catch(() => {});
    } catch {}
    invalidate();
  });

  runtime.onMessage.addListener((message, sender, reply) => {
    if (sender.id !== runtime.id) return;
    switch (message?.type) {
      case 'live/get-state':
        scan();
        reply(snapshot());
        break;
      case 'live/analyze': {
        syncConversation();
        if (conversationId !== null && message.conversationId === conversationId) {
          enabled = true;
          scan();
          manualThrough = records.length;
          reviewThrough = records.length;
          scoreNext();
          invalidate();
        }
        reply(snapshot());
        break;
      }
      case 'live/set-following': {
        syncConversation();
        if (enabled && message.conversationId === conversationId && typeof message.following === 'boolean' &&
            message.following !== following) {
          following = message.following;
          if (!following) {
            const covered = [...assessments.keys(), ...failures].reduce((count, index) => Math.max(count, index + 1), 0);
            reviewThrough = Math.max(manualThrough, covered, (pending?.index ?? -1) + 1);
          }
          scan();
          scoreNext();
          invalidate();
        }
        reply(snapshot());
        break;
      }
      case 'live/jump':
        reply(jump(message));
        break;
      case 'live/clear-evidence':
      case 'live/latest':
        reply(clearEvidence(message, message.type === 'live/latest'));
        break;
      case 'live/retry':
        scan();
        if (enabled && message.conversationId === conversationId) {
          failures.clear();
          scoreNext();
          invalidate();
        }
        reply(snapshot());
        break;
    }
  });

  function onNavigation() {
    syncConversation();
    if (scheduled || (harness && !enabled)) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  }

  window.navigation.addEventListener('currententrychange', onNavigation);
  window.addEventListener('popstate', onNavigation);
  window.addEventListener('pageshow', onNavigation);
  if (harness) document.addEventListener('lens:back-to-latest', () => clearEvidence({ conversationId }));
  window.addEventListener('pagehide', () => {
    if (!enabled) return;
    enabled = false;
    reset();
    invalidate();
  });
  new MutationObserver(onNavigation).observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-talvt-turn-state', 'data-chatgpt-conversation-selection-target',
      'data-chatgpt-search-message-ids', 'data-content-search-unit-key', 'data-conversation-id', 'hidden', 'aria-hidden'],
  });
  scan();
  invalidate();
}
