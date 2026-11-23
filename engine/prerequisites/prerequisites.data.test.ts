import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { BlueprintBase, Component } from '../data';
import { loadData } from '../load';
import { readDataDir } from '../data-dir';
import { namedFacts, paramPrerequisites, prerequisites, prerequisiteTypes, type Polarity } from './prerequisites';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const { blueprints } = loadData(files.files, files.overrides);

function leaves(guid: string) {
  const bp = blueprints.get(guid);
  if (bp === undefined) throw new Error(`data/ doesn't hold ${guid}`);
  return prerequisites(bp, blueprints);
}

describe('P on the game data', { timeout: 30_000 }, () => {
  it('reads PrerequisiteClassLevel with Not as forbidding that many levels', () => {
    const leaf = leaves('247aa787806d5da4f89cfc3dff0b217f').find((l) => l.names.kind === 'classLevel');
    expect(leaf).toMatchObject({
      Group: 'All',
      polarity: 'forbids',
      names: { kind: 'classLevel', m_CharacterClass: '247aa787806d5da4f89cfc3dff0b217f', Level: 7 },
    });
  });

  it('reads PrerequisiteFeaturesFromList with its Amount', () => {
    const leaf = leaves('fc85925cd241dd0408ab2f4cb171b7e3').find((l) => l.names.kind === 'facts');
    expect(leaf?.polarity).toBe('requires');
    expect(leaf?.names).toMatchObject({ kind: 'facts', Amount: 2, IsDeity: false });
  });

  it('reads IsDeity as PrerequisiteFeaturesFromList does: a list of deities only', () => {
    const leaf = leaves('bfa11238e7ae3544bbeb4d0b92e897ec').find((l) => l.names.kind === 'facts');
    expect(leaf?.names).toMatchObject({ kind: 'facts', Amount: 0, IsDeity: true });
    expect(leaf?.names.kind === 'facts' && leaf.names.m_Features).toHaveLength(8);
  });

  it('reads m_RestrictIfNot as forbidding the list', () => {
    const leaf = leaves('464ffaf88140474a949618bec7955e78').find((l) => l.names.kind === 'facts');
    expect(leaf?.polarity).toBe('forbids');
  });

  it('reads PrerequisiteCondition as one leaf naming its tree, whose facts are all held', () => {
    const leaf = leaves('8dff97413c63c1147be8a5ca229abefc').find((l) => l.names.kind === 'condition');
    expect(leaf?.names).toMatchObject({ kind: 'condition', Condition: { $type: 'OrAndLogic' } });
    const facts = namedFacts(leaf!);
    expect(facts.length).toBeGreaterThan(0);
    expect(facts.filter((g) => !blueprints.has(g))).toEqual([]);
  });

  it('keeps a parameter check out of the prerequisite list', () => {
    const bp = blueprints.get('bcebc021271be1e45b012729f22dadcc')!;
    const types: string[] = prerequisites(bp, blueprints).map((l) => l.component.$type);
    expect(types).not.toContain('PrerequisiteConditionForWeaponCategory');
    expect(paramPrerequisites(bp).map((c) => c.m_WeaponCategories)).toEqual([['Bite']]);
  });
});

const NEGATED_BY: Readonly<Record<string, string>> = {
  PrerequisiteClassLevel: 'Not',
  PrerequisiteFeaturesFromList: 'm_RestrictIfNot',
  PrerequisitePet: 'NoCompanion',
  PrerequisiteIsPet: 'Not',
  PrerequisiteMainCharacter: 'Companion',
};

const ALWAYS_FORBIDS: ReadonlySet<string> = new Set([
  'PrerequisiteNoFeature',
  'PrerequisiteNoClassLevel',
  'PrerequisiteNoArchetype',
  'PrerequisiteNotProficient',
]);

function polarityOf(component: Component): Polarity {
  const flag = NEGATED_BY[component.$type];
  if (flag !== undefined)
    return (component as unknown as Record<string, unknown>)[flag] === true ? 'forbids' : 'requires';
  return ALWAYS_FORBIDS.has(component.$type) ? 'forbids' : 'requires';
}

const examples = new Map<string, { readonly blueprint: BlueprintBase; readonly component: Component }>();
for (const blueprint of blueprints.values()) {
  for (const component of blueprint.Components) {
    if (prerequisiteTypes.has(component.$type) && !examples.has(component.$type)) {
      examples.set(component.$type, { blueprint, component });
    }
  }
}

function readAlone(type: string, fields: Readonly<Record<string, unknown>> = {}) {
  const example = examples.get(type);
  if (example === undefined) throw new Error(`data/ holds no ${type}`);
  const component = { ...example.component, ...fields } as Component;
  const [leaf] = prerequisites({ ...example.blueprint, Components: [component] }, blueprints);
  return { component, leaf };
}

describe('P reads each prerequisite with the polarity its CheckInternal gives it', { timeout: 30_000 }, () => {
  it.each(Object.entries(NEGATED_BY))(
    'reads %s with %s set as forbidding what it names, and clear as requiring it (CheckInternal negates on it)',
    (type, flag) => {
      const clear = readAlone(type, { [flag]: false }).leaf;
      const set = readAlone(type, { [flag]: true }).leaf;
      expect([clear?.polarity, set?.polarity]).toEqual(['requires', 'forbids']);
      expect(set?.names).toEqual(clear?.names);
    },
  );

  it('reads PrerequisiteNoFeature, NoClassLevel, NoArchetype and NotProficient as forbidding, whatever they carry', () => {
    for (const type of ALWAYS_FORBIDS) expect([type, readAlone(type).leaf?.polarity]).toEqual([type, 'forbids']);
  });

  it('reads PrerequisiteEtude as story state either way, whatever NotPlaying says (map ticket 21: always met)', () => {
    const polarities = [false, true].map((NotPlaying) => readAlone('PrerequisiteEtude', { NotPlaying }).leaf);
    expect(polarities.map((l) => [l?.polarity, l?.names.kind])).toEqual([
      ['requires', 'story'],
      ['requires', 'story'],
    ]);
  });

  it('gives every prerequisite type the data holds the polarity its game check implies', () => {
    const wrong = [...examples.values()]
      .filter(({ component }) => component.$type !== 'PrerequisiteEtude')
      .map(({ blueprint, component }) => ({
        type: component.$type,
        read: prerequisites({ ...blueprint, Components: [component] }, blueprints)[0]?.polarity,
        game: polarityOf(component),
      }))
      .filter((r) => r.read !== r.game);
    expect(wrong).toEqual([]);
    expect([...Object.keys(NEGATED_BY), ...ALWAYS_FORBIDS].filter((t) => !examples.has(t))).toEqual([]);
  });
});
