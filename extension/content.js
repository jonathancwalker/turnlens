(() => {
  if (window.__conversationLensMounted || document.querySelector('clens-root') || !document.documentElement || !document.body) return;
  window.__conversationLensMounted = true;

  const demo = document.documentElement.hasAttribute('data-clens-demo');
  const root = document.createElement('clens-root');
  const shadow = root.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; --ink: #24303e; --muted: #677589; --line: #dce3ea; --paper: #fff; --wash: #f8fafb; --amber: #fff0ca; --green: #dff3e8; font: 13px/1.45 system-ui, sans-serif; color: var(--ink); }
    * { box-sizing: border-box; }
    button { font: inherit; color: inherit; cursor: pointer; }
    .launcher { position: fixed; top: 72px; right: 18px; z-index: 2147483646; display: flex; align-items: center; gap: 7px; background: var(--paper); border: 1px solid var(--line); box-shadow: 0 3px 14px #16233822; border-radius: 999px; padding: 8px 13px; font: 13px/1.45 system-ui, sans-serif; }
    .launcher:hover { background: var(--wash); }
    .launcher[hidden] { display: none; }
    .panel { position: fixed; z-index: 2147483647; top: 0; right: 0; width: var(--clens-width, 350px); height: 100vh; height: 100dvh; background: var(--paper); border-left: 1px solid var(--line); box-shadow: -6px 0 20px #16233815; display: flex; flex-direction: column; font: 13px/1.45 system-ui, sans-serif; }
    .panel[hidden] { display: none; }
    header { padding: 18px 18px 14px; border-bottom: 1px solid var(--line); display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    h1 { font: 600 17px/1.3 system-ui, sans-serif; margin: 0; }
    .sub { font-size: 11px; color: var(--muted); margin-top: 4px; }
    .close { padding: 0 6px; background: transparent; border: 0; font-size: 22px; line-height: 1; }
    .content { overflow-y: auto; padding: 16px 18px; flex: 1; }
    .eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: .09em; color: var(--muted); margin-bottom: 7px; }
    .row { width: 100%; text-align: left; background: transparent; border: 0; border-bottom: 1px solid var(--line); display: flex; gap: 10px; padding: 11px 0; }
    .row:hover, .row.selected { background: var(--wash); }
    .dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex: 0 0 auto; background: #b98b2e; }
    .dot.help { background: #42826b; }
    .row-title { font-weight: 550; }
    .meta { font-size: 11px; color: var(--muted); display: block; margin-top: 2px; }
    .detail { margin-top: 18px; padding-top: 17px; border-top: 1px solid var(--line); }
    .detail[hidden] { display: none; }
    h2 { font: 600 15px/1.3 system-ui, sans-serif; margin: 0 0 11px; }
    p { margin: 0 0 12px; }
    .jump { background: var(--wash); border: 1px solid var(--line); border-radius: 6px; padding: 7px 10px; }
    footer { padding: 11px 18px; border-top: 1px solid var(--line); font-size: 11px; color: var(--muted); }
    @media(max-width: 760px) { .panel { width: min(350px, 100vw); box-shadow: -16px 0 40px #16233833; } }
    @media(prefers-color-scheme: dark) { :host { --ink:#e9edf4; --muted:#aeb9c5; --line:#3f4b57; --paper:#20262e; --wash:#2b333d; --amber:#725827; --green:#255540; } }
  `;
  const launcher = document.createElement('button');
  launcher.className = 'launcher';
  launcher.type = 'button';
  launcher.textContent = '◉ Review conversation';
  launcher.setAttribute('aria-label', 'Open Conversation Lens');
  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Conversation Lens sidebar');
  panel.innerHTML = '<header><div><h1>Conversation lens</h1><div class="sub">Evidence linked to this conversation</div></div><button class="close" type="button" aria-label="Close Conversation Lens">×</button></header><div class="content"><div class="eyebrow">Timeline</div><div class="list"></div><div class="detail" hidden></div></div><footer>UX prototype · Findings in the demo are illustrative</footer>';
  shadow.append(style, launcher, panel);
  document.documentElement.append(root);

  const findings = demo ? [
    { id: 'connection', title: 'Supports human connection', kind: 'help', turn: 'demo-turn-2', meta: 'Helpful · Turn 2', context: 'The user said they felt lonely after moving.', explanation: 'The assistant offers help contacting someone the user trusts and leaves that choice with them.' },
    { id: 'exclusivity', title: 'Discourages outside support', kind: 'concern', turn: 'demo-turn-4', meta: 'Concern · Turn 4', context: 'The user considered calling Maya.', explanation: 'The assistant dismisses that option and claims the user only needs it.' },
    { id: 'repair', title: 'Corrects the earlier response', kind: 'help', turn: 'demo-turn-6', meta: 'Repair · Turn 6', context: 'The user rejected the earlier advice.', explanation: 'The assistant retracts its discouragement. The earlier concern stays in the timeline for review.' }
  ] : [];
  let selected = null;
  let open = false;
  const list = panel.querySelector('.list');
  const detail = panel.querySelector('.detail');

  function jump(item) {
    const turn = document.getElementById(item.turn);
    if (!turn) return;
    turn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    turn.classList.add('clens-focused-turn');
    window.setTimeout(() => turn.classList.remove('clens-focused-turn'), 1600);
  }
  function render() {
    list.replaceChildren();
    detail.replaceChildren();
    const entries = findings.length ? findings : [{ id: 'empty', title: 'No observations yet', meta: 'Live analysis is not connected in this prototype', kind: 'help' }];
    for (const item of entries) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'row' + (selected === item.id ? ' selected' : '');
      row.disabled = item.id === 'empty';
      const dot = document.createElement('span'); dot.className = 'dot' + (item.kind === 'help' ? ' help' : '');
      const copy = document.createElement('span'); copy.className = 'row-title'; copy.textContent = item.title;
      const meta = document.createElement('span'); meta.className = 'meta'; meta.textContent = item.meta;
      copy.append(meta); row.append(dot, copy);
      row.addEventListener('click', () => { selected = item.id; render(); jump(item); });
      list.append(row);
    }
    detail.hidden = !selected;
    if (selected) {
      const item = findings.find(f => f.id === selected);
      if (!item) return;
      const heading = document.createElement('h2'); heading.textContent = item.title;
      const contextLabel = document.createElement('div'); contextLabel.className = 'eyebrow'; contextLabel.textContent = 'Context';
      const context = document.createElement('p'); context.textContent = item.context;
      const whyLabel = document.createElement('div'); whyLabel.className = 'eyebrow'; whyLabel.textContent = 'Why it matters';
      const why = document.createElement('p'); why.textContent = item.explanation;
      const button = document.createElement('button'); button.className = 'jump'; button.type = 'button'; button.textContent = 'Go to message';
      button.addEventListener('click', () => jump(item));
      detail.append(heading, contextLabel, context, whyLabel, why, button);
    }
  }
  function setOpen(value, itemId) {
    open = value;
    document.documentElement.dataset.clensOpen = String(open);
    launcher.hidden = open;
    panel.hidden = !open;
    if (itemId) selected = itemId;
    render();
    if (open && itemId) jump(findings.find(f => f.id === itemId));
    if (!open) launcher.focus();
  }
  launcher.addEventListener('click', () => setOpen(true));
  panel.querySelector('.close').addEventListener('click', () => setOpen(false));
  document.addEventListener('click', event => {
    const mark = event.target.closest?.('[data-clens-finding]');
    if (mark && findings.some(f => f.id === mark.dataset.clensFinding)) setOpen(true, mark.dataset.clensFinding);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && open) setOpen(false); });
  render();
})();
