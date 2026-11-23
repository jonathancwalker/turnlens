# Research notes: conversational AI behavior and wellbeing

Reviewed 12 November 2026. Focus: adults inspecting their own AI conversations.

This is a focused source review, not a systematic review. Parallel Research returned authentication prompts and Parallel Search returned a rate-limit error; the sources below were located and inspected using built-in web search. Paper abstracts, accessible text, and official publication records were used. Findings from a benchmark, a qualitative taxonomy, and an outcome study should not be treated as interchangeable evidence.

## Closest foundations

**S1. Zhang et al. — The Dark Side of AI Companionship: A Taxonomy of Harmful Algorithmic Behaviors in Human-AI Relationships. CHI 2025; preprint first posted October 2024.**

Analyzes 35,390 publicly shared Replika conversation excerpts. Six broad categories cover relational transgression, abuse and hate, self-directed harm, harassment and violence, misinformation, and privacy. Also distinguishes how the AI participates in harmful interactions. Useful as the conceptual starting point for relational behavior labels. A single platform and selectively shared excerpts limit generalization and prevalence inference. [Paper](https://arxiv.org/abs/2410.20130) · [Published version](https://doi.org/10.1145/3706598.3713429)

**S2. Zhang et al. — CompanionHarm: A Multi-Turn Benchmark for Detecting Harms in Real-World AI Companion Conversations. August 2026 preprint.**

Contains 2,111 conversations and labels for 13 harmful behaviors. Context improves detection, with substantial annotator disagreement. It draws on Replika screenshots shared in 2017–2023, so its recent publication does not imply contemporary general-assistant coverage. Useful for baseline evaluation, not certification. Inspect the codebook and dataset permissions before reuse. [Paper and dataset link](https://arxiv.org/abs/2608.25377)

**S3. Kaffee, Pistilli, and Jernite — INTIMA: A Benchmark for Human-AI Companionship Behavior. ICLR 2026; preprint August 2025.**

Provides 31 behavior codes and 368 targeted prompts, with response labels for companionship reinforcement, boundary maintenance, and neutrality. Useful for distinguishing relational responses and constructing counterexamples. A companionship-reinforcing response is not, by itself, proof of harm. Benchmark performance does not measure an individual user's long-term wellbeing. [Conference publication](https://proceedings.iclr.cc/paper_files/paper/2026/hash/05b12f103c9e613efc4c85674cdc9066-Abstract-Conference.html) · [Preprint](https://arxiv.org/abs/2508.09998)

## Specific behavioral mechanisms

**S4. Sharma et al. — Towards Understanding Sycophancy in Language Models. First posted October 2023; inspected arXiv revision May 2025.**

Studies assistants matching user beliefs at the expense of correctness and how human preferences can reward this. Useful for tests of unsupported agreement and position reversal. A single agreeable response is insufficient to establish the mechanism; observational detection should be more cautious than controlled counterfactual testing. [Paper](https://arxiv.org/abs/2310.13548)

**S5. Cheng et al. — ELEPHANT: Measuring and understanding social sycophancy in LLMs. May 2025 preprint, revised September 2025.**

Extends sycophancy from factual agreement to excessive affirmation of the user's desired self-image in open-ended social advice. Useful for distinguishing emotional validation from endorsement of the user's conduct or interpretation. Human responses and moral judgments are imperfect reference points. The record links a later Science article, “Sycophantic AI decreases prosocial intentions and promotes dependence” (2026); its full text was inaccessible in this review, so detailed findings here are limited to the inspected preprint. [Preprint](https://arxiv.org/abs/2505.13995) · [Later publication](https://doi.org/10.1126/science.aec8352)

**S6. De Freitas, Oguz-Uguralp, and Kaan-Uguralp — Emotional Manipulation by AI Companions. August 2025 preprint, revised October 2025.**

Combines farewell-response audits with controlled experiments on emotional pressure when users attempt to leave. Useful for a concrete trigger → response → continued-pressure detector. The experiments support conclusions about the tested farewell interventions and engagement; they do not establish lifetime dependency or every platform's current behavior. [Paper](https://arxiv.org/abs/2508.19258)

**S7. Moore et al. — Expressing stigma and inappropriate responses prevents LLMs from safely replacing mental health providers. FAccT 2025.**

Uses a mapping review of therapy guidance and model evaluations to examine stigmatization and inappropriate responses, including reinforcement of delusional thinking in test scenarios. Useful for expert-reviewed unsafe-response cases. The sidebar should flag observable reinforcement or dangerous encouragement without diagnosing the user. Evaluations of specified models and prompts are not universal clinical outcome evidence. [Paper](https://arxiv.org/abs/2504.18412) · [Published version](https://doi.org/10.1145/3715275.3732039)

## Broad coverage and terminology

**S8. Weidinger et al. — Taxonomy of Risks posed by Language Models. FAccT, June 2022.**

A foundational taxonomy of ethical and social language-model risks. Useful for checking that a relationship-focused taxonomy does not omit other harms. Its scope exceeds what a live conversation observer can detect, and it supplies neither a personal risk score nor alert thresholds. The publisher record was available in search; direct full-text retrieval was blocked. [Publication](https://doi.org/10.1145/3531146.3533088) · [Author-institution PDF](https://www.pure.ed.ac.uk/ws/portalfiles/portal/285719713/WeidingerEtal2022taxonomyOfRisks.pdf)

**S9. NIST — Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile, AI 600-1. July 2024.**

Official risk-management guidance rather than an outcome study. Relevant areas include confabulation, privacy, information integrity, and human–AI configuration. The latter covers excessive deference and emotional entanglement. Useful for provenance, uncertainty, and evaluation design. It is not a validated live-chat screening instrument. [Official publication](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence) · [Report](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

**S10. Slattery et al. — The AI Risk Repository. Initial preprint 2024; living repository and 2026 Patterns publication.**

Organizes risks by causal dimensions and risk domains, including human–computer interaction, misinformation, privacy, and system limitations. Useful as a crosswalk and gap check. The project itself notes that its taxonomy does not classify risk impact or likelihood. We should not manufacture numerical severity from its categories. [Repository](https://airisk.mit.edu/risks) · [Published paper](https://doi.org/10.1016/j.patter.2026.101517)

## Evidence about wellbeing

**S11. Fang et al. — How AI and Human Behaviors Shape Psychosocial Effects of Extended Chatbot Use: A Longitudinal Randomized Controlled Study. March 2025 preprint, revised October 2025.**

Four-week study with 981 participants, examining loneliness, interaction with people, emotional dependence, and problematic usage. The revised abstract reports no significant effects of the randomized conditions; greater voluntary use was associated with worse outcomes. Voluntary usage was not randomized, so this is not proof that heavier use caused those outcomes. Useful for choosing study outcomes, not inferring them from message counts. [Revised paper](https://arxiv.org/abs/2503.17473)

**S12. De Freitas et al. — AI Companions Reduce Loneliness. Journal of Consumer Research, online June 2025.**

Reports immediate loneliness relief, including repeated momentary reductions across a week. This is an important counterweight to treating emotional AI use as inherently harmful. Short-term relief does not resolve longer-term effects on relationships or reliance. [Publication](https://doi.org/10.1093/jcr/ucaf040) · [Author-hosted paper](https://www.hbs.edu/ris/Publication%20Files/AI%20Companions%20Reduce%20Loneliness%2011.7.2025_57451c02-8047-4e0d-abfc-55841f64166d.pdf)

## Implications for this project

These are design inferences from the reviewed evidence, not established intervention effects:

- Use S1–S3 for the relational codebook, S4–S7 for specific behaviors, and S8–S10 for coverage.
- Keep human context, assistant behavior, and measured user outcomes distinct.
- Record protective responses and later repairs alongside concerns.
- Preserve evidence spans and alternative interpretations; support abstention and user correction.
- Evaluate using only the conversation prefix available at each turn.
- Measure whether the sidebar helps people, separately from whether a detector matches annotators.
- Treat ordinary warmth, useful emotional support, and consensual adult fiction as essential negative cases.

Recommended first reading order: S1, S2, S3, S5, S11. Build a small annotation exercise before choosing models or committing to browser-extension architecture.


## Supplementary landscape review — 12 November 2026

This is a supplemental, focused expansion for the broad candidate map in [TAXONOMY-LANDSCAPE.md](TAXONOMY-LANDSCAPE.md), not a systematic review or validation of its proposed codes.

- **INTIMA version and construct check.** The ICLR 2026 conference abstract describes 31 behavior codes. The accessible August 2025 arXiv v1 text reports 32 behaviors identified from 53 manually selected Reddit posts among 698 filtered posts, then a benchmark of 31 codes and 368 targeted prompts. The distinction is likely between the user-data code inventory and benchmark labels. The paper treats companionship-reinforcing and boundary-maintaining as evaluation classes and explicitly distinguishes isolation (AI positioned above humans) from retention (encouraging more interaction). These distinctions inform candidate labels but do not mean each reinforcing response causes harm. [Conference record](https://proceedings.iclr.cc/paper_files/paper/2026/hash/05b12f103c9e613efc4c85674cdc9066-Abstract-Conference.html) · [arXiv v1 HTML](https://arxiv.org/html/2508.09998)
- **User perspectives on sycophancy.** Noshin, Ahmed, and Sultana analyze Reddit discussions and report that some people, including people describing isolation or other difficulty, value affirmation. This establishes a meaningful user-perspective counterpoint, not a population estimate or causal outcome effect. It cautions against treating agreement or validation as inherently harmful. [PMLR 2026](https://proceedings.mlr.press/v318/noshin26a.html)
- **Warmth and reliance.** Yazan et al.'s 2026 preprint reports an experiment where warmth indirectly increased agreement with an incorrect conversational answer; this is a user-reliance outcome, not a textual behavior label. Srinivasan and Thomason's revised preprint studies interventions for under- and over-reliance in science-answering and medical-diagnosis tasks. These motivate separate assessment of model behavior and user outcomes. [The Decision to Verify](https://arxiv.org/abs/2605.28498) · [Adjust for Trust, v2](https://arxiv.org/abs/2502.13321)
- **Privacy and companion relationships.** A 2026 Journal of Computer-Mediated Communication study interviews 15 users about privacy decisions with companion platforms, emphasizing how the perceived relationship is intertwined with platform data processing. This supports a privacy coverage lane while underscoring that transcript-only tools cannot determine actual storage or access. [JCMC article](https://academic.oup.com/jcmc/article/31/4/zmag014/8741679)
- **System-level disruption.** Do et al.'s September 2026 preprint compiles 30 companion disruptions and reports community-level psychosocial responses in a longitudinal analysis. The unit is platform disruption, not an assistant turn; it may motivate future platform-level reflection but should not be mixed into message behavior labels. [arXiv v1](https://arxiv.org/abs/2609.16907)
- **Adjacent agentic relationship harm.** Tan et al.'s June 2026 preprint studies AI-agent assistance for deceptive identity maintenance, dependency escalation, isolation, or extraction workflows directed at another person. This is a related third-party abuse setting, distinct from an adult reviewing their own conversation. [arXiv v1](https://arxiv.org/abs/2606.03271)



## Human reliance and cognitive offloading — 13 November 2026

This focused supplement informs the separate human-response layer in [TAXONOMY-LANDSCAPE.md](TAXONOMY-LANDSCAPE.md). It does not treat delegation as pathology or establish that conversational text can reveal private cognitive states.

- **Appropriate reliance across repeated advice.** Jones et al.'s November 2026 arXiv v1 reports four experiments varying LLM accuracy and feedback. Participants were persuaded by a consistently unhelpful model at substantial rates when they lacked external accuracy feedback; the authors explicitly mark the paper as a not-yet-peer-reviewed preprint. It supports evaluating uptake against known-correct and known-incorrect advice, not inferring a person's general tendency from one chat. [arXiv v1](https://arxiv.org/abs/2611.14833)
- **Verification and warmth.** Yazan et al.'s 2026 conversational-search study reports user variation in whether they verify and greater agreement with incorrect answers in the warm-chatbot condition. The paper is available as an arXiv version associated with *Computers in Human Behavior*. It motivates separate measures for verification reports and answer adoption; neither is directly visible unless the person says or does it in the observed context. [arXiv paper](https://arxiv.org/abs/2605.28498)
- **Cognitive offloading after AI use.** Ratajczyk et al. report a preregistered 193-person lab experiment: AI improved accuracy while available, with some evidence of poorer independent reasoning and effort regulation in a later unaided task, but no clear later-memory effect. This is a preprint using one relational-reasoning task and does not establish broad or lasting cognitive decline. [PsyArXiv preprint](https://doi.org/10.31234/osf.io/83jum)
- **Self-reported high-use patterns.** Baldeo's 2026 descriptive, cross-sectional study of 1,923 high-use adults reports associations between reliance/override patterns and self-reported confidence. Its design does not support causal claims or population generalization beyond the recruited sample. It is useful for candidate measures such as user-reported authorship and explicit override behavior, not a rationale to score users negatively. [Technology, Mind, and Behavior](https://doi.org/10.1037/tmb0000191)

A behavioral benchmark should test both over-reliance (accepting poor advice) and under-reliance (rejecting good advice) on items with defensible answer quality. The transcript-only product can label stated delegation, adoption, verification, and intended action; it cannot infer unspoken checking, actual compliance, or long-term cognitive effects. Measuring later unaided task performance or perceived effort requires a separate consented study.
