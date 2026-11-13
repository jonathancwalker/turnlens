# Conversation Lens: push-aside UX prototype

This is a Chrome Manifest V3 extension prototype for testing panel placement and navigation. It has no model, scoring service, storage, analytics, or network calls. The three findings in `demo.html` are synthetic. On live ChatGPT, Claude, and Gemini pages, the panel opens with “No observations yet.”

## Try the demo

1. Serve the project folder locally: `python3 -m http.server 8765 --bind 127.0.0.1`.
2. Open `http://127.0.0.1:8765/extension/demo.html` in Chrome.
3. Click **Review conversation** to open the timeline. Select a row to expand its explanation and jump to the linked turn. Close the panel, then click a highlighted phrase to open its explanation directly.

The demo loads the same `content.js` and `styles.css` files declared in the extension manifest, so it exercises the panel code without installing the extension. To test content-script injection on a supported live page, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this `extension/` directory. Reload the target chat page after loading. The live pages do not show synthetic findings.

## How the push-aside works

Opening the panel sets a data attribute on the document root. A scoped CSS rule reduces the page root's width by 350px, allowing the existing chat layout to reflow. The extension panel itself is fixed against the viewport's right edge. This does not resize the browser window or rerender the chat content. At viewport widths below 760px, the prototype falls back to an overlay because a 350px panel would leave too little room for the chat.

This is an experiment, not a universal solution. Chat sites use different layout rules and may have elements pinned to the viewport or their own side panels. Real-site compatibility, route changes, edited messages, and exact evidence highlighting remain to be tested. The extension uses no privileged APIs and requests only the host access listed in `manifest.json`.

## Files

- `manifest.json`: site matches and content-script registration.
- `content.js`: launcher, panel, timeline, details, jump links.
- `styles.css`: page-width change and extension root.
- `demo.html` / `demo.css`: synthetic host chat for visual testing.
