# Save files as an oracle for the walk

Research for ticket 18 (`issues/18-save-files-as-an-oracle.md`), 2026-11-20. Behaviour: WrathDecompiled (`decompiled/Assembly-CSharp`), cited by file and member. Evidence: the 22 `.zks` saves already on this machine, inspected read-only with throwaway scripts in the session scratchpad. Nothing from a save is reproduced here beyond field names, blueprint GUIDs the game itself defines, and counts. No save is copied into the repo.

## Answer in brief

- **Yes: a save is plain JSON in a plain ZIP, and it records the main character as the game applied it.** It holds the race, class levels, archetypes, every held fact with rank, source and source level, every selection by level, the Mythic classes, and the ability scores. A Node reader needs a ZIP library, a BOM-tolerant JSON parse and a resolver for `$id`/`$ref`. It needs no game code.
- **Blueprints are named by GUID** (32 lowercase hex, no dashes). In one 30-level save, 127 of 128 held features have a blueprint in `data/`, and so do the race, class and archetype. The one miss is a DLC feature the importer left out, so the oracle also does what ticket 18 hoped: it finds what the allowlist dropped.
- **A save shows the end state, not the order of choices inside a level.** The game applied it, but "applied" is not "allowed": cheats, mods and old game versions can write states the rules forbid.
- **This machine has 22 saves** (macOS path below), covering 8 base classes, several archetypes and three Mythic paths. That is enough to start without collecting more.
- **Recommendation:** use saves as a second acceptance suite beside the two gold builds, checking the walk on *facts and picks*, not on order. Details in "Recommendation".

## The container

- **A `.zks` is a ZIP.** `ZipSaver` (`EntitySystem/Persistence/ZipSaver.cs`) wraps Ionic.Zip. Each entry is `<name>.json` read as text, or raw bytes. No other compression or encryption. `SaveManager.PrepareSave` always picks the zip form; `FolderSaver` (the same entries as loose files) is still read by `LoadFolderSave`, and `.zip` is listed only in development builds (`UpdateSaveListTask`).
- **Entries**, from `SaveManager.SerializeAndSaveThread` and `ThreadedGameLoader.CreateStateData`:
  - `header.json`: a `SaveInfo` (save name, `Type` of Auto, Quick, Manual or IronMan, `Campaign` GUID, `Area`, play time, `CompatibilityVersion`, a `Versions` list). `header.png` is the screenshot.
  - `player.json`: the `Player` object.
  - `party.json`: the cross-scene `SceneEntitiesState`, which holds the party's units.
  - `<areaGuid>.json` and `<areaGuid><scene>.json`: per-area state, plus `.fog` masks.
  - `tbm.json` (turn-based combat; `null` outside it), `history`, and a debug `checksums`.
- **Parsing quirks, all observed:** the JSON files start with a UTF-8 BOM (Python's plain `json.load` fails on it; Node's `JSON.parse` does too unless the BOM is stripped). Files are large (`player.json` ~0.8 MB, `party.json` ~0.2 MB in a level-2 save).

## How the JSON is written

Settings are in `DefaultJsonSettings.DefaultSettings` (`EntitySystem/Persistence/JsonUtility`).

- **Opt-in members.** `OptInContractResolver` means only `[JsonProperty]` members are saved. Fields that can be recomputed are absent.
- **Type tags.** `TypeNameHandling.Auto`: an object whose runtime type differs from the declared one carries `$type` (for example `Kingmaker.EntitySystem.Entities.UnitEntityData, Assembly-CSharp`). Facts carry it, so `Feature`, `Buff`, `Ability` and `MainUnitFact` can be told apart.
- **Shared references.** `PreserveReferencesHandling.Objects`: the first occurrence of an object has `$id`, later ones are `{"$ref": "<id>"}`. In one save, 54 of the 90 entries of the unit's fact list were `$ref`s to objects defined earlier in the file. **A reader must resolve `$ref` file-wide; reading the fact list alone loses most of it.**
- **Blueprints are bare GUID strings.** `BlueprintConverter` writes the asset GUID, or the string `"null"`, and on load throws if the blueprint is missing. This is the cross-reference to our `data/` and to the dump. (`BlueprintRefConverter` and `BlueprintGuidConverter` also exist for reference-wrapper types; not read in depth, since every race, class, archetype, selection, feature and source met in the saves was a bare 32-hex string.)
- **Entity ids are a different namespace**: units and facts have a dashed-GUID `UniqueId` (`EntityRefConverter`), not a blueprint GUID.
- **Dictionaries** (`DictionaryConverter`): a key of string, int or enum type gives a JSON object; any other key type (so every blueprint-keyed map) gives an array of `{Key, Value}` pairs.
- **Defaults are omitted** on members marked `DefaultValueHandling.Ignore`: `Rank` of 1, `SourceLevel` 0, empty `Archetypes`, `MythicExperience` 0, `m_BaseValue` 0. **A missing key means the default, not "unknown".**

