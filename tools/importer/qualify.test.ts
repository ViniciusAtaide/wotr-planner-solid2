import { describe, expect, it } from 'vitest';
import type { Blueprint, Guid, Override } from '~engine/data';
import { qualifyNames } from './qualify';

const r = (guid: Guid) => `!bp_${guid}`;
const blueprint = (guid: Guid, $type: string, assetName: string, name?: string, fields: object = {}, Components = []) =>
  [guid, { $type, guid, assetName, ...(name === undefined ? {} : { name }), Components, ...fields }] as const;
const cls = (guid: Guid, assetName: string, name: string, progression: Guid) =>
  blueprint(guid, 'BlueprintCharacterClass', assetName, name, { m_Progression: r(progression), m_Archetypes: [] });
const progression = (guid: Guid, assetName: string, name: string | undefined, entries: [number, ...Guid[]][]) =>
  blueprint(guid, 'BlueprintProgression', assetName, name, {
    LevelEntries: entries.map(([Level, ...features]) => ({ Level, m_Features: features.map(r) })),
  });
const archetype = (guid: Guid, assetName: string, name: string, adds: [number, ...Guid[]][]) =>
  blueprint(guid, 'BlueprintArchetype', assetName, name, {
    AddFeatures: adds.map(([Level, ...features]) => ({ Level, m_Features: features.map(r) })),
    RemoveFeatures: [],
  });
const selection = (guid: Guid, assetName: string, name: string, options: Guid[]) =>
  blueprint(guid, 'BlueprintFeatureSelection', assetName, name, { m_AllFeatures: options.map(r) });
const requires = (fact: Guid) => ({
  $type: 'PrerequisiteFeature',
  m_Feature: r(fact),
  Group: 'All',
  CheckInProgression: false,
  IsFeatureSelectionWhiteList: false,
});

const ARCANIST = '52dbfd8505e22f84fad8d702611f60b7';
const LOREMASTER_ARCANIST = '39d9362873634e24c8f7a1932e425340';
const WIZARD_SECRET_ARCANIST = '17a4c17d48c295543b3c449f91de8076';
const DRUID_SECRET_ARCANIST = '084b3340727f0574a82239ecf74f8910';
const INQUISITOR = 'f1a70d9e1b0b41e49874e1fa9052a1ce';
const WIZARD_SECRET_HUNTER = '0e2d4ced86db4807b3173086717e7e60';
const WIZARD_SECRET_INQUISITOR = 'dd394bbb971530f4f8e99a5715da917d';
const DRACONIC_RESIST_ENERGY = '1d3fcbb51257dd6448a48db489cdd3ad';
const CELESTIAL_RESIST_ENERGY = '62ff99899efcf9c4eb2656fbe9d9522c';
const WINTER_2 = 'fb5ae7deb7cbfd94a85c986df8f47c20';
const WINTER_4 = 'f4b39358356bf4b4d9cef1182dc792a8';
const ELEMENTS_2 = '394a16c90dcbd9242850248195490a7f';
const ELEMENTS_4 = '393c66ba0fdd5d048ace42eef4f1f213';
const SORCERER_FEATS = '3a60f0c0442acfb419b0c03b584e1394';
const ABYSSAL_FEATS = '7781831170d794a4d8f147a1326c35fd';
const ARCANE_FEATS = 'ff4fd877b4c801342ab8e880b734a6b9';
const AIR_BONUS = '4ff45d291d0ee9c4b8c83a298b0b4969';
const AIR_BONUS_1 = '95ab2bdf0d45b2742a357f5780aac4a3';
const RANGER = 'cda0615668a6df14eb36ba19ee881af6';
const FAVORED_ENEMY = '16cc2c937ea8d714193017780e7d4fc6';
const FAVORED_ENEMY_RANK_UP = 'c1be13839472aad46b152cf10cf46179';
const ARCHERY_2 = '3cf94df3f1cf9a443a880bc1ae9be3c6';
const ARCHERY_6 = '6c799d09d5b93f344b9ade0e0c765c2d';

