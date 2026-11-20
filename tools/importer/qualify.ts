import type { CheckedData } from '~engine/load';
import { isShown, kindOf, type Blueprint, type Guid, type Override } from '~engine/data';
import { buildGrantIndex, reachableFromGear, reachableFromRoot, type GrantIndex } from '~engine/grants';
import { namedWithLevel, prerequisites } from '~engine/prerequisites';
import {
  candidatePass,
  collisionsOf,
  compare,
  hasBare,
  kindWords,
  nameOverridesOf,
  qualifyGroups,
  runSteps,
  settle,
  shownName,
  unusedOverrideProblems,
  usedQualifiers,
  type Candidates,
  type Group,
} from './name-groups';

export const nameSources = [
  'item',
  'grantor',
  'level',
  'kind',
  'prerequisite',
  'class',
  'family',
  'override',
  'bare',
] as const;

export type NameSource = (typeof nameSources)[number];

export interface GroupMember {
  readonly guid: Guid;
  readonly source: NameSource | undefined;
  readonly qualifier: string | undefined;
}

export interface NameGroup {
  readonly name: string;
  readonly members: readonly GroupMember[];
}

export interface Qualified {
  readonly groups: readonly NameGroup[];
  readonly names: ReadonlyMap<Guid, string>;
  readonly collisions: ReadonlyMap<string, readonly Guid[]>;
  readonly problems: readonly string[];
}

interface CommonName {
  readonly name: string;
  readonly level: number | undefined;
}

interface Ancestor {
  readonly guid: Guid;
  readonly depth: number;
  readonly level: number | undefined;
  readonly everyRoute: boolean;
}

export function qualifyNames(data: Pick<CheckedData, 'blueprints'>, overrides: readonly Override[]): Qualified {
  const bp = (guid: Guid) => data.blueprints.get(guid)!;
  const G = buildGrantIndex(data);
  const reach = reachableFromRoot(data, G);
  const gear = reachableFromGear(data, G);
  const gearOnly = new Set([...gear].filter((g) => !reach.has(g) && kindOf[bp(g).$type] !== 'items'));
  const shown = [...reach, ...gearOnly].filter((g) => bp(g).$type !== 'BlueprintRoot' && isShown(bp(g)));
  const { byTarget: nameOverrides, repeated } = nameOverridesOf(overrides, data, false);
  const problems = repeated.map((g) => `${bp(g).assetName} ${g}: more than one name override`);

  const finders: Finders = {
    ancestorsOf: ancestorFinder(G, data),
    routesOf: routeFinder(G, reach, data),
    familyOf: (fact, name) => family(G, data, fact, name),
    archetypeClass: (archetype) => G.grantorsOf(archetype).find((g) => g.kind === 'classArchetype')?.grantor,
    itemOf: (fact) => (gearOnly.has(fact) ? itemGrantor(G, gear, data, fact) : undefined),
  };
  const consumed = new Set<Guid>();
  const { groups, names } = qualifyGroups<NameSource>({
    guids: shown,
    bp,
    order: (a, b) => compare(bp(a).assetName, bp(b).assetName) || compare(a, b),
    steps: (group) => settleGroup(group, finders, data),
    nameOverrides,
    consumed,
    problems,
  });
  problems.push(
    ...unusedOverrideProblems(
      nameOverrides,
      consumed,
      groups,
      data,
      'no other blueprint a Build can reach shares its name',
    ),
  );
  const collisions = collisionsOf(shown, (g) => names.get(g) ?? bp(g).name!);
  return { groups, names, collisions, problems };
}

function settleGroup(group: Group<NameSource>, finders: Finders, data: Pick<CheckedData, 'blueprints'>): void {
  const { name } = group;
  const bp = (guid: Guid) => data.blueprints.get(guid)!;
  const nameOf = (guid: Guid) => bp(guid).name!;
  const near = (entries: Iterable<readonly [string, number]>) => nearest(name, entries);
  const onRoute = (m: Guid) => finders.ancestorsOf(m).filter((a) => a.everyRoute);
  runSteps(group, [
    () => candidatePass(group, 'item', (m) => near(withLevel(finders.itemOf(m)))),
    () => candidatePass(group, 'grantor', (m) => near(onRoute(m).map((a) => [nameOf(a.guid), a.depth]))),
    () =>
      candidatePass(group, 'level', (m) =>
        near(
          onRoute(m)
            .filter((a) => a.level !== undefined)
            .map((a) => [nameOf(a.guid) === name ? `level ${a.level}` : `${nameOf(a.guid)} ${a.level}`, a.depth]),
        ),
      ),
    () => {
      classStaysBare(group, bp);
      return candidatePass(group, 'kind', (m) => near([[kindWords[bp(m).$type], 0]]));
    },
    () => candidatePass(group, 'prerequisite', (m) => near(requiredNames(bp(m), data).map((n) => [n, 0]))),
    () => classStep(group, finders, nameOf),
    () => candidatePass(group, 'family', (m) => near(withLevel(finders.familyOf(m, name)))),
  ]);
}