## Finding the main character

- `player.json` → `m_MainCharacter` is a unit `UniqueId` string (`Player.cs`).
- That unit is an element of `party.json` → `m_EntityData` (checked in all 22 local saves; a type tag `UnitEntityData` and the matching `UniqueId`).
- Header `Campaign` says which campaign the save is from. In a DLC campaign the main character is that campaign's protagonist, so filter on `Campaign` before treating the unit as a Wrath build.

## What the unit holds

Path: unit → `Descriptor` (`UnitDescriptor`) → `Progression` (`UnitProgressionData`, `UnitLogic/UnitProgressionData.cs`). Keys observed, with the matching saved members:

| Wanted | Where | Notes |
| --- | --- | --- |
| Race | `Progression.m_Race` | Blueprint GUID. |
| Class levels | `Progression.Classes[]` → `CharacterClass`, `Level`, `Archetypes` (list of GUIDs, absent when empty) | Mythic classes are in the same list, including the Mythic Hero starting class. |
| Class order | `Progression.m_ClassesOrder` | One class GUID per character level taken, in the order taken, Mythic included (30 entries for a 20+10 character). **The only chronology a save keeps.** |
| Progressions | `Progression.m_Progressions[]` → `Key` (progression GUID), `Value` → `Level`, `Archetypes` | Array of pairs. |
| Selections (the picks) | `Progression.m_Selections[]` → `Key` (selection GUID), `Value` → `Source.Blueprint`, `m_SelectionsByLevel` | Object keyed by level (as a string), each value a list of chosen feature GUIDs. Level 0 is used for the race. For Mythic selections the source is a Mythic class or progression (`FeatureSelectionData.MythicSource`). |
| XP | `Progression.Experience`, `MythicExperience` | `MythicExperience` omitted when 0. Mythic rank is `MythicExperience` or the sum of Mythic class levels. |
| Held facts | unit `Facts.m_Facts[]` (an `EntityFactsManager` list) | Entries typed `Feature`, `Buff`, `Ability`, `MainUnitFact`, many as `$ref`. |
| Ability scores | `Descriptor.Stats.Strength` … `Charisma` → `m_BaseValue`, `PermanentValue`, `PersistentModifierList[]` (`ModDescriptor`, `ModValue`, `Source`) | In one save: base 20, a +2 modifier of descriptor Racial, permanent value 22. |
| Equipment | `Descriptor.Body` (slot keys: Armor, Belt, Feet, Glasses, Gloves, Head, Neck, Ring1, Ring2, Shirt, Shoulders …), `m_Inventory` | Slot names read; items not examined here. |
| Alignment | `Descriptor.Alignment` | Not needed for the walk but present. |

**A held `Feature`** (`UnitLogic/Feature.cs`, `EntityFact.cs`) saves: `Blueprint`, `Source` (a blueprint GUID: a progression, race, class, archetype or another feature), `SourceLevel`, `Rank`, `m_RankToSource` (a list of `{Blueprint, Level}`, one per rank, written only for features with more than one rank), `Param`, `IsTemporary`, `IgnorePrerequisites`, `DisabledBecauseOfPrerequisites`, plus runtime state (`AttachTime`, `UniqueId`, `m_Context`, `Components`).

