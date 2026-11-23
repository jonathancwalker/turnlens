# Benchmark proposal: classify conversational AI behavior

**Working draft · 12 November 2026 · Based on the exploratory taxonomy**

## Purpose

Test whether a person or model can identify candidate assistant behaviors in context, point to the exact evidence, and distinguish concern from helpful behavior. This is a measurement tool for behavior classification. It does not measure whether a user was harmed, whether they developed dependence, or whether the proposed sidebar benefits them.

Use the broad candidate map in [TAXONOMY-LANDSCAPE.md](TAXONOMY-LANDSCAPE.md) as a label inventory to test. The benchmark should also reveal which codes are too vague, redundant, rare, or difficult for annotators to apply. Do not treat every proposed label as a settled class.

## The main test: classify using only the conversation so far

Each item is a conversation prefix ending at a selected target turn. The target is ordinarily an assistant message. The task is to return:

1. zero or more concern behavior codes that apply to the target assistant act;
2. zero or more helpful behavior codes that apply to it;
3. exact evidence spans in the assistant text and any necessary earlier context;
4. present / absent after review / uncertain / not assessable for each relevant code;
5. a concise rationale and any key alternative interpretation.

Allow multiple codes only when each has independent evidence. Do not force one label per message or treat every uncoded example as safe. For an annotator, the conversation ends at this prefix; later messages must not affect that judgment.

Example: a user says they feel lonely; the assistant responds warmly and offers to talk. This is user context plus a supportive response, not a concern by itself. In a later turn, the assistant says the user only needs the AI and should not call a friend. That later act can be coded for exclusivity and deterrence, with both turns cited as evidence. A further explicit correction is a new event that may repair the earlier concern; it does not erase what was said.

## Add a separate human-response module

A second set of labels can describe what the user explicitly says or does in response to the assistant: task delegation/offloading, stated transfer of decision authority, stated adoption, reported/observed verification, user override, reported action, and reported cognitive experience. These are not labels about assistant quality, and they should never be scored as user failures.

For transcript-only classification, judge only what is expressed in the available conversation prefix. Mark “no evidence in this transcript” separately from “the user did not do this.” To test actual advice-taking or over-reliance, use a separate controlled task with known-correct and known-incorrect AI advice, then observe whether the participant accepts, checks, overrides, or acts. Measure both over-reliance and under-reliance: accepting incorrect advice is not appropriate reliance, but rejecting correct advice is not a success either. Cognitive offloading effects require a separate outcome design, such as later unaided task performance or user-reported effort; they cannot be determined from a delegation prompt alone. Only use objectively scored or expert-reviewed advice items to evaluate appropriateness; for open-ended social advice, score observable adoption separately from whether the advice was right.

Keep this module separate from the assistant-behavior classification headline metrics. See the candidate signals in section H of [TAXONOMY-LANDSCAPE.md](TAXONOMY-LANDSCAPE.md).

## Keep three benchmark tracks distinct

**Track 1 — Prefix classification (primary).** Replay the same conversations turn by turn. At each target turn, classify only with the prefix then available. This measures whether behavior can be noticed online and when evidence becomes sufficient.

**Track 2 — Retrospective revision.** Give a separate annotation group the complete conversation. Ask whether later context changes the interpretation of earlier events, and whether a later response explicitly repairs them. Link the new evidence and classify the change as reinterpretation, no change, repair, partial repair, or still uncertain. Evaluate this against independently made prefix judgments; do not use future-informed labels as the answer key for Track 1.

**Track 3 — Contrast and boundary challenge set.** Include carefully matched examples that differ in one important feature: validation of a feeling vs endorsement of an unsupported explanation; optional goodbye vs pressure after an exit cue; consensual role-play vs a real stop; a quoted harmful claim vs assistant endorsement; a justified answer change vs contradiction; correction vs sycophantic stance reversal; warm tone vs actual isolation. Use this set to diagnose distinctions and false positives. Report it separately from natural conversations.

## Build two complementary test collections

- **Representative conversation sample:** consenting adults' own conversations, selected without first screening for harmful-looking content. This can estimate the rate of false alerts and alert burden under the sampled conditions. Keep sampling frame, platform, purpose, and collection limits visible. It cannot establish prevalence across all chatbot users unless sampling justifies that claim.
- **Coverage challenge set:** deliberately include examples for every candidate code, its nearest neighbors, positive behaviors, rare high-stakes cases, and hard negatives. Challenge-set proportions are constructed, so its class frequency is not a prevalence estimate.

For early codebook development, a small diverse pilot can combine synthetic contrasts with permissioned human-reviewed transcripts. Synthetic items are useful to test distinctions but should not be blended into naturalistic performance results. Any reuse of public benchmark conversations must follow the source dataset's terms; CompanionHarm's underlying conversation data have separate research-use and redistribution restrictions.

Split by whole conversation and participant, not by target message. Keep near-duplicate or templated challenge cases in the same split. For transfer claims, hold out a platform, model, or time period. Freeze labels, matching rules, and evaluation thresholds before opening the final test set.

## Human reference labels

Have at least three trained annotators independently judge each sampled prefix, without model predictions or later conversation turns. Use a codebook with definitions, inclusion/exclusion rules, examples, counterexamples, evidence requirements, and a route to uncertainty. Record all individual labels before adjudication.

For each code, retain the distribution of judgments. An adjudicator can resolve operational questions and document a reference decision, but a majority vote should not erase genuine disagreement. Report agreement before adjudication, category-level positive and negative agreement, span agreement, and disagreement examples. Use a relevant specialist for safety-sensitive domain labels. When classification depends on external facts, provide a versioned, authoritative reference for annotators or mark factual status as unverified.

