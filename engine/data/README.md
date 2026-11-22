# Data model

The shapes of the committed data in `data/`: the game's own blueprints, under the game's own class and field names, filtered by the importer's allowlist (`tools/importer/allowlist.ts`, ADR 0005). Each type lists only the fields the allowlist keeps, so a field joins a type and the allowlist together. This folder also holds the small readers every module shares over that data: references, items, twins, prerequisite component types, and two generic helpers. It holds no rule of a module (P, G, W, S, R, E, C); each module reads the data through these types.

Every type, field and helper that ports something from the game's decompiled C# has its citation in `cites.ts`, keyed by the type's name (`AddFacts`), the type and field (`BlueprintBuff.Stacking`), or the function's name (`enchantmentsOf`).

## Public entry

`index.ts` exports everything from:

- `types.ts`: the blueprint and component types, the game enums they use, `kindOf`, `progressionRootFields`, the reference readers (`refGuid`, `guids`, `references`, `isRecord`), `isShown`, and the override shape (`Override`, `PatchOp`).
- `items.ts`: how an item is built (`ItemLookup`, `PART_FIELDS`, `partsOf`, `itemType`, `weaponType`, `armorType`, `shieldArmor`, `shieldWeapon`, `enchantmentsOf`).
- `twins.ts`: Gear's twins (`equippableItems`, `deriveTwins`).
- `prerequisite-types.ts`: which components are prerequisites (`prerequisiteTypes`, `paramPrerequisiteTypes`, `isPrerequisite`).
- `data-file.ts`: `DataFile`, one parsed file of `data/`.
- `util.ts`: `sortKeys`, `byName` and `fingerprintOf`, generic helpers the engine and the importer share, with no game rule in them.
- `cites.ts`: the citations.

## Identity and references

- `Guid`: a blueprint GUID, 32 lowercase hex characters: the game's identity for a blueprint.
- `Ref`: a reference to another blueprint exactly as the dump writes it, `!bp_<guid>`.
- `Kind`: the folder under `data/` a kept blueprint is written to. `kindOf` maps each kept `$type` to its folder and is the one place that says so.
- `BlueprintBase`: what every kept blueprint carries besides its allowlisted fields. `$type` is the game's class name without its type GUID (`BlueprintCharacterClass`). `assetName` is the internal asset name; it repeats across blueprints, so it is never an identity. `name` is the English display name (ADR 0006), absent on blueprints the game never names. `Components` are the allowlisted components, in the game's order.
- `Component`: its `$type` is the component's class name, without its type GUID.
- `refGuid` gives the GUID a reference names, or `undefined` when the value isn't a reference. It remembers each reference-like string's answer (`guidByRefText`), since the walk follows the same references many times.
- `guids` gives the GUIDs a list of references names, leaving out what isn't a reference (an unset entry's `null`).
- `isRecord`: whether a value is a plain object (a blueprint, a component, a struct), not `null` and not a list.
- `references` yields every blueprint reference anywhere in a value, depth first. The value can be a kept blueprint, a component, or a blueprint's JSON as the dump has it, whose `$type` names its class after a type GUID. Each `FoundReference` has its `guid`; its `path` (`Components[2].m_Facts[0]`); its `field`, the field that holds it or the list it is an item of (`m_Facts`); and `enclosing`, the class name of the nearest object around it that has a `$type`, or `undefined` for none.
- `isShown`: whether a player ever sees a blueprint as itself (map tickets 19 and 27): it has a display name and the game doesn't hide it (`HideInUI`, which the game's feature reads to hide itself). A blueprint that isn't shown is never an option or a search result; a Refusal or a "this needs" link words it through what grants it.

## Game enums

