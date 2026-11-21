import type { Cites } from '../cite';

export const cites = {
  SPELL_DESCRIPTORS: ['Blueprints/Classes/Spells/SpellDescriptor.cs SpellDescriptor'],
  weaponGroupsOf: ['Blueprints/Items/Weapons/BlueprintWeaponType.cs BlueprintWeaponType (m_FighterGroupFlags)'],
  componentTopics: [
    'Designers/Mechanics/Facts/WeaponGroupAttackBonus.cs OnEventAboutToTrigger (WeaponGroup)',
    'Designers/Mechanics/Facts/IncreaseSpellDescriptorDC.cs OnEventAboutToTrigger (Descriptor)',
    'UnitLogic/FactLogic/AddDamageResistanceEnergy.cs Bypassed (Type)',
  ],
  STACKING_DESCRIPTORS: ['Enums/ModifierDescriptorHelper.cs ModifierDescriptorHelper (DefaultStackingDescriptors)'],
  stackable: ['Enums/ModifierDescriptorHelper.cs IsStackable', 'EntitySystem/Stats/ModifiableValue.cs Stacks'],
} satisfies Cites;
