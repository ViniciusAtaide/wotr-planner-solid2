// The committed data's shapes: the game's own blueprints, with the game's field names, filtered by the importer's
// allowlist (tools/importer/allowlist.ts, ADR 0005). Each type lists only the fields the allowlist keeps; a field
// joins a type and the allowlist together.

/** A blueprint GUID: 32 lowercase hex characters, the game's identity for a blueprint. */
export type Guid = string;

/** A reference to another blueprint, exactly as the dump writes it: `!bp_<guid>`. */
export type Ref = `!bp_${string}`;

/** The folder a kept blueprint is written to, under `data/`. */
export type Kind =
  | 'classes'
  | 'archetypes'
  | 'progressions'
  | 'selections'
  | 'features'
  | 'races'
  | 'tables'
  | 'spellbooks'
  | 'settings'
  | 'buffs'
  | 'abilities'
  | 'activatables'
  | 'items'
  | 'itemtypes'
  | 'enchantments'
  | 'units';

/** What every kept blueprint carries besides its allowlisted fields. */
export interface BlueprintBase {
  /** The game's class name, without its type GUID (`BlueprintCharacterClass`). */
  readonly $type: string;
  readonly guid: Guid;
  /** The internal asset name. It repeats across blueprints, so it is never an identity. */
  readonly assetName: string;
  /** The English display name (ADR 0006). Absent on blueprints the game never names. */
  readonly name?: string;
  /** The allowlisted components, in the game's order. */
  readonly Components: readonly Component[];
}

export interface Component {
  /** The component's class name, without its type GUID. */
  readonly $type: string;
}

// Game enums, by member name (the dump writes enums by name).

/** Kingmaker/RuleSystem/DiceType.cs. */
export type DiceType = 'Zero' | 'One' | 'D2' | 'D3' | 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20' | 'D100';

/** The six ability scores of Kingmaker/EntitySystem/Stats/StatType.cs. */
export type Attribute = 'Strength' | 'Dexterity' | 'Constitution' | 'Intelligence' | 'Wisdom' | 'Charisma';

/** Kingmaker/EntitySystem/Stats/StatType.cs: abilities, skills, checks and the other stats. */
export type StatType =
  | Attribute
  | 'Unknown'
  | 'HitPoints'
  | 'TemporaryHitPoints'
  | 'BaseAttackBonus'
  | 'AdditionalAttackBonus'
  | 'AdditionalDamage'
  | 'AttackOfOpportunityCount'
  | 'AC'
  | 'AdditionalCMB'
  | 'AdditionalCMD'
  | 'SaveFortitude'
  | 'SaveWill'
  | 'SaveReflex'
  | 'SkillMobility'
  | 'SkillAthletics'
  | 'SkillPersuasion'
  | 'SkillThievery'
  | 'SkillLoreNature'
  | 'SkillPerception'
  | 'SkillStealth'
  | 'SkillUseMagicDevice'
  | 'SkillLoreReligion'
  | 'SkillKnowledgeWorld'
  | 'SkillKnowledgeArcana'
  | 'CheckBluff'
  | 'CheckDiplomacy'
  | 'CheckIntimidate'
  | 'Initiative'
  | 'Speed'
  | 'SneakAttack'
  | 'Reach'
  | 'DamageNonLethal'
  | 'BonusCasterLevel';

/** Kingmaker/Enums/ModifierDescriptor.cs: a bonus's type, which decides how it stacks. */
export type ModifierDescriptor =
  | 'None'
  | 'Racial'
  | 'Dodge'
  | 'Competence'
  | 'Armor'
  | 'Shield'
  | 'Alchemical'
  | 'Circumstance'
  | 'Deflection'
  | 'Enhancement'
  | 'ArmorEnhancement'
  | 'ShieldEnhancement'
  | 'Inherent'
  | 'Insight'
  | 'Luck'
  | 'Morale'
  | 'NaturalArmor'
  | 'NaturalArmorEnhancement'
  | 'Profane'
  | 'Sacred'
  | 'Size'
  | 'Trait'
  | 'Resistance'
  | 'FearPenalty'
  | 'NegativeEnergyPenalty'
  | 'UntypedStackable'
  | 'DexterityBonus'
  | 'ConstitutionBonus'
  | 'Fatigued'
  | 'Crippled'
  | 'Feat'
  | 'StatDamage'
  | 'StatDrain'
  | 'Focus'
  | 'ShieldFocus'
  | 'Difficulty'
  | 'BaseStatBonus'
  | 'Penalty'
  | 'ArmorFocus'
  | 'Cooking'
  | 'Polymorph'
  | 'Helpless'
  | 'Encumbrance'
  | 'FavoredEnemy'
  | 'Other'
  | 'Prone'
  | 'Mythic'
  | 'DemonBonus'
  | 'Rage'
  | 'UniqueItem'
  | 'LockpickersKit'
  | 'FavouredClassBonus'
  | 'NaturalArmorForm'
  | 'Anomaly'
  | 'DLC'
  | 'WeaponTraining'
  | 'MasterShapeshifter'
  | 'SelfBonus'
  | 'Haste';

/** Kingmaker/UnitLogic/Mechanics/ContextValueType.cs. */
export type ContextValueType =
  | 'Simple'
  | 'Rank'
  | 'Shared'
  | 'CasterProperty'
  | 'TargetProperty'
  | 'CasterCustomProperty'
  | 'TargetCustomProperty'
  | 'AbilityParameter'
  | 'CasterNamedProperty'
  | 'TargetNamedProperty'
  | 'ContextProperty'
  | 'CasterBuffRank'
  | 'TargetBuffRank';

/** Kingmaker/UnitLogic/Mechanics/ContextValue.cs: a number, constant when `ValueType` is `Simple`. */
export interface ContextValue {
  readonly ValueType: ContextValueType;
  readonly Value: number;
}

// Stat bonuses.

/** UnitLogic/FactLogic/AddStatBonus.cs: a fixed bonus while the fact is held (a race's ability modifiers). */
export interface AddStatBonus extends Component {
  readonly $type: 'AddStatBonus';
  readonly Descriptor: ModifierDescriptor;
  readonly Stat: StatType;
  readonly Value: number;
  readonly ScaleByBasicAttackBonus: boolean;
}

/** Designers/Mechanics/Buffs/AddStatBonusIfHasFact.cs: a bonus while other facts are held (or, inverted, lacking). */
export interface AddStatBonusIfHasFact extends Component {
  readonly $type: 'AddStatBonusIfHasFact';
  readonly Descriptor: ModifierDescriptor;
  readonly Stat: StatType;
  readonly Value: RankedContextValue;
  readonly InvertCondition: boolean;
  readonly RequireAllFacts: boolean;
  readonly m_CheckedFacts: readonly Ref[];
}

// Grants (guide §7 "Ranks and grants"). A grant of an ability or a buff, which the planner doesn't hold, is dropped
// by the importer: from a list, the one reference; for a single grant, the whole component.

/** Kingmaker/Settings/GameDifficultyOption.cs. */
export type GameDifficultyOption = 'Custom' | 'Story' | 'Casual' | 'Normal' | 'Daring' | 'Core' | 'Hard' | 'Unfair';

/** UnitLogic/FactLogic/AddFacts.cs: holds its facts while its own fact is held, gated by the difficulty setting. */
export interface AddFacts extends Component {
  readonly $type: 'AddFacts';
  readonly m_Facts: readonly Ref[];
  readonly HasDifficultyRequirements: boolean;
  readonly InvertDifficultyRequirements: boolean;
  readonly MinDifficulty: GameDifficultyOption;
}

/** Designers/Mechanics/Facts/AddFeatureOnClassLevel.cs: grants from a class level on, or below it. */
export interface AddFeatureOnClassLevel extends Component {
  readonly $type: 'AddFeatureOnClassLevel';
  /** `null` counts the character level instead of a class's. */
  readonly m_Class: Ref | null;
  readonly Level: number;
  readonly m_Feature: Ref;
  readonly BeforeThisLevel: boolean;
  readonly m_AdditionalClasses: readonly Ref[] | null;
  readonly m_Archetypes: readonly Ref[] | null;
}

/** Designers/Mechanics/Facts/AddFeatureIfHasFact.cs: grants while another fact is held (or, with `Not`, lacking). */
export interface AddFeatureIfHasFact extends Component {
  readonly $type: 'AddFeatureIfHasFact';
  readonly m_CheckedFact: Ref;
  readonly m_Feature: Ref;
  readonly Not: boolean;
}

/** Designers/Mechanics/Facts/AddFeatureOnApply.cs: grants once, for good, when its fact is gained. */
export interface AddFeatureOnApply extends Component {
  readonly $type: 'AddFeatureOnApply';
  readonly m_Feature: Ref;
}

/** Designers/Mechanics/Facts/RemoveFeatureOnApply.cs: removes a fact when its own fact is gained. */
export interface RemoveFeatureOnApply extends Component {
  readonly $type: 'RemoveFeatureOnApply';
  readonly m_Feature: Ref;
}

/** Kingmaker/Enums/AlignmentComponent.cs: one axis of an alignment, which an alignment has or lacks. */
export type AlignmentComponent = 'None' | 'Neutral' | 'Good' | 'Evil' | 'Lawful' | 'Chaotic';

/**
 * Designers/Mechanics/Facts/AddFeatureOnAlignment.cs: holds its facts while the character's alignment has `Alignment`
 * (`Neutral` is either axis neutral), and drops them when it changes.
 */
export interface AddFeatureOnAlignment extends Component {
  readonly $type: 'AddFeatureOnAlignment';
  readonly Alignment: AlignmentComponent;
  readonly m_Facts: readonly Ref[];
}

/**
 * Designers/Mechanics/Facts/AddFeatureOnSkill.cs: holds its facts once the stat's permanent value reaches
 * `MinimalStat`, checked when the fact is gained and at each level up. Nothing takes them away if the stat drops.
 */
export interface AddFeatureOnSkill extends Component {
  readonly $type: 'AddFeatureOnSkill';
  readonly StatType: StatType;
  readonly MinimalStat: number;
  readonly m_Facts: readonly Ref[];
}

/**
 * One parametrized feat that AddParametrizedFeatures holds (its FeatureData): the feat, and its parameter in the one
 * field the feat's `ParameterType` picks (FeatureData.Param). The other fields keep the game's unset values.
 */
export interface ParametrizedFeatureGrant {
  readonly m_Feature: Ref;
  /** For `FeatureSelection` and `Custom` feats. */
  readonly ParamObject: Ref | null;
  readonly ParamSpellSchool: SpellSchool;
  readonly ParamWeaponCategory: WeaponCategory;
  /** For `Skill` feats. */
  readonly Stat: StatType;
}

