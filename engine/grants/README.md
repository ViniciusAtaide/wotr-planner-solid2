# Grants (G)

G is the grant index (guide §4): the one place that answers "which places grant this fact, and what does this entry grant?". It is built once from checked data, over every kind of grant the planner holds. Like P, it reads through two complete tables: `blueprintReaders`, keyed by every blueprint type, for the grants a blueprint's own fields make, and `componentReaders`, keyed by every grant component type. Who holds a fact in a Build is the walk's record, not G's (build ticket 03).

Every citation of the game's code lives in `cites.ts`, keyed by the identifier that ports it (`componentReaders.AddFacts`, `GrantKind.levelEntry`, …); paths there are relative to `decompiled/Assembly-CSharp/Kingmaker/`.

## Public entry

- `buildGrantIndex(data)`: the `GrantIndex`.
- `GrantIndex`, `Grant`, `GrantKind`, `GrantParam`, `Climbed`: the index and its answers.
- `fieldGrantKinds`, `FieldGrantKind`: the grant kinds a blueprint's own fields make.
- `grantTypes`, `isGrant`: the grant component types G reads.
- `removes(grant)`: whether a grant takes its fact away.
- `equipmentGrants(data, G, item)` and `EQUIPMENT_GRANT_KINDS`: the facts a worn item gives, in order: each of its enchantments (`enchantmentsOf`: its type's, then its own; a shield's armor and weapon parts), then each enchantment's `AddUnitFeatureEquipment` and `AddUnitFactEquipment` grants. The walk's `wear` gains exactly these, and describe composes an item's Summary from them.
- `actionGrant`, `ActionGrant`: what a grant action gives.
- `reachableFromRoot`, `reachableFromGear`: what a Build can come to hold.
- `grantorKind`: a grantor's kind, as the index groups them.
- `cites`: the citation registry.

## The index (`GrantIndex`)