The dump writes enums by member name, so each is a union of the game's member names: `DiceType`; `StatType` (abilities, skills, checks and the other stats) and `Attribute`, its six ability scores; `ModifierDescriptor` (a bonus's type, which decides how it stacks); `ContextValueType`; `AbilityRankType` (which `ContextRankConfig` a Rank value reads); `ContextRankProgression`; `GameDifficultyOption`; `AlignmentComponent` (one axis of an alignment, which an alignment has or lacks); `WeaponCategory`; `WeaponSubCategory`; `ArmorProficiencyGroup`; `FeatureGroup` (a feature's kind, such as deity or bloodline, and a selection's band); `FeatureParameterType` (what a parametrized feat is taken for); `SpellSchool`; `WeaponRangeType`; `PetType`; `StackingType` (only the members kept buffs use: no `Rank`); `ActivatableAbilityGroup` (toggles that share a limit, such as a Shifter's aspects); and `MechanicsFeatureType` (a flag a fact sets, such as `LegendaryHero`).

`ContextValue` is a number, constant when `ValueType` is `Simple`. `RankedContextValue` is a `ContextValue` whose Rank reads its fact's `ContextRankConfig` of the same `AbilityRankType`.

## Components and blueprints, by area

### Stat bonuses

- `AddStatBonus`: a fixed bonus while the fact is held (a race's ability modifiers).
- `AddStatBonusIfHasFact`: a bonus while other facts are held (or, with `InvertCondition`, lacking).

### Grants

Guide §7, "Ranks and grants". A grant of an ability or a buff, which the planner doesn't hold, is dropped by the importer: from a list, the one reference; for a single grant, the whole component.

`GrantComponent` is the union of every component that gives or takes away facts. G (`engine/grants`) reads each one in a table keyed by this union, so a grant type joins this union, the allowlist and G together.

- `AddFacts`: holds its facts while its own fact is held, gated by the difficulty setting.
- `AddFeatureOnClassLevel`: grants from a class level on, or below it (`BeforeThisLevel`). A `null` `m_Class` counts the character level instead of a class's.
- `AddFeatureIfHasFact`: grants while another fact is held (or, with `Not`, lacking).
- `AddFeatureOnApply`: grants once, for good, when its fact is gained.
- `RemoveFeatureOnApply`: removes a fact when its own fact is gained.
- `AddFeatureOnAlignment`: holds its facts while the character's alignment has `Alignment` (`Neutral` means either axis is neutral), and drops them when the alignment changes.
- `AddFeatureOnSkill`: holds its facts once the stat's permanent value reaches `MinimalStat`, checked when the fact is gained and at each level-up. Nothing takes them away if the stat drops later.
- `AddParametrizedFeatures`: holds parametrized feats, each at a set parameter. Each `ParametrizedFeatureGrant` is one such feat (the game's per-feat entry): the feat, and its parameter in the one field the feat's `ParameterType` picks; the other fields keep the game's unset values. `ParamObject` serves `FeatureSelection` and `Custom` feats, `Stat` serves `Skill` feats.
- `AddFeatureParametrized`: on a `FeatureSelection` parametrized feat, the feature picked as the parameter is also held. It has no fields; the options are the feat's `BlueprintParameterVariants`.
- `FactSinglify`: when its fact is first gained, takes away `m_OldFacts` and holds one copy of each of `m_NewFacts` (Alchemist bombs, a Serpentine bloodline's bite).
- `KensaiChosenWeapon`: on a `WeaponCategory` parametrized feat, also holds the `m_Focus` parametrized feat at the same weapon category, with that weapon's proficiency.

### Class skills, skill points and proficiencies

Build ticket 03's areas. Each of these holds while its fact is held, turning on and off with it, except `AddSkillPointPerCharacterLevel`, which the game applies when it counts a level-up's skill points.

- `AddClassSkill`: makes a skill a class skill.
- `AddBackgroundClassSkill`: a background's class skill (the skill's class-skill flag).
- `AddSkillPointPerCharacterLevel`: one more skill point per character level.
- `AddProficiencies`: armour groups and weapon categories, for one race when `m_RaceRestriction` is set.
- `AddBackgroundWeaponProficiency`, `AddBackgroundArmorProficiency`: a background's weapon or armour proficiency.
- `IncreaseActivatableAbilityGroupSize`: one more toggle of the group can be on (map ticket 32).

### Spellbooks as prerequisite gates

Build ticket 03's spellbook area.

- `AddSpellbookLevel`: one more base level in a spellbook, once, when its fact is gained.
- `SkipLevelsForSpellProgression`: class levels that don't raise the spellbook.
- `IsAlchemistSpellbook`: marks the alchemist's spellbook, which caster gates skip.

### Ability scores

Build ticket 03's ability-score area: the Racial bonuses a stat prerequisite counts.

- `AddContextStatBonus`: a bonus of `Value` × `Multiplier`, at least `Minimal` when `HasMinimal`. Only Racial ones are kept: they are the permanent modifiers a stat prerequisite counts.
- `ContextRankConfig`: the rank a Rank value reads. Only the base types a Racial bonus uses are kept: `ClassLevel` (the Shifter's Wolverine aspect) and `FeatureList` (the Tiefling heritages' Charisma). For `FeatureList`, `m_FeatureList` holds the features whose holding counts one each.
- `ReplaceStatBaseAttribute`: a skill (or AC) reads another attribute.

### Conditions

The nested trees inside `PrerequisiteCondition`, which P reads as one leaf (map ticket 20). Every condition has `Not`, which inverts it (`ConditionBase`).

- `OrAndLogic`: all (`And`) or any (`Or`) of its conditions.
- `ContextConditionHasFact`: the character holds the fact.
- `HasFact`: the unit (here the main character) holds the fact.
- `ContextConditionCharacterClass`: at least `MinLevel` levels in the class.
- `UnitClass`: the unit's levels in the class, within limits.
- `IsUnitMythicLevel`: the Mythic rank, within limits.
- `ContextConditionBuffRank`: a fact's rank above `RankValue`.
- `ContextConditionIsMainCharacter`: a Build is always the main character.
- `ContextConditionIsWeaponEquipped`: the Gear's weapon, in a parameter check.
- `StoryCondition`: story state, which is always met (map ticket 21): `EtudeStatus`, `CompanionInParty` and `IsCampaign`. Only `Not` is kept; the etudes, companions and campaigns they name are not blueprints the planner holds.
- `UnitEvaluator`: the unit a condition looks at. For a Build every one of them means the main character.
- `IntConstant` (`IntEvaluator`): the only integer evaluator prerequisites use.

### Grant actions

Map ticket 23: the part of an action tree that gives facts. `AddFactContextActions` keeps only these, under the `Conditional` trees around them; every other action is dropped by the importer and counted in its report.

- `ActionList`: an action list holding only grant actions (`GrantAction`).
- `Conditional`: `IfTrue` when the conditions hold, else `IfFalse`.
- `ContextActionAddFeature`: grants a feature for good. When `m_SetRankFrom` is set, the action gives the granted feature that feature's rank: a Trickster Lore (Religion) domain's rank feature, which raises its domain progression's level (`m_FeaturesRankIncrease`). The walk doesn't apply this yet (build ticket 03c's last item).
- `ContextActionApplyBuff` with `Permanent` set: holds a grant carrier.
- `AddFactAction`: the game's `AddFact` action, named apart from the `AddFacts` component: gives the unit (here the fact's owner) a fact.
- `ActivateTrigger`: runs `Actions` when its fact is gained, if `Conditions` hold.
- `AddFactContextActions`: runs `Activated` when its fact is gained.

### Buffs, abilities and toggles

- `BlueprintBuff`: a grant carrier (map ticket 23): granted by a held fact, and granting held features or other grant carriers. Only its grant components are kept. `Stacking` says what a second grant of a buff already held does.
- `BlueprintAbility`: an ability that carries a choice (map ticket 26): a held fact grants it, and its `AbilityApplyFact` applies one of a list of held features. Every pick made through one is a Daily choice, not part of a Build (map tickets 24 and 26). Only its `AbilityApplyFact` is kept.
- `AbilityApplyFact`: applies the picked fact, replacing this ability's last pick. `m_Restriction` `CasterHasNoFact` means the pick must be a fact not held yet.
- `BlueprintActivatableAbility`: a toggled ability a held fact gives, whose buff a kept `BuffExtraEffects` checks (a Shifter aspect). A Build can keep it on, so what `BuffExtraEffects` adds while it is on counts as held (an Aspect kept on).
- `BuffExtraEffects`: adds an extra buff while a checked buff is on, unless the exception fact is held. The game's check also reads `m_CheckedBuffList` (map ticket 32, amended), but every component that sets it is dropped, so that field isn't kept; the allowlist's `notKept` guards that.

### Gear-conditioned grants

Each holds `m_NewFact` while the Gear meets its condition. Their weapon- and armour-type lists join with the items area, which brings those types.

- `MonkNoArmorFeatureUnlock`: no armour and no shield (or polymorphed).
- `MonkNoArmorAndMonkWeaponFeatureUnlock`: no armour or shield, and a monk weapon (Zen Archer and Sohei vary it). `m_BowWeaponTypes` are the bow types a Zen Archer's main hand must hold (with `IsZenArcher` only).
- `HasArmorFeatureUnlock`: armour of given types or groups, optionally with no shield. `m_BlueprintArmorTypes` are the armour types that count when `FilterByBlueprintArmorTypes` is set; a `null` entry matches nothing. `m_ArmorProficiencyGroupEntries` is an armour-group flags value as the game writes it: names, or raw bits (`-1`; `0` when unset).

### Items

Map ticket 12: the items a Build's Gear can hold, with what the Gear checks read. An item's place is its `$type`, as the game's equipment slots decide. Its enchantments are the item's own plus its type's (`enchantmentsOf`); only those carrying a kept component are held.

- `BlueprintItemWeapon`: a main- or off-hand weapon. A `Double` weapon never goes in the off hand alone. `m_SecondWeapon` is a double weapon's second end, worn only as part of it (the game builds it with the weapon).
- `BlueprintItemArmor`: body armour, or a shield's armour half.
- `BlueprintItemShield`: an off-hand shield, made of an armour half and a bash weapon.
- `WornItem` and the `BlueprintItemEquipment…` types: an item for one worn place; a ring is worn in either ring place.
- `BlueprintWeaponType`: what makes a weapon a longsword, a bite or a monk weapon. `m_FighterGroupFlags` (`WeaponFighterGroupFlags`) is a flags value as the game writes it: names joined by `, `, or raw bits.
- `BlueprintArmorType`: an armour's proficiency group, and whether it counts as armour. `m_IsArmor` is false for a shield's armour half: wearing one is not wearing armour.
- `BlueprintShieldType`: a shield's armour type.
- `BlueprintEquipmentEnchantment`, `BlueprintWeaponEnchantment`, `BlueprintArmorEnchantment`: an enchantment an item carries, kept for its stat bonuses and the facts it grants.
- `AddStatBonusEquipment`: a bonus to the wielder's stat. Only `Enhancement` bonuses are kept: they alone are permanent, so they alone count toward stat prerequisites (ADR 0002).
- `IncreaseStatEquipment`: the same, while the stat is above zero.
- `AddUnitFeatureEquipment`: the wielder holds a feature while wearing the item.
- `AddUnitFactEquipment`: the same for any fact; kept when it is a held one.
- `MithralEnchantment`: the armour counts one group lighter.
- `WeaponEnhancementBonus`: the weapon's enhancement bonus, which stacks with the others when `Stack`. Gear names read it (map ticket 29's rule 3).
- `ArmorEnhancementBonus`: the armour's enhancement bonus, the highest one counting. Gear names read it (map ticket 29's rule 3).
- `IgnoreArmorGroupComponent`: on an armour type, wearing it needs no proficiency in its group.

### Item restrictions

The item can be worn only when each passes.

- `EquipmentRestrictionClass`: levels in the class (or, with `Not`, none).
- `EquipmentRestrictionHasAnyClassFromList`: levels in any listed class (or, with `Not`, in none).
- `EquipmentRestrictionAlignment`: the wearer's alignment is in the mask. `Alignment` is an alignment-mask flags value as the game writes it: names or raw bits.
- `EquipmentRestrictionMainPlayer`: the main character only; a Build always is (map ticket 01).

### Prerequisites

`Prerequisite` is the union of every prerequisite component type P reads. Each carries its `Group` (`PrerequisiteGroup`), and two flags (`PrerequisiteBase`): `CheckInProgression`, whether a progression's grant checks it, and `IsFeatureSelectionWhiteList`, whether a waived slot under `ExceptWhiteListed` still checks it.

- `PrerequisiteFeaturesFromList`: `Amount` is how many of the list are needed; a list of deities needs one. `m_RestrictIfNot` inverts the leaf: it then forbids holding `Amount` of the list.
- `PrerequisiteClassLevel`: `Not` inverts the leaf: fewer than `Level` levels.
- `PrerequisiteAlignment`: `Alignment` is an alignment-mask flags value as the game writes it: names (`"LawfulGood, NeutralGood"`) or raw bits.
- `PrerequisiteParametrizedFeature`: the same parametrized feat already held for a given parameter. Spell parameters are out of v1 (map ticket 22).
- `PrerequisitePet`: `NoCompanion` inverts the leaf: no pet of that type.
- `PrerequisiteEtude`: story state, always met (map ticket 21); the etude it names isn't held.
- `PrerequisiteAnySpellsInSpellbook`: needs a spell for a spell-parametrized feat; those feats are out of v1 (map ticket 22).
- `PrerequisiteCondition`: a nested condition tree, which P reads as one leaf (map ticket 20).
- `PrerequisiteConditionForWeaponCategory`: not a prerequisite but a parameter check, which a parametrized feat's selection check runs for the listed weapon categories.

The helpers the prerequisite checks read:

- `ClassLevelsForPrerequisites`: lends one class's levels to another class's prerequisites.
- `ReplaceStatForPrerequisites`: a stat prerequisite reads another value.
- `AddPet`: only its type, which `PrerequisitePet` reads; the pet's unit isn't held.

`prerequisite-types.ts` says which components are prerequisites. `prerequisiteTypes` is the set of prerequisite component types P reads; it is typed over the `Prerequisite` union, as P's readers table in `engine/prerequisites` is, so the two sets are equal. It lives here so the loader doesn't depend on P. `paramPrerequisiteTypes` are the parameter checks: components named like prerequisites that are not prerequisites, so they have no group and don't join a feature's prerequisite check; a parametrized feat's selection check runs them per parameter. `isPrerequisite` reads the game's naming: its prerequisite classes share the `Prerequisite` prefix, less the parameter checks.

### Features, selections and progressions

Every feature-like blueprint (`BlueprintFeature`, `BlueprintParametrizedFeature`, `BlueprintFeatureReplaceSpellbook`, `BlueprintFeatureSelectMythicSpellbook`, `BlueprintRace`, `BlueprintFeatureSelection`, `BlueprintProgression`) keeps `HideInUI`: the game never shows it to the player (map ticket 27).

- `BlueprintParametrizedFeature`: a feat taken for a Parameter (Weapon Focus), one pick per parameter. Where the parameter is a spell (`SpellSpecialization`, `LearnSpell`), the variants name abilities, which the planner doesn't hold, so they are dropped and counted in the importer's report. `m_Prerequisite` is the same feat that must already be held for the same parameter (Greater Weapon Focus needs Weapon Focus). `BlueprintParameterVariants` are the parameters on offer for `Custom` and `FeatureSelection`; `null` when the game leaves it unset.
- `BlueprintFeatureReplaceSpellbook`: a prestige class's pick of the spellbook it advances.
- `BlueprintFeatureSelectMythicSpellbook`: a Mythic path's pick of the spellbook its Mythic spells join; the game treats it as a selection.
- `NoSelectionIfAlreadyHasFeature`: closes a selection's slot.
- `BlueprintRace`: a feature whose features are granted at level 0. `SelectableRaceStat` says whether the Build picks the ability that gets the +2 racial bonus.
- `BlueprintFeatureSelection`: `Group` is the `FeatureGroup` that decides the pick's band.
- `BlueprintProgression`: `m_Archetypes` are archetypes whose class levels count; a class listed there counts only with one of them. `m_AlternateProgressionClasses` are the other classes that count toward the level, halved under `Div2`, when `ForAllOtherClasses` is off. `m_FeaturesRankIncrease` is `null` when the game leaves it unset, and the game's level calculation checks for that.

### Classes, tables and spellbooks

- `BlueprintCharacterClass`: `m_BaseAttackBonus` and the three saves name `BlueprintStatProgression` tables, indexed by class level.
- `BlueprintArchetype`: merged into its class's progression level by level. Its replacement tables are `null` when it keeps the class's.
- `BlueprintStatProgression`: a per-level table, base attack bonus or a save, indexed by class level.
- `BlueprintSpellsTable`: a spellbook's table, indexed by caster level. Each `SpellsLevelEntry`'s `Count` is spells per day by spell level; an entry below 0 or past the end means none.

### Settings

Guide §3 point 5: the root and the Mythic settings the rules read.

- `ProgressionRoot`: the fields the walk starts from and the rules read. `m_FeatsProgression` holds every character's character-level feats. `progressionRootFields` lists each field once: the importer starts its walk from them, the allowlist keeps them (its specs are tied to `ProgressionRoot`) and G makes each a `root` grant. It is keyed by every field of the type, so a field added to the type joins all three.
- `SystemMechanicsRoot`: the selections the rules single out. `m_BasicFeatSelection` is the selection the Trickster Waiver applies to.
- `BlueprintRoot`: only the parts the rules read. `m_DefaultPlayerCharacter` is the unit every custom main character is made from; what its `AddFacts` gives, a Build holds from level 0 (map ticket 28).
- `BlueprintUnit`: only the character-creation unit `BlueprintRoot` names is held (map ticket 28), with only its `AddFacts`.
- `BlueprintMythicsSettings`: each Mythic rank's Expected level (ADR 0003). `CharcaterLevelRestrictions` (the game's spelling) is indexed by Mythic rank; the game reads 0 outside 1 to its length − 1.
- `AddMechanicsFeature`: sets a `MechanicsFeatureType` flag while the fact is held.

