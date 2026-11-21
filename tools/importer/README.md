# The importer (I) and the allowlist check (A)

The importer answers module I's question (guide §4): *which blueprints does the planner hold, and what does the allowlist keep of each?* It reads the game's dump, walks what `ProgressionRoot` reaches, keeps the allowlisted part of every blueprint the planner holds, and writes `data/` and `data/report.md` (guide §3). It has no per-area code: one generic filter runs over the reachable set, the allowlist and the overrides, so a new field is a new allowlist line and a rerun. Module A, the allowlist check, answers the other question: *does the allowlist keep every field its cited methods read?* The tooling reads P and G's static half (`~engine/prerequisites`, `~engine/grants`), so it gives the same answers the engine will.

## Running it

`main.ts` is the command line, run directly by Bun (which strips the types and resolves `~engine` from `tsconfig.json`):

- `bun run import` imports the dump into `data/`. It writes nothing while any import check fails.
- `bun run import -- --check` (`bun tools/importer/main.ts --check`, part of `bun run check`) fails if an import check fails or `data/` differs from a fresh import, and prints "import check passed" when neither does. Without the dump it skips.

The dump is `blueprints/blueprints_raw_2.7.0x_0.binz`, or `DUMP` when set. `SHOWN` (default 40) caps how many problems or differing paths are printed.

