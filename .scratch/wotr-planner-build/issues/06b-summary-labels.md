# Summary labels and templates

Status: done
Session: ticket-03c-walk-fixes
Blocked by: 06a
Parent: [06](06-after-first-use.md)
Plan: [plan](../plan.md)

## Goal

Give each of 06a's 50 carriers a label ([map 10](../../wotr-planner/issues/10-generating-summaries.md)): a role (bonus to, save against, immunity, resistance, requirement, trigger) and a sentence template in our own words (ADR 0001, ADR 0006). `describe`'s Summary is the labelled components' sentences. A blueprint with nothing labelled shows "no summary yet", never a guess or a raw component name.

## Done when

- Each of the 50 carriers has a label, and a test produces its sentence from a real blueprint that carries it.
- `describe` and the MCP's `explain` carry the Summary. The UI session has its shape.

## Outcome

- **Labels:** `engine/describe/labels.ts` gives each of 06a's 50 carriers a `Label` (`role` and `text`), in our own words. Roles: `bonus`, `save`, `immunity`, `resistance`, `weakness` (vulnerability), `requirement`, `trigger`. A computed value reads "grows with level", never a guessed number. A fact the game never names reads "certain foes" or "certain sources". The mechanics a sentence states are cited (`engine/describe/cites.ts`, checked against `decompiled/`).
- **The Summary:** `describe` carries `summary` (the labels' sentences, or "No summary yet.") and `labels`. The MCP's `explain` returns both, and `search` and `options` carry the Summary.
- **Spell descriptors:** `spellDescriptors` reads the 64-bit flags as unsigned, so the sign bit counts.
- **Tests:** one real blueprint per carrier with its exact sentence (`labels.test.ts`); no label anywhere holds an asset name, `undefined` or a component name; describe's Summary and the placeholder; the MCP's `explain`.
- **Coverage:** 554 of 8053 shown blueprints have a Summary (524 features, 30 buffs).
- **Items (coordinator's follow-up, done):** an item's Summary is composed from the facts its enchantments grant when worn, in the walk's grant order (G's `equipmentGrants`, which the walk's `wear` now uses too), each sentence once, worded at the one rank a worn item gives. Coverage went from 554 to 874 of 8053 shown blueprints (items: 0 to 320 of 2669).
