# Synthetic demo chat

From the repository root with Node.js 22 or later, start the local service.

```sh
node harness/server.mjs
```

Load the `extension/` directory as an unpacked extension in desktop Chrome.
Open [the demo chat](http://127.0.0.1:4188/harness/) in desktop Chrome and click
**Open Lens**. Click **Analyze this chat** in the native sidebar to review the
completed turns once. Turn on **Analyze new messages** to review subsequent turns.

Open **Demo settings** and choose **Delegate a decision** or **Draft a message**
to fill the composer. The fictional scripted assistant is selected by default.
Switch the assistant to **Boundary-respecting** for the comparison. Expanding a
finding highlights it in the chat. Clicking a muted mark opens its finding. **Back to latest**
clears the highlight and returns to the latest message. **New chat** keeps the
demo settings and resets the transcript and that conversation’s consent.

The scripted chat works without a key. To enable live scoring, open **Demo settings**,
paste your OpenAI API key, and select **Use key**. The server keeps it in memory
until you select **Clear session key** or stop the server. To use a key from
`.env`, start with `node --env-file=.env harness/server.mjs`. The scoring
connection uses port 4188. The extension
recognizes the demo on ports 4187 and 4188 at both `127.0.0.1` and `localhost`.
If you see **No conversation connected** on the demo, reload version 0.3.1 or
later at `chrome://extensions`, then refresh the demo tab.

## Optional model replies

After adding the key, select **Demo settings → Reply source → OpenAI**,
choose a system prompt preset or **Custom**, and confirm the synthetic chat below the composer.
OpenAI receives the prompt and the visible conversation. The reply model defaults
to GPT-4.1 mini and can be set with `OPENAI_REPLY_MODEL`. The sidebar has its own
**Analyze this chat** button and its own ongoing-analysis switch for the judge.

A trusted local module set with `CHAT_JUDGE_ADAPTER` overrides OpenAI replies.
It exports an async `generateReply({ systemPrompt, turns, signal })` function
returning plain text. Each turn contains `role` and `text`. Pass the abort signal
through to the provider and read credentials from the server environment. The server
accepts up to 60 turns, 4,000 characters per message or prompt, and 256 KB per request.