/** UnitLogic/FactLogic/AddParametrizedFeatures.cs: holds parametrized feats, each at a set parameter. */
export interface AddParametrizedFeatures extends Component {
  readonly $type: 'AddParametrizedFeatures';
  readonly m_Features: readonly ParametrizedFeatureGrant[];
}

/**
 * Designers/Mechanics/Facts/AddFeatureParametrized.cs, on a `FeatureSelection` parametrized feat: the feature picked as
 * the parameter is also held. It has no fields; the options are the feat's `BlueprintParameterVariants`.
 */
export interface AddFeatureParametrized extends Component {
  readonly $type: 'AddFeatureParametrized';
}

/**
 * Designers/Mechanics/Facts/FactSinglify.cs: when its fact is first gained, takes away `m_OldFacts` and holds one copy
 * of each of `m_NewFacts` (Alchemist bombs, a Serpentine bloodline's bite).
 */
export interface FactSinglify extends Component {
  readonly $type: 'FactSinglify';
  readonly m_OldFacts: readonly Ref[];
  readonly m_NewFacts: readonly Ref[];
}

/**
 * Designers/Mechanics/Facts/KensaiChosenWeapon.cs, on a `WeaponCategory` parametrized feat: also holds the `m_Focus`
 * parametrized feat at the same weapon category, with that weapon's proficiency.
 */
export interface KensaiChosenWeapon extends Component {
  readonly $type: 'KensaiChosenWeapon';
  readonly m_Focus: Ref;
}

// Class skills, skill points and proficiencies (ticket 03's areas): each holds while its fact is held (OnTurnOn,
// OnTurnOff).

/** UnitLogic/FactLogic/AddClassSkill.cs: makes a skill a class skill. */
export interface AddClassSkill extends Component {
  readonly $type: 'AddClassSkill';
  readonly Skill: StatType;
}

/** UnitLogic/FactLogic/AddBackgroundClassSkill.cs: a background's class skill (ModifiableValueSkill.ClassSkill). */
export interface AddBackgroundClassSkill extends Component {
  readonly $type: 'AddBackgroundClassSkill';
  readonly Skill: StatType;
}

/** UnitLogic/FactLogic/AddSkillPointPerCharacterLevel.cs: one more skill point per character level. */
export interface AddSkillPointPerCharacterLevel extends Component {
  readonly $type: 'AddSkillPointPerCharacterLevel';
}

/** UnitLogic/FactLogic/AddProficiencies.cs: armour groups and weapon categories, for one race when restricted. */
export interface AddProficiencies extends Component {
  readonly $type: 'AddProficiencies';
  readonly m_RaceRestriction: Ref | null;
  readonly ArmorProficiencies: readonly ArmorProficiencyGroup[] | null;
  readonly WeaponProficiencies: readonly WeaponCategory[] | null;
}

/** UnitLogic/FactLogic/AddBackgroundWeaponProficiency.cs: a background's weapon proficiency. */
export interface AddBackgroundWeaponProficiency extends Component {
  readonly $type: 'AddBackgroundWeaponProficiency';
  readonly Proficiency: WeaponCategory;
}

/** UnitLogic/FactLogic/AddBackgroundArmorProficiency.cs: a background's armour proficiency. */
export interface AddBackgroundArmorProficiency extends Component {
  readonly $type: 'AddBackgroundArmorProficiency';
  readonly Proficiency: ArmorProficiencyGroup;
}

/** UnitLogic/FactLogic/IncreaseActivatableAbilityGroupSize.cs: one more toggle of the group can be on (map 32). */
export interface IncreaseActivatableAbilityGroupSize extends Component {
  readonly $type: 'IncreaseActivatableAbilityGroupSize';
  readonly Group: ActivatableAbilityGroup;
}

// Spellbooks as prerequisite gates (ticket 03's spellbook area).

/** Designers/Mechanics/Facts/AddSpellbookLevel.cs: one more base level in a spellbook, once, when its fact is gained. */
export interface AddSpellbookLevel extends Component {
  readonly $type: 'AddSpellbookLevel';
  readonly m_Spellbook: Ref;
}

/** Blueprints/Classes/Spells/SkipLevelsForSpellProgression.cs: class levels that don't raise the spellbook. */
export interface SkipLevelsForSpellProgression extends Component {
  readonly $type: 'SkipLevelsForSpellProgression';
  readonly Levels: readonly number[];
}

/** Blueprints/Classes/Spells/IsAlchemistSpellbook.cs: marks the alchemist's spellbook, which caster gates skip. */
export interface IsAlchemistSpellbook extends Component {
  readonly $type: 'IsAlchemistSpellbook';
}

// Ability scores (ticket 03's ability-score area): the Racial bonuses a stat prerequisite counts.

/** A ContextValue whose Rank reads its fact's ContextRankConfig of the same AbilityRankType. */
export type RankedContextValue = ContextValue & { readonly ValueRank: AbilityRankType };

/** Kingmaker/UnitLogic/Mechanics/AbilityRankType.cs: which ContextRankConfig a Rank value reads. */
export type AbilityRankType =
  | 'Default'
  | 'DamageDice'
  | 'DamageBonus'
  | 'ProjectilesCount'
  | 'DamageDiceAlternative'
  | 'StatBonus'
  | 'SpeedBonus';

/**
 * UnitLogic/FactLogic/AddContextStatBonus.cs: a bonus of Value × Multiplier, at least Minimal when HasMinimal. Only
 * Racial ones are kept: they are the permanent ones a stat prerequisite counts (ModifiableValue.Modifier.IsPermanent).
 */
export interface AddContextStatBonus extends Component {
  readonly $type: 'AddContextStatBonus';
  readonly Descriptor: 'Racial';
  readonly Stat: StatType;
  readonly Multiplier: number;
  readonly Value: RankedContextValue;
  readonly HasMinimal: boolean;
  readonly Minimal: number;
}

/** Kingmaker/UnitLogic/Mechanics/Components/ContextRankProgression.cs. */
export type ContextRankProgression =
  | 'AsIs'
  | 'Div2'
  | 'OnePlusDiv2'
  | 'StartPlusDivStep'
  | 'DivStep'
  | 'OnePlusDivStep'
  | 'MultiplyByModifier'
  | 'HalfMore'
  | 'BonusValue'
  | 'DelayedStartPlusDivStep'
  | 'StartPlusDoubleDivStep'
  | 'Div2PlusStep'
  | 'Custom'
  | 'DoublePlusBonusValue'
  | 'SquaredValue';

/**
 * UnitLogic/Mechanics/Components/ContextRankConfig.cs: the rank a Rank value reads. Only the base types a Racial bonus
 * uses are kept: `ClassLevel` (the Shifter's Wolverine aspect) and `FeatureList` (the Tiefling heritages' Charisma).
 */
export interface ContextRankConfig extends Component {
  readonly $type: 'ContextRankConfig';
  readonly m_Type: AbilityRankType;
  readonly m_BaseValueType: 'ClassLevel' | 'FeatureList';
  readonly m_Class: readonly Ref[];
  /** For FeatureList: the features whose holding counts one each. */
  readonly m_FeatureList: readonly Ref[];
  readonly m_ExceptClasses: boolean;
  readonly m_Progression: ContextRankProgression;
  readonly m_StartLevel: number;
  readonly m_StepLevel: number;
  readonly m_CustomProgression: readonly { readonly BaseValue: number; readonly ProgressionValue: number }[];
  readonly m_UseMin: boolean;
  readonly m_Min: number;
  readonly m_UseMax: boolean;
  readonly m_Max: number;
}

/** UnitLogic/FactLogic/ReplaceStatBaseAttribute.cs: a skill (or AC) reads another attribute. */
export interface ReplaceStatBaseAttribute extends Component {
  readonly $type: 'ReplaceStatBaseAttribute';
  readonly TargetStat: StatType;
  readonly BaseAttributeReplacement: Attribute;
  readonly ReplaceIfHigher: boolean;
}

/** Kingmaker/Enums/WeaponCategory.cs. */
export type WeaponCategory =
  | 'UnarmedStrike'
  | 'Dagger'
  | 'LightMace'
  | 'PunchingDagger'
  | 'Sickle'
  | 'Club'
  | 'HeavyMace'
  | 'Shortspear'
  | 'Greatclub'
  | 'Longspear'
  | 'Quarterstaff'
  | 'Spear'
  | 'Trident'
  | 'Dart'
  | 'LightCrossbow'
  | 'HeavyCrossbow'
  | 'Javelin'
  | 'Sling'
  | 'Handaxe'
  | 'Kukri'
  | 'LightHammer'
  | 'LightPick'
  | 'Shortsword'
  | 'Starknife'
  | 'WeaponLightShield'
  | 'SpikedLightShield'
  | 'Battleaxe'
  | 'Flail'
  | 'HeavyPick'
  | 'Longsword'
  | 'Rapier'
  | 'Scimitar'
  | 'Warhammer'
  | 'WeaponHeavyShield'
  | 'SpikedHeavyShield'
  | 'EarthBreaker'
  | 'Falchion'
  | 'Glaive'
  | 'Greataxe'
  | 'Greatsword'
  | 'HeavyFlail'
  | 'Scythe'
  | 'Shortbow'
  | 'Longbow'
  | 'Kama'
  | 'Nunchaku'
  | 'Sai'
  | 'Siangham'
  | 'BastardSword'
  | 'DuelingSword'
  | 'DwarvenWaraxe'
  | 'Estoc'
  | 'Falcata'
  | 'Tongi'
  | 'ElvenCurvedBlade'
  | 'Fauchard'
  | 'HandCrossbow'
  | 'LightRepeatingCrossbow'
  | 'HeavyRepeatingCrossbow'
  | 'Shuriken'
  | 'SlingStaff'
  | 'Touch'
  | 'Ray'
  | 'Bomb'
  | 'Bite'
  | 'Claw'
  | 'Gore'
  | 'OtherNaturalWeapons'
  | 'Bardiche'
  | 'DoubleSword'
  | 'DoubleAxe'
  | 'Urgrosh'
  | 'HookedHammer'
  | 'KineticBlast'
  | 'ThrowingAxe'
  | 'Tail'
  | 'Hoof'
  | 'Talon'
  | 'Tentacle'
  | 'Sting'
  | 'Slam'
  | 'Spike'
  | 'Wing'
  | 'SawtoothSabre';

