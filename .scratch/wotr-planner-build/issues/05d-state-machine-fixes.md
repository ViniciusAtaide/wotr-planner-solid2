# State-machine fixes

Status: in-progress
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
3. **The planner's edit session** (#2).
   - `Session` is idle, confirming or refused, and `edit` returns its outcome.
   - Undo and redo clear a refusal, and ⌘Z while confirming cancels.
   - The phone sheet closes only when the edit applied.
   - The Cascade preview is modal.
4. **Fork and compare view** (#3). A `View` union: one side, or side by side, and on a phone always one side.
5. **Share-link hashchange** (#4).
   - `LinkStatus` (ok, or didn't open on load or on paste), worded by cause.
   - A `latest` token so the last pasted link wins.
   - A link that opens resets the status.
   - The page's own code isn't applied again.
   - A hash pasted while the engine was loading isn't lost.

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

