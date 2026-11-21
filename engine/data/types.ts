export type Guid = string;

export type Ref = `!bp_${string}`;

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

export interface BlueprintBase {
  readonly $type: string;
  readonly guid: Guid;
  readonly assetName: string;
  readonly name?: string;
  readonly qualifier?: string;
  readonly Components: readonly Component[];
}

export interface Component {
  readonly $type: string;
}

export type DiceType = 'Zero' | 'One' | 'D2' | 'D3' | 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20' | 'D100';

export type Attribute = 'Strength' | 'Dexterity' | 'Constitution' | 'Intelligence' | 'Wisdom' | 'Charisma';

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

export interface ContextValue {
  readonly ValueType: ContextValueType;
  readonly Value: number;
}

export interface AddStatBonus extends Component {
  readonly $type: 'AddStatBonus';
  readonly Descriptor: ModifierDescriptor;
  readonly Stat: StatType;
  readonly Value: number;
  readonly ScaleByBasicAttackBonus: boolean;
}

export interface AddStatBonusIfHasFact extends Component {
  readonly $type: 'AddStatBonusIfHasFact';
  readonly Descriptor: ModifierDescriptor;
  readonly Stat: StatType;
  readonly Value: RankedContextValue;
  readonly InvertCondition: boolean;
  readonly RequireAllFacts: boolean;
  readonly m_CheckedFacts: readonly Ref[];
}

export type GameDifficultyOption = 'Custom' | 'Story' | 'Casual' | 'Normal' | 'Daring' | 'Core' | 'Hard' | 'Unfair';

export interface AddFacts extends Component {
  readonly $type: 'AddFacts';
  readonly m_Facts: readonly Ref[];
  readonly HasDifficultyRequirements: boolean;
  readonly InvertDifficultyRequirements: boolean;
  readonly MinDifficulty: GameDifficultyOption;
}

export interface AddFeatureOnClassLevel extends Component {
  readonly $type: 'AddFeatureOnClassLevel';
  readonly m_Class: Ref | null;
  readonly Level: number;
  readonly m_Feature: Ref;
  readonly BeforeThisLevel: boolean;
  readonly m_AdditionalClasses: readonly Ref[] | null;
  readonly m_Archetypes: readonly Ref[] | null;
}

export interface AddFeatureIfHasFact extends Component {
  readonly $type: 'AddFeatureIfHasFact';
  readonly m_CheckedFact: Ref;
  readonly m_Feature: Ref;
  readonly Not: boolean;
}

export interface AddFeatureOnApply extends Component {
  readonly $type: 'AddFeatureOnApply';
  readonly m_Feature: Ref;
}

export interface RemoveFeatureOnApply extends Component {
  readonly $type: 'RemoveFeatureOnApply';
  readonly m_Feature: Ref;
}

export type AlignmentComponent = 'None' | 'Neutral' | 'Good' | 'Evil' | 'Lawful' | 'Chaotic';

export interface AddFeatureOnAlignment extends Component {
  readonly $type: 'AddFeatureOnAlignment';
  readonly Alignment: AlignmentComponent;
  readonly m_Facts: readonly Ref[];
}

export interface AddFeatureOnSkill extends Component {
  readonly $type: 'AddFeatureOnSkill';
  readonly StatType: StatType;
  readonly MinimalStat: number;
  readonly m_Facts: readonly Ref[];
}

export interface ParametrizedFeatureGrant {
  readonly m_Feature: Ref;
  readonly ParamObject: Ref | null;
  readonly ParamSpellSchool: SpellSchool;
  readonly ParamWeaponCategory: WeaponCategory;
  readonly Stat: StatType;
}

export interface AddParametrizedFeatures extends Component {
  readonly $type: 'AddParametrizedFeatures';
  readonly m_Features: readonly ParametrizedFeatureGrant[];
}

export interface AddFeatureParametrized extends Component {
  readonly $type: 'AddFeatureParametrized';
}

export interface FactSinglify extends Component {
  readonly $type: 'FactSinglify';
  readonly m_OldFacts: readonly Ref[];
  readonly m_NewFacts: readonly Ref[];
}

export interface KensaiChosenWeapon extends Component {
  readonly $type: 'KensaiChosenWeapon';
  readonly m_Focus: Ref;
}

export interface AddClassSkill extends Component {
  readonly $type: 'AddClassSkill';
  readonly Skill: StatType;
}

export interface AddBackgroundClassSkill extends Component {
  readonly $type: 'AddBackgroundClassSkill';
  readonly Skill: StatType;
}

export interface AddSkillPointPerCharacterLevel extends Component {
  readonly $type: 'AddSkillPointPerCharacterLevel';
}

export interface AddProficiencies extends Component {
  readonly $type: 'AddProficiencies';
  readonly m_RaceRestriction: Ref | null;
  readonly ArmorProficiencies: readonly ArmorProficiencyGroup[] | null;
  readonly WeaponProficiencies: readonly WeaponCategory[] | null;
}

export interface AddBackgroundWeaponProficiency extends Component {
  readonly $type: 'AddBackgroundWeaponProficiency';
  readonly Proficiency: WeaponCategory;
}

export interface AddBackgroundArmorProficiency extends Component {
  readonly $type: 'AddBackgroundArmorProficiency';
  readonly Proficiency: ArmorProficiencyGroup;
}

export interface IncreaseActivatableAbilityGroupSize extends Component {
  readonly $type: 'IncreaseActivatableAbilityGroupSize';
  readonly Group: ActivatableAbilityGroup;
}

