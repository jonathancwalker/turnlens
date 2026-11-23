# Conversation Lens presentation runbook

## Rehearsal sequence

1. **Controlled demo.** Open the [synthetic chat](http://127.0.0.1:4188/harness/) in desktop Chrome and open Conversation Lens. In **Demo settings**, choose **Delegate a decision** and send it with the fictional scripted assistant. Click **Analyze this chat** and expand the exclusivity finding to highlight the quote. Click a muted mark to open its finding. Use **Back to latest** to return to the chat. Start a **New chat** with the **Boundary-respecting** assistant for the comparison.
2. **Real ChatGPT.** Open a saved, dedicated test conversation in Chrome. Click **Analyze this chat** and turn on **Analyze new messages**. Send `Draft a short reply to a friend about meeting for coffee. I’ll edit it.` Expand the task-delegation finding and verify the highlighted phrase. Let the assistant finish. Switch chats and verify the previous evidence and consent clear.
3. **Evaluation.** Explain that each target ends at a specific user or assistant turn. On the authored 30-turn wording challenge, one development run of the OpenAI judge detected 10 of 10 positive findings and matched 26 of 30 full decision sets. The rules detected 4 of 10 and matched 24 of 30. Independent reliability remains to be measured.
4. **Close.** Show [the public project page](https://conversation-lens-poc.foggypanda2049.chatgpt.site). Visitors can run the recorded context comparison and download the synthetic cases. The [local write-up](presentation/conversation-lens.html) has more project background.

## Local replay and baseline

Run from the project root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory extension
```

Open [the local replay](http://127.0.0.1:8765/replay.html) in Chrome. The replay requires no model connection. Reset before each run.

```sh
node --test extension/focused-scorer.test.mjs
node benchmark/run-focused.mjs
node benchmark/run-focused.mjs --packet benchmark/focused-challenge.json
```

Run the [demo and judge server](harness/README.md) with `node --env-file=.env harness/server.mjs`. Load or reload the current `extension/` folder under `chrome://extensions` and refresh the chat tab. The judge expects port 4188. Scripted replies provide a repeatable presentation path. Under **Demo settings**, select **OpenAI** to generate replies from a preset or custom system prompt with the same local key.

Use the [Inspect AI instructions](benchmark/inspect_README.md) to rerun the baseline or model judge. The presentation logs are saved in the project.

- [30-turn OpenAI development run](portfolio-docs/assets/exports/2026-11-23-inspect-online-challenge.eval) and [rules comparison](portfolio-docs/assets/exports/2026-11-22-inspect-focused-challenge.eval).
- Identical-reply context pair as an optional failure example. [Default judge](portfolio-docs/assets/exports/2026-11-23-inspect-context-pair-default.eval) · [Target-quote trial](portfolio-docs/assets/exports/2026-11-23-inspect-context-pair-trial.eval).

## Readiness gate

Run the real-chat sequence twice on the presentation setup. Verify the opt-in state, the H1 evidence jump, and that a chat switch clears the sidebar. If the real-chat gate remains open, describe the real integration by its verified status and use the scripted mock chat or replay to show the interaction. Label whichever mode is being shown.

Chrome for Testing verified the synthetic demo through the real sidebar and OpenAI judge, including evidence highlighting and consent reset. The [ChatGPT-shaped capture fixture](extension/tests/live-chatgpt.html) covers completed turns, cross-node text highlights, conversation isolation, and invalidation after edits. Reload the unpacked extension in the presentation profile and refresh an existing dedicated ChatGPT conversation before the signed-in rehearsal.
