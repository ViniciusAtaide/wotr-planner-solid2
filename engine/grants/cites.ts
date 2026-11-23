import type { Cites } from '../cite';

export const cites = {
  'GrantKind.root': ['Blueprints/Root/BlueprintRoot.cs BlueprintRoot (Progression, m_DefaultPlayerCharacter)'],
  'GrantKind.classProgression': [
    'Blueprints/Classes/BlueprintCharacterClass.cs BlueprintCharacterClass (m_Progression)',
  ],
  'GrantKind.classArchetype': ['Blueprints/Classes/BlueprintCharacterClass.cs BlueprintCharacterClass (m_Archetypes)'],
  'GrantKind.levelEntry': ['Blueprints/Classes/BlueprintProgression.cs BlueprintProgression (LevelEntries)'],
  'GrantKind.archetypeAdd': ['Blueprints/Classes/BlueprintArchetype.cs BlueprintArchetype (AddFeatures)'],
  'GrantKind.archetypeRemove': ['Blueprints/Classes/BlueprintArchetype.cs BlueprintArchetype (RemoveFeatures)'],
  'GrantKind.selectionOption': [
    'Blueprints/Classes/Selection/BlueprintFeatureSelection.cs BlueprintFeatureSelection (m_AllFeatures)',
  ],
  'GrantKind.raceFeature': [
    'Blueprints/Classes/BlueprintRace.cs BlueprintRace (m_Features)',
    'UnitLogic/Class/LevelUp/Actions/SelectRace.cs Apply',
  ],
  'GrantKind.FactSinglify': ['Designers/Mechanics/Facts/FactSinglify.cs FactSinglify (m_NewFacts)'],
  'GrantKind.FactSinglifyRemove': ['Designers/Mechanics/Facts/FactSinglify.cs FactSinglify (m_OldFacts)'],
  'GrantKind.GearUnlock': [
    'Designers/Mechanics/Buffs/MonkNoArmorFeatureUnlock.cs MonkNoArmorFeatureUnlock',
    'Designers/Mechanics/Buffs/MonkNoArmorAndMonkWeaponFeatureUnlock.cs MonkNoArmorAndMonkWeaponFeatureUnlock',
    'Designers/Mechanics/Buffs/HasArmorFeatureUnlock.cs HasArmorFeatureUnlock',
  ],
  'GrantKind.ActivatableBuff': [
    'UnitLogic/ActivatableAbilities/BlueprintActivatableAbility.cs BlueprintActivatableAbility (m_Buff)',
  ],
  'GrantKind.itemEnchantment': ['Blueprints/Items/BlueprintItem.cs CollectEnchantments'],
  'GrantKind.shieldPart': ['Blueprints/Items/Shields/BlueprintItemShield.cs CollectEnchantments'],
  GrantParam: ['Blueprints/Classes/Selection/FeatureParam.cs FeatureParam'],
  paramOf: ['UnitLogic/FactLogic/AddParametrizedFeatures.cs FeatureData (Param)'],
  typedItem: ['Blueprints/Items/BlueprintItem.cs CollectEnchantments'],
  wornItem: ['Blueprints/Items/BlueprintItem.cs CollectEnchantments'],
  'blueprintReaders.BlueprintRoot': [
    'UnitLogic/UnitProgressionData.cs UnitProgressionData',
    'Blueprints/Root/ProgressionRoot.cs AvailableCharacterClasses',
    'Blueprints/Root/ProgressionRoot.cs AvailableCharacterMythics',
    'UnitLogic/Class/LevelUp/Actions/SelectRace.cs SelectRace',
    'UI/MVVM/_VM/CharGen/Phases/Race/CharGenRacePhaseVM.cs CharGenRacePhaseVM',
    'UnitLogic/UnitProgressionData.cs AddClassLevel',
    'UnitLogic/Class/LevelUp/LevelUpController.cs Commit',
    'UnitLogic/Class/LevelUp/LevelUpController.cs GetEffectiveLevel',
    'UnitLogic/Class/LevelUp/FeatureSelectionState.cs HasLevelupPlan',
    'Blueprints/Classes/AddClassLevels.cs PerformSelections',
    'Game.cs LoadNewGame',
    'Blueprints/Root/BlueprintRoot.cs BlueprintRoot (m_DefaultPlayerCharacter)',
  ],
  'blueprintReaders.BlueprintCharacterClass': [
    'UnitLogic/Class/LevelUp/Actions/ApplyClassMechanics.cs Apply',
    'UnitLogic/Class/LevelUp/Actions/AddArchetype.cs Check',
  ],
  'blueprintReaders.BlueprintProgression': ['UnitLogic/Class/LevelUp/Actions/LevelUpHelper.cs UpdateProgression'],
  'blueprintReaders.BlueprintArchetype': ['UnitLogic/ProgressionData.cs CalculateLevelEntries'],
  'blueprintReaders.BlueprintFeatureSelection': [
    'Blueprints/Classes/Selection/BlueprintFeatureSelection.cs CanSelect (m_AllFeatures)',
  ],
  'blueprintReaders.BlueprintRace': ['UnitLogic/Class/LevelUp/Actions/SelectRace.cs Apply'],
  'blueprintReaders.BlueprintActivatableAbility': [
    'UnitLogic/ActivatableAbilities/ActivatableAbility.cs ReapplyBuff (m_Buff)',
  ],
  'blueprintReaders.BlueprintItemShield': [
    'Blueprints/Items/Shields/BlueprintItemShield.cs CollectEnchantments',
    'Items/ItemEntityShield.cs CanBeEquippedInternal',
  ],
  gearUnlock: [
    'Designers/Mechanics/Buffs/MonkNoArmorFeatureUnlock.cs MonkNoArmorFeatureUnlock (m_NewFact)',
    'Designers/Mechanics/Buffs/MonkNoArmorAndMonkWeaponFeatureUnlock.cs MonkNoArmorAndMonkWeaponFeatureUnlock (m_NewFact)',
    'Designers/Mechanics/Buffs/HasArmorFeatureUnlock.cs HasArmorFeatureUnlock (m_NewFact)',
  ],
  'componentReaders.AddFacts': ['UnitLogic/FactLogic/AddFacts.cs UpdateFacts'],
  'componentReaders.AddFeatureOnClassLevel': ['Designers/Mechanics/Facts/AddFeatureOnClassLevel.cs Apply'],
  'componentReaders.AddFeatureIfHasFact': ['Designers/Mechanics/Facts/AddFeatureIfHasFact.cs Apply'],
  'componentReaders.AddFeatureOnApply': ['Designers/Mechanics/Facts/AddFeatureOnApply.cs OnActivate'],
  'componentReaders.RemoveFeatureOnApply': ['Designers/Mechanics/Facts/RemoveFeatureOnApply.cs OnActivate'],
  'componentReaders.AddFeatureOnAlignment': ['Designers/Mechanics/Facts/AddFeatureOnAlignment.cs OnActivate'],
  'componentReaders.AddFeatureOnSkill': ['Designers/Mechanics/Facts/AddFeatureOnSkill.cs OnActivate'],
  'componentReaders.AddParametrizedFeatures': ['UnitLogic/FactLogic/AddParametrizedFeatures.cs OnActivate'],
  'componentReaders.AddFeatureParametrized': [
    'Designers/Mechanics/Facts/AddFeatureParametrized.cs OnActivate',
    'Blueprints/Classes/Selection/BlueprintParametrizedFeature.cs ExtractSelectionItems (BlueprintParameterVariants)',
  ],
  'componentReaders.FactSinglify': ['Designers/Mechanics/Facts/FactSinglify.cs OnActivate'],
  'componentReaders.KensaiChosenWeapon': ['Designers/Mechanics/Facts/KensaiChosenWeapon.cs OnActivate'],
  'componentReaders.AddFactContextActions': [
    'UnitLogic/Mechanics/Components/AddFactContextActions.cs OnActivate (Activated)',
  ],
  'componentReaders.ActivateTrigger': [
    'Designers/EventConditionActionSystem/Events/ActivateTrigger.cs Trigger (Actions)',
  ],
  'componentReaders.BuffExtraEffects': ['Designers/Mechanics/Facts/BuffExtraEffects.cs CheckAndReapply'],
  'componentReaders.AbilityApplyFact': [
    'UnitLogic/Abilities/AbilityData.cs GetConversions',
    'UnitLogic/Abilities/Components/AbilityApplyFact.cs Apply',
  ],
  'componentReaders.AddUnitFeatureEquipment': [
    'Designers/Mechanics/EquipmentEnchants/AddUnitFeatureEquipment.cs OnActivate',
  ],
  'componentReaders.AddUnitFactEquipment': ['Designers/Mechanics/EquipmentEnchants/AddUnitFactEquipment.cs OnActivate'],
  equipmentGrants: [
    'Designers/Mechanics/EquipmentEnchants/AddUnitFeatureEquipment.cs OnActivate',
    'Designers/Mechanics/EquipmentEnchants/AddUnitFactEquipment.cs OnActivate',
  ],
  'GRANT_ACTION_FIELDS.ContextActionAddFeature': [
    'UnitLogic/Mechanics/Actions/ContextActionAddFeature.cs RunAction (m_PermanentFeature)',
  ],
  'GRANT_ACTION_FIELDS.AddFact': ['Designers/EventConditionActionSystem/Actions/AddFact.cs RunAction (m_Fact)'],
  'GRANT_ACTION_FIELDS.ContextActionApplyBuff': [
    'UnitLogic/Mechanics/Actions/ContextActionApplyBuff.cs RunAction (m_Buff)',
  ],
  'ActionGrant.rankFrom': [
    'UnitLogic/Mechanics/Actions/ContextActionAddFeature.cs RunAction (m_SetRankFrom)',
    'UnitLogic/Feature.cs SetRank',
  ],
  actionGrant: [
    'UnitLogic/Mechanics/Actions/ContextActionApplyBuff.cs RunAction',
    'UnitLogic/Mechanics/Actions/ContextActionApplyBuff.cs CalculateDuration (Permanent)',
  ],
  actionGrants: ['Designers/EventConditionActionSystem/Actions/Conditional.cs RunAction (IfTrue, IfFalse)'],
  grantorKind: ['Blueprints/Classes/FeatureGroup.cs FeatureGroup'],
} satisfies Cites;
