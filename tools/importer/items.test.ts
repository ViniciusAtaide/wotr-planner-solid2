// The sourcing rules on a small made-up dump: which references give an item, and which don't.
import { describe, expect, it } from 'vitest';
import type { DumpIndex } from './import';
import { checkSourcedCount, naturalWeapons, itemSourcing, RESEARCH_COUNT } from './items';

const g = (n: number) => `b${String(n).padStart(31, '0')}`;
const r = (n: number) => `!bp_${g(n)}`;
const t = (type: string) => `0, ${type}`;

/** Blueprint number → its type and JSON; the index is built from them as indexDump would. */
function dump(blueprints: Record<number, Record<string, unknown>>) {
  const json = new Map<string, Record<string, unknown>>();
  const types = new Map<string, string>();
  const refs = new Map<string, string[]>();
  for (const [n, bp] of Object.entries(blueprints)) {
    json.set(g(Number(n)), bp);
    types.set(g(Number(n)), String(bp.$type).slice(3));
    refs.set(
      g(Number(n)),
      [...JSON.stringify(bp).matchAll(/!bp_([0-9a-f]{32})/g)].map((m) => m[1]),
    );
  }
  const index: DumpIndex = { types, refs, roots: [], settings: [] };
  return { index, json };
}

describe('item sourcing', () => {
  const { index, json } = dump({
    1: { $type: t('BlueprintItemEquipmentRing'), m_Enchantments: [] },
    2: { $type: t('BlueprintLoot'), Items: [{ m_Item: r(1) }] },
    3: { $type: t('BlueprintItemEquipmentHead'), m_Enchantments: [] },
    4: { $type: t('BlueprintSharedVendorTable'), m_Fixed: [{ $type: t('LootItemsPackFixed'), m_Item: r(3) }] },
    5: { $type: t('BlueprintItemEquipmentNeck'), m_Enchantments: [] },
    6: { $type: t('BlueprintSharedVendorTable'), m_Fixed: [{ $type: t('LootItemsPackFixed'), m_Item: r(5) }] },
    7: { $type: t('BlueprintUnit'), Components: [{ $type: t('AddSharedVendor'), m_Table: r(6) }] },
    8: { $type: t('BlueprintWeaponType'), m_IsNatural: true },
    9: { $type: t('BlueprintItemWeapon'), m_Type: r(8), m_Enchantments: [] },
    10: { $type: t('BlueprintItemWeapon'), m_Type: r(17), m_Enchantments: [] },
    11: { $type: t('BlueprintItemArmor'), m_Enchantments: [] },
    12: { $type: t('BlueprintItemShield'), m_ArmorComponent: r(11), m_WeaponComponent: null },
    13: { $type: t('BlueprintUnit'), m_EmptyHandWeapon: r(9), m_Armor: r(12), m_AdditionalLimbs: [r(10)] },
    14: { $type: t('BlueprintCue'), OnStop: { Actions: [{ $type: t('Recruit'), m_CompanionBlueprint: r(13) }] } },
    15: { $type: t('BlueprintAnswer'), OnSelect: { Actions: [{ $type: t('ItemsEnough'), m_ItemToCheck: r(16) }] } },
    16: { $type: t('BlueprintItemEquipmentFeet'), m_Enchantments: [] },
    17: { $type: t('BlueprintWeaponType'), m_IsNatural: false },
  });
  const sourced = itemSourcing(index).source(json);

  it('takes an item from a chest, and from a vendor table something references', () => {
    expect(sourced.get(g(1))).toEqual(new Set(['chest']));
    expect(sourced.get(g(5))).toEqual(new Set(['vendor']));
  });

  it('leaves out a vendor table nothing references, and a reference that only checks', () => {
    expect(sourced.has(g(3))).toBe(false);
    expect(sourced.has(g(16))).toBe(false);
  });

  it("takes a recruited companion's gear and a shield's parts, but no extra limb", () => {
    expect(sourced.get(g(12))).toEqual(new Set(['companion gear']));
    expect(sourced.get(g(11))).toEqual(new Set(['form or part']));
    expect(sourced.has(g(10))).toBe(false); // an additional limb is no gear
  });

  it('takes the empty hand as the research did, and names it as a natural weapon for an override to drop', () => {
    // WeaponEmptyHand 20375b5a0c9243d45966bd72c690ab74 comes in through a companion's m_EmptyHandWeapon; map 12's
    // hand-kept list drops it.
    expect(sourced.get(g(9))).toEqual(new Set(['companion gear']));
    expect(naturalWeapons(sourced.keys(), json)).toEqual([g(9)]);
  });

  it("checks the count against the research's", () => {
    expect(checkSourcedCount(RESEARCH_COUNT)).toBeUndefined();
    expect(checkSourcedCount(RESEARCH_COUNT + 200)).toMatch(/investigate/);
  });
});
