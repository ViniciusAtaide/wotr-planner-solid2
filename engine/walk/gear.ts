// Gear (GLOSSARY.md; map ticket 12; ADR 0002): one item in each worn place, plus a main hand and an off hand. The walk
// judges each item as the game does when the main character equips it (Items/ItemEntity.cs CanBeEquippedBy, which
// for the player's party runs CanBeEquippedInternal: the item's EquipmentRestriction components, and proficiency for
// a weapon, armour or shield), and holds what a worn item gives. Paths are under decompiled/Assembly-CSharp/Kingmaker/.
import type { Build, Gear, GearPlace } from '../build';
import { armorType, enchantmentsOf, shieldArmor, weaponType } from '../data/items';
import {
  refGuid,
  type AddMechanicsFeature,
  type AddStatBonusEquipment,
  type Blueprint,
  type BlueprintItemArmor,
  type BlueprintItemWeapon,
  type EquipmentRestrictionAlignment,
  type EquipmentRestrictionClass,
  type EquipmentRestrictionHasAnyClassFromList,
  type Guid,
  type IncreaseStatEquipment,
  type StatType,
} from '../data/types';
import { inMask } from './check';
import type { FailedRule } from './failure';
import type { Unit } from './unit';

/** The component types the Gear area reads besides G's equipment grants. */
export const gearTypes = [
  'AddStatBonusEquipment',
  'IncreaseStatEquipment',
  'MithralEnchantment',
  'IgnoreArmorGroupComponent',
  'EquipmentRestrictionClass',
  'EquipmentRestrictionHasAnyClassFromList',
  'EquipmentRestrictionAlignment',
  'EquipmentRestrictionMainPlayer',
] as const;

/** Items/Slots/EquipmentSlot.cs IsItemSupported: the item type each worn place takes. */
const WORN: Readonly<Partial<Record<GearPlace, Blueprint['$type']>>> = {
  Head: 'BlueprintItemEquipmentHead',
  Glasses: 'BlueprintItemEquipmentGlasses',
  Neck: 'BlueprintItemEquipmentNeck',
  Shoulders: 'BlueprintItemEquipmentShoulders',
  Shirt: 'BlueprintItemEquipmentShirt',
  Belt: 'BlueprintItemEquipmentBelt',
  Wrist: 'BlueprintItemEquipmentWrist',
  Gloves: 'BlueprintItemEquipmentGloves',
  Feet: 'BlueprintItemEquipmentFeet',
  Ring1: 'BlueprintItemEquipmentRing',
  Ring2: 'BlueprintItemEquipmentRing',
};

/**
 * ItemEntityWeapon.CanTakeOneHand: a melee two-hander under the FighterOnHandedGrip flag (a held AddMechanicsFeature),
 * else neither two-handed nor double.
 */
function oneHanded(unit: Unit, weapon: BlueprintItemWeapon): boolean {
  const type = weaponType(weapon, unit.data.blueprints);
  if (type?.m_IsTwoHanded) {
    const grip = unit
      .componentsOf<AddMechanicsFeature>('AddMechanicsFeature')
      .some((c) => c.component.m_Feature === 'FighterOnHandedGrip');
    return type.m_AttackType === 'Melee' && grip;
  }
  return !weapon.Double;
}

/**
 * Whether an item fits its place: Items/Slots/EquipmentSlot.cs IsItemSupported, ArmorSlot (body armour, whose type is
 * armour), and HandSlot.IsItemTypeSupported and IsItemSupported: a shield only in the off hand, an off-hand weapon
 * one-handed, and a two-handed main-hand weapon with nothing in the off hand. Undefined when it fits.
 */
