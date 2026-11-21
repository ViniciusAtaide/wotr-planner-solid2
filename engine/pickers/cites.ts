import type { Cites } from '../cite';

export const cites = {
  SPELL_SCHOOLS: [
    'Blueprints/Classes/Spells/SpellSchool.cs SpellSchool',
    'Blueprints/Classes/Selection/BlueprintParametrizedFeature.cs CanSelect',
  ],
  parameters: [
    'Blueprints/Classes/Selection/BlueprintParametrizedFeature.cs ExtractSelectionItems (ParameterType, BlueprintParameterVariants)',
  ],
  shownInSelection: [
    'UI/MVVM/_VM/CharGen/Phases/FeatureSelector/CharGenFeatureSelectorStateVM.cs CreateFeaturesList',
    'UI/MVVM/_VM/CharGen/Phases/FeatureSelector/CharGenFeatureSelectorItemVM.cs ShouldBeHidden (HideNotAvailibleInUI)',
  ],
  BACKGROUNDS_BASE_SELECTION: [
    'UI/MVVM/_VM/CharGen/Phases/FeatureSelector/CharGenFeatureSelectorPhaseVM.cs GetFeaturePriority',
  ],
  offeredClasses: ['Blueprints/Root/ProgressionRoot.cs AvailableCharacterClasses'],
  offeredMythicClasses: [
    'Blueprints/Root/ProgressionRoot.cs AvailableCharacterMythics',
    'Blueprints/Root/ProgressionRoot.cs MythicLegenFake',
    'UnitLogic/Class/LevelUp/LevelUpController.cs Commit',
  ],
  mythicStartingClass: ['Blueprints/Root/ProgressionRoot.cs MythicStartingClass'],
  offeredRaces: ['Blueprints/Root/ProgressionRoot.cs CharacterRaces'],
  characterWideSlots: [
    'UI/MVVM/_VM/CharGen/Phases/FeatureSelector/CharGenFeatureSelectorPhaseVM.cs GetFeaturePriority',
    'Blueprints/Root/ProgressionRoot.cs DeitySelection',
    'UnitLogic/Class/LevelUp/Actions/SelectRace.cs Apply',
  ],
  FEATURE_TAG_BITS: ['Blueprints/Classes/Selection/FeatureTag.cs FeatureTag'],
  featureTags: [
    'UI/MVVM/_VM/CharGen/Phases/FeatureSelector/CharGenFeatureSelectorItemVM.cs CharGenFeatureSelectorItemVM',
    'Designers/Mechanics/Facts/FeatureTagsComponent.cs FeatureTagsComponent (FeatureTags)',
  ],
  candidates: ['Blueprints/Classes/BlueprintFeatureSelectMythicSpellbook.cs CollectItems (m_AllowedSpellbooks)'],
} satisfies Cites;
