# Mythic rank timing: the earliest character level for each rank

Ticket: [05 Earliest character level for each Mythic rank](../issues/05-earliest-level-for-each-mythic-rank.md).
Researched 2026-11-19.

Sources:

- **Dump:** BubblePrintsData `blueprints_raw_2.7.0x_0.binz` (136,905,792 bytes, SHA-256
  `03ba6e29…c9c6a`, pinned in `~/code/wotr-planner/scripts/game-sources.pins`). Read with the Rust planner's
  `tools/game-check` (`grep` and `show`), plus throwaway scripts kept outside the repos.
- **Code:** xADDBx/WrathDecompiled at `6ce4a6ba6d35039cc73ba16faf70c2d9952a63c2`, under `decompiled/Assembly-CSharp/Kingmaker`.

## Answer

**The game ships the table.** `BlueprintMythicsSettings` **MythicsSettings** `3b8a6729da1e13a4e8e606e9f0fa38d8`
(the one `BlueprintRoot` names in `m_BlueprintMythicsSettingsReference`) has a list field
`CharcaterLevelRestrictions` (the misspelling is the game's own). Index 0 is unused, and indexes 1 to 10 give the
character level for each Mythic rank:

| Mythic rank | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Character level | 6 | 7 | 9 | 11 | 14 | 15 | 16 | 17 | 17 | 19 |

The Rust planner uses exactly this table (`libs/game-data/progression.ron`). It got it from a person, not from the
game (see below). The TypeScript planner can read it straight from the dump and cite that GUID, so there is no
hand-kept table to maintain.

**What the table means in the engine.** It is a rule for one place only, and it is not the story's timing.

- `BlueprintMythicsSettings.GetCharacterLevelRestriction(rank)` returns the list entry for that rank, or 0 when the
  rank is out of range.
- Its only caller is `RespecWindowVM.UpdateProperties`
  (`UI/MVVM/_VM/CharGen/RespecWindowVM.cs`). For the next rank (current rank + 1) it sets
  `HasMythicLevelRestriction` when all three of these hold:
  - the character level is below the table's level,
  - a character level-up is still available, and
  - a mythic level-up is available.

  `RespecWindowPCView.SetupMythicUpButtonView` and the console view's handlers then disable the mythic-up buttons
  and show a restriction label.
- The window is opened in two cases, both in `CharGenContextVM`:
  - `HandleRespecInitiate`, which the `RespecCompanion` action triggers, and
  - `HandleForceLevelUp`, for a forced catch-up level-up such as a companion who joins late.

  So when a character owes both character levels and mythic ranks at once, the game makes them spend character levels
  until they reach the table's level for the next rank. The table is the designers' own statement of where each rank
  falls on the character-level timeline.
- During normal play nothing checks it. `UnitProgressionData.CanLevelUpMythic` looks only at whether the rank is
  below 10, whether `MythicExperience` is above `MythicLevel`, and whether the unit is a clone pet. It never looks at
  character level. `LevelUpController.CanLevelUpMythic` adds only checks for combat, death and needing a name.

**Can the earliest level be derived from story grants instead? No. The story timing is an estimate by nature.**

- **How ranks are granted.** `MythicExperience` counts the ranks the story has granted. It rises only through
  `UnitProgressionData.GainMythicExperience` and `AdvanceMythicExperience`. Three actions call those:
  - `GainMythicLevel` (TypeId `efeff58c…0543`). Its `Levels` field is the number of ranks. It goes to the main
    character, or to `SpecificUnit`.
  - `SetMythicLevelForMainCharacter` (TypeId `06db4d5a…8fac`). It raises the main character to `DesireLevel`.
  - `Player.GainMythicExperience`, which spreads the new total to every character.
- **Where the grants are.** A dump grep finds 77 blueprints that hold these actions:
  - **Dialog cues.** About 50 `BlueprintCue` and a few `BlueprintDialog`. Some examples:
    - `Boss_End_Dialogue` `fb7b9131fa2423949b6f14eb9a244d96`
    - `RaspenRifts_Echo_End_Dialogue` `7e6f423c1e279ae43be6a481712af45e`
    - `HeartOfLab_AreeLab_dialog` `8141fc9f433568b4c8ee9b68a5a66171`
    - `Baphomet_dialogue` `12189cbe8aa646447a29b06f153faa16`
    - `NocticulaAfterBaph_dialogue` `58ebc5abeccf3594a876108ba73364c1`
    - `Goddesses_Summit_dialogue` `bac7a86b3f254fa4dbf2c8762e56bdc3`
    - `UltimateWin_dialogue` `f04058bf589cf0f438f85728c4c2af7a`
    - `Zacharius_FinalBetrayal_dialogue` `5ec3e47a05de18c46b36f08c8dfbeafb`
  - **Path-specific dialogs.** For example `AgainstMentor_azata_c5_dialog` `678485774c2432d44a76528140c18f5a` and
    `MythicTrickster_Council_5-2_Dialogue` `f8adc8275f39d2443a13505f0d403ed5`.
  - **Cutscene `CommandAction`s.**
  - **Etudes.** For example `CheliaxWaitingInRuins` `1fb5dba7e2beabe4ebf631c07559f64d` and
    `MythicDragonLvl9_Gained` `091bdebe8b621e043ac0b67db461ebb8`.
  - **DLC content.** For example `DLC3_FirstMythic_dialogue` `441d5ef4fec04cdb8a4dc95b320758c8`,
    `DLC5_HermitDead_dialogue` `e2531ac7e612414eb0f51cace5f4ee23`, and the `DLC1_Levelup` etude
    `dca1299c933b43dd8078cdf078ee6121`, which grants 10 at once.
  - **Test and upgrade blueprints.** The `ThresholdIndoor_Cutscenes_*_Preset` area presets grant 2 each, and two
    `BlueprintPlayerUpgrader`s (`PF-258638`, `PF-485715`) exist for save fixes.

  Almost every story grant is `Levels: 1`. Many hang on a dialog branch or a path, so the order of grants depends
  on the story graph and the player's choices. The dump never gives a chapter number.
- **Why character XP at each grant can't be computed.** The character level at a grant comes from XP:
  `UnitProgressionData.MaxAvailableCharacterLevel` compares `Experience` with `ExperienceTable` (`XPTable`
  `87c24ce6bcf1a994296f3c582c1a632b`, or `LegendXPTable` `11c77f6853ac46aa8e2d004d6dca5f9f`). XP comes from three
  kinds of source:
  - **Kills.** `ExperienceHelper.GetXp` turns a CR into XP with `CRTable` `19b09eaa18b203645b6f1d5f2edcb1e4` and an
    encounter-type multiplier. The enemies themselves are placed in Unity scenes (references carry only a
    `SceneAssetGuid`), and the scenes are not in the dump.
  - **Quest and dialog awards.** The `GainExp` action and `ExperienceHelper.GetDialogXp`, through `DCtoCRTable`
    `674a4e0eb86cc89478119de258f602a5` and `DialogXPTable` `6e37dcecb2f9450dab1d6ca4e8667bcb`. The dialog award
    falls back to the loaded area's CR.
  - **Optional content.** Exploration, traps, locks and side quests.

  Turning grants into "the highest level reachable by rank R" would take the whole story graph, every scene's
  encounters, and an assumption about how much optional content the player does. None of that is in the dump. It is
  inherently an estimate, and the designers' estimate is the `MythicsSettings` table.

**Caveat for "earliest".** In the game the table is a floor only while XP allows it: the restriction lifts as soon
as no character level-up is available. A player with very little XP could in principle reach a rank below its table
level. The planner's settled rule ("a rank at the table's level or later", map Notes) is a planning choice built on the
game's table, not something the game enforces in normal play. Say so where the UI or MCP explains the rule.

## Where the Rust planner's table came from

- **Data:** `~/code/wotr-planner/libs/game-data/progression.ron`, `Progression.mythic_ascensions`, holds rank to
  character level as 1→6, 2→7, 3→9, 4→11, 5→14, 6→15, 7→16, 8→17, 9→17, 10→19. `libs/game-data/README.md` describes it
  as the earliest level for each rank. A Build may take a rank later (ticket 171).
- **Glossary:** `GLOSSARY.md` "Rank level" gives the same values and calls them "the rank table's level".
- **Provenance:**
  - Ticket `10-extract-guide.md` lists the table under "Facts the user gave go straight into `progression.ron`". It
    came from the user, not from the extractor.
  - `research/guide-anatomy.md` (gap 5) notes that the community guide's `mythic-paths#mythic-rank` section gives only
    approximate levels, and that ranks are story events.
  - Ticket `04-progression-model.md` (Q10) fixed the table.
  - Ticket `20-handfix-mythic.md` lists the "ascension table 6/7/9/11/14/15/16/17×2/19" as part of its hand-fix scope.
  - Ticket 171 changed each table level from a fixed level to an earliest one.
- **No game citation:** `research/tests-from-the-game-242-half-a.md` (row for `gold.rs:697`) records "MR 10's table
  level is 19" as "not a game fact": it says the blueprints have no table from rank to level. That was a miss. The
  Rust repo never references `MythicsSettings` or its GUID. The values match the game's table exactly, so the user's
  figures were right. The game now gives the citation.

## For the TypeScript planner

- Read the rank table from `MythicsSettings` `3b8a6729da1e13a4e8e606e9f0fa38d8`, field `CharcaterLevelRestrictions`,
  indexes 1 to 10, in the import. Cite `BlueprintMythicsSettings.GetCharacterLevelRestriction` and
  `RespecWindowVM.UpdateProperties` for its meaning. This closes the map's "Rank-level table upkeep" item: there is
  no hand-kept table.
- Nothing in the dump covers Legend. Legend takes no further ranks, and its cap and switch rules come from elsewhere.