export interface AddSpellbookLevel extends Component {
  readonly $type: 'AddSpellbookLevel';
  readonly m_Spellbook: Ref;
}

export interface SkipLevelsForSpellProgression extends Component {
  readonly $type: 'SkipLevelsForSpellProgression';
  readonly Levels: readonly number[];
}

export interface IsAlchemistSpellbook extends Component {
  readonly $type: 'IsAlchemistSpellbook';
}

export type RankedContextValue = ContextValue & { readonly ValueRank: AbilityRankType };

export type AbilityRankType =
  | 'Default'
  | 'DamageDice'
  | 'DamageBonus'
  | 'ProjectilesCount'
  | 'DamageDiceAlternative'
  | 'StatBonus'
  | 'SpeedBonus';

export type DamageEnergyType =
  | 'Fire'
  | 'Cold'
  | 'Sonic'
  | 'Electricity'
  | 'Acid'
  | 'NegativeEnergy'
  | 'PositiveEnergy'
  | 'Holy'
  | 'Unholy'
  | 'Divine'
  | 'Magic';

export interface AddDamageResistanceEnergy extends Component {
  readonly $type: 'AddDamageResistanceEnergy';
  readonly Type: DamageEnergyType;
  readonly Value: RankedContextValue;
}

export interface AddDamageResistancePhysical extends Component {
  readonly $type: 'AddDamageResistancePhysical';
  readonly Value: RankedContextValue;
  readonly Or: boolean;
  readonly BypassedByMaterial: boolean;
  readonly Material: string | number;
  readonly BypassedByForm: boolean;
  readonly Form: string | number;
  readonly BypassedByMagic: boolean;
  readonly MinEnhancementBonus: number;
  readonly BypassedByAlignment: boolean;
  readonly Alignment: string | number;
  readonly BypassedByEpic: boolean;
}

export interface AddEnergyDamageImmunity extends Component {
  readonly $type: 'AddEnergyDamageImmunity';
  readonly EnergyType: DamageEnergyType;
}

export interface AddEnergyImmunity extends Component {
  readonly $type: 'AddEnergyImmunity';
  readonly Type: DamageEnergyType;
}

export interface AddSpellResistance extends Component {
  readonly $type: 'AddSpellResistance';
  readonly Value: RankedContextValue;
  readonly AddCR: boolean;
  readonly AddBonusToResistance: boolean;
  readonly AllSpellResistancePenaltyDoNotUse: boolean;
}

export interface AddFortification extends Component {
  readonly $type: 'AddFortification';
  readonly UseContextValue: boolean;
  readonly Bonus: number;
  readonly Value: RankedContextValue;
}

export type UnitCondition =
  | 'Blindness'
  | 'Nauseated'
  | 'Fatigued'
  | 'Paralyzed'
  | 'DeathDoor'
  | 'Staggered'
  | 'Invisible'
  | 'Petrified'
  | 'Dazed'
  | 'Slowed'
  | 'Entangled'
  | 'DifficultTerrain'
  | 'Frightened'
  | 'Prone'
  | 'Sickened'
  | 'Sleeping'
  | 'SeeInvisibility'
  | 'TrueSeeing'
  | 'CantMove'
  | 'Shaken'
  | 'LoseDexterityToAC'
  | 'Dazzled'
  | 'Stunned'
  | 'Helpless'
  | 'Confusion'
  | 'SpellCastingIsDifficult'
  | 'ForceMove'
  | 'CantAct'
  | 'DisableAttacksOfOpportunity'
  | 'AttackNearest'
  | 'Unconscious'
  | 'CanNotAttack'
  | 'Unlootable'
  | 'PartialConcealmentOnAttacks'
  | 'ImmuneToAttackOfOpportunity'
  | 'UseMobilityToNegateAttackOfOpportunity'
  | 'ImmuneToCombatManeuvers'
  | 'MovementBan'
  | 'AttackOfOpportunityBeforeInitiative'
  | 'StealthForbidden'
  | 'Cowering'
  | 'Exhausted'
  | 'BarbarianRage'
  | 'SuppressedEnergyResistance'
  | 'SuppressedEnergyImmunity'
  | 'UseAbilityForbidden'
  | 'WalkingDead'
  | 'DisableMountRiding'
  | 'SpellCastingIsVeryDifficult'
  | 'DevouredBySwarm'
  | 'SpellcastingForbidden'
  | 'MagicItemsForbidden'
  | 'ExAndSuAbilitiesForbidden'
  | 'GreaterInvisibility'
  | 'CantUseStandardActions'
  | 'UseMobilityToNegateDefensivelyFail'
  | 'NegatedSpellblight';

export interface SpellDescriptorWrapper {
  readonly m_IntValue: string;
}

export interface SavingThrowBonusAgainstDescriptor extends Component {
  readonly $type: 'SavingThrowBonusAgainstDescriptor';
  readonly SpellDescriptor: SpellDescriptorWrapper;
  readonly ModifierDescriptor: ModifierDescriptor;
  readonly Value: number;
  readonly Bonus: RankedContextValue;
  readonly OnlyPositiveValue: boolean;
  readonly m_DisablingFeature: Ref | null;
}

export interface SavingThrowBonusAgainstSchool extends Component {
  readonly $type: 'SavingThrowBonusAgainstSchool';
  readonly School: SpellSchool;
  readonly ModifierDescriptor: ModifierDescriptor;
  readonly Value: number;
}

