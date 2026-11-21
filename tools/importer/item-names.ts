import { guids, refGuid, type Guid } from '~engine/data';

type Json = Readonly<Record<string, unknown>>;

export interface ItemNameSources {
  readonly json: (guid: Guid | undefined) => Json | undefined;
  readonly text: (field: unknown) => string | undefined;
}

export function composedItemName(type: string, json: Json, src: ItemNameSources): string | undefined {
  switch (type) {
    case 'BlueprintItemWeapon':
      return weaponName(json, src);
    case 'BlueprintItemArmor':
      return armorName(json, src);
    case 'BlueprintItemShield':
      return shieldName(json, src);
    default:
      return undefined;
  }
}

function weaponName(json: Json, src: ItemNameSources): string | undefined {
  const itemType = src.json(refGuid(json.m_Type));
  const enchantments = guids(json.m_Enchantments as readonly unknown[] | undefined).map((g) => src.json(g));
  const affixes = (field: string) =>
    enchantments.flatMap((e) => {
      const t = src.text(e?.[field]);
      return t === undefined ? [] : [t];
    });
  const prefixes = affixes('m_Prefix').map((p) => `${p} `);
  const suffixes = affixes('m_Suffix').map((s) => ` ${s}`);
  const composed = [...prefixes, src.text(itemType?.m_DefaultNameText) ?? '', ...suffixes].join('');
  return composed !== '' ? composed : src.text(itemType?.m_TypeNameText);
}

function armorName(json: Json, src: ItemNameSources): string | undefined {
  return src.text(src.json(refGuid(json.m_Type))?.m_DefaultNameText);
}

function shieldName(json: Json, src: ItemNameSources): string | undefined {
  const armor = src.json(refGuid(json.m_ArmorComponent));
  return armor === undefined ? undefined : (src.text(armor.m_DisplayNameText) ?? armorName(armor, src));
}
