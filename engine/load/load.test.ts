import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadData, LoadError, type DataFile } from './load';
import { readDataDir } from '../data-dir';

const fixture = readDataDir(fileURLToPath(new URL('./fixtures/small', import.meta.url)));
const g = (n: number) => `f1${'0'.repeat(29)}${n}`;

function fixtureEdited(change: (files: DataFile[]) => DataFile[]) {
  const copy = structuredClone(fixture);
  return { files: change(copy.files), overrides: copy.overrides };
}

function problemsOf(files: readonly DataFile[], overrides: readonly DataFile[]): readonly string[] {
  try {
    loadData(files, overrides);
  } catch (e) {
    if (e instanceof LoadError) return e.problems;
    throw e;
  }
  return [];
}

function byPath(files: DataFile[], name: string): DataFile {
  const file = files.find((f) => f.path.includes(name));
  if (file === undefined) throw new Error(`no fixture file ${name}`);
  return file;
}

describe('loadData', () => {
  it('refuses a patch without its ops', () => {
    const copy = structuredClone(fixture);
    delete (copy.overrides[0].value as { ops?: unknown }).ops;
    expect(problemsOf(copy.files, copy.overrides)).toEqual([`${copy.overrides[0].path}: a patch needs its ops`]);
  });

  it('loads the hand-written fixture', () => {
    const data = loadData(fixture.files, fixture.overrides);
    expect(data.blueprints.size).toBe(8);
    expect(data.overrides).toHaveLength(1);
    expect(data.blueprints.get(g(1))?.$type).toBe('BlueprintCharacterClass');
  });

  it('refuses a file that is not at its kind, asset name and GUID', () => {
    const { files, overrides } = fixtureEdited((fs) =>
      fs.map((f) =>
        f.path.includes('TestDodgeFeature')
          ? {
              ...f,
              path: `classes/TestDodgeFeature.${g(6)}.json`,
            }
          : f,
      ),
    );
    expect(problemsOf(files, overrides)).toEqual([
      `classes/TestDodgeFeature.${g(6)}.json: a BlueprintFeature named TestDodgeFeature with GUID ${g(6)} belongs at features/TestDodgeFeature.${g(6)}.json`,
    ]);
  });

  it('refuses a $type the engine does not read, leaving the references to it unresolved', () => {
    const { files, overrides } = fixtureEdited((fs) => {
      (byPath(fs, 'TestDodgeFeature').value as { $type: string }).$type = 'BlueprintAbilityResource';
      return fs;
    });
    const problems = problemsOf(files, overrides);
    expect(problems).toContain(
      `features/TestDodgeFeature.${g(6)}.json: $type BlueprintAbilityResource is not one the engine reads`,
    );
    expect(problems).toContain(
      `features/TestMobilityFeature.${g(7)}.json: Components[0].m_Feature names ${g(6)}, which the data doesn't hold`,
    );
  });

  it('refuses two files with one GUID', () => {
    const { files, overrides } = fixtureEdited((fs) => [...fs, structuredClone(byPath(fs, 'TestDodgeFeature'))]);
    expect(problemsOf(files, overrides)).toEqual([
      `features/TestDodgeFeature.${g(6)}.json: GUID ${g(6)} is already features/TestDodgeFeature.${g(6)}.json`,
    ]);
  });

  it('refuses a file that is not a blueprint', () => {
    const { files, overrides } = fixtureEdited((fs) => [...fs, { path: 'features/Stray.json', value: { guid: g(9) } }]);
    expect(problemsOf(files, overrides)).toEqual([
      'features/Stray.json: not a blueprint (needs $type, guid, assetName and Components)',
    ]);
  });

  it('refuses a reference to a blueprint the data does not hold', () => {
    const { files, overrides } = fixtureEdited((fs) => fs.filter((f) => !f.path.includes('TestForbiddenFlag')));
    expect(problemsOf(files, overrides)).toEqual([
      `features/TestMobilityFeature.${g(7)}.json: Components[2].m_Feature names ${g(8)}, which the data doesn't hold`,
    ]);
  });

  it('refuses a prerequisite type P does not read', () => {
    const { files, overrides } = fixtureEdited((fs) => {
      const cleave = byPath(fs, 'TestCleaveFeature').value as { Components: { $type: string }[] };
      cleave.Components[0].$type = 'PrerequisiteLoreMaster';
      return fs;
    });
    expect(problemsOf(files, overrides)).toEqual([
      `features/TestCleaveFeature.${g(5)}.json: prerequisite PrerequisiteLoreMaster is not a type P reads`,
    ]);
  });

  it('refuses an override without its reason', () => {
    const copy = structuredClone(fixture);
    (copy.overrides[0].value as { reason: string }).reason = ' ';
    expect(problemsOf(copy.files, copy.overrides)).toEqual([
      `overrides/TestCleaveFeature.${g(5)}.json: an override needs its reason`,
    ]);
  });

  it('refuses an override that patches a blueprint the data does not hold', () => {
    const copy = structuredClone(fixture);
    (copy.overrides[0].value as { target: string }).target = g(9);
    expect(problemsOf(copy.files, copy.overrides)).toEqual([
      `overrides/TestCleaveFeature.${g(5)}.json: patches ${g(9)}, but the data doesn't hold it`,
    ]);
  });

  it('refuses an override without a target GUID', () => {
    const copy = structuredClone(fixture);
    (copy.overrides[0].value as { target: string }).target = 'TestCleaveFeature';
    expect(problemsOf(copy.files, copy.overrides)).toEqual([
      `overrides/TestCleaveFeature.${g(5)}.json: an override needs a target GUID`,
    ]);
  });

  it('refuses an override whose change is not add, remove, patch, name or alias', () => {
    const copy = structuredClone(fixture);
    (copy.overrides[0].value as { change: string }).change = 'rename';
    expect(problemsOf(copy.files, copy.overrides)).toEqual([
      `overrides/TestCleaveFeature.${g(5)}.json: an override's change is add, remove, patch, name or alias`,
    ]);
  });

  it('takes an alias from a GUID the data no longer holds, and refuses one from a GUID it holds (map 07)', () => {
    const alias = (from: string) => {
      const copy = structuredClone(fixture);
      (copy.overrides[0] as { value: unknown }).value = {
        change: 'alias',
        target: g(5),
        from,
        reason: 'the game replaced the old feat with this one',
      };
      return problemsOf(copy.files, copy.overrides);
    };
    expect(alias(g(9))).toEqual([]);
    expect(alias(g(4))).toEqual([
      `overrides/TestCleaveFeature.${g(5)}.json: aliases ${g(4)}, which the data still holds`,
    ]);
    expect(alias('TestPowerAttackFeature')).toEqual([
      `overrides/TestCleaveFeature.${g(5)}.json: an alias needs the old GUID it is from`,
    ]);
  });

  it('takes a name override with its qualifier', () => {
    const copy = structuredClone(fixture);
    (copy.overrides[0] as { value: unknown }).value = {
      change: 'name',
      target: g(5),
      qualifier: 'second',
      reason: 'two share the name',
    };
    expect(problemsOf(copy.files, copy.overrides)).toEqual([]);
  });

  it('refuses a name override without its qualifier', () => {
    const copy = structuredClone(fixture);
    (copy.overrides[0] as { value: unknown }).value = {
      change: 'name',
      target: g(5),
      qualifier: ' ',
      reason: 'two share the name',
    };
    expect(problemsOf(copy.files, copy.overrides)).toEqual([
      `overrides/TestCleaveFeature.${g(5)}.json: a name override needs its qualifier`,
    ]);
  });

  it('refuses a name override of a blueprint the data does not hold', () => {
    const copy = structuredClone(fixture);
    (copy.overrides[0] as { value: unknown }).value = {
      change: 'name',
      target: g(9),
      qualifier: 'second',
      reason: 'two share the name',
    };
    expect(problemsOf(copy.files, copy.overrides)).toEqual([
      `overrides/TestCleaveFeature.${g(5)}.json: names ${g(9)}, but the data doesn't hold it`,
    ]);
  });

  it('refuses a removal the data does not reflect', () => {
    const copy = structuredClone(fixture);
    (copy.overrides[0].value as { change: string }).change = 'remove';
    expect(problemsOf(copy.files, copy.overrides)).toEqual([
      `overrides/TestCleaveFeature.${g(5)}.json: removes ${g(5)}, but the data still holds it`,
    ]);
  });

  it('reports every problem at once', () => {
    const copy = structuredClone(fixture);
    (copy.overrides[0].value as { reason: string }).reason = '';
    const files = copy.files.filter((f) => !f.path.includes('TestForbiddenFlag'));
    expect(problemsOf(files, copy.overrides)).toHaveLength(2);
  });
});

