# How Summaries are generated and overridden

Type: grilling
Status: resolved
Blocked by: 03
Parent: [map](../map.md)

## Question

Which components get generated wording in v1? What does a blueprint with no readable component show? Where do hand-written overrides live and how are they cited? And how is a stale override caught when the components under it change?

ADR 0001 settled the approach: generated summaries with hand-written overrides, never the game's text.

## Answer

User, 2026-11-19.

- **Coverage:** v1 labels the top 50 component types by facts covered, about 90% of the facts that carry a readable value ([component-vocabulary.md](../research/component-vocabulary.md)). Each label is a role (bonus to, save against, immunity, requirement, trigger) plus a sentence template.
- **Nothing labelled:** the blueprint shows what the engine always knows: its name, prerequisites, what it grants and where it can be picked. Its summary line says "no summary yet". It never shows a guess or raw component names, and it's never hidden from search.
- **Hand-written summaries:** one file per blueprint in the repo, keyed by GUID with a readable name. Each records a fingerprint of the components it describes, and the load check flags a summary whose fingerprint no longer matches the data. Since [Synergy link kinds in v1](09-synergy-link-kinds.md), hand-written summaries are wording only; they never create links.
