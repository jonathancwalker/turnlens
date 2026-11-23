const titles = {
  A1: 'Presents itself as your primary support',
  A2: 'Discourages outside contact',
  A5: 'Presents a human identity or bond',
  A7: 'Invites the chat to continue',
  H1: 'You delegated a task',
  H2: 'You delegated a decision',
  H4: 'You checked the result',
  H5: 'You revised or made your own choice',
};

const panel = Object.fromEntries([...document.querySelectorAll('[id]')].map(element => [element.id, element]));
const browser = globalThis.chrome;
const analysis = panel.analysis;
const follow = panel.follow;
let windowId;
let tabId;
let request = 0;
let contextVersion = 0;
let state = null;
let connection = 'connecting';
let signals = [];
let selectedId;
let pendingAction;
let jumpRequest = 0;
let jumpNotice = '';
let openContextId;

function node(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function isConnected(response) {
  return typeof response?.enabled === 'boolean' &&
    typeof response.conversationId === 'string' && response.conversationId.length > 0 &&
    Array.isArray(response.turns) && Array.isArray(response.assessments);
}

function collectSignals({ assessments, turns, failedTurns = [] }) {
  const turnsByNumber = new Map(turns.map(turn => [turn.turn, turn]));
  const items = [...assessments].sort((a, b) => b.turn - a.turn).flatMap(assessment => {
    const followThrough = assessment.contextObservations.map(item => ({
      ...item,
      rationale: item.code === 'H4'
        ? 'You described checking the result.'
        : 'You described editing the result or making your own choice.',
    }));
    return [...assessment.findings, ...followThrough].flatMap(item => {
      if (!Object.hasOwn(titles, item.code)) return [];
      const { turn, role } = assessment;
      const spans = [{ turn, start: item.start, end: item.end, quote: item.quote }, ...(item.context ?? [])]
        .flatMap(({ turn: number, start, end, quote }, index) => {
          const source = turnsByNumber.get(number);
          if (!source || !Number.isInteger(start) || !Number.isInteger(end) ||
              start < 0 || end <= start || end > source.text.length || source.text.slice(start, end) !== quote) {
            return [];
          }
          return [{ turn: number, id: source.id, start, end, quote, role: source.role, context: index > 0 }];
        });
      if (!spans.length || spans[0].context) return [];
      const uncertain = item.status === 'uncertain';
      const title = item.code === 'A5' && uncertain ? 'Possible human identity or personal bond'
        : item.code === 'A7' && item.retentionKind === 'pressure' ? 'Pressures you to keep chatting' : titles[item.code];
      spans.sort((a, b) => a.turn - b.turn || a.start - b.start);
      return [{ id: `${turn}:${item.code}`, turn, role, title, uncertain, rationale: item.rationale, spans }];
    });
  });
  for (const turn of failedTurns) {
    const source = turnsByNumber.get(turn);
    if (source) items.push({ turn, role: source.role, title: 'Turn couldn’t be scored' });
  }
  return items.sort((a, b) => b.turn - a.turn);
}

function renderHeader() {
  panel['connection-status'].hidden = connection === 'connected';
  panel['connection-status'].textContent = {
    connecting: 'Connecting to this tab…',
    disconnected: 'No conversation connected',
    unsaved: 'Waiting for a saved chat',
    connected: state?.host === 'harness' ? 'Synthetic demo chat' : 'ChatGPT conversation',
  }[connection];
  panel['analysis-control'].hidden = !state?.enabled;
  panel['analysis-privacy'].hidden = !state || state.enabled;
  analysis.hidden = !state || (state.enabled && !state.unreviewed);
  analysis.textContent = state?.enabled ? 'Analyze new turns' : 'Analyze this chat';
  analysis.classList.toggle('text-action', Boolean(state?.enabled));
  const scoringStatus = state?.enabled && state.pending
    ? `Scoring ${state.pending === 1 ? 'a turn' : `${state.pending} turns`}…` : '';
  panel['judge-status'].textContent = scoringStatus;
  panel['judge-status'].hidden = !scoringStatus;
  panel['retry-scoring'].hidden = !state?.enabled || !state.failures;
  follow.checked = pendingAction?.following ?? state?.following ?? false;
  follow.disabled = Boolean(pendingAction) || !state;
  analysis.disabled = Boolean(pendingAction) || !state;
}

function renderEmpty() {
  panel.empty.hidden = signals.length > 0 || connection !== 'connected' || !state?.enabled;
  panel.empty.textContent = state?.pending ? '' : state?.assessments.length
    ? 'No verified findings in scored turns.' : state?.unreviewed ? '' : 'Waiting for messages.';
  if (!panel.empty.textContent) panel.empty.hidden = true;
}

function evidenceKey({ turn, start, end }) {
  return `${turn}:${start}:${end}`;
}

function evidenceList(signal, spans, label) {
  const list = node('ul', 'evidence-list');
  list.setAttribute('aria-label', label);
  for (const span of spans) {
    const button = node('button', 'evidence');
    button.type = 'button';
    button.dataset.evidence = evidenceKey(span);
    button.dataset.role = span.role;
    button.title = 'Show in chat';
    const current = state?.activeEvidence;
    button.setAttribute('aria-pressed', String(Boolean(current && current.id === span.id && evidenceKey(current) === evidenceKey(span))));
    const speaker = span.role === 'user' ? 'You' : 'Assistant';
    button.setAttribute('aria-label', `Show in chat. ${speaker}, turn ${span.turn}. ${span.quote}`);
    const action = node('span', 'jump-arrow', '↗');
    action.setAttribute('aria-hidden', 'true');
    if (span.context) button.append(node('span', 'evidence-meta', `${speaker} · Turn ${span.turn}`));
    button.append(node('span', 'quote', `“${span.quote}”`), action);
    button.addEventListener('click', () => jumpToEvidence(signal, span));
    const row = node('li');
    row.append(button);
    list.append(row);
  }
  return list;
}

function renderEvidence(signal) {
  const detail = node('div', 'detail');
  detail.id = `finding-${signal.id}`;
  detail.append(evidenceList(signal, signal.spans.filter(span => !span.context), 'Flagged text'));
  if (signal.rationale) detail.append(node('p', 'explanation', signal.rationale));
  const earlier = signal.spans.filter(span => span.context);
  if (earlier.length) {
    const context = node('details', 'earlier-context');
    context.open = openContextId === signal.id;
    context.addEventListener('toggle', () => {
      if (context.isConnected) openContextId = context.open ? signal.id : undefined;
    });
    context.append(node('summary', '', 'Earlier context'), evidenceList(signal, earlier, 'Earlier context'));
    detail.append(context);
  }
  if (state?.activeEvidence && state.host !== 'harness') {
    const latest = node('button', 'text-action return-latest', 'Back to latest');
    latest.type = 'button';
    latest.addEventListener('click', () => sendEvidenceAction('live/latest'));
    detail.append(latest);
  }
  const notice = node('p', 'notice', jumpNotice);
  notice.id = 'jump-notice';
  notice.setAttribute('role', 'status');
  detail.append(notice);
  return detail;
}

function renderSignals() {
  const active = document.activeElement;
  const focusedRow = active?.closest('.signal-row')?.dataset.rowId;
  const focusedEvidence = active?.dataset.evidence;
  const scrollTop = window.scrollY;
  const groups = [];
  for (const [role, name] of [['assistant', 'Assistant behavior'], ['user', 'Your actions']]) {
    const entries = signals.filter(signal => signal.role === role);
    if (!entries.length) continue;
    const group = node('section', 'signal-group');
    group.dataset.role = role;
    const heading = node('h2', '', name);
    heading.id = `signals-${role}`;
    group.setAttribute('aria-labelledby', heading.id);
    const list = node('ul', 'signal-list');
    group.append(heading, list);
    for (const signal of entries) {
      const row = node('li', 'signal-row');
      if (!signal.id) {
        row.append(node('span', 'issue', signal.title), node('span', 'signal-turn', `Turn ${signal.turn}`));
        row.classList.add('issue-row');
        list.append(row);
        continue;
      }
      row.dataset.rowId = signal.id;
      const button = node('button', 'signal');
      button.type = 'button';
      button.dataset.signalId = signal.id;
      button.setAttribute('aria-expanded', String(selectedId === signal.id));
      button.setAttribute('aria-controls', `finding-${signal.id}`);
      const marker = node('span', 'marker');
      marker.setAttribute('aria-hidden', 'true');
      const text = node('span', 'signal-copy');
      text.append(node('span', 'signal-title', signal.title));
      if (signal.uncertain) text.append(node('span', 'uncertainty', 'Needs context'));
      const chevron = node('span', 'chevron');
      chevron.setAttribute('aria-hidden', 'true');
      button.append(marker, text, node('span', 'signal-turn', `Turn ${signal.turn}`), chevron);
      button.addEventListener('click', () => {
        const previousSelection = selectedId;
        selectedId = selectedId === signal.id ? undefined : signal.id;
        openContextId = undefined;
        jumpRequest += 1;
        jumpNotice = '';
        renderSignals();
        if (selectedId) void jumpToEvidence(signal, signal.spans.find(span => !span.context));
        else if (previousSelection) void sendEvidenceAction('live/clear-evidence');
      });
      row.append(button);
      const detail = selectedId === signal.id ? renderEvidence(signal) : node('div');
      detail.id = `finding-${signal.id}`;
      detail.hidden = selectedId !== signal.id;
      row.append(detail);
      list.append(row);
    }
    groups.push(group);
  }
  panel.signals.replaceChildren(...groups);
  window.scrollTo(0, scrollTop);
  if (focusedRow) {
    const row = [...panel.signals.querySelectorAll('[data-row-id]')].find(row => row.dataset.rowId === focusedRow);
    const target = focusedEvidence && row
      ? [...row.querySelectorAll('.evidence')].find(button => button.dataset.evidence === focusedEvidence)
      : null;
    (target ?? row?.querySelector('.signal'))?.focus({ preventScroll: true });
  }
}

function updateState(response, nextConnection) {
  const sameConversation = state?.conversationId === response?.conversationId && connection === nextConnection;
  const evidenceChanged = JSON.stringify(state?.activeEvidence) !== JSON.stringify(response?.activeEvidence);
  const requested = response?.selectionRequest;
  const selectionChanged = requested && (!sameConversation || requested.sequence !== state?.selectionRequest?.sequence);
  if (!sameConversation) {
    contextVersion += 1;
    selectedId = undefined;
    pendingAction = undefined;
    openContextId = undefined;
    jumpNotice = '';
    panel['analysis-notice'].textContent = '';
    window.scrollTo(0, 0);
  }
  state = response;
  connection = nextConnection;
  renderHeader();
  const nextSignals = state?.enabled ? collectSignals(state) : [];
  if (!sameConversation || evidenceChanged || selectionChanged || JSON.stringify(nextSignals) !== JSON.stringify(signals)) {
    signals = nextSignals;
    if (selectionChanged && signals.some(item => item.id === requested.id)) {
      selectedId = requested.id;
      openContextId = undefined;
      jumpNotice = '';
    }
    if (!signals.some(item => item.id && item.id === selectedId)) selectedId = undefined;
    renderSignals();
    if (selectionChanged && selectedId) {
      const row = document.getElementById(`finding-${selectedId}`)?.parentElement;
      row?.scrollIntoView({ block: 'nearest' });
    }
  }
  renderEmpty();
}

async function refresh() {
  const currentRequest = ++request;
  try {
    const [activeTab] = await browser.tabs.query({ active: true, windowId });
    if (currentRequest !== request) return;
    if (tabId !== activeTab?.id) {
      tabId = activeTab?.id;
      updateState(null, 'connecting');
    }
    const response = tabId === undefined ? null : await browser.tabs.sendMessage(tabId, { type: 'live/get-state' });
    if (currentRequest !== request) return;
    if (isConnected(response)) {
      updateState(response, 'connected');
      return;
    }
    if (response?.conversationId === null && response.enabled === false) {
      updateState(null, 'unsaved');
      return;
    }
  } catch {
    // An active tab may not have a live content script.
  }
  if (currentRequest === request) updateState(null, 'disconnected');
}

async function updateAnalysis(type, fields = {}) {
  if (!state || pendingAction) {
    renderHeader();
    return;
  }
  const operation = fields;
  const initialRequest = request;
  const conversationId = state.conversationId;
  pendingAction = operation;
  panel['analysis-notice'].textContent = '';
  renderHeader();
  try {
    const response = await browser.tabs.sendMessage(tabId, {
      type, conversationId, ...fields,
    });
    if (pendingAction !== operation) return;
    if (!isConnected(response) || response.conversationId !== conversationId ||
        initialRequest !== request) {
      await refresh();
    } else {
      updateState(response, 'connected');
    }
    if (pendingAction === operation && (!state?.enabled ||
        (operation.following !== undefined && state.following !== operation.following))) {
      panel['analysis-notice'].textContent = 'Couldn’t change analysis. Try again.';
    }
  } catch {
    if (pendingAction === operation) panel['analysis-notice'].textContent = 'Couldn’t change analysis. Try again.';
  } finally {
    if (pendingAction === operation) {
      pendingAction = undefined;
      renderHeader();
    }
  }
}

analysis.addEventListener('click', () => updateAnalysis('live/analyze'));
follow.addEventListener('change', () => updateAnalysis('live/set-following', { following: follow.checked }));

panel['retry-scoring'].addEventListener('click', async () => {
  if (!state?.enabled) return;
  try {
    await browser.tabs.sendMessage(tabId, { type: 'live/retry', conversationId: state.conversationId });
  } catch {
    await refresh();
  }
});

async function sendEvidenceAction(type, fields = {}) {
  if (!state?.enabled) return null;
  try {
    return await browser.tabs.sendMessage(tabId, { type, conversationId: state.conversationId, ...fields });
  } catch {
    return null;
  }
}

async function jumpToEvidence(signal, { turn, id, start, end, quote }) {
  if (!state?.enabled) return;
  const currentJump = ++jumpRequest;
  const currentContext = contextVersion;
  const signalId = selectedId;
  jumpNotice = '';
  const notice = document.getElementById('jump-notice');
  if (notice) notice.textContent = '';
  const result = await sendEvidenceAction('live/jump', { turn, id, start, end, quote, findingTurn: signal.turn, signalId: signal.id });
  if (result?.ok) return;
  if (currentJump === jumpRequest && currentContext === contextVersion && signalId === selectedId) {
    jumpNotice = 'This quote is no longer available in the chat.';
    const notice = document.getElementById('jump-notice');
    if (notice) notice.textContent = jumpNotice;
  }
}

async function start() {
  if (!browser?.tabs || !browser.windows || !browser.runtime) {
    updateState(null, 'disconnected');
    return;
  }
  try {
    windowId = (await browser.windows.getCurrent()).id;
  } catch {
    updateState(null, 'disconnected');
    return;
  }
  browser.runtime.onMessage.addListener((message, sender) => {
    if (message?.type === 'live/updated' && sender.tab?.windowId === windowId &&
        (tabId === undefined || sender.tab.id === tabId)) refresh();
  });
  browser.tabs.onActivated.addListener(({ tabId: activatedTab, windowId: activatedWindow }) => {
    if (activatedWindow !== windowId) return;
    tabId = activatedTab;
    updateState(null, 'connecting');
    refresh();
  });
  browser.tabs.onUpdated.addListener((updatedTab, changes) => {
    if (updatedTab !== tabId) return;
    if (changes.url || changes.status === 'loading') {
      updateState(null, 'connecting');
      refresh();
    } else if (changes.status === 'complete' && !state) {
      refresh();
    }
  });
  refresh();
}

start();
