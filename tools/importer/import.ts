// The importer's pipeline (guide §3, module I): index the dump, walk what ProgressionRoot reaches, keep the
// allowlisted part of every blueprint the planner holds, and produce data/'s files and the report in memory. Writing
// them is sync.ts's job, so a check run can compare without touching the disk.
import { loadData, LoadError, type CheckedData, type DataFile } from '~engine/data/load';
import { deriveTwins } from '~engine/data/twins';
import { kindOf, progressionRootFields, refGuid, type Guid, type Kind, type Override } from '~engine/data/types';
import { blueprints, strings } from '../../scripts/dump/reader.mjs';
import { allowlist, type BlueprintEntry, type ComponentEntry } from './allowlist';
import { keepBlueprint, shortType, type FilterContext } from './filter';
import { keptSet, type StrictNames } from './keep-rule';
import { checkGrantors, type GrantorCheck } from './grantors';
import { checkSourcedCount, itemSourcing, naturalWeapons, type ItemSource } from './items';
import { noGrantorProblems } from './no-grantor';
import { unreachableProblems } from './unreachable';
import { notNeeded, notNeededFamilies } from './not-needed';
import { displayName, neutralName } from './names';
import { applyPatch } from './overrides';
import { qualifyGear, type GearNames } from './gear-names';
import { qualifyNames, type Qualified } from './qualify';
import { buildReport } from './report';
import { serialise } from './serialise';
import { sharedNameProblems } from './shared-names';

const REF = /"!bp_([0-9a-f]{32})"/g;

/**
 * Kinds held by their own rule rather than by the walk: items when the dump traces them to a source (map ticket 12),
 * and the item types and enchantments a held blueprint names.
 */
const ITEM_KINDS: ReadonlySet<Kind> = new Set<Kind>(['items', 'itemtypes', 'enchantments']);

/** Kinds the walk never holds: the item kinds, and units, of which only the one BlueprintRoot names is held (map 28). */
const OWN_RULE_KINDS: ReadonlySet<Kind> = new Set<Kind>([...ITEM_KINDS, 'units']);

export interface DumpIndex {
  /** The dump's class name of every blueprint. */
  readonly types: ReadonlyMap<Guid, string>;
  /** Every blueprint's references, from its JSON. */
  readonly refs: ReadonlyMap<Guid, readonly Guid[]>;
  /** The walk's start: the blueprints ProgressionRoot's fields name (`progressionRootFields`). */
  readonly roots: readonly Guid[];
  /**
   * What the rules read that the walk doesn't hold, because only BlueprintRoot names it: BlueprintRoot itself, the
   * Mythic settings (guide §3 point 5), and the unit every main character is made from (map ticket 28).
   */
  readonly settings: readonly Guid[];
}

/** One pass over the dump: each blueprint's class name and references, and the roots. */
export async function indexDump(dumpPath: string): Promise<DumpIndex> {
  const types = new Map<Guid, string>();
  const refs = new Map<Guid, Guid[]>();
  let root: { guid: Guid; json: Record<string, unknown> } | undefined;
  const td = new TextDecoder();
  for await (const r of blueprints(dumpPath)) {
    const type = r.type.slice(r.type.lastIndexOf('.') + 1);
    const text = td.decode(r.json);
    types.set(r.guid, type);
    refs.set(r.guid, [...new Set(Array.from(text.matchAll(REF), (m) => m[1]))]);
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
  return { types, refs, roots, settings: [root.guid, mythicsSettings, playerCharacter] };
}

/** Every blueprint reachable from `roots` by following every reference (guide §3 point 5). */
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
  /** data/'s files: path relative to data/ → content. */
  readonly files: ReadonlyMap<string, string>;
  /** Failed import checks; the importer writes nothing while there are any. */
  readonly problems: readonly string[];
}

export interface Tally {
  /** Unlisted component type → the blueprints that carry it. */
  readonly unlisted: Map<string, Set<Guid>>;
  /** `<type>.<field>` → references dropped because the planner doesn't hold their target. */
  readonly dropped: Map<string, number>;
  /** Blueprints written, by kind. */
  readonly written: Map<Kind, number>;
  /** Template names, with the neutral form written (ADR 0006). */
  readonly templates: string[];
  /** `<type>.<field>` → how many blueprints carried it, and how many took its default. */
  readonly fields: Map<string, { present: number; defaulted: number }>;
}

/** What the keep rule did (ticket 02b): the sourced items, and how many held blueprints it trimmed. */
export interface KeepSummary {
  /** Each sourced item's sources, before the hand-kept overrides. */
  readonly sourced: ReadonlyMap<Guid, ReadonlySet<ItemSource>>;
  /** Blueprints held before trimming: every reachable one of an allowlisted type, Grant carriers included. */
  readonly held: number;
  /** Blueprints kept by the keep rule (`keptSet`, keep-rule.ts). */
  readonly kept: number;
}

/**
 * Runs the import. `overrides` are data/overrides/'s corrections (guide §3 point 6): `add` writes a blueprint the walk
 * doesn't reach, `remove` drops one it does, `patch` edits the dump's JSON before the filter sees it, and `name`
 * qualifies a shared name. Each step below stops the rest once there are problems; the report is written regardless.
 */
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
  const filter = makeFilter(parsed, entries, components, await strings(dumpPath));

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

  // The load checks and the grantor check run on what the importer would write, so data/ never holds what fails.
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
  // Shared names (map tickets 27, 29 and 30): qualified after names are resolved, name overrides last, and written
  // into `name`. Gear's twins aren't written: the loader derives them (map ticket 29, guide §3.4).
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

