import type { FieldDefaults } from './compact';

export const FIELD_DEFAULTS: FieldDefaults = {
  '{AdditionalLevel,m_Archetype}': {
    AdditionalLevel: 0,
  },
  '{AdditionalLevel,m_Class}': {
    AdditionalLevel: 0,
  },
  '{BaseValue,IncreasedByLevel,IncreasedByLevelStartPlusDivStep,IncreasedByStat,LevelIncrease,LevelStep,MinClassLevelIncrease,OtherClassesModifier,PerStepIncrease,ResourceBonusStat,StartingIncrease,StartingLevel,m_Archetypes,m_ArchetypesDiv,m_Class,m_ClassDiv}':
    {
      BaseValue: 0,
      IncreasedByLevel: false,
      IncreasedByLevelStartPlusDivStep: false,
      IncreasedByStat: false,
      LevelIncrease: 0,
      LevelStep: 0,
      m_Archetypes: [],
      m_ArchetypesDiv: [],
      m_Class: [],
      m_ClassDiv: [],
      MinClassLevelIncrease: 0,
      OtherClassesModifier: 0,
      PerStepIncrease: 0,
      StartingIncrease: 0,
      StartingLevel: 0,
    },
  '{BaseValue,ProgressionValue}': {
    BaseValue: 0,
    ProgressionValue: 0,
  },
  '{Conditions,Operation}': {
    Conditions: [],
  },
  '{Count}': {
    Count: [],
  },
  '{Level,m_Features}': {
    Level: 0,
    m_Features: [],
  },
  '{m_BasicFeatSelection,m_CharacterClasses,m_CharacterMythics,m_CharacterRaces,m_DeitySelection,m_FeatsProgression,m_MythicLegen,m_MythicLegenFake,m_MythicStartingClass}':
    {
      m_CharacterClasses: [],
      m_CharacterMythics: [],
      m_CharacterRaces: [],
    },
  '{m_Value}': {
    m_Value: 0,
  },
  '{ParamObject,ParamSpellSchool,ParamWeaponCategory,Stat,m_Feature}': {
    ParamObject: null,
    ParamSpellSchool: 'None',
  },
  '{Value,ValueRank,ValueType}': {
    Value: 0,
    ValueRank: 'Default',
  },
  '{Value,ValueType}': {
    Value: 0,
  },
  AbilityApplyFact: {
    m_Facts: [],
  },
  ACBonusAgainstAttacks: {
    AgainstMeleeOnly: false,
    AgainstRangedOnly: false,
    ArmorClassBonus: 0,
    CheckArmorCategory: false,
    Descriptor: 'None',
    IsTouch: false,
    NoShield: false,
    NotArmorCategory: [],
    NotTouch: false,
    OnlyAttacksOfOpportunity: false,
    OnlySneakAttack: false,
  },
  ACBonusAgainstFactOwner: {
    Alignment: 'None',
    Bonus: 0,
    Descriptor: 'None',
    m_CheckedFact: null,
    NoFact: false,
  },
  AddAbilityResources: {
    Amount: 0,
    m_Resource: null,
    UseThisAsResource: false,
  },
  AddBackgroundArmorProficiency: {
    Proficiency: 'None',
  },
  AddContextStatBonus: {
    HasMinimal: false,
    Minimal: 0,
    Multiplier: 0,
  },
  AddDamageResistancePhysical: {
    BypassedByAlignment: false,
    BypassedByEpic: false,
    BypassedByForm: false,
    BypassedByMagic: false,
    BypassedByMaterial: false,
    MinEnhancementBonus: 1,
    Or: false,
  },
  AddFacts: {
    HasDifficultyRequirements: false,
    InvertDifficultyRequirements: false,
    m_Facts: [],
  },
  AddFeatureIfHasFact: {
    Not: false,
  },
  AddFeatureOnAlignment: {
    Alignment: 'None',
    m_Facts: [],
  },
  AddFeatureOnClassLevel: {
    BeforeThisLevel: false,
    Level: 0,
    m_AdditionalClasses: null,
    m_Archetypes: null,
    m_Class: null,
  },
  AddFeatureOnSkill: {
    m_Facts: [],
    MinimalStat: 0,
  },
  AddFortification: {
    Bonus: 0,
    UseContextValue: false,
  },
  AddImmunityToAbilityScoreDamage: {
    Drain: false,
    IgnoreCasterFacts: [],
    IgnoreDescriptors: {
      m_IntValue: '0',
    },
    IgnoreOnlyIfBothPassed: false,
    StatTypes: [],
    UseIgnoreRule: false,
  },
  AddParametrizedFeatures: {
    m_Features: [],
  },
  AddProficiencies: {
    ArmorProficiencies: null,
    m_RaceRestriction: null,
    WeaponProficiencies: null,
  },
  AddSpellResistance: {
    AddBonusToResistance: false,
    AddCR: false,
    AllSpellResistancePenaltyDoNotUse: false,
  },
  AddStatBonus: {
    Descriptor: 'None',
    ScaleByBasicAttackBonus: false,
    Value: 0,
  },
  AddStatBonusEquipment: {
    Descriptor: 'None',
    Value: 0,
  },
  AddStatBonusIfHasFact: {
    Descriptor: 'None',
    InvertCondition: false,
    m_CheckedFacts: [],
    RequireAllFacts: false,
  },
  AllSavesBonusEquipment: {
    Descriptor: 'None',
    Value: 0,
  },
  ArcaneSpellFailureIncrease: {
    Bonus: 0,
    ToShield: false,
    Universal: false,
  },
  ArmorEnhancementBonus: {
    EnhancementValue: 0,
  },
  AttackBonusAgainstFactOwner: {
    AttackBonus: 0,
    Descriptor: 'None',
    m_CheckedFact: null,
    Not: false,
  },
  AttackTypeAttackBonus: {
    AllTypesExcept: false,
    AttackBonus: 0,
    CheckFact: false,
    Descriptor: 'None',
    m_RequiredFact: null,
  },
  Blindsense: {
    Blindsight: false,
  },
  BlueprintAbilityResource: {
    IsDomainAbility: false,
    m_Max: 0,
    m_Min: 0,
    m_UseMax: false,
  },
  BlueprintActivatableAbility: {
    Group: 'None',
    WeightInGroup: 0,
  },
  BlueprintArchetype: {
    AddFeatures: [],
    AddSkillPoints: 0,
    ClassSkills: [],
    m_BaseAttackBonus: null,
    m_FortitudeSave: null,
    m_ReflexSave: null,
    m_ReplaceSpellbook: null,
    m_WillSave: null,
    RemoveFeatures: [],
    RemoveSpellbook: false,
    ReplaceClassSkills: false,
  },
  BlueprintArmorType: {
    m_Enchantments: [],
    m_IsArmor: false,
    m_ProficiencyGroup: 'None',
  },
  BlueprintCharacterClass: {
    ClassSkills: [],
    DontAddCasterLevels: false,
    HideIfRestricted: false,
    HideInUI: false,
    IsMythic: false,
    m_Archetypes: [],
    m_IsHigherMythic: false,
    m_Spellbook: null,
    PrestigeClass: false,
    SkillPoints: 0,
  },
  BlueprintFeature: {
    Groups: [],
    HideInUI: false,
    HideNotAvailibleInUI: false,
    Ranks: 0,
  },
  BlueprintFeatureReplaceSpellbook: {
    Groups: [],
    HideInUI: false,
    HideNotAvailibleInUI: false,
    Ranks: 0,
  },
  BlueprintFeatureSelection: {
    ExceptWhiteListed: false,
    Group: 'None',
    Groups: [],
    HideInUI: false,
    HideNotAvailibleInUI: false,
    IgnorePrerequisites: false,
    m_AllFeatures: [],
    Obligatory: false,
    Ranks: 0,
  },
  BlueprintFeatureSelectMythicSpellbook: {
    Groups: [],
    HideInUI: false,
    HideNotAvailibleInUI: false,
    m_AllowedSpellbooks: [],
    Ranks: 0,
  },
  BlueprintItemArmor: {
    m_Enchantments: [],
  },
  BlueprintItemEquipmentBelt: {
    m_Enchantments: [],
  },
  BlueprintItemEquipmentFeet: {
    m_Enchantments: [],
  },
  BlueprintItemEquipmentGlasses: {
    m_Enchantments: [],
  },
  BlueprintItemEquipmentGloves: {
    m_Enchantments: [],
  },
  BlueprintItemEquipmentHead: {
    m_Enchantments: [],
  },
  BlueprintItemEquipmentNeck: {
    m_Enchantments: [],
  },
  BlueprintItemEquipmentRing: {
    m_Enchantments: [],
  },
  BlueprintItemEquipmentShirt: {
    m_Enchantments: [],
  },
  BlueprintItemEquipmentShoulders: {
    m_Enchantments: [],
  },
  BlueprintItemEquipmentWrist: {
    m_Enchantments: [],
  },
  BlueprintItemShield: {
    m_WeaponComponent: null,
  },
  BlueprintItemWeapon: {
    Double: false,
    m_Enchantments: [],
    m_SecondWeapon: null,
  },
  BlueprintMythicsSettings: {
    CharcaterLevelRestrictions: [],
  },
  BlueprintParametrizedFeature: {
    BlueprintParameterVariants: null,
    Groups: [],
    HasNoSuchFeature: false,
    HideInUI: false,
    HideNotAvailibleInUI: false,
    IgnoreParameterFeaturePrerequisites: false,
    m_Prerequisite: null,
    Ranks: 0,
    RequireProficiency: false,
    WeaponSubCategory: 'None',
  },
  BlueprintProgression: {
    ForAllOtherClasses: false,
    GiveFeaturesForPreviousLevels: false,
    Groups: [],
    HideInUI: false,
    HideNotAvailibleInUI: false,
    LevelEntries: [],
    m_AlternateProgressionClasses: [],
    m_Archetypes: [],
    m_Classes: [],
    m_ExclusiveProgression: null,
    m_FeaturesRankIncrease: null,
    Ranks: 0,
  },
  BlueprintRace: {
    Groups: [],
    HideInUI: false,
    HideNotAvailibleInUI: false,
    m_Features: [],
    Ranks: 0,
    SelectableRaceStat: false,
  },
  BlueprintSpellbook: {
    CasterLevelModifier: 0,
    IsArcane: false,
    IsMythic: false,
    Spontaneous: false,
  },
  BlueprintSpellsTable: {
    Levels: [],
  },
  BlueprintStatProgression: {
    Bonuses: [],
  },
  BlueprintWeaponType: {
    m_Enchantments: [],
    m_IsMonk: false,
    m_IsNatural: false,
    m_IsTwoHanded: false,
  },
  BuffAllSavesBonus: {
    Descriptor: 'None',
    Value: 0,
  },
  BuffAllSkillsBonus: {
    Descriptor: 'None',
    Value: 0,
  },
  BuffDescriptorImmunity: {
    CheckFact: false,
    m_FactToCheck: null,
    m_IgnoreFeature: null,
  },
  BuffExtraEffects: {
    m_CheckedBuff: null,
    m_ExceptionFact: null,
  },
  BuffMovementSpeed: {
    CappedMinimum: false,
    CappedOnMultiplier: false,
    Descriptor: 'None',
    MinimumCap: 0,
    MultiplierCap: 0,
    Value: 0,
  },
  ClassLevelsForPrerequisites: {
    m_ForSelection: null,
    Modifier: 0,
    Summand: 0,
  },
  CMDBonusAgainstManeuvers: {
    Descriptor: 'None',
    Maneuvers: [],
  },
  CompanionInParty: {
    Not: false,
  },
  ConcentrationBonus: {
    CheckFact: false,
    m_RequiredFact: null,
  },
  ContextActionAddFeature: {
    m_SetRankFrom: null,
  },
  ContextActionApplyBuff: {
    Permanent: false,
  },
  ContextConditionBuffRank: {
    Fact: null,
    Not: false,
    UseFactInsteadBuff: false,
  },
  ContextConditionCharacterClass: {
    CheckCaster: false,
    MinLevel: 0,
    Not: false,
  },
  ContextConditionHasFact: {
    Not: false,
  },
  ContextConditionIsMainCharacter: {
    Not: false,
  },
  ContextConditionIsWeaponEquipped: {
    BothHandsAreEmpty: false,
    CheckOnCaster: false,
    CheckSlot: false,
    CheckWeaponCategory: false,
    CheckWeaponRangeType: false,
    JustCheckEmptyHand: false,
    Not: false,
    Slot: 'PrimaryHand',
  },
  ContextRankConfig: {
    m_Class: [],
    m_CustomProgression: [],
    m_ExceptClasses: false,
    m_FeatureList: [],
    m_Max: 0,
    m_Min: 0,
    m_StartLevel: 0,
    m_StepLevel: 0,
    m_UseMax: false,
    m_UseMin: false,
  },
  DamageBonusAgainstFactOwner: {
    DamageBonus: 0,
    Descriptor: 'None',
    m_CheckedFact: null,
  },
  DraconicBloodlineArcana: {
    SpellsOnly: true,
    UseContextBonus: false,
  },
  EquipmentRestrictionClass: {
    Not: false,
  },
  EquipmentRestrictionHasAnyClassFromList: {
    m_Classes: [],
    Not: false,
  },
  EtudeStatus: {
    Not: false,
  },
  FactSinglify: {
    m_NewFacts: [],
    m_OldFacts: [],
  },
  FavoredEnemy: {
    m_CheckedFacts: [],
  },
  FavoredTerrain: {
    Setting: 'None',
  },
  HasArmorFeatureUnlock: {
    FilterByArmorProficiencyGroup: false,
    FilterByBlueprintArmorTypes: false,
    m_ArmorProficiencyGroupEntries: 0,
    m_BlueprintArmorTypes: [],
    m_DisableWhenHasShield: false,
  },
  HasFact: {
    Not: false,
  },
  IncreaseActivatableAbilityGroupSize: {
    Group: 'None',
  },
  IncreaseAllSpellsDC: {
    Descriptor: 'None',
    SpellsOnly: false,
  },
  IncreaseSpellDescriptorCasterLevel: {
    BonusCasterLevel: 0,
    ModifierDescriptor: 'None',
    SpellsOnly: false,
  },
  IncreaseSpellDescriptorDC: {
    BonusDC: 0,
    ModifierDescriptor: 'None',
    SpellsOnly: false,
  },
  IncreaseSpellSchoolCasterLevel: {
    BonusLevel: 0,
    Descriptor: 'None',
    School: 'None',
  },
  IncreaseSpellSchoolDC: {
    BonusDC: 0,
    Descriptor: 'None',
    School: 'None',
  },
  IncreaseStatEquipment: {
    Descriptor: 'None',
    Value: 0,
  },
  IntConstant: {
    Value: 0,
  },
  IsCampaign: {
    Not: false,
  },
  IsUnitMythicLevel: {
    CheckMaxLevel: false,
    CheckMinLevel: false,
    MaxLevel: null,
    MinLevel: null,
    Not: false,
  },
  ManeuverBonus: {
    Bonus: 0,
    Descriptor: 'None',
    IgnoreFactRank: false,
    Mythic: false,
    Type: 'None',
  },
  ManeuverDefenceBonus: {
    Bonus: 0,
    Descriptor: 'None',
    Type: 'None',
  },
  MonkNoArmorAndMonkWeaponFeatureUnlock: {
    IsSohei: false,
    IsZenArcher: false,
    m_BowWeaponTypes: [],
  },
  NoSelectionIfAlreadyHasFeature: {
    AnyFeatureFromSelection: false,
    m_Features: [],
  },
  OrAndLogic: {
    Not: false,
  },
  PrerequisiteAlignment: {
    ArchetypeAlignment: false,
    CheckInProgression: false,
    IngorePrerequisiteCheck: false,
    IsFeatureSelectionWhiteList: false,
  },
  PrerequisiteAnySpellsInSpellbook: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
  },
  PrerequisiteArchetypeLevel: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    Level: 0,
  },
  PrerequisiteCasterType: {
    CheckInProgression: false,
    IsArcane: false,
    IsFeatureSelectionWhiteList: false,
  },
  PrerequisiteCasterTypeSpellLevel: {
    CheckInProgression: false,
    IsArcane: false,
    IsFeatureSelectionWhiteList: false,
    OnlySpontaneous: false,
    RequiredSpellLevel: 0,
  },
  PrerequisiteCharacterLevel: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    Level: 0,
  },
  PrerequisiteClassLevel: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    Level: 0,
    Not: false,
  },
  PrerequisiteClassSpellLevel: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    RequiredSpellLevel: 0,
  },
  PrerequisiteCondition: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
  },
  PrerequisiteConditionForWeaponCategory: {
    m_WeaponCategories: [],
  },
  PrerequisiteEtude: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
  },
  PrerequisiteFeature: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
  },
  PrerequisiteFeaturesFromList: {
    Amount: 0,
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    m_Features: [],
    m_RestrictIfNot: false,
  },
  PrerequisiteFullStatValue: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    Value: 0,
  },
  PrerequisiteIsPet: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    Not: false,
  },
  PrerequisiteMainCharacter: {
    CheckInProgression: false,
    Companion: false,
    IsFeatureSelectionWhiteList: false,
  },
  PrerequisiteMythicLevel: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    Level: 0,
  },
  PrerequisiteNoArchetype: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
  },
  PrerequisiteNoClassLevel: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
  },
  PrerequisiteNoFeature: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
  },
  PrerequisiteNotProficient: {
    ArmorProficiencies: null,
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    WeaponProficiencies: null,
  },
  PrerequisiteParametrizedFeature: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    SpellSchool: 'None',
  },
  PrerequisiteParametrizedWeaponSubcategory: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    SubCategory: 'None',
  },
  PrerequisitePet: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    NoCompanion: false,
  },
  PrerequisitePlayerHasFeature: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
  },
  PrerequisiteProficiency: {
    ArmorProficiencies: null,
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    WeaponProficiencies: null,
  },
  PrerequisiteSelectionPossible: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
  },
  PrerequisiteStatValue: {
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    Value: 0,
  },
  ReplaceStatBaseAttribute: {
    ReplaceIfHigher: false,
  },
  ReplaceStatForPrerequisites: {
    m_CharacterClass: null,
    SpecificNumber: 0,
  },
  SavingThrowBonusAgainstDescriptor: {
    m_DisablingFeature: null,
    ModifierDescriptor: 'None',
    OnlyPositiveValue: false,
    Value: 0,
  },
  SavingThrowBonusAgainstFact: {
    Alignment: 'None',
    Descriptor: 'None',
    m_CheckedFact: null,
    Value: 0,
  },
  SavingThrowBonusAgainstSchool: {
    ModifierDescriptor: 'None',
    School: 'None',
    Value: 0,
  },
  SkipLevelsForSpellProgression: {
    Levels: [],
  },
  SpellImmunityToSpellDescriptor: {
    m_CasterIgnoreImmunityFact: null,
  },
  SpellPenetrationBonus: {
    CheckFact: false,
    Descriptor: 'None',
    m_RequiredFact: null,
  },
  UnitClass: {
    LimitMaxLevel: false,
    LimitMinLevel: false,
    MaxLevel: null,
    MinLevel: null,
    Not: false,
  },
  WeaponEnhancementBonus: {
    EnhancementBonus: 0,
    Stack: false,
  },
  WeaponFocusParametrized: {
    Descriptor: 'None',
    m_MythicFocus: null,
  },
  WeaponGroupAttackBonus: {
    AttackBonus: 0,
    Descriptor: 'None',
    multiplyByContext: false,
    WeaponGroup: 'None',
  },
  WeaponGroupDamageBonus: {
    DamageBonus: 0,
    Descriptor: 'None',
    WeaponGroup: 'None',
  },
  WeaponSpecializationParametrized: {
    Mythic: false,
  },
  WeaponTypeDamageStatReplacement: {
    OnlyOneHanded: false,
    TwoHandedBonus: false,
  },
};
