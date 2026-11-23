# TurnLens

TurnLens is a research prototype for examining what happens across turns in AI chats. It looks at how assistants present themselves and steer conversations, and at what users ask the model to take on. A Chrome sidebar shows findings alongside the exact words that support them. A multi-turn benchmark tests whether a model judge can identify the behavior, ground it in the conversation, and distinguish similar cases.

[Try the recorded comparison and browse the benchmark](https://conversation-lens-poc.foggypanda2049.chatgpt.site). The demo and extension currently display the prototype's former name, **Conversation Lens**.

## Get started

The local demo requires **Node.js 22+**. The sidebar requires desktop Chrome.

```sh
git clone https://github.com/jonathancwalker/turnlens.git
cd turnlens
```

1. Run `node harness/server.mjs` from the repository root.
2. Open [the synthetic demo chat](http://127.0.0.1:4188/harness/). Use **Demo settings** to choose a scripted assistant and a sample prompt. Scripted replies work without an API key.
3. To enable live scoring, put `OPENAI_API_KEY=your_key_here` in a root `.env` file, then restart the server with `node --env-file=.env harness/server.mjs`. Git ignores this file.
4. In Chrome, open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**. Select this repository's `extension/` folder, then refresh the demo tab.
5. Click **Open Lens**, then **Analyze this chat**. Expand a finding to highlight the evidence in the chat. Turn on **Analyze new messages** for ongoing scoring.

Scoring sends recent completed chat turns to OpenAI after you enable it for that conversation. The API key stays on the loopback server. Start with synthetic messages. The demo also supports optional OpenAI-generated replies, and the extension supports saved ChatGPT conversations. See the [demo settings](harness/README.md) and [extension guide](extension/README.md) for both flows.

## What it looks for

| Speaker | Signals |
| --- | --- |
| Assistant | Human-like claims about feelings, identity, or relationships. Exclusive reliance. Discouraging outside contact without a context-supported reason. Inviting or pressuring a user to continue after a clear close. |
| User | Delegating a concrete task. Giving the model the final choice. |

These are observations about the conversation. The project asks when seeing the evidence might help a person reflect. It has yet to measure effects on users.

## Run the benchmark

The [development bank](benchmark/CONTRAST-BANK.md) contains 13 synthetic conversations grouped into six matched families. For example, the reply “Don’t call Maya” gets different labels depending on whether Maya asked for space. Inspect AI presents a target turn with its preceding messages and grades the behavior labels, evidence spans, retention subtype where applicable, and performance across matched cases.

With Python 3.12, Node.js 22+, and the same OpenAI key configured:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r benchmark/inspect_requirements.txt
.venv/bin/inspect eval benchmark/inspect_focused.py \
  --model none --ctl-server=false \
  -T detector=openai -T packet=benchmark/contrast-bank-dev.json
```

The Node adapter calls OpenAI directly and records the judge model in the assessment. Set `OPENAI_JUDGE_MODEL` to compare models. See the [Inspect guide](benchmark/inspect_README.md) for output and review options.

In one development run, GPT-4.1 mini passed all checks on **10 of 13 turns** and **3 of 6 matched families**. It missed an explicit decision handoff and overflagged some fictional or future-only language. The next steps are a held-out, human-reviewed benchmark and a study of when sidebar highlights help or interrupt users.

## Project files

- [Chrome extension](extension/) and [demo harness](harness/)
- [Online judge and evidence format](ONLINE-SCORING.md)
- [Benchmark design](BENCHMARK-DESIGN.md) and [taxonomy background](TAXONOMY-LANDSCAPE.md)
- [Presentation runbook](PRESENTATION-RUNBOOK.md) and [TurnLens poster](output/pdf/turnlens-poster-36x24-research-layout.pdf)

Run the Node tests with `node --test online-judge.test.mjs extension/focused-scorer.test.mjs`.
