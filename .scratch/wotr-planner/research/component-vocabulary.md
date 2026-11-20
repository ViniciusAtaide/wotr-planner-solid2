# Component vocabulary for Summaries and Synergy links

Research for ticket 03 (`issues/03-component-vocabulary.md`), 2026-11-19. Data: BubblePrintsData dump `2.7.0x_0` (`blueprints_raw_2.7.0x_0.binz`, 236,660 blueprints). Behaviour: WrathDecompiled at `6ce4a6b` (`decompiled/Assembly-CSharp`). Blueprints are cited by asset name and GUID, code by file and member. No game text, dump content or code is reproduced here.

It builds on the Rust planner's census (`~/code/wotr-planner/.scratch/wotr-planner/research/component-vocabulary-2026-11-15.md` and its TSV). That census sorted every component type by planner category: prerequisites, grants, stat bonuses, the attack and caster lines. This one cuts the same reachable set differently, by the kind of game value a component names. Those kinds are weapon category and group, spell school and descriptor, ability score, bonus type (`ModifierDescriptor`), and conditions and effects. They are what Synergy links join on and what a generated Summary has to put into words.

## Answer in brief

- **Most of each kind sits on a few component types, but none of the five kinds is a single field.** On the 6,556 reachable facts, 1,596 blueprints carry at least one kind directly, on 155 component types (the "carriers"). The top 7 carriers cover 50% of those blueprints, the top 25 cover 80%, 50 cover 90% and 74 cover 95%. The other 82 carriers are used by 3 blueprints or fewer.
- **Reading the values is cheap. Saying what they mean is where the cost is.** One reader driven by declared field types finds every carrier with no per-component code. It takes the enum type of each field from the decompiled classes and adds two gate rules. The cost is in labelling what each carrier *does* with the value: a bonus to it, a save bonus against it, an immunity, a prerequisite, or a trigger on it. That label is needed once per carrier, so its cost follows the tail.
- **Closed enums give cheap links:** ability score, weapon category and group, spell school, spell descriptor, damage energy and bonus type. **Conditions and effects are not a closed vocabulary.** "Fear" is spread over descriptors, unit conditions and several component types. "Critical hits" are component types plus boolean trigger fields. "Flanking" is almost absent from typed fields (one condition, two `Outflank*` types and a mechanics flag).
- **The headline feats carry their weapon or school as the pick's parameter, not in a component field.** This covers Weapon Focus, Weapon Specialization, Improved Critical, Spell Focus and their Greater and Mythic versions. A link for them needs the Build's chosen value.
- **Reading through grants nearly doubles coverage.** 1,439 of the 5,227 shown facts carry a kind directly. Following their granted abilities, activatables and buffs (up to 3 hops) raises that to 2,564.

## 1. Method

1. **Dump decode.** The `.binz` layout is as the Rust planner's `tools/game-check/src/binz.rs` describes it. The blueprints are in chunk 33/0 as LZ4 blocks, and each record is four 7-bit-length strings: GUID, asset name, type and JSON. A throwaway decoder in the session scratchpad turned this into one line per blueprint.
2. **Reachable set.** I rebuilt the prior research's walk (its §1). The roots are `BlueprintRoot` (2d77316c72b9ed44f888ceefc2a131f6) `Progression`: its 40 classes, 14 mythic classes and 12 races, plus `m_FeatsProgression`, `m_BasicFeatSelection` and `m_DeitySelection`, 69 roots in all. The walk follows the same grant edges.
   - **Ring 0 has 8,532 blueprints** (the prior census found 8,528; the small differences are in edge details). Of these, 6,556 are facts (features, selections, progressions, classes, archetypes, races, permanent buffs and unit facts), 1,931 are granted abilities and activatables, and 45 are spellbooks.
   - **Ring 1 is my extension.** It follows every reference from ring-0 abilities, activatables and buffs to buffs, abilities, activatables, features and area effects, then their grants. That adds 4,473 combat-time blueprints: 2,878 buffs, 990 abilities, 321 features and 261 area effects.
3. **Typed-field census.** I indexed the decompiled `Assembly-CSharp`: 2,913 `TypeId` attributes, 9,684 classes with their serialized fields and base chains, and 716 enums. The `$type` GUID of each component maps to its class through `TypeId`.
   - Every JSON object in a blueprint is walked: the header, components, and nested conditions and actions. A field counts when its *declared* C# type is one of the kinds below. Plain nested structs are typed through the declaring field.
   - A hit is attributed to its top-level component (the **carrier**), the nested element and the field.
   - Header fields count under the carrier `(header)`.

