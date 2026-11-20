import type { Cites } from '../cite';

export const cites = {
  Named: [
    'Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs IsDeity',
    'Designers/Mechanics/Facts/ClassLevelsForPrerequisites.cs ClassLevelsForPrerequisites',
    'UnitLogic/Alignments/AlignmentMaskType.cs AlignmentMaskType',
    'UnitLogic/FactLogic/AddPet.cs AddPet',
  ],
  PrerequisiteLeaf: [
    'Blueprints/Classes/Prerequisites/Prerequisite.cs Prerequisite (Group, CheckInProgression, IsFeatureSelectionWhiteList)',
  ],
  'PrerequisiteLeaf.CheckInProgression': [
    'UnitLogic/Class/LevelUp/Actions/LevelUpHelper.cs AddFeaturesFromProgression',
  ],
  'PrerequisiteLeaf.IsFeatureSelectionWhiteList': ['Blueprints/Classes/BlueprintFeature.cs MeetsPrerequisites'],
  isDeityFeature: [
    'Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs IsDeity',
    'Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs ConsiderFulfilled',
    'Blueprints/Classes/FeatureGroup.cs FeatureGroup',
  ],
  isDeity: ['Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs IsDeity'],
  'readers.PrerequisiteFeature': ['Blueprints/Classes/Prerequisites/PrerequisiteFeature.cs CheckInternal'],
  'readers.PrerequisiteNoFeature': ['Blueprints/Classes/Prerequisites/PrerequisiteNoFeature.cs CheckInternal'],
  'readers.PrerequisitePlayerHasFeature': [
    'Blueprints/Classes/Prerequisites/PrerequisitePlayerHasFeature.cs CheckInternal',
  ],
  'readers.PrerequisiteFeaturesFromList': [
    'Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs CheckInternal (Amount, m_RestrictIfNot)',
    'Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs IsDeity',
  ],
  'readers.PrerequisiteClassLevel': [
    'Blueprints/Classes/Prerequisites/PrerequisiteClassLevel.cs CheckInternal (Level, Not)',
  ],
  'readers.PrerequisiteNoClassLevel': ['Blueprints/Classes/Prerequisites/PrerequisiteNoClassLevel.cs CheckInternal'],
  'readers.PrerequisiteArchetypeLevel': [
    'Blueprints/Classes/Prerequisites/PrerequisiteArchetypeLevel.cs CheckInternal',
  ],
  'readers.PrerequisiteNoArchetype': ['Blueprints/Classes/Prerequisites/PrerequisiteNoArchetype.cs CheckInternal'],
  'readers.PrerequisiteStatValue': ['Blueprints/Classes/Prerequisites/PrerequisiteStatValue.cs CheckUnit'],
  'readers.PrerequisiteFullStatValue': ['Designers/Mechanics/Prerequisites/PrerequisiteFullStatValue.cs CheckUnit'],
  'readers.PrerequisiteCharacterLevel': [
    'Blueprints/Classes/Prerequisites/PrerequisiteCharacterLevel.cs CheckInternal',
  ],
  'readers.PrerequisiteMythicLevel': ['Blueprints/Classes/Prerequisites/PrerequisiteMythicLevel.cs CheckInternal'],
  'readers.PrerequisiteAlignment': ['Blueprints/Classes/Prerequisites/PrerequisiteAlignment.cs CheckInternal'],
  'readers.PrerequisiteProficiency': ['Blueprints/Classes/Prerequisites/PrerequisiteProficiency.cs CheckInternal'],
  'readers.PrerequisiteNotProficient': ['Blueprints/Classes/Prerequisites/PrerequisiteNotProficient.cs CheckInternal'],
  'readers.PrerequisiteCasterType': ['Blueprints/Classes/Prerequisites/PrerequisiteCasterType.cs CheckInternal'],
  'readers.PrerequisiteCasterTypeSpellLevel': [
    'Blueprints/Classes/Prerequisites/PrerequisiteCasterTypeSpellLevel.cs CheckInternal',
    'Blueprints/Classes/Prerequisites/PrerequisiteCasterTypeSpellLevel.cs GetCasterTypeSpellLevel',
  ],
  'readers.PrerequisiteClassSpellLevel': [
    'Blueprints/Classes/Prerequisites/PrerequisiteClassSpellLevel.cs CheckInternal',
  ],
  'readers.PrerequisiteParametrizedFeature': [
    'Blueprints/Classes/Prerequisites/PrerequisiteParametrizedFeature.cs CheckInternal',
    'Blueprints/Classes/Prerequisites/PrerequisiteParametrizedFeature.cs CheckFeature',
  ],
  'readers.PrerequisiteParametrizedWeaponSubcategory': [
    'Blueprints/Classes/Prerequisites/PrerequisiteParametrizedWeaponSubcategory.cs CheckInternal',
    'Blueprints/Classes/Prerequisites/PrerequisiteParametrizedWeaponSubcategory.cs CheckFeature',
  ],
  'readers.PrerequisiteSelectionPossible': [
    'Blueprints/Classes/Prerequisites/PrerequisiteSelectionPossible.cs CheckInternal',
  ],
  'readers.PrerequisitePet': ['Blueprints/Classes/Prerequisites/PrerequisitePet.cs CheckInternal (NoCompanion)'],
  'readers.PrerequisiteIsPet': ['Blueprints/Classes/Prerequisites/PrerequisiteIsPet.cs CheckInternal (Not)'],
  'readers.PrerequisiteMainCharacter': [
    'Blueprints/Classes/Prerequisites/PrerequisiteMainCharacter.cs CheckInternal (Companion)',
  ],
  'readers.PrerequisiteEtude': ['Blueprints/Classes/Prerequisites/PrerequisiteEtude.cs CheckInternal'],
  'readers.PrerequisiteAnySpellsInSpellbook': [
    'Blueprints/Classes/Prerequisites/PrerequisiteAnySpellsInSpellbook.cs CheckInternal',
  ],
  'readers.PrerequisiteCondition': ['Blueprints/Classes/Prerequisites/PrerequisiteCondition.cs CheckInternal'],
  paramPrerequisites: [
    'Blueprints/Classes/Selection/BlueprintParametrizedFeature.cs CanSelect',
    'Blueprints/Classes/Prerequisites/IParamPrerequisite.cs IParamPrerequisite',
  ],
} satisfies Cites;
