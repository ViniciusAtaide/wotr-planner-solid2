import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadData } from './load';
import { readDataDir } from '../data-dir';
import { kindOf } from '../data';

const data = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));

describe('data/', () => {
  it('passes every load check', () => {
    expect(() => loadData(data.files, data.overrides)).not.toThrow();
  });

  it('holds the root classes the walk starts from', () => {
    const { blueprints } = loadData(data.files, data.overrides);
    expect(blueprints.get('48ac8db94d5de7645906c7d0ad3bcfbd')?.name).toBe('Fighter');
    expect(blueprints.get('5b72dd2ca2cb73b49903806ee8986325')?.$type).toBe('BlueprintProgression');
  });

  it("holds each Mythic rank's Expected level", () => {
    const { blueprints } = loadData(data.files, data.overrides);
    const settings = blueprints.get('3b8a6729da1e13a4e8e606e9f0fa38d8');
    expect(settings).toMatchObject({ CharcaterLevelRestrictions: [0, 6, 7, 9, 11, 14, 15, 16, 17, 17, 19] });
  });

  describe('items (map ticket 12)', () => {
    const { blueprints } = loadData(data.files, data.overrides);
    const items = [...blueprints.values()].filter((b) => kindOf[b.$type] === 'items');

    it('holds the items the dump traces to a source, with the hand-kept list applied', () => {
      for (const guid of [
        'b24d6185acea1f949b026c3b58e47947',
        '3dec5ad0800c41b2aff99cdeceabf00a',
        '0160c8eabe704db41b6309af0d26a8e0',
      ])
        expect(kindOf[blueprints.get(guid)?.$type ?? 'BlueprintRoot'], guid).toBe('items');
      expect(blueprints.get('6c7f785bab7bd1243a43e365dc2089bd')?.name).toBe('Colossus Ring');
      expect(blueprints.has('20375b5a0c9243d45966bd72c690ab74')).toBe(false);
      expect(blueprints.has('ce0842546b73aa34b8fcf40a970ede68')).toBe(false);
    });

    it('holds no equipment the dump traces to no source', () => {
      for (const guid of [
        '5ed9cc5be301fae44b24824074edea0f',
        '37f82ab8449ad3341af335a23a27ceba',
        '0a64791fd9ad3d645aa80149b0144435',
        '5d343648bb8887d42b24cbadfeb36991',
      ])
        expect(blueprints.has(guid), guid).toBe(false);
    });

    it('holds what proficiency reads: the weapon category and the armour group', () => {
      expect(blueprints.get('4a72801171b0cca44b1989b4622b5820')).toMatchObject({
        m_Type: '!bp_afd9065539b3ac5499eddca923654c4b',
      });
      expect(blueprints.get('afd9065539b3ac5499eddca923654c4b')).toMatchObject({ m_ProficiencyGroup: 'Heavy' });
      expect(blueprints.get('7a1211c05ec2c46428f41e3c0db9423f')).toMatchObject({ Category: 'Longbow' });
    });

    it('holds the restrictions a main character meets', () => {
      expect(blueprints.get('4a72801171b0cca44b1989b4622b5820')?.Components).toContainEqual({
        $type: 'EquipmentRestrictionClass',
        Not: true,
        m_Class: '!bp_610d836f3a3a9ed42a4349b62f002e96',
      });
      expect(blueprints.get('17c5e2686dbb5a843b5ba859f22aeea1')?.Components).toEqual([
        { $type: 'EquipmentRestrictionClass', Not: false, m_Class: '!bp_e8f21e5b58e0569468e420ebea456124' },
        { $type: 'EquipmentRestrictionAlignment', Alignment: 'Good' },
      ]);
      expect(blueprints.get('8344b46a6e404227b72d129073383a6c')?.Components).toEqual([
        { $type: 'EquipmentRestrictionMainPlayer' },
      ]);
    });

    it('holds the Enhancement bonus an item gives, which ADR 0002 counts only under its opt-in', () => {
      const belt = blueprints.get('c354de364a714ee4dbe2cfee628df267');
      expect(belt?.$type).toBe('BlueprintItemEquipmentBelt');
      const [enchantment] = (belt as { m_Enchantments: readonly string[] }).m_Enchantments;
      expect(blueprints.get(enchantment!.slice(4))?.Components).toEqual([
        { $type: 'AddStatBonusEquipment', Descriptor: 'Enhancement', Stat: 'Strength', Value: 2 },
      ]);
    });

    it('writes no description as a name', () => {
      expect(blueprints.get('1050ae1293421e24f84a0208fdf0d114')?.name).toBeUndefined();
      expect(items.filter((b) => b.name !== undefined && /[{}]/.test(b.name))).toEqual([]);
    });
  });
});
