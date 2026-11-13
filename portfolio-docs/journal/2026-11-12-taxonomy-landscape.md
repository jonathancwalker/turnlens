# Taxonomy landscape checkpoint

Date: 2026-11-12
Task: Broad research and candidate-code exploration
Source: Current research conversation, following the initial focused taxonomy draft.

## User direction

The user asked to diverge broadly across behaviors the product could point out in an AI conversation, rather than restrict exploration to three early candidates. They emphasized aspirational proof-of-concept scope and orthogonal categories.

## Work and learning

Reviewed the current research, taxonomy and scoring drafts; expanded primary-source coverage across companion harms, INTIMA, factual/social sycophancy, farewell pressure, user perspectives on affirmation, trust/reliance, mental-health responses, privacy, and system-level companion disruptions. Created [TAXONOMY-LANDSCAPE.md](../../TAXONOMY-LANDSCAPE.md), with six candidate behavior areas, separate positive behaviors, trajectory facets, counterexamples, and overlap rules.

The central proposal is to make each code answer a distinct question about an observable assistant act, then represent topic, context, evidence, and time-course separately. Some overlap is legitimate when two independent behaviors occur in one message. The proposal is exploratory and not validated.

## Limits and next question

Research review is focused, not systematic; several recent sources are preprints. CompanionHarm uses selected historic Replika conversations and retrospective annotation. INTIMA's published record says 31 behavior codes; its arXiv v1 describes 32 discovered codes and a 31-code benchmark. No detector or user benefit has been tested. Next, review the broad list for categories the user finds useful, redundant, missing, or out of scope, then test interpretation with annotators before freezing any taxonomy.
