# Sub-choice slot identity, and Builds the walk refuses

Status: ready
Blocked by: none
Plan: [plan](../plan.md)

## Goal

Build [map 35](../../wotr-planner/issues/35-sub-choice-identity-and-checked-builds.md), the user's decisions of 2026-11-22, and map 07's amendment of the same day.

QA of the trail changes of 2026-11-22 found that two Skill Focus picks at one level lose a pick. A sub-choice's slot is numbered within its place, not within the slot that opened it, and the planner's `childSlotOf` assumes index 0. Separately, a link holding a pick the walk refuses opens anyway, in both the planner and the MCP.

## Scope

Tests come first, as map 35 lists them, and each must fail on today's code before its fix.

1. **A sub-choice names its parent.**
   - `SlotId` gains `parent`, the parent slot's key, and `slotKey` includes it. A sub-choice is index 0 under its parent.
   - `engine/build` exports `childSlot(parent, selection)`, the only constructor of a sub-choice's id, and `parentKey(slot)`. These two are the only place the rule lives.
   - The walk (`applyPick` / `addSelection`), the codec, the pickers' `characterWideSlots`, the MCP and the planner all use them.
   - The planner's `childSlotOf`, `nestedParent` and `planner-state`'s `childOf` are deleted. Nothing in `src/` builds a slot id or works out a parent on its own.
   - Add a repo check, in `tools/repo-checks`, that `src/` never writes a `SlotId` literal with `index`, or say in the Outcome why a check can't hold it.
2. **The same skill can't be taken twice.** The walk already refuses it in either order. In a second Skill Focus's list, the first one's skill is a closed row ("Already held at its highest rank"), hidden until "Show N closed".
3. **One gate at opening.**
   - One engine function checks an opened Build against the walk and returns a branded `CheckedBuild`.
   - The planner's state, `TrailView` and the MCP tools take `CheckedBuild`. Edits return one.
   - A link holding a pick the walk refuses opens with that pick cleared, and the notice names what was cleared in the Cascade preview's words.
   - For the MCP, a tool given such a code works on the cleared Build and says what was cleared.
4. **The codec:**
   - a new version byte that writes `parent`;
   - a version 1 code is read under the old numbering and moved to the new ids, each sub-choice going to the parent the old walk paired it with.
   - The site is live on GitHub Pages, so version 1 links must keep opening to the same Build. Test that with the gold Builds' version 1 codes, the QA codes in the shared notes, and a hand-made version 1 code holding two Skill Focus picks at one level.
5. **The MCP:** `next_slots`, `options` and `pick` carry `parent`. Update the server instructions if an agent now needs to know about it.

## Done when

- Map 35's tests pass:
  - the walk: ids independent of the other parent; removing one parent's pick leaves the other's skill; a duplicate skill refused in both orders;
  - the codec: version 1 sub-choices map over, and a refused pick is cleared and named;
  - the planner: QA's steps keep both skills, each chip names its own, and the level feat's skill is closed in the Human's list;
  - the MCP: `next_slots` and `pick` carry `parent`.
- QA's case in the browser at 375 and 1280 px: a Human Mutation Warrior takes Skill Focus → Lore (Religion) as the level feat, then Skill Focus → Athletics as the Human bonus feat. Both stay, with no Cascade.
- The engine, codec, MCP and planner READMEs are updated, and `GLOSSARY.md` gains "sub-choice" if it lacks it.
- `bun run check` passes; then `Status: done` and an `## Outcome`.