export interface BuffDescriptorImmunity extends Component {
  readonly $type: 'BuffDescriptorImmunity';
  readonly Descriptor: SpellDescriptorWrapper;
  readonly CheckFact: boolean;
  readonly m_IgnoreFeature: Ref | null;
  readonly m_FactToCheck: Ref | null;
}

export interface SpellImmunityToSpellDescriptor extends Component {
  readonly $type: 'SpellImmunityToSpellDescriptor';
  readonly Descriptor: SpellDescriptorWrapper;
  readonly m_CasterIgnoreImmunityFact: Ref | null;
}

export interface AddConditionImmunity extends Component {
  readonly $type: 'AddConditionImmunity';
  readonly Condition: UnitCondition;
}

export interface AddImmunityToCriticalHits extends Component {
  readonly $type: 'AddImmunityToCriticalHits';
}

export interface AddImmunityToPrecisionDamage extends Component {
  readonly $type: 'AddImmunityToPrecisionDamage';
}

export interface IncreaseSpellDescriptorDC extends Component {
  readonly $type: 'IncreaseSpellDescriptorDC';
  readonly Descriptor: SpellDescriptorWrapper;
  readonly BonusDC: number;
  readonly ModifierDescriptor: ModifierDescriptor;
  readonly SpellsOnly: boolean;
}

export interface IncreaseSpellSchoolDC extends Component {
  readonly $type: 'IncreaseSpellSchoolDC';
  readonly School: SpellSchool;
  readonly BonusDC: number;
  readonly Descriptor: ModifierDescriptor;
}

export interface SpellPenetrationBonus extends Component {
  readonly $type: 'SpellPenetrationBonus';
  readonly Value: RankedContextValue;
  readonly Descriptor: ModifierDescriptor;
  readonly CheckFact: boolean;
  readonly m_RequiredFact: Ref | null;
}

export interface ConcentrationBonus extends Component {
  readonly $type: 'ConcentrationBonus';
  readonly Value: RankedContextValue;
  readonly CheckFact: boolean;
  readonly m_RequiredFact: Ref | null;
}

export interface IncreaseSpellDescriptorCasterLevel extends Component {
  readonly $type: 'IncreaseSpellDescriptorCasterLevel';
  readonly Descriptor: SpellDescriptorWrapper;
  readonly BonusCasterLevel: number;
  readonly ModifierDescriptor: ModifierDescriptor;
  readonly SpellsOnly: boolean;
}

export interface IncreaseSpellSchoolCasterLevel extends Component {
  readonly $type: 'IncreaseSpellSchoolCasterLevel';
  readonly School: SpellSchool;
  readonly BonusLevel: number;
  readonly Descriptor: ModifierDescriptor;
}

export interface SpellSpecializationParametrized extends Component {
  readonly $type: 'SpellSpecializationParametrized';
}

export interface DraconicBloodlineArcana extends Component {
  readonly $type: 'DraconicBloodlineArcana';
  readonly SpellDescriptor: SpellDescriptorWrapper;
  readonly SpellsOnly: boolean;
  readonly UseContextBonus: boolean;
  readonly Value: RankedContextValue;
}

export interface IncreaseAllSpellsDC extends Component {
  readonly $type: 'IncreaseAllSpellsDC';
  readonly Value: RankedContextValue;
  readonly Descriptor: ModifierDescriptor;
  readonly SpellsOnly: boolean;
}

export type WeaponFighterGroup =
  | 'None'
  | 'Axes'
  | 'BladesHeavy'
  | 'BladesLight'
  | 'Bows'
  | 'Crossbows'
  | 'Double'
  | 'Flails'
  | 'Hammers'
  | 'Monk'
  | 'Natural'
  | 'Polearms'
  | 'Spears'
  | 'Thrown'
  | 'Close';

export type CombatManeuver =
  | 'None'
  | 'Trip'
  | 'Overrun'
  | 'Disarm'
  | 'Grapple'
  | 'BullRush'
  | 'SunderArmor'
  | 'DirtyTrickBlind'
  | 'DirtyTrickEntangle'
  | 'DirtyTrickSickened'
  | 'Pull'
  | 'AwesomeBlow'
  | 'PullToPointSpell';

export interface WeaponGroupAttackBonus extends Component {
  readonly $type: 'WeaponGroupAttackBonus';
  readonly WeaponGroup: WeaponFighterGroup;
  readonly AttackBonus: number;
  readonly Descriptor: ModifierDescriptor;
  readonly multiplyByContext: boolean;
  readonly contextMultiplier: RankedContextValue;
}

export interface WeaponGroupDamageBonus extends Component {
  readonly $type: 'WeaponGroupDamageBonus';
  readonly WeaponGroup: WeaponFighterGroup;
  readonly DamageBonus: number;
  readonly AdditionalValue: RankedContextValue;
  readonly Descriptor: ModifierDescriptor;
}

export interface AttackBonusAgainstFactOwner extends Component {
  readonly $type: 'AttackBonusAgainstFactOwner';
  readonly m_CheckedFact: Ref | null;
  readonly AttackBonus: number;
  readonly Bonus: RankedContextValue;
  readonly Descriptor: ModifierDescriptor;
  readonly Not: boolean;
}

export interface DamageBonusAgainstFactOwner extends Component {
  readonly $type: 'DamageBonusAgainstFactOwner';
  readonly m_CheckedFact: Ref | null;
  readonly DamageBonus: number;
  readonly Bonus: RankedContextValue;
  readonly Descriptor: ModifierDescriptor;
}