/**
 * Holds every reachable blueprint of an allowlisted type, the settings BlueprintRoot names and what overrides add; and
 * sorts out the overrides that remove and patch.
 */
function holdReachable(
  index: DumpIndex,
  reached: ReadonlySet<Guid>,
  entries: ReadonlyMap<string, BlueprintEntry>,
  overrides: readonly Override[],
  problems: string[],
) {
  const held = new Map<Guid, Kind>();
  /** Holds a blueprint of an allowlisted type; one of OWN_RULE_KINDS only when `named` (by an override or the root). */
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

/** A blueprint as the dump has it, with any override's patch applied. */
type Parsed = ReadonlyMap<Guid, { readonly assetName: string; readonly json: Record<string, unknown> }>;

/**
 * Parses, once, every blueprint `wanted` admits: the held ones (every reachable Grant carrier among them), what the
 * item sourcing reads, and every item type and enchantment.
 */
async function parseWanted(
  dumpPath: string,
  wanted: (guid: Guid) => boolean,
  patches: ReadonlyMap<Guid, Extract<Override, { change: 'patch' }>>,
  problems: string[],
): Promise<Parsed> {
  const parsed = new Map<Guid, { assetName: string; json: Record<string, unknown> }>();
  const td = new TextDecoder();
  for await (const r of blueprints(dumpPath, { want: (r) => wanted(r.guid) })) {
    let json = JSON.parse(td.decode(r.json)) as Record<string, unknown>;
    const patch = patches.get(r.guid);
    if (patch !== undefined) json = applyPatch(json, patch.ops, `${r.name} ${r.guid}`, problems);
    parsed.set(r.guid, { assetName: r.name, json });
  }
  return parsed;
}

/**
 * Items (map ticket 12): holds the sourced ones, applies the hand-kept removals, and holds the types and enchantments
 * held blueprints name. Returns each sourced item's sources.
 */
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

/**
 * Filters the blueprints `holding` holds into data/'s files, judging every reference against `into.heldKind`, and
 * records what each one's strict references name (KeepContext.names).
 */
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
): Filter {
  return (holding, into, templates, names) => {
    const out = new Map<string, string>();
    for (const [guid, { assetName, json }] of parsed) {
      if (!holding.has(guid)) continue;
      const type = shortType(json.$type);
      const entry = entries.get(type)!;
      if (/[/\\]/.test(assetName)) into.problems.push(`${assetName} ${guid}: the asset name can't be a file name`);
      let name = entry.name === null ? undefined : displayName(json[entry.name], text);
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

/**
 * The keep rule (`keptSet`), judged on kept forms: a filter of everything held builds G, and the rule picks what
 * stays. A kept field drops what isn't kept, so the rule is judged again on the kept set's forms until nothing more
 * goes. An enchantment stays only while its kept form says something (a counted stat bonus, a held fact, mithral).
 * These filters only inform the rule, so their problems don't count: most are on carriers the rule trims, and the last
 * filter, which writes the kept set, records again any that remain. Returns the kept set, or `undefined` on a problem.
 */
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

/**
 * The checks on what was written, which need the kept set's tally: not-needed.ts stays exact (each type in it once,
 * unlisted, and carried by some written blueprint), and each allowlisted field occurs on its type in the dump (guide
 * §3 point 8). A field with a default may instead occur on another type that keeps it: it is inherited (a
 * Prerequisite's IsFeatureSelectionWhiteList), and some subclasses' JSON always omits it.
 */
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

/** The filter context of the written filter: it records problems, and counts into `tally` for the report. */
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
    // `at` is `<asset name> <guid>.<field>` or `<asset name> <guid>: Components[i] <type>.<field>`.
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

/**
 * Twins are derived from display names, and the loader sees the written ones. A written name that drew two items
 * together, or a twin written apart from the item offered for it, would change what the pickers offer.
 */
function twinProblems(named: ReadonlyMap<Guid, Guid>, loaded: ReadonlyMap<Guid, Guid>): string[] {
  const problems: string[] = [];
  for (const [twin, offered] of named)
    if (loaded.get(twin) !== offered) problems.push(`twin ${twin} of ${offered} isn't one once names are written`);
  for (const [twin, offered] of loaded)
    if (!named.has(twin)) problems.push(`${twin} becomes a twin of ${offered} once names are written`);
  return problems;
}

/** data/'s files with each qualified blueprint's `name` written in its qualified form. */
function writeNames(files: ReadonlyMap<string, string>, names: ReadonlyMap<Guid, string>): Map<string, string> {
  const out = new Map<string, string>();
  for (const [path, content] of files) {
    const guid = /\.([0-9a-f]{32})\.json$/.exec(path)?.[1];
    const name = guid === undefined ? undefined : names.get(guid);
    out.set(path, name === undefined ? content : serialise({ ...(JSON.parse(content) as object), name }));
  }
  return out;
}

/** A filter context that records problems but counts nothing: for a filter whose output only informs a decision. */
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

/**
 * Holds the item types and enchantments a held blueprint names in the dump, through their own references in turn
 * (an item names its type, which names its enchantments). Which enchantments stay held is judged after.
 */
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