export function misfit(unit: Unit, gear: Gear, place: GearPlace): FailedRule | undefined {
  const item = unit.bp(gear[place] ?? '');
  if (item === undefined) return { rule: 'data.unknownItem' };
  const worn = WORN[place];
  if (worn !== undefined) {
    return item.$type === worn ? undefined : { rule: 'EquipmentSlot.IsItemSupported', found: item.$type, needed: worn };
  }
  if (place === 'Armor') {
    const type = item.$type === 'BlueprintItemArmor' ? armorType(item, unit.data.blueprints) : undefined;
    return type?.m_IsArmor ? undefined : { rule: 'ArmorSlot.IsItemSupported', found: item.$type };
  }
  if (item.$type === 'BlueprintItemShield') {
    return place === 'OffHand' ? undefined : { rule: 'HandSlot.IsItemTypeSupported:shield', found: place };
  }
  if (item.$type !== 'BlueprintItemWeapon') return { rule: 'HandSlot.IsItemTypeSupported:type', found: item.$type };
  if (place === 'OffHand' && !oneHanded(unit, item)) return { rule: 'HandSlot.IsItemTypeSupported:oneHanded' };
  if (place === 'MainHand' && gear.OffHand !== undefined && !oneHanded(unit, item)) {
    return { rule: 'HandSlot.IsItemSupported:twoHanded', found: gear.OffHand };
  }
  return undefined;
}

/**
 * Items/ItemEntity.cs CanBeEquippedBy for the main character: BlueprintItemEquipment.CanBeEquippedBy (every
 * EquipmentRestriction), then ItemEntityWeapon, ItemEntityArmor and ItemEntityShield CanBeEquippedInternal (the
 * weapon's category, the armour's group unless an IgnoreArmorGroupComponent waives it, the shield's armour group).
 * Undefined when the character can wear it.
 */
export function cannotWear(unit: Unit, item: Blueprint): FailedRule | undefined {
  for (const c of item.Components) {
    switch (c.$type) {
      case 'EquipmentRestrictionClass': {
        // Blueprints/Items/Components/EquipmentRestrictionClass.cs CanBeEquippedBy.
        const r = c as EquipmentRestrictionClass;
        const level = unit.classLevel(refGuid(r.m_Class) ?? '');
        if (r.Not ? level !== 0 : level <= 0) {
          return { rule: 'EquipmentRestrictionClass.CanBeEquippedBy', found: level, needed: r.Not ? 0 : 1 };
        }
        break;
      }
      case 'EquipmentRestrictionHasAnyClassFromList': {
        // Blueprints/Items/Components/EquipmentRestrictionHasAnyClassFromList.cs CanBeEquippedBy.
        const r = c as EquipmentRestrictionHasAnyClassFromList;
        const any = r.m_Classes.some((g) => unit.classLevel(refGuid(g) ?? '') > 0);
        if (any === r.Not) return { rule: 'EquipmentRestrictionHasAnyClassFromList.CanBeEquippedBy', found: any };
        break;
      }
      case 'EquipmentRestrictionAlignment': {
        // Blueprints/Items/Components/EquipmentRestrictionAlignment.cs CanBeEquippedBy. An unchosen alignment leaves
        // the Build incomplete, not impossible.
        const r = c as EquipmentRestrictionAlignment;
        if (unit.alignment !== undefined && !inMask(unit.alignment, r.Alignment)) {
          return { rule: 'EquipmentRestrictionAlignment.CanBeEquippedBy', found: unit.alignment, needed: r.Alignment };
        }
        break;
      }
      case 'EquipmentRestrictionMainPlayer':
        // A Build is the main character (map ticket 01).
        break;
    }
  }
  if (item.$type === 'BlueprintItemWeapon') {
    const category = weaponType(item, unit.data.blueprints)?.Category;
    if (category === undefined || !unit.weaponProficiencies().has(category)) {
      return { rule: 'ItemEntityWeapon.CanBeEquippedInternal', ...(category !== undefined && { needed: category }) };
    }
  } else if (item.$type === 'BlueprintItemArmor') {
    const type = armorType(item, unit.data.blueprints);
    const ignored = [type, item].some((b) => b?.Components.some((c) => c.$type === 'IgnoreArmorGroupComponent'));
    if (!ignored && !unit.armorProficiencies().has(type?.m_ProficiencyGroup ?? '')) {
      return {
        rule: 'ItemEntityArmor.CanBeEquippedInternal',
        ...(type !== undefined && { needed: type.m_ProficiencyGroup }),
      };
    }
  } else if (item.$type === 'BlueprintItemShield') {
    const armor = shieldArmor(item, unit.data.blueprints);
    const group = armor === undefined ? undefined : armorType(armor, unit.data.blueprints)?.m_ProficiencyGroup;
    if (group === undefined || !unit.armorProficiencies().has(group)) {
      return { rule: 'ItemEntityShield.CanBeEquippedInternal', ...(group !== undefined && { needed: group }) };
    }
  }
  return undefined;
}

