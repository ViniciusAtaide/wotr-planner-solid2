// What the walk records when the game refuses a choice: the rule that refused it and the values that rule compared,
// never wording. R (ticket 04) words each rule; the walk and its tests deal only in these.
import type { Place, SlotId } from '../build';
import type { Guid } from '../data/types';
import type { PrerequisiteLeaf } from '../prerequisites';

/**
 * A rule that refuses a choice. A game rule is named by its method, and by the field it tests where the method tests
 * several (`BlueprintFeatureSelection.CanSelect:Mode`); a planner rule by the decision that settled it (`map31…`).
 */
export type Rule =
  // Race, scores and skills (SelectRace, SelectRaceStat, StatsDistribution, SpendAttributePoint, SpendSkillPoint).
  | 'SelectRace.Check'
  | 'BlueprintRace.GetRestrictedByArchetype'
  | 'SelectRaceStat.Check'
  | 'StatsDistribution.CanAdd'
  | 'StatsDistribution.CanRemove'
  | 'SpendAttributePoint.Check'
  | 'SpendSkillPoint.Check:skill'
  | 'SpendSkillPoint.Check:ranks'
  | 'SpendSkillPoint.Check:points'
  // Classes, ranks and archetypes.
  | 'SelectClass.Check:IsMythic'
  | 'BlueprintCharacterClass.MeetsPrerequisites'
  | 'UnitProgressionData.MaxCharacterLevel'
  | 'adr0003.rankOrder'
  | 'map31.legendEndsAscensions'
  | 'map31.devilFrom'
  | 'AddArchetype.Check'
  | 'UnitProgressionData.CanAddArchetype'
  | 'BlueprintArchetype.MeetsPrerequisites'
  // Picks.
  | 'LevelUpState.AddSelection'
  | 'SelectFeature.Check:filled'
  | 'BlueprintFeatureSelection.CanSelect:selection'
  | 'BlueprintFeatureSelection.CanSelect:m_AllFeatures'
  | 'BlueprintFeatureSelection.CanSelect:MeetsPrerequisites'
  | 'BlueprintFeatureSelection.CanSelect:Ranks'
  | 'BlueprintFeatureSelection.CanSelect:Mode'
  | 'NestedFeatureSelectionUtils.AllNestedFeaturesUnavailable'
  | 'BlueprintParametrizedFeature.CanSelect:Items'
  | 'BlueprintParametrizedFeature.CanSelect:SpellSchool'
  | 'BlueprintParametrizedFeature.CanSelect:held'
  | 'BlueprintParametrizedFeature.CanSelect:m_Prerequisite'
  | 'BlueprintParametrizedFeature.CanSelect:RequireProficiency'
  | 'BlueprintParametrizedFeature.CanSelect:Disabled'
  | 'BlueprintParametrizedFeature.CanSelect:IParamPrerequisite'
  | 'BlueprintParametrizedFeature.CanSelect:HasNoSuchFeature'
  | 'BlueprintParametrizedFeature.CanSelect:MeetsPrerequisites'
  | 'BlueprintFeatureSelectMythicSpellbook.CanSelect:Items'
  | 'BlueprintFeatureSelectMythicSpellbook.CanSelect:spellbook'
  | 'BlueprintFeatureSelectMythicSpellbook.CanSelect:m_AllowedSpellbooks'
  // Gear (engine/walk/gear.ts).
  | 'data.unknownItem'
  | 'ItemEntity.CanBeEquippedBy'
  | 'EquipmentSlot.IsItemSupported'
  | 'ArmorSlot.IsItemSupported'
  | 'HandSlot.IsItemTypeSupported:shield'
  | 'HandSlot.IsItemTypeSupported:type'
  | 'HandSlot.IsItemTypeSupported:oneHanded'
  | 'HandSlot.IsItemSupported:twoHanded'
  | 'EquipmentRestrictionClass.CanBeEquippedBy'
  | 'EquipmentRestrictionHasAnyClassFromList.CanBeEquippedBy'
  | 'EquipmentRestrictionAlignment.CanBeEquippedBy'
  | 'ItemEntityWeapon.CanBeEquippedInternal'
  | 'ItemEntityArmor.CanBeEquippedInternal'
  | 'ItemEntityShield.CanBeEquippedInternal'
  // Aspects kept on (map 32).
  | 'map32.notAToggle'
  | 'map32.notHeld'
  | 'ActivatableAbility.TryStart';

/** A value a rule compared: a number, a name the game uses (a stat, an alignment, a place), or several. */
export type Value = number | boolean | string | readonly (number | string)[];

/** A prerequisite leaf that didn't hold, with what the character has and what the leaf asks, where it counts. */
export interface Unmet {
  readonly leaf: PrerequisiteLeaf;
  readonly found?: number;
  readonly needed?: number;
}

/**
 * Why a check refused, as data: the rule, what it found and what it needed, and the leaves that failed when it reads
 * them. R turns it into a Refusal (GLOSSARY.md) in ticket 04.
 */
export interface FailedRule {
  readonly rule: Rule;
  readonly found?: Value;
  readonly needed?: Value;
  readonly unmet?: readonly Unmet[];
}

/** A choice of the Build that the game refuses. */
export interface Failure extends FailedRule {
  readonly place: Place;
  readonly choice:
    | 'race'
    | 'raceStat'
    | 'scores'
    | 'class'
    | 'archetype'
    | 'increase'
    | 'skills'
    | 'rank'
    | 'pick'
    | 'gear'
    | 'aspect';
  /** The class, archetype, race, item, aspect or picked feature. */
  readonly subject?: Guid | string;
  readonly slot?: SlotId;
}
