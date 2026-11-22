# Build

A Build is the main character's choices, in the game's own terms (GLOSSARY.md "Build"). Every choice names the blueprint the game's level-up action would take, so the walk (`engine/walk/`) replays the Build through the game's rules without translating it. A Build may be incomplete: a missing choice is an empty slot, never an error.

Every citation of the game's code lives in `cites.ts`, keyed by the type or field that ports it; paths there are relative to `decompiled/Assembly-CSharp/Kingmaker/`.

## Public entry

- `Build` and its parts: `Alignment`, `Place`, `SlotId`, `Pick`, `LevelUp`, `Ascension`, `ClassChoice`, `Archetypes`, `GearPlace`, `Gear`.
- The values a Build code can hold, by type (build ticket 05d): `RankLevel`, `SkillRank`, `SkillRanks`, `AbilityScore`, `AbilityScores` and `Archetypes`. The checking constructors `toRankLevel`, `toSkillRank`, `toSkillRanks`, `toAbilityScore`, `toAbilityScores` and `toArchetypes` return the value or `undefined`; they run once where a value comes in (the planner's inputs, the MCP's tools, the codec's reader). The throwing ones, `rankLevel`, `skillRanks` and `abilityScores`, are for trusted literals: the gold Builds and tests.
- `placeKey`, `slotKey`: keys for maps and messages.
- `withPick(build, pick)`: the Build with the pick in its slot, in place of the pick there.
- `sameBuild(a, b)`: whether two Builds make the same choices. Picks are compared by slot key, not by the order they were made in, and records by key, not by key order.
- `cites`: the citation registry.

## The value

- `Alignment`: the game's nine alignments.
- `Place`: where a level-up happens: a character level, or a Mythic rank (a Mythic class's level-up, with its own level-up state).
- `SlotId`: a slot, as the game keys it within one level-up when it adds a selection: the selection, and how many of its slots that level-up opened before this one. A slot the race or a fact's component opened also carries `from`, its opener's GUID, and its index counts only that opener's slots, so a race change never shifts a class's pick into the race's bonus feat slot (map 11's "clear, never move"; QA pass 6). A nested slot keeps the same key shape. `slotKey` writes `from` as `@<guid>`.
- `Pick`: the option a Build puts in a slot (the feature-selection action's item and its parameter). `param` is the parameter, for a parametrized feat.
- `LevelUp`: one character level's own choices besides its picks (selecting the class, spending the attribute point and the skill points). `increase` is the ability that takes the point at a level that is a multiple of 4, as selecting the class applies it; `skills` is the ranks bought at this level, by skill.
- `Ascension`: one Mythic rank: its Mythic class, and its Rank level (ADR 0003), the character level it is taken at.
- `ClassChoice`: what a Build fixes for a class when it is first taken (GLOSSARY.md "Class choice"): its archetype, at most one (`Archetypes`, none or one). The game's level-up screen replaces the class's archetype before it adds the one chosen, so a player Build never holds two, though the rules layer would allow several compatible ones; `toArchetypes` refuses more than one.
- `GearPlace`: the places of the game's item slots: the worn places (equipment and armour slots) and the two hands (hand slots).
- `Gear`: a Build's Gear (GLOSSARY.md): at most one item in each place. Gear belongs to no level.
- `Build`:
  - `raceStat`: the ability that takes a race's +2 when the race lets the Build choose it.
  - `scores`: the point-buy scores, before racial modifiers (the game's stats distribution).
  - `levels`: character level i + 1 is `levels[i]`.
  - `ranks`: Mythic rank r + 1 is `ranks[r]`.
  - `aspects`: the aspect toggles the Build keeps on (GLOSSARY.md "Aspect kept on"; map 32), each an activatable ability the character holds. Only these toggles' buffs count as on.
  - `name`: the Build's optional name (ticket 11), plain text the player gives it, never game text. `toBuildName` trims it and keeps 1 to 60 characters (`MAX_NAME_LENGTH`, counted in code points); R words a longer one (`buildNameLength`). Nothing the walk reads.
  - `countGear`: the opt-in of ADR 0002: the Gear's Enhancement bonuses count toward stat prerequisites, and each pick that needs them is marked gear-dependent. Off by default; the MCP never sets it.

## Keys

- `placeKey`: one key per place: `L3`, `M2`.
- `slotKey`: one key per slot: `L3/<selection guid>#0`.

## Tests

`build.test.ts`: `toArchetypes` takes none or one archetype and refuses two, `ClassChoice.archetypes` holds no two-element tuple by type, and `sameBuild` compares picks by slot key, not by order, while telling a different choice apart.
