# Slots and pickers (S)

What each slot can take (guide §4, build ticket 04). S lists a slot's options and asks W about each one, at the walk paused at the slot (`pauseAt`). It never repeats the band order or judges an option itself, so a picker's answer is the walk's. R words each closed option's Refusal.

## Public entry

- `picker(data, build, slot, G?)` and `Picker`: every option of a slot with its status, judged at the walk paused there; undefined when the Build never opens the slot. A `Picker` holds the opened `slot`, its `options`, and `unit`, the character at the pause, which R words each closed option's Refusal against.
- `racePicker(data, build, G?)` and `RaceOption`: every race on offer with its status and its heritage rows.
  - **A race's `closed`** is the walk's own `raceRefusal`: not a race, or ruled out by an archetype the Build takes.
  - **Heritage rows:** a race with a heritage slot (`heritageSlotIn`: a race's top-level selection in the `Racial` group) carries `heritage`, the slot picker's options at a level-1 Build with that race (`firstLevelWith`).
  - **`firstLevelWith`** keeps the start, the first level's class and the archetypes, and keeps the +2 only when the race lets you choose it.
  - **Cost:** the whole list costs about 3 ms where one `allows` per race cost about 170 ms. What a race would break later is worked out only for the row taken.
- `backgroundPicker(data, build, base, G?)`: the background slot's groups.
  - **Each group** carries its `option` and, when the group is a selection, its sub-choice `child`. That's the slot picker paused at the slot the group opens (`{ place, selection: group, index: 0 }`), with the old group's sub-choice dropped.
  - **Cost:** about 1 ms where a walk per group cost about 60 ms.
- `namesInList(data, guids)`, `bareName(bp)` and `ListName`: names as a list shows them.
  - **Why:** the importer qualifies a shared name across everything a Build can reach, so "Allied Spellcaster" is "Allied Spellcaster (feature)" only because a Cavalier buff has the same name. A list only has to tell its own options apart.
  - **`bareName`** is a blueprint's name without the qualifier the importer added. Use it for a slot's label.
  - **`namesInList`** gives each distinct blueprint in a list its bare `name`, plus its `qualifier` only when another blueprint in the same list shares that bare name.
  - **Where they apply:** `picker` puts both on every option (counting shown options only), and `classPicker` on every class.
  - **Names that keep their parentheses:** a name the game itself writes that way ("Expanded Arsenal (Magic School)") has no qualifier and stays whole.
- `classPicker(data, build, place, G?, rankLevel?)` and `ClassPicker`: every class on offer at a level (`offeredClasses`) or a Mythic rank (`offeredMythicClasses`), with its status, judged at one walk paused at that place's class choice (`pauseAtClass`). An existing level or rank pauses where the walk reaches it, and a new level (`levels.length + 1`) pauses after the last level. A new rank (`ranks.length + 1`) needs its `rankLevel` and pauses where the walk would ascend it.
  - An option's `closed` is the first refusal the walk gives that class there: wrong kind of class, prerequisites, the level cap, a path switch off rank 8, ranks ended, Devil's origin.
  - **`shown`** follows the game's chargen list (`CharGenClassPhaseVM.CreateClassListSelector`): a class with `HideInUI` is never shown, and one with `HideIfRestricted` is shown only when it meets its prerequisites. That's how the Eldritch Scion class, the Magus archetype's implementation, stays out of the list until a Build qualifies. The importer keeps both flags on classes.
  - **`archetypes`:** each class lists its shown archetypes, each judged at the same pause by the walk's own `archetypeRefusal`: the archetype must belong to the class and be taken at the class's first level, it must fit beside the class's other archetypes, and its prerequisites must hold ("Nine-Tailed Heir" needs Kitsune).
  - Status means legal at this place. What a class would break later is worked out only for the class the user takes, by E's `allows` and `cascade`, as for slot pickers.
  - A class list costs about 1–7 ms where 40 `allows` cost about 600 ms.
- `OptionStatus`: one option of a slot, with its status at the paused walk.
  - `feature`: the option.
  - `param`: the parameter, for a parametrized feat (one option per parameter) or a Mythic spellbook.
  - `shown`: whether the game's level-up screen lists it (`shownInSelection`). The game builds the list from the selection's items with no `HideInUI` filter (`CharGenFeatureSelectorStateVM.CreateFeaturesList`), and hides an item only when it is unavailable and has `HideNotAvailibleInUI` (`CharGenFeatureSelectorItemVM.ShouldBeHidden`). So a nested selection marked `HideInUI` (the background groups, the Sorcerer's bloodline feats, the prestige classes' spellbooks) is listed, and a companion-only background is not. A nameless blueprint is never listed (map 19). `UnitPartHiddenFacts` (facts hidden by unit state) is not ported. A hidden option is judged like any other; surfaces leave it out.
  - `closed`: why the game refuses it; absent when it is open.
  - `gearItems`: the worn items an open option needs under the Gear opt-in (ADR 0002); absent when it needs none.
- `offeredClasses`, `offeredMythicClasses`, `offeredRaces`, `mythicStartingClass` and `NOT_MAIN_CHARACTER_MYTHICS`: what character creation offers. `characterWideSlots` and `BACKGROUNDS_BASE_SELECTION`: which of the walk's slots belong to the character.
- `featureTags`, `tagsOf`, `FEATURE_TAG_BITS`, `FeatureTag`, `pickerComponentTypes`: a feat's tags as the level-up list shows them.
- `candidates(data, selection)`: every option a slot lists.
- `parameters(feat)`: a parametrized feat's parameters.
- `walkVerdict(data, build, slot, option, G?)`: what the walk says of an option in a slot.

## Rules

- **What character creation offers** (`offers.ts`):
  - `offeredClasses` is the root progression's `m_CharacterClasses` (`ProgressionRoot.AvailableCharacterClasses`);
  - `offeredRaces` is `m_CharacterRaces` (`CharacterRaces`);
  - `mythicStartingClass` is `m_MythicStartingClass` (`MythicStartingClass`), the Mythic class a character starts on;
  - `offeredMythicClasses` is `m_CharacterMythics` (`AvailableCharacterMythics`) plus the walk's `pathSwitchClasses`, so every switch the walk takes is on offer (Gold Dragon isn't in the root's list), minus two planner rules from map ticket 34:
    - `NOT_MAIN_CHARACTER_MYTHICS`: the companions' Mythic class and Shard Powers;
    - the root's `m_MythicLegenFake`: the class the story's level-up takes to choose the Legend path (`LevelUpController.Commit`). A Build takes Legend itself (map ticket 31), so this class is never a rank of its own.

    The walk then judges each class at the rank: a switch is open from rank 8.

  Each list is kept to shown blueprints and sorted by name. The game's DLC filter is not ported, because every DLC's data is present.

- **Which slots belong to the character** (`offers.ts`, map 13's 2026-11-21 amendment): `characterWideSlots(data, slots)` gives the keys of the walk's opened slots that the planner shows with the character rather than on a level. A slot belongs to the character when the race grants it (`SelectRace.Apply`), when it is the root progression's deity selection (`ProgressionRoot.DeitySelection`), when it is `BACKGROUNDS_BASE_SELECTION` (BackgroundsBaseSelection), or when it opens inside one of those, at any depth. The game's character creation puts racial, heritage and background selections in its race-features phase and the deity in its lore phase (`CharGenFeatureSelectorPhaseVM.GetFeaturePriority`), apart from the class's own; the planner keeps that split by what grants the slot. For a class that depends on a deity (a Cleric), the game shows the deity among the class's features; the planner still shows it with the character, as the ticket decided.

Citations for these live in `cites.ts`.

- **A feat's tags** (`tags.ts`): `featureTags(data, feature)` is the tags the game's level-up list shows under a feat and searches (`CharGenFeatureSelectorItemVM`, from its `FeatureTagsComponent`), undefined for a feature with none; only the game's feats carry it. `tagsOf` reads them as names or as the `FeatureTag` enum's bits (`FEATURE_TAG_BITS`). `pickerComponentTypes` names the component types S reads, for the importer's reader check.

- **`candidates`** lists a selection's items (`m_AllFeatures`), a parametrized feat once per parameter. A Mythic spellbook selection's items are itself, with no spellbook, and itself with each of its `m_AllowedSpellbooks`, as the game collects them.
- **`parameters`** follows the game's extraction of a parametrized feat's selection items, by `ParameterType`: every weapon category, every spell school, every skill, or the feat's `BlueprintParameterVariants` (Custom and FeatureSelection). The spell parameters are out of v1 (map 22), so those types list nothing.
- **`SPELL_SCHOOLS`** is the game's spell school enum less `None`, which the parametrized feat's `CanSelect` refuses.
- **`picker`** judges each candidate at the paused walk and asks it for the Gear items an open option needs.
- **`walkVerdict`** walks the Build with the option taken in the slot and returns the refusal the walk records for that slot, or undefined when it applies the pick. It is the self-check every picker answer must agree with (guide §6).

## Tests

- **pickers.test.ts**, S and R on the committed data. Each expectation is the game's, by blueprint name and GUID (the constants at the top of the file are named after their blueprints).
  - Each of the gold builds' own picks, judged at its slot by the paused walk, is closed exactly when the full walk refuses it. The pause point (build ticket 04) is the end of the slot's band, with the slot's own pick withdrawn. It runs about 50 walks, well past vitest's 5 s default on a busy machine, hence its 60 s timeout.
  - BasicFeatSelection's `m_AllFeatures` include Power Attack, and WeaponFocus, which takes a weapon category, once per category.
  - The Enforcer's L19 TwoWeaponFightingGreater is open only with the Gear counted: it needs his BeltOfDexterity2 (ADR 0002).
  - A slot the Build never opens has no picker.
  - R: PowerAttackFeature needs Strength 13 (its PrerequisiteStatValue), worded with the sorcerer's 10.
  - R: a cleric of Asmodeus (AsmodeusFeature, taken at DeitySelection) can't take AirDomainProgression at DomainsSelection: it needs AirDomainAllowed, a nameless flag only deities grant, so R words it by the kind of thing that grants it, and names the Build's own deity (map 19).
  - R: Jack's L5 Spell Focus (Evocation) holds up his L15 SpellFocusGreater and his M8 SpellFocusMythicFeat, so swapping Toughness into that slot breaks both.
  - R: Dodge needs Dexterity 13. A Dexterity 12 fighter reaches it with the level-4 increase, so the closed option at the L1 fighter feat opens at the L4 one.
- **pickers.agree.test.ts**, the pickers agree with the walk (build ticket 04, guide §6). At a slot of each kind, from the gold builds, each option's picker status equals `walkVerdict`, and every closed option carries a Refusal with a reason, and unmet lines exactly when the rule had unmet prerequisites. The slots:
  - a BasicFeatSelection with parametrized feats: the Enforcer's L9 basic feat, whose pick is Improved Critical at a weapon, with every parametrized feat at every parameter. Only this slot is sampled (`judgeOnlyASample`; Coordinator, 2026-11-20): a fixed sample of about 100 options. The sample is the gold pick's neighbourhood first (the picked feat, the facts its prerequisites name, and the feats whose prerequisites name it; one entry per neighbouring feat, at the gold pick's parameter when it takes it, else its first), then every k-th of the rest, in the picker's order;
  - a nested selection: Adaptability 26a668c5a8c22354bac67bcd42e09a3f, nested in the Half-Elf's BaseRaseHalfElfSelection;
  - a waived slot: RangerStyleMenacingSelection10 7d5bd07830a5e2c478852bf8b860db2c, whose `IgnorePrerequisites` waives its picks' prerequisites;
  - a Mythic slot: Jack's M6 MythicFeatSelection, whose pick is Expanded Arsenal at a school.

## The sweep

`sweep.ts` is the whole check the agree test samples: at every slot of both gold builds, every option's picker status must equal what the walk says when the Build takes that option there (`walkVerdict`). Run it whenever W changes:

```sh
bun engine/pickers/sweep.ts [<gold name prefix>] [<slot filter substring>]
```

It prints each disagreement and a count, and exits 1 when there is any. `bun run check` runs only the sample in pickers.agree.test.ts; the sweep runs every option, which takes minutes.

The test "lists every pick the gold Builds made, in its own slot" leaves out Jack-in-the-Green's known gap, Spell Specialization at level 11 (map 22), as the MCP's end-to-end test does.
