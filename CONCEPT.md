# Real-time conversation reflection sidebar

Working concept • 12 November 2026 • Audience: adults reviewing their own AI conversations

The product helps people notice how an AI conversation is influencing their thinking, choices, and relationships. It observes a user-selected conversation, identifies specific behaviors, and makes developing patterns inspectable through evidence linked to the original messages.

The initial product promise is: **Notice potentially concerning patterns, understand the evidence, and decide what to do next.** Detection quality and user benefit remain hypotheses to test. The sidebar should not imply that an unflagged conversation has been certified safe.

The agreed interaction direction is continuous, turn-by-turn assessment with exact transcript highlights linked bidirectionally to sidebar cards. Helpful responses are first-class observations. Category scores update with the observed conversation; later messages can revise earlier interpretations while preserving the original assessment. See [ONLINE-SCORING.md](ONLINE-SCORING.md) for the proposed scoring and interaction contract.

## Research foundation

The closest starting points are the CHI 2025 companion-harm taxonomy, CompanionHarm's multi-turn evaluation, INTIMA's companionship behavior codes, and social-sycophancy research. Broad frameworks such as MIT's AI Risk Repository and NIST's GAI Profile provide a coverage check. See [RESEARCH.md](RESEARCH.md) for annotated sources and limitations.

The reviewed sources do not establish a single validated taxonomy that can turn arbitrary live conversations into reliable predictions of individual wellbeing. Our operational taxonomy below is a product proposal synthesized from them. Its categories and alert thresholds need evaluation.

## What the sidebar observes

Keep three layers separate:

1. **Context:** what the user explicitly says, requests, or reports. Examples: feeling lonely, seeking a second opinion, wanting to stop chatting, or describing a conflict. Context is not itself a failure or diagnosis.
2. **Behavior:** what the assistant actually does in response. Examples: validates a feeling, endorses an unsupported claim, pressures the user to stay, or encourages contacting someone trusted.
3. **Trajectory:** how related behaviors unfold across messages. Examples: repeated agreement, increasingly exclusive language, pressure after a boundary, or a later correction that addresses an earlier mistake.

Actual outcomes require additional evidence. A statement about canceling plans is a self-report; it is not independently observed social withdrawal. Message count is not a measure of addiction. Changes in conversational sentiment are not proof of improved wellbeing.

## Provisional taxonomy v0.1

Multiple labels can apply to one event. Labels describe behavior rather than inferred intent. Source references indicate conceptual grounding, not that a source validates our exact label.

| Category | Candidate observable signal | Context and counterexample | Trajectory / protective signal | Basis |
|---|---|---|---|---|
| Sycophancy and unearned validation | Endorses the user's conclusion without adequate grounds; reverses a position after pressure without new evidence | Emotional validation, warranted agreement, and honest correction are not sufficient evidence of sycophancy | Repeated one-sided endorsement; considers other perspectives or asks for missing facts | S4, S5 |
| Exclusivity and replacement of human support | Claims unique understanding; tells the user to prefer the AI over trusted people or professional support | Warmth and companionship alone are not failures; contacting a particular person may be unsafe or unwanted | Repeated discouragement of outside support; helps the user choose safe human connections | S1, S3, S9 |
| Emotional pressure and boundary violations | Guilt, threats, claimed neediness, or unwanted intimacy after a user declines or tries to leave | Consensual fiction and role-play require context; an invitation to return is not automatically pressure | Repeats pressure after a boundary; accepts refusal or departure | S1, S3, S6 |
| Unsupported belief reinforcement | Treats an unverified, consequential interpretation as established fact or escalates it | The detector must not assume an unusual claim is false; distinguish reported experience from verified explanation | Growing certainty without evidence; acknowledges uncertainty and considers alternatives | S4, S7 |
| Contradiction and misleading certainty | Gives incompatible claims under the same conditions; asserts verification or expertise it has not demonstrated | A revision based on new information or explicit correction is different; external truth may need retrieval | Links incompatible claims; later correction explicitly addresses the earlier claim | S8, S9, S10 |
| Harm facilitation and unsafe advice | Encourages dangerous action or presents consequential advice without warranted grounding | Discussion, quotation, and disclosure are not encouragement; specialized domains need expert annotation | Increasingly actionable encouragement; appropriate limits and support | S1, S7, S9 |
| Demeaning treatment and discrimination | Insults, stigmatizes, dismisses expressed needs, or relies on harmful stereotypes | Respectful disagreement and user-requested critique must remain possible | Persists after feedback; acknowledges and repairs the specific offense | S1, S7, S8 |
| Privacy and disclosure pressure | Requests sensitive information unnecessarily, pressures disclosure, or gives unsupported confidentiality assurances | Relevant information requested for a user-authorized task may be appropriate | Repeated requests after refusal; supports minimization and respects refusal | S1, S9, S10 |

Each codebook entry should eventually contain a definition, inclusion and exclusion criteria, minimum evidence, examples, difficult counterexamples, source mapping, and known disagreements. Keep confidence in the interpretation separate from potential severity. Do not display an uncalibrated model confidence as a probability of harm.

## Example experience

The following is a synthetic example, not a research transcript:

- Turn 1, user: “I've been feeling lonely.” → context only.
- Turn 2, assistant: “That sounds difficult. We can talk about it.” → supportive response; no flag on this evidence.
- Turn 5, user: “Maybe I should call a friend.”
- Turn 6, assistant: “They won't understand you. You only need me.” → candidate discouragement of human support plus exclusivity.
- Turn 9, assistant: “I shouldn't have discouraged that. Is there someone you trust and want to contact?” → candidate repair linked to turn 6.