const blueprints = new Map<Guid, Blueprint>(
  [
    blueprint('2d77316c72b9ed44f888ceefc2a131f6', 'BlueprintRoot', 'BlueprintRoot', undefined, {
      Progression: {
        m_FeatsProgression: null,
        m_BasicFeatSelection: null,
        m_DeitySelection: null,
        m_CharacterClasses: [
          ARCANIST,
          '4a7c05adfbaf05446a6bf664d28fb103',
          INQUISITOR,
          '1b9873f1e7bfe5449bc84d03e9c8e3cc',
          'b3a505fb61437dc4097f43c3f8f9a4cf',
          '42a455d9ec1ad924d889272429eb8391',
          RANGER,
          'c75e0971973957d4dbad24bc7957e4fb',
        ].map(r),
        m_CharacterMythics: [],
        m_MythicStartingClass: null,
        m_MythicLegenFake: null,
        m_MythicLegen: null,
        m_CharacterRaces: [],
      },
      m_DefaultPlayerCharacter: null,
    }),
    cls(ARCANIST, 'ArcanistClass', 'Arcanist', '974911193b8a8b947a8275f96bb265d6'),
    progression('974911193b8a8b947a8275f96bb265d6', 'ArcanistProgression', undefined, []),
    blueprint(INQUISITOR, 'BlueprintCharacterClass', 'InquisitorClass', 'Inquisitor', {
      m_Progression: r('4e945c2fe5e252f4ea61eee7fb560017'),
      m_Archetypes: [r('46eb929c8b6d7164188eb4d9bcd0a012')],
    }),
    progression('4e945c2fe5e252f4ea61eee7fb560017', 'InquisitorProgression', undefined, []),
    cls('4a7c05adfbaf05446a6bf664d28fb103', 'LoremasterClass', 'Loremaster', '2bcd2330cc2c5a747968a8c782d4fa0a'),
    progression('2bcd2330cc2c5a747968a8c782d4fa0a', 'LoremasterProgression', undefined, [
      [1, 'beeb25d7a7732e14f9986cdb79acecfc', '7a28ab4dfc010834eabc770152997e87'],
    ]),
    selection('beeb25d7a7732e14f9986cdb79acecfc', 'LoremasterSecretSelection', 'Secret', [
      'f97986f19a595e2409cfe5d92bcf697c',
      '6b73ba9d8a718fb419a484c6e1b92c6d',
    ]),
    selection('f97986f19a595e2409cfe5d92bcf697c', 'LoremasterWizardSpellSecret', 'Wizard Spell', [
      WIZARD_SECRET_ARCANIST,
      WIZARD_SECRET_HUNTER,
      WIZARD_SECRET_INQUISITOR,
    ]),
    selection('6b73ba9d8a718fb419a484c6e1b92c6d', 'LoremasterDruidSpellSecret', 'Druid Spell', [DRUID_SECRET_ARCANIST]),
    blueprint(WIZARD_SECRET_ARCANIST, 'BlueprintParametrizedFeature', 'LoremasterWizardSecretArcanist', 'Arcanist'),
    blueprint(DRUID_SECRET_ARCANIST, 'BlueprintParametrizedFeature', 'LoremasterDruidSecretArcanist', 'Arcanist'),
    blueprint(WIZARD_SECRET_HUNTER, 'BlueprintParametrizedFeature', 'LoremasterWizardSecretHunter', 'Inquisitor'),
    blueprint(
      WIZARD_SECRET_INQUISITOR,
      'BlueprintParametrizedFeature',
      'LoremasterWizardSecretInquisitor',
      'Inquisitor',
    ),
    selection('7a28ab4dfc010834eabc770152997e87', 'LoremasterSpellbookSelection', 'Spellbook Selection', [
      LOREMASTER_ARCANIST,
    ]),
    blueprint(LOREMASTER_ARCANIST, 'BlueprintFeatureReplaceSpellbook', 'LoremasterArcanist', 'Arcanist', {
      HideInUI: true,
    }),
    cls('1b9873f1e7bfe5449bc84d03e9c8e3cc', 'WitchClass', 'Witch', 'c5e9e2b086a9814409fb6a29a5acdd0f'),
    progression('c5e9e2b086a9814409fb6a29a5acdd0f', 'WitchProgression', undefined, [
      [1, '381cf4c890815d049a4420c6f31d063f'],
    ]),
    selection('381cf4c890815d049a4420c6f31d063f', 'WitchPatronSelection', 'Patron', [
      'e98d8d9f907c1814aa7376d6cdaac012',
      '67e85f52b1f020847aaa738d8999d4cd',
    ]),
    progression('e98d8d9f907c1814aa7376d6cdaac012', 'WitchWinterPatronProgression', 'Winter', [
      [2, WINTER_2],
      [4, WINTER_4],
    ]),
    progression('67e85f52b1f020847aaa738d8999d4cd', 'WitchElementsPatronProgression', 'Elements', [
      [2, ELEMENTS_2],
      [4, ELEMENTS_4],
    ]),
    blueprint(WINTER_2, 'BlueprintFeature', 'WitchPatronSpellLevel1', 'Patron Spells'),
    blueprint(WINTER_4, 'BlueprintFeature', 'WitchPatronSpellLevel2', 'Patron Spells'),
    blueprint(ELEMENTS_2, 'BlueprintFeature', 'WitchPatronSpellLevel1', 'Patron Spells'),
    blueprint(ELEMENTS_4, 'BlueprintFeature', 'WitchPatronSpellLevel2', 'Patron Spells'),
    cls('b3a505fb61437dc4097f43c3f8f9a4cf', 'SorcererClass', 'Sorcerer', '997665565ca80a649aedd72455c4df1f'),
    progression('997665565ca80a649aedd72455c4df1f', 'SorcererProgression', undefined, [
      [1, '24bef8d1bee12274686f6da6ccbc8914'],
      [7, SORCERER_FEATS],
    ]),
    selection('24bef8d1bee12274686f6da6ccbc8914', 'SorcererBloodlineSelection', 'Bloodline', [
      'd3a4cb7be97a6694290f0dcfbd147113',
      '4d491cf9631f7e9429444f4aed629791',
      '7bd143ead2d6c3a409aad6ee22effe34',
      '7e0f57d8d00464441974e303b84238ac',
      'aa79c65fa0e11464d9d100b038c50796',
      '8a95d80a3162d274896d50c2f18bb6b1',
    ]),
    progression('7bd143ead2d6c3a409aad6ee22effe34', 'BloodlineDraconicBlackProgression', 'Draconic Bloodline — Black', [
      [5, DRACONIC_RESIST_ENERGY],
    ]),
    progression(
      '7e0f57d8d00464441974e303b84238ac',
      'BloodlineDraconicBronzeProgression',
      'Draconic Bloodline — Bronze',
      [[5, DRACONIC_RESIST_ENERGY]],
    ),
    progression('aa79c65fa0e11464d9d100b038c50796', 'BloodlineCelestialProgression', 'Celestial Bloodline', [
      [5, CELESTIAL_RESIST_ENERGY],
    ]),
    progression('8a95d80a3162d274896d50c2f18bb6b1', 'EmpyrealBloodlineProgression', 'Empyreal Bloodline', [
      [5, CELESTIAL_RESIST_ENERGY],
    ]),
    blueprint(RANGER, 'BlueprintCharacterClass', 'RangerClass', 'Ranger', {
      m_Progression: r('97261d609529d834eba4fd4da1bc44dc'),
      m_Archetypes: [r('475117e837fa461589005a5339f653a0'), r('9f147dbae4a34cda9f0e6091dc1a4a7c')],
    }),
    progression('97261d609529d834eba4fd4da1bc44dc', 'RangerProgression', undefined, [
      [1, FAVORED_ENEMY],
      [2, 'c6d0da9124735a44f93ac31df803b9a9'],
      [5, FAVORED_ENEMY, FAVORED_ENEMY_RANK_UP],
      [6, '61f82ba786fe05643beb3cd3910233a8'],
    ]),
    archetype('475117e837fa461589005a5339f653a0', 'SableMarineArchetype', 'Sable Company Marine', [[3, FAVORED_ENEMY]]),
    archetype('46eb929c8b6d7164188eb4d9bcd0a012', 'SacredHuntsmasterArchetype', 'Sacred Huntsmaster', [
      [5, FAVORED_ENEMY],
      [10, FAVORED_ENEMY_RANK_UP],
    ]),
    selection(FAVORED_ENEMY, 'FavoriteEnemySelection', 'Favored Enemy', []),
    selection(FAVORED_ENEMY_RANK_UP, 'FavoriteEnemyRankUp', 'Favored Enemy', []),
    selection('c6d0da9124735a44f93ac31df803b9a9', 'RangerStyleSelection2', 'Combat Style Feat', [ARCHERY_2]),
    selection('61f82ba786fe05643beb3cd3910233a8', 'RangerStyleSelection6', 'Combat Style Feat', [ARCHERY_6]),
    archetype('9f147dbae4a34cda9f0e6091dc1a4a7c', 'NomadArchetype', 'Nomad', [
      [2, ARCHERY_2],
      [6, ARCHERY_6],
    ]),
    selection(ARCHERY_2, 'RangerStyleArcherySelection2', 'Archery', []),
    selection(ARCHERY_6, 'RangerStyleArcherySelection6', 'Archery', []),
    cls('c75e0971973957d4dbad24bc7957e4fb', 'SlayerClass', 'Slayer', '1f35d11937a06624b8a60db68c7869a1'),
    progression('1f35d11937a06624b8a60db68c7869a1', 'SlayerProgression', undefined, [
      [2, '04430ad24988baa4daa0bcd4f1c7d118'],
    ]),
    selection('04430ad24988baa4daa0bcd4f1c7d118', 'SlayerTalentSelection2', 'Slayer Talents', [
      'c6d0da9124735a44f93ac31df803b9a9',
      '61f82ba786fe05643beb3cd3910233a8',
    ]),
    blueprint(DRACONIC_RESIST_ENERGY, 'BlueprintFeature', 'BloodlineDraconicSpellLevel2', 'Resist Energy'),
    blueprint(CELESTIAL_RESIST_ENERGY, 'BlueprintFeature', 'BloodlineCelestialSpellLevel2', 'Resist Energy'),
    progression('d3a4cb7be97a6694290f0dcfbd147113', 'BloodlineAbyssalProgression', 'Abyssal Bloodline', [
      [1, 'b09b58c7f8efff244a33269489abeac6'],
    ]),
    progression('4d491cf9631f7e9429444f4aed629791', 'BloodlineArcaneProgression', 'Arcane Bloodline', [
      [1, '60d8632e96739a74dbac23dd078d205d'],
    ]),
    blueprint('b09b58c7f8efff244a33269489abeac6', 'BlueprintFeature', 'AbyssalBloodlineRequisiteFeature'),
    blueprint('60d8632e96739a74dbac23dd078d205d', 'BlueprintFeature', 'ArcaneBloodlineRequisiteFeature'),
    selection(SORCERER_FEATS, 'SorcererFeatSelection', 'Bloodline Feat Selection', [ABYSSAL_FEATS, ARCANE_FEATS]),
    blueprint(ABYSSAL_FEATS, 'BlueprintFeatureSelection', 'BloodlineAbyssalFeatSelection', 'Bloodline Feat Selection', {
      m_AllFeatures: [],
    }),
    blueprint(ARCANE_FEATS, 'BlueprintFeatureSelection', 'BloodlineArcaneFeatSelection', 'Bloodline Feat Selection', {
      m_AllFeatures: [],
    }),
    cls('42a455d9ec1ad924d889272429eb8391', 'KineticistClass', 'Kineticist', 'b79e92dd495edd64e90fb483c504b8df'),
    progression('b79e92dd495edd64e90fb483c504b8df', 'KineticistProgression', undefined, [
      [2, '5c883ae0cd6d7d5448b7a420f51f8459'],
    ]),
    selection('5c883ae0cd6d7d5448b7a420f51f8459', 'WildTalentSelection', 'Wild Talents', [AIR_BONUS, AIR_BONUS_1]),
    selection(AIR_BONUS, 'WildTalentBonusFeatAir', 'Kineticist Bonus Feat — Air', []),
    selection(AIR_BONUS_1, 'WildTalentBonusFeatAir1', 'Kineticist Bonus Feat — Air', []),
  ].map(([guid, value]) => [guid, value as unknown as Blueprint]),
);
for (const [selectionGuid, requisite] of [
  [ABYSSAL_FEATS, 'b09b58c7f8efff244a33269489abeac6'],
  [ARCANE_FEATS, '60d8632e96739a74dbac23dd078d205d'],
] as const) {
  const bp = blueprints.get(selectionGuid)!;
  blueprints.set(selectionGuid, { ...bp, Components: [requires(requisite)] } as unknown as Blueprint);
}
for (const [guid, name] of [
  ['b09b58c7f8efff244a33269489abeac6', 'Abyssal Bloodline'],
  ['60d8632e96739a74dbac23dd078d205d', 'Arcane Bloodline'],
] as const) {
  blueprints.set(guid, { ...blueprints.get(guid)!, name });
}

