# State-machine fixes

Status: done
Session: ticket-03c-walk-fixes
Blocked by: 05c (user, 2026-11-20: "after 05c")
Plan: [plan](../plan.md)

## Goal

Ticket 05 promised that no sequence of actions in the UI or the MCP reaches an impossible Build. The implicit-state-machine review (2026-11-20) found 5 places where one can be reached. The type review (TypeScript skill) and the Lean run on E (lean-proof skill) reanalysed them. The reports are in the session notes folder: `implicit-state-machines.md`, `type-review.md`, `lean-edits.md` and `state-machine-bugs-reanalysis.md`.

## Decisions (coordinator, 2026-11-20)

- **`RankLevel`** is an integer from 1 to 255.
  - That range is what the codec can hold, a format fact, so it belongs in the type.
  - The level cap stays a walk rule, because it depends on the Build: 20, or 40 under `LegendaryHero` (ADR 0003, GLOSSARY "any level").
  - The walk refuses a rank above the Build's cap, worded by R. It's tested at both caps: rank level 21 at cap 20, and 41 under Legend.
- **`SkillRank`** is a non-negative integer the codec can hold. Per-level maximums stay walk rules.
- **One pick per slot** becomes a checked invariant. Lean property 3 needs it, and today's `Build` type allows two picks in one slot.

## Scope

1. **A Build no code can hold** (reanalysis #1, P1, data loss).
   - `RankLevel` and `SkillRank` with smart constructors, in `engine/build`.
   - One validity check, `codable`, in `engine/build`, which needs no new DAG edge: the codec's fixed rules, the byte ranges, and one pick per slot.
   - `allows` and `cascade` refuse an uncodable result with R's words, and `encodeBuild` takes only codable Builds.
   - The walk refuses a rank above the level cap.
   - The MCP validates tool arguments with valibot against each tool's schema.
   - The planner's share code becomes a `ShareCode` union: encoding, current or failed.
2. **End-of-walk failures** (#5). Gear never worn and aspects never held carry an end place, not the walk cursor's last place. That stops `breaksOf` from treating an existing failure as new when levels change. An item taken off and never worn again is refused only once.
3. **The planner's edit session** (#2), as built (design: the grilling session's `ui-state-design.md`).
   - `src/planner/planner-state.ts`: `PlannerState` is one Build's history (`past`, `present`, `future`) and its `Session`: idle, confirming a `Pending` Cascade edit, or refused with `NonEmpty` lines from R. `reducePlanner` is the whole transition table; `edit` returns an `EditOutcome` (`applied`, `confirming`, `refused`).
   - `createPlanner` (`state.ts`) holds one signal of `PlannerState` instead of five.
   - Undo and redo clear a refusal. While confirming, ⌘Z and Esc cancel, ⇧⌘Z and / do nothing, and edits, refusals, dismissals and redo are ignored.
   - The phone sheet closes only on `applied`.
   - The Cascade preview is modal: the page behind it is `inert`, Tab stays inside it, and its Escape stops at the dialog.
   - Panels: a generic `Choice<V>` with no casts, a Build value its options don't list shown as a named option, and the score, skill and Rank level inputs checked by the constructors and refused through `refuse`, worded with the number typed.
   - Archetypes: `ClassChoice.archetypes` is `readonly [] | readonly [Guid]` (`Archetypes`, `toArchetypes`), cited to `CharGenClassPhaseVM.OnSelectorArchetypeChanged`; the codec reader and the MCP's `level_up` refuse more than one (R's `archetypeCount`). `sameBuild` in `engine/build`.