describe("Gear's twins (map ticket 29's rule 1), derived at load", () => {
  const item = (guid: string, assetName: string, fields: object = {}): DataFile => ({
    path: `items/${assetName}.${guid}.json`,
    value: {
      $type: 'BlueprintItemEquipmentRing',
      guid,
      assetName,
      name: 'Adamantine Full Plate +2',
      Components: [],
      m_Enchantments: [],
      ...fields,
    },
  });
  const plain = 'b067c338ede1bfc45be97d2d9ab934e8';
  const hellknight = '29f9eb542c9985f4b904add8d843caf1';

  it('offers each twin as the lowest GUID among them', () => {
    const items = [
      item(plain, 'AdamantineFullplateStandartPlus2'),
      item(hellknight, 'AdamantineFullplateStandartPlus2_Hellknight'),
    ];
    const data = loadData([...fixture.files, ...items], fixture.overrides);
    expect([...data.twins]).toEqual([[plain, hellknight]]);
  });

  it('keeps apart items that differ in a kept field, or in their name', () => {
    const items = [
      item(plain, 'AdamantineFullplateStandartPlus2', { Components: [{ $type: 'EquipmentRestrictionMainPlayer' }] }),
      item(hellknight, 'AdamantineFullplateStandartPlus2_Hellknight'),
      item('0dab0f3855529264aa53e748735cdd0a', 'AdamantineFullplateStandartPlus4', {
        name: 'Adamantine Full Plate +4',
      }),
    ];
    expect(loadData([...fixture.files, ...items], fixture.overrides).twins.size).toBe(0);
  });

  it('refuses a stored twins file, which is not a blueprint', () => {
    expect(problemsOf([...fixture.files, { path: 'twins.json', value: {} }], fixture.overrides)).toEqual([
      'twins.json: not a blueprint (needs $type, guid, assetName and Components)',
    ]);
  });
});
