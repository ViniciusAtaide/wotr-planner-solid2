import { gearTypes } from './gear';
import { spellbookTypes } from './spellbooks';

export const selectionTypes = [
  'NoSelectionIfAlreadyHasFeature',
  'AddMechanicsFeature',
  'ClassLevelsForPrerequisites',
  'AddPet',
] as const;

export const skillTypes = ['AddClassSkill', 'AddBackgroundClassSkill', 'AddSkillPointPerCharacterLevel'] as const;

export const proficiencyTypes = [
  'AddProficiencies',
  'AddBackgroundWeaponProficiency',
  'AddBackgroundArmorProficiency',
] as const;

export const abilityScoreTypes = [
  'AddStatBonus',
  'AddStatBonusIfHasFact',
  'AddContextStatBonus',
  'ContextRankConfig',
  'ReplaceStatBaseAttribute',
  'ReplaceStatForPrerequisites',
] as const;

export const aspectTypes = ['IncreaseActivatableAbilityGroupSize'] as const;

export const walkAreas: ReadonlyMap<string, readonly string[]> = new Map<string, readonly string[]>([
  ['walk: selections', selectionTypes],
  ['walk: skills', skillTypes],
  ['walk: proficiencies', proficiencyTypes],
  ['walk: spellbooks', spellbookTypes],
  ['walk: ability scores', abilityScoreTypes],
  ['walk: Gear', gearTypes],
  ['walk: aspects kept on', aspectTypes],
]);
