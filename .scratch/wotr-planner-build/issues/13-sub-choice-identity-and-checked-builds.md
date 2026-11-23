# Sub-choice slot identity, and Builds the walk refuses

Status: done
Session: ticket-03c-walk-fixes (worktree sub-choice-ids)
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

## Outcome

Done, with the user's map 35 and the coordinator's note on map 22's spell feats (Option A).

- **Sub-choice ids:**
  - `SlotId.parent`; `childSlot(parent, selection)` and `parentKey(slot)` in engine/build are the rule's one home.
  - The walk gives a sub-choice `childSlot(parent.id, …)`, index 0, and top-level indexes count top-level slots only.
  - The pickers' `characterWideSlots` and `backgroundPicker`, the MCP and the planner use the two functions. The planner's `childSlotOf`, `nestedParent` and `childOf` are gone (`parentOf` and `subChoiceOf` read `parentKey`).
  - The repo check `slot-ids` fails any `place`/`selection`/`index` object literal in `src/` outside tests. Test files are left out: their fixtures name slots as data.
- **The gate:**
  - `checkBuild` / `CheckedBuild` in engine/edits clears every pick the walk refuses, until none is, except a spell-parametrized feat held without its spell (pickers' `heldSpellFeat`, the rule the trail and `next_slots` share; edits may now import pickers).
  - `allows` and `cascade` return `CheckedBuild`. The planner's state, `TrailView` and the replace and link actions take it, and `createPlanner` checks the Build it starts from.
  - A link holding a refused pick opens with it cleared. The notice (R's `linkCleared`) lists the rows in the Cascade preview's words (`clearedRows`).
  - In the MCP, every tool opens its code through the gate and adds `clearedOnOpen`.
- **The codec:**
  - `CODEC_VERSION` 2. The tag's bit 4 marks a sub-choice, written after its parent as the parent pick's position.
  - Version 1 codes are read in version 1's order and moved by the walk's `migrateV1Slots`, which replays the old numbering (`legacyId`) to pair each sub-choice with the parent the old walk gave it.
  - The gold Builds' version 1 codes and a hand-made one with two Skill Focus picks open to the same Builds (codec tests). So do the shared notes' 7 QA codes, with nothing cleared (checked by a script, since the notes are outside the repo).
  - The gold Builds now write sub-choices with `chain` (gold.ts).
- **The MCP:** slots carry `parent` in `next_slots`, `options` and `pick`. The slot schema and the server instructions say to pass a slot back as given.
- **Tests:**
  - the walk (`engine/walk/sub-choice.test.ts`: ids independent of the other parent, removal, the duplicate refused in both orders);
  - the codec (version 1 mapping);
  - the pickers (the closed duplicate row);
  - the MCP (`parent`, `clearedOnOpen`);
  - the planner (QA's steps through `PickStep`, and a refused link cleared and named).
  The walk tests failed on today's code (no `childSlot`) before the fix.
- **Browser:** checked at 1280 and 375 px on a Human Mutation Warrior. Skill Focus → Lore (Religion) as the level feat, then Skill Focus → Athletics as the Human bonus feat: both stay, each chip names its own skill, Lore (Religion) is closed in the Human's list, and no Cascade opens.
- **Jack:** Jack's Spell Specialization at level 11 stays, as map 22's held pick, so Jack's link opens unchanged.
