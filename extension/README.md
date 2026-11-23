# Conversation Lens: push-aside UX prototype

Conversation Lens is a Chrome Manifest V3 proof of concept. The native sidebar uses the OpenAI judge through a loopback server after the user enables scoring for a ChatGPT or synthetic demo conversation. The local replay uses handwritten rules.

## Focused POC replay and benchmark

From the project root, run `python3 -m http.server 8765 --bind 127.0.0.1 --directory extension`, then open [the scorer replay](http://127.0.0.1:8765/replay.html). **A draft and a decision** is the presentation sequence. Click **Next turn** to score each completed message, select a signal to find its source, then switch to **A draft with the choice retained** to compare the two conversations. The local rules cover AI self-presentation and reliance cues, plus user task and decision delegation. The replay shows user delegation and follow-through as observations. The two conversations are synthetic.

For a short walkthrough, advance to turn 1 and show the user's drafting request. At turn 2, click the AI's exclusivity cue and show the exact phrase. Advance to turn 3 to show that the user has now handed over a choice. At turn 5, show that the user later edited the draft and decided independently. In the matched conversation, pause at turn 3 to show the user asking for comparison while keeping the decision. Reset before handing the demo to anyone else.

From the project root, run the focused evaluator with Node:

```sh
node benchmark/run-focused.mjs
node benchmark/run-focused.mjs --packet benchmark/focused-challenge.json
node benchmark/run-focused.mjs --review /path/to/focused-review.json
```

The first two commands use authored synthetic development labels. The third reads a JSON export from [the annotation reviewer](../benchmark/reviewer.html) and skips unfinished and not-assessed decisions. Append `--json` for structured results. The report includes per-code errors, full-turn agreement, and exact and overlapping evidence spans. The wording challenge tests different phrasings and stricter contextual negatives. Use an independently reviewed evaluation set for performance claims.

The [Inspect AI adapter](../benchmark/inspect_README.md) can run the rules or the model judge on each turn's visible prefix. The [presentation runbook](../PRESENTATION-RUNBOOK.md) connects the live and scripted demos, evaluation, and write-up.

## Try the demo

1. Serve the extension folder locally: `python3 -m http.server 8765 --bind 127.0.0.1 --directory extension`.
2. Open `http://127.0.0.1:8765/demo.html` in Chrome.
3. Click **Review conversation** to open the timeline. Select a row to expand its explanation and jump to the linked turn. Close the panel, then click a highlighted phrase to open its explanation directly.

The older demo loads the same `content.js` and `styles.css` files declared in the extension manifest and uses an in-page panel for its three authored findings. To load the extension in Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this `extension/` directory. Reload the target chat page after loading or updating the extension.

## How the live panel works

From the project root, run `node --env-file=.env harness/server.mjs`. The extension queries the judge on `http://127.0.0.1:4188`. The key stays in the server.

In Chrome, open a saved ChatGPT conversation or the [synthetic demo chat](http://127.0.0.1:4188/harness/) and select **Conversation Lens** in the toolbar. **Analyze this chat** sends the visible completed turns to OpenAI for a one-time review. Each assessment uses up to 60 recent turns, within the request size limit. Turn on **Analyze new messages** for ongoing review, or use **Analyze new turns** to catch up once. Pausing keeps existing findings. Reloading or switching conversations clears consent and findings and cancels in-flight scoring.

Expand a row to highlight the primary quote and read the rationale. **Earlier context** reveals any linked excerpts from previous turns. A muted mark in the transcript opens its finding in the sidebar. Collapsing the row or choosing **Back to latest** clears the active highlight. An uncertain interpretation stays on the finding when its quote can be verified. Unverified proposals stay in evaluation diagnostics.

Reload the unpacked extension and refresh the chat tab after an update. If an older duplicate remains, disable it and load the current `extension/` folder. The manifest declares a stable public extension ID so the loopback server can restrict its scoring endpoint to Conversation Lens. Version 0.3.1 connects to the demo at `localhost` or `127.0.0.1` on ports 4187 and 4188. For a fresh ChatGPT chat, send a neutral setup message, wait for the saved conversation URL, then refresh if the mounted transcript still has the provisional ID.

Chrome verification used a synthetic ChatGPT transcript to exercise the unpacked extension, native sidebar, completed-turn updates, exact evidence highlighting, and conversation switching. A signed-in rehearsal on the presentation setup is pending. Follow the presentation runbook for that check.

## Files

- `manifest.json`: site matches, content script, and native side panel registration.
- `background.js`: opens the native panel and relays opted-in scoring to the local service.
- `sidepanel.html` / `sidepanel.css` / `sidepanel.mjs`: live sidebar and evidence interactions.
- `live-chatgpt.mjs`: local completed-turn capture and evidence highlighting.
- `content.js`: live launcher and synthetic demo timeline.
- `styles.css`: scoped page-width change for the synthetic demo only.
- `demo.html` / `demo.css`: synthetic host chat for visual testing.

## Prototype mark

The toolbar icon, in-page launcher, and native panel heading use the user-selected navy and amber mark. The editable recreation is `../design/brand/selected/conversation-mark.svg`; Chrome PNG sizes are in `icons/`. Reload the unpacked extension and the chat tab to see the update.

If the Review conversation button reports **Reload this chat tab to reconnect**, refresh the chat page after reloading the unpacked extension. Chrome can leave an older content script visible in an already-open tab even though its extension messaging context has gone away. Refreshing the tab reinstalls the current content script.