const nameOverride = (target: Guid, qualifier: string): Override => ({
  change: 'name',
  target,
  qualifier,
  reason: 'a second copy of the same pick, offered beside the first',
});

function settled(overrides: readonly Override[] = []) {
  const q = qualifyNames({ blueprints }, overrides);
  const member = (guid: Guid) => q.groups.flatMap((g) => g.members).find((m) => m.guid === guid);
  return { q, of: (guid: Guid) => ({ source: member(guid)?.source, name: q.names.get(guid) }) };
}

describe('shared names (map ticket 27)', () => {
  it("qualifies the Witch's patron spells by patron and level (source 2)", () => {
    const { of } = settled();
    expect(of(WINTER_2)).toEqual({ source: 'level', name: 'Patron Spells (Winter 2)' });
    expect(of(WINTER_4)).toEqual({ source: 'level', name: 'Patron Spells (Winter 4)' });
    expect(of(ELEMENTS_2)).toEqual({ source: 'level', name: 'Patron Spells (Elements 2)' });
    expect(of(ELEMENTS_4)).toEqual({ source: 'level', name: 'Patron Spells (Elements 4)' });
  });

  it("qualifies Loremaster's Arcanist secrets by their grantor (source 1)", () => {
    const { of } = settled();
    expect(of(WIZARD_SECRET_ARCANIST)).toEqual({ source: 'grantor', name: 'Arcanist (Wizard Spell)' });
    expect(of(DRUID_SECRET_ARCANIST)).toEqual({ source: 'grantor', name: 'Arcanist (Druid Spell)' });
  });

  it('leaves out a blueprint the game hides, as it is never shown', () => {
    expect(settled().q.groups.flatMap((g) => g.members.map((m) => m.guid))).not.toContain(LOREMASTER_ARCANIST);
  });

  it("names the draconic bloodlines' shared feature by their family, never by one colour (source 6)", () => {
    const { q, of } = settled();
    expect(of(DRACONIC_RESIST_ENERGY)).toEqual({ source: 'family', name: 'Resist Energy (Draconic Bloodline)' });
    expect(of(CELESTIAL_RESIST_ENERGY)).toEqual({ source: 'bare', name: undefined });
    expect([...q.names.values()].some((n) => n.includes('Black') || n.includes('Bronze'))).toBe(false);
  });

  it("keeps the ranger's Favored Enemy bare as the class's own copy (source 5), and overrides the rank-up", () => {
    const open = settled();
    expect(open.of(FAVORED_ENEMY)).toEqual({ source: 'class', name: undefined });
    expect(open.of(FAVORED_ENEMY_RANK_UP).source).toBeUndefined();
    const { q, of } = settled([nameOverride(FAVORED_ENEMY_RANK_UP, 'rank up')]);
    expect(of(FAVORED_ENEMY_RANK_UP)).toEqual({ source: 'override', name: 'Favored Enemy (rank up)' });
    expect(q.collisions.has('Favored Enemy')).toBe(false);
  });

  it('never names a combat style by one archetype among its grantors; an override settles it', () => {
    const open = settled();
    expect(open.of(ARCHERY_2).source).toBeUndefined();
    expect(open.of(ARCHERY_6).source).toBeUndefined();
    const { q, of } = settled([nameOverride(ARCHERY_2, 'level 2'), nameOverride(ARCHERY_6, 'level 6')]);
    expect(of(ARCHERY_2)).toEqual({ source: 'override', name: 'Archery (level 2)' });
    expect(of(ARCHERY_6)).toEqual({ source: 'override', name: 'Archery (level 6)' });
    expect([...q.names.values()].some((n) => n.includes('Nomad'))).toBe(false);
  });

  it('keeps a class bare beside the picks named after it (source 3)', () => {
    const { q, of } = settled();
    expect(of(ARCANIST)).toEqual({ source: 'bare', name: undefined });
    expect(of(INQUISITOR)).toEqual({ source: 'kind', name: undefined });
    expect(q.collisions.get('Inquisitor')).toEqual([INQUISITOR, WIZARD_SECRET_HUNTER, WIZARD_SECRET_INQUISITOR]);
  });

  it("qualifies a bloodline's feat selection by the bloodline it requires (source 4)", () => {
    const { of } = settled();
    expect(of(ABYSSAL_FEATS)).toEqual({
      source: 'prerequisite',
      name: 'Bloodline Feat Selection (Abyssal Bloodline)',
    });
    expect(of(ARCANE_FEATS)).toEqual({ source: 'prerequisite', name: 'Bloodline Feat Selection (Arcane Bloodline)' });
    expect(of(SORCERER_FEATS)).toEqual({ source: 'grantor', name: 'Bloodline Feat Selection (Sorcerer)' });
  });

  it('leaves two identical picks shared, and settles them with an override (source 5), one staying bare', () => {
    const open = settled();
    expect(open.of(AIR_BONUS).source).toBeUndefined();
    expect(open.q.collisions.get('Kineticist Bonus Feat — Air')).toEqual([AIR_BONUS, AIR_BONUS_1]);

    const { q, of } = settled([nameOverride(AIR_BONUS_1, 'second')]);
    expect(of(AIR_BONUS_1)).toEqual({ source: 'override', name: 'Kineticist Bonus Feat — Air (second)' });
    expect(of(AIR_BONUS)).toEqual({ source: 'bare', name: undefined });
    expect(q.collisions.has('Kineticist Bonus Feat — Air')).toBe(false);
    expect(q.problems).toEqual([]);
  });

  it('refuses a name override where steps 1–4 settle the name, or where no other blueprint shares it', () => {
    const { q } = settled([nameOverride(WINTER_2, 'first'), nameOverride('7a28ab4dfc010834eabc770152997e87', 'x')]);
    expect(q.problems).toEqual([
      `WitchPatronSpellLevel1 ${WINTER_2}: a name override, but level settles it; remove it`,
      'LoremasterSpellbookSelection 7a28ab4dfc010834eabc770152997e87: a name override, but no other blueprint a ' +
        'Build can reach shares its name; remove it',
    ]);
  });

  it('refuses a name override whose qualifier another label in the group already has', () => {
    const { q } = settled([nameOverride(AIR_BONUS, 'second'), nameOverride(AIR_BONUS_1, 'second')]);
    expect(q.problems).toEqual([
      `WildTalentBonusFeatAir1 ${AIR_BONUS_1}: its name override's qualifier "second" is taken in its group`,
    ]);
  });
});
