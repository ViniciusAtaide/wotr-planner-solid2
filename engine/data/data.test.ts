// The committed data/ itself: everything the importer wrote passes every load check (guide §3 point 8, "When
// loading"). This runs without the dump, so CI checks the data it ships.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadData } from './load';
import { readDataDir } from './read-dir';
import { kindOf } from './types';

const data = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));

describe('data/', () => {
  it('passes every load check', () => {
    expect(() => loadData(data.files, data.overrides)).not.toThrow();
  });

  it('holds the root classes the walk starts from', () => {
    const { blueprints } = loadData(data.files, data.overrides);
    // FighterClass 48ac8db94d5de7645906c7d0ad3bcfbd and BasicFeatsProgression 5b72dd2ca2cb73b49903806ee8986325.
    expect(blueprints.get('48ac8db94d5de7645906c7d0ad3bcfbd')?.name).toBe('Fighter');
    expect(blueprints.get('5b72dd2ca2cb73b49903806ee8986325')?.$type).toBe('BlueprintProgression');
  });

  it("holds each Mythic rank's Expected level", () => {
    const { blueprints } = loadData(data.files, data.overrides);
    // MythicsSettings 3b8a6729da1e13a4e8e606e9f0fa38d8 CharcaterLevelRestrictions, indexed by rank (ADR 0003).
    const settings = blueprints.get('3b8a6729da1e13a4e8e606e9f0fa38d8');
    expect(settings).toMatchObject({ CharcaterLevelRestrictions: [0, 6, 7, 9, 11, 14, 15, 16, 17, 17, 19] });
  });

  describe('items (map ticket 12)', () => {
    const { blueprints } = loadData(data.files, data.overrides);
    const items = [...blueprints.values()].filter((b) => kindOf[b.$type] === 'items');

    it('holds the items the dump traces to a source, with the hand-kept list applied', () => {
      // Each from a source the research names (obtainable-items.md): the Aeon path's cloak Artifact_AeonCloakItem
      // b24d6185acea1f949b026c3b58e47947, Legendary Bracers LegendaryBracersItem 3dec5ad0800c41b2aff99cdeceabf00a and
      // Draven's Hat DravensHatItem 0160c8eabe704db41b6309af0d26a8e0.
      for (const guid of [
        'b24d6185acea1f949b026c3b58e47947',
        '3dec5ad0800c41b2aff99cdeceabf00a',
        '0160c8eabe704db41b6309af0d26a8e0',
      ])
        expect(kindOf[blueprints.get(guid)?.$type ?? 'BlueprintRoot'], guid).toBe('items');
      // The hand-kept list adds RingofConstitution 6c7f785bab7bd1243a43e365dc2089bd, which only a scene-placed boss wears.
      expect(blueprints.get('6c7f785bab7bd1243a43e365dc2089bd')?.name).toBe('Colossus Ring');
      // It removes WeaponEmptyHand 20375b5a0c9243d45966bd72c690ab74, the empty hand, a natural weapon a companion
      // brings (natural weapons are never looted: Items/ItemEntityWeapon.cs IsLootable), and ArmagsBladeItem
      // ce0842546b73aa34b8fcf40a970ede68, whose weapon type the dump lacks.
      expect(blueprints.has('20375b5a0c9243d45966bd72c690ab74')).toBe(false);
      expect(blueprints.has('ce0842546b73aa34b8fcf40a970ede68')).toBe(false);
    });

    it('holds no equipment the dump traces to no source', () => {
      // The research's leftovers: the natural weapon SlamLarge2d6 5ed9cc5be301fae44b24824074edea0f, the test bow
      // OverPoweredTestBow 37f82ab8449ad3341af335a23a27ceba, HeadbandOfBigBrainsItem 0a64791fd9ad3d645aa80149b0144435,
      // which nothing references, and WarpaintedSkullItem 5d343648bb8887d42b24cbadfeb36991, which no source reaches.
      for (const guid of [
        '5ed9cc5be301fae44b24824074edea0f',
        '37f82ab8449ad3341af335a23a27ceba',
        '0a64791fd9ad3d645aa80149b0144435',
        '5d343648bb8887d42b24cbadfeb36991',
      ])
        expect(blueprints.has(guid), guid).toBe(false);
    });

    it('holds what proficiency reads: the weapon category and the armour group', () => {
      // AdamantineFullplateStandart 4a72801171b0cca44b1989b4622b5820 is FullplateType afd9065539b3ac5499eddca923654c4b,
      // heavy armour; Longbow 7a1211c05ec2c46428f41e3c0db9423f is a weapon type of the Longbow category.
      expect(blueprints.get('4a72801171b0cca44b1989b4622b5820')).toMatchObject({
        m_Type: '!bp_afd9065539b3ac5499eddca923654c4b',
      });
      expect(blueprints.get('afd9065539b3ac5499eddca923654c4b')).toMatchObject({ m_ProficiencyGroup: 'Heavy' });
      expect(blueprints.get('7a1211c05ec2c46428f41e3c0db9423f')).toMatchObject({ Category: 'Longbow' });
    });

    it('holds the restrictions a main character meets', () => {
      // No druid levels on the full plate (DruidClass 610d836f3a3a9ed42a4349b62f002e96); Robe of Virtue
      // 17c5e2686dbb5a843b5ba859f22aeea1 needs Monk levels (MonkClass e8f21e5b58e0569468e420ebea456124) and a good
      // alignment; Mask of Nothing 8344b46a6e404227b72d129073383a6c is for the main character only.
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
      // BeltOfStrength2 c354de364a714ee4dbe2cfee628df267: an Enhancement bonus of 2 to Strength.
      const belt = blueprints.get('c354de364a714ee4dbe2cfee628df267');
      expect(belt?.$type).toBe('BlueprintItemEquipmentBelt');
      const [enchantment] = (belt as { m_Enchantments: readonly string[] }).m_Enchantments;
      expect(blueprints.get(enchantment.slice(4))?.Components).toEqual([
        { $type: 'AddStatBonusEquipment', Descriptor: 'Enhancement', Stat: 'Strength', Value: 2 },
      ]);
    });

    it('writes no description as a name', () => {
      // CertaintyOfDeathSecondItem 1050ae1293421e24f84a0208fdf0d114's name key points at a description (its override).
      expect(blueprints.get('1050ae1293421e24f84a0208fdf0d114')?.name).toBeUndefined();
      expect(items.filter((b) => b.name !== undefined && /[{}]/.test(b.name))).toEqual([]);
    });
  });
});
