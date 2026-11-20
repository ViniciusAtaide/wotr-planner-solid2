// How an item is built (map ticket 12): its weapon or armour type, its enchantments, and the parts worn only with it,
// read as the game's item blueprints read them. The walk's Gear (engine/walk/gear.ts), G's item grants, Gear's twins
// and the importer's Gear names all read items through here. Paths are under decompiled/Assembly-CSharp/Kingmaker/.
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

/** The blueprints an item's references name. */
export interface ItemLookup {
  get(guid: Guid): Blueprint | undefined;
}

/**
 * The fields naming an item worn only as part of another: BlueprintItemShield's halves, and a double weapon's second
 * end (Items/ItemEntityWeapon.cs's constructor makes it; BlueprintItemShield holds its halves).
 */
export const PART_FIELDS = ['m_ArmorComponent', 'm_WeaponComponent', 'm_SecondWeapon'] as const;

/** The items worn only as part of `item`. */
export function partsOf(item: Blueprint): Guid[] {
  const fields = item as unknown as Readonly<Record<string, unknown>>;
  return guids(PART_FIELDS.map((f) => fields[f])).filter((g) => g !== item.guid);
}

/** BlueprintItemWeapon.Type and BlueprintItemArmor.Type: the item's weapon or armour type (m_Type). */
export function itemType(item: Blueprint, blueprints: ItemLookup): Blueprint | undefined {
  return 'm_Type' in item ? blueprints.get(refGuid(item.m_Type) ?? '') : undefined;
}

/** BlueprintItemWeapon.Type. */
export function weaponType(weapon: BlueprintItemWeapon, blueprints: ItemLookup): BlueprintWeaponType | undefined {
  return itemType(weapon, blueprints) as BlueprintWeaponType | undefined;
}

/** BlueprintItemArmor.Type: an armour's type, or a shield's armour half's shield type. */
export function armorType(armor: BlueprintItemArmor, blueprints: ItemLookup): BlueprintArmorType | undefined {
  return itemType(armor, blueprints) as BlueprintArmorType | undefined;
}

/** BlueprintItemShield.ArmorComponent: a shield's armour half. */
export function shieldArmor(shield: BlueprintItemShield, blueprints: ItemLookup): BlueprintItemArmor | undefined {
  return blueprints.get(refGuid(shield.m_ArmorComponent) ?? '') as BlueprintItemArmor | undefined;
}

/** BlueprintItemShield.WeaponComponent: a shield's bash weapon. */
export function shieldWeapon(shield: BlueprintItemShield, blueprints: ItemLookup): BlueprintItemWeapon | undefined {
  return blueprints.get(refGuid(shield.m_WeaponComponent) ?? '') as BlueprintItemWeapon | undefined;
}

/**
 * Blueprints/Items/BlueprintItem.cs CollectEnchantments: its type's enchantments, then its own; for a shield,
 * BlueprintItemShield.CollectEnchantments: its armour half's, then its bash weapon's.
 */
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
