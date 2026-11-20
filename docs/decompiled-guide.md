# Building a Wrath of the Righteous build planner from the game's sources

> **This copy** is the TypeScript planner's version (2026-11-19). It started from the guide kept with the Rust planner (`~/code/wotr-planner/.scratch/wotr-planner/research/decompiled-guide.md`, which is left unchanged). Sections 3 to 6 are rewritten for the game-shaped, allowlist-driven importer (ADRs 0004, 0005), and section 7 follows this repo's decisions where they differ (ADR 0003, the wayfinder map in `.scratch/wotr-planner/map.md`).

You are writing a build planner for Pathfinder: Wrath of the Righteous at patch 2.7.0x, in TypeScript or any language you choose. A **Build** is a character's choices from creation to level 20 (40 on Legend) and Mythic rank 10: race and subrace, ability scores, each level's class and picks, skill ranks, and the Mythic path with its ranks, feats, abilities and switch. The planner offers only legal choices, says why each closed choice is closed, and shows the resulting sheet.

This guide gives you the game's model, the data shape and modules to build, the order of work, how to check your work against the game, and a reference for each Build-creation area. Read sections 1–3 before writing code. Sections 4–6 are your plan. Section 7 is reference: consult it area by area as you build.

## 1. Purpose and sources

Two sources, both at patch 2.7.0x, are the whole truth about the rules:

- **`blueprints/`** holds BubblePrintsData release `2.7.0x_0`: every game blueprint as JSON, packed in one `.binz` file. This is the **data**: classes, feats, selections, progressions and prerequisites.
- **`decompiled/`** holds xADDBx/WrathDecompiled at commit `6ce4a6ba6d35039cc73ba16faf70c2d9952a63c2`: the game's C# code. This is the **behaviour**: how the game applies the data.

Both folders sit at the repo root, git-ignored, and are trusted as they are: nothing pins or checks their version. `tools/dump/` reads the dump: `reader.mjs` streams it one blueprint at a time, and `show.mjs` prints blueprints by GUID or name. Code paths below are relative to `decompiled/Assembly-CSharp/Kingmaker/`.

**Reading the dump.** Each blueprint's `$type` is `"<type GUID>, <ClassName>"`, the class's `[TypeId]` attribute (`Blueprints/JsonSystem/GuidClassBinder.cs`). Keys are the C# field names, private ones included (`m_AllFeatures`), and a blueprint carries the fields of its whole class chain. A reference is the string `"!bp_<guid>"` (`JsonSystem/Converters/BlueprintReferenceConverter.cs`). Enums appear by name. A component's `name`, `PrototypeLink` and `m_Overrides` are editor bookkeeping, and `m_DisplayName` and `m_Description` hold localisation keys.

**The copyright boundary.** Describe the game's behaviour in your own words and cite it by file and method with the WrathDecompiled commit. In this repo the description goes in the owning feature's `README.md` and the citation is a `cite` value in its `cites.ts` (`engine/cite`, ADR 0008), never a code comment. Cite a fact from the data by blueprint name and GUID. Write each rule fresh from that understanding, so the repo holds your code, your summaries and your citations, while the game's code, text strings and dump stay in the git-ignored folders. The one exception is display names, which refer to the game's things and are committed (ADR 0006); descriptions never are. The game's mechanics are Open Game Content under Owlcat's OGL notice; carry that notice and its Section 15 credit on the published site.

**What counts as truth.** The game's behaviour as its code applies its data is the rule, including where the code does something other than an item's text says (the Seven Virtues ring works by path). When a community guide and the game differ, model the game, and let summaries borrow the guide's clearer wording where it agrees. Model every DLC and prestige class. Model the rules a player follows, and leave known exploits out.

**Reading the code.** Find a class by file name (`find decompiled -name '<ClassName>.cs'`) and follow a rule from its decision point (`BlueprintFeatureSelection.CanSelect`, `BlueprintFeature.MeetsPrerequisites`, `LevelUpHelper.UpdateProgression`) through its calls. Name each decompiled local (`num`, `flag3`) from what it holds; a nullable bool usually means "no member of this group seen yet". The shell's `grep` is ugrep: keep regexes simple.

## 2. How to think about the game's model

Think in the game's own nouns. Each one below names a concept the planner models one-for-one.

