import {
  guids,
  refGuid,
  type Blueprint,
  type BlueprintArmorType,
  type BlueprintItemArmor,
  type BlueprintItemShield,
  type BlueprintItemWeapon,
  type BlueprintWeaponType,
  type Guid,
} from './types';

export interface ItemLookup {
  get(guid: Guid): Blueprint | undefined;
}

export const PART_FIELDS = ['m_ArmorComponent', 'm_WeaponComponent', 'm_SecondWeapon'] as const;

export function partsOf(item: Blueprint): Guid[] {
  const fields = item as unknown as Readonly<Record<string, unknown>>;
  return guids(PART_FIELDS.map((f) => fields[f])).filter((g) => g !== item.guid);
}

export function itemType(item: Blueprint, blueprints: ItemLookup): Blueprint | undefined {
  return 'm_Type' in item ? blueprints.get(refGuid(item.m_Type) ?? '') : undefined;
}

export function weaponType(weapon: BlueprintItemWeapon, blueprints: ItemLookup): BlueprintWeaponType | undefined {
  return itemType(weapon, blueprints) as BlueprintWeaponType | undefined;
}

export function armorType(armor: BlueprintItemArmor, blueprints: ItemLookup): BlueprintArmorType | undefined {
  return itemType(armor, blueprints) as BlueprintArmorType | undefined;
}

export function shieldArmor(shield: BlueprintItemShield, blueprints: ItemLookup): BlueprintItemArmor | undefined {
  return blueprints.get(refGuid(shield.m_ArmorComponent) ?? '') as BlueprintItemArmor | undefined;
}

export function shieldWeapon(shield: BlueprintItemShield, blueprints: ItemLookup): BlueprintItemWeapon | undefined {
  return blueprints.get(refGuid(shield.m_WeaponComponent) ?? '') as BlueprintItemWeapon | undefined;
}

export function enchantmentsOf(item: Blueprint, blueprints: ItemLookup): Guid[] {
  if (item.$type === 'BlueprintItemShield') {
    return guids([item.m_ArmorComponent, item.m_WeaponComponent]).flatMap((g) => {
      const part = blueprints.get(g);
      return part === undefined ? [] : enchantmentsOf(part, blueprints);
    });
  }
  if (!('m_Enchantments' in item)) return [];
  const type = itemType(item, blueprints);
  const typeEnchantments = type !== undefined && 'm_Enchantments' in type ? type.m_Enchantments : [];
  return guids([...typeEnchantments, ...item.m_Enchantments]);
}
