import type { Component, Prerequisite } from './types';

const prerequisiteTypeKeys: { readonly [K in Prerequisite['$type']]: true } = {
  PrerequisiteFeature: true,
  PrerequisiteNoFeature: true,
  PrerequisitePlayerHasFeature: true,
  PrerequisiteFeaturesFromList: true,
  PrerequisiteClassLevel: true,
  PrerequisiteNoClassLevel: true,
  PrerequisiteArchetypeLevel: true,
  PrerequisiteNoArchetype: true,
  PrerequisiteStatValue: true,
  PrerequisiteFullStatValue: true,
  PrerequisiteCharacterLevel: true,
  PrerequisiteMythicLevel: true,
  PrerequisiteAlignment: true,
  PrerequisiteProficiency: true,
  PrerequisiteNotProficient: true,
  PrerequisiteCasterType: true,
  PrerequisiteCasterTypeSpellLevel: true,
  PrerequisiteClassSpellLevel: true,
  PrerequisiteParametrizedFeature: true,
  PrerequisiteParametrizedWeaponSubcategory: true,
  PrerequisiteSelectionPossible: true,
  PrerequisitePet: true,
  PrerequisiteIsPet: true,
  PrerequisiteMainCharacter: true,
  PrerequisiteEtude: true,
  PrerequisiteAnySpellsInSpellbook: true,
  PrerequisiteCondition: true,
};

export const prerequisiteTypes: ReadonlySet<string> = new Set(Object.keys(prerequisiteTypeKeys));

export const paramPrerequisiteTypes: ReadonlySet<string> = new Set(['PrerequisiteConditionForWeaponCategory']);

export function isPrerequisite(component: Component): boolean {
  return component.$type.startsWith('Prerequisite') && !paramPrerequisiteTypes.has(component.$type);
}
