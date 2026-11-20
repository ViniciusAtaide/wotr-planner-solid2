import type { Cites } from '../cite';

export const cites = {
  Alignment: ['Enums/Alignment.cs Alignment'],
  Place: ['UnitLogic/Class/LevelUp/LevelUpState.cs LevelUpState'],
  SlotId: ['UnitLogic/Class/LevelUp/LevelUpState.cs AddSelection'],
  Pick: ['UnitLogic/Class/LevelUp/Actions/SelectFeature.cs SelectFeature (m_ItemFeature, m_ItemParam)'],
  LevelUp: [
    'UnitLogic/Class/LevelUp/Actions/SelectClass.cs SelectClass',
    'UnitLogic/Class/LevelUp/Actions/SpendAttributePoint.cs SpendAttributePoint',
    'UnitLogic/Class/LevelUp/Actions/SpendSkillPoint.cs SpendSkillPoint',
  ],
  'LevelUp.increase': ['UnitLogic/Class/LevelUp/Actions/SelectClass.cs Apply'],
  GearPlace: [
    'Items/Slots/EquipmentSlot.cs EquipmentSlot',
    'Items/Slots/ArmorSlot.cs ArmorSlot',
    'Items/Slots/HandSlot.cs HandSlot',
  ],
  'Build.raceStat': ['UnitLogic/Class/LevelUp/Actions/SelectRaceStat.cs SelectRaceStat'],
  'Build.scores': ['UnitLogic/Class/LevelUp/StatsDistribution.cs StatsDistribution'],
  'Build.aspects': ['UnitLogic/ActivatableAbilities/BlueprintActivatableAbility.cs BlueprintActivatableAbility'],
} satisfies Cites;
