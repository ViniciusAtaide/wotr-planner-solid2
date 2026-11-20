# Gold builds

The gold builds (`GLOSSARY.md` "Gold build"; map tickets 14 and 19) are two real players' write-ups, Jack-in-the-Green and the Enforcer, which the user knows work in the game. Each is converted once into a GUID-keyed fixture: the Build that reproduces it, and every write-up line beside the facts it names. `engine/gold-check` holds the acceptance test that walks them; the fixtures live here, apart from that test, so the walk's own tests can import the gold Builds without an import cycle.

The walk must gain each line's facts at the line's level or rank; a refusal is never the write-up's fault; and the known gaps are listed, each with its ticket, and the list can only shrink (see `engine/gold-check/README.md`).

The write-ups and their hand conversion are the Rust planner's (`~/code/wotr-planner/libs/seeds/tests/game_data/gold/`, its ticket 160). The rules for reading them are carried over from its `gold.rs`: a line's label prefix is dropped, and a bracketed line is the second bloodline's, gained at its own level or at the Second Bloodline's Mythic rank, whichever comes later.

## Public entry

- `jackInTheGreen`, `enforcer`: the two fixtures, each a `Gold`.
- `Gold`: a gold build. `name`; `build`, the Build that reproduces the write-up; `start`, the write-up's starting character: `race` and `background` by display name, `attributes` (the level-1 scores with the race's modifiers included), the `skills` it puts ranks in, and `alignments` (every alignment the write-up allows); and `places`, one `GoldPlace` per level and rank.
- `GoldPlace`: a level or Mythic rank (`place`), the write-up's `class` there (the archetype's name when the class has one, or the Mythic path's), and its `lines`.
- `GoldLine`: one write-up line. `line` is the write-up's own words with the label prefix dropped; `expect` is what the line says is gained there; `secondBloodline` is the bracket mark (the line is the second bloodline's, gained at its level or at the Second Bloodline's rank, the later).
- `Expect`: one thing a line says is gained: a fact (at a parameter, when it has one), or an ability increase.
- The helpers the fixtures are written with:
  - `pick(place, selection, index, feature, param?)`: a Pick in that slot.
  - `facts(line, ...guids)`: a line whose facts are all gained at its place.
  - `withParam(line, fact, param)`: a line naming a parametrized feat at one parameter.
  - `increase(line, attribute)`: an ability increase ("+1 Strength", "Charisma +1").
  - `second(line, ...guids)`: a bracketed line, the second bloodline's.
- `cites`: the game's code the fixtures' choices rest on.

## How the fixtures are written

Each line keeps the write-up's words, label prefixes dropped. The Build is the write-up's: its slots are the ones the game opens, and each GUID a pick, race, archetype or item names is a constant named after its blueprint's asset name (`BASIC_FEAT_SELECTION`, `HASTY_HALFLING`; `BASE_RASE_HALF_ELF_SELECTION` keeps the asset's own spelling). The GUIDs in the write-up lines stay as written. Where the write-up leaves a choice open, the fixture settles it as the Rust planner did; the notes below list those choices.

Both builds take their Mythic ranks at the game's Expected levels, the character level each Mythic rank is meant for: the MythicsSettings blueprint (`3b8a6729da1e13a4e8e606e9f0fa38d8`) lists them in its `CharcaterLevelRestrictions` (6/7/9/11/14/15/16/17/17/19), read by `BlueprintMythicsSettings.GetCharacterLevelRestriction`. Both point buys cost exactly 25 points by the game's point-buy table (`StatsDistribution`). The citations are in `cites.ts`.

## Notes on Jack-in-the-Green

A Halfling Sylvan Sorcerer 20 on the Azata path, converted once from the Rust planner's `jack-in-the-green.ron` (the write-up as written is its `source.txt`).

- A "Bloodline Spell - A (+ B)" item of the write-up is two lines: A, the Sylvan bloodline's spell, and (B), the second bloodline's (the bracketed `second` lines).
- Choices the write-up leaves open:
  - Hasty Halfling, Chaotic Good and atheist, as the Rust planner settled them (its ticket 88).
  - Mobility and Persuasion take a rank every level, and Use Magic Device one at odd levels: the Sorcerer's 2 skill points plus Intelligence 12's half point a level (the game's `LevelUpHelper.GetTotalSkillPoints`) give 5 ranks per 2 levels.
  - The Mythic ranks are taken at their Expected levels (`EXPECTED`), Mythic Hero for ranks 1 and 2, then the Azata.
  - Charisma takes every fourth level's increase.
- Scores: 12/14/14/12/8/17 costs 2 + 5 + 5 + 2 - 2 + 13 = 25; the Halfling's -2 Strength, +2 Dexterity and +2 Charisma make the write-up's 10/16/14/12/8/19.

## Notes on the Enforcer

A Half-Elf Arcane Enforcer 15 / Sylvan Trickster 4 / Mutation Warrior 1 on the Azata path, converted once from the Rust planner's `enforcer.ron` (the write-up as written is its `source.txt`).

- Choices the write-up leaves open, as the Rust planner settled them (its tickets 88, 91, 163 and 171):
  - Chaotic Good and atheist.
  - Athletics, Perception and Persuasion take a rank every level, and the rogue levels (Sylvan Trickster) also Mobility and Stealth.
  - The Trickster's first ascension, then the Azata. The Mythic ranks are taken at their Expected levels (`RANK_LEVELS`) except rank 10, taken at level 20 instead of 19: after level 20's Shield Focus, which Shield Focus (Mythic) at rank 10 needs.
  - A Belt of Incredible Dexterity +2 (`BELT_OF_DEXTERITY_2`, BeltOfDexterity2 `b6af4c1834999e74497b41588d1071cd`; its enchantment Dexterity2 is an Enhancement +2) under the Gear opt-in (ADR 0002, `countGear`), so level 19's Greater Two-Weapon Fighting (which needs Dexterity 19) is legal, and the walk marks that pick gear-dependent.
- Scores: 16/16/14/10/8/12 costs 10 + 10 + 5 + 0 - 2 + 2 = 25; the Half-Elf's +2, on Strength (`raceStat`), makes the write-up's 18.
- `SLAYER_STUDY_TARGET_FEATURE` (Studied Target) and `SNEAK_ATTACK` are named in several lines: the level-up names each step of them, and each step is a rank of the one feature.

## Tests

The fixtures have no tests of their own here. `engine/gold-check/gold.test.ts` walks both and compares each line; `engine/codec`, `engine/edits` and the walk's tests use them as real, whole Builds.
