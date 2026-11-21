import { loadData, LoadError, type CheckedData, type DataFile } from '~engine/load';
import { deriveTwins, kindOf, progressionRootFields, refGuid, type Guid, type Kind, type Override } from '~engine/data';
import { blueprints, strings } from '../dump';
import { allowlist, type BlueprintEntry, type ComponentEntry } from './allowlist';
import { keepBlueprint, shortType, type FilterContext } from './filter';
import { keptSet, type StrictNames } from './keep-rule';
import { checkGrantors, type GrantorCheck } from './grantors';
import { checkSourcedCount, itemSourcing, naturalWeapons, type ItemSource } from './items';
import { noGrantorProblems } from './no-grantor';
import { unreachableProblems } from './unreachable';
import { notNeeded, notNeededFamilies } from './not-needed';
import { displayName, neutralName, sharedKeyCollector } from './names';
import { composedItemName } from './item-names';
import { applyPatch } from './overrides';
import { qualifyGear, type GearNames } from './gear-names';
import { qualifyNames, type Qualified } from './qualify';
import { buildReport } from './report';
import { serialise } from './serialise';
import { sharedNameProblems } from './shared-names';

const REF = /"!bp_([0-9a-f]{32})"/g;

const ITEM_KINDS: ReadonlySet<Kind> = new Set<Kind>(['items', 'itemtypes', 'enchantments']);

const OWN_RULE_KINDS: ReadonlySet<Kind> = new Set<Kind>([...ITEM_KINDS, 'units']);

export interface DumpIndex {
  readonly types: ReadonlyMap<Guid, string>;
  readonly refs: ReadonlyMap<Guid, readonly Guid[]>;
  readonly roots: readonly Guid[];
  readonly settings: readonly Guid[];
  readonly sharedKeys: ReadonlyMap<string, string>;
}

export async function indexDump(dumpPath: string): Promise<DumpIndex> {
  const types = new Map<Guid, string>();
  const refs = new Map<Guid, Guid[]>();
  const shared = sharedKeyCollector();
  let root: { guid: Guid; json: Record<string, unknown> } | undefined;
  const td = new TextDecoder();
  for await (const r of blueprints(dumpPath)) {
    const type = r.type.slice(r.type.lastIndexOf('.') + 1);
    const text = td.decode(r.json);
    types.set(r.guid, type);
    refs.set(r.guid, [...new Set(Array.from(text.matchAll(REF), (m) => m[1]).filter((g) => g !== undefined))]);
    shared.add(text);
    if (type === 'BlueprintRoot') root = { guid: r.guid, json: JSON.parse(text) as Record<string, unknown> };
  }
  if (root === undefined) throw new Error(`${dumpPath} has no BlueprintRoot`);
  const progressionRoot = root.json.Progression as Record<string, unknown>;
  const roots: Guid[] = [];
  for (const field of progressionRootFields) {
    for (const value of [progressionRoot[field]].flat()) {
      if (typeof value !== 'string' || !value.startsWith('!bp_'))
        throw new Error(`ProgressionRoot.${field} is not a reference`);
      roots.push(value.slice(4));
    }
  }
  const mythicsSettings = refGuid(root.json.m_BlueprintMythicsSettingsReference);
  if (mythicsSettings === undefined) throw new Error('BlueprintRoot names no Mythic settings');
  const playerCharacter = refGuid(root.json.m_DefaultPlayerCharacter);
  if (playerCharacter === undefined) throw new Error('BlueprintRoot names no default player character');
  return { types, refs, roots, settings: [root.guid, mythicsSettings, playerCharacter], sharedKeys: shared.keys() };
}