function nearest(name: string, entries: Iterable<readonly [string, number]>): Candidates {
  const out = new Map<string, number>();
  for (const [q, d] of entries) if (q !== name && !((out.get(q) ?? Infinity) <= d)) out.set(q, d);
  return out;
}

function withLevel(common: CommonName | undefined): [string, number][] {
  if (common === undefined) return [];
  return common.level === undefined
    ? [[common.name, 0]]
    : [
        [common.name, 0],
        [`${common.name} ${common.level}`, 1],
      ];
}

function classStaysBare(group: Group<NameSource>, bp: (guid: Guid) => Blueprint): void {
  if (hasBare(group)) return;
  const classes = group.left.filter((m) => bp(m).$type === 'BlueprintCharacterClass');
  if (classes.length === 1) settle(group, classes[0]!, { source: 'kind', qualifier: undefined });
}

function classStep(group: Group<NameSource>, finders: Finders, nameOf: (guid: Guid) => string): boolean {
  const routes = new Map(group.left.map((m) => [m, finders.routesOf(m)]));
  const byClass = new Map<Guid, Guid[]>();
  for (const m of group.left) {
    const r = routes.get(m)!;
    if (r.classes.size !== 1) continue;
    const c = [...r.classes.keys()][0]!;
    byClass.set(c, [...(byClass.get(c) ?? []), m]);
  }
  const proposed = new Map<Guid, string | undefined>();
  for (const [c, copies] of byClass) {
    const levelOf = (m: Guid) => Math.min(...routes.get(m)!.classes.get(c)!);
    const own = (m: Guid) => {
      const r = routes.get(m)!;
      return !r.other && [...r.archetypes].every((a) => finders.archetypeClass(a) === c);
    };
    copies.sort((a, b) => levelOf(a) - levelOf(b));
    const first = copies[0]!;
    const earliest = copies.length === 1 || levelOf(first) < levelOf(copies[1]!);
    for (const m of copies) {
      if (m === first && earliest && byClass.size === 1 && routes.get(m)!.archetypes.size > 0)
        proposed.set(m, undefined);
      else if (!own(m)) continue;
      else proposed.set(m, copies.length === 1 ? nameOf(c) : `${nameOf(c)} ${levelOf(m)}`);
    }
  }
  for (const m of group.left) {
    const r = routes.get(m)!;
    if (r.classes.size > 0 || r.other || r.archetypes.size === 0) continue;
    const archetypeName = commonName([...r.archetypes].map(nameOf));
    if (archetypeName !== undefined) proposed.set(m, archetypeName);
  }
  const used = usedQualifiers(group);
  const counts = new Map<string | undefined, number>();
  for (const q of proposed.values()) counts.set(q, (counts.get(q) ?? 0) + 1);
  let any = false;
  for (const [m, qualifier] of proposed) {
    if (counts.get(qualifier) !== 1 || used.has(qualifier) || (qualifier === undefined && hasBare(group))) continue;
    settle(group, m, { source: 'class', qualifier });
    any = true;
  }
  return any;
}

interface Routes {
  readonly classes: ReadonlyMap<Guid, readonly number[]>;
  readonly archetypes: ReadonlySet<Guid>;
  readonly other: boolean;
}

interface Finders {
  readonly ancestorsOf: (fact: Guid) => readonly Ancestor[];
  readonly routesOf: (fact: Guid) => Routes;
  readonly itemOf: (fact: Guid) => CommonName | undefined;
  readonly archetypeClass: (archetype: Guid) => Guid | undefined;
  readonly familyOf: (fact: Guid, name: string) => CommonName | undefined;
}

