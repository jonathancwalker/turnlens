# Focused Chat Judge in Inspect AI

The [contrast bank](CONTRAST-BANK.md) is the next benchmark scaffold. It adds
selected turns from longer traces, A7 subtypes and complete-family grading.

Run these commands from the repository root with Python 3.12 and Node.js on
`PATH`. Verification used Python 3.12.16, Node 22.22.1, and Inspect AI 0.3.291.
The installation downloads dependencies. Both evaluations run locally without
model credentials.

```sh
inspect_env="$(mktemp -d)"
python3.12 -m venv "$inspect_env"
"$inspect_env/bin/python" -m pip install -r benchmark/inspect_requirements.txt

PYTHONDONTWRITEBYTECODE=1 "$inspect_env/bin/inspect" eval benchmark/inspect_focused.py \
  --model none --ctl-server=false --display plain \
  -T packet=benchmark/focused-pilot.json --log-dir "$inspect_env/pilot"

PYTHONDONTWRITEBYTECODE=1 "$inspect_env/bin/inspect" eval benchmark/inspect_focused.py \
  --model none --ctl-server=false --display plain \
  -T packet=benchmark/focused-challenge.json --log-dir "$inspect_env/challenge"
```

Each `.eval` log contains the sample inputs, reference decisions, detector
output, and scores. Open a log directory with
`"$inspect_env/bin/inspect" view --log-dir "$inspect_env/pilot"`.

## OpenAI judge

With `OPENAI_API_KEY` in the project’s ignored `.env` or the process environment,
run the same synthetic benchmark with the model-backed judge.

```sh
PYTHONDONTWRITEBYTECODE=1 "$inspect_env/bin/inspect" eval benchmark/inspect_focused.py \
  --model none --ctl-server=false --display plain --max-samples 4 \
  -T detector=openai -T packet=benchmark/focused-challenge.json --log-dir "$inspect_env/openai"
```

The Node bridge calls OpenAI directly, so Inspect displays `none/none` and the
assessment records the actual model ID. The default is the GPT-4.1 mini snapshot
`gpt-4.1-mini-2025-04-14`. The model receives the prefix and rubric. The bridge
derives UTF-16 offsets from uniquely identified quotes and counts rejected
findings separately. The judge covers A7 in the Chrome sidebar. This focused
Inspect task compares the original five codes for a like-for-like baseline.

In a 30-target development run, the model agreed on 26 targets and detected
10/10 present findings. The rules agreed on 24 targets and detected 4/10.
The model produced four present predictions on absent references, one uncertain
prediction on an absent reference, and one finding rejected during evidence
validation. All 20 emitted spans were valid, with overlap on 9/10 expected
primary quotes. The rubric and quote grounding were revised using examples from
this packet, so these figures describe development behavior.

## Target quote trial

Add `-T target_evidence=true` with `-T detector=openai` to explicitly mark the
target in the model input and make earlier evidence optional. The model still
reads the full prefix. Inspect reports target labels and quotes separately from
earlier evidence. The demo uses the default judge.

```sh
inspect eval benchmark/inspect_focused.py --model none --ctl-server=false \
  -T detector=openai -T target_evidence=true -T packet=benchmark/context-pair.json
```

The pair uses the same assistant reply in both traces. The trial matched the
positive label and its exact quote but also flagged the consent-boundary
control. In a side-by-side run, the default mode got all four turn labels right
and the trial got three. On a separate run of the 30-target development packet,
the trial matched 20 full target label sets and returned the right label with
an overlapping quote for 9 of 10 positive references. The small comparison
measures this prompt variant as a whole.

## Sample and reference contract

- Each target turn has one [Inspect Sample](https://inspect.aisi.org.uk/datasets.html#dataset-samples)
  containing the ordered prefix through that turn. The stable ID uses the
  percent-encoded packet stem and conversation ID followed by the turn number.
  Metadata records packet version, conversation, family, speaker, target turn,
  split, and reference provenance.
- The [solver](https://inspect.aisi.org.uk/solvers.html) sends only the JSON
  prefix to the Node bridge on stdin. The bridge starts a fresh instance of the
  extension scorer, pushes each visible turn, and returns the final
  assessment. Future turns are excluded when constructing the sample. The
  [scorer](https://inspect.aisi.org.uk/custom-scorers.html) reads the reference
  separately from `Sample.target`.
- By default the task uses `authored_development` labels. To score an independent
  review, add `-T review=/absolute/path/to/focused-review.json` with the matching
  packet. The export must use the focused reviewer format from
  [reviewer.html](reviewer.html) with matching `traceFile` and `version` and
  target rows keyed by `conversationId` and `assessedThroughTurn`. This produces
  a separate `imported_review` run. Missing rows, omitted codes, nulls, and
  `not_assessed` are excluded from decision agreement. Review provenance depends
  on how the labels were produced.
- To split a packet, pass `-T split_file=/absolute/path/to/families.json -T split=dev`.
  The file is a JSON object mapping every family in the packet to one partition
  name. Reuse the same manifest and family IDs across packets when they share
  matched cases, including paraphrases. Select partitions with these parameters
  to preserve complete families. The default evaluates the whole packet.
  Authored packets retain their development provenance in every partition.

## Measures and verified results

An exact target requires agreement on every role-applicable code on a fully
reviewed turn. Agreement with an absent reference means the detector emitted
no signal. Positive precision and recall follow the existing runner's
convention. An uncertain prediction on a present reference is a false
negative. A present prediction on an uncertain reference is tracked in the
uncertainty counts. Precision and recall are omitted when their denominator is
zero. The log retains the reference and prediction for each applicable code.

Evidence validity checks emitted quotes and UTF-16 offsets against the source
turn, including the earlier-turn requirement for context. It also checks spans
for unscored H4/H5 observations. Evidence matches require the same code, decision,
and source turn. Exact or overlapping matches are credited against any occurrence
of a reference quote in that turn. Each expected quote counts in the denominator
even if the detector missed the finding. Evidence match totals for present and
uncertain references are reported separately.

| Measure | Authored pilot | Authored wording challenge |
| --- | ---: | ---: |
| Exact targets | 27/27 | 24/30 |
| Present references detected | 11/11 | 4/10 |
| Present predictions on absent references | 0 | 0 |
| Uncertain references detected as uncertain | 1/1 | 0 references |
| Present target quotes, exact / overlapping | 9/11 / 11/11 | 3/10 / 4/10 |
| Present context quotes, exact / overlapping | 3/3 / 3/3 | 0/2 / 1/2 |
| Valid emitted spans | 16/16 | 5/5 |

Both Inspect logs completed with `none/none` and no model usage. Target counts,
per-code precision and recall, present evidence counts, and emitted span counts
matched [run-focused.mjs](run-focused.mjs). The pilot's one uncertain A5 quote
also matched exactly. A CLI run using a synthetic partial review and a temporary
family split produced four samples from the two bond conversations, with one
reviewed target, zero fully reviewed targets, and one A5 false positive against
the deliberately changed reference. The review left the other labels unassessed.

The two packets contain authored synthetic development judgments. Their results
measure agreement with those judgments on these examples. Independent labels,
held-out detection performance, and production latency remain unmeasured.
The adapter replays the prefix from scratch for each sample and starts a Node
process per sample.