- `grantorsOf(fact)`: every place that grants the fact, removals excluded.
- `grantsOf(entry)`: everything the entry grants or removes.
- `slotsOpenedBy(entry)`: the selections whose slots the entry opens: the selections it grants (each opens a slot when held) and, for a selection, its options that are themselves selections (each opens a nested slot at the same level when picked).
- `climb(fact, stopAt, within)`: the grantors above the fact within `within` (by default, what a Build can reach from the root), breadth first: each once, at the fewest grant steps up, with the nearest grant level on its path. The climb goes on past every grantor except those `stopAt` admits, which it returns without climbing above. Each `Climbed` gives the grantor, its `depth` (grant steps up from the fact) and its `level` (the nearest grant level on the path, when a grant on it carries one).
- `namedGrantorsByKind(fact)`: for a fact a player never sees (`isShown`: nameless or hidden), its nearest shown grantors that a Build can reach, grouped by kind (`grantorKind`: a grantor's first feature group, such as `Deities` or `BloodLine`, else its blueprint type). Grantors that aren't shown are climbed through. The refusals word such a prerequisite from this ("Needs a deity that allows it", map ticket 19).

A `Grant` names its `grantor`, the `granted` fact and its `kind`. `level` is the level for level entries and archetype adds and removes, and the class level an `AddFeatureOnClassLevel` grants from (none when it grants only before that level). `param` is the parameter, for a grant of a parametrized feat at one parameter, or of a parametrized feat's option.

`GrantParam` is the parameter a parametrized feat is held at (the game's feature parameter), in the one field the feat's `ParameterType` uses: a weapon category, a spell school, a stat, or a blueprint.

## Grant kinds (`GrantKind`)

A grant component's kind is its type, and a grant action's is its action type. The others are planner names, each standing for a field or a component part of the game's:

- `root`: `BlueprintRoot`'s progression root: every character's character-level feats, and the classes and races on offer. Also `m_DefaultPlayerCharacter`, the unit every main character is made from, whose `AddFacts` a Build holds (map 28).
- `classProgression`: a class's progression (`m_Progression`), held from its first level.
- `classArchetype`: an archetype the class can be taken with (`m_Archetypes`): a Class choice, not a fact.
- `levelEntry`: a progression's `LevelEntries`: granted at `level` of the progression.
- `archetypeAdd`: an archetype's `AddFeatures`: granted at `level` of the class taken with the archetype.
- `archetypeRemove`: an archetype's `RemoveFeatures`: removed, not granted, at `level`.
- `selectionOption`: a selection's `m_AllFeatures`: an option of the selection's slot.
- `raceFeature`: a race's `m_Features`: granted at level 0 with the race.
- `AddFeatureOnClassLevel`: held from `level` of the component's class (before it, with `BeforeThisLevel`).
- `AddFeatureOnAlignment`: held while the character's alignment has the component's axis.
- `AddFeatureOnSkill`: held once a stat's permanent value reaches the component's minimum.
- `AddParametrizedFeatures`: a parametrized feat held at a set parameter, which the grant carries.
- `AddFeatureParametrized`: an option of a `FeatureSelection` parametrized feat, held when the feat is taken with it as its parameter, which the grant carries.
- `FactSinglify`: its `m_NewFacts`, held one copy each once the grantor is first gained.
- `FactSinglifyRemove`: its `m_OldFacts`, removed, not granted, when the grantor is first gained.
- `KensaiChosenWeapon`: a parametrized feat held at the grantor's own weapon category, which the Build's pick of the grantor sets, so the grant carries no parameter.
- `ContextActionAddFeature`: run by `AddFactContextActions` when the fact is gained, possibly under `Conditional` trees.
- `AddFact`: an `AddFact` action, from `ActivateTrigger` or `AddFactContextActions`.
- `ContextActionApplyBuff`: from `AddFactContextActions`, a permanent buff application of a buff that is a Grant carrier (map ticket 23).
- `AbilityApplyFact`: a choice-carrying ability's option: a pick made through the ability, a daily choice and not part of a Build (map tickets 24 and 26).
- `GearUnlock`: `MonkNoArmorFeatureUnlock`, `MonkNoArmorAndMonkWeaponFeatureUnlock` and `HasArmorFeatureUnlock`: held while the Gear fits.
- `BuffExtraEffects`: the extra buff, held while the checked buff is on (a Shifter aspect a Build keeps on).
- `ActivatableBuff`: the buff (`m_Buff`) a toggled ability applies while on.
- `RemoveFeatureOnApply`: removes the fact, once, when the grantor is gained.
- `itemEnchantment`: an item's enchantments, its own `m_Enchantments` and its weapon or armour type's, held while the item is worn.
- `shieldPart`: a shield's armour half and bash weapon, worn with it.
- `AddUnitFeatureEquipment`, `AddUnitFactEquipment`: a fact the wielder holds while the enchanted item is worn.

`removes` is true for the kinds that take a fact away (`REMOVAL_KINDS`): `archetypeRemove`, `RemoveFeatureOnApply` and `FactSinglifyRemove`.

`fieldGrantKinds` lists the kinds a blueprint's own fields make (through `blueprintReaders`), as against its grant components. The coverage check (`engine/areas.test.ts`) holds the walk to applying each, as it does for `grantTypes`.

## Rules

### What a blueprint's own fields grant (`blueprintReaders`)

- `BlueprintRoot`: what every character starts from or is offered: the feats progression, the classes and Mythic classes on offer, the races character creation offers, the Mythic starting class, the Legend stand-in and Legend, the deity and basic feat selections, and the unit the new game makes the main character from (`m_DefaultPlayerCharacter`, map 28).
- `BlueprintCharacterClass`: its progression, which applying the class's mechanics grants, and the archetypes it can be taken with.
- `BlueprintProgression`: each level entry's features, at its level, as the level-up helper updates the progression.
- `BlueprintArchetype`: its `AddFeatures` and `RemoveFeatures`, each at its level, as the progression's level entries are computed.
- `BlueprintFeatureSelection`: `m_AllFeatures`, the options of its slot.
- `BlueprintRace`: the race's features, at level 0, as selecting the race applies them.
- `BlueprintActivatableAbility`: `m_Buff`, the buff applied while the toggle is on.
- `BlueprintItemWeapon`, `BlueprintItemArmor` (`typedItem`): the item's enchantments, its weapon or armour type's and its own, as the item collects them (through `enchantmentsOf`, `engine/data/items.ts`).
- Every worn place's item type (`wornItem`, through `kindOf`): the item's own enchantments.
- `BlueprintItemShield`: its armour half and bash weapon. The armour half's type decides the shield proficiency the shield needs.
- Types whose own fields grant nothing (`nothing`); their components still may:
  - `BlueprintFeature`, `BlueprintBuff`, `BlueprintAbility`, `BlueprintUnit` and the enchantment types grant only through their components.
  - `BlueprintParametrizedFeature`: its options are granted by its `AddFeatureParametrized` component.
  - `BlueprintFeatureReplaceSpellbook`, `BlueprintFeatureSelectMythicSpellbook`: a spellbook is advanced or joined, not held.
  - `BlueprintStatProgression`, `BlueprintSpellsTable`, `BlueprintSpellbook`, `BlueprintMythicsSettings`: rule data, read by the walk.
  - `BlueprintWeaponType`, `BlueprintArmorType`, `BlueprintShieldType`: a type's enchantments count through the item made of it (`typedItem`).

### What each grant component gives or takes away (`componentReaders`)

- `AddFacts`: its facts.
- `AddFeatureOnClassLevel`: its feature, held from `Level`, or below it with `BeforeThisLevel` (then the grant has no level).
- `AddFeatureIfHasFact`, `AddFeatureOnApply`: its feature.
- `RemoveFeatureOnApply`: a removal of its feature.
- `AddFeatureOnAlignment`, `AddFeatureOnSkill`: its facts.
- `AddParametrizedFeatures`: each feat at its entry's parameter (`paramOf`).
- `AddFeatureParametrized`: the option the feat is taken with, which is the feat's own parameter; a parametrized feat's options are its `BlueprintParameterVariants`.
- `FactSinglify`: the old facts go, the new ones are held.
- `KensaiChosenWeapon`: its focus feat.
- `AddFactContextActions`: the grants in its `Activated` actions (`actionGrants`).
- `ActivateTrigger`: the grants in its `Actions` (`actionGrants`).
- `BuffExtraEffects`: its extra buff, as it checks and reapplies it.
- `AbilityApplyFact`: each of its facts is an option of the ability (the ability's conversions), which applying the ability then gives.
- `MonkNoArmorFeatureUnlock`, `MonkNoArmorAndMonkWeaponFeatureUnlock`, `HasArmorFeatureUnlock` (`gearUnlock`): `m_NewFact`, held while the Gear meets the component's condition.
- `AddUnitFeatureEquipment`, `AddUnitFactEquipment`: the fact the wielder holds while the item is worn.

### Grant actions

- `GRANT_ACTION_FIELDS`: the action types that grant (map ticket 23), each with the field that names what it grants: `ContextActionAddFeature` (`m_PermanentFeature`), `AddFact` (`m_Fact`), `ContextActionApplyBuff` (`m_Buff`).
- `actionGrant(type, action)`: whether an action grants a fact, and which. It is G's one answer, which the importer's allowlist also asks to decide which actions it keeps; `type` is the action's class name and `action` its fields, as kept or as the dump has them. A `ContextActionApplyBuff` grants for good only when `Permanent`: the game gives any other buff a duration. For a `ContextActionAddFeature`, `ActionGrant.rankFrom` is its `m_SetRankFrom`: the feature whose rank the granted one takes, when that is held.
- `actionGrants`: the grants in an action list, in both branches of its `Conditional` trees; the walk judges their conditions.

### Parameters

- `paramOf`: the parameter of one `AddParametrizedFeatures` entry, by the feat's `ParameterType`: a weapon category, a spell school, a skill's stat, or else a blueprint (`Custom`, `FeatureSelection` and the spell types). Undefined when the feat isn't held or the blueprint is unset.

## Design notes

- `reachableFromRoot`: every blueprint a Build can come to hold or choose: what G reaches from `BlueprintRoot` through grants, options and archetypes. Prerequisites matter only on these.
- `reachableFromGear`: every blueprint a Build can come to hold through its Gear: what G reaches from the items the data holds (the sourced ones, map ticket 12), through their enchantments and the facts those give.
- Both walk the grants from their start (`reach`), leaving removals out.
- `grantorKind`: a grantor's first feature group other than `None`, else its blueprint type, else `unknown`.

## Tests

`grants.test.ts` runs G on the committed `data/`. Each expectation is the game's own grant, from these blueprints:

- A level entry: `FighterProgression` `b50e94b57be32f74892f381ae2a8905a` grants `FighterFeatSelection` `41c8486641f7d6d4283ca9dae4147a9f` at level 1.
- What an entry grants, and the slots it opens: `BasicFeatsProgression` `5b72dd2ca2cb73b49903806ee8986325` grants `BasicFeatSelection` `247a4068296e8be42890143f451b4b45` at every odd level, its table running on to 59 past Legend's 40, and `BackgroundsBaseSelection` and `DeitySelection` at level 1 (guide §7).
- A buff's action tree (map ticket 23): `CompositeBlastBuff` `cb30a291c75def84090430fbf2b5c05e` grants `MagmaBlastFeature` `408b25c6d9f223b41b935e6ec550e88d` through `AddFactContextActions`; the element features grant the buff through `AddFacts`.
- Named grantors by kind: `ChannelPositiveAllowed` `8c769102f3996684fb6e09a2c4e7e5b9` is granted by the deities that allow positive channelling (`AddFacts` on each deity feature, feature group `Deities`) and by `PriestOfBalanceArchetype` `a4560e3fb5d247d68fb1a2738fcc0855` (its `AddFeatures`), so a Build reaches it in two kinds of way.
- The root's offer: `FighterClass` `48ac8db94d5de7645906c7d0ad3bcfbd` and `HumanRace` `0a5d473ead98b0646b94495af250fdc4`.
- The character-creation unit (map ticket 28): `BlueprintRoot`'s `m_DefaultPlayerCharacter`, `StartGame_Player_Unit` `4391e8b9afbb0cf43aeba700c089f56d`, gives `ForbiddenDeityFeature` `c4403567ea9e5fe478ca38e3052fadc2` through `AddFacts`; `BaphometFeature` `bd72ca8ffcfec5745899ac56c93f12c5` and five other deities forbid it.
- A daily pick through an ability (map tickets 24 and 26): `MixedBloodlineAbility` `352b4e8bb5ca4301b6e6084304a86546` applies one of the bloodline features, among them `BloodragerAbyssalWanderingFeature` `6ed94b85f02f4c8a8f57ca49b400e358`; `MixedBloodlineFeature` `2c2283f5735d4e278f4088d9ff90edbb` gives the ability through `AddFacts`.
- A Gear unlock: `CunningElusionUnlockFeature` `91c8b2e3abdb4e2e807fddb668b619f8`'s `MonkNoArmorFeatureUnlock` holds `a71103ce28964f39b38442baa32a3031` while the character wears no armour and no shield.
- A Shifter aspect kept on: `ShifterAspectBear` `73ef2c330ff14e4bb2f5b7300622c552` gives the toggle `ShifterAspectBearAbility` `e66b1350f66949d997e31a57ce638fee`, which applies `ShifterAspectBearBuff` `a237792fc2644a4ebc6eefa2d325f181`. While it is on, `HeartOfEarthShifterFeature` `0b09ce94b5fe48dfa81b9a6f9d55a351`'s `BuffExtraEffects` adds `HeartOfEarthShifterBuff` `c3ad4aca75764e82ab047533a8d5aea6`, which grants `HeartOfEarthShifterFeature25` `1dd78b502a7f4ea0802b02385a8a585f`.
- An alignment grant: the game's one such grant of a held feature, `RuinFeature` `128a392be53575946bd907727eda3720` (Spell Penetration while chaotic), is on `RuinItem` `d9f0df00399b0f246ac75a6339342719`, which no source gives, so the keep rule trims it and the test builds its shape by hand. No blueprint the data holds carries `AddFeatureOnAlignment`: the 49 others grant only buffs, toggles or abilities, and the importer drops them (ticket 02a).
- A stat grant: `KitsuneHeritageClassic` `cd6cd774fb7cc844b8417193ee3a5ebe`'s `AddFeatureOnSkill` holds `KitsuneSpellLike` `a212fff222f57a841aa88bc49a5962d9` once Charisma is 11 or more.
- A parametrized feat at one parameter: `ZenArcherWayOfTheBowLongbowFocus` `2e659493076249f49821925b9b7dc389` grants `WeaponFocus` `1e1f627d26ad36f43bbd26cc2bf8ac7e` for longbows; `DisenchanterSpellFocusAbjuration` `60ed5ba87ac9e3241adc8212d3f6a24c` grants `SpellFocus` `16fa59cc9a72a6043b566b49184f53fe` for abjuration.
- A parametrized feat's option: `TricksterLoreReligionTier2Parametrized` `3e006bc9bbf0b884a8d8853350bee846` is taken for one of its domain variants, and `AddFeatureParametrized` grants that variant: `TricksterLoreReligionAirDomainFeature` `2dc50974356942c7b9f2ccfdcdeb7d61` when it is the parameter.
- `FactSinglify`: `AlchemistBombsFeature` `c59b2f256f5a70a4d896568658315b7d` holds `AlchemistBombsFact` `28384b1d7e25c8743b8bbfc56211ac8c`; `BloodlineSerpentineScaledSoulFeature` `18436c3dfd2000142ae087bf03740fdf` takes away `BloodlineSerpentineSerpentsFangBiteFeatureAddLevel1` `a26c62f50bec9fa4ab8ea7cd98fed19a`.
- A Sword Saint's chosen weapon: `SwordSaintChosenWeaponFeature` `c0b4ec0175e3ff940a45fc21f318a39a`'s `KensaiChosenWeapon` holds `WeaponFocus` `1e1f627d26ad36f43bbd26cc2bf8ac7e` at the weapon category the feat is taken for.
- A worn item: `VanwardItem` `4e59464e2d72ea44bb2a35e20f21ca8e` carries `VanwardEnchantment` `731c54f319b799f4ea3d4a08ab514076`, whose `AddUnitFeatureEquipment` gives `VanwardFeature` `883237e9dac35ba4fba0cffc2af73fb9` while the item is worn.
- A shield: `AncientWoodShieldItem` `a39fc345c33c4bf1aaec7988776039ba` has the armour half `10aca1295d7746f7b5c4b9cb6de1c286` (whose type decides the shield proficiency) and the bash weapon `62c90581f9892e9468f0d8229c7321c4`.