export interface ACBonusAgainstFactOwner extends Component {
  readonly $type: 'ACBonusAgainstFactOwner';
  readonly m_CheckedFact: Ref | null;
  readonly Bonus: number;
  readonly Descriptor: ModifierDescriptor;
  readonly Alignment: AlignmentComponent;
  readonly NoFact: boolean;
}

export interface WeaponTraining extends Component {
  readonly $type: 'WeaponTraining';
}

export interface WeaponTypeDamageStatReplacement extends Component {
  readonly $type: 'WeaponTypeDamageStatReplacement';
  readonly Stat: StatType;
  readonly Category: WeaponCategory;
  readonly OnlyOneHanded: boolean;
  readonly TwoHandedBonus: boolean;
}

export interface ManeuverBonus extends Component {
  readonly $type: 'ManeuverBonus';
  readonly Type: CombatManeuver;
  readonly Mythic: boolean;
  readonly Bonus: number;
  readonly Descriptor: ModifierDescriptor;
  readonly IgnoreFactRank: boolean;
}

export interface ManeuverDefenceBonus extends Component {
  readonly $type: 'ManeuverDefenceBonus';
  readonly Type: CombatManeuver;
  readonly Bonus: number;
  readonly Descriptor: ModifierDescriptor;
}

export interface WeaponFocusParametrized extends Component {
  readonly $type: 'WeaponFocusParametrized';
  readonly m_MythicFocus: Ref | null;
  readonly Descriptor: ModifierDescriptor;
}

export interface WeaponSpecializationParametrized extends Component {
  readonly $type: 'WeaponSpecializationParametrized';
  readonly Mythic: boolean;
}

export interface ImprovedCriticalParametrized extends Component {
  readonly $type: 'ImprovedCriticalParametrized';
}

export interface Feet {
  readonly m_Value: number;
}

export type AreaSetting = 'None' | 'Forest' | 'Highlands' | 'Abyss' | 'Underground' | 'Urban' | 'Desert';

export type SavingThrowType = 'Unknown' | 'Fortitude' | 'Reflex' | 'Will';

export interface Blindsense extends Component {
  readonly $type: 'Blindsense';
  readonly Range: Feet;
  readonly Blindsight: boolean;
}

export interface BuffMovementSpeed extends Component {
  readonly $type: 'BuffMovementSpeed';
  readonly Descriptor: ModifierDescriptor;
  readonly Value: number;
  readonly ContextBonus: RankedContextValue;
  readonly CappedOnMultiplier: boolean;
  readonly MultiplierCap: number;
  readonly CappedMinimum: boolean;
  readonly MinimumCap: number;
}

export interface FavoredEnemy extends Component {
  readonly $type: 'FavoredEnemy';
  readonly m_CheckedFacts: readonly Ref[];
}

export interface FavoredTerrain extends Component {
  readonly $type: 'FavoredTerrain';
  readonly Setting: AreaSetting;
}

export interface Evasion extends Component {
  readonly $type: 'Evasion';
  readonly SavingThrow: SavingThrowType;
}

export interface ImprovedEvasion extends Component {
  readonly $type: 'ImprovedEvasion';
  readonly SavingThrow: SavingThrowType;
}

export interface BuffAllSavesBonus extends Component {
  readonly $type: 'BuffAllSavesBonus';
  readonly Descriptor: ModifierDescriptor;
  readonly Value: number;
}

export interface BuffAllSkillsBonus extends Component {
  readonly $type: 'BuffAllSkillsBonus';
  readonly Descriptor: ModifierDescriptor;
  readonly Value: number;
  readonly Multiplier: RankedContextValue;
}

export interface ACBonusAgainstAttacks extends Component {
  readonly $type: 'ACBonusAgainstAttacks';
  readonly AgainstMeleeOnly: boolean;
  readonly AgainstRangedOnly: boolean;
  readonly OnlySneakAttack: boolean;
  readonly NotTouch: boolean;
  readonly IsTouch: boolean;
  readonly OnlyAttacksOfOpportunity: boolean;
  readonly Value: RankedContextValue;
  readonly ArmorClassBonus: number;
  readonly Descriptor: ModifierDescriptor;
  readonly CheckArmorCategory: boolean;
  readonly NotArmorCategory: readonly ArmorProficiencyGroup[];
  readonly NoShield: boolean;
}

export interface AttackTypeAttackBonus extends Component {
  readonly $type: 'AttackTypeAttackBonus';
  readonly Type: WeaponRangeType;
  readonly AllTypesExcept: boolean;
  readonly AttackBonus: number;
  readonly Descriptor: ModifierDescriptor;
  readonly Value: RankedContextValue;
  readonly CheckFact: boolean;
  readonly m_RequiredFact: Ref | null;
}

export interface CMDBonusAgainstManeuvers extends Component {
  readonly $type: 'CMDBonusAgainstManeuvers';
  readonly Descriptor: ModifierDescriptor;
  readonly Value: RankedContextValue;
  readonly Maneuvers: readonly CombatManeuver[];
}

export interface AddImmunityToAbilityScoreDamage extends Component {
  readonly $type: 'AddImmunityToAbilityScoreDamage';
  readonly Drain: boolean;
  readonly StatTypes: readonly StatType[];
  readonly UseIgnoreRule: boolean;
  readonly IgnoreDescriptors: SpellDescriptorWrapper;
  readonly IgnoreCasterFacts: readonly Ref[];
  readonly IgnoreOnlyIfBothPassed: boolean;
}

export interface AddImmunityToEnergyDrain extends Component {
  readonly $type: 'AddImmunityToEnergyDrain';
}

