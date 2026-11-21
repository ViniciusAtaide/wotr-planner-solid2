import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { DataFile } from '../data';
import { readDataDir } from '../data-dir';
import { loadData } from '../load';
import { CompactError, decodeDocument, encodeDocument, FIELD_DEFAULTS, type FieldDefaults } from '.';

const data = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const viaJson = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const roundTrip = (files: readonly DataFile[], overrides: readonly DataFile[], defaults: FieldDefaults) =>
  decodeDocument(viaJson(encodeDocument(files, overrides, defaults)));

describe('the compact data document', { timeout: 60_000 }, () => {
  it('decodes the whole of data/ to exactly the files, key order included', () => {
    const back = roundTrip(data.files, data.overrides, FIELD_DEFAULTS);
    expect(JSON.stringify(back.files)).toBe(JSON.stringify(data.files));
    expect(JSON.stringify(back.overrides)).toBe(JSON.stringify(data.overrides));
  });

  it('loads to the same checked data as the files do', () => {
    const back = roundTrip(data.files, data.overrides, FIELD_DEFAULTS);
    expect(loadData(back.files, back.overrides)).toEqual(loadData(data.files, data.overrides));
  });

  const feature = (fields: Record<string, unknown>): DataFile => ({
    path: 'features/Test.0123456789abcdef0123456789abcdef.json',
    value: { $type: 'BlueprintFeature', assetName: 'Test', guid: '0123456789abcdef0123456789abcdef', ...fields },
  });
  const defaults: FieldDefaults = { BlueprintFeature: { HideInUI: false, Ranks: 0 } };

  it('drops a defaulted field only when it holds the default, and keeps a field that is absent absent', () => {
    const files = [feature({ HideInUI: false, Ranks: 5 }), feature({ HideInUI: true }), feature({})];
    const doc = viaJson(encodeDocument(files, [], defaults));
    expect(doc.shapes).toContainEqual(['BlueprintFeature', 'assetName', 'guid', '?HideInUI', 'Ranks']);
    expect(decodeDocument(doc).files).toEqual(files);
  });

  it('keeps references, GUIDs and strings that look like tags', () => {
    const files = [
      feature({ m_Feature: '!bp_fedcba9876543210fedcba9876543210', Note: '#3', Other: '$x', Path: '\\y' }),
    ];
    expect(roundTrip(files, [], defaults).files).toEqual(files);
  });

  it('refuses a file not named <folder>/<assetName>.<guid>.json', () => {
    const misnamed = { ...feature({}), path: 'features/Other.json' };
    expect(() => encodeDocument([misnamed], [], defaults)).toThrow(CompactError);
  });
});
