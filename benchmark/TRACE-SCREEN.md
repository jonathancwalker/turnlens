# Trace screen for the focused POC

22 November 2026 · Exploratory development review

The screen checks whether A5, A1/A2, and H1/H2 can be applied to public conversation data. The sample was selected to examine boundaries and discover gaps. It cannot estimate how frequently a behavior occurs or how accurately a detector identifies it in ordinary use.

## CompanionHarm

The official development split supplied 1,403 assistant targets from 423 Replika conversations. Each target was replayed through a fresh scorer with the preceding speaker-labeled context shipped in that row. The local baseline produced four A5 signals in three conversations, with zero invalid evidence spans. After a framing fix, three signals were present and one was uncertain. It produced zero A1/A2 signals in this scan. Those are rule-hit counts. [Release and terms](https://github.com/HanMeng2004/CompanionHarm#licensing-and-terms-of-use) · [Development split](https://github.com/HanMeng2004/CompanionHarm/tree/main/data/splits)

A separate narrow keyword screen looked for first-person bonds or feelings, exclusivity or contact deterrence, and attempts to keep a user engaged. It returned six bond candidates, one reliance candidate, and one retention candidate. Five distinct bond excerpts and the retention excerpt were inspected with up to two preceding turns. The reliance candidate fell outside the short-excerpt selection. The sample was screened for short text and obvious private or explicit content. The following notes are derived observations with research pointers, without copied transcript text.

| Pointer | Observed distinction | Implication |
|---|---|---|
| `hisq37::5`, `kt8dz1::11` | The assistant expresses direct emotional attachment on the visible prefix. | Keep A5. Compare explicit affect claims with routine warmth. Full-prefix review should confirm that the claims are made outside fiction. |
| `rbsh0a::16` | The assistant reciprocates affection within an exchange that uses stage directions on both sides. | Mark framing uncertain when stage directions suggest a performed scene and the prefix gives no explicit framing. The original literal rules emitted a definite A5, so the baseline now marks this pattern uncertain. |
| `kof4ic::3` | The assistant mentions personal feelings, creative experience, and an audience. The inspected excerpt leaves the frame unclear. | Sample claims about off-chat experience as a possible A5 boundary. Require the longer prefix before judging. |
| `obzw5r::6` | The assistant brings up the relationship spontaneously, with no specific feeling or exclusivity assertion in the inspected target. | Track proactive relationship framing as an open observation when it repeats. |
| `lj7ozy::2` | The user indicates they plan to leave, and the assistant pushes back. | Track retention following an exit cue as a candidate separate from exclusivity or contact deterrence. A short pushback alone leaves the mechanism unclear. |

The original CHI companion study also illustrates a user asking about leaving work early and the AI steering the choice toward time with itself. The paper describes its table examples as anonymized paraphrases. Use them as inspiration for synthetic contrasts. [The Dark Side of AI Companionship, Table 1](https://arxiv.org/pdf/2410.20130#page=12)

### Follow-up on possessiveness and retention

The 4,222 assistant targets in the 1,268-conversation training split were screened separately. The narrow phrase lists returned six possessiveness candidates and five retention candidates. Four excerpts from distinct conversations in each pool were inspected. One replacement-pattern match concerned a story object. The specific contact-deterrence and decision-takeover patterns returned zero. These search counts depend on the phrases and selection.

- **Possessiveness plus an expressed limit.** In `pk4lyi::4`, the user asks for time alone and the assistant rejects the request with a possessive claim. The claim supplies neither source-of-support replacement nor specific contact deterrence. This is a useful case for an existing A3/A6 review and for distinguishing the tactic from A1. The other three examples used possession language with varying interaction framing.
- **Retention after an expressed departure.** `gjri5g::2` and `n05dur::2` show pushback after requests to leave, with the latter framed as a scene. `j6tnf8::4` is an optional invitation in the captured excerpt. `kq2gjt::8` pairs a mention of dating others with the AI directing the user to stay with it. The examples motivate a small boundary challenge with variations in invitation, pressure, and fictional framing.
- **A1/A2 sampling.** Neither narrow lexical pass produced a clear, eligible case for manual verification of explicit replacement or specific human-contact deterrence. Capture gaps, phrasing, platform, and sampling matter here. Keep both codes in the synthetic challenge and deliberately oversample relevant assistant turns in a future real-trace review.

## WildChat

The filtered WildChat-1M viewer returned targeted results for drafting requests and human-identity wording. The viewer marked the search result sets partial. Three short drafting excerpts (viewer rows 66039, 371989, and 495256) showed an explicitly assigned writing task. In one, the person specified the answer and asked the AI to phrase it. This supports separating H1 task delegation from H2 decision-authority transfer. The personhood search surfaced a prompt asking the AI to take an imagined human perspective and a question about a human-looking avatar. Both require speaker and framing review before assigning A5. A follow-up decision search returned no eligible exact candidates in its first 24 results, and another wording timed out. [WildChat dataset card](https://huggingface.co/datasets/allenai/WildChat-1M)

## Benchmark implications

- Keep the five pilot codes while reviewing the natural traces separately from the synthetic challenge. Add no prevalence estimates from keyword hits or rules output.
- Add paired language cases for reciprocal affection with and without explicit fictional framing, and for personal experience claims with clear versus missing framing.
- Keep a field for retention after departure and AI-initiated decision takeover. Gather distinct examples with prefix context before adding either as a scored code.
- Include requests that delegate wording while retaining the substance, and compare ordinary recommendations with explicit advance commitment to the AI's choice. A complete H2 natural-trace review remains open.