/** Blueprints/Items/Armors/ArmorProficiencyGroup.cs. */
export type ArmorProficiencyGroup =
  | 'None'
  | 'Light'
  | 'Medium'
  | 'Heavy'
  | 'Buckler'
  | 'LightShield'
  | 'HeavyShield'
  | 'TowerShield'
  | 'LightBarding'
  | 'MediumBarding'
  | 'HeavyBarding';

/** Kingmaker/Blueprints/Classes/FeatureGroup.cs: a feature's kind (deity, bloodline…) and a selection's band. */
export type FeatureGroup =
  | 'None'
  | 'Feat'
  | 'CombatFeat'
  | 'WizardFeat'
  | 'Domain'
  | 'FinesseTraining'
  | 'RagePower'
  | 'RogueTalent'
  | 'FavoriteEnemy'
  | 'Discovery'
  | 'WeaponTraining'
  | 'Racial'
  | 'Trait'
  | 'SpecialistSchool'
  | 'OppositionSchool'
  | 'BloodLine'
  | 'FavoriteTerrain'
  | 'RangerStyle'
  | 'DefensivePower'
  | 'Mercy'
  | 'MagusArcana'
  | 'EldritchScionArcana'
  | 'StyleFeat'
  | 'TeamworkFeat'
  | 'Deities'
  | 'ChannelEnergy'
  | 'KiPowers'
  | 'ScaledFistKiPowers'
  | 'ExoticWeaponProficiency'
  | 'VivisectionistDiscovery'
  | 'ThassilonianSpellbook'
  | 'ArcaneTricksterSpellbook'
  | 'EldritchKnightSpellbook'
  | 'DragonDiscipleSpellbook'
  | 'DraconicBloodlineSelection'
  | 'MysticTheurgeArcaneSpellbook'
  | 'MysticTheurgeDivineSpellbook'
  | 'CreatureType'
  | 'AnimalCompanion'
  | 'DruidDomain'
  | 'BlightDruidDomain'
  | 'ClericSecondaryDomain'
  | 'AasimarHeritage'
  | 'RangerBond'
  | 'DruidBond'
  | 'TieflingHeritage'
  | 'KineticBlast'
  | 'KineticBlastInfusion'
  | 'KineticWildTalent'
  | 'KineticElementalFocus'
  | 'WitchHex'
  | 'WitchPatron'
  | 'Familiar'
  | 'OracleCurse'
  | 'ShamanHex'
  | 'ShamanSpirit'
  | 'MythicFeat'
  | 'MythicAbility'
  | 'OracleMystery'
  | 'OracleRevelation'
  | 'BloodragerBloodline'
  | 'MythicTrick1'
  | 'MythicTrick2'
  | 'MythicTrick3'
  | 'SkeletalChampion'
  | 'ImprovedSwordOfHeaven'
  | 'GreaterSwordOfHeaven'
  | 'ArcanistExploit'
  | 'DemonicAspect'
  | 'SelectMythicSpellbook'
  | 'AzataSuperpowerAbilities'
  | 'MountedCombatFeat'
  | 'WarpriestBlessing'
  | 'TerrainDominance'
  | 'SlayerTalent'
  | 'HellknightSigniferSpellbook'
  | 'EnlightenedPhilosopherMystery'
  | 'DivineHerbalistMystery'
  | 'UndergroundChemistDiscovery'
  | 'BackgroundSelection'
  | 'DhampirHeritage'
  | 'OreadHeritage'
  | 'KitsuneHeritage'
  | 'AngelMythcHalo'
  | 'DemonMajorAspect'
  | 'LichUniqueAbility'
  | 'LichSkeletalUpgrade'
  | 'MythicAdditionalProgressions'
  | 'DemonLordAspect'
  | 'TricksterFeat'
  | 'ReplaceSpellbook'
  | 'HalfOrcHeritage'
  | 'SeparatistSecondaryDomain'
  | 'DeceiverWay';

/** Kingmaker/Blueprints/Classes/Spells/SpellSchool.cs. */
export type SpellSchool =
  | 'None'
  | 'Abjuration'
  | 'Conjuration'
  | 'Divination'
  | 'Enchantment'
  | 'Evocation'
  | 'Illusion'
  | 'Necromancy'
  | 'Transmutation'
  | 'Universalist';

/** Kingmaker/Enums/WeaponRangeType.cs. */
export type WeaponRangeType =
  | 'Melee'
  | 'Ranged'
  | 'Touch'
  | 'Normal'
  | 'MeleeNormal'
  | 'RangedNormal'
  | 'MeleeTouch'
  | 'RangedTouch';

/** Kingmaker/Enums/PetType.cs. */
export type PetType = 'AnimalCompanion' | 'MythicSkeletalChampion' | 'AzataHavocDragon' | 'Clone' | 'NightHag';

// Conditions (Kingmaker/ElementsSystem/Condition.cs): the nested trees inside PrerequisiteCondition, which P reads as
// one leaf (map ticket 20). Every condition has `Not`, which inverts it.

interface ConditionBase {
  readonly Not: boolean;
}

/** Designers/EventConditionActionSystem/Conditions/OrAndLogic.cs: all (And) or any (Or) of its conditions. */
export interface OrAndLogic extends ConditionBase {
  readonly $type: 'OrAndLogic';
  readonly ConditionsChecker: { readonly Operation: 'And' | 'Or'; readonly Conditions: readonly Condition[] };
}

/** UnitLogic/Mechanics/Conditions/ContextConditionHasFact.cs: the character holds the fact. */
export interface ContextConditionHasFact extends ConditionBase {
  readonly $type: 'ContextConditionHasFact';
  readonly m_Fact: Ref;
}

/** Designers/EventConditionActionSystem/Conditions/HasFact.cs: the unit (here the main character) holds the fact. */
export interface HasFact extends ConditionBase {
  readonly $type: 'HasFact';
  readonly Unit: UnitEvaluator;
  readonly m_Fact: Ref;
}

/** UnitLogic/Mechanics/Conditions/ContextConditionCharacterClass.cs: at least `MinLevel` levels in the class. */
export interface ContextConditionCharacterClass extends ConditionBase {
  readonly $type: 'ContextConditionCharacterClass';
  readonly CheckCaster: boolean;
  readonly m_Class: Ref;
  readonly MinLevel: number;
}

/** Designers/EventConditionActionSystem/Conditions/UnitClass.cs: the unit's levels in the class, within limits. */
export interface UnitClass extends ConditionBase {
  readonly $type: 'UnitClass';
  readonly Unit: UnitEvaluator;
  readonly m_Class: Ref;
  readonly LimitMinLevel: boolean;
  readonly MinLevel: IntEvaluator | null;
  readonly LimitMaxLevel: boolean;
  readonly MaxLevel: IntEvaluator | null;
}

/** Designers/EventConditionActionSystem/Conditions/IsUnitMythicLevel.cs: the Mythic rank, within limits. */
export interface IsUnitMythicLevel extends ConditionBase {
  readonly $type: 'IsUnitMythicLevel';
  readonly Unit: UnitEvaluator;
  readonly CheckMinLevel: boolean;
  readonly MinLevel: IntEvaluator | null;
  readonly CheckMaxLevel: boolean;
  readonly MaxLevel: IntEvaluator | null;
}

/** UnitLogic/Mechanics/Conditions/ContextConditionBuffRank.cs: a fact's rank above `RankValue`. */
export interface ContextConditionBuffRank extends ConditionBase {
  readonly $type: 'ContextConditionBuffRank';
  readonly UseFactInsteadBuff: boolean;
  readonly Fact: Ref | null;
  readonly RankValue: ContextValue;
}

/** UnitLogic/Mechanics/Conditions/ContextConditionIsMainCharacter.cs; a Build is always the main character. */
export interface ContextConditionIsMainCharacter extends ConditionBase {
  readonly $type: 'ContextConditionIsMainCharacter';
}

/** UnitLogic/Mechanics/Conditions/ContextConditionIsWeaponEquipped.cs: the Gear's weapon, in a parameter check. */
export interface ContextConditionIsWeaponEquipped extends ConditionBase {
  readonly $type: 'ContextConditionIsWeaponEquipped';
  readonly JustCheckEmptyHand: boolean;
  readonly BothHandsAreEmpty: boolean;
  readonly CheckWeaponRangeType: boolean;
  readonly CheckWeaponCategory: boolean;
  readonly CheckSlot: boolean;
  readonly Slot: 'PrimaryHand' | 'SecondaryHand' | 'AdditionalLimbs';
  readonly RangeType: WeaponRangeType;
  readonly Category: WeaponCategory;
  readonly CheckOnCaster: boolean;
}

/**
 * Story state, which is always met (map ticket 21): EtudeStatus, CompanionInParty and IsCampaign. Only `Not` is kept;
 * the etudes, companions and campaigns they name are not blueprints the planner holds.
 */
export interface StoryCondition extends ConditionBase {
  readonly $type: 'EtudeStatus' | 'CompanionInParty' | 'IsCampaign';
}

export type Condition =
  | OrAndLogic
  | ContextConditionHasFact
  | HasFact
  | ContextConditionCharacterClass
  | UnitClass
  | IsUnitMythicLevel
  | ContextConditionBuffRank
  | ContextConditionIsMainCharacter
  | ContextConditionIsWeaponEquipped
  | (StoryCondition & { readonly $type: 'EtudeStatus' })
  | (StoryCondition & { readonly $type: 'CompanionInParty' })
  | (StoryCondition & { readonly $type: 'IsCampaign' });

/** The unit a condition looks at. For a Build both mean the main character. */
export type UnitEvaluator =
  | { readonly $type: 'PlayerCharacter' }
  | { readonly $type: 'ContextTargetUnit' }
  | { readonly $type: 'FactOwner' };

/** Designers/EventConditionActionSystem/Evaluators/IntConstant.cs, the only integer evaluator prerequisites use. */
export interface IntConstant {
  readonly $type: 'IntConstant';
  readonly Value: number;
}

export type IntEvaluator = IntConstant;

// Grant actions (map ticket 23): the part of an action tree that gives facts. AddFactContextActions keeps only these,
// under the Conditional trees around them; every other action is dropped by the importer and counted in its report.

/** Kingmaker/ElementsSystem/ActionList.cs, holding only grant actions. */
export interface ActionList {
  readonly Actions: readonly GrantAction[];
}

/** Designers/EventConditionActionSystem/Actions/Conditional.cs: IfTrue when the conditions hold, else IfFalse. */
export interface Conditional {
  readonly $type: 'Conditional';
  readonly ConditionsChecker: { readonly Operation: 'And' | 'Or'; readonly Conditions: readonly Condition[] };
  readonly IfTrue: ActionList;
  readonly IfFalse: ActionList;
}