The leftover census (`census.ts`) is run as `bun run census [-- <leftovers.tsv>]`, that is `bun tools/importer/census.ts [leftovers.tsv]`; see [The census](#the-census-censusts).

## Public entry

`index.ts` exports `runImport` (the whole pipeline, in memory) and `cites` (this feature's citation registry).

## The pipeline (`import.ts`)

`runImport(dumpPath, overrideFiles)` indexes the dump, walks what `ProgressionRoot` reaches, keeps the allowlisted part of every blueprint the planner holds, and produces `data/`'s files and the report in memory. Writing them is `sync.ts`'s job, so a check run can compare without touching the disk. Each step stops the rest once there are problems; the report is written regardless. The output is `files` (path relative to `data/` → content) and `problems` (failed import checks; the importer writes nothing while there are any).

The overrides are `data/overrides/`'s corrections (guide §3 point 6): `add` writes a blueprint the walk doesn't reach, `remove` drops one it does, `patch` edits the dump's JSON before the filter sees it, and `name` qualifies a shared name.

The steps, in order:

1. **`indexDump`**: one pass over the dump for each blueprint's class name and references (`DumpIndex.types`, `refs`), the walk's start (`roots`: the blueprints `ProgressionRoot`'s fields name, `progressionRootFields`), and `settings`: what the rules read that the walk doesn't hold because only `BlueprintRoot` names it. That is `BlueprintRoot` itself, the Mythic settings (guide §3 point 5) and the unit every main character is made from (map ticket 28).
2. **`reachable`**: every blueprint reachable from the roots by following every reference (guide §3 point 5), ignoring references the dump lacks.
3. **`holdReachable`**: holds every reachable blueprint of an allowlisted type, the settings `BlueprintRoot` names and what overrides add, and sorts out the overrides that remove and patch. Kinds held by their own rule rather than by the walk are never held from the walk (`OWN_RULE_KINDS`): the item kinds (`ITEM_KINDS`: items, when the dump traces them to a source, map ticket 12, and the item types and enchantments a held blueprint names), and units, of which only the one `BlueprintRoot` names is held (map 28). One of those is held only when named, by an override or the root.
4. **`parseWanted`**: parses, once, every blueprint wanted: the held ones (every reachable Grant carrier among them), what the item sourcing reads, and every item type and enchantment. A blueprint's override patch is applied as it is parsed (`Parsed`).
5. **`holdItems`**: holds the sourced items (map ticket 12), applies the hand-kept removals, and holds the types and enchantments held blueprints name (`holdNamed`, through their own references in turn: an item names its type, which names its enchantments; which enchantments stay held is judged after). It fails on a sourced count far from the research's (`checkSourcedCount`), on a natural weapon no override drops (`naturalWeapons`), and on an override that removes or patches a blueprint that isn't held. It returns each sourced item's sources.
6. **`trim`**, the keep rule judged on kept forms: a filter of everything held builds G, and `keptSet` picks what stays. A kept field drops what isn't kept, so the rule is judged again on the kept set's forms until nothing more goes. An enchantment stays only while its kept form says something (a counted stat bonus, a held fact, mithral). These filters only inform the rule, so their problems don't count (`quietContext` records problems but counts nothing): most are on carriers the rule trims, and the last filter, which writes the kept set, records again any that remain. It returns the kept set, or nothing on a load problem.
7. **The written filter** (`makeFilter` with `tallyContext`, which records problems and counts into the `Tally` for the report). `Filter` filters the blueprints it is given into `data/`'s files, judging every reference against the context's `heldKind`, and records what each one's strict references name (`KeepContext.names`). A file is `<kind>/<asset name>.<guid>.json`, so an asset name holding a slash is a problem. The display name is resolved here (`names.ts`), and a template name is written in its neutral form and listed. In `tallyContext`, a dropped reference is counted by its place with the asset name, GUID and list indices cut off: `at` is `<asset name> <guid>.<field>` or `<asset name> <guid>: Components[i] <type>.<field>`.
8. **`writtenProblems`**, the checks that need the kept set's tally: `not-needed.ts` stays exact (each type in it once, unlisted, and carried by some written blueprint), and each allowlisted field occurs on its type in the dump (guide §3 point 8). A field with a default may instead occur on another type that keeps it: it is inherited (a Prerequisite's `IsFeatureSelectionWhiteList`), and some subclasses' JSON always omits it.
9. **The load checks** run on what the importer would write, as does the grantor check below, so `data/` never holds what fails.
10. **Shared names** (map tickets 27, 29 and 30): qualified after names are resolved (`qualifyNames`, `qualifyGear`), name overrides last, then written into `name` (`writeNames`). Gear's twins aren't written: the loader derives them (map ticket 29, guide §3.4). Since twins are derived from display names and the loader sees the written ones, `twinProblems` fails on a written name that would draw two items together, or a twin written apart from the item offered for it: either would change what the pickers offer.
11. **The grantor check** (`checkGrantors`), with `no-grantor.ts` and `unreachable.ts`.
12. **The report** (`report.ts`) goes into `files` as `report.md`.

The `Tally` holds: unlisted component types with the blueprints that carry them; `<type>.<field>` → references dropped because the planner doesn't hold their target; blueprints written by kind; template names with the neutral form written (ADR 0006); and `<type>.<field>` → how many blueprints carried the field and how many took its default. `KeepSummary` is what the keep rule did (ticket 02b): each sourced item's sources before the hand-kept overrides, how many blueprints were held before trimming (every reachable one of an allowlisted type, Grant carriers included), and how many `keptSet` kept.

## The allowlist (`allowlist.ts`)

The allowlist (guide §3 point 1, ADR 0005) lists each `$type` the engine reads, the fields kept of it, and a citation to the decompiled method that reads them. The importer keeps nothing else. Every entry is tied to its TypeScript type in `engine/data/types.ts` (`blueprint<T>`, `component<T>`): its specs must name every field of that type and match each field's type, or it fails to compile.

An entry's `cite` list holds its citations, relative to `decompiled/Assembly-CSharp/Kingmaker/` at WrathDecompiled 6ce4a6b, as `<file> <method> (<the kept fields it reads>)`. Every kept field appears in some citation's list, and the A tests (`allowlist.test.ts`) check that the cited method exists and reads it. Citations of the specs shared between entries (the enums, the structs, the lists) live in `cites.ts`, by the spec's name.

### Entry shape

- `name` (`NameField`): the text field that holds a blueprint's display name, or `null` for a type the game never names.
- `notKept`: fields a cited method reads that the engine doesn't need, each with why. A nested field is named by its path (`Value.ValueShared`). A reason that rests on the data comes with `holds` (see `NotKept` below).
- `awaiting`: fields a cited method reads that the engine needs and no area reads yet, each with the area that will. An entry leaves when its area lands.
- `requiresHeld` (components): reference fields that must name a blueprint the planner holds. A grant of an ability, a buff or nothing (null), or a grant conditioned on an ability or buff, is not one the planner models: the importer drops the component and counts it in the report.
- `keepIf` (components): whether the kept component still says anything; when not, it is dropped and counted (an empty action tree).
- `preFilter` (components): a reason to drop the dump component before it is read (a trigger behind an unmodelled condition), or none.

`notKept` and `awaiting` are what module A asks of an entry besides its kept fields: every field its cited methods read is kept, or listed in one of them. Their reason strings are data, read by the tests and the report.

### Kinds and shared specs

- `FEATURE`: the kinds a `BlueprintFeatureReference` can name, every kept subclass of `BlueprintFeature`. `FACT`: the kinds a `BlueprintUnitFactReference` can name among those the planner holds, the features plus the buffs, abilities and toggles held as Grant carriers.
- The enums `statType`, `modifierDescriptor`, `featureGroup`, `weaponCategory`, `armorProficiencyGroup` and the flags `alignmentMask`, `weaponFighterGroupFlags` list every member of their C# enum; `contextValueType`, `activatableAbilityGroup`, `abilityRankType`, `contextRankProgression` and `spellSchool` mirror theirs too. Each one's C# enum is cited in `cites.ts`.
- `prerequisite`: the fields every prerequisite shares (`Prerequisite`), and `PREREQUISITE` the citation for them (`BlueprintFeature.MeetsPrerequisites`).
- `contextValue`: a ContextValue's type and its constant (`Calculate` returns `Value` for Simple). `rankedContextValue` adds `ValueRank`: a Rank value reads the fact's `ContextRankConfig` of the same `AbilityRankType`. `otherValueTypes(at, fields)` lists, as `notKept` entries under the struct field `at`, the ContextValue fields `Calculate` reads only for a `ValueType` other than Simple and Rank, the two a kept Racial bonus uses (`engine/walk/unit.ts` `contextValue`).
- `unitEvaluator`: the unit a condition looks at; each evaluator's `GetValueInternal` returns it.
- `NOT`: every condition's `Not`, which `ElementsSystem/Condition.cs` `Check` reads around the variant's `CheckCondition`.
- `storyFields`: a story condition keeps only `Not`. The planner treats it as met (map ticket 21), so what it checks isn't kept.
- `condition`: a condition tree (map ticket 20). Each variant keeps the fields its `CheckCondition` reads. `MODELLED_CONDITIONS` is its variants.
- `conditionsChecker`: all (And) or any (Or) of its conditions.
- `unmodelledCondition`: the first condition type in a dump ConditionsChecker that the condition spec doesn't model (a shared value, the difficulty), looking inside `OrAndLogic`. A grant behind one is dropped and counted, so the report shows what the walk can't see.
- `levelEntries`: a list of `LevelEntry`, the features granted (or, in `RemoveFeatures`, removed) at a level.

### Grant actions

- `grantActionVariants`: the actions G counts as grants (`actionGrant`), each with the kept fields its `RunAction` reads. `grantAction` keeps each by its variant.
- `conditionalVariant`: `Conditional`, the one action a grant list keeps around grants: its branches, run by its conditions.
- `grantActions`: an action list holding only grants (map ticket 23): `Conditional` and the actions G counts as grants, of a blueprint the planner holds. Every other action, a grant of something the planner doesn't hold, and a Conditional left with no grants are dropped and counted. A grant action is dropped when what it grants isn't held, so it names nothing (`KeepContext.names`): it is kept under a context without `names` (`grantCtx`). A Conditional's branches are kept first: one whose branches grant nothing is dropped with its conditions unread, and one on an unmodelled condition is dropped and counted.

### Items

`itemEntries` holds items (map ticket 12) and what ticket 03's Gear checks read: each item's place, its weapon or armour type, its restrictions, and the enchantments that give a stat bonus counted toward prerequisites (ADR 0002) or a fact.

- `enchantments`: an item's own enchantments; only those the planner holds (they carry a kept component) are kept.
- `worn(type)`: a worn item, whose place is its `$type` and whose enchantments are its own. `WORN_SLOT` is the slot's citation; an item's own enchantments are read with its type's (`BlueprintItem.CollectEnchantments`, in `cites.ts`).
- `ARMOR_TYPE_FIELDS` and `ARMOR_TYPE_CITE`: what the armour and shield types share, including the enchantment list the weapon and armour types each hold (`Enchantments`).
- `WeaponEnhancementBonus` and `ArmorEnhancementBonus`: an item's enhancement bonus (map ticket 29's rule 3, as amended by build ticket 02g). Gear names tell items of one name apart by it, as Finnean's stages (+1, +3, +5).
- `notEnhancement`: drops an item stat bonus that never counts toward a prerequisite. Only `Enhancement` is permanent (ADR 0002).

### Entry notes

- `BlueprintBuff.Stacking` keeps every `StackingType` but `Rank`: a buff stacking by Rank raises its rank (`Buff.AddRank`) up to its Ranks, which no kept buff needs, so a kept Rank buff fails the import.
- `AddFeatureOnClassLevel.m_Class`: null means the character level (`ReplaceCasterLevelOfAbility.CalculateClassLevel`).
- `AddFeatureOnAlignment`: most grant only buffs and toggles the planner doesn't hold; with none left, the component grants nothing and is dropped (`keepIf`). `AddFeatureOnSkill` is dropped the same way when no held fact is left.
- `FactSinglify`: most only swap abilities the planner doesn't hold; with nothing left, the component says nothing and is dropped.
- Ticket 03's areas: `AddClassSkill` through `AddBackgroundArmorProficiency` are the class skills, skill points and proficiencies areas; `IncreaseActivatableAbilityGroupSize` is the aspects kept on (map 32), how many toggles of a group can be on at once; `AddSpellbookLevel`, `SkipLevelsForSpellProgression` and `IsAlchemistSpellbook` are the spellbook area, spellbooks as prerequisite gates; `AddContextStatBonus`, `ContextRankConfig` and `ReplaceStatBaseAttribute` are the ability-score area, the Racial bonuses a stat prerequisite counts.
- `AddAbilityResources` and `BlueprintAbilityResource` (kind `resources`): a fact's pool of uses per day and the pool's size formula, kept for the Summaries. The resource keeps exactly what `GetMaxAmount` and `ApplyMinMax` read (`m_MaxAmount`, `m_Min`, `m_UseMax`, `m_Max`, `IsDomainAbility`); its class and archetype lists may hold nulls, which the game counts as nothing. A resource has no display name kept, so it is never shown. `RestoreAmount` (whether the pool starts full) isn't kept.
- `BuffExtraEffects.m_CheckedBuffList`: map 32 (amended) keeps it like `m_CheckedBuff`, but every component that sets it is dropped, because its extra buff grants nothing a Build holds (`requiresHeld`), as for ShapeshiftersHelmEnchantment and the cantrip features. Its `holds` fails the import if a kept component ever sets it, so it is allowlisted then.

### Fields the dump may omit

A field wrapped in `orDefault` is one some JSON omits; its C# field has no initializer, so the game loads the type's default, and the importer writes that. The report's "Defaults filled" counts them. They are:

- every prerequisite's `IsFeatureSelectionWhiteList` (many prerequisites omit it; false);
- `rankedContextValue`'s `ValueRank` (older components; Default);
- `UnitClass`'s `LimitMaxLevel` and `MaxLevel` (some conditions; false and no evaluator);
- `ContextConditionIsWeaponEquipped`'s `JustCheckEmptyHand`, `BothHandsAreEmpty`, `CheckSlot` and `Slot` (older conditions; false and PrimaryHand);
- `ContextActionAddFeature`'s `m_SetRankFrom` (older actions; null);
- `BlueprintCharacterClass`'s `DontAddCasterLevels` and `m_IsHigherMythic` (some classes; false);
- `BlueprintFeatureSelection`'s `ExceptWhiteListed` (some selections; false);
- `BlueprintParametrizedFeature`'s `IgnoreParameterFeaturePrerequisites` (some feats; false);
- `AddContextStatBonus`'s `HasMinimal` and `Minimal` (older components; false and 0);
- `ReplaceStatBaseAttribute`'s `ReplaceIfHigher` (some components; false);
- `PrerequisiteFeaturesFromList`'s `m_RestrictIfNot` (many lists; false);
- `PrerequisiteClassLevel`'s `Not` (many components; false);
- `PrerequisiteAlignment`'s `IngorePrerequisiteCheck` and `ArchetypeAlignment` (some components; false);
- `BuffExtraEffects`'s `m_ExceptionFact` (PrimalistRagePowersFeature's component omits it; none);
- `MonkNoArmorAndMonkWeaponFeatureUnlock`'s `m_BowWeaponTypes` (only the Zen Archer's components set it; no types);
- `HasArmorFeatureUnlock`'s `FilterByBlueprintArmorTypes`, `FilterByArmorProficiencyGroup`, `m_ArmorProficiencyGroupEntries` and `m_DisableWhenHasShield` (some components; false and 0, no flag), and its `m_BlueprintArmorTypes` (some components; no types). A null entry in `m_BlueprintArmorTypes` matches no armour.