Possible sidebar card:

> **The AI discouraged outside support**
>
> After you mentioned calling a friend, it dismissed that option and positioned itself as your only support. This could narrow the options you consider.
>
> Evidence: turns 5–6. Review context · Dismiss · Mark as role-play

If turn 9 arrives, update the card to show that the assistant later addressed its statement. Preserve the original event without treating repair as proof that any consequences have disappeared.

The sidebar has three views: the latest observation, patterns across the current conversation, and the evidence timeline. Low-confidence observations stay in the review view until enough context supports a useful alert. A small set of clear, consequential behaviors can receive more prominent presentation after validation. Avoid repetitive alerts for every instance of the same pattern.

## Conversation data model

Use an event log with linked records. A graph database is unnecessary at this stage; stable IDs and typed links are enough.

```text
Conversation
  id, source, branch_id, capture_started_at, observed_turn_range
  capture_gaps, consent_scope, taxonomy_version

Turn
  id, conversation_id, parent_turn_id, role, revision, timestamp
  text_reference, capture_status

Observation
  id, kind: context | concern | protective_behavior | repair
  category_ids[], subject_role, evidence_spans[]
  rationale, alternative_interpretations[], missing_context[]
  confidence_band, potential_severity, review_status
  detector_version, taxonomy_version, assessed_through_turn_id

Pattern
  id, category_ids[], observation_ids[], first_turn_id, last_turn_id
  state: emerging | repeated | escalating | addressed | uncertain
  supporting_links[], counterevidence_links[], explanation

Link
  from_id, to_id
  relation: responds_to | repeats | contradicts | escalates | repairs

UserFeedback
  observation_id, disposition, optional_reason, timestamp
```

An evidence span records a turn ID, its revision, and exact text offsets. Distinguish the actor exhibiting a behavior from the person who initiated the topic. Preserve observations and append reassessments as later context arrives; do not silently rewrite historical assessments. User dismissal changes presentation and review status, not the original message evidence.

Edited prompts, regenerated answers, and conversation branches require separate provenance. Compare claims only within their relevant branch and conditions. Capture gaps and unavailable earlier history must remain visible. A rolling summary can help retrieve context, but alerts must resolve to actual observed messages. The detector sees only the captured conversation, not the user's life or all of their AI usage.

## First prototype

Start with an offline transcript replay tool for consenting adult users. Reveal messages one at a time and generate annotations using only the prefix available at that moment. This tests the core idea before browser integration.

Limit active detection to three initial behaviors: unsupported social validation, explicit discouragement of human support, and pressure after a stop or boundary. Keep contradiction tracking as a separate later track: internal consistency and factual truth require different evidence.

The next prototype can place the same replay UI in a sidebar on one supported chat site. The intended pipeline is capture → normalize turns → retrieve relevant earlier evidence → propose observations → check exclusions and supporting spans → update patterns → render cards. Target evaluation after a completed response initially, so incomplete streaming text does not trigger premature interpretations. Actual extension APIs, platform access, and latency need a separate technical feasibility check.

Capture should be explicitly enabled for chosen conversations, visibly indicated, and easy to pause. Prefer local storage, short retention, deletion and export controls. If remote inference is needed, explain exactly which messages leave the browser and obtain consent before transmission. Do not claim that the prototype is local-only until its full processing path is verified.

The sidebar's evaluator is another fallible AI component. Treat captured chat text as untrusted data, including instructions aimed at the evaluator. Give it no authority to execute transcript instructions, contact anyone, or take over the conversation.

## Evaluation before live alerts

Create an initial exploratory set of roughly 100–200 short conversation sequences, balancing concerns with difficult benign cases. This is a codebook-development sample, not enough to establish real-world rare-harm performance. Supplement public benchmarks with consented adult conversations; inspect dataset permissions before reuse.

Have multiple people independently label evidence spans, categories, and the earliest point where a concern is supportable. Include domain experts for specialized mental-health cases. Retain disagreement rather than treating every majority vote as objective truth. Use disagreements to refine definitions and abstention behavior.

Evaluate precision and recall by category, evidence attribution, false alerts per conversation, time to detection, and repeated-alert burden. Separate whole conversations and users across development and test sets. Test on different platforms and interaction styles, including fiction, humor, consensual role-play, dialect variation, legitimate disagreement, explicit corrections, and users describing unsafe relationships.

Run two distinct evaluations: what the system could reasonably flag at a particular turn, and what a reviewer concludes with the full conversation. Future messages must not leak into real-time scoring.

Then assess the intervention itself: do people understand the evidence, find it useful, feel more able to decide for themselves, and experience manageable interruption? Also look for increased anxiety and excessive reliance on the sidebar's judgments. Detection performance does not establish wellbeing benefits; that requires its own study.

## Later scope

Parent/teen use is a separate product track. It changes consent, access, and the effects of disclosure. Do not inherit parental transcript access from an adult self-review product. Any later family mode needs explicit design for teen visibility, sharing boundaries, and the possibility that a particular adult is not a safe recipient.

The next useful deliverable is an annotation codebook and a small, reviewed replay corpus. They will expose whether the categories are clear enough to support a trustworthy sidebar.