/** UnitLogic/Mechanics/Actions/ContextActionAddFeature.cs: grants a feature for good. */
export interface ContextActionAddFeature {
  readonly $type: 'ContextActionAddFeature';
  readonly m_PermanentFeature: Ref;
  /**
   * When set, RunAction gives the granted feature this feature's rank: a Trickster Lore (Religion) domain's rank
   * feature, which raises its domain progression's level (m_FeaturesRankIncrease). The walk doesn't apply it yet
   * (build ticket 03c's last item).
   */
  readonly m_SetRankFrom: Ref | null;
}

/** UnitLogic/Mechanics/Actions/ContextActionApplyBuff.cs with Permanent set: holds a grant-carrying buff. */
export interface ContextActionApplyBuff {
  readonly $type: 'ContextActionApplyBuff';
  readonly m_Buff: Ref;
  readonly Permanent: boolean;
}

/** Designers/EventConditionActionSystem/Actions/AddFact.cs: gives the unit (here the fact's owner) a fact. */
export interface AddFactAction {
  readonly $type: 'AddFact';
  readonly Unit: UnitEvaluator;
  readonly m_Fact: Ref;
}

export type GrantAction = Conditional | ContextActionAddFeature | ContextActionApplyBuff | AddFactAction;

/** Designers/EventConditionActionSystem/Events/ActivateTrigger.cs: runs `Actions` when its fact is gained, if `Conditions` hold. */
export interface ActivateTrigger extends Component {
  readonly $type: 'ActivateTrigger';
  readonly Conditions: { readonly Operation: 'And' | 'Or'; readonly Conditions: readonly Condition[] };
  readonly Actions: ActionList;
}

/** UnitLogic/Mechanics/Components/AddFactContextActions.cs: runs `Activated` when its fact is gained. */
export interface AddFactContextActions extends Component {
  readonly $type: 'AddFactContextActions';
  readonly Activated: ActionList;
}

/**
 * A buff that carries grants (map ticket 23): granted by a held fact, and granting held features or other such buffs.
 * Only its grant components are kept.
 */
export interface BlueprintBuff extends BlueprintBase {
  readonly $type: 'BlueprintBuff';
  /** BuffCollection.PrepareFactForAttach: what a second grant of a held buff does. */
  readonly Stacking: StackingType;
}

/** Kingmaker/UnitLogic/Buffs/Blueprints/StackingType.cs, as far as kept buffs use it (no Rank). */
export type StackingType = 'Replace' | 'Prolong' | 'Ignore' | 'Stack' | 'Poison' | 'Summ';

/**
 * An ability that carries a choice (map ticket 26): a held fact grants it, and its AbilityApplyFact applies one of
 * a list of held features. Every pick made through one is a daily choice, not part of a Build (map tickets 24 and 26).
 * Only its AbilityApplyFact is kept.
 */
export interface BlueprintAbility extends BlueprintBase {
  readonly $type: 'BlueprintAbility';
}

/** UnitLogic/Abilities/Components/AbilityApplyFact.cs: applies the picked fact, replacing this ability's last pick. */
export interface AbilityApplyFact extends Component {
  readonly $type: 'AbilityApplyFact';
  /** CasterHasNoFact: the pick must be a fact not held yet (IsAbilityRestrictionPassed). */
  readonly m_Restriction: 'CasterHasNoFact' | 'CasterHasFact';
  readonly m_Facts: readonly Ref[];
}

/** UnitLogic/ActivatableAbilities/ActivatableAbilityGroup.cs: toggles that share a limit (a Shifter's aspects). */
export type ActivatableAbilityGroup =
  | 'None'
  | 'BardicPerformance'
  | 'StyleStrike'
  | 'DivineWeaponProperty'
  | 'ArcaneWeaponProperty'
  | 'TrueMagus'
  | 'Judgment'
  | 'DebilitatingStrike'
  | 'CriticalFeat'
  | 'BarbarianStance'
  | 'MetamagicRod'
  | 'MagicArrows'
  | 'MagicBolts'
  | 'ChangeShape'
  | 'SerpentsFang'
  | 'RingOfCircumstances'
  | 'DuelistCripplingCritical'
  | 'WizardDivinationAura'
  | 'CombatStyle'
  | 'Wings'
  | 'TransmutationPhysicalEnhancement'
  | 'FormInfusion'
  | 'SubstanceInfusion'
  | 'ShroudOfWaterMode'
  | 'ElementalOverflow'
  | 'GatherPower'
  | 'HellknightEnchantment'
  | 'SpiritWeaponProperty'
  | 'AzataMythicPerformance'
  | 'AeonGaze'
  | 'MagicalItems'
  | 'SacredWeaponProperty'
  | 'SacredArmorProperty'
  | 'HunterAnimalFocus'
  | 'CombatManeuverStrike'
  | 'FeralTransformation'
  | 'DrovierAspect'
  | 'ChangeShapeKitsune'
  | 'MasterHealingTechnique'
  | 'ArcaneArmorProperty'
  | 'DemonMinorAspect'
  | 'DemonMajorAspect'
  | 'RagingTactician'
  | 'WitheringLife'
  | 'SpellDance'
  | 'NumerianWeapon'
  | 'PowerAttack'
  | 'RobeSourceOfDividingPower'
  | 'ShifterAspect'
  | 'ShifterChimeraAspect'
  | 'ShiftersFury'
  | 'Familiar'
  | 'RingOfAroden'
  | 'EnergizedWildShape'
  | 'Rage'
  | 'GhostRiderLifeLink'
  | 'SorcerousClawsProperty'
  | 'SacredWordProperty'
  | 'Manifestation';

/**
 * A toggled ability a held fact gives, whose buff a kept BuffExtraEffects checks (a Shifter aspect). A Build can keep
 * it on, so what BuffExtraEffects adds while it is on counts as held.
 */
export interface BlueprintActivatableAbility extends BlueprintBase {
  readonly $type: 'BlueprintActivatableAbility';
  readonly m_Buff: Ref;
  readonly Group: ActivatableAbilityGroup;
  readonly WeightInGroup: number;
}

/** Designers/Mechanics/Facts/BuffExtraEffects.cs: adds an extra buff while a checked buff is on, unless the exception fact is held. */
export interface BuffExtraEffects extends Component {
  readonly $type: 'BuffExtraEffects';
  /**
   * CheckHadPrerequiredBuff also reads m_CheckedBuffList (map 32, amended), but every component that sets it is
   * dropped, so it isn't kept (the allowlist's notKept guards that).
   */
  readonly m_CheckedBuff: Ref | null;
  readonly m_ExtraEffectBuff: Ref;
  readonly m_ExceptionFact: Ref | null;
}

// Gear-conditioned grants (Designers/Mechanics/Buffs/): each holds `m_NewFact` while the Gear meets its condition.
// Their weapon- and armour-type lists join with the items area, which brings those types.

/** MonkNoArmorFeatureUnlock.cs CheckEligibility: no armour and no shield (or polymorphed). */
export interface MonkNoArmorFeatureUnlock extends Component {
  readonly $type: 'MonkNoArmorFeatureUnlock';
  readonly m_NewFact: Ref;
}

/** MonkNoArmorAndMonkWeaponFeatureUnlock.cs CheckEligibility: no armour or shield and a monk weapon (Zen Archer, Sohei vary). */
export interface MonkNoArmorAndMonkWeaponFeatureUnlock extends Component {
  readonly $type: 'MonkNoArmorAndMonkWeaponFeatureUnlock';
  readonly m_NewFact: Ref;
  readonly IsZenArcher: boolean;
  /** The bow types a Zen Archer's main hand must hold (IsZenArcher only). */
  readonly m_BowWeaponTypes: readonly Ref[];
  readonly IsSohei: boolean;
}

/** HasArmorFeatureUnlock.cs CheckEligibility: armour of given types or groups, optionally no shield. */
export interface HasArmorFeatureUnlock extends Component {
  readonly $type: 'HasArmorFeatureUnlock';
  readonly m_NewFact: Ref;
  readonly FilterByBlueprintArmorTypes: boolean;
  /** The armour types that count, when FilterByBlueprintArmorTypes is set (RestrictionsHelper.CheckArmor); null matches none. */
  readonly m_BlueprintArmorTypes: readonly (Ref | null)[];
  readonly FilterByArmorProficiencyGroup: boolean;
  /** An ArmorProficiencyGroupFlag flags value, as the game writes it: names, or raw bits (`-1`, `0` when unset). */
  readonly m_ArmorProficiencyGroupEntries: string | number;
  readonly m_DisableWhenHasShield: boolean;
}

// Items (map ticket 12): the equipment a Build's Gear can hold, with what the Gear checks read. An item's place is its
// `$type` (Items/Slots/EquipmentSlot.cs IsItemSupported, ArmorSlot.cs, HandSlot.cs). Its enchantments are the item's own
// plus its type's (BlueprintItem.CollectEnchantments); only those carrying a kept component are held.

/** Blueprints/Items/Weapons/BlueprintItemWeapon.cs: a main- or off-hand weapon. */
export interface BlueprintItemWeapon extends BlueprintBase {
  readonly $type: 'BlueprintItemWeapon';
  readonly m_Type: Ref;
  readonly m_Enchantments: readonly Ref[];
  /** A double weapon never goes in the off hand alone (ItemEntityWeapon.CanTakeOneHand). */
  readonly Double: boolean;
  /** A double weapon's second end, worn only as part of it (ItemEntityWeapon's constructor). */
  readonly m_SecondWeapon: Ref | null;
}

/** Blueprints/Items/Armors/BlueprintItemArmor.cs: body armour, or a shield's armour half. */
export interface BlueprintItemArmor extends BlueprintBase {
  readonly $type: 'BlueprintItemArmor';
  readonly m_Type: Ref;
  readonly m_Enchantments: readonly Ref[];
}

/** Blueprints/Items/Shields/BlueprintItemShield.cs: an off-hand shield, made of an armour half and a bash weapon. */
export interface BlueprintItemShield extends BlueprintBase {
  readonly $type: 'BlueprintItemShield';
  readonly m_ArmorComponent: Ref;
  readonly m_WeaponComponent: Ref | null;
}

/** An item for one worn place (Blueprints/Items/Equipment/BlueprintItemEquipmentSimple.cs). */
interface WornItem<T extends string> extends BlueprintBase {
  readonly $type: T;
  readonly m_Enchantments: readonly Ref[];
}