| Kind | Declared types |
| --- | --- |
| weapon category | `WeaponCategory` |
| weapon group | `WeaponFighterGroup`, `WeaponFighterGroupFlags` |
| weapon subcategory | `WeaponSubCategory` |
| weapon type | `BlueprintWeaponTypeReference` |
| weapon range | `WeaponRangeType` |
| spell school | `SpellSchool`, `SpellSchoolFlag` |
| spell descriptor | `SpellDescriptorWrapper` (a `long` of `SpellDescriptor` flags, decoded per bit) |
| stat | `StatType`, split into the six ability scores and other stats |
| bonus type | `ModifierDescriptor` |
| unit condition | `UnitCondition` |
| mechanics flag | `AddMechanicsFeature.MechanicsFeatureType` |
| damage energy | `DamageEnergyType` |
| parameter type | `FeatureParameterType` |

4. **Gates.** Several of these enums have a real member at 0: `WeaponCategory.UnarmedStrike`, `WeaponRangeType.Melee`, `DamageEnergyType.Fire` and `AttackType.Melee`. A field left at its default therefore looks like a real value. Two rules handle this, and they removed 2,164 false hits:
   - **`Check*` gate.** A value counts only when the matching `Check*` boolean beside it is true. For example, `AbstractWeaponTrigger.IsSuitable(RuleAttackWithWeapon)` reads `Category` only under `CheckWeaponCategory` (`Kingmaker/UnitLogic/Mechanics/Components/AbstractWeaponTrigger.cs`).
   - **Damage energy.** A damage description's `Energy` counts only when its `Type` is `Energy`.
5. **Unused fields filtered.** The coverage numbers below drop the following:
   - `ContextRankConfig.m_Stat`, unless the base type is `StatBonus` or `BaseStat`. These are the only base types that read it in `ContextRankConfig.GetBaseValue`; 188 of 325 set ability values are never read.
   - `ContextRankConfig.m_SpecificModifier`, which is set to something other than `None` exactly once.
   - `Recommendation*` components, `RecalculateOnStatChange` hooks, and class or archetype `RecommendedAttributes`.
6. **Keyword probe for effects.** Effect kinds such as flanking and critical hits are not enums, so I also matched component and element type names, and true boolean field names, against keyword patterns.

## 2. Per kind (ring 0 facts unless stated)

"Carriers" are component types. "90%" means how many of the top carriers cover 90% of the blueprints that carry the kind. "Tail" means carriers used by 3 blueprints or fewer.

| Kind | Facts | Carriers | 80/90/95% | Tail | Granted abilities | Ring 1 |
| --- | --- | --- | --- | --- | --- | --- |
| ability score | 460 | 26 | 7/8/12 (measured before filtering) | 12 | 131 | 531 |
| other stats (skills, saves, AC, BAB, attack) | 560 | 26 | 4/5/9 | 15 | 8 | 446 |
| bonus type (`ModifierDescriptor`) | 597 | 69 | 12/26/38 | 40 | 5 | 928 |
| weapon category | 216 (+19 parametrized) | 24 | 8/11/16 | 13 | 5 | 94 |
| weapon group | 21 | 7 | 3/5/6 | 4 | 3 | 36 |
| weapon subcategory | 12 | 5 | 4/4/5 | 3 | 0 | 6 |
| weapon type (reference) | 23 | 7 | 3/5/6 | 4 | 1 | 86 |
| weapon range (melee/ranged) | 42 | 8 | 2/3/3 | 5 | 3 | 79 |
| spell school | 28 (+7 parametrized) | 10 | 5/8/9 | 7 | 243 | 449 |
| spell descriptor | 200 | 21 | 5/9/13 | 12 | 486 | 1,128 |
| unit condition | 46 | 3 | 1/1/2 | 1 | 7 | 280 |
| mechanics flag | 83 | 1 (86 flag values) | 1/1/1 | 0 | 0 | 114 |
| damage energy | 188 | 13 | 3/6/8 | 6 | 156 | 522 |

### Weapon category and group

