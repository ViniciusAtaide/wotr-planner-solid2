import { describe, expect, it } from 'vitest';
import type { Guid } from '~engine/data';
import { composedItemName, type ItemNameSources } from './item-names';

const LONGSWORD = 'd56c44bc9eb10204c8b386a02c7eed21';
const CHAINSHIRT = '7467b0ab8641d8f43af7fc46f2108a91';
const COLD_IRON = '0000000000000000000000000000c01d';
const PLUS_1 = 'd42fc23b92c640846ac137dc26e000d4';
const ARMOR_HALF = '00000000000000000000000000000a4a';
const r = (guid: Guid) => `!bp_${guid}`;
const text = (s: string) => ({ m_Key: s });

const blueprints: Record<Guid, Record<string, unknown>> = {
  [LONGSWORD]: { m_TypeNameText: text('Longsword'), m_DefaultNameText: text('Longsword') },
  [CHAINSHIRT]: { m_TypeNameText: text('Chain shirt'), m_DefaultNameText: text('Chainshirt') },
  [COLD_IRON]: { m_Prefix: text('Cold Iron'), m_Suffix: text('') },
  [PLUS_1]: { m_Prefix: text(''), m_Suffix: text('+1') },
  [ARMOR_HALF]: { m_DisplayNameText: text(''), m_Type: r(CHAINSHIRT) },
};
const src: ItemNameSources = {
  json: (g) => (g === undefined ? undefined : blueprints[g]),
  text: (field) => {
    const key = (field as { m_Key?: string } | undefined)?.m_Key;
    return key === undefined || key === '' ? undefined : key;
  },
};

describe('names the game composes for an item without its own', () => {
  it('names a weapon from its prefixes, its type and its suffixes', () => {
    expect(composedItemName('BlueprintItemWeapon', { m_Type: r(LONGSWORD), m_Enchantments: [] }, src)).toBe(
      'Longsword',
    );
    const enchanted = { m_Type: r(LONGSWORD), m_Enchantments: [r(COLD_IRON), r(PLUS_1)] };
    expect(composedItemName('BlueprintItemWeapon', enchanted, src)).toBe('Cold Iron Longsword +1');
  });

  it('names an armour from its type alone, and a shield from its armour half', () => {
    expect(composedItemName('BlueprintItemArmor', { m_Type: r(CHAINSHIRT), m_Enchantments: [r(PLUS_1)] }, src)).toBe(
      'Chainshirt',
    );
    expect(composedItemName('BlueprintItemShield', { m_ArmorComponent: r(ARMOR_HALF) }, src)).toBe('Chainshirt');
  });

  it('names nothing else', () => {
    expect(composedItemName('BlueprintItemEquipmentRing', {}, src)).toBeUndefined();
  });
});