export type BlueprintItemEquipmentHead = WornItem<'BlueprintItemEquipmentHead'>;
export type BlueprintItemEquipmentGlasses = WornItem<'BlueprintItemEquipmentGlasses'>;
export type BlueprintItemEquipmentNeck = WornItem<'BlueprintItemEquipmentNeck'>;
export type BlueprintItemEquipmentShoulders = WornItem<'BlueprintItemEquipmentShoulders'>;
export type BlueprintItemEquipmentShirt = WornItem<'BlueprintItemEquipmentShirt'>;
export type BlueprintItemEquipmentBelt = WornItem<'BlueprintItemEquipmentBelt'>;
export type BlueprintItemEquipmentWrist = WornItem<'BlueprintItemEquipmentWrist'>;
export type BlueprintItemEquipmentGloves = WornItem<'BlueprintItemEquipmentGloves'>;
export type BlueprintItemEquipmentFeet = WornItem<'BlueprintItemEquipmentFeet'>;
/** Worn in either ring place. */
export type BlueprintItemEquipmentRing = WornItem<'BlueprintItemEquipmentRing'>;

/** Blueprints/Items/Weapons/WeaponFighterGroupFlags.cs, as the game writes it: names joined by `, `, or raw bits. */
export type WeaponFighterGroupFlags = string | number;

/** Blueprints/Items/Weapons/BlueprintWeaponType.cs: what makes a weapon a longsword, a bite or a monk weapon. */
export interface BlueprintWeaponType extends BlueprintBase {
  readonly $type: 'BlueprintWeaponType';
  readonly Category: WeaponCategory;
  readonly m_IsNatural: boolean;
  readonly m_IsMonk: boolean;
  readonly m_IsTwoHanded: boolean;
  /** Kingmaker/RuleSystem/AttackType.cs. */
  readonly m_AttackType: 'Melee' | 'Touch' | 'Ranged' | 'RangedTouch';
  readonly m_FighterGroupFlags: WeaponFighterGroupFlags;
  readonly m_Enchantments: readonly Ref[];
}

/** Blueprints/Items/Armors/BlueprintArmorType.cs: an armour's proficiency group, and whether it counts as armour. */
export interface BlueprintArmorType extends BlueprintBase {
  readonly $type: 'BlueprintArmorType';
  readonly m_ProficiencyGroup: ArmorProficiencyGroup;
  /** False for a shield's armour half: wearing it is not wearing armour (RestrictionsHelper.CheckHasArmor). */
  readonly m_IsArmor: boolean;
  readonly m_Enchantments: readonly Ref[];
}

/** Blueprints/Items/Armors/BlueprintShieldType.cs: a shield's armour type. */
export interface BlueprintShieldType extends Omit<BlueprintArmorType, '$type'> {
  readonly $type: 'BlueprintShieldType';
}

/** Blueprints/Items/Ecnchantments/: an enchantment an item carries, kept for its stat bonuses and the facts it grants. */
export interface BlueprintEquipmentEnchantment extends BlueprintBase {
  readonly $type: 'BlueprintEquipmentEnchantment';
}

export interface BlueprintWeaponEnchantment extends BlueprintBase {
  readonly $type: 'BlueprintWeaponEnchantment';
}

export interface BlueprintArmorEnchantment extends BlueprintBase {
  readonly $type: 'BlueprintArmorEnchantment';
}

/**
 * Designers/Mechanics/EquipmentEnchants/AddStatBonusEquipment.cs: a bonus to the wielder's stat. Only `Enhancement`
 * bonuses are kept: they alone count toward stat prerequisites (ModifiableValue.Modifier.IsPermanent, ADR 0002).
 */
export interface AddStatBonusEquipment extends Component {
  readonly $type: 'AddStatBonusEquipment';
  readonly Descriptor: 'Enhancement';
  readonly Stat: StatType;
  readonly Value: number;
}

/** Designers/Mechanics/EquipmentEnchants/IncreaseStatEquipment.cs: the same, while the stat is above zero. */
export interface IncreaseStatEquipment extends Component {
  readonly $type: 'IncreaseStatEquipment';
  readonly Descriptor: 'Enhancement';
  readonly Stat: StatType;
  readonly Value: number;
}

/** Designers/Mechanics/EquipmentEnchants/AddUnitFeatureEquipment.cs: the wielder holds a feature while wearing it. */
export interface AddUnitFeatureEquipment extends Component {
  readonly $type: 'AddUnitFeatureEquipment';
  readonly m_Feature: Ref;
}

/** Designers/Mechanics/EquipmentEnchants/AddUnitFactEquipment.cs: the same for any fact; kept when it is a held one. */
export interface AddUnitFactEquipment extends Component {
  readonly $type: 'AddUnitFactEquipment';
  readonly m_Blueprint: Ref;
}

/** Designers/Mechanics/EquipmentEnchants/MithralEnchantment.cs: the armour counts one group lighter (ItemEntityArmor.ArmorType). */
export interface MithralEnchantment extends Component {
  readonly $type: 'MithralEnchantment';
}

/**
 * Designers/Mechanics/Facts/WeaponEnhancementBonus.cs: the weapon's enhancement bonus, which stacks with the others
 * when `Stack` (Designers/GameHelper.cs GetWeaponEnhancementBonus). Gear names read it (map ticket 29's rule 3).
 */
export interface WeaponEnhancementBonus extends Component {
  readonly $type: 'WeaponEnhancementBonus';
  readonly EnhancementBonus: number;
  readonly Stack: boolean;
}

/**
 * Blueprints/Items/Ecnchantments/ArmorEnhancementBonus.cs: the armour's enhancement bonus, the highest counting
 * (Designers/GameHelper.cs GetArmorEnhancementBonus). Gear names read it (map ticket 29's rule 3).
 */
export interface ArmorEnhancementBonus extends Component {
  readonly $type: 'ArmorEnhancementBonus';
  readonly EnhancementValue: number;
}

/** On an armour type: wearing it needs no proficiency in its group (ItemEntityArmor.CanBeEquippedInternal). */
export interface IgnoreArmorGroupComponent extends Component {
  readonly $type: 'IgnoreArmorGroupComponent';
}

// Item restrictions (Blueprints/Items/Components/, `CanBeEquippedBy`): the item can be worn only when each passes.

/** Levels in the class (or, with `Not`, none). */
export interface EquipmentRestrictionClass extends Component {
  readonly $type: 'EquipmentRestrictionClass';
  readonly m_Class: Ref;
  readonly Not: boolean;
}

/** Levels in any listed class (or, with `Not`, in none). */
export interface EquipmentRestrictionHasAnyClassFromList extends Component {
  readonly $type: 'EquipmentRestrictionHasAnyClassFromList';
  readonly Not: boolean;
  readonly m_Classes: readonly Ref[];
}

/** The wearer's alignment is in the mask. */
export interface EquipmentRestrictionAlignment extends Component {
  readonly $type: 'EquipmentRestrictionAlignment';
  /** An AlignmentMaskType flags value, as the game writes it: names or raw bits. */
  readonly Alignment: string | number;
}

/** The main character only; a Build always is (map ticket 01). */
export interface EquipmentRestrictionMainPlayer extends Component {
  readonly $type: 'EquipmentRestrictionMainPlayer';
}

// Prerequisites (Blueprints/Classes/Prerequisites/Prerequisite.cs).

export type PrerequisiteGroup = 'All' | 'Any' | 'ForcedTrue';

interface PrerequisiteBase extends Component {
  readonly Group: PrerequisiteGroup;
  /** Whether a progression's grant checks it (LevelUpHelper.AddFeaturesFromProgression). */
  readonly CheckInProgression: boolean;
  /** Whether a waived slot under `ExceptWhiteListed` still checks it (BlueprintFeature.MeetsPrerequisites). */
  readonly IsFeatureSelectionWhiteList: boolean;
}

export interface PrerequisiteFeature extends PrerequisiteBase {
  readonly $type: 'PrerequisiteFeature';
  readonly m_Feature: Ref;
}

export interface PrerequisiteNoFeature extends PrerequisiteBase {
  readonly $type: 'PrerequisiteNoFeature';
  readonly m_Feature: Ref;
}

export interface PrerequisitePlayerHasFeature extends PrerequisiteBase {
  readonly $type: 'PrerequisitePlayerHasFeature';
  readonly m_Feature: Ref;
}

export interface PrerequisiteFeaturesFromList extends PrerequisiteBase {
  readonly $type: 'PrerequisiteFeaturesFromList';
  readonly m_Features: readonly Ref[];
  /** Inverts the leaf: it then forbids holding `Amount` of the list. */
  readonly m_RestrictIfNot: boolean;
  /** How many of the list; a list of deities needs one (PrerequisiteFeaturesFromList.IsDeity). */
  readonly Amount: number;
}

export interface PrerequisiteClassLevel extends PrerequisiteBase {
  readonly $type: 'PrerequisiteClassLevel';
  readonly m_CharacterClass: Ref;
  readonly Level: number;
  /** Inverts the leaf: fewer than `Level` levels. */
  readonly Not: boolean;
}

export interface PrerequisiteNoClassLevel extends PrerequisiteBase {
  readonly $type: 'PrerequisiteNoClassLevel';
  readonly m_CharacterClass: Ref;
}

export interface PrerequisiteArchetypeLevel extends PrerequisiteBase {
  readonly $type: 'PrerequisiteArchetypeLevel';
  readonly m_CharacterClass: Ref;
  readonly m_Archetype: Ref;
  readonly Level: number;
}

export interface PrerequisiteNoArchetype extends PrerequisiteBase {
  readonly $type: 'PrerequisiteNoArchetype';
  readonly m_CharacterClass: Ref;
  readonly m_Archetype: Ref;
}

export interface PrerequisiteStatValue extends PrerequisiteBase {
  readonly $type: 'PrerequisiteStatValue';
  readonly Stat: StatType;
  readonly Value: number;
}

export interface PrerequisiteFullStatValue extends PrerequisiteBase {
  readonly $type: 'PrerequisiteFullStatValue';
  readonly Stat: StatType;
  readonly Value: number;
}

export interface PrerequisiteCharacterLevel extends PrerequisiteBase {
  readonly $type: 'PrerequisiteCharacterLevel';
  readonly Level: number;
}

export interface PrerequisiteMythicLevel extends PrerequisiteBase {
  readonly $type: 'PrerequisiteMythicLevel';
  readonly Level: number;
}

export interface PrerequisiteAlignment extends PrerequisiteBase {
  readonly $type: 'PrerequisiteAlignment';
  readonly IngorePrerequisiteCheck: boolean;
  /** An AlignmentMaskType flags value, as the game writes it: names (`"LawfulGood, NeutralGood"`) or raw bits. */
  readonly Alignment: string | number;
  readonly ArchetypeAlignment: boolean;
}