- **Category carriers:** `AddProficiencies` (76), `SacredWeaponFavoriteDamageOverride` (33, the deity's sacred weapon), `PrerequisiteProficiency` (33), `WeaponTypeDamageStatReplacement` (32, as on `DeftStrike` b63a316cb172c7b4e906a318a0621c2c), `AddBackgroundWeaponProficiency` (24), `PrerequisiteNotProficient` (22) and `PrerequisiteConditionForWeaponCategory` (12). After those come `AddInitiatorAttackWithWeaponTrigger` (9 once gated), `AddParametrizedFeatures` (9) and a tail of 13. In ring 1 the triggers dominate: `AddInitiatorAttackWithWeaponTrigger`, `IncreaseDiceSizeOnAttackCustomProgressions`, `AddTargetAttackRollTrigger` and `ManeuverOnAttack`.
- **Parametrized features.** 19 `BlueprintParametrizedFeature` carry `ParameterType: WeaponCategory`. Among them are `WeaponFocus` (1e1f627d26ad36f43bbd26cc2bf8ac7e), Greater, Mythic, the three Weapon Specialization feats, Improved Critical and its Mythic and Trickster versions, `SlashingGrace`, `FencingGrace`, `DuelingMastery`, `WeaponMasteryParametrized` and `SwordSaintChosenWeaponFeature`. Their components hold no category at all: `WeaponFocusParametrized.OnEventAboutToTrigger` compares the attack's weapon category with the fact's `Param` (`Kingmaker/Designers/Mechanics/Facts/WeaponFocusParametrized.cs`). The category is the Build's pick value.
- **Group carriers:** `WeaponGroupDamageBonus` (14), `WeaponGroupAttackBonus` (13, as on `WeaponTrainingAxes` 1b18d6a1297950f4bba9d121cfc735e9), triggers and restrictions. Only 21 facts carry a group.
- **Category to group comes from the weapon types, not from features.** The 145 `BlueprintWeaponType` blueprints give `Category` and `m_FighterGroupFlags`, covering 78 categories. Six categories have more than one group set across their types, such as `LightCrossbow`, `Urgrosh` and `HeavyFlail`, so their link is "any of". Subcategories such as Light and Finessable come from a code extension (`HasSubCategory`), not from data.

### Spell school and descriptor

- **School on facts is thin (28).** It appears on `SavingThrowBonusAgainstSchool` (10, as on `BlightbornElf` 2a300f4e0c13495bbde59160809fce7f), `AddOppositionSchool` (8), `IncreaseSpellSchoolDC` (4) and a tail of 7. Seven parametrized features carry it as their pick parameter. They include `SpellFocus` (16fa59cc9a72a6043b566b49184f53fe), Greater and Mythic, `SchoolMasteryMythicFeat`, `ExpandedArsenalSchool` and `AugmentSummoning`. `SpellFocusParametrized.OnEventAboutToTrigger` and `GetBonusDC` compare against `Param` in the same way.
- **School on abilities sits on one carrier.** `SpellComponent.School` covers 241 of the 243 granted abilities with a school (as on `BloodBlasphemyAbility` e602b239b27f4f5abe74e496e4c15b62).
- **Descriptors on facts:** `BuffDescriptorImmunity` (85), `SavingThrowBonusAgainstDescriptor` (48), `SpellImmunityToSpellDescriptor` (41), `IncreaseSpellDescriptorDC` (19), `DraconicBloodlineArcana` (11), then a tail. `SavingThrowBonusAgainstDescriptor.OnEventAboutToTrigger` matches the save's source context descriptor against its own (`Kingmaker/UnitLogic/FactLogic/SavingThrowBonusAgainstDescriptor.cs`). On abilities and buffs, `SpellDescriptorComponent` is nearly everything: 479 of the 486 granted abilities.
- **Descriptor values.** The enum has 63 flags; 59 occur. The most common are Polymorph, Summoning, Fire, MindAffecting, Poison, Cold, Disease, Fear, Hex, Compulsion and Electricity. Many are effect tags rather than spell traits, for example Shaken, Sickened, Paralysis, BreathWeapon and Bomb.

### Ability score and other stats

- **Ability-score carriers (460 facts):** `ReplaceAbilitiesStat` (128, the stat an ability's DC reads, as on `AirDomainBaseFeature` 39b0c7db785560041b436b558c9df2bb) and `PrerequisiteStatValue` (114). Then come `BindAbilitiesToClass` (55), `AddStatBonus` (43), `AddContextStatBonus` (43), `WeaponTypeDamageStatReplacement` (32), `AddStatBonusIfHasFact` (27), live `ContextRankConfig` (27), `ReplaceStatBaseAttribute` (15) and a tail.
- **Abilities:** `ContextRankConfig` (StatBonus base) and `ContextCalculateAbilityParams*`, the DC and caster-level stat.
- **Other stats:** skills, saves, AC, BAB and `AdditionalAttackBonus` ride on `AddStatBonus`, `AddContextStatBonus`, `AddClassSkill`, `PrerequisiteStatValue` and class or archetype `ClassSkills` headers. This is the prior vocabulary's `StatBonus` and `ClassSkill` again.

### Bonus type (`ModifierDescriptor`)

- **This is the widest kind:** 597 facts on 69 carriers, 40 of them in the tail. Nearly every bonus component declares a descriptor. The top two are `AddContextStatBonus` (179) and `AddStatBonus` (163). After them come `SavingThrowBonusAgainstDescriptor` (48), `AddStatBonusIfHasFact` (27) and `AddBackgroundWeaponProficiency` (24, the field is `StackBonusType`). Then `IncreaseSpellDescriptorDC`, `ManeuverBonus`, `ModifyD20` (two descriptor fields), the weapon-group bonuses and `*AgainstFactOwner` bonuses.
- **Values on facts:** None (untyped) 291, UntypedStackable 252, Racial 193, Enhancement 54, NaturalArmor 43, DemonBonus 28, WeaponTraining 26, Dodge 25, Morale 18, Insight 16, Profane 16 and Mythic 13. 26 values occur in all.
- **Stacking is code.** `ModifierDescriptorHelper.DefaultStackingDescriptors` and `IsStackable` (`Kingmaker/Enums/ModifierDescriptorHelper.cs`) decide it. A "same bonus type, won't stack" link therefore needs the descriptor and the target stat together.

### Conditions and effects

- **Unit conditions (46 facts) are three carriers.** `AddConditionImmunity` (42, as on `DrunkenCourageFeature` 479dd8ad30eb433b9ad8a7fbaedd2fd9, Frightened), `AddCondition` (6) and an ability restriction. Ring 1 adds `AddCondition` and `BuffStatusCondition` on buffs (280). 47 condition values occur.
- **Mechanics flags (83 facts) are one carrier with 86 values.** Each value is its own rule in code, for example `CannotBeFlanked` (6, as on `ImprovedUncannyDodge` 485a18c05792521459c7d06c63128c79), `Pounce` and `NaturalSpell`. The carrier is easy to read, but each value needs its own meaning.
- **Damage energy (188 facts):** `AddDamageResistanceEnergy` (107, as on `BloodlineAbyssalDemonicMight` 5c1c2ed7fe5f99649ab00605610b775b), `AddEnergyDamageImmunity` (25), `AddEnergyImmunity` (24), `AdditionalDiceOnAttack` (11) and a tail. On abilities it is the damage action's energy (156).
- **Themes, which the ticket names, cut across fields:**

| Theme | Facts | Granted abilities | Ring 1 | Where it lives |
| --- | --- | --- | --- | --- |
| fear | 26 | 8 | 62 | Descriptor (Fear, Shaken, Frightened) in save bonuses, immunities and `SpellDescriptorComponent`, plus `UnitCondition` Frightened or Shaken in immunities and `AddCondition`. At least 12 carrier/field pairs, for example `AssassinColdMindedFeature` dc71af4fbb014aae958c11fa10ec6ab3. |
| mind-affecting | 28 | 34 | 93 | Descriptor only (MindAffecting, Compulsion, Charm, Emotion). Same carriers as fear, for example `BeguilingImmunity` c532e8f7a393d0c4580f017d225d4fe2. |
| fire | 67 | 47 | 206 | Descriptor Fire or `DamageEnergyType` Fire, in resistances, immunities, damage actions and DC bonuses. |
| critical hits | 42 | 1 | 87 | Component types `AddImmunityToCriticalHits` (40), `CriticalConfirmationBonus`, `WeaponCriticalEdgeIncreaseStackable`, `CriticalConfirmationACBonus` and `ImprovedCritical*Parametrized`, plus a true `CriticalHit` boolean on attack triggers (34+7). About 31 types or fields, no enum. |
| flanking | about 3 | 0 | 1 | `ContextConditionIsFlanked` (1), `OutflankAttackBonus` (2) and `OutflankProvokeAttack`, plus the `CannotBeFlanked` mechanics flag (6). Mostly invisible in data: the flanking rules live in code. |
| other probes | | | | Combat maneuvers 41 facts on 19 types; sneak or precision 12; unarmed or natural 32 (`EmptyHandWeaponOverride`, `AddAdditionalLimb`); attacks of opportunity 10; two-weapon 1; charge 0 in facts and 7 in ring 1. |

## 3. Cost estimate for reading each kind

There are two layers, and they cost different amounts.

**A. Extraction is a fixed cost and does not grow with the tail.**
- **The reader.** A reader driven by declared field types covers every carrier at once: a component's `$type` → `TypeId` → declared field types → kind. It needs the two gate rules (`Check*` booleans, and damage `Type` = Energy) and a per-bit decode of `SpellDescriptorWrapper`.
- **The type table.** Generate it once from WrathDecompiled `6ce4a6b` as a table of component, field and kind, and ship that table rather than the code. That keeps to the copyright boundary, since it holds only field names and types. It has about 400 rows over the 155 fact carriers, or about 250 carriers counting ring 1.
- **Size.** The census scripts were about 300 lines of Python in all. Rough cost: one engine ticket.

**B. The relation is a per-carrier cost, and this is where the tail is.** Each carrier/field pair needs one role label: `bonus-to`, `bonus-against` (save or AC against X), `immune-to`, `resist`, `requires`, `proficient-with`, `uses-stat` (replaces an attack, damage or DC stat), `triggers-on`, `restricts-to` or `opposition`. A Synergy link needs that role, and a Summary needs a sentence pattern for it. A label is a table row with a code citation, minutes each. A sentence template is a little more.

| Kind | Labels for 90% / 100% of facts | Other cost | Rough size |
| --- | --- | --- | --- |
| ability score | 8 / 26 | Mostly the prior vocabulary's `StatBonus`, `Requires(Stat)`, `ReplaceAbilitiesStat` and `BindAbilitiesToClass`. | Small |
| weapon category | 11 / 24 | The Build's parameter for the 19 parametrized features, and the category-to-group table from weapon types (6 ambiguous). | Small to medium |
| weapon group | 5 / 7 | | Small |
| spell school | 8 / 10 | The parameter for 7 features, and `SpellComponent` for abilities. | Small |
| spell descriptor | 9 / 21 | `SpellDescriptorComponent` for abilities. You also have to choose which of the 59 flags are link-worthy (most are effect tags). | Small to medium |
| bonus type | 26 / 69 | The 40-carrier tail. A stacking link also needs the target stat and `DefaultStackingDescriptors`. As a Summary adjective ("racial", "morale") it is nearly free once the bonus carrier is labelled. | Medium |
| unit condition and energy | 1–6 / 3–13 | Small closed enums. | Small |
| mechanics flags | 1 / 1 | Each of the 86 values needs its own meaning. | Medium (per value) |
| fear and mind-affecting themes | ~12 pairs | A theme is a hand-written union over descriptor and condition kinds. | Medium |
| critical and flanking themes | ~31 types and fields / nearly none | An open set of type names and booleans, or rules that live in code. Not derivable generically, so hand overrides fit (ADR 0001). | High, or hand-written |

**Summaries.** Directly, 25 labelled carriers voice 80% of the facts that carry a kind, and 50 carriers voice 90%. Then:
- **Through grants.** Shown facts that say something only through granted abilities and buffs (+1,125) need the grant edge (`AddFacts`) and ring-1 carriers. Those carriers are dominated by `SpellDescriptorComponent`, `SpellComponent`, `ContextRankConfig`, `AddContextStatBonus`, `AddStatBonus`, `BuffMovementSpeed` and damage actions.
- **No kind at all.** About 2,660 shown facts carry no kind even through grants (5,227 shown − 2,564). Their Summaries come from the prior vocabulary's grants, prerequisites and resources, or from hand overrides.

## 4. Implications for the v1 decision

- **Cheapest strong link kinds** (closed enum, few carriers, high reach): ability score, weapon category (including parametrized picks, which need the Build's chosen values), weapon group through the weapon-type table, spell school (including parametrized picks), damage energy, and a curated subset of spell descriptors.
- **Bonus type** is better as Summary wording and a stacking note than as a link kind in v1, because of its 69-carrier tail and the extra target stat a link needs.
- **Effect themes** (fear, mind-affecting, critical hits, flanking) are not one field. Fear and mind-affecting fall out of descriptor plus condition at medium cost. Critical hits and flanking would need hand-kept lists, so they suit overrides or a later version.

## 5. Caveats

- Ring 0 is a re-implementation of the prior walk and is within 0.05% of its count, with small differences in feature, ability and buff counts. Ring 1 follows every reference from abilities and buffs and may include some content no player reaches.
- The `Check*` gate rule matches flags by name tokens, so a component whose gate has an unusual name could still count a default value. The rule removed 2,164 hits, and the remaining top carriers were checked by hand against their classes' fields.
- Counts are blueprints, not Build-relevant picks. Hidden carriers (1,329 of the 6,556 facts are hidden) count when they are reachable.
- The scripts and intermediate data were in the session scratchpad (`binzdump`, `cs.py`, `walk.py`, `census.py`, `report.py`, `refine.py`, `union.py`). They are not kept in the repo.
