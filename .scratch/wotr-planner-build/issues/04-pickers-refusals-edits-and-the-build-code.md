# Pickers, refusals, edits and the Build code

Status: done
Session: ticket-03c-walk-fixes
Blocked by: 03, 02c, 03c, 02g (review fixes), 02f (which builds map tickets [29](../../wotr-planner/issues/29-telling-gear-items-apart.md) and [30](../../wotr-planner/issues/30-qualifier-for-several-grantors.md))
Plan: [plan](../plan.md)

## Goal

Everything a surface needs so a person or an agent can change a Build without ever holding an impossible one: what each slot can take, why an option is closed, safe edits, and the Build code (modules S, R, E and C).

## Scope

- **S, slots and pickers:** for each slot, every option with its status, computed by pausing the walk at that slot. A picker's answer matches what the walk would say if that option were chosen. Settled on 2026-11-20:
  - **W stays the only judge.** W's interface gains one way to run a Build up to a slot and judge candidate options there; the level, band and retry loop stays inside W. S lists a slot's options and parameters and asks W about each; it never drives the `Walker` class.
  - **The pause point** is the end of the slot's band fixpoint at its place, with only that slot's own pick withdrawn: the band's other picks are applied as the walk applies them, and later bands don't count.
  - **Each option** comes back open, or closed with the failed check and the unmet leaves, all from the paused walk.
  - **No saved state:** each picker walks from the start (about 35 ms for a gold build). Saving the walk's state per level waits for a slow picker measured in the browser.
- **R, the Refusal:** one answer per closed option, worded true for this Build. It covers:
  - the unmet prerequisites, read through P;
  - the later picks the option would break, worked out only when asked about one option, by re-walking the Build with it swapped in (also the Cascade preview and the MCP's `pick`);
  - the level or rank where it opens.

  A nameless prerequisite is worded by the kind of thing that grants it, else by up to 3 grantors the Build can reach, else by the asset name marked as internal ([Display names](../../wotr-planner/issues/19-display-names.md)).
- **E, edits** ([Cascade edits](../../wotr-planner/issues/11-cascade-clear-or-move.md)): every edit goes through one apply function and `allows`. The edits are: a level's class, ability scores, race, archetype, alignment, a pick, Gear, and a Mythic rank's Rank level.
  - A plain edit that breaks something is refused, naming what it breaks.
  - A Cascade edit lists what it breaks, then applies the change and clears those picks. Cleared picks are never moved to another slot.
  - Undo means going back to the earlier Build code.
- **C, the Build code** ([Build code format](../../wotr-planner/issues/07-build-code-format.md)): a port of the Rust planner's version 1 (`~/code/wotr-planner/libs/rules/src/codec.rs`).
  - `/#b=<code>`: base64url of a version byte followed by a raw DEFLATE body.
  - 24-bit FNV-1a hashes of GUIDs, unique within each kind, with a test that fails on a collision.
  - Aliases for replaced blueprints.
  - Gear, the Gear opt-in and the Rank levels are encoded too.
  - So are the aspects kept on, and a path switch as its rank's class (user, 2026-11-20; ticket 03's map tickets).
  - **Twins** ([map 29](../../wotr-planner/issues/29-telling-gear-items-apart.md), rule 1): the Gear picker offers each twin group's lowest GUID (`CheckedData.twins`). A code naming any other twin decodes and opens as that one.

## Added by the coordinator after the 02+03 review fixes (2026-11-20)

- **R words the walk's `Failure`.** Ticket 03c made `Failure` structured data (the leaf, the values found, the values needed) with no English. R is the only place its wording forms.
- **The gear-dependent marks** (ADR 0002, as 03c rebuilt them) carry the items each pick needs. R and the pickers show them.
- **Picks lost when a source goes.** A pick whose prerequisite was met only through a fact that a later edit removes now fails in the walk (03c). E's Cascade preview lists such picks like any other break.

## Done when

