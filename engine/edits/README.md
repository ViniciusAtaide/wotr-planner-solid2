# Edits (E)

E answers whether a change keeps a Build possible (guide §4; map ticket 11, "Cascade edits"; build ticket 04). Every change to a Build goes through `apply`, and `allows` or `cascade` decides whether it keeps the Build possible. After an edit the walk re-judges the whole Build; what the edit breaks is every choice the walk now refuses that it accepted before. A plain edit that breaks anything is refused, naming what it breaks. A Cascade edit clears the broken picks, and the picks that clearing breaks in turn, and never moves a pick to another slot. Undo is going back to the earlier Build code.

## Public entry

- `Edit`: one change to a Build, by `kind`:
  - `class`: a character level's class (`level` is 1-based).
  - `scores`: the point-buy scores.
  - `race`: the race, and the ability that takes its +2.
  - `archetypes`: a class's archetypes (its Class choice).
  - `alignment`: the alignment, or none.
  - `pick`: a slot's pick, or none to clear it.
  - `gear`: the item in one Gear place, or none to take it off.
  - `rankLevel`: a Mythic rank's Rank level (ADR 0003); `rank` is 1-based.
  - `addLevel`: one more character level, of a class.
  - `addRank`: one more Mythic rank, of a Mythic class, at a Rank level.
  - `skills`: a character level's skill ranks (1-based), replacing that level's.
  - `increase`: a character level's ability increase (1-based), or none.
  - `raceStat`: the ability that takes the race's +2, or none.
  - `dropLevel`: the last character level taken off; its picks' slots go with it.
  - `dropRank`: the last Mythic rank taken off.
  - `rankClass`: a Mythic rank's class (1-based): a path, or a switch at its rank (map ticket 31).
  - `countGear`: ADR 0002's opt-in, under which the Gear's Enhancement counts toward stat prerequisites. The MCP never sets it.
- `apply(build, edit)`: the Build with the edit made. Nothing is judged here.
- `clearPicks(build, slots)`: the Build without the picks in these slots.
- `breaksOf(data, before, after, G?)`: what `after` breaks of `before`, as `Breaks`: `picks`, the picks it breaks, in the Build's order, and `others`, the other choices it breaks (a class, an archetype, Gear…), each with its refusal.
- `allows(data, build, edit, G?)`: whether a plain edit keeps the Build possible, that is, breaks nothing the Build had right. Its `Verdict` is allowed with the new Build, or refused with what it breaks.
- `cascade(data, build, edit, G?)`: a Cascade edit, as a `Cascade`: when it's allowed, `cleared` picks, `clearedSkills` levels, `clearedRanks` and the new `build`.

## Rules

- **What breaks.** `breaksOf` walks both Builds and keys each refusal by what it refuses (`keyedRefusals`: a pick by its slot, any other choice by its place, choice and subject), so the two walks can be compared; a refusal whose key the earlier walk lacks is broken by the edit.
- **Cascade.** The edit is made, then everything it breaks that can be cleared is cleared, then whatever that clearing breaks, until nothing more breaks. It clears and never moves (map ticket 11). Three kinds of choice can be cleared:
  - **Picks.** `cleared` lists them, in the order they were cleared.
  - **A level's skill ranks,** when the level is now over its budget or a rank breaks the skill rules, as after a class change to a class with fewer skill points. `clearedSkills` lists the levels.
  - **Mythic ranks,** from the first refused rank to the last, since ranks come in order. An example is Gold Dragon at ranks 9–10 after rank 8 becomes Devil (`map31.switchAtRank8`). The picks at those ranks are cleared with them and listed in `cleared`, and `clearedRanks` lists the rank numbers.

  `build` is what the Cascade leaves. The Cascade is refused, with what it breaks, when the edit breaks its own target (the edited pick, the edited level's skills, or the edited rank or one before it) or a choice it can't clear (a level's class, an archetype, Gear and the like).

## Tests

`edits.test.ts` runs on the committed data with the gold builds (build ticket 04; map ticket 11): a plain edit that breaks a choice is refused, naming it; a Cascade clears exactly what its preview lists; and every edit `allows` accepts leaves the Build possible.

- Jack-in-the-Green's level-5 Spell Focus (Evocation), swapped for Toughness, is refused: it holds up his level-15 Greater Spell Focus and his rank-8 Spell Focus (Mythic). The Cascade clears exactly those two and leaves the Build possible.
- Taking off the Enforcer's belt cascades the gear-dependent pick it holds up (ADR 0002): level 19's Greater Two-Weapon Fighting (`c126adbdf6ddd8245bda33694cd774e8`).
- A Cascade whose break no cleared pick mends is refused: Jack's level 1 as ArcaneTricksterClass (`ARCANE_TRICKSTER_CLASS`, `9c935a076d4fe4d4999fd48d853e3cf3`), whose prerequisites (a caster level, sneak attack, skill ranks) no first level meets, a class refusal that clearing picks can't mend.
- Jack stays possible after each edit `allows` accepts (an alignment, a later Rank level, a pick cleared, a level's class). `refusedKeys` gives the refusals a walk records, as keys, to tell a Build no worse than another.
