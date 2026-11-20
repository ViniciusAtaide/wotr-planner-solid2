import type { Cites } from '../cite';

export const cites = {
  SPELL_SCHOOLS: [
    'Blueprints/Classes/Spells/SpellSchool.cs SpellSchool',
    'Blueprints/Classes/Selection/BlueprintParametrizedFeature.cs CanSelect',
  ],
  parameters: [
    'Blueprints/Classes/Selection/BlueprintParametrizedFeature.cs ExtractSelectionItems (ParameterType, BlueprintParameterVariants)',
  ],
  candidates: ['Blueprints/Classes/BlueprintFeatureSelectMythicSpellbook.cs CollectItems (m_AllowedSpellbooks)'],
} satisfies Cites;