function routeFinder(
  G: GrantIndex,
  reach: ReadonlySet<Guid>,
  data: Pick<CheckedData, 'blueprints'>,
): (fact: Guid) => Routes {
  const isSelection = (guid: Guid) => data.blueprints.get(guid)?.$type === 'BlueprintFeatureSelection';
  const classOf = (progression: Guid) =>
    G.grantorsOf(progression).find((g) => g.kind === 'classProgression' && reach.has(g.grantor))?.grantor;
  return (fact) => {
    const classes = new Map<Guid, number[]>();
    const archetypes = new Set<Guid>();
    let other = false;
    const selections = G.climb(fact, (g) => !isSelection(g)).filter((c) => isSelection(c.grantor));
    for (const granted of [fact, ...selections.map((c) => c.grantor)]) {
      for (const g of G.grantorsOf(granted)) {
        if (!reach.has(g.grantor)) continue;
        const c = g.kind === 'levelEntry' ? classOf(g.grantor) : undefined;
        if (c !== undefined && g.level !== undefined) classes.set(c, [...(classes.get(c) ?? []), g.level]);
        else if (g.kind === 'archetypeAdd') archetypes.add(g.grantor);
        else if (g.kind !== 'selectionOption' || !isSelection(g.grantor)) other = true;
      }
    }
    return { classes, archetypes, other };
  };
}

function family(
  G: GrantIndex,
  data: Pick<CheckedData, 'blueprints'>,
  fact: Guid,
  name: string,
): CommonName | undefined {
  const nameOf = (guid: Guid) => shownName(data, guid);
  const named = (guid: Guid) => nameOf(guid) !== undefined && nameOf(guid) !== name;
  const nearest = G.climb(fact, named).filter((c) => named(c.grantor));
  return commonOf(nearest.map((c) => ({ name: nameOf(c.grantor), level: c.level })));
}

function commonOf(
  grantors: readonly { readonly name: string | undefined; readonly level: number | undefined }[],
): CommonName | undefined {
  const name = commonName(grantors.map((g) => g.name).filter((n): n is string => n !== undefined));
  if (name === undefined) return undefined;
  const levels = new Set(grantors.map((g) => g.level));
  return { name, level: levels.size === 1 ? [...levels][0] : undefined };
}

function commonName(names: readonly string[]): string | undefined {
  if (names.length === 0) return undefined;
  const words = names.map((n) => n.split(' '));
  let n = 0;
  while (words.every((w) => n < w.length && w[n] === words[0]![n])) n++;
  const endsAtSeparator = (w: readonly string[], at: number) =>
    at === w.length || w[at - 1]!.endsWith(',') || /^[—–-]$/.test(w[at]!) || w[at]!.startsWith('(');
  for (; n > 0; n--) {
    if (/^[—–-]$/.test(words[0]![n - 1]!)) continue;
    if (words.every((w) => endsAtSeparator(w, n))) return words[0]!.slice(0, n).join(' ').replace(/,$/, '');
  }
  return undefined;
}

function itemGrantor(
  G: GrantIndex,
  gear: ReadonlySet<Guid>,
  data: Pick<CheckedData, 'blueprints'>,
  fact: Guid,
): CommonName | undefined {
  const isItem = (guid: Guid) => kindOf[data.blueprints.get(guid)!.$type] === 'items';
  const items = G.climb(fact, isItem, gear).filter((c) => isItem(c.grantor));
  return commonOf(items.map((c) => ({ name: shownName(data, c.grantor), level: c.level })));
}

function ancestorFinder(G: GrantIndex, data: Pick<CheckedData, 'blueprints'>): (fact: Guid) => readonly Ancestor[] {
  const nameOf = (guid: Guid) => shownName(data, guid);
  const isRoot = (guid: Guid) => data.blueprints.get(guid)?.$type === 'BlueprintRoot';
  const onEveryRoute = (fact: Guid, name: string) =>
    !G.climb(fact, (g) => nameOf(g) === name).some((c) => isRoot(c.grantor));
  const memo = new Map<Guid, Ancestor[]>();
  return (fact) => {
    let out = memo.get(fact);
    if (out !== undefined) return out;
    const holds = new Map<string, boolean>();
    out = G.climb(fact, () => false)
      .filter((a) => nameOf(a.grantor) !== undefined)
      .map(({ grantor, depth, level }) => {
        const name = nameOf(grantor)!;
        if (!holds.has(name)) holds.set(name, onEveryRoute(fact, name));
        return { guid: grantor, depth, level, everyRoute: holds.get(name)! };
      });
    memo.set(fact, out);
    return out;
  };
}

function requiredNames(blueprint: Blueprint, data: Pick<CheckedData, 'blueprints'>): string[] {
  const out: string[] = [];
  for (const leaf of prerequisites(blueprint, data.blueprints)) {
    if (leaf.polarity !== 'requires') continue;
    for (const { guid, level } of namedWithLevel(leaf)) {
      const name = shownName(data, guid);
      if (name === undefined) continue;
      out.push(name);
      if (level !== undefined) out.push(`${name} ${level}`);
    }
  }
  return out;
}
