# Decisions

No decisions have been recorded yet.
# Decisions

## adult-self-review — Initial audience
Date: 2026-11-12
Status: accepted

The user selected adults reviewing their own AI conversations as the first audience. Parent/teen monitoring remains a later, distinct product question. Evidence: [concept brief](../CONCEPT.md).

## linked-evidence — Transcript and sidebar interaction
Date: 2026-11-12
Status: accepted as design direction

The user requested turn-by-turn, context-sensitive observations, word-level highlights, and linked sidebar explanations. Later context should be able to revise earlier interpretations. Evidence: [online scoring proposal](../ONLINE-SCORING.md).

## quiet-sidebar — Prioritize meaningful signals
Date: 2026-11-12
Status: proposed

The user raised card overload and fatigue as central concerns. The current design proposal shows one primary insight and a compact conversation history, grouping repeated signals. The persistent-sidebar presentation has not been user-tested. Evidence: [browser UX questions](../BROWSER-UX.md) and [concept mockup](assets/source/2026-11-12-browser-sidebar-concept.html).

## overlay-timeline — Layer over existing chat pages
Date: 2026-11-12
Status: proposed

The user clarified that the extension should overlay ChatGPT, Claude, or Gemini rather than present a replacement chat page. They proposed click-to-open highlights and a full-conversation timeline with expandable titles and jump links. Codex represented this in the [overlay concept](assets/source/2026-11-12-overlay-timeline.html). Placement, animation, and interruption cost still need user review and usability testing.

## push-aside-prototype — Reflow chat beside the panel
Date: 2026-11-12
Status: accepted for prototyping

The user preferred investing in a panel that does not cover chat text and explicitly requested a Chrome extension branch and screenshots. The implementation reduces the host page root width by the panel width on wide viewports. It falls back to overlay below 760px. A local preview showed reflow at a wide viewport; live-site compatibility is still open. Evidence: [extension](../extension/README.md), [experiment](experiments.md).

## broad-taxonomy-exploration — Expand candidate behavior space
Date: 2026-11-12
Status: proposed

Context and constraint: The user redirected research from a narrow initial set toward a broad, aspirational proof-of-concept landscape and emphasized orthogonality.

Options considered: Continue polishing the initial three; expand behavior labels directly; or separate observable behavior codes from topic/context/trajectory facets. The user explicitly requested broad divergence; the facet structure is a Codex synthesis proposal, not an accepted taxonomy.

Choice and rationale: Draft a wide candidate map organized around distinct observable assistant acts, with overlap rules and separate facets for domain, context, evidence, trajectory, uncertainty, and seriousness. Preserve helpful behaviors independently.

Tradeoff or uncertainty: Wider scope creates evaluation and false-alert burden. Orthogonal definitions may still co-occur within a message. Many candidates, especially user impact, motive, hidden privacy practices, and social advice, cannot be established from text alone.

Attribution: Broad scope and aspiration are user-directed; organization and labels are draft proposals.
Evidence: [taxonomy landscape](../TAXONOMY-LANDSCAPE.md); [research notes](../RESEARCH.md).
Revisit when: The user reviews the candidate list or an annotation pilot reveals overlap/disagreement.