- **Blueprint.** Every game object is a blueprint: a typed record with a `name` and a GUID (`Blueprints/SimpleBlueprint.cs`). The GUID is the identity, and names repeat across blueprints. When several blueprints share a name, identify one by what grants it.
- **Component.** A blueprint carries a list of components (`BlueprintScriptableObject.Components`, base class `Blueprints/BlueprintComponent.cs`). Behaviour lives in components: a prerequisite is a component, and so is a grant (`AddFacts`) or a stat bonus (`AddStatBonus`). Think of a feature as an empty shell whose components say what it does.
- **Fact.** When a character holds a blueprint, it holds a fact of it (`UnitLogic/Feature.cs`, `EntitySystem/EntityFact.cs`). Components act only through a held fact. A character holds each feature blueprint once, with a rank.
- **Rank.** `BlueprintFeature.Ranks` caps how many times a feature can be held. Gaining a feature already held raises its rank (`UnitLogic/FeatureCollection.cs` `AddFact`, `Feature.AddRank`). A feature that improves in steps is granted at each step, so its rank is the step reached. A parametrized feat with a new parameter is a separate fact.
- **Progression and level.** A progression is a feature with level entries (`Blueprints/Classes/BlueprintProgression.cs`, `LevelEntry`). Each has its own level, computed by `CalcLevel` from class levels, archetype levels, offsets and other features' ranks. Classes, bloodlines, mysteries, domains and the character-level feats are all progressions. Every level-up re-evaluates every held progression and grants the entries between its old and new level.
- **Selection and slot.** A selection is a feature that asks for a pick from a list (`Selection/BlueprintFeatureSelection.cs`). Holding one opens a slot. A pick can itself be a selection, which opens a nested slot at the same level. Extra feats are selections, so taking one opens a slot of its list.
- **Prerequisite.** A prerequisite is a component with a group (`All`, `Any`, `ForcedTrue`) and a flag saying whether a progression checks it (`Prerequisites/Prerequisite.cs`). A blueprint's prerequisites are a flat list, and only `PrerequisiteCondition` nests: it holds an And/Or/Not condition tree, which P reads as one leaf (map ticket 20). Negation is a component type of its own (`PrerequisiteNoFeature`, `PrerequisiteNoArchetype`…), never a `Not` node, and a count lives inside its component (`PrerequisiteFeaturesFromList.Amount`). The game combines them in one place for features and one for classes.
- **Level-up order.** A level-up applies its choices in fixed bands (`Actions/LevelUpActionPriority.cs`: race, class, archetype, class mechanics, spellbook, attributes, skills, background, mythic ability, deity, path, features, spells, alignment). Each choice is checked against the character with every earlier choice applied. Within a band the player picks the order, so a pick whose prerequisite another pick of the same band meets is legal in some order.
- **Mythic.** Paths are classes with `IsMythic` whose levels raise the Mythic rank; their progressions grant the Mythic feat and ability selections.

## 3. The data shape to build

**Don't build a model of your own. Keep the game's.** The data is the dump's blueprints in their own shape and with their own field names, filtered down to what the engine reads. There is no planner-friendly model to fill area by area, so there is nothing to drift from the game: a rule is ported from its C# method onto the fields that method reads.

