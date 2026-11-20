// The component types each area of the walk reads, besides the prerequisites (P) and the grants (G) (build ticket
// 02d). The allowlist's A test counts each area as a reader, so every allowlisted type is read by exactly one module.
import { gearTypes } from './gear';
import { spellbookTypes } from './spellbooks';

/** Area 3, selections: what closes a slot, waives a slot's prerequisites, or feeds a selection's prerequisites. */
export const selectionTypes = [
  // Walker.prohibited: BlueprintFeatureSelection.IsSelectionProhibited.
  'NoSelectionIfAlreadyHasFeature',
  // Walker.selectionWaives: the Trickster's TricksterIgnoreFeatPrerequisites flag.
  'AddMechanicsFeature',
  // check.ts lentLevels: PrerequisiteClassLevel.GetClassLevel.
  'ClassLevelsForPrerequisites',
  // check.ts judgeLeaf: PrerequisitePet.CheckInternal.
  'AddPet',
] as const;

/** Skill ranks: class skills (Unit.isClassSkill) and extra skill points (stats.ts skillPointsAvailable). */
export const skillTypes = ['AddClassSkill', 'AddBackgroundClassSkill', 'AddSkillPointPerCharacterLevel'] as const;

/** Proficiencies, for prerequisites and Gear (Unit.weaponProficiencies, Unit.armorProficiencies). */
export const proficiencyTypes = [
  'AddProficiencies',
  'AddBackgroundWeaponProficiency',
  'AddBackgroundArmorProficiency',
] as const;

/**
 * Ability scores: the Racial bonuses in a permanent value (Unit.permanent), the attribute a skill reads
 * (Unit.skillAttribute) and the stat a prerequisite reads (check.ts prerequisiteStat).
 */
export const abilityScoreTypes = [
  'AddStatBonus',
  'AddStatBonusIfHasFact',
  'AddContextStatBonus',
  'ContextRankConfig',
  'ReplaceStatBaseAttribute',
  'ReplaceStatForPrerequisites',
] as const;

/** Aspects kept on (map 32): the group size a toggle's group allows (Walker.keepAspectsOn). */
export const aspectTypes = ['IncreaseActivatableAbilityGroupSize'] as const;

/** Each landed area, by name, with the component types it reads. */
export const walkAreas: ReadonlyMap<string, readonly string[]> = new Map<string, readonly string[]>([
  ['walk: selections', selectionTypes],
  ['walk: skills', skillTypes],
  ['walk: proficiencies', proficiencyTypes],
  ['walk: spellbooks', spellbookTypes],
  ['walk: ability scores', abilityScoreTypes],
  ['walk: Gear', gearTypes],
  ['walk: aspects kept on', aspectTypes],
]);
