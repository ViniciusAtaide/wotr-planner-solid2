// G on the committed data. Each expectation is the game's own grant, cited by blueprint name and GUID.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadData } from './data/load';
import { readDataDir } from './data/read-dir';
import { buildGrantIndex, reachableFromGear, reachableFromRoot } from './grants';

const files = readDataDir(fileURLToPath(new URL('../data', import.meta.url)));
const data = loadData(files.files, files.overrides);
const G = buildGrantIndex(data);
const name = (guid: string) => data.blueprints.get(guid)?.assetName;

describe('G, the grant index', () => {
  it('finds the grantors of a fact, from a progression level entry', () => {
    // FighterProgression b50e94b57be32f74892f381ae2a8905a grants FighterFeatSelection 41c8486641f7d6d4283ca9dae4147a9f
    // at level 1.
    const grant = G.grantorsOf('41c8486641f7d6d4283ca9dae4147a9f').find(
      (g) => g.grantor === 'b50e94b57be32f74892f381ae2a8905a',
    );
    expect(grant).toMatchObject({ kind: 'levelEntry', level: 1 });
  });

  it('lists what an entry grants', () => {
    // BasicFeatsProgression 5b72dd2ca2cb73b49903806ee8986325: BasicFeatSelection at every odd level, its table running
    // on to 59 past Legend's 40, and BackgroundsBaseSelection and DeitySelection at level 1 (guide §7).
    const grants = G.grantsOf('5b72dd2ca2cb73b49903806ee8986325');
    const levelsOf = (guid: string) => grants.filter((g) => g.granted === guid).map((g) => g.level);
    expect(levelsOf('247a4068296e8be42890143f451b4b45')).toEqual(Array.from({ length: 30 }, (_, i) => 2 * i + 1));
    expect(grants.filter((g) => g.level === 1).map((g) => name(g.granted))).toEqual(
      expect.arrayContaining(['BackgroundsBaseSelection', 'DeitySelection']),
    );
  });

  it('gives the slots an entry opens', () => {
    expect(G.slotsOpenedBy('5b72dd2ca2cb73b49903806ee8986325').map(name)).toEqual(
      expect.arrayContaining(['BasicFeatSelection', 'BackgroundsBaseSelection', 'DeitySelection']),
    );
  });

  it('follows grants carried by a buff and its action tree (map ticket 23)', () => {
    // CompositeBlastBuff cb30a291c75def84090430fbf2b5c05e grants MagmaBlastFeature 408b25c6d9f223b41b935e6ec550e88d
    // through AddFactContextActions; the element features grant the buff through AddFacts.
    expect(G.grantorsOf('408b25c6d9f223b41b935e6ec550e88d')).toContainEqual(
      expect.objectContaining({ grantor: 'cb30a291c75def84090430fbf2b5c05e', kind: 'ContextActionAddFeature' }),
    );
    expect(G.grantorsOf('cb30a291c75def84090430fbf2b5c05e').map((g) => g.kind)).toContain('AddFacts');
  });

  it('groups the named grantors of a nameless fact by kind', () => {
    // ChannelPositiveAllowed 8c769102f3996684fb6e09a2c4e7e5b9 is granted by the deities that allow positive channelling
    // (AddFacts on each deity feature, FeatureGroup Deities) and by PriestOfBalanceArchetype
    // a4560e3fb5d247d68fb1a2738fcc0855 (its AddFeatures), so a Build can reach it in two kinds of way.
    const groups = G.namedGrantorsByKind('8c769102f3996684fb6e09a2c4e7e5b9');
    expect([...groups.keys()].sort()).toEqual(['BlueprintArchetype', 'Deities']);
    expect(groups.get('BlueprintArchetype')).toEqual(['a4560e3fb5d247d68fb1a2738fcc0855']);
    expect(groups.get('Deities')?.map(name)).toEqual(expect.arrayContaining(['SarenraeFeature', 'IomedaeFeature']));
  });

  it('reaches the classes and races ProgressionRoot offers', () => {
    const reachable = reachableFromRoot(data, G);
    // FighterClass 48ac8db94d5de7645906c7d0ad3bcfbd and HumanRace 0a5d473ead98b0646b94495af250fdc4.
    expect(reachable.has('48ac8db94d5de7645906c7d0ad3bcfbd')).toBe(true);
    expect(reachable.has('0a5d473ead98b0646b94495af250fdc4')).toBe(true);
  });

  it('holds from level 0 what the character-creation unit gives (map ticket 28)', () => {
    // BlueprintRoot.m_DefaultPlayerCharacter, StartGame_Player_Unit 4391e8b9afbb0cf43aeba700c089f56d, gives
    // ForbiddenDeityFeature c4403567ea9e5fe478ca38e3052fadc2 through AddFacts; BaphometFeature
    // bd72ca8ffcfec5745899ac56c93f12c5 and five other deities forbid it.
    expect(G.grantorsOf('c4403567ea9e5fe478ca38e3052fadc2')).toContainEqual(
      expect.objectContaining({ grantor: '4391e8b9afbb0cf43aeba700c089f56d', kind: 'AddFacts' }),
    );
    expect(G.grantorsOf('4391e8b9afbb0cf43aeba700c089f56d').map((g) => g.kind)).toEqual(['root']);
    expect(reachableFromRoot(data, G).has('c4403567ea9e5fe478ca38e3052fadc2')).toBe(true);
  });

  it('sees a daily pick made through an ability (map tickets 24 and 26)', () => {
    // MixedBloodlineAbility 352b4e8bb5ca4301b6e6084304a86546 applies one of the bloodline features, among them
    // BloodragerAbyssalWanderingFeature 6ed94b85f02f4c8a8f57ca49b400e358; MixedBloodlineFeature
    // 2c2283f5735d4e278f4088d9ff90edbb gives the ability through AddFacts.
    expect(G.grantorsOf('6ed94b85f02f4c8a8f57ca49b400e358')).toContainEqual(
      expect.objectContaining({ grantor: '352b4e8bb5ca4301b6e6084304a86546', kind: 'AbilityApplyFact' }),
    );
    expect(G.grantorsOf('352b4e8bb5ca4301b6e6084304a86546').map((g) => g.grantor)).toContain(
      '2c2283f5735d4e278f4088d9ff90edbb',
    );
  });

  it('sees a grant held while the Gear fits', () => {
    // CunningElusionUnlockFeature 91c8b2e3abdb4e2e807fddb668b619f8: MonkNoArmorFeatureUnlock holds
    // a71103ce28964f39b38442baa32a3031 while the character wears no armour and no shield.
    expect(G.grantsOf('91c8b2e3abdb4e2e807fddb668b619f8')).toContainEqual(
      expect.objectContaining({ granted: 'a71103ce28964f39b38442baa32a3031', kind: 'GearUnlock' }),
    );
  });

  it('follows a Shifter aspect a Build keeps on to what it adds', () => {
    // ShifterAspectBear 73ef2c330ff14e4bb2f5b7300622c552 gives the toggle ShifterAspectBearAbility
    // e66b1350f66949d997e31a57ce638fee, which applies ShifterAspectBearBuff a237792fc2644a4ebc6eefa2d325f181. While it is
    // on, HeartOfEarthShifterFeature 0b09ce94b5fe48dfa81b9a6f9d55a351's BuffExtraEffects adds HeartOfEarthShifterBuff
    // c3ad4aca75764e82ab047533a8d5aea6, which grants HeartOfEarthShifterFeature25 1dd78b502a7f4ea0802b02385a8a585f.
    expect(G.grantorsOf('a237792fc2644a4ebc6eefa2d325f181')).toContainEqual(
      expect.objectContaining({ grantor: 'e66b1350f66949d997e31a57ce638fee', kind: 'ActivatableBuff' }),
    );
    expect(G.grantorsOf('c3ad4aca75764e82ab047533a8d5aea6')).toContainEqual(
      expect.objectContaining({ grantor: '0b09ce94b5fe48dfa81b9a6f9d55a351', kind: 'BuffExtraEffects' }),
    );
    expect(reachableFromRoot(data, G).has('1dd78b502a7f4ea0802b02385a8a585f')).toBe(true);
  });

  it('sees a grant held while the alignment has an axis', () => {
    // The game's one such grant of a held feature, RuinFeature 128a392be53575946bd907727eda3720 (Spell Penetration
    // while chaotic), is on RuinItem d9f0df00399b0f246ac75a6339342719, which no source gives, so the keep rule trims it;
    // its shape stands here. So no blueprint the data holds carries the component: the 49 others grant only buffs,
    // toggles or abilities, and the importer drops them (ticket 02a).
    expect(data.blueprints.has('128a392be53575946bd907727eda3720')).toBe(false);
    expect(
      [...data.blueprints.values()].filter((b) => b.Components.some((c) => c.$type === 'AddFeatureOnAlignment')),
    ).toEqual([]);
    const feature = (guid: string, Components: readonly object[] = []) =>
      ({ $type: 'BlueprintFeature', guid, assetName: guid, Groups: [], Ranks: 1, Components }) as never;
    const ruin = feature('128a392be53575946bd907727eda3720', [
      { $type: 'AddFeatureOnAlignment', Alignment: 'Chaotic', m_Facts: ['!bp_e584810b170cdc646999779fa4623eb2'] },
    ]);
    const blueprints = new Map([
      ['128a392be53575946bd907727eda3720', ruin],
      ['e584810b170cdc646999779fa4623eb2', feature('e584810b170cdc646999779fa4623eb2')],
    ]);
    expect(buildGrantIndex({ blueprints }).grantsOf('128a392be53575946bd907727eda3720')).toEqual([
      {
        grantor: '128a392be53575946bd907727eda3720',
        granted: 'e584810b170cdc646999779fa4623eb2',
        kind: 'AddFeatureOnAlignment',
      },
    ]);
  });

  it('sees a grant held once a stat reaches a minimum', () => {
    // KitsuneHeritageClassic cd6cd774fb7cc844b8417193ee3a5ebe: AddFeatureOnSkill holds KitsuneSpellLike
    // a212fff222f57a841aa88bc49a5962d9 once the character's Charisma is 11 or more.
    expect(G.grantorsOf('a212fff222f57a841aa88bc49a5962d9')).toContainEqual(
      expect.objectContaining({ grantor: 'cd6cd774fb7cc844b8417193ee3a5ebe', kind: 'AddFeatureOnSkill' }),
    );
    expect(reachableFromRoot(data, G).has('a212fff222f57a841aa88bc49a5962d9')).toBe(true);
  });

  it('carries the parameter of a parametrized feat granted at one parameter', () => {
    // ZenArcherWayOfTheBowLongbowFocus 2e659493076249f49821925b9b7dc389 grants WeaponFocus
    // 1e1f627d26ad36f43bbd26cc2bf8ac7e for longbows; DisenchanterSpellFocusAbjuration 60ed5ba87ac9e3241adc8212d3f6a24c
    // grants SpellFocus 16fa59cc9a72a6043b566b49184f53fe for abjuration.
    expect(G.grantorsOf('1e1f627d26ad36f43bbd26cc2bf8ac7e')).toContainEqual({
      grantor: '2e659493076249f49821925b9b7dc389',
      granted: '1e1f627d26ad36f43bbd26cc2bf8ac7e',
      kind: 'AddParametrizedFeatures',
      param: { WeaponCategory: 'Longbow' },
    });
    expect(G.grantsOf('60ed5ba87ac9e3241adc8212d3f6a24c')).toContainEqual(
      expect.objectContaining({ kind: 'AddParametrizedFeatures', param: { SpellSchool: 'Abjuration' } }),
    );
  });

  it('sees the option a parametrized feat grants when taken with it', () => {
    // TricksterLoreReligionTier2Parametrized 3e006bc9bbf0b884a8d8853350bee846 is taken for one of its domain
    // variants, and AddFeatureParametrized grants that variant: TricksterLoreReligionAirDomainFeature
    // 2dc50974356942c7b9f2ccfdcdeb7d61 when it is the parameter.
    expect(G.grantorsOf('2dc50974356942c7b9f2ccfdcdeb7d61')).toContainEqual({
      grantor: '3e006bc9bbf0b884a8d8853350bee846',
      granted: '2dc50974356942c7b9f2ccfdcdeb7d61',
      kind: 'AddFeatureParametrized',
      param: { Blueprint: '2dc50974356942c7b9f2ccfdcdeb7d61' },
    });
    expect(reachableFromRoot(data, G).has('2dc50974356942c7b9f2ccfdcdeb7d61')).toBe(true);
  });

  it('sees the facts FactSinglify holds and the ones it takes away', () => {
    // AlchemistBombsFeature c59b2f256f5a70a4d896568658315b7d holds AlchemistBombsFact 28384b1d7e25c8743b8bbfc56211ac8c;
    // BloodlineSerpentineScaledSoulFeature 18436c3dfd2000142ae087bf03740fdf takes away
    // BloodlineSerpentineSerpentsFangBiteFeatureAddLevel1 a26c62f50bec9fa4ab8ea7cd98fed19a.
    expect(G.grantorsOf('28384b1d7e25c8743b8bbfc56211ac8c')).toContainEqual(
      expect.objectContaining({ grantor: 'c59b2f256f5a70a4d896568658315b7d', kind: 'FactSinglify' }),
    );
    expect(G.grantsOf('18436c3dfd2000142ae087bf03740fdf')).toContainEqual(
      expect.objectContaining({ granted: 'a26c62f50bec9fa4ab8ea7cd98fed19a', kind: 'FactSinglifyRemove' }),
    );
    expect(G.grantorsOf('a26c62f50bec9fa4ab8ea7cd98fed19a').map((g) => g.kind)).not.toContain('FactSinglifyRemove');
  });

  it("sees the feat a Sword Saint's chosen weapon holds at the same weapon", () => {
    // SwordSaintChosenWeaponFeature c0b4ec0175e3ff940a45fc21f318a39a: KensaiChosenWeapon holds WeaponFocus
    // 1e1f627d26ad36f43bbd26cc2bf8ac7e at the weapon category the feat is taken for.
    expect(G.grantsOf('c0b4ec0175e3ff940a45fc21f318a39a')).toContainEqual({
      grantor: 'c0b4ec0175e3ff940a45fc21f318a39a',
      granted: '1e1f627d26ad36f43bbd26cc2bf8ac7e',
      kind: 'KensaiChosenWeapon',
    });
  });

  it('follows a worn item through its enchantment to the feature it gives', () => {
    // VanwardItem 4e59464e2d72ea44bb2a35e20f21ca8e carries VanwardEnchantment 731c54f319b799f4ea3d4a08ab514076, whose
    // AddUnitFeatureEquipment gives VanwardFeature 883237e9dac35ba4fba0cffc2af73fb9 while the item is worn.
    expect(G.grantsOf('4e59464e2d72ea44bb2a35e20f21ca8e')).toContainEqual(
      expect.objectContaining({ granted: '731c54f319b799f4ea3d4a08ab514076', kind: 'itemEnchantment' }),
    );
    expect(G.grantorsOf('883237e9dac35ba4fba0cffc2af73fb9')).toContainEqual(
      expect.objectContaining({ grantor: '731c54f319b799f4ea3d4a08ab514076', kind: 'AddUnitFeatureEquipment' }),
    );
    expect(reachableFromGear(data, G).has('883237e9dac35ba4fba0cffc2af73fb9')).toBe(true);
    expect(reachableFromRoot(data, G).has('883237e9dac35ba4fba0cffc2af73fb9')).toBe(false);
  });

  it("reaches a shield's armour half and bash weapon, worn with it", () => {
    // AncientWoodShieldItem a39fc345c33c4bf1aaec7988776039ba: armour half 10aca1295d7746f7b5c4b9cb6de1c286 (its type
    // decides the shield proficiency, ItemEntityShield.CanBeEquippedInternal), bash weapon 62c90581f9892e9468f0d8229c7321c4.
    const parts = G.grantsOf('a39fc345c33c4bf1aaec7988776039ba').filter((g) => g.kind === 'shieldPart');
    expect(parts.map((g) => g.granted)).toEqual([
      '10aca1295d7746f7b5c4b9cb6de1c286',
      '62c90581f9892e9468f0d8229c7321c4',
    ]);
    expect(data.blueprints.get('10aca1295d7746f7b5c4b9cb6de1c286')?.$type).toBe('BlueprintItemArmor');
  });
});