## Overrides

`Override` is an override file's change to the dump's data (guide §3 point 6). The importer applies it; the loader checks it. Every override has a `reason`, why the game's data can't stand as it is, citing what shows it (never empty), and a `target`, the blueprint it adds, removes, patches or names.

- `add` and `remove`: the target blueprint joins or leaves the data.
- `patch`: `ops` are JSON Patch operations (RFC 6902, `remove` and `replace` only) on the dump's JSON, before filtering. Each `PatchOp`'s `path` is a JSON Pointer into the blueprint's dump JSON (`/Components/3`), and `value` is the new value for `replace`.
- `name`: qualifies a display name a Build can also reach under another blueprint's name, where the importer's own qualifiers can't tell them apart (map ticket 27). The `qualifier`, in our own words, is written after the display name as `<name> (<qualifier>)`.
- `alias`: `from` is an old GUID the game replaced with the target (map ticket 07): a Build code naming it opens on the target. The importer leaves it alone; the Build code reads it.

## Items

`items.ts` says how an item is built (map ticket 12): its weapon or armour type, its enchantments, and the parts worn only with it, read the way the game's item blueprints read them. The walk's Gear (`engine/walk/gear.ts`), G's item grants, Gear's twins and the importer's Gear names all read items through here.

- `ItemLookup`: the blueprints an item's references name.
- `PART_FIELDS`: the fields naming an item worn only as part of another: a shield's two halves, and a double weapon's second end. `partsOf` gives the items worn only as part of an item.
- `itemType`: the item's weapon or armour type (`m_Type`). `weaponType` and `armorType` are its typed forms; a shield's armour half's type is a shield type.
- `shieldArmor`, `shieldWeapon`: a shield's armour half and its bash weapon.
- `enchantmentsOf`: an item's type's enchantments, then its own; for a shield, its armour half's, then its bash weapon's.