1. **One allowlist decides what is kept** (`tools/importer/allowlist.ts`). Each entry names one `$type`, the fields and components the engine reads from it, a hand-written TypeScript type for them, and a citation: the decompiled file and the method that reads them. It starts with the header fields the code reads (`Ranks`, `Mode`, `IgnorePrerequisites`, `ExceptWhiteListed`, the progression's `m_Classes`, `m_Archetypes`, `AdditionalLevel`, `ForAllOtherClasses`, `AlternateProgressionType`, `GiveFeaturesForPreviousLevels`, `m_FeaturesRankIncrease`, a selection's `m_AllFeatures` and `Group`, an archetype's `AddFeatures` and `RemoveFeatures`) and the components that grant, require or select. It grows by the about 50 component types the Summaries label, and items with their `EquipmentRestriction*` components. Expect it to stay under about 100 types. No types are generated from the C#: the dump shows every field that occurs on a type, enums by name and each reference's real target, so the check in point 8 is stronger than a parser would be.
2. **Key every entry by its blueprint GUID, one file per blueprint,** in a folder by kind, named `<asset name>.<guid>`, because asset names repeat. Two pieces of work then rarely touch one file.
3. **Keep one entry per game object, and hold references exactly as the game does,** as `!bp_<guid>` strings. A feature several classes grant is one entry. Keep a selection's `m_AllFeatures` exactly as the game gives it, because that list decides what a slot accepts.
4. **Compute everything else in code,** the way the game does: how often a pick repeats, which band a pick belongs to (from its selection's `Group`), BAB and saves (from the `BlueprintStatProgression` tables), merged archetype progressions, `CalcLevel`, and caps. These derived views are built when the data loads; they are never stored, so they can't drift.
5. **Find the reachable set by following every reference, and write only what the planner holds.** Start at the root (`Blueprints/Root/ProgressionRoot.cs`: classes, Mythic classes, races, the feats progression) and follow every `!bp_` reference, so grants hidden in any component are found. Write features, classes, archetypes, progressions, selections, races and items, plus the few settings blueprints the rules read (MythicsSettings for the Expected levels). Spells, buffs and units are followed but not written, except what carries a rule a Build depends on: buffs and action trees that grant held features (map ticket 23), the abilities that offer a daily choice (map tickets 24, 26) and the toggles behind Shifter aspects a Build keeps on (ADR 0005, amended). These buffs, abilities and toggles are Grant carriers, and one keep rule decides which are written (build ticket 02d). The importer first holds every reachable one, builds G on that, and keeps:
   - every blueprint kept for its own sake: one G reaches from the root or from the Gear that isn't a carrier, or one a kept field names. A carrier is named only by a strict reference, such as the buff a `BuffExtraEffects` checks, because a field that grants a carrier drops it when it isn't held;
   - every carrier on a grant path from the root or from the Gear to a blueprint kept for its own sake. A path crosses a toggle into its buff only when that buff is kept, because a Build keeps a toggle on only for the `BuffExtraEffects` that checks its buff.

   A kept field drops what isn't kept, so the rule is judged again on the kept set until nothing more goes. G is the only reader of grants here, as everywhere.
6. **Fix the game's data only through overrides,** one cited file per correction in `data/overrides/`, each with its reason: the hand-kept item additions and removals, and any quirk a rule can't live with. Everything else traces to the dump unchanged.
7. **Write deterministically:** sorted keys, fixed formatting and no timestamps. A second run on the same dump writes nothing, and a diff of two data versions shows only real changes.
8. **Check the data against the dump when importing, and against itself when loading.**
   - **When importing:**
     - every allowlisted field occurs on its type;
     - every value matches its declared type;
     - every reference resolves to a blueprint of the expected kind;
     - every prerequisite leaf finds at least one grantor;
     - a report lists each component type on reachable blueprints that the allowlist lacks, so a missed prerequisite or grant type can't pass silently.
   - **When loading:**
     - every GUID resolves;
     - every override has its reason;
     - every prerequisite component is of a type module P reads.
   - The engine takes only checked data.
9. **Carry the game's names, never its other text.** Display names and descriptions are localisation keys. The importer resolves each kept blueprint's English display name into `name`, with template tokens in a neutral form and a qualifier where reachable names collide (ADR 0006). It drops descriptions and every other string, and Summaries are generated in our own words (ADR 0001).
10. **Serve a compact form.** `data/` stays readable. The browser gets one content-hashed document in a compact encoding (defaults dropped, short type ids) made at serve or build time (ADR 0004).

## 4. The modules to build

Each module answers one question. Every other module asks it that question and keeps no copy of the answer. When a second place starts answering the same question, move it into the module.

- **Loader and check.** *Is this data whole?* It reads the files, resolves references and applies the load-time checks above, and it returns checked data for everything else.
- **P, the prerequisite view.** *What does this prerequisite list ask?* Game-shaped data already keeps the game's form: a flat list of components, each in group `All`, `Any` or `ForcedTrue`. They combine by one fixed rule (`BlueprintFeature.MeetsPrerequisites`): every `All` member holds, plus at least one `Any` or `ForcedTrue` member when any exist, and a progression's grant checks only `CheckInProgression` members. So there is no normal form to compute. P is one small read-only view over each blueprint's list (a `PrerequisiteCondition` is one leaf whose named thing is its condition tree, map ticket 20), giving each leaf its group, its polarity (requires or forbids) and the fact, class, stat or level it names. The walk, R, G and the "this enables / this needs" Synergy links all read prerequisites through it, so none of them interprets the 28 component types on its own.
- **G, the grant index.** *Which places grant this fact, and what does this entry grant?* Build one index at load over every kind of grant: progression entries, archetype adds and removes, selection lists, grant components (`AddFacts`, `AddFeatureOnClassLevel`, `AddFeatureIfHasFact`, `AddFeatureOnApply`), race features and Mythic switch grants. Answer every "who grants X" question from it. Who holds a fact in this Build, and what a pick gave, is the walk's record, not a second index (build ticket 03).
- **W, the walk.** *What does this Build hold at each level, and which of its choices fail?* It is one pass over the Build, level by level, in the game's band order: class level, progression updates, slots, picks, skill ranks and ability increases, with Mythic ranks placed at their levels. The walk is the single judge of legality. It records each held fact with its source and level. It can also stop at a slot and judge candidate options there, without changing its state (build ticket 04).
- **S, slots and pickers.** *What can this slot take?* For each slot it lists the options with each one's status, computed by pausing the walk at the slot and judging every candidate there: at the end of the slot's band, with only that slot's pick withdrawn. A picker's answer matches what the walk would say if that option were chosen. S asks W; it never repeats the band order itself.
- **R, the refusal.** *Why can't this pick be taken here, and what would let it in?* One answer per pick at a place: the unmet leaves worded true for this Build (the pick really held, by value, level and rank; only alternatives the Build can still reach), the later choices it would break, and the later level or rank where it opens. Every surface words its text from this answer. Status is behaviour and wording is presentation, so wording changes leave statuses as they were.
- **E, edits.** *Does this edit keep the Build possible?* Every edit goes through one apply function and `allows`, so the Build holds only possible states; removing a choice a later one needs is refused, naming that later choice.
- **C, the link codec.** *Which Build does this link hold?* Every choice in the URL fragment, with stable identifiers and a version; an identifier a link names stays decodable through an alias when its entry changes.
- **I, the importer.** *Which blueprints does the planner hold, and what does the allowlist keep of each?* One generic filter over the reachable set, the allowlist and the overrides (section 3). It has no per-area code: a new field is a new allowlist line and a rerun.
- **A, the allowlist check.** *Does the allowlist keep every field its cited methods read?* For each entry, a test lists the fields the cited C# method reads and asserts each is kept. It is written by hand from the citation, and it is what catches a silently missing field.
- **Deferred:** the Rust planner's guide also describes K and L (a game check and its ledger), N (a narrowing check) and X (expected refusals). A data model that is the game's own has no differences to own, so K and L have little to do here; N and X wait for a reason to exist (ticket 14).

The modules form a stack: P, then G, then W, then S and R, then E, C and the surfaces. The tooling (I, A) reads P and G's static half. Each module reads only those below it.

In this repo each module is one feature folder (ADR 0008): the loader is `engine/load` (over the data model in `engine/data`, with `engine/data-dir` reading files in Node), P `engine/prerequisites`, G `engine/grants`, W `engine/walk`, S `engine/pickers`, R `engine/refusals`, E `engine/edits`, C `engine/codec`, the agent tools `engine/mcp`, I and A `tools/importer`. The stack is enforced: `tools/repo-checks/features.ts` declares which feature may import which, and `bun run check` fails on any other import.

## 5. The order of work

Each step ends when its criterion holds. Move to the next step only then.

1. **Read the game's model.** Read section 2 and the classes it cites. *Done when* you can trace, in the code, how a level-up grants a progression's entries and how a selection decides one pick.
2. **Finish `show`.** `tools/dump/reader.mjs` already streams the `.binz` one record at a time, and `show.mjs` prints a blueprint. Make `show` print each reference as `<name> <guid>`. *Done when* it does so for any GUID. Don't build `refs` or `referrer-tree` up front: the importer computes reachability itself, and G answers "who grants X?" from the imported data, so the dump tools only help debugging. Add `refs` (chunk 33/1 of the file lists each blueprint's referrers) and `referrer-tree` (follow `refs` up to a class, race or progression) the first time step 4 needs to trace a grant chain in the raw dump.
3. **Start the allowlist, the loader and P.** Write the first allowlist entries (a class, its progression, a selection, `PrerequisiteFeature`), the loader and its checks, and the prerequisite view P. *Done when* a small hand-written fixture loads, every check has a failing fixture of its own, and P gives each fixture leaf its group, polarity and named fact.
4. **Write the importer,** the one generic filter of section 3, and grow the allowlist area by area in this order: classes with their tables and progressions, archetypes, races, selections with their lists, hidden grant carriers, prerequisites, Mythic paths, then items. Each area's allowlist entries come with their A tests. *Done when* every blueprint the planner holds has an entry, every reference resolves, the unlisted-component report is reviewed, and a second run writes nothing. Measure the browser document's compressed size here (ADR 0004).
5. **Build G.** *Done when* every prerequisite leaf naming a fact finds at least one grantor. The importer already fails otherwise.
6. **Build the walk.** Start with a single class to level 20, then add archetypes, selections, nested selections, ranks, skill ranks, ability scores, race, Mythic ranks and switches. Bring the two gold builds over as the acceptance test from the start. *Done when* each area's real-data tests (section 6) pass and the gold builds pass, apart from listed gaps.
7. **Build the pickers and R.** *Done when* every picker agrees with the walk on the gold builds at every slot, and every closed option carries a refusal answer.
8. **Build E and C.** E carries the Cascade edit (clear, never move). C is the Rust planner's link format, keyed by hashes of GUIDs. *Done when* the gold builds round-trip through their links unchanged, and every edit `allows` accepts leaves the Build possible.
9. **Wire one check script** that runs the importer's checks, the A tests, the unit tests and the gold builds in a fixed order and stops at the first failure.
10. **Build the surfaces** (web page, agent tools) on R and S. *Done when* each surface's text for a refusal comes from R's answer.

## 6. How to check against the game

- **Check each rule with a test that cites the blueprint or the method.** The expected value comes from the game, cited with the test (a method as a `cite` value on the rule the test exercises, a blueprint by name and GUID in a named constant or the feature's README), and an expectation moves only toward the game: when a test and the engine disagree, fix the engine.
- **Assert game facts rather than counts of your own data:** compare a list against the dump's `m_AllFeatures`, so the test stays valid as the data grows.
- **Keep self-checks:** every picker agrees with the walk, each shortcut agrees with the full computation, and each option's status agrees with `allows` of its edit. For now they run over the two **gold** Builds from real players (Jack-in-the-Green and the Enforcer, from the Rust planner); a generated corpus comes later (ticket 14). Self-checks prove consistency; the game decides correctness.
- **Check against the game itself where possible:** a save file records the character as the game applied it. If saves can be read (ticket 18), a few saves across classes and paths become the strongest check there is, and they also catch fields missing from the allowlist.
- **Prove each form-only change:** record every corpus Build's sheet and every option's status before, compare after, and expect zero differences. A change that moves values attributes every differing line to a row of its change log, against a census predicted beforehand.
- **Carry the owner's gate when an option joins a wider list,** as a prerequisite stated by the game's own blueprint.
- **Run an area's tests while you work** and the full suite once at the end, heavy runs one at a time.
- **Make every exception a cited decision:** each override a file with its reason, and each gold-build gap a listed line naming its ticket.

## 7. Reference for each Build-creation area

### The level-up session

`UnitLogic/Class/LevelUp/LevelUpController.cs` `AddAction` inserts each choice by band; `UpdatePreview` replays them all on a fresh preview (`ApplyLevelUpActions`), dropping any whose `Check` fails. `LevelUpState.cs` holds the counters (`NextCharacterLevel`, `NextClassLevel`, `NextMythicLevel`, open `Selections`, `AttributePoints`, `TotalSkillPoints`). A pick's band comes from its selection's `Group` (`SelectFeature.CalculatePriority`): domains, bloodlines, mysteries, curses, spirits, blessings and schools in Path; Mythic feats and abilities in MythicAbility; most others in Features. Within a band, retry a pick refused for an unmet prerequisite after the band's other picks.

### Race and subrace

- `Blueprints/Classes/BlueprintRace.cs`: a race is a feature, with `m_Features`, `Size` and `SelectableRaceStat`. Its fixed ability modifiers are `AddStatBonus` components with the `Racial` descriptor, and ElfRace adds one more racial modifier through `AddStatBonusIfHasFact`.
- `Actions/SelectRace.cs` `Apply` sets the race (`UnitProgressionData.SetRace`) and grants `m_Features` at level 0 through `LevelUpHelper.AddFeaturesFromProgression`. A subrace is a selection among those features: AasimarRace grants `AasimarHeritageSelection` 67aabcbce8f8ae643a9d08a6ca67cabd. HumanRace's features include a second `BasicFeatSelection`.
- `Actions/SelectRaceStat.cs` adds +2 `Racial` to the chosen ability of a race with `SelectableRaceStat`.
- `SelectRace.Check` closes a race when `BlueprintRace.GetRestrictedByArchetype` finds an archetype the character holds whose `PrerequisiteFeature` names another race.

### Ability scores

- **Point buy** (`UnitLogic/Class/LevelUp/StatsDistribution.cs`): 25 points, or a unit's `StartingStatPointsComponent` (`LevelUpState` constructor). Every score starts at 10 and moves between 7 and 18 at the cost of the class's cost table (`GetAddCost`). `IsComplete` accepts no points left, or one point that no score can take at a cost of 1. The racial modifiers apply on top.
- **Increases:** `Actions/SelectClass.cs` `Apply` grants one attribute point at each non-mythic level where the next character level is a multiple of 4, and `Actions/SpendAttributePoint.cs` adds it to the base score.
- **What ability prerequisites read:** `Prerequisites/PrerequisiteStatValue.cs` `GetStatValue` reads an ability's `PermanentValue`, which is the base score plus racial modifiers plus an item's enhancement bonus, leaving out inherent bonuses (`EntitySystem/Stats/ModifiableValueAttributeStat.cs` `CalculatePermanentValue`, `ModifiableValue.Modifier.IsPermanent`). It applies any `ReplaceStatForPrerequisites` first (`Designers/Mechanics/Facts/`). `Designers/Mechanics/Prerequisites/PrerequisiteFullStatValue.cs` reads the full value.
- **Stat prerequisites keep applying after the pick:** `FeatureCollection.CheckStatPrerequisitesAndUpdate` runs when an ability's permanent value changes, and disables (`DisabledBecauseOfPrerequisites`) any picked feature whose non-`Any` stat prerequisites stop holding, unless the feature came from a slot that waives prerequisites.
- **Stacking**, where it reaches the sheet: `ModifiableValue.ApplyModifiersFiltered` with `Enums/ModifierDescriptorHelper.cs`. Bonuses of the stacking types (untyped, racial, dodge, feat, penalty, focus, natural armour and a few more) all add. For any other type, the largest bonus and the largest penalty count.

### Classes, progressions and the character-level feats

- `Blueprints/Classes/BlueprintCharacterClass.cs` holds the hit die, `SkillPoints`, `ClassSkills`, BAB and save tables (`BlueprintStatProgression`), `m_Progression`, `m_Spellbook`, `m_Archetypes`, `PrestigeClass` and `IsMythic`. `MeetsPrerequisites` caps a class at 20 levels and a prestige class at 10, then combines prerequisites, and a passing `ForcedTrue` suffices on its own there. `Check` lets the first archetype's alignment prerequisite stand in for the class's.
- `BlueprintProgression.CalcLevel`:
  - with no classes and no archetypes, it is the character level;
  - otherwise it is the sum of the listed classes' levels, each with its `AdditionalLevel` and floored at 0, where archetype entries count only for a class taken with that archetype;
  - it adds the ranks of the facts in `m_FeaturesRankIncrease`;
  - `ForAllOtherClasses` or `m_AlternateProgressionClasses` add other classes' levels, halved under `Div2`.
- `Actions/ApplyClassMechanics.cs` `Apply` adds BAB, saves, hit points and class skills, then calls `LevelUpHelper.UpdateProgression` on every held progression. `UpdateProgression` grants the entries between the old and new level, or only the new level's entries unless `GiveFeaturesForPreviousLevels` is set, and only to the class in `m_ExclusiveProgression` when one is named. `AddFeaturesFromProgression` checks only `CheckInProgression` prerequisites, opens a slot for a selection, and recurses into a progression.
- **The character-level feats:** the `UnitProgressionData` constructor gives every character the root's `FeatsProgression`, which is `BasicFeatsProgression` 5b72dd2ca2cb73b49903806ee8986325. It lists no classes, so its level is the character level. It grants `BasicFeatSelection` at every odd level, and `BackgroundsBaseSelection` and `DeitySelection` at level 1.

### Archetypes

`Blueprints/Classes/BlueprintArchetype.cs` holds `AddFeatures` and `RemoveFeatures` (each a list of `LevelEntry`s), `m_ReplaceSpellbook`/`RemoveSpellbook`, replacement BAB and save tables, class skills and `AddSkillPoints`. `UnitLogic/ProgressionData.cs` `CalculateLevelEntries` merges the archetype into the class progression level by level: the removes leave the list and the adds join it. `ProgressionData.CanAddArchetype` allows a second archetype only when at most one of the two changes the spellbook and every one of its removes is still present in the merged list; two archetypes that remove the same feature clash. `BlueprintArchetype.MeetsPrerequisites` checks the archetype's own components.

### Feats and selections

- `Selection/BlueprintFeatureSelection.cs` `CanSelect` takes an item when all of these hold:
  - the item is in `m_AllFeatures`;
  - its prerequisites hold, or are waived;
  - its rank is below `Ranks`, unless the item is itself a selection;
  - `Mode` allows it: `OnlyNew` needs rank 0, `OnlyRankUp` a rank already held;
  - one of its nested choices is still open (`NestedFeatureSelectionUtils`).

  `IsSelectionProhibited` closes the slot when a `NoSelectionIfAlreadyHasFeature` component matches a held fact.
- `Selection/BlueprintParametrizedFeature.cs` `CanSelect` covers a feat taken for a weapon category, spell school, skill or spell. It takes a parameter not yet held, requires the `m_Prerequisite` feat for the same parameter (for spell specialisation, for the spell's school), checks proficiency under `RequireProficiency` and any `IParamPrerequisite`, and checks the parameter feature's prerequisites.
- `Actions/SelectFeature.cs` `Apply` records the pick, adds the fact with its parameter, opens a picked selection as a nested slot at the same level (this is how Extra feats give their extra pick), and runs any progression the pick grants.
- **The waiver rule.** `FeatureSelectionState.IgnorePrerequisites` is a read-only property: true when the slot's selection or any parent slot's selection answers `IsIgnorePrerequisites`. That answer is the blueprint's `IgnorePrerequisites` field, and also, for `BasicFeatSelection` only, the main character's `TricksterIgnoreFeatPrerequisites` flag. LoremasterRogueTalentSelection 4b7018b1ed4b27140a5e7adfacaaf9c6 and LoremasterWizardFeatSelection 689959eef3e972e458b52598dcc2c752 set the field, and so do the Monk and Crusader bonus feat selections and Advanced Weapon Training. A waived slot still checks:
  - membership in its list, the rank cap, `Mode` and nested availability;
  - under `ExceptWhiteListed`, the prerequisites marked `IsFeatureSelectionWhiteList`;
  - proficiency for a parametrized weapon feat.

  `SelectFeature.Apply` copies the waiver onto the fact (`Feature.IgnorePrerequisites`).

### Prerequisites

- **How the groups combine** (`BlueprintFeature.MeetsPrerequisites`): every `All` member holds, and when non-`All` members exist, at least one of them holds; an empty group passes. In a feature, `ForcedTrue` joins the `Any` members. A progression's grant checks only `CheckInProgression` members, and a feature at its `Ranks` fails unless it is a selection.
- **The types**, one file each in `Prerequisites/`: `PrerequisiteFeature` (it fails while the same feature is picked further down the chain, `FeatureSelectionState.IsSelectedInChildren`), `PrerequisiteFeaturesFromList`, `PrerequisiteNoFeature`, `PrerequisiteStatValue`, `PrerequisiteClassLevel` (plus levels a `ClassLevelsForPrerequisites` lends), `PrerequisiteArchetypeLevel`, `PrerequisiteNoClassLevel`, `PrerequisiteNoArchetype`, `PrerequisiteCharacterLevel`, `PrerequisiteMythicLevel`, `PrerequisiteAlignment`, `PrerequisiteCasterType`, `PrerequisiteCasterTypeSpellLevel`, `PrerequisiteClassSpellLevel`, `PrerequisiteProficiency`, `PrerequisiteNotProficient`, `PrerequisiteParametrizedFeature`, `PrerequisiteSelectionPossible`, `PrerequisiteCondition`.
- `Prerequisites/IgnorePrerequisites.cs` is a scoped flag for scripted companion levels (`AddClassLevels`); the selection field of the same name is the one Builds use.

### Ranks and grants

- **Ranks:** `FeatureCollection.AddFact` and `GetRank`, `Feature.AddRank` and `SetSource`.
- **Grants:** `UnitLogic/FactLogic/AddFacts.cs` (`OnActivate`, `UpdateFacts`) holds its facts while its own fact is held (its `HasDifficultyRequirements` gate follows the game setting). `Designers/Mechanics/Facts/AddFeatureOnClassLevel.cs` `Apply` grants from a class level on (with `m_AdditionalClasses`, `m_Archetypes`), or below it under `BeforeThisLevel`, re-run on every level gained. `AddFeatureIfHasFact` grants while another fact is held; `AddFeatureOnApply` grants once, for good; `RemoveFeatureOnApply` removes; `UnitLogic/FactLogic/AddParametrizedFeatures.cs` grants a parametrized feat with its parameter. `AddProficiencies`, `AddClassSkill` and `AddMechanicsFeature` give proficiencies, class skills and flags.

### Skill ranks

- **Points** (`Actions/ApplySkillPoints.cs`, `LevelUpHelper.GetTotalSkillPoints`): each non-mythic class level gives its class's `SkillPoints` plus its archetypes' `AddSkillPoints` (`ClassData.CalcSkillPoints`). The Intelligence modifier, read without enhancement, adds half its value per level, rounded up on odd levels and down on even ones. The total is at least one point per level, and handlers such as `AddSkillPointPerCharacterLevel` add more.
- **Spending:** `Actions/SpendSkillPoint.cs`: one point per rank, ranks capped at the character level.
- **Class skill bonus:** `EntitySystem/Stats/ModifiableValueSkill.cs` `CalculateBaseValue` adds 3 to a class skill once it has a rank.

### Mythic paths, ranks, feats, abilities and switches

- **Paths are Mythic classes** (`ProgressionRoot.CharacterMythics`, `BlueprintCharacterClass.IsMythic`). `UnitProgressionData.AddClassLevel` raises `MythicLevel` for a Mythic class and `CharacterLevel` for any other, so the character-level feats follow the character level alone.
- **Ranks:** `UnitProgressionData.CanLevelUpMythic` allows a rank up to 10 while mythic experience is ahead of the rank, and the story grants that experience whatever the character level. MythicsSettings 3b8a6729da1e13a4e8e606e9f0fa38d8 `CharcaterLevelRestrictions` gives a character level for each rank, but the game enforces it only in respec and forced level-ups. So a Build may place each rank at any character level, in rank order, and the table supplies each rank's **Expected level**: the default placement and a hint, never a rule (ADR 0003).
- **The first ranks:** `ObligatoryMythicClassesQueue` (`SetObligatoryMythicClasses`) names the classes the next ranks must take. `LevelUpState.NextObligatoryMythicClass` and `BlueprintCharacterClass.MeetsPrerequisites` enforce it, and `ProgressionRoot.MythicStartingClass` is the class of the ranks before a path. The path is chosen at Mythic rank 3.
- **Mythic feats and abilities** come from the path progressions' level entries. MythicStartingProgression, AngelProgression, AeonProgression, AzataProgression, DemonProgression, LichProgression, TricksterProgression, DevilProgression, GoldenDragonProgression, SwarmThatWalksProgression and MythicCompanionProgression each grant `MythicFeatSelection` and `MythicAbilitySelection`, which `SystemMechanicsRoot` names. A path progression counts its own class's levels (AngelProgression lists `AngelMythicClass`). The selection records for these picks are keyed by Mythic level (`FeatureSelectionData.IsMythic`).
- **Switches** come at rank 8:
  - **Gold Dragon and Swarm That Walks** set `m_IsHigherMythic` (`GoldenDragonClass` daf1235b6217787499c14e4e32142523, `SwarmThatWalksClass` 5295b8e13c2303f4c88bdb3d7760a757). Taking one while holding a path calls `UnitProgressionData.ReplaceAllMythicLevelsWithMythicHeroLevels` (from `AddClassLevel`). That method removes every Mythic level (`RemoveMythicLevel` drops the class level, its features and its selection records), re-adds the recorded Mythic feat and ability picks (`GetMythicSelectionsData`), and refills the rank count with levels of the starting Mythic class (`AddFakeLevel`).
  - **Legend:** `LevelUpController.Commit` turns the stand-in class `ProgressionRoot.MythicLegenFake` into `UnitPartLegendPathSelected`, after which the character takes `LegendClass` 3d420403f3e7340499931324640efe96. Its `LegendFeature` 7f99961610390044391f300c7ef5e0c8 sets `AddMechanicsFeature` `LegendaryHero`, which raises `UnitProgressionData.MaxCharacterLevel` to 40, and a Legend character levels on `LegendXPTable`. `LegendProgression` 905383229aaf79e4b8d7e2d316b68715 grants neither Mythic selection and removes path features through `RemoveFeatureOnApply`, so Legend ends the ascensions.
  - **Devil** and the rest of the Legend switch run through story actions (`Designers/EventConditionActionSystem/Actions/RemoveMythicLevels.cs`, `ReplaceAllMythicLevelsWithMythicHeroLevels.cs`). What each keeps (the user's account of the game): on the Legend switch, the character keeps the choices and Mythic feats taken at Mythic levels 1 and 2, and every Mythic choice and Mythic feat from Mythic level 3 onwards is dropped; on the Devil switch, the character keeps those of Mythic levels 1 to 7. Keep the dropped picks in the Build: they count until the switch. To cite it, read the two story actions above and the switch blueprints' components.
  - **Which paths open** is a story matter (`DialogSystem/Blueprints/BlueprintMythicsSettings.cs`, `MythicClassLockComponent`). Offer every path at its rank.

### Spellbooks, as gates

- `Blueprints/Classes/Spells/BlueprintSpellbook.cs` holds the spells-per-day table, `CastingAttribute`, `Spontaneous`, `IsArcane` and `CasterLevelModifier`.
- `Actions/ApplySpellbook.cs` raises a class's spellbook at each class level, except the levels its `SkipLevelsForSpellProgression` lists. A prestige class advances an existing spellbook through a `BlueprintFeatureReplaceSpellbook` pick.
- In `UnitLogic/Spellbook.cs`, `CasterLevel` is `BaseLevel` plus a mythic share (`GetMythicLevelForCasterLevel`), and `MaxSpellLevel` is the highest level with a non-negative per-day count.
- `PrerequisiteCasterTypeSpellLevel` takes the best `MaxSpellLevel` among the arcane or divine spellbooks (spontaneous only, when asked), counting neither alchemist nor Mythic spellbooks. `PrerequisiteClassSpellLevel` reads one class's spellbook.

### Open questions to settle as you build

- Settled (build ticket 03, map ticket 31): `GetMythicSelectionsData` re-keys each recorded Mythic Feat or Ability pick to the level two after the one before it. That is only the source level the re-added fact records; it changes nothing a Build holds. When the recorded pick is itself a selection (Extra Mythic Ability), the nested pick is re-added in its place, so the outer feat is lost.
