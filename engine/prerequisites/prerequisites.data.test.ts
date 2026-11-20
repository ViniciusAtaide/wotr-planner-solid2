import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadData } from '../load';
import { readDataDir } from '../data-dir';
import { namedFacts, paramPrerequisites, prerequisites } from './prerequisites';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const { blueprints } = loadData(files.files, files.overrides);

function leaves(guid: string) {
  const bp = blueprints.get(guid);
  if (bp === undefined) throw new Error(`data/ doesn't hold ${guid}`);
  return prerequisites(bp, blueprints);
}

describe('P on the game data', () => {
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
