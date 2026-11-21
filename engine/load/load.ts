import {
  deriveTwins,
  fingerprintOf,
  isPrerequisite,
  isRecord,
  kindOf,
  prerequisiteTypes,
  references,
  type Blueprint,
  type BlueprintRoot,
  type DataFile,
  type Guid,
  type Override,
} from '../data';

export type { DataFile } from '../data';

export interface CheckedData {
  readonly blueprints: ReadonlyMap<Guid, Blueprint>;
  readonly overrides: readonly Override[];
  readonly twins: ReadonlyMap<Guid, Guid>;
}

export class LoadError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`the data failed ${problems.length} load check(s):\n${problems.map((p) => `- ${p}`).join('\n')}`);
    this.name = 'LoadError';
  }
}

const GUID = /^[0-9a-f]{32}$/;
const FILE = /^([a-z]+)\/(.+)\.([0-9a-f]{32})\.json$/;

function readBlueprint(file: DataFile, problems: string[]): Blueprint | undefined {
  const { path, value } = file;
  if (!isRecord(value) || typeof value.$type !== 'string' || typeof value.guid !== 'string') {
    problems.push(`${path}: not a blueprint (needs $type, guid, assetName and Components)`);
    return undefined;
  }
  if (typeof value.assetName !== 'string' || !Array.isArray(value.Components)) {
    problems.push(`${path}: not a blueprint (needs $type, guid, assetName and Components)`);
    return undefined;
  }
  const kind = kindOf[value.$type as Blueprint['$type']];
  if (kind === undefined) {
    problems.push(`${path}: $type ${value.$type} is not one the engine reads`);
    return undefined;
  }
  const expected = `${kind}/${value.assetName}.${value.guid}.json`;
  if (!FILE.test(path) || path !== expected) {
    problems.push(`${path}: a ${value.$type} named ${value.assetName} with GUID ${value.guid} belongs at ${expected}`);
  }
  return value as unknown as Blueprint;
}

const FINGERPRINT = /^[0-9a-f]{8}$/;

const SUMMARY_KEYS: ReadonlySet<string> = new Set(['change', 'target', 'reason', 'text', 'fingerprint']);

function readOverride(file: DataFile, problems: string[]): Override | undefined {
  const { path, value } = file;
  if (!isRecord(value)) {
    problems.push(`${path}: not an override`);
    return undefined;
  }
  if (typeof value.reason !== 'string' || value.reason.trim() === '') {
    problems.push(`${path}: an override needs its reason`);
  }
  if (typeof value.target !== 'string' || !GUID.test(value.target)) {
    problems.push(`${path}: an override needs a target GUID`);
    return undefined;
  }
  if (!['add', 'remove', 'patch', 'name', 'alias', 'summary'].includes(value.change as string)) {
    problems.push(`${path}: an override's change is add, remove, patch, name, alias or summary`);
    return undefined;
  }
  if (value.change === 'summary') {
    const before = problems.length;
    if (typeof value.text !== 'string' || value.text.trim() === '') problems.push(`${path}: a summary needs its text`);
    if (typeof value.fingerprint !== 'string' || !FINGERPRINT.test(value.fingerprint))
      problems.push(`${path}: a summary needs the fingerprint of the components it describes`);
    const extra = Object.keys(value).filter((k) => !SUMMARY_KEYS.has(k));
    if (extra.length > 0) problems.push(`${path}: a summary holds only its wording, not ${extra.join(', ')}`);
    if (problems.length > before) return undefined;
  }
  if (value.change === 'patch' && (!Array.isArray(value.ops) || value.ops.length === 0)) {
    problems.push(`${path}: a patch needs its ops`);
  }
  if (value.change === 'name' && (typeof value.qualifier !== 'string' || value.qualifier.trim() === '')) {
    problems.push(`${path}: a name override needs its qualifier`);
  }
  if (value.change === 'alias' && (typeof value.from !== 'string' || !GUID.test(value.from))) {
    problems.push(`${path}: an alias needs the old GUID it is from`);
    return undefined;
  }
  return value as unknown as Override;
}

export function loadData(files: readonly DataFile[], overrideFiles: readonly DataFile[] = []): CheckedData {
  const problems: string[] = [];
  const blueprints = new Map<Guid, Blueprint>();
  const pathOf = new Map<Guid, string>();

  for (const file of files) {
    const bp = readBlueprint(file, problems);
    if (bp === undefined) continue;
    const earlier = pathOf.get(bp.guid);
    if (earlier !== undefined) {
      problems.push(`${file.path}: GUID ${bp.guid} is already ${earlier}`);
      continue;
    }
    blueprints.set(bp.guid, bp);
    pathOf.set(bp.guid, file.path);
  }

  for (const [guid, bp] of blueprints) {
    const path = pathOf.get(guid);
    for (const { path: at, guid: target } of references(bp)) {
      if (!blueprints.has(target)) problems.push(`${path}: ${at} names ${target}, which the data doesn't hold`);
    }
    for (const component of bp.Components) {
      if (isPrerequisite(component) && !prerequisiteTypes.has(component.$type)) {
        problems.push(`${path}: prerequisite ${component.$type} is not a type P reads`);
      }
    }
  }

  const overrides: Override[] = [];
  for (const file of overrideFiles) {
    const o = readOverride(file, problems);
    if (o === undefined) continue;
    overrides.push(o);
    const held = blueprints.has(o.target);
    if (o.change === 'remove' && held) {
      problems.push(`${file.path}: removes ${o.target}, but the data still holds it`);
    } else if (o.change !== 'remove' && !held) {
      const verb = { add: 'adds', patch: 'patches', name: 'names', alias: 'aliases', summary: 'summarizes' }[o.change];
      problems.push(`${file.path}: ${verb} ${o.target}, but the data doesn't hold it`);
    }
    const summarized = o.change === 'summary' ? blueprints.get(o.target) : undefined;
    if (o.change === 'summary' && summarized !== undefined) {
      const now = fingerprintOf(summarized.Components);
      if (o.fingerprint !== now)
        problems.push(
          `${file.path}: the components this summary describes changed (fingerprint ${o.fingerprint}, now ${now}); reread them, then update its text and fingerprint`,
        );
    }
    if (o.change === 'alias' && blueprints.has(o.from)) {
      problems.push(`${file.path}: aliases ${o.from}, which the data still holds`);
    }
  }

  if (problems.length > 0) throw new LoadError(problems);
  return { blueprints, overrides, twins: deriveTwins(blueprints) };
}

const roots = new WeakMap<CheckedData['blueprints'], BlueprintRoot | undefined>();

export function blueprintRoot(data: Pick<CheckedData, 'blueprints'>): BlueprintRoot | undefined {
  if (roots.has(data.blueprints)) return roots.get(data.blueprints);
  let root: BlueprintRoot | undefined;
  for (const bp of data.blueprints.values()) {
    if (bp.$type === 'BlueprintRoot') {
      root = bp;
      break;
    }
  }
  roots.set(data.blueprints, root);
  return root;
}
