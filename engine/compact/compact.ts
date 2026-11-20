import type { DataFile } from '../data';

export type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };

export type FieldDefaults = Readonly<Record<string, Readonly<Record<string, Json>>>>;

export const COMPACT_VERSION = 1;

export interface CompactDocument {
  readonly version: typeof COMPACT_VERSION;
  readonly guids: string;
  readonly shapes: readonly (readonly string[])[];
  readonly defaults: FieldDefaults;
  readonly folders: readonly string[];
  readonly blueprints: readonly (readonly [number, Json])[];
  readonly overrides: readonly DataFile[];
}

export class CompactError extends Error {}

const GUID_LENGTH = 32;
const GUID = /^[0-9a-f]{32}$/;
const REFERENCE = /^!bp_([0-9a-f]{32})$/;
const REFERENCE_TAG = '#';
const GUID_TAG = '$';
const ESCAPE_TAG = '\\';
const TAGGED = /^[#$\\]/;
const LIST_HEAD = 0;
const UNTYPED = '';
const DEFAULTED = '?';
const TYPE_KEY = '$type';

type JsonObject = { readonly [key: string]: Json };

export const structKey = (fields: readonly string[]): string => `{${[...fields].sort().join(',')}}`;

const isObject = (v: Json): v is JsonObject => v !== null && typeof v === 'object' && !Array.isArray(v);
const same = (a: Json, b: Json) => JSON.stringify(a) === JSON.stringify(b);

function pathOf(folder: string, value: Json): string {
  if (!isObject(value) || typeof value.assetName !== 'string' || typeof value.guid !== 'string') {
    throw new CompactError(`a blueprint in ${folder}/ has no assetName or guid`);
  }
  return `${folder}/${value.assetName}.${value.guid}.json`;
}

export function encodeDocument(
  files: readonly DataFile[],
  overrides: readonly DataFile[],
  fieldDefaults: FieldDefaults,
): CompactDocument {
  const guids: string[] = [];
  const guidIndex = new Map<string, number>();
  const indexOf = (guid: string) => {
    let i = guidIndex.get(guid);
    if (i === undefined) {
      i = guids.length;
      guids.push(guid);
      guidIndex.set(guid, i);
    }
    return i.toString(36);
  };
  const shapes: string[][] = [];
  const shapeIndex = new Map<string, number>();
  const shapeId = (shape: string[]) => {
    const key = JSON.stringify(shape);
    let i = shapeIndex.get(key);
    if (i === undefined) {
      shapes.push(shape);
      i = shapes.length;
      shapeIndex.set(key, i);
    }
    return i;
  };
  const usedDefaults = new Map<string, Record<string, Json>>();

  const encode = (v: Json): Json => {
    if (typeof v === 'string') {
      const reference = REFERENCE.exec(v);
      if (reference?.[1] !== undefined) return REFERENCE_TAG + indexOf(reference[1]);
      if (GUID.test(v)) return GUID_TAG + indexOf(v);
      return TAGGED.test(v) ? ESCAPE_TAG + v : v;
    }
    if (Array.isArray(v)) return [LIST_HEAD, ...v.map(encode)];
    if (!isObject(v)) return v;
    const type = typeof v[TYPE_KEY] === 'string' ? v[TYPE_KEY] : undefined;
    const defaultsKey = type ?? structKey(Object.keys(v));
    const defaults = fieldDefaults[defaultsKey];
    const shape: string[] = [type ?? UNTYPED];
    const values: Json[] = [];
    for (const [key, value] of Object.entries(v)) {
      if (key === TYPE_KEY) continue;
      if (key.startsWith(DEFAULTED)) throw new CompactError(`field ${key} starts with ${DEFAULTED}`);
      const fallback = defaults?.[key];
      if (fallback !== undefined && same(value, fallback)) {
        shape.push(DEFAULTED + key);
        const used = usedDefaults.get(defaultsKey) ?? {};
        used[key] = fallback;
        usedDefaults.set(defaultsKey, used);
        continue;
      }
      shape.push(key);
      values.push(encode(value));
    }
    return [shapeId(shape), ...values];
  };

  const folders: string[] = [];
  const blueprints = files.map((file): readonly [number, Json] => {
    const folder = file.path.split('/')[0] ?? '';
    const value = file.value as Json;
    if (pathOf(folder, value) !== file.path) {
      throw new CompactError(`${file.path} isn't named <folder>/<assetName>.<guid>.json`);
    }
    let f = folders.indexOf(folder);
    if (f < 0) f = folders.push(folder) - 1;
    return [f, encode(value)];
  });

  const defaults = Object.fromEntries(
    [...usedDefaults].sort(([a], [b]) => a.localeCompare(b)).map(([type, fields]) => [type, fields]),
  );
  return {
    version: COMPACT_VERSION,
    guids: guids.join(''),
    shapes,
    defaults,
    folders,
    blueprints,
    overrides,
  };
}

export function decodeDocument(doc: CompactDocument): { files: DataFile[]; overrides: DataFile[] } {
  if (doc.version !== COMPACT_VERSION) throw new CompactError(`unknown document version ${String(doc.version)}`);
  const guidAt = (index: string) => {
    const at = parseInt(index, 36) * GUID_LENGTH;
    const guid = doc.guids.slice(at, at + GUID_LENGTH);
    if (guid.length !== GUID_LENGTH) throw new CompactError(`no GUID at index ${index}`);
    return guid;
  };

  const decode = (v: Json): Json => {
    if (typeof v === 'string') {
      if (v.startsWith(REFERENCE_TAG)) return `!bp_${guidAt(v.slice(1))}`;
      if (v.startsWith(GUID_TAG)) return guidAt(v.slice(1));
      if (v.startsWith(ESCAPE_TAG)) return v.slice(1);
      return v;
    }
    if (!Array.isArray(v)) return v;
    const [head, ...rest] = v as readonly Json[];
    if (head === LIST_HEAD) return rest.map(decode);
    const shape = typeof head === 'number' ? doc.shapes[head - 1] : undefined;
    if (shape === undefined) throw new CompactError(`no shape ${JSON.stringify(head)}`);
    const [type, ...keys] = shape;
    const out: Record<string, Json> = {};
    if (type !== UNTYPED && type !== undefined) out[TYPE_KEY] = type;
    const defaultsKey =
      type === UNTYPED || type === undefined
        ? structKey(keys.map((k) => (k.startsWith(DEFAULTED) ? k.slice(DEFAULTED.length) : k)))
        : type;
    let next = 0;
    for (const key of keys) {
      if (key.startsWith(DEFAULTED)) {
        const name = key.slice(DEFAULTED.length);
        const fallback = doc.defaults[defaultsKey]?.[name];
        if (fallback === undefined) throw new CompactError(`${defaultsKey}.${name} has no default`);
        out[name] = structuredClone(fallback);
      } else {
        out[key] = decode(rest[next++] as Json);
      }
    }
    return out;
  };

  const files = doc.blueprints.map(([folder, encoded]): DataFile => {
    const value = decode(encoded);
    return { path: pathOf(doc.folders[folder] ?? '', value), value };
  });
  return { files, overrides: [...doc.overrides] };
}