- **Rank, source and level per rank are real.** In a level-20 save, a multi-rank feature listed five sources, one per rank, each at the class level that granted it.
- **`Param` carries the pick's parameter.** `FeatureParam` (`Blueprint/Classes/Selection/FeatureParam.cs`) saves at most one of `WeaponCategory`, `SpellSchool`, `StatType` or a `Blueprint`. In the local saves it is a weapon category, for the weapon-focus-style feats.
- **Source covers most but not all facts.** 114 of 128 held features in one save had a `Source`; the other 14 had none (granted by units, items or scripts, or the unit's own blueprint). They need a filter before comparing.

## Mythic

- The Mythic Hero class (`MythicStartingClass`) is a class entry of its own with level 1 or 2, next to the path class. A finished 10-rank character in these saves is Mythic Hero 2 plus a path class at 8; the path (a Trickster class, a Lich class, …) is the Mythic class that is not the starting class, as `UnitProgressionData.GetCurrentMythicClass` computes it.
- **Higher-tier paths rewrite history.** `AddClassLevel` / `ReplaceAllMythicLevelsWithMythicHeroLevels` convert earlier Mythic levels into Mythic Hero levels (keeping the feats and abilities) when a "higher mythic" class is taken. The save holds the result, so a **path switch is visible only as its outcome**, never as a switch event. Relevant to map ticket 31.
- Mythic feat and ability picks are ordinary `m_Selections` whose `Source` is a Mythic class or progression, keyed by Mythic level.

## What a save cannot show

- **The order of choices inside a level.** Selections are keyed by level and then a list per selection blueprint; there is no timeline across selections. The fact list's order is the list order of `EntityFactsManager` (not checked as a timeline), and `AttachTime` is a game-clock stamp and not usable: in a level-20+Mythic save, 114 features had **2** distinct values. `m_ClassesOrder` gives class order between levels only.
- **Alternatives not taken, reversals and respecs.** Only the final state is saved. `RespecsUsed` (in `player.json`) is a count. `m_LevelPlans` was empty in every local save.
- **Hit points rolled, skills spent, and anything runtime.** Not part of this oracle (HP and skills were not inspected).
- **Whether the state was legal.** A save is what was applied. Cheat tools, mods (a Toybox-style mod writes states directly), and older game versions all produce states the current rules would refuse. The load path itself repairs some: `ApplyPostLoadFixes`, `TryRestoreClassFeatures`, `TryRestoreSelectedFeatures` and the player upgraders (`AppliedPlayerUpgraders`, `JsonUpgradeSystem`) run on load, so a file written by an old build can lack features the current game would add. Both mean a mismatch is a lead, not a verdict.
- **Provenance is not recorded.** Among the local saves, characters reach level 20 plus Mythic 10 within hours of level-1 saves (file times 2026-07-10 to 07-12). That suggests a level-up cheat or mod was involved; the user should say which saves are clean before they become fixtures.

## Where saves live

- **macOS:** `~/Library/Application Support/Owlcat Games/Pathfinder Wrath Of The Righteous/Saved Games` (`ApplicationPaths.Init`, `SaveManager.SaveFolderName`). **This machine has 22 saves there**: `Auto_1..14`, `IronMan_1..4`, `Quick_1..4`, and a `steam_autocloud.vdf` (Steam Cloud). `Manual_<n>_<name>.zks` is the pattern for manual saves.
- **Windows:** not in the decompiled code (it uses the engine's persistent data path). A web search gave `%appdata%\..\LocalLow\Owlcat Games\Pathfinder Wrath Of The Righteous\Saved Games` (`%USERPROFILE%\AppData\LocalLow`); from one search result only, so check it on a Windows machine before relying on it. Steam Cloud keeps a copy (`SteamSavesReplicator`).
- **Community tools** exist and prove readability, but I did not read their code: `fmonniot/pathfinder-wotr-editor` (a save editor that takes a `.zks` path) and the Arcemi WotR save editor (Nexus Mods and GamePressure), both from search results only. Our own reading above is from the game's code and from real files, so we need none of them.

## What a Node/TypeScript reader needs

1. **Unzip.** Any ZIP reader (the entries are DEFLATE-compressed, no password). Read three entries: `header.json`, `player.json`, `party.json`.
2. **Parse** with the BOM stripped, then **resolve `$ref`** by building an id table over the whole parsed tree (first occurrence defines it). Parse `party.json` and resolve inside it; the unit's facts refer to objects there.
3. **Select** the unit whose `UniqueId` equals `player.m_MainCharacter`. Reject saves whose `header.Campaign` is not the Wrath campaign if the walk covers only that.
4. **Normalise** into a small shape: `race`, `classes[{class, level, archetypes}]`, `classOrder[]`, `selections[{selection, source, level, picks[]}]`, `facts[{blueprint, source, sourceLevel, rank, rankSources[], param}]` and `abilityScores` (base and permanent). Apply the omitted-default rules. Treat `"null"` as null.
5. **Map blueprint GUIDs to our data** by the 32-hex id (`data/` file names carry it), and report misses separately (below).

No game code, Unity or C# runtime is needed. It must be a dev-only tool: ADR 0006's copyright line keeps game content out of the repo, so saves and anything derived with game text stay local and git-ignored.

## Recommendation

**Yes: add saves as acceptance tests, as a second gold suite next to the two write-ups, checked at three strengths.**

1. **Held-fact and pick equivalence (the headline test).** Load a save, rebuild a Build from the save's choices (race, class order, archetypes, each level's picks, ability scores) and run the walk. Assert that the walk accepts it, and that its derived facts equal the save's held features (blueprint, rank, source level). Skip order inside a level; compare as sets per level. This catches the same class of bug as the gold builds, with real data.
2. **Allowlist and coverage report.** For every held feature in a save, check that its blueprint is in `data/`. In the one save checked, the single miss was a DLC-neutral feature. This is the cheap check ADR 0005's allowlist wanted. It is a report, not a failure, unless a miss is reachable by a walk.
3. **Cross-save diff.** Several saves from one run (here, a level-4 and a level-20 save of one character) give a monotone check: the later save must hold at least the earlier one's facts.

**Which saves.** Local saves already cover, by game name: Skald (Provocateur), Magus (Bladebound) with the Trickster path, Fighter (Mutation Warrior) with the Trickster path, Arcanist (Brown-Fur Transmuter) with the Lich path, Sorcerer (Sylvan), Monk (Drunken Master), Shaman, Bloodrager (Primalist), Witch (Ley Line Guardian) with the Mythic Hero levels and a Winter Witch level (a multiclass), and the races Human, Half-Elf and Aasimar. Start with these six, preferring one finished 20+Mythic-10 save per path: the Fighter+Trickster, Magus+Trickster and Arcanist+Lich saves, the Witch multiclass save, the level-5 Skald with a Mythic Hero level, and one level-1 or level-2 save as the cheapest smoke test. Skip duplicates (several are the same character a level apart).

**How to hold them.**
- Keep saves **out of git** (CLAUDE.md copyright boundary, and ticket 18's "no save files are committed"). The test reads a local, git-ignored `saves/` directory (or an env var) and **skips with a clear message when it is absent**, like the `decompiled/` and `blueprints/` dependence already there.
- Commit only a **derived fixture** per save: the normalised, game-text-free summary (GUIDs, ranks, levels). That is allowed by the same reasoning as the data files, and CI can run it without the saves. Confirm with the user that GUID-only summaries are inside ADR 0006.
- Ask the user to **label provenance** for each save (clean play, or edited). Where it is unknown, run it as "report only", never as a failing test.
- To collect more across classes and paths, the user can play or load a character, make a manual save at the end of each interesting level (Manual saves do not roll over like Auto/Quick), and copy the `.zks` from the folder above. On Windows use the LocalLow path; Steam Cloud also keeps a copy.

**What it does not replace.** Order-of-choices legality (the walk's per-step "was this pick allowed here") is outside what saves can show; the gold write-ups and unit tests remain the check for that.

## Open points for the user

- Which local saves came from clean play? The jump to level 20 and Mythic 10 within hours points to a cheat or mod for some.
- Are GUID-only derived fixtures acceptable under ADR 0006?
- Windows save path: confirm on a Windows machine (single-source).

## Sources

- `decompiled/Assembly-CSharp/Kingmaker/EntitySystem/Persistence/`: `SaveManager.cs` (`SavePath`, `UpdateSaveListTask`, `PrepareSave`, `SerializeAndSaveThread`, `LoadRoutine`), `ZipSaver.cs`, `ThreadedGameLoader.cs` (`DoLoad`, `CreateStateData`), `JsonUtility/DefaultJsonSettings.cs`, `BlueprintConverter.cs`, `DictionaryConverter.cs`, `EntityRefConverter.cs`, `UnitStripConverter.cs`.
- `decompiled/Assembly-CSharp/Kingmaker/Utility/ApplicationPaths.cs` (`Init`).
- `decompiled/Assembly-CSharp/Kingmaker/UnitLogic/`: `UnitProgressionData.cs`, `ClassData.cs`, `ProgressionData.cs`, `FeatureSelectionData.cs`, `Feature.cs`, `FeatureSource.cs`, `UnitDescriptor.cs`; `Blueprints/Classes/Selection/FeatureParam.cs`; `EntitySystem/EntityFact.cs`, `EntityFactsManager.cs`, `SceneEntitiesState.cs`, `Stats/CharacterStats.cs`, `Stats/ModifiableValue.cs`; `Player.cs` (`m_MainCharacter`).
- Local saves in the macOS folder above (22 files, read only).
- Web search results, not read in depth: the `pathfinder-wotr-editor` repository, Arcemi WotR Save Editor pages (Nexus Mods, GamePressure).
