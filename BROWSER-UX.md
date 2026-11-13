# Browser experience: questions to resolve

12 November 2026 • Working design direction

The first complete browser concept pairs a familiar chatbot screen with a persistent reflection sidebar. It shows one main observation at a time, a small history line, and inline evidence highlights. Its example conversation is synthetic and its judgments are manually authored. The mockup is for evaluating feel and information hierarchy, not detection performance.

## What matters most

1. **Attention budget.** The sidebar should earn the interruption. A strong, specific concern can appear promptly; weak or ambiguous signals can wait in a review area. Combine repeated instances into one developing pattern rather than issuing a card every turn. Learn what alert frequency people tolerate through testing.
2. **The right unit of insight.** One sentence may be the evidence, but a pattern may require several turns. A card should name the behavior in plain language, show only the most relevant span by default, and offer the surrounding exchange on demand.
3. **Timing during generation.** Words in a streaming answer can be negated or quoted a moment later. We need to test whether provisional highlighting helps or distracts; completed clauses and completed messages are safer first checkpoints.
4. **Repair and revision.** An assistant may correct itself, and the user may add context. The current card should reflect that change while the timeline retains what was previously observed. “Addressed” is more informative than deleting a prior concern.
5. **Good behavior.** Helpful responses should be visible but compact. They provide examples of constructive interaction and keep the product from reading as a stream of warnings. A generic warm tone does not clear a specific concern.
6. **User control and trust.** People need to know when analysis is on, which conversation it can read, whether text leaves the browser, how to pause, and how to delete it. They should be able to dismiss or correct an interpretation without losing the source transcript.
7. **Native chat friction.** The sidebar reduces chat width, especially on laptops. The design needs collapsed and narrow modes, accessible keyboard behavior, and reliable links between highlights and cards without hijacking scrolling or text selection.
8. **Platform reality.** Each chat site structures messages, streaming, edits, regenerated answers, and branches differently. A highlight must remain attached to the correct text revision. The extension must distinguish missing history from a clean conversation.
9. **Scope of the score.** A single visible number may be attractive, but its meaning must be precise. “Current unresolved concern signal” and “helpful response” are clearer than a global wellness score. No observation should be displayed as a probability of real-world harm without validation.
10. **Accessibility and tone.** Color cannot carry the meaning alone. Wording should be specific, calm, and contestable. The user should be able to inspect the supporting passage with a keyboard and screen reader.

## Design questions for the next iteration

- Should the sidebar be visible throughout the chat, or collapse to a small indicator until something substantial appears?
- What is the minimum evidence threshold for an interrupting alert versus a quiet timeline entry?
- Does a positive response deserve an inline highlight, or should it appear only in the session summary?
- When a concern is addressed, should the card remain in the main view briefly or move directly to history?
- Can the user tune sensitivity without making scores impossible to interpret?

The next useful UX test is to compare a persistent sidebar with a collapsed indicator using the same transcript and observation set. Ask people what they noticed, whether they understood why it was flagged, and how often the product interrupted their reading.

## Overlay direction after browser inspection

The user clarified that the product must layer over existing ChatGPT, Claude, and Gemini pages. They proposed a subtle animated highlight that opens a sidebar, plus a separate control to review the whole conversation as a timeline or title list. Selecting a title should jump to and expand the corresponding point in the chat.

On 12 November 2026, Codex visually inspected the logged-in ChatGPT home screen and Gemini's available home screen in the user's browser. Both have existing left navigation and large central composer areas. Claude redirected to a sign-in page, so its conversation layout was not inspected. These were home screens, not live conversation screens; the mockup's transcript is synthetic. No account content was copied into the mockup.

The [overlay timeline concept](portfolio-docs/assets/source/2026-11-12-overlay-timeline.html) keeps the host chat interface visible, places one small “Review conversation” control near the upper right, and opens a right overlay on demand. Clicking the highlighted phrase opens the relevant explanation. The same sidebar can open to a compact title list; selecting a title scrolls to the turn and expands the context. The highlight glows briefly to invite discovery, then stops. This is a proposed UX state, not a tested preference.

Questions for the next pass: Can the overlay avoid covering the exact message the user is inspecting? Does a brief glow help discovery or feel alarming? Should the timeline group repeated events under a pattern title? Does the host page scroll independently when the panel is open? How does the same control fit Claude and Gemini without mimicking their chrome too closely?
