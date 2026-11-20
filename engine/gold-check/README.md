# Gold check

The gold builds as the walk's acceptance test (build ticket 03; map ticket 14): every line each write-up lists at a level or rank is gained there, nothing is refused, and the known gaps are the only exceptions. The fixtures themselves live in `engine/gold` (see its README). `compare.ts` was split out of them so the walk's own tests can import the gold Builds without an import cycle: the comparison needs the walk, the fixtures don't.

## Public entry

- `compare(data, gold, walk)`: every way the walk of a gold Build disagrees with its write-up, as `Disagreement`s.
- `unexplained(disagreements, gaps)`: the disagreements no gap covers, and the gaps that cover none (those now agree, so their entry must go).
- `Disagreement`: a gold line the walk disagrees with, or a check of the Build's start. `build` is the gold build's name, `place` its place key (`L3`, `M2`) or `start`, `line` the line, and `what` what is wrong.
- `Gap`: a disagreement known today, a bug or an unbuilt part of the planner and never the write-up's fault: the `build`, `place` and `line` it covers, the `ticket` that closes it, and `why`.
- `ALIASES`: the write-up's spellings that the game's display names spell otherwise, each with the names it may stand for.
- `namesFor(item)`: the display names a line's item may stand for: itself, its "Name - Value" forms, and its aliases.
- `matchesName(written, allowed)`: whether a blueprint's written name is one a line allows.
- `itemsOf(line)`: a line's items; a bracketed line holds several, split at its semicolons.

## Rules

- **A refusal is never the write-up's fault.** `compare` reports every failure of the walk as a disagreement, at its place, as `refused: <subject>`.
- **The class at each place.** The write-up names a level's or rank's class by its archetype's name when it has one (`levelOrRank` is the Build's level or Mythic rank at that place), so the write-up's class must be the class's or one of its archetypes' display names.
- **Second-bloodline lines.** A bracketed line is gained at its own place or at the Mythic rank that takes the Second Bloodline (`SECOND_BLOODLINE`, `3cf2ab2c320b73347a7c21cf0d0995bd`), whichever comes later in `timeline`, the order of every place a Build walks: each level, then the ranks placed at it.
- **Names.** Each fact a line expects must have a display name the line allows, and be gained at the line's place with the line's parameter. A line "Name - Value" also matches "Name — Value" and "Name (Value)" with no `ALIASES` entry, and a name matches whatever qualifier the importer writes after it, so no alias spells one out: `matchesName` takes the name itself or the name followed by the qualifier the importer writes after a shared name ("Menacing (Ranger 6)", map ticket 27). The fixture's GUID says which blueprint it is, so the line need only name it bare, and a change to the qualifier rules leaves the gold builds alone.
- **Why some aliases exist.**
  - Life-Bonding Friendship's bracket names the superpower's teamwork feat, at its first rank and its second.
  - The slayer's combat style is the ranger's Menacing style, taken through a Combat Style Feat talent, so each "Menacing Style - X" line stands for Combat Style Feat, Menacing and X.
  - The level-up names each step of Studied Target and of the sneak dice ("Studied Target +2", "+1d6 sneak"): each is a rank of the one feature.

## Tests

`gold.test.ts` walks both gold builds on the committed data:

- They gain every line of their write-ups, apart from the known gaps. The list only shrinks: a fix deletes its entry, and an entry that no longer covers a disagreement fails the test. `refused(...)` makes the pair of gaps one refused pick needs: its refusal and its write-up line.
- Each starts as its write-up: race, background and the level-1 scores with the race's modifiers.
- Each is refused the same at every alignment the write-up allows.
- Each depends on its Gear only where its write-up does: the Enforcer's Greater Two-Weapon Fighting (TwoWeaponFightingGreater `c126adbdf6ddd8245bda33694cd774e8`) at level 19 needs Dexterity 19, the Build's own 17 plus the Enhancement +2 of its belt (BeltOfDexterity2 `b6af4c1834999e74497b41588d1071cd`), the one item marked (ADR 0002's opt-in). Jack has no Gear opt-in and marks nothing.
- Each puts ranks in every skill the write-up lists.
- `namesFor` reads "Name - Value" as the game's "Name — Value" or "Name (Value)".
- `matchesName` matches a line's bare name to the name the importer qualified: the Enforcer's Menacing style pick, which the importer qualifies by its grantor and level (map ticket 27).

## Known gaps

`KNOWN_GAPS` in `gold.test.ts`; each entry's `ticket` and `why` are its data.

- **Jack-in-the-Green L11, Spell Specialization** (map ticket 22): feats whose parameter is a spell wait for phase 2. SpellSpecializationFirst (`f327a765a4353d04f872482ef3e48c35`) has a `PrerequisiteAnySpellsInSpellbook` prerequisite, which the walk can't meet without spells.