## Field specs (`spec.ts`)

A spec is how the importer checks and keeps one allowlisted field (guide §3 point 8, "When importing"). Each spec checks a dump value against its declared type and returns the kept value. A reference spec also names the kinds of blueprint it may point to, and the importer fails when the target isn't one the planner holds of that kind. `Spec<T>` is invariant in `T` (through `_type`, a phantom member that is never set), so an allowlist entry's specs must match its hand-written TypeScript type exactly.

`Spec` members: `describe`, the declared type for messages; `keep`, which checks a dump value and returns what is kept of it (`at` names the value's place, for messages); `absent`, the value the game gives the field when a blueprint's JSON omits it (the C# field initializer); `struct`, a struct's kept fields (for a list or a nullable value, its item's), which module A reads to check the nested fields a cited method reads; `variants`, a polymorphic value's variants by class name (for a list or a nullable value, its item's), which module A checks against their own cited methods as it checks an entry's. `AnySpec` is a spec with its value type erased, as entries store them once their types are checked.

`KeepContext` is what a spec reports to: `problems` (the importer fails when any are recorded); `heldKind`, the kind of a blueprint the importer writes, or nothing when it doesn't write it; `dumpType`, the dump's class name of any blueprint, for messages; `dropped`, which counts a reference a `heldRefs` list drops because the planner doesn't hold its target; `droppedPart`, which counts a part of the dump the allowlist leaves out on purpose (an action that grants nothing), by label; `seen`, which records whether a blueprint or component of a type carried an allowlisted field; and `names`, which records a reference the kept value can't drop: a strict `ref` or `refOrNull`, whose target must be held. The keep rule keeps what these name. A reference that is dropped when its target isn't held (a `heldRefs` list, a component's `requiresHeld` field, a grant action) doesn't name its target, so it is not recorded.

The specs:

- `shortType`: the class name in a dump `$type` (`"<type GUID>, <ClassName>"`).
- `int`, `num`, `bool`, `str`: primitives.
- `orDefault(spec, value)`: a field some blueprints' JSON omits, so the game loads it with its C# initializer. The importer writes that value, and the field must still occur on at least one blueprint of its type.
- `enumOf`: a C# enum the engine switches on, by member name; only the listed members are accepted.
- `flagsOf`: a C# `[Flags]` enum. The dump writes its member names joined by `, ` (`"LawfulGood, NeutralGood"`), or the raw bits as a number when no names express them (`-1`, or `0` for an enum without a zero member). It is kept as the game writes it; every name must be a member.
- `ref(...kinds)`: a reference to a blueprint the planner holds, in one of the kinds. `refOrNull`: one the game leaves `null` when unset. `orNull`: any value the game leaves `null` when unset and its code checks for null.
- `heldRefs(...kinds)`: a list of references whose C# type admits blueprints the planner doesn't hold (an `AddFacts` that also grants abilities and buffs). References to blueprints the planner doesn't write are dropped and counted in the report; every other reference must be of one of the kinds.
- `list`, `struct` (a plain nested object, such as a level entry or a class-with-level, with no `$type` of its own), `poly` (a polymorphic nested object such as a condition or an evaluator, chosen by its `$type`; its kept form has the class name as `$type` and the variant's listed fields, and a `$type` with no variant is a problem) and `lazy` (a spec defined later, for recursive shapes: a condition tree holds conditions).
- `keepFields`: keeps the listed fields of a dump object. A field the object omits takes its spec's default, or is a problem. The owner (a blueprint or component type) is reported to `seen`, so the importer can check each field occurs on its type.
- `Variant`: one variant of a polymorphic value (a condition, an evaluator, an action): its kept fields and the decompiled methods that read them, cited as an entry's are, with its own `notKept`.
- `NotKept` and `checkNotKept`: why the engine doesn't need a field a cited method reads. When the reason rests on the data, `holds` states what every kept blueprint's, component's or variant's raw JSON must satisfy for it to stay true; the import fails otherwise.

## The generic filter (`filter.ts`)

`keepBlueprint` is the generic filter (guide §3 points 1 and 3, module I): one dump blueprint in (`RawBlueprint`: GUID, asset name, the dump's class name without its type GUID, and the parsed JSON), its allowlisted fields and components out, in the game's own shape and field names, with `$type`, identity and display name. There is no per-area code here. A component the allowlist doesn't list is counted (`FilterContext.unlisted`, by class name); one its `preFilter` refuses is dropped and counted; one whose `requiresHeld` field names a blueprint the planner doesn't hold, or is null, is dropped and counted (`droppedComponent`), as is one its `keepIf` refuses. A `requiresHeld` field drops the component when its target isn't held, so it names nothing (`KeepContext.names`): the filter keeps the component's fields under a `names` that skips those targets.

## The keep rule (`keep-rule.ts`)

`keptSet` is the keep rule (guide §3 point 5, build tickets 02b, 02d and 02e): which held blueprints the importer writes, judged through G on their kept forms, which `filter.ts` makes. The Grant carriers (`CARRIER_KINDS`: buffs, abilities and toggles; map tickets 23 and 26, ADR 0005) are held only because they pass grants on to held facts, and the rule decides which stay.

A blueprint is kept for its own sake when it isn't a Grant carrier and G reaches it from the root or from the Gear (the sourced items), or when a kept blueprint's kept field names it (a spellbook, a table, a prerequisite's target, an item type), and so on. A Grant carrier is named only by a strict reference (`StrictNames`, what each held blueprint's strict references name, `KeepContext.names`: the buff a `BuffExtraEffects` checks, a toggle's buff), since every other field drops a carrier the planner doesn't hold. A Grant carrier is also kept when it lies on a grant path from the root or the Gear to a blueprint kept for its own sake. A path goes through a toggle into its buff (`ActivatableBuff`) only when that buff is kept: a Build keeps a toggle on only for the `BuffExtraEffects` that checks its buff (a Shifter aspect, ADR 0005). The settings blueprints are named by `BlueprintRoot`.

`reach(start)` follows G's grants from a start, keeping each blueprint reached that isn't a carrier and each carrier that grants something already kept. The main loop also keeps a carrier when it looks at what the carrier grants, which may happen before the carrier is reached (through a toggle whose buff was kept later): each kept blueprint is kept for its own sake or leads to one, so a reached carrier that grants it lies on a grant path to one, and a kept buff a reached toggle applies is reached through it.

## Items (`items.ts`)

The sourced items (map ticket 12) are the equipment blueprints the dump traces to a source in play. The dump records a source as a reference from a container or a giving action to the item; the item itself carries no "obtainable" flag. The method, and every source, is the research's (`.scratch/wotr-planner/research/obtainable-items.md`, "How to redo the count"), which counted 3,397 on this dump (`RESEARCH_COUNT`); `checkSourcedCount` fails the import when the sourced count strays further than `TOLERANCE` from it.

- `EQUIPMENT_TYPES`: weapon, armour, shield and the eleven worn slots, as `kindOf` files them under `items`.
- `HIDDEN_ITEM`: a hidden item (Finnean's base) gives its forms (`ItemPolymorph`) when a source gives it, though it is no equipment; hidden items are dropped at the end.
- `ItemSource`: the research's labels for where an item comes from.
- `SCRIPT_HOLDERS`: the blueprints whose dialogues, quests and DLC rewards give items through a scripted action.
- `COMPANION_GEAR`: a companion's body slots and starting inventory (`BlueprintUnit`), what the companion joins with. Additional limbs are natural weapons, so they are left out. `m_EmptyHandWeapon` is kept, as the research did: the one item it brings in, WeaponEmptyHand 20375b5a0c9243d45966bd72c690ab74, is dropped by its override file, as map ticket 12's hand-kept list says, and `naturalWeapons` holds the import to that.
- `itemSourcing(index)` prepares the sourcing from the dump index: `want`, the blueprints whose JSON `source` reads (items, weapon types, and whatever names an item, a loot table or a unit with items), and which tables something references. `source(json)` walks each wanted blueprint's references once. The companions are the units a `Recruit`, `RecruitInactive` or `ExchangeRecruits` action names (`recruitedCompanions`). The Midnight Isles tables that give at play time (`liveDungeon`) are `BlueprintDungeonRoot.m_Loot`, `DungeonAddLootToVendor` on a unit, and the island rewards a `BlueprintDungeonExpedition` names; the filter lists only drive the editor. Forms and parts count when their parent does: an `ItemPolymorph`'s forms, a double weapon's second end, and a shield's armour half and bash weapon.
- `sourceOf`: the source a reference gives its item from, by the referring blueprint's type, the object around the reference and the field, or none for a reference that doesn't give (a check, a removal, a body weapon, a cutscene, a developer preset or a save migration). `live` says something references the referring blueprint.
- `naturalWeapons`: the held items whose weapon type is natural. They are never Gear, since a natural weapon is never looted (`ItemEntityWeapon.IsLootable`, in `cites.ts`). Map ticket 12 drops each through the hand-kept list, so the import fails on any one no `remove` override drops.

## Display names (`names.ts`)

The importer resolves each kept blueprint's English display name from the dump's strings and writes it as `name` (ADR 0006, map ticket 19). It is the only game text `data/` holds; descriptions are never read here.

- **Written names:** a qualified name is written as `name` ("Allied Spellcaster (feature)"), with the qualifier on its own in `qualifier` ("feature"). S can then show the bare name in a list, and add the qualifier only when two options in that list share it.
- `displayName`: the English text of a localised-string field, or nothing when the blueprint has none.
  - A field holds either its own key (`m_Key`) or a shared string's key (`Shared.stringkey`).
  - Some shared references keep the asset (`Shared.assetguid`) but lose the key. Such a field takes the key that every other reference to the same asset gives.
  - `sharedKeyCollector` gathers those keys in `indexDump`'s pass over the dump. An asset whose references disagree on the key gives none, so nothing is named from a guess.
  - `GoldenDragonClass` is named this way, from `GoldDragonSpellbook`'s reference to the same asset.
- `neutralName`: a display name with the game's runtime template tokens in a neutral form (ADR 0006): `{Name}` (the character's name) and the comma after it go, and a word holding `{mf|<male>|<female>}` is written both ways (`L{mf|ord|ady}` → `Lord/Lady`). It returns nothing for a name with no token, and throws on a token it doesn't know.
- `composedItemName` (`item-names.ts`): the name the game shows for an item whose own display name is empty, ported from the `Name` getters (ADR 0006's note of 2026-11-21, build ticket 12, `cites.ts`):
  - a weapon: each of its own enchantments' prefix and a space, its type's default name, then a space and each enchantment's suffix ("Cold Iron Longsword +1"); when all of those are empty, the type's name;
  - an armour: its type's default name, with no enchantment words ("Chainshirt");
  - a shield: its armour half's name, its own or composed.
  It joins only display strings the game itself joins. 546 items take such a name, so a plain Longsword or Chainshirt is Gear; map 29's twins and qualifiers then tell the composed names apart like any other.

## Shared names (`qualify.ts`, `name-groups.ts`, `shared-names.ts`)

`qualifyNames` (ADR 0006 as amended, map tickets 27, 29 and 30, build tickets 02c and 02f): where blueprints a Build can reach and a player sees share a display name, each is qualified, blueprint by blueprint, from the first source that tells it apart (`nameSources`, in map ticket 27's order):

0. `item`: a feature only Gear gives takes the item that gives it (map ticket 29): "Poison Immunity (Broken Trickster)". Such features (map ticket 29, as amended by ticket 02e) share names with features the root gives, so a sheet or search shows them side by side: they join the groups, qualified by their item.
1. `grantor`: its nearest named grantor that tells it apart, climbing past names the others share: "Arcanist (Wizard Spell)". Only a name that every route from the root to it passes through counts, so the qualifier holds for the blueprint itself: a feature every draconic bloodline grants isn't qualified by one of them.
2. `level`: such a grantor and the level it grants at: "Patron Spells (Winter 2)", or "Ki Arrows (level 5)" when the grantor shares the name.
3. `kind`: a class keeps its plain name beside picks named after it (`classStaysBare`), and another blueprint takes a word for its type ("Outflank (buff)", `kindWords`).
4. `prerequisite`: a prerequisite it requires that the others don't ("Skeletal Barbarian I (Lich 2)").

then map ticket 30's two, for a blueprint several grantors give:

5. `class`: a class's own copy stays bare beside its archetypes' copies ("Favored Enemy"), and a copy only that class and its archetypes give takes the class.
6. `family`: grantors of one family give their common name ("Resist Energy (Draconic Bloodline)").

and last a `"change": "name"` override, our own words with its reason (`override`), then `bare`.

After any source settles some, the rest start again from the first. One blueprint in a group stays bare when every other label is distinct. No label names one grantor among several. Hidden blueprints are never shown (`isShown`), so they join no group and, like nameless ones, name no qualifier. Grantors come from G and prerequisites from P, so a qualifier names only what the engine itself reads; qualifiers are names and our own words, never other game text. Items a Build equips are named by `gear-names.ts`, and items' name overrides are Gear's.

The parts of `qualify.ts`:

- `Qualified`: every group by name; the written name of every qualified blueprint (`<name> (<qualifier>)`); the written names that blueprints a player sees still share, by name, each of which must be a listed exception; and the name overrides that don't apply where steps 1–4 fail, or that collide. A `GroupMember`'s `source` is what settled it, or nothing while it is open; its `qualifier` is written after the name for every source but `bare`. A `NameGroup` is blueprints a Build can reach that share one display name.
- `settleGroup`: one group's labels from sources 0–6, each a step; overrides and the bare name follow. `nearest` keeps a source's qualifiers each at its nearest, leaving out the group's own name. `withLevel` gives a common name as candidates: the name, then the name with its level.
- `classStep` (source 5): a class's own copy stays bare beside its archetypes' copies. A copy one class's progression grants, which archetypes add too, is that class's own; where one class has such copies, its earliest keeps the plain name. A copy that only one class and that class's archetypes give takes the class (`own`: only the class and its own archetypes give it, so the class names it truly), and its level when the class has several ("Favored Terrain (Ranger 8)"). A copy only archetypes give takes the archetype, or the family name of several.
- `routeFinder` (source 5): where a fact's grants come from, through the feature selections it is an option of, which G's climb climbs through: a class's progression (`levelEntry`), an archetype (`archetypeAdd`), or anything else (`Routes`: each class whose own progression grants it, with the levels; the archetypes that add it; whether anything else grants it, such as a feature, a feat selection or a Mythic path).
- `family` (source 6): a fact's nearest shown grantors, climbing past those that share its own name, when their names share leading words: that common name, cut before a trailing separator, and the level when every one grants at the same level. Every route passes through one of them, so the common name holds for the fact.
- `CommonName` and `commonOf`: the common name a set of grantors share (source 0's items and source 6's family), with the level they grant at when every one grants at the same level.
- `commonName`: the leading words a set of names share, when in every name they are the whole name or end at a separator (a dash, a comma or an opening parenthesis): "Draconic Bloodline" from "Draconic Bloodline — Black" and "— Blue", but nothing from "Second Mystery" and "Second Curse".
- `itemGrantor`: for a feature only Gear gives (map ticket 29), the items whose enchantments give it, climbing through what Gear reaches (its grantors, its enchantment and its item, are reached only from the Gear, `reachableFromGear`), by their common name, and the level when every grant on the way carries the same one.
- `ancestorFinder`: the shown grantors a Build can reach above a fact, nearest first: G's climb through every reachable grantor, each with its depth (grant steps up from the blueprint), the nearest grant level on its path, and whether every route from the root to the blueprint passes through a grantor of its name (`Ancestor.everyRoute`; `onEveryRoute` is G's climb stopping at them). A grantor that isn't shown is climbed through and never names anything.
- `requiredNames`: what a blueprint's requiring prerequisites name where a player sees it (P's `namedWithLevel`): each fact, class and archetype by its name, and one needed at a level with the level as well ("Lich 2").
- The `Finders` are `ancestorsOf`, `routesOf`, `itemOf` (for a feature only Gear gives, the common name of the items that give it, with their level when they share one), `archetypeClass` (the class an archetype belongs to) and `familyOf` (source 6). `consumed` holds the name overrides already settled or refused.

`name-groups.ts` holds what `qualify.ts` (blueprints a Build reaches) and `gear-names.ts` (items a Build equips) share: a group of blueprints with one display name, settled source by source (map tickets 27 and 29), name overrides last, then one left over bare; and the written names blueprints still share afterwards.

- `NameOverride` is a `"change": "name"` override; `Candidates` are a source's qualifiers for one blueprint, each with how near it is (lower is nearer). `Settled` is how a name was settled: by which source, with which qualifier (none for a bare name), and for a Gear twin the item the pickers offer in its place. A `Group` is one group while it is settled, its open blueprints (`left`) and its settled ones; a `Member` is a group member as the sources settled it (for a twin, the one it collapses into has the qualifier).
- `hasBare`: whether a settled member keeps the bare name (no qualifier, and not a twin). `settle` settles a blueprint and takes it out of those left. `usedQualifiers`: the qualifiers already taken in the group (`undefined` for a bare name).
- `candidatePass`: one source's pass over the blueprints left. Each takes its nearest qualifier that no other blueprint left has as near and the group hasn't taken, so two never take the same one. It returns whether it settled any. `only` makes a single qualifier, or none, into candidates.
- `runSteps`: runs the steps in order until none settles any or one blueprint is left. Once a step settles some, the rest start again from the first: a settled blueprint no longer stands in the way of a nearer qualifier it shared with them.
- `overridePass`: the last source, the name overrides of the blueprints the steps leave, where more than one is left or one already keeps the bare name. Each override met is added to `consumed`, applied or refused; a refused one is a problem.
- `lastBare`: one blueprint left over keeps the plain name, when none does yet.
- `unusedOverrideProblems`: each name override no group used, with the source that settled its target instead, or that nothing shares its name.
- `nameOverridesOf`: the name overrides of items (Gear's) or of every other blueprint, by target, and the targets named by more than one.
- `qualifyGroups`: qualifies the names a set of blueprints share. Each name more than one has is a group, in name order, its members in the given order. The steps settle a group from its sources; the name overrides then settle what is left, one left over keeps the bare name, and `last` runs. It returns the groups with their members and the written name of each qualified blueprint. A twin is written with the name of the item it collapses into.
- `kindWords`: the word for a blueprint's kind (`qualify.ts`'s source 3; for an item, Gear's slot word), in our own words.
- `collisionsOf`: the written names that more than one blueprint still has, by name. `shownName`: a blueprint's name where a player sees it (`isShown`); a nameless or hidden blueprint has none to give.

`shared-names.ts` lists the written names that blueprints a player sees still share after qualifying (build ticket 02c, map ticket 27), each with why both stay. The list is empty now. The importer fails on a shared name not listed there and on a listed one no longer shared (`sharedNameProblems`), so the list stays honest; the report lists every one with its reason. Every other shared name is qualified, by a source or a name override.

## Gear names (`gear-names.ts`)

`qualifyGear` (map ticket 29, build tickets 02f and 02g): items a Build can equip that share a display name are told apart, item by item, by the first rule that sets each apart (`gearSources`):

1. `twin`: twins collapse into one choice, offered as the lowest GUID (`CheckedData.twins`, `engine/data/twins.ts`; `twinStep`);
2. `restriction`: the Mythic path or class an `EquipmentRestriction*` requires: "The Bound of Possibility (Aeon)";
3. the item's own facts: its slot (`slot`, "ring", `slotWords` from `kindWords`), then its weapon or armour type's name (`type`, "Battleaxe"; for a shield, its bash weapon's, "Spiked Heavy Shield"), then its enhancement bonus (`enhancement`, "+3"), then its type and enhancement bonus together (`type and enhancement`), where neither tells it apart alone ("Bardiche +3");
4. `override`: a `"change": "name"` override, our own words with its reason.

One item in a group stays bare when every other label is distinct. A part worn only with another item (a shield's armour half or bash weapon, a double weapon's second end) isn't one a Build equips, so it joins no group. Only `qualify.ts` reports a target named by more than one name override (`repeated`). `gearNameTypes` are the component types Gear names read (rule 3's enhancement bonus), which no area of the walk reads.

- `GearNames`: the groups; the written name of every qualified item, a twin's included (`<name> (<qualifier>)`); the written names that items a Build can equip still share, apart from twins; and the item name overrides that don't apply where rules 1–3 fail, or that collide. A `GearMember`'s `twinOf` is the item the pickers offer in its place.
- `repeatStaysBare`: a qualifier the name already says ("Heavy Shield +1 (Heavy Shield)") tells nothing, so that item stays bare instead, when it is the only one and none is bare yet.
- `itemFacts`: the facts rules 2 and 3 read off an item. `restriction` (rule 2): the classes or Mythic paths an item's restrictions require, by their shown names. `typeName`: an item's weapon or armour type's name (`itemType`); a shield's is its bash weapon's, else its armour half's. `enchantmentComponents`: the components of an item's enchantments, as the game collects them (`enchantmentsOf`). `bonus`: an item's enhancement bonus, as the game's `GameHelper` reads it: a weapon's the highest that doesn't stack plus those that do, up to 5; an armour's the highest; and a shield's from its armour half. None when it is 0. Its citations are in `cites.ts` (`itemFacts.bonus`).

## Overrides (`overrides.ts`)

Overrides (guide §3 point 6) are the only way the game's data is corrected: one cited file per correction in `data/overrides/`. `readOverrides` reads the override files in file-name order, as the loader takes them. A patch is a list of JSON Patch operations (RFC 6902, `remove` and `replace` only) on the blueprint's dump JSON, applied before the filter, so its paths match what `show.mjs` prints. `applyPatch` returns a copy with the operations applied; a path that doesn't resolve is a problem, and the operation is skipped.

## The grantor check (`grantors.ts`, `no-grantor.ts`, `unreachable.ts`)

`checkGrantors` (guide §3 point 8; ticket 02): every prerequisite leaf on a blueprint a Build can reach names facts, classes and archetypes that G finds a grantor for, or the leaf is in the report with a reason from `noGrantor`. It reads prerequisites through P and grants through G, so it gives the same answer the engine will. Its result (`GrantorCheck`) holds G; the findings (the fact, class or archetype no grantor gives, the reachable blueprints whose requiring leaves name it, and the cited reason, or none when none is kept, which is an import problem); `unreachable`, facts a leaf on a reachable blueprint names that no Build can reach from the root or through its Gear (ticket 02b), with the reason from `no-grantor.ts` or `unreachable.ts`; and `namelessWithoutNamedGrantor`, facts a leaf names that a player never sees (nameless or hidden, `isShown`) and whose climb through G finds no shown grantor (map ticket 19 words them by asset name).

`no-grantor.ts` lists the facts, classes and archetypes that a prerequisite on a reachable blueprint names but that no grant the planner holds gives, each with the reason. The importer fails on any such fact not listed (ticket 02, "Done when"), and on a listed one that now has a grantor or isn't needed (`noGrantorProblems`); the report lists every one with its reason. They were traced with `tools/dump/refs.mjs` and `referrer-tree.mjs`. Each GUID is a constant named after its blueprint. The companion feature lists are needed by these: SCOUT_FEATURE_LIST by BackgroundRekarthDLC2, PENTA_FEATURE_LIST by Penta_Numerian_Background, WOLJIF_PREGEN_TEST_FEATURE_LIST by TieflingHeritageBaphomet. CORRUPTED_GOLDEN_DRAGON_FEATURE is the Vow of Dahak.

`unreachable.ts` lists the facts, classes and archetypes that a prerequisite leaf on a reachable blueprint names but that no Build can reach (ticket 02b, "the 28 prerequisite leaves"), each with the reason, beyond those `no-grantor.ts` already lists. A Build never holds one, so a leaf forbidding it is always met. The importer fails on any such fact listed in neither file, on an entry `no-grantor.ts` lists already, and on an entry whose fact a Build can now reach or no leaf names (`unreachableProblems`). They were traced the same way, and each GUID is likewise a named constant.

## Component types not needed (`not-needed.ts`)

`notNeededFamilies` lists the component types on written blueprints that the allowlist leaves out, by family, each family with the one reason the planner doesn't read its types (ticket 02a). The report lists every other unlisted type for review, and the import fails when a type there is allowlisted or carried by no written blueprint, so the list stays exact. The reasons are data, written into the report.

## The report (`report.ts`)

`buildReport` writes `data/report.md` (ticket 02, "The report lists"). It is deterministic like the data, so a rerun on the same dump leaves it unchanged, and it holds asset names, counts and display names only. Its input holds the checked data when the import passed its checks, what the keep rule did when the import got that far, and the shared names and Gear names (twins included) and how each was qualified, when the data loaded. `sharedNames` is the shared-names section (build ticket 02c: counts by source, the exceptions, and every group); `gearShared` is the Gear section (map ticket 29, build ticket 02f: counts by rule, the twins, and every group of items).

## Writing `data/` (`serialise.ts`, `sync.ts`)

`serialise` writes deterministic JSON for `data/` (guide §3 point 7): keys sorted at every depth, two-space indent, LF line endings, one trailing newline, no timestamps. The same value always writes the same bytes, so a rerun on the same dump writes nothing and a diff of two data versions shows only real changes. Array order is the game's and is kept.

`sync.ts` runs on the server side only: `diffData` compares the importer's files with `data/` (`DataDiff.write`, paths whose content is new or changed; `remove`, paths the importer owns that it no longer produces), and `applyDiff` applies the difference. The importer owns each kind's folder and `report.md`; `data/overrides/` is hand-kept and never touched here.

## The census (`census.ts`)

The leftover census shows which written blueprints no Build can reach, and what in the dump still names them. Run it before trimming the leftovers (ticket 02b), and again after adding a grant route to G, to see which hidden routes remain:

    bun run census [-- <leftovers.tsv>]
    bun tools/importer/census.ts [leftovers.tsv]

A leftover is a blueprint in `data/` that G reaches neither from the root nor from the sourced items (`reachableFromRoot`, `reachableFromGear`). Since ticket 02b the importer writes only what the keep rule keeps, so the leftovers are what the kept fields name beyond G's reach (spellbooks, tables, prerequisite targets). The census streams the dump (`DUMP`, or the `.binz` under `blueprints/`) for every reference (`referencesIn`: each reference by the component it sits in, or `(header)`, and its field path without list indices, such as `AddFacts m_Facts` or `(header) m_Progression`), and puts each leftover in the first group that fits:

- **A**: a reachable blueprint names it, counted by that blueprint's component and field;
- **B**: one hop, a reachable blueprint names an unwritten blueprint (a buff, an ability, a unit…) that names it (`unwrittenNamedByReach`), counted by the reachable component, the unwritten blueprint's type and its component and field;
- **C**: only other leftovers name it;
- **D**: anything else, counted by the types that name it, or "(no referrer)".

Given a path, it also writes one line per leftover there: group, `$type`, asset name, GUID.

## Citations (`cites.ts`)

The allowlist entries and variants carry their citations in their own `cite` field, checked by `allowlist.test.ts`. Every other citation of the importer lives in `cites.ts`, keyed by the identifier it documents: the shared enum and struct specs, `UnitClass` and `BuffExtraEffects.m_CheckedBuffList` (which `allowlist.test.ts` exercises), `BlueprintBuff.Stacking`, `AddFeatureOnClassLevel.m_Class`, Gear's enhancement bonus (`itemFacts.bonus`), `naturalWeapons`, and `qualifyNames`, which leaves out blueprints the game hides (`isShown`). `cites.test.ts` checks them.

## Tests

- `allowlist.test.ts` is module A (guide §4): the allowlist keeps every field its cited methods read. Each citation names a decompiled file, a method and, in parentheses, the kept fields that method reads. The tests check that the citations and the kept fields agree, and, where the git-ignored `decompiled/` sources are present, that each cited method exists, reads the fields it is cited for, and reads no field of the entry's class (or of a kept struct's class) that the entry drops without a listed reason (`notKept`, `awaiting`). `variantsIn` finds every variant of a polymorphic value (a condition, an evaluator, an action) inside the entries' kept fields, through structs, lists and nested variants, once each by class name; a `Checked` is an entry or such a variant. `fieldReadProblems` lists every field of the entry's class (and, inside a kept struct, of the struct's class) that a cited method reads and the entry neither keeps nor lists, and every listing that is stale because the field is kept or no cited method reads it. A field a method reads under the same name on another object is listed too, with that reason: the check matches names, so it errs towards asking. `nestedFields` gives the field names inside struct specs (`LevelEntries` → `Level`, `m_Features`), which citations may also name. The readers check (each allowlisted component type read once, by P, by G, by S's `pickerComponentTypes`, by a landed area or by the Gear names) takes each landed area's exported set of types through `walkAreas`; its failing case uses AddFeatureToPet, a real grant type of the game's that the allowlist leaves out (`not-needed.ts`). The field-read cases rest on the game: `BuffExtraEffects.CheckHadPrerequiredBuff` reads `m_CheckedBuffList` as well as `m_CheckedBuff`, and `UnitClass.CheckCondition` reads `LimitMaxLevel` and `MaxLevel` as well as the minimum (both in `cites.ts`).
- `cites.test.ts` checks `cites.ts`: each cite's format and key, and, with the sources present, that the cited file declares the member.
- `import.test.ts` checks the specs, `keepBlueprint`, `applyPatch`, `reachable`, the keep rule, `displayName` and `neutralName` on made-up blueprints. The keep-rule fixture holds a chain of Grant carriers (B12 → buff B13 → buff B14 → feature B16, and B12 → buff B17 → buff B18, which grants nothing) and a Shifter aspect: B15 gives toggle B19, whose buff B20 its `BuffExtraEffects` checks, adding buff B21 and so feature B22, and also toggle B23, whose buff B24 nothing checks, so the Build never keeps it on. `BuffExtraEffects.m_CheckedBuff` is a strict reference, so the test's strict names record that B15 names B20. The order case: B32 gives toggle B33, whose buff B34 its `BuffExtraEffects` checks; B34 gives buff B35, which gives feature B31. The root's progression gives B31 directly too, so B31 is kept and looked at before the rule reaches B35 through B34; B35 still lies on a grant path from the root to B31, so it stays, whichever order the progression lists them in. The template name is LichDeityFeature b4153b422d02d4f48b3f8f0ceb6a10eb's display name, ADR 0006's example.
- `items.test.ts` checks the sourcing rules on a small made-up dump (`dump` builds the index from blueprint numbers, as `indexDump` would): which references give an item and which don't. An additional limb is no gear. The empty hand mirrors WeaponEmptyHand 20375b5a0c9243d45966bd72c690ab74, which comes in through a companion's `m_EmptyHandWeapon` and which map 12's hand-kept list drops.
- `gear-names.test.ts` is hand-built from the game's own items (build ticket 02f, map ticket 29): each keeps its GUID and asset name from the dump, with only the fields the Gear rules read. The Bound of Possibility has one cloak per Mythic path, and the Golden Dragon's has no restriction; Artifact_AeonCloakItem b24d6185acea1f949b026c3b58e47947 requires AeonMythicClass (`EquipmentRestrictionClass`). Adamantine Full Plate +2 and its Hellknight copy are equal in everything but GUID and asset name; AdamantineFullplateStandartPlus2_Hellknight 29f9eb542c9985f4b904add8d843caf1 has the lower GUID. Executioner of Evil has one relic per axe, told apart by the weapon type's name. Finnean the Talking Weapon has one weapon per type and stage, the stages differing in their enhancement bonus: FinneanBardicheStage1 carries Enhancement1 (`WeaponEnhancementBonus` 1) and Stage2 Enhancement3, +1 in chapter 1 and +3 in chapter 3 (GameFAQs items.txt), so neither the type nor the bonus alone tells the four apart. The Bashing Shield and its armour half share a name; the half is worn only as part of the shield.
- `qualify.test.ts` is hand-built from the game's own groups (build ticket 02c): each blueprint keeps its GUID and asset name from the dump, with only the fields G and P read. Names are the game's display names; nameless progressions stay nameless. The fixture and the expectations:
  - Arcanist and Inquisitor, and Loremaster's secrets named after them: picks from the wizard's or the druid's spell list for that class's spellbook. Loremaster's own Arcanist spellbook pick is one the game hides: LoremasterArcanist 39d9362873634e24c8f7a1932e425340 has `HideInUI` (`Feature.Hidden`, in `cites.ts` under `qualifyNames`), so it joins no group. LoremasterWizardSecretArcanist is an option of LoremasterWizardSpellSecret f97986f19a595e2409cfe5d92bcf697c and LoremasterDruidSecretArcanist of LoremasterDruidSpellSecret 6b73ba9d8a718fb419a484c6e1b92c6d, so their grantors tell them apart (source 1). ArcanistClass 52dbfd8505e22f84fad8d702611f60b7 stays bare once its picks are told apart; InquisitorClass f1a70d9e1b0b41e49874e1fa9052a1ce stays bare by its kind (source 3) while the two Wizard Spell picks named after it, for a Hunter's and an Inquisitor's spellbook, are still shared.
  - The Witch's patrons, each granting its Patron Spells at levels 2, 4…: WitchWinterPatronProgression e98d8d9f907c1814aa7376d6cdaac012 grants WitchPatronSpellLevel1 at level 2 and WitchPatronSpellLevel2 at level 4, and so does each other patron, so the patron alone can't tell them apart (source 2).
  - The sorcerer's bloodline feat selections, an option of SorcererFeatSelection each, needing their bloodline: each needs its bloodline's requisite feature, and the requisite features carry their bloodline's name, as in the game. BloodlineAbyssalFeatSelection 7781831170d794a4d8f147a1326c35fd needs AbyssalBloodlineRequisiteFeature b09b58c7f8efff244a33269489abeac6 (`PrerequisiteFeature`); its only grantor, SorcererFeatSelection, shares its name (source 4).
  - Two of the ten draconic bloodlines, each granting the one draconic bloodline spell feature at level 5, and the celestial and empyreal bloodlines, sharing a feature of the same name. BloodlineDraconicSpellLevel2 1d3fcbb51257dd6448a48db489cdd3ad is granted by every draconic bloodline, so no one colour holds on every route; their names share "Draconic Bloodline" (source 6). The celestial and empyreal bloodlines' BloodlineCelestialSpellLevel2 62ff99899efcf9c4eb2656fbe9d9522c shares no family name, and stays bare.
  - The ranger's Favored Enemy: the first pick at level 1, and the rank-ups from level 5. The Sable Company Marine (a ranger archetype) adds the first pick, and the Sacred Huntsmaster (an inquisitor's) both. FavoriteEnemySelection 16cc2c937ea8d714193017780e7d4fc6 is the class's own copy (source 5). The rank-up FavoriteEnemyRankUp c1be13839472aad46b152cf10cf46179 is also the Sacred Huntsmaster's, so the ranger's level doesn't hold on every route: it needs an override.
  - The ranger's Archery combat style: the level-2 and level-6 picks, each an option of its level's Combat Style Feat selection, which Nomad adds at those levels too and the slayer's level-2 talent selection offers. RangerStyleArcherySelection2 3cf94df3f1cf9a443a880bc1ae9be3c6 and RangerStyleArcherySelection6 6c799d09d5b93f344b9ade0e0c765c2d are given by all of them, so no source tells them apart, and none names one archetype among its grantors; an override settles them.
  - The kineticist's air bonus feats: two copies offered side by side in Wild Talents, which nothing tells apart. WildTalentBonusFeatAir 4ff45d291d0ee9c4b8c83a298b0b4969 and WildTalentBonusFeatAir1 95ab2bdf0d45b2742a357f5780aac4a3 are both options of WildTalentSelection, with no level or prerequisite between them; an override settles one and the other stays bare.
- `serialise.test.ts` checks that `serialise` writes the same bytes whatever the key order, keeps array order, and is the form every committed fixture file is in.
