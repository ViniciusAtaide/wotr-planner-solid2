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
  offeredClasses: ['Blueprints/Root/ProgressionRoot.cs AvailableCharacterClasses'],
  offeredMythicClasses: ['Blueprints/Root/ProgressionRoot.cs AvailableCharacterMythics'],
  offeredRaces: ['Blueprints/Root/ProgressionRoot.cs CharacterRaces'],
  candidates: ['Blueprints/Classes/BlueprintFeatureSelectMythicSpellbook.cs CollectItems (m_AllowedSpellbooks)'],
} satisfies Cites;