export interface PrerequisiteProficiency extends PrerequisiteBase {
  readonly $type: 'PrerequisiteProficiency';
  readonly ArmorProficiencies: readonly ArmorProficiencyGroup[] | null;
  readonly WeaponProficiencies: readonly WeaponCategory[] | null;
}

export interface PrerequisiteNotProficient extends PrerequisiteBase {
  readonly $type: 'PrerequisiteNotProficient';
  readonly ArmorProficiencies: readonly ArmorProficiencyGroup[] | null;
  readonly WeaponProficiencies: readonly WeaponCategory[] | null;
}

export interface PrerequisiteCasterType extends PrerequisiteBase {
  readonly $type: 'PrerequisiteCasterType';
  readonly IsArcane: boolean;
}

export interface PrerequisiteCasterTypeSpellLevel extends PrerequisiteBase {
  readonly $type: 'PrerequisiteCasterTypeSpellLevel';
  readonly IsArcane: boolean;
  readonly OnlySpontaneous: boolean;
  readonly RequiredSpellLevel: number;
}

export interface PrerequisiteClassSpellLevel extends PrerequisiteBase {
  readonly $type: 'PrerequisiteClassSpellLevel';
  readonly m_CharacterClass: Ref;
  readonly RequiredSpellLevel: number;
}

/** The same parametrized feat already held for a given parameter. Spell parameters are out of v1 (map ticket 22). */
export interface PrerequisiteParametrizedFeature extends PrerequisiteBase {
  readonly $type: 'PrerequisiteParametrizedFeature';
  readonly m_Feature: Ref;
  readonly ParameterType: FeatureParameterType;
  readonly WeaponCategory: WeaponCategory;
  readonly SpellSchool: SpellSchool;
}

export interface PrerequisiteParametrizedWeaponSubcategory extends PrerequisiteBase {
  readonly $type: 'PrerequisiteParametrizedWeaponSubcategory';
  readonly m_Feature: Ref;
  readonly SubCategory: WeaponSubCategory;
}

export interface PrerequisiteSelectionPossible extends PrerequisiteBase {
  readonly $type: 'PrerequisiteSelectionPossible';
  readonly m_ThisFeature: Ref;
}

export interface PrerequisitePet extends PrerequisiteBase {
  readonly $type: 'PrerequisitePet';
  readonly Type: PetType;
  /** Inverts the leaf: no pet of that type. */
  readonly NoCompanion: boolean;
}

export interface PrerequisiteIsPet extends PrerequisiteBase {
  readonly $type: 'PrerequisiteIsPet';
  readonly Not: boolean;
}

export interface PrerequisiteMainCharacter extends PrerequisiteBase {
  readonly $type: 'PrerequisiteMainCharacter';
  readonly Companion: boolean;
}

/** Story state, always met (map ticket 21); the etude it names isn't held. */
export interface PrerequisiteEtude extends PrerequisiteBase {
  readonly $type: 'PrerequisiteEtude';
}

/** Needs a spell for a spell-parametrized feat; those feats are out of v1 (map ticket 22). */
export interface PrerequisiteAnySpellsInSpellbook extends PrerequisiteBase {
  readonly $type: 'PrerequisiteAnySpellsInSpellbook';
  readonly m_SpellSpecializationFeat: Ref;
}

/** A nested condition tree, which P reads as one leaf (map ticket 20). */
export interface PrerequisiteCondition extends PrerequisiteBase {
  readonly $type: 'PrerequisiteCondition';
  readonly Condition: Condition;
}

export type Prerequisite =
  | PrerequisiteFeature
  | PrerequisiteNoFeature
  | PrerequisitePlayerHasFeature
  | PrerequisiteFeaturesFromList
  | PrerequisiteClassLevel
  | PrerequisiteNoClassLevel
  | PrerequisiteArchetypeLevel
  | PrerequisiteNoArchetype
  | PrerequisiteStatValue
  | PrerequisiteFullStatValue
  | PrerequisiteCharacterLevel
  | PrerequisiteMythicLevel
  | PrerequisiteAlignment
  | PrerequisiteProficiency
  | PrerequisiteNotProficient
  | PrerequisiteCasterType
  | PrerequisiteCasterTypeSpellLevel
  | PrerequisiteClassSpellLevel
  | PrerequisiteParametrizedFeature
  | PrerequisiteParametrizedWeaponSubcategory
  | PrerequisiteSelectionPossible
  | PrerequisitePet
  | PrerequisiteIsPet
  | PrerequisiteMainCharacter
  | PrerequisiteEtude
  | PrerequisiteAnySpellsInSpellbook
  | PrerequisiteCondition;

/**
 * Every component that gives or takes away facts. G (engine/grants.ts) reads each one, in a table keyed by this union,
 * so a grant type joins this union, the allowlist and G together.
 */
export type GrantComponent =
  | AddFacts
  | AddFeatureOnClassLevel
  | AddFeatureIfHasFact
  | AddFeatureOnApply
  | RemoveFeatureOnApply
  | AddFeatureOnAlignment
  | AddFeatureOnSkill
  | AddParametrizedFeatures
  | AddFeatureParametrized
  | FactSinglify
  | KensaiChosenWeapon
  | AddFactContextActions
  | ActivateTrigger
  | BuffExtraEffects
  | AbilityApplyFact
  | MonkNoArmorFeatureUnlock
  | MonkNoArmorAndMonkWeaponFeatureUnlock
  | HasArmorFeatureUnlock
  | AddUnitFeatureEquipment
  | AddUnitFactEquipment;

/**
 * Blueprints/Classes/Prerequisites/PrerequisiteConditionForWeaponCategory.cs: not a Prerequisite but a parameter
 * check (IParamPrerequisite) that BlueprintParametrizedFeature.CanSelect runs for the listed weapon categories.
 */
export interface PrerequisiteConditionForWeaponCategory extends Component {
  readonly $type: 'PrerequisiteConditionForWeaponCategory';
  readonly m_WeaponCategories: readonly WeaponCategory[];
  readonly m_Condition: Condition;
}

// Helpers the prerequisite checks read.

/** Designers/Mechanics/Facts/ClassLevelsForPrerequisites.cs: lends one class's levels to another's prerequisites. */
export interface ClassLevelsForPrerequisites extends Component {
  readonly $type: 'ClassLevelsForPrerequisites';
  readonly m_FakeClass: Ref;
  readonly m_ActualClass: Ref;
  readonly m_ForSelection: Ref | null;
  readonly Modifier: number;
  readonly Summand: number;
}

/** Designers/Mechanics/Facts/ReplaceStatForPrerequisites.cs: a stat prerequisite reads another value. */
export interface ReplaceStatForPrerequisites extends Component {
  readonly $type: 'ReplaceStatForPrerequisites';
  readonly OldStat: StatType;
  readonly Policy: 'NewStat' | 'ClassLevel' | 'ClassLevelStacking' | 'SpecificNumber' | 'Summand' | 'MagusBaseAttack';
  readonly NewStat: StatType;
  readonly m_CharacterClass: Ref | null;
  readonly SpecificNumber: number;
}

/** UnitLogic/FactLogic/AddPet.cs: only its type, which PrerequisitePet reads; the pet's unit isn't held. */
export interface AddPet extends Component {
  readonly $type: 'AddPet';
  readonly Type: PetType;
}

// Features, selections and progressions.

export interface BlueprintFeature extends BlueprintBase {
  readonly $type: 'BlueprintFeature';
  readonly Ranks: number;
  /** BlueprintFeatureBase.HideInUI: the game never shows it to the player (map ticket 27). */
  readonly HideInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
}

/** Blueprints/Classes/Selection/FeatureParameterType.cs: what a parametrized feat is taken for. */
export type FeatureParameterType =
  | 'Custom'
  | 'SpellSpecialization'
  | 'WeaponCategory'
  | 'SpellSchool'
  | 'LearnSpell'
  | 'Skill'
  | 'FeatureSelection';

/** Kingmaker/Enums/WeaponSubCategory.cs. */
export type WeaponSubCategory =
  | 'None'
  | 'Ranged'
  | 'Melee'
  | 'Finessable'
  | 'Thrown'
  | 'Natural'
  | 'Knives'
  | 'Monk'
  | 'TwoHanded'
  | 'Light'
  | 'Simple'
  | 'Martial'
  | 'Exotic'
  | 'OneHandedPiercing'
  | 'Disabled'
  | 'OneHandedSlashing'
  | 'Metal';

/**
 * A feat taken for a parameter (Weapon Focus): one pick per parameter (BlueprintParametrizedFeature.CanSelect). Where
 * the parameter is a spell (`SpellSpecialization`, `LearnSpell`), the variants name abilities, which the planner
 * doesn't hold, so they are dropped and counted in the report.
 */
export interface BlueprintParametrizedFeature extends BlueprintBase {
  readonly $type: 'BlueprintParametrizedFeature';
  readonly Ranks: number;
  /** BlueprintFeatureBase.HideInUI: the game never shows it to the player (map ticket 27). */
  readonly HideInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
  readonly ParameterType: FeatureParameterType;
  readonly WeaponSubCategory: WeaponSubCategory;
  readonly RequireProficiency: boolean;
  /** The same feat that must already be held for the same parameter (Greater Weapon Focus needs Weapon Focus). */
  readonly m_Prerequisite: Ref | null;
  readonly HasNoSuchFeature: boolean;
  readonly IgnoreParameterFeaturePrerequisites: boolean;
  /** The parameters on offer for `Custom` and `FeatureSelection`; `null` when the game leaves it unset. */
  readonly BlueprintParameterVariants: readonly Ref[] | null;
}

/** A prestige class's pick of the spellbook it advances (SelectFeature.GetReplaceSpellbook). */
export interface BlueprintFeatureReplaceSpellbook extends BlueprintBase {
  readonly $type: 'BlueprintFeatureReplaceSpellbook';
  readonly Ranks: number;
  /** BlueprintFeatureBase.HideInUI: the game never shows it to the player (map ticket 27). */
  readonly HideInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
  readonly m_Spellbook: Ref;
}

/** A Mythic path's pick of the spellbook its Mythic spells join; a selection (IFeatureSelection). */
export interface BlueprintFeatureSelectMythicSpellbook extends BlueprintBase {
  readonly $type: 'BlueprintFeatureSelectMythicSpellbook';
  readonly Ranks: number;
  /** BlueprintFeatureBase.HideInUI: the game never shows it to the player (map ticket 27). */
  readonly HideInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
  readonly m_AllowedSpellbooks: readonly Ref[];
}

