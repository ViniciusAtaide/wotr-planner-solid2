# Legend's rank, the fake Legend class, and Gold Dragon on offer

Status: done
Session: ticket-03c-walk-fixes
Blocked by: none
Plan: [plan](../plan.md)

## Goal

Ticket 07's trail offered "Legend" as the first Mythic rank and at every rank after it. Find out why, and make the Mythic list offer exactly the classes the walk accepts at each rank, path switches included.

## What was found (2026-11-21)

- **The "Legend" on offer was `FakeLegendClass`** (`b82f1fbd191e1f2498266ca41f05027f`), not `LegendClass` (`3d420403f3e7340499931324640efe96`).
  - The root names the fake class `ProgressionRoot.m_MythicLegenFake`. Taking it marks the Legend path as chosen, and nothing else: `LevelUpController.Commit` ensures `UnitPartLegendPathSelected`.
  - Its only gates are story state:
    - `PrerequisiteEtude` `GoddessesSummit` must be playing;
    - `PrerequisiteEtude` `LegendSelectedSummit` must not be playing;
    - a `MythicClassLockComponent` lock, `LegendUnlocked`, which `BlueprintMythicsSettings.IsMythicClassUnlocked` reads.
  - Map 21 treats story state as met, so the walk accepted the fake class at every rank.
  - The planner already expresses the switch as `LegendClass` at its rank (map 31), so the fake class is never a Build's class.
- **The real `LegendClass`** was listed as "Legend (Mythic Hero)".
  - The shared-name rule qualified it by its prerequisite (Mythic Hero level 2), because the fake class shares the name.
  - Its data prerequisites already refuse it at ranks 1–2, and accept it from rank 3.
- **Gold Dragon, Swarm That Walks and Devil were already right:** refused through rank 7 by their `PrerequisiteMythicLevel` 7 (Devil also by `map31.devilFrom`), and accepted from rank 8.
- **Gold Dragon was never on offer.**
  - `offeredMythicClasses` read only the root's `m_CharacterMythics`, which doesn't hold `GoldenDragonClass`.
  - The class is also nameless in `data/`: its `LocalizedName` points at the shared name string with an empty string key. `GoldDragonSpellbook` points at the same shared asset with the key `1649223a-50d3-4c1a-8af2-8991ca57e55e`, which reads "Gold Dragon".

## Decisions (coordinator, 2026-11-21, on the user's standing instruction)

1. **`FakeLegendClass` never belongs in a Build.** It's left out of `offeredMythicClasses`, and the walk refuses it at any rank as a story-only class.
   - `LegendClass` reads "Legend".
   - Map 34 is amended, citing the `PrerequisiteEtude` and `MythicClassLockComponent` gates.
2. **Legend is taken at rank 8, like the other switches.** The walk refuses `LegendClass` before rank 8 as a story rule, cited to the Rust planner's GLOSSARY "Path switch" and GameFAQs `other-mythic-paths.txt` "Playing a Legend".
   - `map31.legendEndsAscensions` still refuses anything after it.
   - Map 31 gets a note: its "rank stays 3" describes what the character holds afterwards, not when Legend is taken.
3. **Every switch class the walk accepts is on offer.** `offeredMythicClasses` adds the walk's own switch classes to the root's list: those `m_IsHigherMythic` marks, plus Devil and Legend. Gold Dragon, Swarm, Devil and Legend each appear, and the walk judges them open from their first legal rank.

## Scope

1. **Overrides,** each with its reason:
   - `FakeLegendClass` loses its display name (a patch clearing `LocalizedName.Shared`). A nameless blueprint is never shown (map 19), so it joins no name group and `LegendClass` reads "Legend".
   - `GoldenDragonClass` gets back its name's string key (a patch setting `LocalizedName.Shared.stringkey` to the spellbook's key), so it reads "Gold Dragon".
   - The two `FakeLegend` feature name overrides are reworded where they describe the classes' names.
2. **The walk:**
   - `map34.legendChoiceClass` refuses `ProgressionRoot.m_MythicLegenFake` as any rank's class;
   - `map31.legendFromRank8` refuses `LegendClass` at a rank below 8;
   - both are worded by R;
   - `pathSwitchClasses(data)` exports the switch classes the walk applies.
3. **`offeredMythicClasses`:**
   - the root's Mythic classes plus `pathSwitchClasses`;
   - minus `NOT_MAIN_CHARACTER_MYTHICS` and the root's `m_MythicLegenFake`;
   - shown only.