export function reachable(roots: readonly Guid[], refs: ReadonlyMap<Guid, readonly Guid[]>): Set<Guid> {
  const seen = new Set(roots);
  const queue = [...roots];
  for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
    for (const target of refs.get(next) ?? []) {
      if (refs.has(target) && !seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  return seen;
}

export interface ImportOutput {
  readonly files: ReadonlyMap<string, string>;
  readonly problems: readonly string[];
}

export interface Tally {
  readonly unlisted: Map<string, Set<Guid>>;
  readonly dropped: Map<string, number>;
  readonly written: Map<Kind, number>;
  readonly templates: string[];
  readonly fields: Map<string, { present: number; defaulted: number }>;
}

export interface KeepSummary {
  readonly sourced: ReadonlyMap<Guid, ReadonlySet<ItemSource>>;
  readonly held: number;
  readonly kept: number;
}

export async function runImport(dumpPath: string, overrideFiles: readonly DataFile[] = []): Promise<ImportOutput> {
  const index = await indexDump(dumpPath);
  const reached = reachable(index.roots, index.refs);
  const entries = new Map<string, BlueprintEntry>();
  const components = new Map<string, ComponentEntry>();
  for (const e of allowlist) (e.role === 'blueprint' ? entries : components).set(e.type, e as never);
  const problems: string[] = [];
  const tally: Tally = {
    unlisted: new Map(),
    dropped: new Map(),
    written: new Map(),
    fields: new Map(),
    templates: [],
  };

  const overrides = overrideFiles.map((f) => f.value as Override);
  const { held, patches, removals } = holdReachable(index, reached, entries, overrides, problems);
  const itemKind = (guid: Guid) => {
    const entry = entries.get(index.types.get(guid)!);
    return entry !== undefined && ITEM_KINDS.has(entry.kind) ? entry.kind : undefined;
  };
  const sourcing = itemSourcing(index);
  const wanted = (guid: Guid) => held.has(guid) || sourcing.want.has(guid) || itemKind(guid) !== undefined;
  const parsed = await parseWanted(dumpPath, wanted, patches, problems);
  const sourced = holdItems(held, parsed, sourcing, index, itemKind, removals, patches, problems);
  const filter = makeFilter(parsed, entries, components, await strings(dumpPath), index.sharedKeys);

  let keep: KeepSummary | undefined;
  let files = new Map<string, string>();
  const kept = problems.length === 0 ? trim(held, filter, index.types, problems) : undefined;
  if (kept !== undefined) {
    files = filter(
      kept,
      tallyContext(problems, (guid) => kept.get(guid), index.types, tally),
      tally.templates,
    );
    for (const kind of kept.values()) tally.written.set(kind, (tally.written.get(kind) ?? 0) + 1);
    keep = { sourced, held: held.size, kept: kept.size };
    problems.push(...writtenProblems(tally, components));
  }

  let data: CheckedData | undefined;
  let grantors: GrantorCheck | undefined;
  let names: Qualified | undefined;
  let gearNames: GearNames | undefined;
  if (problems.length === 0) {
    const dataFiles = [...files].map(([path, content]) => ({ path, value: JSON.parse(content) as unknown }));
    try {
      data = loadData(dataFiles, overrideFiles);
    } catch (e) {
      if (!(e instanceof LoadError)) throw e;
      problems.push(...e.problems.map((p) => `load check: ${p}`));
    }
  }
  if (data !== undefined) {
    names = qualifyNames(data, data.overrides);
    gearNames = qualifyGear(data, data.overrides);
    const collisions = new Map([...names.collisions, ...gearNames.collisions]);
    problems.push(...names.problems, ...gearNames.problems, ...sharedNameProblems(collisions, data));
    const written = new Map([...names.names, ...gearNames.names]);
    files = writeNames(files, written);
    const blueprints = new Map(data.blueprints);
    for (const [guid, name] of written) blueprints.set(guid, { ...blueprints.get(guid)!, name });
    problems.push(...twinProblems(data.twins, deriveTwins(blueprints)));
    data = { ...data, blueprints };
  }
  if (data !== undefined) {
    grantors = checkGrantors(data);
    problems.push(...noGrantorProblems(grantors, data), ...unreachableProblems(grantors, data));
  }

  files.set('report.md', buildReport({ reached: reached.size, tally, data, grantors, keep, names, gearNames }));
  return { files, problems };
}

function holdReachable(
  index: DumpIndex,
  reached: ReadonlySet<Guid>,
  entries: ReadonlyMap<string, BlueprintEntry>,
  overrides: readonly Override[],
  problems: string[],
) {
  const held = new Map<Guid, Kind>();
  const hold = (guid: Guid, named = false) => {
    const entry = entries.get(index.types.get(guid)!);
    if (entry === undefined || (OWN_RULE_KINDS.has(entry.kind) && !named)) return false;
    held.set(guid, entry.kind);
    return true;
  };
  for (const guid of reached) hold(guid);
  for (const guid of index.settings) hold(guid, true);
  const patches = new Map<Guid, Extract<Override, { change: 'patch' }>>();
  const removals: Override[] = [];
  for (const o of overrides) {
    if (o.change === 'add' && !hold(o.target, true))
      problems.push(`override adds ${o.target}, which no allowlist entry keeps`);
    if (o.change === 'remove') removals.push(o);
    if (o.change === 'patch') patches.set(o.target, o);
  }
  return { held, patches, removals };
}

type Parsed = ReadonlyMap<Guid, { readonly assetName: string; readonly json: Record<string, unknown> }>;

export function exactWideInts(text: string): string {
  return text.replace(/"m_IntValue":\s*(-?\d+)/g, '"m_IntValue":"$1"');
}

async function parseWanted(
  dumpPath: string,
  wanted: (guid: Guid) => boolean,
  patches: ReadonlyMap<Guid, Extract<Override, { change: 'patch' }>>,
  problems: string[],
): Promise<Parsed> {
  const parsed = new Map<Guid, { assetName: string; json: Record<string, unknown> }>();
  const td = new TextDecoder();
  for await (const r of blueprints(dumpPath, { want: (r) => wanted(r.guid) })) {
    let json = JSON.parse(exactWideInts(td.decode(r.json))) as Record<string, unknown>;
    const patch = patches.get(r.guid);
    if (patch !== undefined) json = applyPatch(json, patch.ops, `${r.name} ${r.guid}`, problems);
    parsed.set(r.guid, { assetName: r.name, json });
  }
  return parsed;
}

function holdItems(
  held: Map<Guid, Kind>,
  parsed: Parsed,
  sourcing: ReturnType<typeof itemSourcing>,
  index: DumpIndex,
  itemKind: (guid: Guid) => Kind | undefined,
  removals: readonly Override[],
  patches: ReadonlyMap<Guid, Override>,
  problems: string[],
): ReadonlyMap<Guid, ReadonlySet<ItemSource>> {
  const json = new Map([...parsed].map(([g, { json }]) => [g, json]));
  const sourced = sourcing.source(json);
  const countProblem = checkSourcedCount(sourced.size);
  if (countProblem !== undefined) problems.push(countProblem);
  for (const guid of sourced.keys()) held.set(guid, 'items');
  for (const o of removals) if (!held.delete(o.target)) problems.push(`override removes ${o.target}, which isn't held`);
  for (const g of naturalWeapons(
    [...sourced.keys()].filter((k) => held.has(k)),
    json,
  ))
    problems.push(
      `${parsed.get(g)?.assetName} ${g} is a natural weapon, never Gear: drop it with an override (map 12)`,
    );
  holdNamed(held, index, itemKind);
  for (const o of patches.values())
    if (!held.has(o.target)) problems.push(`override patches ${o.target}, which isn't held`);
  return sourced;
}

type Filter = (
  holding: ReadonlyMap<Guid, Kind>,
  into: FilterContext,
  templates: string[],
  names?: StrictNames,
) => Map<string, string>;

function makeFilter(
  parsed: Parsed,
  entries: ReadonlyMap<string, BlueprintEntry>,
  components: ReadonlyMap<string, ComponentEntry>,
  text: ReadonlyMap<string, string>,
  sharedKeys: ReadonlyMap<string, string>,
): Filter {
  return (holding, into, templates, names) => {
    const out = new Map<string, string>();
    for (const [guid, { assetName, json }] of parsed) {
      if (!holding.has(guid)) continue;
      const type = shortType(json.$type);
      const entry = entries.get(type)!;
      if (/[/\\]/.test(assetName)) into.problems.push(`${assetName} ${guid}: the asset name can't be a file name`);
      let name = entry.name === null ? undefined : displayName(json[entry.name], text, sharedKeys);
      name ??= composedItemName(type, json, {
        json: (g) => (g === undefined ? undefined : parsed.get(g)?.json),
        text: (field) => displayName(field, text, sharedKeys),
      });
      const neutral = name === undefined ? undefined : neutralName(name);
      if (neutral !== undefined) {
        templates.push(`${assetName} ${guid}: "${name}" → "${neutral}"`);
        name = neutral;
      }
      const named = new Set<Guid>();
      names?.set(guid, named);
      const ctx = names === undefined ? into : { ...into, names: (g: Guid) => named.add(g) };
      const kept = keepBlueprint({ guid, assetName, type, json }, entry, components, name, ctx);
      out.set(`${entry.kind}/${assetName}.${guid}.json`, serialise(kept));
    }
    return out;
  };
}

function trim(
  held: ReadonlyMap<Guid, Kind>,
  filter: Filter,
  types: ReadonlyMap<Guid, string>,
  problems: string[],
): ReadonlyMap<Guid, Kind> | undefined {
  let holding: ReadonlyMap<Guid, Kind> = held;
  for (let settled = false; !settled;) {
    const names: StrictNames = new Map();
    const forms = filter(
      holding,
      quietContext((guid) => holding.get(guid), types),
      [],
      names,
    );
    let formData: CheckedData;
    try {
      formData = loadData([...forms].map(([path, content]) => ({ path, value: JSON.parse(content) as unknown })));
    } catch (e) {
      if (!(e instanceof LoadError)) throw e;
      problems.push(...e.problems.map((p) => `load check, before trimming: ${p}`));
      return undefined;
    }
    const kept = keptSet(formData, names);
    for (const bp of formData.blueprints.values())
      if (kindOf[bp.$type] === 'enchantments' && bp.Components.length === 0) kept.delete(bp.guid);
    const next = new Map([...holding].filter(([guid]) => kept.has(guid)));
    settled = next.size === holding.size;
    holding = next;
  }
  return holding;
}

function writtenProblems(tally: Tally, components: ReadonlyMap<string, ComponentEntry>): string[] {
  const problems: string[] = [];
  const noted = notNeededFamilies.flatMap((f) => f.types);
  if (noted.length !== notNeeded.size) problems.push('not-needed.ts lists a type in more than one place');
  for (const type of notNeeded.keys()) {
    if (components.has(type)) problems.push(`not-needed.ts lists ${type}, which the allowlist keeps; remove it`);
    else if (!tally.unlisted.has(type))
      problems.push(`not-needed.ts lists ${type}, which no written blueprint carries; remove it`);
  }
  const occursAnywhere = (field: string) =>
    [...tally.fields].some(([key, count]) => key.endsWith(`.${field}`) && count.present > 0);
  for (const e of allowlist) {
    for (const [field, spec] of Object.entries(e.fields)) {
      if ((tally.fields.get(`${e.type}.${field}`)?.present ?? 0) > 0) continue;
      if (spec.absent !== undefined && occursAnywhere(field)) continue;
      problems.push(`allowlisted field ${e.type}.${field} occurs on no written blueprint`);
    }
  }
  return problems;
}

function tallyContext(
  problems: string[],
  heldKind: (guid: Guid) => Kind | undefined,
  types: ReadonlyMap<Guid, string>,
  tally: Tally,
): FilterContext {
  const count = (key: string) => tally.dropped.set(key, (tally.dropped.get(key) ?? 0) + 1);
  return {
    problems,
    heldKind,
    dumpType: (guid) => types.get(guid),
    dropped: (at) => count(at.replace(/^.* [0-9a-f]{32}(?:: |\.)/, '').replace(/\[\d+\]/g, '')),
    seen: (owner, field, present) => {
      const key = `${owner}.${field}`;
      let c = tally.fields.get(key);
      if (c === undefined) tally.fields.set(key, (c = { present: 0, defaulted: 0 }));
      if (present) c.present++;
      else c.defaulted++;
    },
    droppedPart: count,
    droppedComponent: (type) => count(`${type} (component)`),
    unlisted: (type, owner) => {
      let owners = tally.unlisted.get(type);
      if (owners === undefined) tally.unlisted.set(type, (owners = new Set()));
      owners.add(owner);
    },
  };
}

function twinProblems(named: ReadonlyMap<Guid, Guid>, loaded: ReadonlyMap<Guid, Guid>): string[] {
  const problems: string[] = [];
  for (const [twin, offered] of named)
    if (loaded.get(twin) !== offered) problems.push(`twin ${twin} of ${offered} isn't one once names are written`);
  for (const [twin, offered] of loaded)
    if (!named.has(twin)) problems.push(`${twin} becomes a twin of ${offered} once names are written`);
  return problems;
}

function writeNames(files: ReadonlyMap<string, string>, names: ReadonlyMap<Guid, string>): Map<string, string> {
  const out = new Map<string, string>();
  for (const [path, content] of files) {
    const guid = /\.([0-9a-f]{32})\.json$/.exec(path)?.[1];
    const name = guid === undefined ? undefined : names.get(guid);
    if (name === undefined) {
      out.set(path, content);
      continue;
    }
    const json = JSON.parse(content) as { readonly name?: string };
    const qualifier = qualifierOf(json.name, name);
    out.set(path, serialise({ ...json, name, ...(qualifier !== undefined && { qualifier }) }));
  }
  return out;
}

function qualifierOf(bare: string | undefined, qualified: string): string | undefined {
  if (bare === undefined || !qualified.startsWith(`${bare} (`) || !qualified.endsWith(')')) return undefined;
  return qualified.slice(bare.length + 2, -1);
}

function quietContext(heldKind: (guid: Guid) => Kind | undefined, types: ReadonlyMap<Guid, string>): FilterContext {
  const ignore = () => {};
  return {
    problems: [],
    heldKind,
    dumpType: (guid) => types.get(guid),
    dropped: ignore,
    seen: ignore,
    droppedPart: ignore,
    droppedComponent: ignore,
    unlisted: ignore,
  };
}

function holdNamed(held: Map<Guid, Kind>, index: DumpIndex, itemKind: (guid: Guid) => Kind | undefined): void {
  const queue = [...held.keys()];
  for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
    for (const target of index.refs.get(next) ?? []) {
      const kind = itemKind(target);
      if (kind === undefined || kind === 'items' || held.has(target)) continue;
      held.set(target, kind);
      queue.push(target);
    }
  }
}