- At every slot of both gold builds, every picker's statuses agree with the walk: each option's status equals whether the walk accepts the Build with that option in the slot. A separate script (`scripts/sweep-pickers.ts`) sweeps every option at every slot, run for this ticket and again whenever W changes. `bun run check` runs the Build's own pick at every slot, every option at a nested selection, a parametrized feat, a waived slot and a Mythic slot, and at a `BasicFeatSelection` a fixed, deterministic sample of about 100 options: every option the gold pick's neighbourhood touches, plus a stride over the rest (Coordinator, 2026-11-20, on 04's checkpoint 1).
- Every closed option carries a Refusal.
- Every edit that `allows` accepts leaves the Build possible.
- Every Cascade preview matches what the Cascade then clears.
- Both gold builds round-trip through their Build codes unchanged.

## Checkpoint 1 (2026-11-20): W's pause, S, R and E

- **W:** `pauseAt` runs a Build to the end of a slot's band at its place, with the slot's own pick withdrawn, and judges options there (`judge`, `gearItems`); the band loop stays inside W.
- **S** (`engine/pickers.ts`): a slot's options (a parametrized feat once per parameter; a Mythic spellbook per allowed spellbook), each open or closed with W's `FailedRule`, whether the game shows it, and the items an open option needs under ADR 0002. `walkVerdict` is the self-check.
- **R** (`engine/refusals.ts`): every rule and leaf worded for the Build, nameless prerequisites by map 19, any-of leaves on one line; `breaks` (re-walking with the option swapped in) and `opensAt` (the next slot of the same selection that accepts it).
- **E** (`engine/edits.ts`): `apply`, `allows`, `cascade` (clear to a fixpoint, never move; refused when a non-pick choice breaks or the edited pick itself fails), `breaksOf`.
- **Sweep:** `scripts/sweep-pickers.ts`; `bun run check` runs every option at a BasicFeatSelection with parametrized feats, a nested selection, a waived slot and a Mythic slot, and the own pick at every slot of both gold builds. This adds about 50 s to the check.
- **Left:** C (two design questions with the coordinator), the full sweep's result, the Outcome.

## Outcome

2026-11-20. Three commits: checkpoint 1 (`8d918267`: W's pause, S, R, E), checkpoint 2 (`83cb5180`: C, the alias override, the check's sample) and this one, which closes the ticket. Every line of "Done when" holds: the full sweep found 0 disagreements in 30,296 options, and it runs under Bun (`bun scripts/sweep-pickers.ts`).

**Built**
- **W's pause** (`pauseAt`, `engine/walk/walk.ts`): the walk runs to the end of a slot's band at its place, with only the slot's own pick withdrawn, and judges candidates there (`judge`, `gearItems`) without changing its state. The band and retry loop stay in W.
- **S** (`engine/pickers.ts`): each slot's options with their statuses. A parametrized feat is listed once per parameter (weapon categories, schools, skills, or its variants; spell parameters wait for map 22), and a Mythic spellbook selection once per allowed spellbook. Each option says whether the game shows it, and an open one lists the Gear items it needs under ADR 0002. `walkVerdict` is the self-check.
- **R** (`engine/refusals.ts`): the only place wording forms. Every `Rule` and every leaf kind is worded true for the Build, with what the character has where it counts ("Needs Strength 13 (yours: 10)."). A nameless prerequisite follows map 19: by the one FeatureGroup that grants it, with the Build's own ("yours, …, doesn't"); else up to 3 reachable grantors and "and N more"; else the asset name marked as internal. Any-of leaves share one line. `breaks` re-walks the Build with the option swapped in; `opensAt` finds the next slot of the same selection that accepts it; `gearNote` words the gear-dependent marks.
- **E** (`engine/edits.ts`): one `apply` for every edit (class, scores, race, archetypes, alignment, pick, Gear, Rank level), `allows`, and `cascade`. A cascade clears broken picks until nothing more breaks and never moves one; it is refused when a non-pick choice breaks, or the edited pick itself fails. What an edit breaks is every choice the walk refuses after it and accepted before, so picks lost when a source goes (03c) are listed like any other.
- **C** (`engine/codec.ts`): this planner's version 1, per map 07's amendment. It keeps the Rust mechanics: the version byte outside raw DEFLATE (the web `CompressionStream`, so it runs the same in the browser), base64url with no padding, minimal LEB128, opt fields, the hash list first, and exact decoding (order, duplicates, leftovers, and Builds no planner makes). Two points differ from the amendment as written:
  - **Hash width:** 32-bit FNV-1a, not 24. At 24 bits the data has 4 collisions within a kind (2 among the 6,031 features, 2 among items); at 32 there are none. The coordinator approved it, and map 07 records it (`d7e2b916`).
  - **A kind byte:** written before each key whose kind the structure doesn't fix (a pick's selection, feature, or blueprint parameter), so hashes stay scoped to the data's own kind.
  - Twin items decode as the item offered in their place.
- **Aliases:** a new override kind, `{ change: 'alias', target, from, reason }`. The loader checks that `from` is a GUID the data no longer holds. An old GUID with one heir decodes as the heir; with several, `openBuild` moves the pick to the heir its slot takes. Tested on hand-built aliases.

**Measured**
- **The full sweep** (`scripts/sweep-pickers.ts`): 30,296 options at every slot of both gold builds, 0 disagreements (Jack 533 s, the Enforcer 360 s).
- **`bun run check`** samples about 100 options at a `BasicFeatSelection` slot and every option at a nested, a waived and a Mythic slot with a parameter. Every closed option there carries a Refusal. It also checks each gold build's own pick at every slot. The check takes about 33 s.
- **Both gold builds round-trip** through their codes. The code holds picks in slot order, so a decoded Build lists its picks in that order; nothing else changes.
- **Edits:** `allows`-accepted edits leave Jack possible (alignment, Rank level, a pick cleared, a level's class), and each Cascade's preview is what it clears (Jack's Spell Focus swap, the Enforcer's belt).

**Follow-up**
- The pickers walk from the start each time (about 35 ms a walk). The simplify pass halves that. Saving the walk's state per level still waits for a slow picker measured in the browser.