/** Blueprints/Classes/Spells/NoSelectionIfAlreadyHasFeature.cs: closes a selection's slot (IsSelectionProhibited). */
export interface NoSelectionIfAlreadyHasFeature extends Component {
  readonly $type: 'NoSelectionIfAlreadyHasFeature';
  readonly AnyFeatureFromSelection: boolean;
  readonly m_Features: readonly Ref[];
}

/** A race: a feature whose features are granted at level 0 (SelectRace.Apply). */
export interface BlueprintRace extends BlueprintBase {
  readonly $type: 'BlueprintRace';
  readonly Ranks: number;
  /** BlueprintFeatureBase.HideInUI: the game never shows it to the player (map ticket 27). */
  readonly HideInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
  readonly m_Features: readonly Ref[];
  /** Whether the Build picks the ability that gets the +2 racial bonus (SelectRaceStat). */
  readonly SelectableRaceStat: boolean;
}

export interface BlueprintFeatureSelection extends BlueprintBase {
  readonly $type: 'BlueprintFeatureSelection';
  readonly Ranks: number;
  /** BlueprintFeatureBase.HideInUI: the game never shows it to the player (map ticket 27). */
  readonly HideInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
  readonly m_AllFeatures: readonly Ref[];
  readonly Mode: 'Default' | 'OnlyNew' | 'OnlyRankUp';
  /** The FeatureGroup that decides the pick's band (SelectFeature.CalculatePriority). */
  readonly Group: FeatureGroup;
  readonly IgnorePrerequisites: boolean;
  readonly ExceptWhiteListed: boolean;
  readonly Obligatory: boolean;
}

export interface LevelEntry {
  readonly Level: number;
  readonly m_Features: readonly Ref[];
}

export interface ClassWithLevel {
  readonly m_Class: Ref;
  readonly AdditionalLevel: number;
}

export interface ArchetypeWithLevel {
  readonly m_Archetype: Ref;
  readonly AdditionalLevel: number;
}

export interface BlueprintProgression extends BlueprintBase {
  readonly $type: 'BlueprintProgression';
  readonly Ranks: number;
  /** BlueprintFeatureBase.HideInUI: the game never shows it to the player (map ticket 27). */
  readonly HideInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
  readonly LevelEntries: readonly LevelEntry[];
  readonly m_Classes: readonly ClassWithLevel[];
  /** Archetypes whose class levels count; a class listed here counts only with one of them (CalcLevel). */
  readonly m_Archetypes: readonly ArchetypeWithLevel[];
  readonly ForAllOtherClasses: boolean;
  /** The other classes that count toward the level, halved under `Div2`, when ForAllOtherClasses is off. */
  readonly m_AlternateProgressionClasses: readonly ClassWithLevel[];
  readonly AlternateProgressionType: 'Div2' | 'Full';
  readonly GiveFeaturesForPreviousLevels: boolean;
  readonly m_ExclusiveProgression: Ref | null;
  /** `null` when the game leaves it unset; CalcLevel checks for that. */
  readonly m_FeaturesRankIncrease: readonly Ref[] | null;
}

// Classes, with the tables and spellbooks they name.

export interface BlueprintCharacterClass extends BlueprintBase {
  readonly $type: 'BlueprintCharacterClass';
  readonly SkillPoints: number;
  readonly HitDie: DiceType;
  readonly PrestigeClass: boolean;
  readonly IsMythic: boolean;
  readonly DontAddCasterLevels: boolean;
  readonly m_IsHigherMythic: boolean;
  /** BlueprintStatProgression tables, indexed by class level. */
  readonly m_BaseAttackBonus: Ref;
  readonly m_FortitudeSave: Ref;
  readonly m_ReflexSave: Ref;
  readonly m_WillSave: Ref;
  readonly m_Progression: Ref;
  readonly m_Spellbook: Ref | null;
  readonly ClassSkills: readonly StatType[];
  readonly m_Archetypes: readonly Ref[];
}

/** An archetype: merged into its class's progression level by level (ProgressionData.CalculateLevelEntries). */
export interface BlueprintArchetype extends BlueprintBase {
  readonly $type: 'BlueprintArchetype';
  readonly AddFeatures: readonly LevelEntry[];
  readonly RemoveFeatures: readonly LevelEntry[];
  readonly m_ReplaceSpellbook: Ref | null;
  readonly RemoveSpellbook: boolean;
  /** Replacement tables; `null` keeps the class's. */
  readonly m_BaseAttackBonus: Ref | null;
  readonly m_FortitudeSave: Ref | null;
  readonly m_ReflexSave: Ref | null;
  readonly m_WillSave: Ref | null;
  readonly ReplaceClassSkills: boolean;
  readonly ClassSkills: readonly StatType[];
  readonly AddSkillPoints: number;
}

/** A per-level table: base attack bonus or a save, indexed by class level. */
export interface BlueprintStatProgression extends BlueprintBase {
  readonly $type: 'BlueprintStatProgression';
  readonly Bonuses: readonly number[];
}

export interface SpellsLevelEntry {
  /** Spells per day by spell level; an entry below 0 or past the end means none. */
  readonly Count: readonly number[];
}

/** A spellbook's table, indexed by caster level. */
export interface BlueprintSpellsTable extends BlueprintBase {
  readonly $type: 'BlueprintSpellsTable';
  readonly Levels: readonly SpellsLevelEntry[];
}

export interface BlueprintSpellbook extends BlueprintBase {
  readonly $type: 'BlueprintSpellbook';
  readonly IsMythic: boolean;
  readonly m_SpellsPerDay: Ref;
  readonly Spontaneous: boolean;
  readonly CasterLevelModifier: number;
  readonly IsArcane: boolean;
}

// Settings the rules read (guide §3 point 5): the root and the Mythic settings.

/** Blueprints/Root/ProgressionRoot.cs: the fields the walk starts from and the rules read. */
export interface ProgressionRoot {
  /** Every character's character-level feats (UnitProgressionData's constructor). */
  readonly m_FeatsProgression: Ref;
  readonly m_BasicFeatSelection: Ref;
  readonly m_CharacterClasses: readonly Ref[];
  readonly m_MythicStartingClass: Ref;
  readonly m_MythicLegenFake: Ref;
  readonly m_MythicLegen: Ref;
  readonly m_CharacterMythics: readonly Ref[];
  readonly m_CharacterRaces: readonly Ref[];
  readonly m_DeitySelection: Ref;
}

/**
 * ProgressionRoot's fields, each once: the importer starts its walk from them, the allowlist keeps them (its specs
 * are tied to `ProgressionRoot`) and G makes each a `root` grant. Keyed by every field, so a field added to the type
 * joins all three.
 */
export const progressionRootFields = Object.keys({
  m_FeatsProgression: true,
  m_BasicFeatSelection: true,
  m_CharacterClasses: true,
  m_MythicStartingClass: true,
  m_MythicLegenFake: true,
  m_MythicLegen: true,
  m_CharacterMythics: true,
  m_CharacterRaces: true,
  m_DeitySelection: true,
} satisfies { readonly [K in keyof ProgressionRoot]: true }) as readonly (keyof ProgressionRoot)[];

/** Blueprints/Root/SystemMechanicsRoot.cs: the selections the rules single out. */
export interface SystemMechanicsRoot {
  /** The selection the Trickster waiver applies to (BlueprintFeatureSelection.IsIgnorePrerequisites). */
  readonly m_BasicFeatSelection: Ref;
  readonly m_MythicFeatSelection: Ref;
  readonly m_MythicAbilitySelection: Ref;
}

/** Blueprints/Root/BlueprintRoot.cs: only the parts the rules read. */
export interface BlueprintRoot extends BlueprintBase {
  readonly $type: 'BlueprintRoot';
  readonly Progression: ProgressionRoot;
  readonly SystemMechanics: SystemMechanicsRoot;
  readonly m_BlueprintMythicsSettingsReference: Ref;
  /** The unit every custom main character is made from; what its AddFacts gives, a Build holds from level 0 (map 28). */
  readonly m_DefaultPlayerCharacter: Ref;
}

/**
 * Blueprints/BlueprintUnit.cs: only the character-creation unit BlueprintRoot names is held (map ticket 28), with only
 * its AddFacts.
 */
export interface BlueprintUnit extends BlueprintBase {
  readonly $type: 'BlueprintUnit';
}

/** DialogSystem/Blueprints/BlueprintMythicsSettings.cs: each Mythic rank's Expected level (ADR 0003). */
export interface BlueprintMythicsSettings extends BlueprintBase {
  readonly $type: 'BlueprintMythicsSettings';
  /** Indexed by Mythic rank; GetCharacterLevelRestriction gives 0 outside 1 to its length − 1. */
  readonly CharcaterLevelRestrictions: readonly number[];
}