export interface SavingThrowBonusAgainstFact extends Component {
  readonly $type: 'SavingThrowBonusAgainstFact';
  readonly m_CheckedFact: Ref | null;
  readonly Descriptor: ModifierDescriptor;
  readonly Value: number;
  readonly Alignment: AlignmentComponent;
}

export interface ArcaneSpellFailureIncrease extends Component {
  readonly $type: 'ArcaneSpellFailureIncrease';
  readonly Bonus: number;
  readonly ToShield: boolean;
  readonly Universal: boolean;
}

export interface AddEnergyVulnerability extends Component {
  readonly $type: 'AddEnergyVulnerability';
  readonly Type: DamageEnergyType;
}

export interface AddContextStatBonus extends Component {
  readonly $type: 'AddContextStatBonus';
  readonly Descriptor: 'Racial';
  readonly Stat: StatType;
  readonly Multiplier: number;
  readonly Value: RankedContextValue;
  readonly HasMinimal: boolean;
  readonly Minimal: number;
}

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

export interface ContextRankConfig extends Component {
  readonly $type: 'ContextRankConfig';
  readonly m_Type: AbilityRankType;
  readonly m_BaseValueType: 'ClassLevel' | 'FeatureList';
  readonly m_Class: readonly Ref[];
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

export interface ReplaceStatBaseAttribute extends Component {
  readonly $type: 'ReplaceStatBaseAttribute';
  readonly TargetStat: StatType;
  readonly BaseAttributeReplacement: Attribute;
  readonly ReplaceIfHigher: boolean;
}

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

export type WeaponRangeType =
  | 'Melee'
  | 'Ranged'
  | 'Touch'
  | 'Normal'
  | 'MeleeNormal'
  | 'RangedNormal'
  | 'MeleeTouch'
  | 'RangedTouch';

export type PetType = 'AnimalCompanion' | 'MythicSkeletalChampion' | 'AzataHavocDragon' | 'Clone' | 'NightHag';

interface ConditionBase {
  readonly Not: boolean;
}

export interface OrAndLogic extends ConditionBase {
  readonly $type: 'OrAndLogic';
  readonly ConditionsChecker: { readonly Operation: 'And' | 'Or'; readonly Conditions: readonly Condition[] };
}

export interface ContextConditionHasFact extends ConditionBase {
  readonly $type: 'ContextConditionHasFact';
  readonly m_Fact: Ref;
}

export interface HasFact extends ConditionBase {
  readonly $type: 'HasFact';
  readonly Unit: UnitEvaluator;
  readonly m_Fact: Ref;
}

export interface ContextConditionCharacterClass extends ConditionBase {
  readonly $type: 'ContextConditionCharacterClass';
  readonly CheckCaster: boolean;
  readonly m_Class: Ref;
  readonly MinLevel: number;
}

export interface UnitClass extends ConditionBase {
  readonly $type: 'UnitClass';
  readonly Unit: UnitEvaluator;
  readonly m_Class: Ref;
  readonly LimitMinLevel: boolean;
  readonly MinLevel: IntEvaluator | null;
  readonly LimitMaxLevel: boolean;
  readonly MaxLevel: IntEvaluator | null;
}

export interface IsUnitMythicLevel extends ConditionBase {
  readonly $type: 'IsUnitMythicLevel';
  readonly Unit: UnitEvaluator;
  readonly CheckMinLevel: boolean;
  readonly MinLevel: IntEvaluator | null;
  readonly CheckMaxLevel: boolean;
  readonly MaxLevel: IntEvaluator | null;
}

export interface ContextConditionBuffRank extends ConditionBase {
  readonly $type: 'ContextConditionBuffRank';
  readonly UseFactInsteadBuff: boolean;
  readonly Fact: Ref | null;
  readonly RankValue: ContextValue;
}

export interface ContextConditionIsMainCharacter extends ConditionBase {
  readonly $type: 'ContextConditionIsMainCharacter';
}

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

export type UnitEvaluator =
  | { readonly $type: 'PlayerCharacter' }
  | { readonly $type: 'ContextTargetUnit' }
  | { readonly $type: 'FactOwner' };

export interface IntConstant {
  readonly $type: 'IntConstant';
  readonly Value: number;
}

export type IntEvaluator = IntConstant;

export interface ActionList {
  readonly Actions: readonly GrantAction[];
}

export interface Conditional {
  readonly $type: 'Conditional';
  readonly ConditionsChecker: { readonly Operation: 'And' | 'Or'; readonly Conditions: readonly Condition[] };
  readonly IfTrue: ActionList;
  readonly IfFalse: ActionList;
}

export interface ContextActionAddFeature {
  readonly $type: 'ContextActionAddFeature';
  readonly m_PermanentFeature: Ref;
  readonly m_SetRankFrom: Ref | null;
}

export interface ContextActionApplyBuff {
  readonly $type: 'ContextActionApplyBuff';
  readonly m_Buff: Ref;
  readonly Permanent: boolean;
}

export interface AddFactAction {
  readonly $type: 'AddFact';
  readonly Unit: UnitEvaluator;
  readonly m_Fact: Ref;
}

export type GrantAction = Conditional | ContextActionAddFeature | ContextActionApplyBuff | AddFactAction;

export interface ActivateTrigger extends Component {
  readonly $type: 'ActivateTrigger';
  readonly Conditions: { readonly Operation: 'And' | 'Or'; readonly Conditions: readonly Condition[] };
  readonly Actions: ActionList;
}

export interface AddFactContextActions extends Component {
  readonly $type: 'AddFactContextActions';
  readonly Activated: ActionList;
}

export interface BlueprintBuff extends BlueprintBase {
  readonly $type: 'BlueprintBuff';
  readonly Stacking: StackingType;
}

export type StackingType = 'Replace' | 'Prolong' | 'Ignore' | 'Stack' | 'Poison' | 'Summ' | 'Rank';

export interface BlueprintAbility extends BlueprintBase {
  readonly $type: 'BlueprintAbility';
}

export interface AbilityApplyFact extends Component {
  readonly $type: 'AbilityApplyFact';
  readonly m_Restriction: 'CasterHasNoFact' | 'CasterHasFact';
  readonly m_Facts: readonly Ref[];
}

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

export interface BlueprintActivatableAbility extends BlueprintBase {
  readonly $type: 'BlueprintActivatableAbility';
  readonly m_Buff: Ref;
  readonly Group: ActivatableAbilityGroup;
  readonly WeightInGroup: number;
}

export interface BuffExtraEffects extends Component {
  readonly $type: 'BuffExtraEffects';
  readonly m_CheckedBuff: Ref | null;
  readonly m_ExtraEffectBuff: Ref;
  readonly m_ExceptionFact: Ref | null;
}

export interface MonkNoArmorFeatureUnlock extends Component {
  readonly $type: 'MonkNoArmorFeatureUnlock';
  readonly m_NewFact: Ref;
}

export interface MonkNoArmorAndMonkWeaponFeatureUnlock extends Component {
  readonly $type: 'MonkNoArmorAndMonkWeaponFeatureUnlock';
  readonly m_NewFact: Ref;
  readonly IsZenArcher: boolean;
  readonly m_BowWeaponTypes: readonly Ref[];
  readonly IsSohei: boolean;
}

export interface HasArmorFeatureUnlock extends Component {
  readonly $type: 'HasArmorFeatureUnlock';
  readonly m_NewFact: Ref;
  readonly FilterByBlueprintArmorTypes: boolean;
  readonly m_BlueprintArmorTypes: readonly (Ref | null)[];
  readonly FilterByArmorProficiencyGroup: boolean;
  readonly m_ArmorProficiencyGroupEntries: string | number;
  readonly m_DisableWhenHasShield: boolean;
}

export interface BlueprintItemWeapon extends BlueprintBase {
  readonly $type: 'BlueprintItemWeapon';
  readonly m_Type: Ref;
  readonly m_Enchantments: readonly Ref[];
  readonly Double: boolean;
  readonly m_SecondWeapon: Ref | null;
}

export interface BlueprintItemArmor extends BlueprintBase {
  readonly $type: 'BlueprintItemArmor';
  readonly m_Type: Ref;
  readonly m_Enchantments: readonly Ref[];
}

export interface BlueprintItemShield extends BlueprintBase {
  readonly $type: 'BlueprintItemShield';
  readonly m_ArmorComponent: Ref;
  readonly m_WeaponComponent: Ref | null;
}

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
export type BlueprintItemEquipmentRing = WornItem<'BlueprintItemEquipmentRing'>;

export type WeaponFighterGroupFlags = string | number;

export interface BlueprintWeaponType extends BlueprintBase {
  readonly $type: 'BlueprintWeaponType';
  readonly Category: WeaponCategory;
  readonly m_IsNatural: boolean;
  readonly m_IsMonk: boolean;
  readonly m_IsTwoHanded: boolean;
  readonly m_AttackType: 'Melee' | 'Touch' | 'Ranged' | 'RangedTouch';
  readonly m_FighterGroupFlags: WeaponFighterGroupFlags;
  readonly m_Enchantments: readonly Ref[];
}

export interface BlueprintArmorType extends BlueprintBase {
  readonly $type: 'BlueprintArmorType';
  readonly m_ProficiencyGroup: ArmorProficiencyGroup;
  readonly m_IsArmor: boolean;
  readonly m_Enchantments: readonly Ref[];
}

export interface BlueprintShieldType extends Omit<BlueprintArmorType, '$type'> {
  readonly $type: 'BlueprintShieldType';
}

export interface BlueprintEquipmentEnchantment extends BlueprintBase {
  readonly $type: 'BlueprintEquipmentEnchantment';
}

export interface BlueprintWeaponEnchantment extends BlueprintBase {
  readonly $type: 'BlueprintWeaponEnchantment';
}

export interface BlueprintArmorEnchantment extends BlueprintBase {
  readonly $type: 'BlueprintArmorEnchantment';
}

export interface AddStatBonusEquipment extends Component {
  readonly $type: 'AddStatBonusEquipment';
  readonly Descriptor: 'Enhancement';
  readonly Stat: StatType;
  readonly Value: number;
}

export interface IncreaseStatEquipment extends Component {
  readonly $type: 'IncreaseStatEquipment';
  readonly Descriptor: 'Enhancement';
  readonly Stat: StatType;
  readonly Value: number;
}

export interface AddUnitFeatureEquipment extends Component {
  readonly $type: 'AddUnitFeatureEquipment';
  readonly m_Feature: Ref;
}

export interface AddUnitFactEquipment extends Component {
  readonly $type: 'AddUnitFactEquipment';
  readonly m_Blueprint: Ref;
}

export interface MithralEnchantment extends Component {
  readonly $type: 'MithralEnchantment';
}

export interface WeaponEnhancementBonus extends Component {
  readonly $type: 'WeaponEnhancementBonus';
  readonly EnhancementBonus: number;
  readonly Stack: boolean;
}

export interface ArmorEnhancementBonus extends Component {
  readonly $type: 'ArmorEnhancementBonus';
  readonly EnhancementValue: number;
}

export interface IgnoreArmorGroupComponent extends Component {
  readonly $type: 'IgnoreArmorGroupComponent';
}

export interface EquipmentRestrictionClass extends Component {
  readonly $type: 'EquipmentRestrictionClass';
  readonly m_Class: Ref;
  readonly Not: boolean;
}

export interface EquipmentRestrictionHasAnyClassFromList extends Component {
  readonly $type: 'EquipmentRestrictionHasAnyClassFromList';
  readonly Not: boolean;
  readonly m_Classes: readonly Ref[];
}

export interface EquipmentRestrictionAlignment extends Component {
  readonly $type: 'EquipmentRestrictionAlignment';
  readonly Alignment: string | number;
}

export interface EquipmentRestrictionMainPlayer extends Component {
  readonly $type: 'EquipmentRestrictionMainPlayer';
}

export interface FeatureTagsComponent extends Component {
  readonly $type: 'FeatureTagsComponent';
  readonly FeatureTags: string | number;
}

export type PrerequisiteGroup = 'All' | 'Any' | 'ForcedTrue';

interface PrerequisiteBase extends Component {
  readonly Group: PrerequisiteGroup;
  readonly CheckInProgression: boolean;
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
  readonly m_RestrictIfNot: boolean;
  readonly Amount: number;
}

export interface PrerequisiteClassLevel extends PrerequisiteBase {
  readonly $type: 'PrerequisiteClassLevel';
  readonly m_CharacterClass: Ref;
  readonly Level: number;
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

export interface PrerequisiteEtude extends PrerequisiteBase {
  readonly $type: 'PrerequisiteEtude';
}

export interface PrerequisiteAnySpellsInSpellbook extends PrerequisiteBase {
  readonly $type: 'PrerequisiteAnySpellsInSpellbook';
  readonly m_SpellSpecializationFeat: Ref;
}

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

export interface PrerequisiteConditionForWeaponCategory extends Component {
  readonly $type: 'PrerequisiteConditionForWeaponCategory';
  readonly m_WeaponCategories: readonly WeaponCategory[];
  readonly m_Condition: Condition;
}

export interface ClassLevelsForPrerequisites extends Component {
  readonly $type: 'ClassLevelsForPrerequisites';
  readonly m_FakeClass: Ref;
  readonly m_ActualClass: Ref;
  readonly m_ForSelection: Ref | null;
  readonly Modifier: number;
  readonly Summand: number;
}

export interface ReplaceStatForPrerequisites extends Component {
  readonly $type: 'ReplaceStatForPrerequisites';
  readonly OldStat: StatType;
  readonly Policy: 'NewStat' | 'ClassLevel' | 'ClassLevelStacking' | 'SpecificNumber' | 'Summand' | 'MagusBaseAttack';
  readonly NewStat: StatType;
  readonly m_CharacterClass: Ref | null;
  readonly SpecificNumber: number;
}

export interface AddPet extends Component {
  readonly $type: 'AddPet';
  readonly Type: PetType;
}

export interface BlueprintFeature extends BlueprintBase {
  readonly $type: 'BlueprintFeature';
  readonly Ranks: number;
  readonly HideInUI: boolean;
  readonly HideNotAvailibleInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
}

export type FeatureParameterType =
  | 'Custom'
  | 'SpellSpecialization'
  | 'WeaponCategory'
  | 'SpellSchool'
  | 'LearnSpell'
  | 'Skill'
  | 'FeatureSelection';

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

export interface BlueprintParametrizedFeature extends BlueprintBase {
  readonly $type: 'BlueprintParametrizedFeature';
  readonly Ranks: number;
  readonly HideInUI: boolean;
  readonly HideNotAvailibleInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
  readonly ParameterType: FeatureParameterType;
  readonly WeaponSubCategory: WeaponSubCategory;
  readonly RequireProficiency: boolean;
  readonly m_Prerequisite: Ref | null;
  readonly HasNoSuchFeature: boolean;
  readonly IgnoreParameterFeaturePrerequisites: boolean;
  readonly BlueprintParameterVariants: readonly Ref[] | null;
}

export interface BlueprintFeatureReplaceSpellbook extends BlueprintBase {
  readonly $type: 'BlueprintFeatureReplaceSpellbook';
  readonly Ranks: number;
  readonly HideInUI: boolean;
  readonly HideNotAvailibleInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
  readonly m_Spellbook: Ref;
}

export interface BlueprintFeatureSelectMythicSpellbook extends BlueprintBase {
  readonly $type: 'BlueprintFeatureSelectMythicSpellbook';
  readonly Ranks: number;
  readonly HideInUI: boolean;
  readonly HideNotAvailibleInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
  readonly m_AllowedSpellbooks: readonly Ref[];
}

export interface NoSelectionIfAlreadyHasFeature extends Component {
  readonly $type: 'NoSelectionIfAlreadyHasFeature';
  readonly AnyFeatureFromSelection: boolean;
  readonly m_Features: readonly Ref[];
}

export interface BlueprintRace extends BlueprintBase {
  readonly $type: 'BlueprintRace';
  readonly Ranks: number;
  readonly HideInUI: boolean;
  readonly HideNotAvailibleInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
  readonly m_Features: readonly Ref[];
  readonly SelectableRaceStat: boolean;
}

export interface BlueprintFeatureSelection extends BlueprintBase {
  readonly $type: 'BlueprintFeatureSelection';
  readonly Ranks: number;
  readonly HideInUI: boolean;
  readonly HideNotAvailibleInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
  readonly m_AllFeatures: readonly Ref[];
  readonly Mode: 'Default' | 'OnlyNew' | 'OnlyRankUp';
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
  readonly HideInUI: boolean;
  readonly HideNotAvailibleInUI: boolean;
  readonly Groups: readonly FeatureGroup[];
  readonly LevelEntries: readonly LevelEntry[];
  readonly m_Classes: readonly ClassWithLevel[];
  readonly m_Archetypes: readonly ArchetypeWithLevel[];
  readonly ForAllOtherClasses: boolean;
  readonly m_AlternateProgressionClasses: readonly ClassWithLevel[];
  readonly AlternateProgressionType: 'Div2' | 'Full';
  readonly GiveFeaturesForPreviousLevels: boolean;
  readonly m_ExclusiveProgression: Ref | null;
  readonly m_FeaturesRankIncrease: readonly Ref[] | null;
}

export interface BlueprintCharacterClass extends BlueprintBase {
  readonly $type: 'BlueprintCharacterClass';
  readonly SkillPoints: number;
  readonly HitDie: DiceType;
  readonly PrestigeClass: boolean;
  readonly IsMythic: boolean;
  readonly DontAddCasterLevels: boolean;
  readonly m_IsHigherMythic: boolean;
  readonly HideIfRestricted: boolean;
  readonly HideInUI: boolean;
  readonly m_BaseAttackBonus: Ref;
  readonly m_FortitudeSave: Ref;
  readonly m_ReflexSave: Ref;
  readonly m_WillSave: Ref;
  readonly m_Progression: Ref;
  readonly m_Spellbook: Ref | null;
  readonly ClassSkills: readonly StatType[];
  readonly m_Archetypes: readonly Ref[];
}

export interface BlueprintArchetype extends BlueprintBase {
  readonly $type: 'BlueprintArchetype';
  readonly AddFeatures: readonly LevelEntry[];
  readonly RemoveFeatures: readonly LevelEntry[];
  readonly m_ReplaceSpellbook: Ref | null;
  readonly RemoveSpellbook: boolean;
  readonly m_BaseAttackBonus: Ref | null;
  readonly m_FortitudeSave: Ref | null;
  readonly m_ReflexSave: Ref | null;
  readonly m_WillSave: Ref | null;
  readonly ReplaceClassSkills: boolean;
  readonly ClassSkills: readonly StatType[];
  readonly AddSkillPoints: number;
}

export interface BlueprintStatProgression extends BlueprintBase {
  readonly $type: 'BlueprintStatProgression';
  readonly Bonuses: readonly number[];
}

export interface SpellsLevelEntry {
  readonly Count: readonly number[];
}

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

export interface ProgressionRoot {
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

export interface SystemMechanicsRoot {
  readonly m_BasicFeatSelection: Ref;
  readonly m_MythicFeatSelection: Ref;
  readonly m_MythicAbilitySelection: Ref;
}

export interface BlueprintRoot extends BlueprintBase {
  readonly $type: 'BlueprintRoot';
  readonly Progression: ProgressionRoot;
  readonly SystemMechanics: SystemMechanicsRoot;
  readonly m_BlueprintMythicsSettingsReference: Ref;
  readonly m_DefaultPlayerCharacter: Ref;
}

export interface BlueprintUnit extends BlueprintBase {
  readonly $type: 'BlueprintUnit';
}

export interface BlueprintMythicsSettings extends BlueprintBase {
  readonly $type: 'BlueprintMythicsSettings';
  readonly CharcaterLevelRestrictions: readonly number[];
}

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
const guidByRefText = new Map<string, Guid | undefined>();

export function refGuid(value: unknown): Guid | undefined {
  if (typeof value !== 'string' || !value.startsWith('!bp_')) return undefined;
  let guid = guidByRefText.get(value);
  if (guid === undefined && !guidByRefText.has(value)) guidByRefText.set(value, (guid = REF.exec(value)?.[1]));
  return guid;
}

export function guids(refs: readonly unknown[] | null | undefined): Guid[] {
  return (refs ?? []).map(refGuid).filter((g): g is Guid => g !== undefined);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export interface FoundReference {
  readonly guid: Guid;
  readonly path: string;
  readonly field: string;
  readonly enclosing: string | undefined;
}

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

export function isShown(bp: Blueprint): boolean {
  return bp.name !== undefined && !('HideInUI' in bp && bp.HideInUI);
}

export function bareName(bp: Blueprint): string | undefined {
  const { name, qualifier } = bp;
  if (name === undefined) return undefined;
  return qualifier !== undefined && name.endsWith(` (${qualifier})`) ? name.slice(0, -(qualifier.length + 3)) : name;
}

export type Override = OverrideBase &
  (
    | { readonly change: 'add' }
    | { readonly change: 'remove' }
    | {
        readonly change: 'patch';
        readonly ops: readonly PatchOp[];
      }
    | {
        readonly change: 'name';
        readonly qualifier: string;
      }
    | {
        readonly change: 'alias';
        readonly from: Guid;
      }
    | {
        readonly change: 'summary';
        readonly text: string;
        readonly fingerprint: string;
      }
  );

interface OverrideBase {
  readonly reason: string;
  readonly target: Guid;
}

export interface PatchOp {
  readonly op: 'remove' | 'replace';
  readonly path: string;
  readonly value?: unknown;
}