4. **Tests on real data:**
   - Legend refused at ranks 3 and 7 (`legendFromRank8`), accepted at 8, and nothing after it;
   - `FakeLegendClass` refused at any rank;
   - Gold Dragon, Swarm and Devil each refused at rank 7 and accepted at rank 8;
   - the offer holds Gold Dragon and "Legend", but not the fake class;
   - Gold Dragon is offered and judged closed at rank 7 and open at rank 8 (the trail's path: `offeredMythicClasses` plus `allows`).
5. **The map:** amend 34; add a note to 31. Update the walk's and pickers' READMEs.

## Done when

- The tests above pass, both gold builds pass unchanged, and `bun run check` passes.
- One commit by path through the hook. Don't push.
- `Status: done` and an `## Outcome`.

## Outcome

- **The walk:**
  - `map31.legendFromRank8` refuses `LegendClass` below rank 8;
  - `map34.legendChoiceClass` refuses the root's `m_MythicLegenFake` at any rank;
  - both are worded by R and placed on the rank.

  `pathSwitchClasses(data)` returns the `m_IsHigherMythic` classes plus `SWITCH_TO`.
- **`offeredMythicClasses`** is the root's list plus `pathSwitchClasses`, minus `NOT_MAIN_CHARACTER_MYTHICS` and the Legend choice class. It now offers Gold Dragon, Swarm That Walks, Devil and "Legend", and no longer the fake class. `offered` takes GUIDs, from a `guidsOf` helper.
- **Overrides:**
  - `FakeLegendClass` loses its display name;
  - `GoldenDragonClass` gets back its name's string key.
- **What the re-import changed:**
  - `LegendClass` reads "Legend"; `GoldenDragonClass` reads "Gold Dragon".
  - The three name overrides on the Legend features were no longer needed, and the importer refused them, so they're removed. The features now settle automatically:
    - "Legend (level 1)" for `LegendFeature`;
    - "Legend (feature)" for `FakeLegendFeature`;
    - "Legend's Corruption Resistance (Legend)" for the real Legend's copy, and bare for the fake path's copy, which no Build holds.
  - Gold Dragon's Bound of Possibility now reads "The Bound of Possibility (Gold Dragon)", by map 29's required-path rule.
  - 9 data files changed, plus the report.
- **Tests on real data:**
  - Legend refused at ranks 3 and 7 and accepted at 8, plus the existing test for nothing after it;
  - the Legend choice class refused at ranks 1 and 8;
  - Gold Dragon, Swarm and Devil each refused at rank 7 and accepted at 8;
  - the offer holds every switch with "Legend" and "Gold Dragon", but not the fake class, and Gold Dragon is judged closed at rank 7 and open at rank 8.

  Both gold builds pass unchanged. `bun run check`: 985 engine and 125 client tests.
- **Map:** 34 amended; 31 has a note, and its table now says the character holds rank 3 afterwards.

## Follow-up (coordinator, 2026-11-21)

- **The rule now covers every switch:** `map31.legendFromRank8` became `map31.switchAtRank8`. A switch class (Gold Dragon, Swarm That Walks, Devil, Legend) is taken only at rank 8, or right after the same switch. Devil and Swarm were still open at rank 10 after a path through rank 9.
- **Tests:**
  - every switch refused at ranks 9 and 10 after a path;
  - Gold Dragon, Swarm and Devil continuing at 9 and 10 after rank 8;
  - Legend at 9 and 10 still ending the ranks.
- **Map 31** is amended.

## Follow-up: shared names resolved in the importer (coordinator, 2026-11-21)

- **The cause, fixed in the importer:** `GoldenDragonClass`'s name was lost because its reference to the shared name asset had an empty key. `indexDump` now gathers each shared asset's key from every reference in the dump (`sharedKeyCollector`). `displayName` uses that key when a field's own `Shared.stringkey` is empty.
- **The agree-on-one-key rule:** an asset whose references disagree on the key gives no key, so nothing is named from a guess. A test covers that case.
- **Gold Dragon's patch override is gone:** the class reads "Gold Dragon" from the importer now.
- **Newly named** (11 blueprints that were nameless):
  - `AeonSummonFeatureTier7` "Summon Gold Golems" and `AeonSummonFeatureTier9` "Summon Adamantine Golems";
  - `AngelSummonFeatureTier8` "Summon Astral Devas";
  - `AngelSummonFeatureTier9` "Summon Spirit Guardian" and `AngelSummonTier10` "Summon Spirit Guardians";
  - `MysticTheurgeHunterLevelSelection2`–`6`, "Hunter Spell (2nd Level)" through "(6th Level)". The 1st Level selection and the Inquisitor and Oracle siblings already read this way.
- **Requalified:**
  - `AngelSummonFeatureTier7`, from "Summon Astral Devas (Angel)" to "(Angel 5)";
  - `AngelSummonFeatureTier8`, as "(Angel 6)".

  Tier 8 now shares the name, so the two are told apart by level.
- **Checked against the Rust planner:** six of the eight summon and spell names agree with its own files. Tier 8 takes the game's text where the Rust planner has its own label ("Astral Devas x4").