/** UnitLogic/FactLogic/AddMechanicsFeature.cs MechanicsFeatureType: a flag a fact sets (LegendaryHero…). */
export type MechanicsFeatureType =
  | 'Invalid'
  | 'Infusion'
  | 'LingeringPerformance'
  | 'Manyshot'
  | 'ShieldBash'
  | 'RangedLegerdemain'
  | 'WandMastery'
  | 'JudgmentSwitch'
  | 'EldritchWandMastery'
  | 'SoloTactics'
  | 'CannotBeFlanked'
  | 'Pounce'
  | 'NaturalSpell'
  | 'DoubleSlice'
  | 'ImmunityToArmorSpeedPenalty'
  | 'KnifeMaster'
  | 'FrighteningThug'
  | 'Ferocity'
  | 'HalfOrcFerocity'
  | 'QuickenPerformance1'
  | 'QuickenPerformance2'
  | 'ImprovedUnarmedStrike'
  | 'IterativeNaturalAttacks'
  | 'InfusedCurative'
  | 'ScrollMastery'
  | 'CompletelyImpatient'
  | 'Endurance'
  | 'HandOfMagusDan'
  | 'SingingSteel'
  | 'MakeKnowledgeCheckUntrained'
  | 'ImmunityToMediumArmorSpeedPenalty'
  | 'DuelistNoRetreat'
  | 'SwordlordWeaponProwess'
  | 'DuelingMastery'
  | 'DuelistRiposte'
  | 'PrimalMagicEssence'
  | 'ShatterDefenses'
  | 'WeaponFinesse'
  | 'EffortlessDualWielding'
  | 'ExtendPotion'
  | 'GetUpWithoutAttackOfOpportunity'
  | 'HellknightFearsomeness'
  | 'Flying'
  | 'IsUntargetable'
  | 'Immortality'
  | 'AllowDyingCondition'
  | 'HasRend'
  | 'ResurrectOnRest'
  | 'IsIgnoredByCombat'
  | 'SpellCastingForbidden'
  | 'ExAndSuAbilitiesForbidden'
  | 'MagicItemsForbidden'
  | 'RotationForbidden'
  | 'Hidden'
  | 'PointBlankRange'
  | 'SnapShot'
  | 'ImprovedSnapShot'
  | 'GreaterSnapShot'
  | 'Blinking'
  | 'InevitableAttacks'
  | 'AlwaysChance'
  | 'ThrowElixir'
  | 'TricksterAthleticsSavingThrows'
  | 'TricksterAthleticsD20'
  | 'TricksterMobilityFastMovement'
  | 'TricksterMobilityAttackOfOpportunity'
  | 'TricksterUseMagicDeviceCasterLevelBoost'
  | 'TricksterUseMagicDeviceUnlimitedWands'
  | 'MythicHardToKill'
  | 'TricksterPersuasionParalyze'
  | 'MythicAbilitiesAsMoveAction'
  | 'MythicFullAttackAfterMoveAction'
  | 'MythicFullLevelToCR'
  | 'MythicReduceResistances'
  | 'PowerfulChange'
  | 'ImprovedPowerfulChange'
  | 'ShareTransmutation'
  | 'ImprovedShareTransmutation'
  | 'FavoriteMetamagicEmpower'
  | 'FavoriteMetamagicMaximize'
  | 'FavoriteMetamagicQuicken'
  | 'FavoriteMetamagicReach'
  | 'FavoriteMetamagicExtend'
  | 'MasterShapeshifter'
  | 'CombatHealer'
  | 'FervorQuickenedSpell'
  | 'FastPotion'
  | 'FlawlessAttacks'
  | 'DisableAutoSpottingInStealthByAllies'
  | 'MythicDemonNaturalAttacksNoSecondary'
  | 'AzataFavorableMagic'
  | 'EnableSneakAttackForBombs'
  | 'ReduceSecondaryNaturalAttackPenalty'
  | 'PolymorphSpellcasting'
  | 'LegendaryHero'
  | 'FavoriteMetamagicSelective'
  | 'TricksterIgnoreFeatPrerequisites'
  | 'TricksterSelfCoupDeGrace'
  | 'SuppressedManyshot'
  | 'SharePersonalSpellsWithPets'
  | 'FavoriteMetamagicBolstered'
  | 'EnableSpellLevel10'
  | 'DisengageWithoutAttackOfOpportunity'
  | 'ActualFactsInspectionAllowed'
  | 'ForbidOwnAreaEffects'
  | 'ImmunityToEncumbranceSpeedPenalty'
  | 'FavoriteMetamagicPersistent'
  | 'FavoriteMetamagicPiercing'
  | 'FavoriteMetamagicIntensified'
  | 'FakeEnhancement'
  | 'AdvancedFakeEnhancement'
  | 'FighterOnHandedGrip'
  | 'FoolMagicFeature'
  | 'DomainsByIntelligence';

/** UnitLogic/FactLogic/AddMechanicsFeature.cs: sets a flag while the fact is held. */
export interface AddMechanicsFeature extends Component {
  readonly $type: 'AddMechanicsFeature';
  readonly m_Feature: MechanicsFeatureType;
}

export type Blueprint =
  | BlueprintFeature
  | BlueprintParametrizedFeature
  | BlueprintFeatureReplaceSpellbook
  | BlueprintFeatureSelectMythicSpellbook
  | BlueprintRace
  | BlueprintFeatureSelection
  | BlueprintProgression
  | BlueprintCharacterClass
  | BlueprintArchetype
  | BlueprintStatProgression
  | BlueprintSpellsTable
  | BlueprintSpellbook
  | BlueprintRoot
  | BlueprintMythicsSettings
  | BlueprintBuff
  | BlueprintAbility
  | BlueprintActivatableAbility
  | BlueprintItemWeapon
  | BlueprintItemArmor
  | BlueprintItemShield
  | BlueprintItemEquipmentHead
  | BlueprintItemEquipmentGlasses
  | BlueprintItemEquipmentNeck
  | BlueprintItemEquipmentShoulders
  | BlueprintItemEquipmentShirt
  | BlueprintItemEquipmentBelt
  | BlueprintItemEquipmentWrist
  | BlueprintItemEquipmentGloves
  | BlueprintItemEquipmentFeet
  | BlueprintItemEquipmentRing
  | BlueprintWeaponType
  | BlueprintArmorType
  | BlueprintShieldType
  | BlueprintEquipmentEnchantment
  | BlueprintWeaponEnchantment
  | BlueprintArmorEnchantment
  | BlueprintUnit;

/** The folder each kept `$type` is written to: the one place that says so. */
export const kindOf: Readonly<Record<Blueprint['$type'], Kind>> = {
  BlueprintCharacterClass: 'classes',
  BlueprintArchetype: 'archetypes',
  BlueprintProgression: 'progressions',
  BlueprintFeatureSelection: 'selections',
  BlueprintFeature: 'features',
  BlueprintParametrizedFeature: 'features',
  BlueprintFeatureReplaceSpellbook: 'features',
  BlueprintFeatureSelectMythicSpellbook: 'selections',
  BlueprintRace: 'races',
  BlueprintStatProgression: 'tables',
  BlueprintSpellsTable: 'tables',
  BlueprintSpellbook: 'spellbooks',
  BlueprintRoot: 'settings',
  BlueprintMythicsSettings: 'settings',
  BlueprintBuff: 'buffs',
  BlueprintAbility: 'abilities',
  BlueprintActivatableAbility: 'activatables',
  BlueprintItemWeapon: 'items',
  BlueprintItemArmor: 'items',
  BlueprintItemShield: 'items',
  BlueprintItemEquipmentHead: 'items',
  BlueprintItemEquipmentGlasses: 'items',
  BlueprintItemEquipmentNeck: 'items',
  BlueprintItemEquipmentShoulders: 'items',
  BlueprintItemEquipmentShirt: 'items',
  BlueprintItemEquipmentBelt: 'items',
  BlueprintItemEquipmentWrist: 'items',
  BlueprintItemEquipmentGloves: 'items',
  BlueprintItemEquipmentFeet: 'items',
  BlueprintItemEquipmentRing: 'items',
  BlueprintWeaponType: 'itemtypes',
  BlueprintArmorType: 'itemtypes',
  BlueprintShieldType: 'itemtypes',
  BlueprintEquipmentEnchantment: 'enchantments',
  BlueprintWeaponEnchantment: 'enchantments',
  BlueprintArmorEnchantment: 'enchantments',
  BlueprintUnit: 'units',
};

const REF = /^!bp_([0-9a-f]{32})$/;
/** Each reference-like string's GUID, read once: the walk follows the same references many times. */
const refGuids = new Map<string, Guid | undefined>();

/** The GUID a reference names, or `undefined` when the value isn't a reference. */
export function refGuid(value: unknown): Guid | undefined {
  if (typeof value !== 'string' || !value.startsWith('!bp_')) return undefined;
  let guid = refGuids.get(value);
  if (guid === undefined && !refGuids.has(value)) refGuids.set(value, (guid = REF.exec(value)?.[1]));
  return guid;
}

/** The GUIDs a list of references names, leaving out what isn't a reference (an unset one's null). */
export function guids(refs: readonly unknown[] | null | undefined): Guid[] {
  return (refs ?? []).map(refGuid).filter((g): g is Guid => g !== undefined);
}

/** Whether a value is a plain object (a blueprint, a component, a struct), not null or a list. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** One reference found in a value (`references`). */
export interface FoundReference {
  readonly guid: Guid;
  /** Where it sits: `Components[2].m_Facts[0]`. */
  readonly path: string;
  /** The field that holds it, or the list it is an item of: `m_Facts`. */
  readonly field: string;
  /** The class name of the nearest object around it that has a `$type`, or `undefined` for none. */
  readonly enclosing: string | undefined;
}

/**
 * Every blueprint reference anywhere in a value, depth first: a kept blueprint, a component, or a blueprint's JSON
 * as the dump has it (whose `$type` names its class after a type GUID).
 */
export function* references(
  value: unknown,
  path = '',
  field = '',
  enclosing: string | undefined = undefined,
): Generator<FoundReference> {
  const guid = refGuid(value);
  if (guid !== undefined) yield { guid, path, field, enclosing };
  else if (Array.isArray(value))
    for (const [i, v] of value.entries()) yield* references(v, `${path}[${i}]`, field, enclosing);
  else if (isRecord(value)) {
    const type = value.$type;
    const here = typeof type === 'string' ? type.slice(type.lastIndexOf(', ') + 1).trimStart() : enclosing;
    for (const [k, v] of Object.entries(value))
      if (k !== '$type') yield* references(v, path ? `${path}.${k}` : k, k, here);
  }
}

/**
 * Whether a player ever sees a blueprint as itself (map tickets 19 and 27): it has a display name, and the game
 * doesn't hide it (BlueprintFeatureBase.HideInUI, read by UnitLogic/Feature.cs Hidden). A blueprint that isn't shown
 * is never an option or a search result; a Refusal or a "this needs" link words it through what grants it.
 */
export function isShown(bp: Blueprint): boolean {
  return bp.name !== undefined && !('HideInUI' in bp && bp.HideInUI);
}

/**
 * An override's change to the dump's data (guide §3 point 6). The importer applies it; the loader checks it. A `name`
 * override qualifies a display name a Build can reach under another blueprint's name too, where the importer's own
 * qualifiers can't tell them apart (map ticket 27).
 */
export type Override = OverrideBase &
  (
    | { readonly change: 'add' }
    | { readonly change: 'remove' }
    | {
        readonly change: 'patch';
        /** JSON Patch operations (RFC 6902, `remove` and `replace`) on the dump's JSON, before filtering. */
        readonly ops: readonly PatchOp[];
      }
    | {
        readonly change: 'name';
        /** The qualifier, in our own words, written after the display name as `<name> (<qualifier>)`. */
        readonly qualifier: string;
      }
    | {
        /**
         * An old GUID the game replaced with the target (map 07): a Build code naming it opens on the target. The
         * importer leaves it alone; the Build code reads it.
         */
        readonly change: 'alias';
        readonly from: Guid;
      }
  );

interface OverrideBase {
  /** Why the game's data can't stand as it is, citing what shows it. Never empty. */
  readonly reason: string;
  /** The blueprint it adds, removes, patches or names. */
  readonly target: Guid;
}

export interface PatchOp {
  readonly op: 'remove' | 'replace';
  /** A JSON Pointer into the blueprint's dump JSON (`/Components/3`). */
  readonly path: string;
  /** The new value, for `replace`. */
  readonly value?: unknown;
}
