chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

const openWindows = new Set();
const judgeOrigin = 'http://127.0.0.1:4188';
chrome.sidePanel.onOpened.addListener(({ windowId }) => openWindows.add(windowId));
chrome.sidePanel.onClosed.addListener(({ windowId }) => openWindows.delete(windowId));

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!['toggle-side-panel', 'live/open-panel'].includes(message?.type) || !sender.tab?.windowId) return;
  const windowId = sender.tab.windowId;
  if (openWindows.has(windowId)) {
    if (message.type === 'live/open-panel') return;
    openWindows.delete(windowId);
    chrome.sidePanel.close({ windowId }).catch(console.error);
  } else {
    openWindows.add(windowId);
    chrome.sidePanel.open({ windowId }).catch(error => {
      openWindows.delete(windowId);
      console.error(error);
    });
  }
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'live/judge') return;
  if (port.sender?.id !== chrome.runtime.id || port.sender.frameId !== 0 || !port.sender.url) {
    port.disconnect();
    return;
  }
  const source = new URL(port.sender.url);
  const harness = /^http:\/\/(?:127\.0\.0\.1|localhost):418[78]$/.test(source.origin) && source.pathname === '/harness/';
  if (source.origin !== 'https://chatgpt.com' &&
      !harness) {
    port.disconnect();
    return;
  }
  const controller = new AbortController();
  port.onDisconnect.addListener(() => controller.abort());
  async function score({ turns }) {
    port.onMessage.removeListener(score);
    if (controller.signal.aborted) return;
    try {
      const response = await fetch(`${judgeOrigin}/api/extension/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turns }),
        credentials: 'omit',
        redirect: 'error',
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(28_000)]),
      });
      if (!response.ok) throw new Error('Scoring unavailable');
      const assessment = await response.json();
      if (!controller.signal.aborted) port.postMessage({ assessment });
    } catch {
      if (!controller.signal.aborted) port.postMessage({ error: true });
    }
  }
  port.onMessage.addListener(score);
});