/**
 * Items/ItemEntityArmor.cs ArmorType: the armour's group, one lighter when a mithral enchantment is on it (heavy is
 * medium, medium is light).
 */
export function wornArmorGroup(unit: Unit, gear: Gear): string | undefined {
  const armor = unit.bp(gear.Armor ?? '') as BlueprintItemArmor | undefined;
  if (armor?.$type !== 'BlueprintItemArmor') return undefined;
  const group = armorType(armor, unit.data.blueprints)?.m_ProficiencyGroup;
  const mithral = armor.m_Enchantments.some((r) =>
    unit.bp(refGuid(r) ?? '')?.Components.some((c) => c.$type === 'MithralEnchantment'),
  );
  if (!mithral) return group;
  return group === 'Heavy' ? 'Medium' : group === 'Medium' ? 'Light' : group;
}

/** The worn items' Enhancement bonus to a stat: the largest counts (ModifiableValue.ApplyModifiersFiltered). */
export function gearEnhancement(unit: Unit, worn: readonly Guid[], stat: StatType): number {
  let best = 0;
  for (const item of worn) {
    const bp = unit.bp(item);
    for (const g of bp === undefined ? [] : enchantmentsOf(bp, unit.data.blueprints)) {
      for (const c of unit.bp(g)?.Components ?? []) {
        if (c.$type !== 'AddStatBonusEquipment' && c.$type !== 'IncreaseStatEquipment') continue;
        const b = c as AddStatBonusEquipment | IncreaseStatEquipment;
        if (b.Stat === stat && b.Descriptor === 'Enhancement') best = Math.max(best, b.Value);
      }
    }
  }
  return best;
}

/** The Build's Gear, place by place, in a fixed order. */
export function gearOf(build: Build): [GearPlace, Guid][] {
  const order: GearPlace[] = [
    'Armor',
    'Head',
    'Glasses',
    'Neck',
    'Shoulders',
    'Shirt',
    'Belt',
    'Wrist',
    'Gloves',
    'Feet',
    'Ring1',
    'Ring2',
    'MainHand',
    'OffHand',
  ];
  return order.flatMap((p): [GearPlace, Guid][] => (build.gear?.[p] === undefined ? [] : [[p, build.gear[p] as Guid]]));
}

/** Kingmaker/Blueprints/Items/Armors/ArmorProficiencyGroup.cs, in order: ArmorProficiencyGroupFlag is 1 << index. */
const ARMOR_GROUPS = [
  'None',
  'Light',
  'Medium',
  'Heavy',
  'Buckler',
  'LightShield',
  'HeavyShield',
  'TowerShield',
  'LightBarding',
  'MediumBarding',
  'HeavyBarding',
];

/** RestrictionsHelper.CheckArmor (flags): the group's bit is in the ArmorProficiencyGroupFlag value. */
export function armorGroupInFlags(group: string | undefined, flags: string | number): boolean {
  const index = ARMOR_GROUPS.indexOf(group ?? '');
  if (index < 0) return false;
  const bits =
    typeof flags === 'number'
      ? flags
      : flags.split(',').reduce((b, name) => b | (1 << ARMOR_GROUPS.indexOf(name.trim())), 0);
  return ((1 << index) & bits) !== 0;
}