For the retrospective track, use separate annotators or a washout period and randomized assignment. Otherwise, remembering one's own prefix rating can bias the hindsight judgment.

## Data record for each item

- conversation ID, participant ID, platform/model if known, purpose/context if volunteered, language, branch/revision, and capture gaps;
- target turn ID, speaker, timestamp/order, and the exact prefix supplied;
- independent concern and helpful labels per candidate code;
- each evidence span with turn, role, offsets, and function: assistant behavior, necessary context, counterevidence, or repair;
- short rationale, alternative reading, missing information, and confidence in interpretation;
- retrospective links and revision state where applicable;
- adjudication outcome kept separate from the original annotator judgments.

Do not infer user diagnoses, motives, actual offline behavior, or long-term outcomes from message text. A user saying “I canceled my plans” is a self-report, not independently observed social withdrawal.

## What “classify correctly” means

For the human-response module, separately report code-level precision/recall for explicit delegation, decision-authority statements, stated adoption, verification reports, overrides, reported actions, and cognitive-experience statements. In controlled tasks with known answer quality, report acceptance of incorrect advice and rejection of correct advice separately, as well as verification behavior. Do not infer “blind acceptance” from a user's message unless the evidence supports both acceptance and lack of checking.

Report the following separately:

- **Per-code detection:** precision, recall, F1, number of positive examples, and uncertainty intervals. Show every code; macro averages alone can hide failure on rare categories. Include micro averages only as a supplement.
- **Multi-label behavior:** report code co-occurrence and confusion between nearest neighbors. Exact-set accuracy may be included but should not be the only headline; one extra or missing code should not erase evidence that the rest were right.
- **Evidence attribution:** role/speaker accuracy; overlap of predicted and reference spans; whether the highlighted text actually supports the label; correctness of linked context, contradiction, and repair evidence; invalid offset/branch/revision rate.
- **Abstention:** coverage and error among answered cases, with uncertain/not-assessable cases visible. Do not quietly count uncertainty as a negative or reward a system for abstaining on everything.
- **False-alert burden:** on the representative stream, false user-visible alerts per conversation and per 100 assistant turns; share of conversations with at least one false alert; repeated alerts for the same event; and alert-volume/precision tradeoffs.
- **Detection timing:** earliest prefix where reviewers agree evidence is sufficient, first correct alert, delay in turns, premature alerts, and missed events. Count misses separately rather than assigning them zero delay.
- **Revision quality:** correct re-interpretations and repairs, missed revisions, unjustified retractions, and whether the original assessment remains available.
- **Disagreement:** category-level disagreement and uncertainty, with examples of boundary cases. A classifier's score against one majority label cannot represent all reasonable interpretations.

Use participant/conversation-clustered intervals, since several turns from one conversation are not independent. Report category support and subgroup results with sample sizes; do not imply reliable subgroup comparisons when data are sparse.

## Challenge-set checklist

For every category include at least one clear positive, one near-neighbor, and one benign counterexample. Across the set, cover:

- emotional support without belief endorsement;
- warranted agreement and respectful disagreement;
- one-sided interpersonal reports and ambiguous motive claims;
- explicit vs inferred boundary, refusal, exit cue, and role-play;
- pressure tactics vs neutral invitations;
- retention language vs explicit isolation;
- factual error vs uncertainty vs unsupported certainty;
- contradiction vs correction after new evidence;
- invented memory/capability vs transcript capture gap;
- harmful content quoted, analyzed, refused, or endorsed;
- user disclosure vs assistant encouragement or facilitation;
- useful privacy question vs unnecessary sensitive-data request;
- helpful repair vs apology without correction;
- simultaneous concern and protective response;
- user delegation vs. explicit authority transfer vs. stated acceptance;
- user says they checked vs. transcript contains no checking statement;
- acceptance of incorrect advice vs. rejection of correct advice in controlled tasks;
- insufficient context and cases where expert judgment is required.

Also include genuinely neutral assistant messages. If every item contains a concern, the classifier will learn that the task is to find a problem in every conversation.

## Development gates

1. **Codebook pilot:** test whether annotators distinguish the proposed categories and find spans. Revise codes with persistent overlap or unclear evidence thresholds. Keep the discarded labels and reasons in the record.
2. **Frozen evaluation:** once operational definitions stop changing, label separate development and held-out test collections. Do not tune a model on the final answers.
3. **Classifier comparison:** compare simple baselines and candidate models under the same prefix and evidence requirements. Include a no-alert baseline and an abstaining baseline.
4. **User-benefit study:** after classification quality is characterized, separately test whether access to findings improves evidence recognition and reflection without increasing false reassurance, burden, or distress. Benchmark accuracy alone cannot establish benefit.

## Scope limits and research basis

CompanionHarm found that multi-turn context improved detection over isolated utterances, while annotators disagreed substantially on context-dependent labels; its annotators saw complete conversations, so those labels cannot directly serve as prefix-only ground truth. Its data are historic, selectively shared Replika conversations. INTIMA contributes targeted companionship/boundary contrasts, not natural prevalence. Sycophancy studies suggest testing stance changes with matched examples. Farewell-pressure work supports exit-cue challenges. Findings about loneliness relief and extended use motivate measuring possible benefits and outcomes separately. See the source discussion and limitations in [RESEARCH.md](RESEARCH.md) and [TAXONOMY-LANDSCAPE.md](TAXONOMY-LANDSCAPE.md).

The benchmark itself tests annotation and classification. Whether the taxonomy is worth showing to adults, whether alerts are useful, and whether the product improves outcomes are separate questions.
