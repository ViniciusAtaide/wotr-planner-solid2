# Sub-choice slot identity, and Builds the walk refuses

Type: grilling
Status: resolved
Blocked by: none
Parent: [map](../map.md)

## Question

QA of the trail changes of 2026-11-22 (map 13's amendment) found a lost pick:

1. A Human Mutation Warrior gives level 1's feat Skill Focus → Lore (Religion).
2. The Human bonus feat is left empty, as it now may be.
3. The Human bonus feat then takes Skill Focus → Athletics.

Lore (Religion) is gone with no Cascade preview. Athletics shows on the level feat's chip, and an empty "Skill Focus" step appears. The Build holds one Skill Focus skill.

There are two causes:

- **The walk numbers a sub-choice within its place, not within the slot that opened it.**
  - A sub-choice is the slot a pick opens when the picked feature is itself a selection (`applyPick` → `addSelection`; Skill Focus opens its skill list).
  - Its index counts every slot of that selection at the place (`addSelection`'s `index`). So a sub-choice's id depends on the other picks at that place and on walk order, and a pick can move between parents when another parent changes.
  - Map 07's amendment fixed this for slots the race or a component opens (`from`). Sub-choices were left out.
- **The planner guesses a sub-choice's slot.**
  - `childSlotOf` returns index 0 every time, and `PickStep` judges and writes the skill rows there. So the Human's skill list was judged as a replacement for the level feat's skill, and taking Athletics overwrote it.
  - `nestedParent` and `planner-state`'s `childOf` paired parents and sub-choices by feature and place, with the same blind spot.

A second hole showed up in the same check. A code holding the same skill twice decodes and opens:

- `decodeBuild` checks only the format (`keepsFixedRules`), and `openBuild` only remaps old keys.
- The walk records the second pick as a failure (`BlueprintFeatureSelection.CanSelect:MeetsPrerequisites`, "already held at its highest rank"). But the planner and the MCP open the Build anyway, and `next_slots` lists the slot as open while the code still carries the refused pick.

## Answer

The user, 2026-11-22:

- **A sub-choice is identified by its parent slot.**
  - A sub-choice's `SlotId` carries `parent`, the parent slot's key, and `slotKey` includes it.
  - A parent opens at most one sub-choice, so the sub-choice's index is 0 under its parent. Its id no longer depends on anything else at the place.
- **One place for the rule.** `engine/build` owns it and exports:
  - `childSlot(parent, selection)`, the only constructor of a sub-choice's id;
  - `parentKey(slot)`, whether a slot is a sub-choice and of which slot.

  The walk (`applyPick`), the codec, the pickers' `characterWideSlots`, the MCP and the planner all use these two. The planner's `childSlotOf`, `nestedParent` and `childOf` go: nothing in `src/` builds a slot id or works out a parent on its own.
- **The same skill can't be taken twice.** The walk already refuses it in either order; the slot fix makes the planner ask about the right slot. In a second Skill Focus's list, the first one's skill is a closed row ("Already held at its highest rank"), hidden until "Show N closed".
- **No Build the walk refuses gets past opening.**
  - One engine function checks an opened Build against the walk and returns a branded `CheckedBuild`.
  - The planner's state, `TrailView` and the MCP tools take `CheckedBuild`. Edits produce Builds the walk accepts, so they return one too.
  - A link holding a pick the walk refuses opens with that pick cleared, and the notice names what was cleared in the Cascade preview's words.
- **Old links keep opening.**
  - The site is live on GitHub Pages ([Hosting](17-hosting.md)), so this amends [Build code format](07-build-code-format.md). Build ticket 11 relied on "no planner link has been published", which no longer holds.
  - The new format gets a new version byte and writes `parent`. A version 1 code is read under the old numbering and moved to the new ids: each sub-choice is given to the parent the old walk paired it with.
- **Tests come first:**
  - **The walk:**
    - Two feats at one place open Skill Focus. Each sub-choice's id is the same with or without the other.
    - Removing one feat's pick leaves the other's skill in place.
    - The second Skill Focus refuses the first's skill, and changing the first to the second's skill is refused.
  - **The codec:** a version 1 code holding sub-choice picks opens to the same Build. A code holding a refused pick opens with it cleared and named.
  - **The planner:** QA's steps. Both skills are kept, each chip names its own, and the level feat's skill is closed in the Human's list.
  - **The MCP:** `next_slots` and `pick` carry `parent`.

## Note: spell feats held without their spell (coordinator, 2026-11-23)

Build ticket 13 asked about one case. Spells aren't modelled ([map 22](22-spell-parametrized-feats.md)), so the walk refuses a spell-parametrized feat picked without its spell, such as Jack's Spell Specialization at level 11. That refusal comes from the gap, not from the game. The gate keeps such a pick as map 22's held-for-a-spell pick, and clears everything else the walk refuses. It uses the same engine rule (`engine/pickers`' held spell feat) that the trail and `next_slots` already share since build ticket 14, so all three agree. This follows the user's decision of 2026-11-23: one rule for the planner and the MCP.