## Twins

`twins.ts` derives Gear's twins (map ticket 29's rule 1, as amended after the review of build tickets 02 and 03). Items a Build can equip that share a display name, and whose kept fields are all equal apart from GUID and asset name, are one option. The pickers offer the lowest GUID among them; the others decode to it in a Build code. A part (a shield's armour half or bash weapon, a double weapon's second end) is compared without its name too, since it is never shown on its own. Twins are a derived view, so the loader computes them and `data/` never stores them (guide §3.4).

- `equippableItems`: the items a Build can equip: every shown item that isn't worn only as part of another.
- `itemPartSet`: the items worn only as part of another (a shield's armour half or bash weapon, a double weapon's second end), cached per blueprint map. An armour item whose type is a shield type is a shield's armour half even when no kept shield names it (WyrmwallArmorItem), since the game builds one only inside its shield (`BlueprintItemShield.ArmorComponent`; QA pass 6).
- `deriveTwins`: each twin, mapped to the item the pickers offer in its place, the lowest GUID among its twins. Inside it, `twinKey` is an item as rule 1 compares it, with its parts replaced by their own keys; `asPart` leaves the name out too. Keys are cached per item and role (`twinKeyCache`).

## Helpers

- `sortKeys`: a value with its object keys sorted at every depth, so equal values have one JSON text.
- `byName`: items grouped by the name `nameOf` gives them, in first-seen order, leaving out the items it gives no name.
- `fingerprintOf`: eight hex digits of a 32-bit FNV-1a hash of a value's key-sorted JSON. A hand-written summary records its blueprint's components' fingerprint (06c).
- `DataFile`: one parsed file, with its path relative to the data root (`classes/FighterClass.<guid>.json`).

## Design notes

- The types use the game's names unrenamed, including its misspellings (`CharcaterLevelRestrictions`, `IngorePrerequisiteCheck`, the `Ecnchantments` folder), so the data and the game's code read the same (ADR 0005, `CODING_STANDARDS.md`).
- A few cited types aren't one-to-one with a C# class: `WornItem` stands for the single-slot item classes, `StoryCondition` for three story conditions, `PrerequisiteBase` and `ConditionBase` for the game's base classes, and `AddFactAction` for the game's `AddFact` action.

## Tests

The folder has no tests of its own: the loader's tests (`engine/load`) and the modules that read these types exercise them.