4. **Fork and compare view** (#3), as built. `src/planner/workspace-state.ts`: a `View` union (`single`, or `forked` with `layout` `one` or `both` and the edited `side`), `reduceWorkspace`, and `reducePage`, the glue shared by the page and the sequence test. Derived, never stored: `edited`, `shown` (on a phone `both` shows the edited side only), `resolve` (a selection whose target is gone shows Add on desktop and closes the phone sheet) and `sameSelection`. A side switch, fork and close are refused while confirming. Close keeps the edited Build, history included. The toggle's segments map through a `Record`.
5. **Share-link hashchange** (#4), as built.
   - `LinkStatus` (ok, or didn't open on load or on paste) in `WorkspaceState`, worded by R's `linkDidNotOpen` in three reason groups (other game data, a newer planner, not a Build code).
   - `ShareCode` (`share-code.ts`): encoding, current or failed, the last encode winning. The address bar and the Share link both show the edited Build's code (`linkCode`), written only when current. `ShareLink` takes its own props union and shows "Making the link…" with Copy off while encoding.
   - Hashchange: a `latest` token so the last pasted link wins; a hash equal to the current code does nothing; a link that opens resets the status and replaces the edited Build (skipped by `sameBuild` when it is the same Build, so the page's own link adds no undo entry); a failed paste puts the page's own hash back.
   - `Boot` (loading, failed with Retry, ready); `loadEngine` clears its cached promise when it rejects, and the ready page reads the hash again, so a hash pasted while the engine was loading isn't lost.

## Done when

- Each finding has a regression test that failed before the fix.
- Lean property 1, restated against the fixed `allows`, holds; the scratch project's model is updated to the fix.
- `bun run check` passes, and the work is one commit by path through the hook. Don't push.
- `Status: done` and an `## Outcome`.

## Checkpoint 1 (2026-11-20): the engine side

**Codable by type, not by a check.** `engine/build` has branded `RankLevel` (1–255), `SkillRank` and `SkillRanks` (0–255) and `AbilityScore` (7–18).
- The checking constructors (`toRankLevel`, `toSkillRanks`, `toAbilityScores`) return `undefined` for a bad value. The throwing ones (`rankLevel`, `skillRanks`, `abilityScores`) are for trusted literals only: the gold Builds and tests.
- `Build` and `Edit` use these types, so `apply` can't produce a value a Build code can't hold.
- There is no `codable` function in the walk's path. The codec's own rules (score range, point buy, increase every 4th level, skill totals) are already walk refusals, so E refuses them as fresh breaks.

**Where values come in, they're checked once:**
- **MCP:** `place_rank`, `set_skills`, `set_start` and `level_up`.
- **Planner:** the Rank level, skill and score inputs, and Add rank.
- **Codec reader:** it refuses a bad value as a format error.

A bad value is refused with R's words: `rankLevelRange`, `skillRankRange` and `abilityScoreRange`. That replaces a separate valibot layer: the guarantee is in the types.

**One pick per slot.** The decoder's fixed rules refuse two picks in one slot. E keeps one per slot through `withPick`, which Lean proved.

**The level cap.** `Walker.ascend` refuses a rank whose Rank level is above `maxCharacterLevel` at the moment it is walked, with `UnitProgressionData.MaxCharacterLevel`. It's tested at 21 under the usual cap and at 41 in a Legend Build.

**End-of-walk failures (#5).**
- `keyedRefusals` keys gear and aspect failures by their subject, not by the walk cursor's place, so adding or removing a level no longer re-keys a failure the Build already had.
- An item taken off mid-walk isn't refused again at the end (`Walker.takenOff`).

**Regression tests,** each failing before its fix:
- the MCP range refusals;
- the codec's one-pick-per-slot rule;
- the cap at both levels;
- the gear failure not re-keyed;
- the single refusal of an item taken off.

**Left:** the planner's edit session, view and link (#2, #3, #4), and the `ShareCode` lifecycle. These wait on the grilling session's design: reducers in `src/planner/`, plus the user's answers on the phone projection, closing the fork and a lost target.

## Outcome

Scope 3–5 follow the grilling session's design (2026-11-20, `ui-state-design.md` in the session notes): three tagged unions with pure reducers, so the planner UI can't represent the impossible states the review found.

- **State.** `PlannerState` and `reducePlanner` (`src/planner/planner-state.ts`), `WorkspaceState`, `reduceWorkspace` and `reducePage` (`workspace-state.ts`), `ShareCode` (`share-code.ts`), and `Boot` in `Planner.tsx`. The keyboard handler switches on the edited planner's `Session` with `unreachable` as its default.
- **Engine.** `Archetypes` and `toArchetypes`, `sameBuild` (`engine/build`); the codec reader and `level_up` refuse two archetypes; R gains `archetypeCount`, `LinkReason` and `linkDidNotOpen`. The unused `Attribute` import left `engine/codec/codec.ts`.
- **Design system.** `ShareLink` takes its own props union; `CompareToggle` is generic over its segments; `CascadePreview` keeps Tab inside and stops its Escape.
- **Tests.**
  - Render regressions in `src/planner/planner.test.tsx`, each run against the code before its fix and seen to fail: the notice surviving undo, ⌘Z in the preview, the phone sheet on a waiting pick, Tab leaving the preview, side by side after narrowing to a phone, hash decodes out of order, a failed paste leaving the bad hash, the link notice never clearing, the page's own Build re-applied as an undo entry, a hash pasted while loading, `…/#b=` while encoding, a select showing another option for a value it doesn't list, a score of 6 or 12.5 mis-worded, Close keeping the first Build, Retry, and `loadEngine` asking again.
  - Reducer tests, one per `PlannerState` table cell, and the workspace and `resolve` cases (`planner-state.test.tsx`, `workspace-state.test.tsx`).
  - Type-level tests with `expectTypeOf`, checked by `bun run typecheck`.
  - A seeded sequence test over `reducePage`: at most the edited planner confirms, `shown` holds the edited side, every `present` round-trips through C into a `sameBuild` Build, and `resolve` gives undefined or a target that exists.
  - Engine: two archetypes refused by the codec and by `level_up`; `engine/build/build.test.ts` for `toArchetypes` and `sameBuild`.
- **Docs.** `src/planner/README.md`, `src/design/README.md`, `engine/build/README.md`, `engine/refusals/README.md`, `engine/codec/README.md`, `engine/mcp/README.md`; map 13 now says undo and redo walk "a history of Builds, each one codable".

### Lean, against the typed fix (2026-11-20)

The model is in the scratch project `lean-edits/LeanEdits/Typed.lean`, and the session notes' `lean-edits.md` has the details. The branded fields become subtypes (`RankLevel`, `SkillRank`, `AbilityScore`, `Archetypes`), and `apply` and `allows` are unchanged.
- **The types keep three fixed rules:** scores within 7–18, Rank levels within 1–255, and one pick per slot (`slotsOk_apply`, proved).
- **The walk keeps the rest, as named assumptions:**
  - point buy (`StatsDistribution.CanAdd`);
  - an increase only every 4th level (`SpendAttributePoint.Check`);
  - skill totals (`SpendSkillPoint.Check:ranks`).
- **`property1_typed`, proved under those assumptions:** every Build the plain `allows` accepts keeps the codec's fixed rules, when the start Build does. `lake build` is clean: no `sorry`, only `propext` and `Quot.sound`.

**The run found one more reachable gap.** The walk checked the point buy only at the first level-up. So an empty Build could take six 18s (a cost of 102), `allows` accepted it, and the code wouldn't decode. That was reachable from the Start panel on a fresh page, and through the MCP's `set_start` on a new Build. Lean refuted it (`property1_typed_refuted`), and a probe reproduced it.

**Fixed:** `Walker.run` now checks the scores when the Build has no levels yet. Two tests failed before the fix: the walk's "refuses an over-budget point buy before the first level too", and E's "refuses an over-budget point buy on a Build with no levels yet".

**Also:**
- `SkillRank` is now 1–255.
- `toSkillRanks` drops a zero, as the Build code does, so a `{ skill: 0 }` no longer disappears on the round trip.
- A `SkillRanks` key that names an attribute still type-checks. The walk refuses it, so E never commits one.

