import type { Place, SlotId } from '../build';
import type { Guid } from '../data';
import type { PrerequisiteLeaf } from '../prerequisites';

export type Rule =
  | 'SelectRace.Check'
  | 'BlueprintRace.GetRestrictedByArchetype'
  | 'SelectRaceStat.Check'
  | 'StatsDistribution.CanAdd'
  | 'StatsDistribution.CanRemove'
  | 'SpendAttributePoint.Check'
  | 'SpendSkillPoint.Check:skill'
  | 'SpendSkillPoint.Check:ranks'
  | 'SpendSkillPoint.Check:points'
  | 'SelectClass.Check:IsMythic'
  | 'BlueprintCharacterClass.MeetsPrerequisites'
  | 'UnitProgressionData.MaxCharacterLevel'
  | 'UnitProgressionData.CanLevelUpMythic'
  | 'adr0003.rankOrder'
  | 'map31.legendEndsAscensions'
  | 'map31.devilFrom'
  | 'map31.switchAtRank8'
  | 'map34.legendChoiceClass'
  | 'AddArchetype.Check'
  | 'UnitProgressionData.CanAddArchetype'
  | 'BlueprintArchetype.MeetsPrerequisites'
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
  | 'map32.notAToggle'
  | 'map32.notHeld'
  | 'ActivatableAbility.TryStart';

export type Value = number | boolean | string | readonly (number | string)[];

export interface Unmet {
  readonly leaf: PrerequisiteLeaf;
  readonly found?: number;
  readonly needed?: number;
}

export interface FailedRule {
  readonly rule: Rule;
  readonly found?: Value;
  readonly needed?: Value;
  readonly unmet?: readonly Unmet[];
}

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
  readonly subject?: Guid | string;
  readonly slot?: SlotId;
}
