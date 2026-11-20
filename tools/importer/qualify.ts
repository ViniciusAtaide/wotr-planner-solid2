// Shared names (ADR 0006 as amended, map tickets 27, 29 and 30, build tickets 02c and 02f): where blueprints a Build
// can reach and a player sees share a display name, each is qualified, blueprint by blueprint, from the first source
// that tells it apart:
//   0. a feature only Gear gives takes the item that gives it (map ticket 29): "Poison Immunity (Broken Trickster)";
//   1. its nearest named grantor that tells it apart, climbing past names the others share: "Arcanist (Wizard
//      Spell)". Only a name that every route from the root to it passes through counts, so the qualifier holds for
//      the blueprint itself;
//   2. such a grantor and the level it grants at: "Patron Spells (Winter 2)", or "Ki Arrows (level 5)" when the
//      grantor shares the name;
//   3. its kind: a class keeps its plain name beside picks named after it, and another blueprint takes a word for its
//      type ("Outflank (buff)");
//   4. a prerequisite it requires that the others don't ("Skeletal Barbarian I (Lich 2)");
//   then map ticket 30's two, for a blueprint several grantors give:
//   5. a class's own copy stays bare beside its archetypes' copies ("Favored Enemy"), and a copy only that class and
//      its archetypes give takes the class;
//   6. grantors of one family give their common name ("Resist Energy (Draconic Bloodline)");
//   and last
//   7. a `"change": "name"` override, our own words with its reason.
// After any source settles some, the rest start again from the first. One blueprint in a group stays bare when every
// other label is distinct. No label names one grantor among several. Hidden blueprints are never shown (`isShown`),
// so they join no group and, like nameless ones, name no qualifier. Grantors come from G and prerequisites from P, so
// a qualifier names only what the engine itself reads; qualifiers are names and our own words, never other game text.
// Items a Build equips are named by gear-names.ts.
import type { CheckedData } from '~engine/data/load';
import { isShown, kindOf, type Blueprint, type Guid, type Override } from '~engine/data/types';
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

/** What can settle a blueprint's name in its group, in map ticket 27's order; `bare` keeps the plain name. */
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
  /** What settled it, or `undefined` while it is open. */
  readonly source: NameSource | undefined;
  /** The qualifier written after the name, for every source but `bare`. */
  readonly qualifier: string | undefined;
}

/** Blueprints a Build can reach that share one display name. */
export interface NameGroup {
  readonly name: string;
  readonly members: readonly GroupMember[];
}

export interface Qualified {
  /** Every group, by name. */
  readonly groups: readonly NameGroup[];
  /** The written name of every qualified blueprint: `<name> (<qualifier>)`. */
  readonly names: ReadonlyMap<Guid, string>;
  /** Written names that blueprints a player sees still share, by name: each must be a listed exception. */
  readonly collisions: ReadonlyMap<string, readonly Guid[]>;
  /** Name overrides that don't apply where steps 1–4 fail, or that collide. */
  readonly problems: readonly string[];
}

/**
 * The common name a set of grantors share, with the level they grant at when every one grants at the same level:
 * source 0's items and source 6's family.
 */
interface CommonName {
  readonly name: string;
  readonly level: number | undefined;
}

interface Ancestor {
  readonly guid: Guid;
  /** Grant steps up from the blueprint. */
  readonly depth: number;
  /** The nearest grant level on the path, when one carries a level. */
  readonly level: number | undefined;
  /** Whether every route from the root to the blueprint passes through a grantor of this name. */
  readonly everyRoute: boolean;
}

/**
 * Qualifies every display name that blueprints a Build can reach and a player sees (`isShown`) share. `overrides` are
 * data/overrides/'s, of which only the `name` ones are read.
 */
export function qualifyNames(data: Pick<CheckedData, 'blueprints'>, overrides: readonly Override[]): Qualified {
  const bp = (guid: Guid) => data.blueprints.get(guid)!;
  const G = buildGrantIndex(data);
  const reach = reachableFromRoot(data, G);
  // Features only Gear gives (map ticket 29, as amended by ticket 02e) share names with features the root gives, so a
  // sheet or search shows them side by side: they join the groups, qualified by their item.
  const gear = reachableFromGear(data, G);
  const gearOnly = new Set([...gear].filter((g) => !reach.has(g) && kindOf[bp(g).$type] !== 'items'));
  const shown = [...reach, ...gearOnly].filter((g) => bp(g).$type !== 'BlueprintRoot' && isShown(bp(g)));
  // Items' name overrides are Gear's (gear-names.ts).
  const { byTarget: nameOverrides, repeated } = nameOverridesOf(overrides, data, false);
  const problems = repeated.map((g) => `${bp(g).assetName} ${g}: more than one name override`);

  const finders: Finders = {
    ancestorsOf: ancestorFinder(G, data),
    routesOf: routeFinder(G, reach, data),
    familyOf: (fact, name) => family(G, data, fact, name),
    archetypeClass: (archetype) => G.grantorsOf(archetype).find((g) => g.kind === 'classArchetype')?.grantor,
    itemOf: (fact) => (gearOnly.has(fact) ? itemGrantor(G, gear, data, fact) : undefined),
  };
  /** Name overrides already settled or refused. */
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

/** One group's labels from sources 0–6 (map tickets 27, 29 and 30), each a step; overrides and the bare name follow. */
function settleGroup(group: Group<NameSource>, finders: Finders, data: Pick<CheckedData, 'blueprints'>): void {
  const { name } = group;
  const bp = (guid: Guid) => data.blueprints.get(guid)!;
  const nameOf = (guid: Guid) => bp(guid).name!;
  const near = (entries: Iterable<readonly [string, number]>) => nearest(name, entries);
  const onRoute = (m: Guid) => finders.ancestorsOf(m).filter((a) => a.everyRoute);
  runSteps(group, [
    // 0: a feature only Gear gives takes the items that give it.
    () => candidatePass(group, 'item', (m) => near(withLevel(finders.itemOf(m)))),
    // 1: its nearest named grantor that every route passes through.
    () => candidatePass(group, 'grantor', (m) => near(onRoute(m).map((a) => [nameOf(a.guid), a.depth]))),
    // 2: such a grantor and the level it grants at.
    () =>
      candidatePass(group, 'level', (m) =>
        near(
          onRoute(m)
            .filter((a) => a.level !== undefined)
            .map((a) => [nameOf(a.guid) === name ? `level ${a.level}` : `${nameOf(a.guid)} ${a.level}`, a.depth]),
        ),
      ),
    // 3: its kind, a class keeping its plain name.
    () => {
      classStaysBare(group, bp);
      return candidatePass(group, 'kind', (m) => near([[kindWords[bp(m).$type], 0]]));
    },
    // 4: a prerequisite it requires that the others don't.
    () => candidatePass(group, 'prerequisite', (m) => near(requiredNames(bp(m), data).map((n) => [n, 0]))),
    // 5: a class's own copy, or the class or archetypes that alone give it.
    () => classStep(group, finders, nameOf),
    // 6: the common name of its grantors' family.
    () => candidatePass(group, 'family', (m) => near(withLevel(finders.familyOf(m, name)))),
  ]);
}

/** A source's qualifiers, each at its nearest, leaving out the group's own name. */
function nearest(name: string, entries: Iterable<readonly [string, number]>): Candidates {
  const out = new Map<string, number>();
  for (const [q, d] of entries) if (q !== name && !((out.get(q) ?? Infinity) <= d)) out.set(q, d);
  return out;
}

/** A common name as candidates: the name, then the name with its level. */
function withLevel(common: CommonName | undefined): [string, number][] {
  if (common === undefined) return [];
  return common.level === undefined
    ? [[common.name, 0]]
    : [
        [common.name, 0],
        [`${common.name} ${common.level}`, 1],
      ];
}

/** Source 3's first part: a class keeps its plain name beside picks named after it. */
function classStaysBare(group: Group<NameSource>, bp: (guid: Guid) => Blueprint): void {
  if (hasBare(group)) return;
  const classes = group.left.filter((m) => bp(m).$type === 'BlueprintCharacterClass');
  if (classes.length === 1) settle(group, classes[0]!, { source: 'kind', qualifier: undefined });
}

/**
 * Source 5 (map ticket 30): a class's own copy stays bare beside its archetypes' copies. A copy one class's
 * progression grants, which archetypes add too, is that class's own; where one class has such copies, its earliest
 * keeps the plain name. A copy that only one class and that class's archetypes give takes the class, and its level
 * when the class has several ("Favored Terrain (Ranger 8)"). A copy only archetypes give takes the archetype, or the
 * family name of several.
 */
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
    /** Only the class and its own archetypes give it, so the class names it truly. */
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
  /** Each class whose own progression grants the blueprint, through selections, with the levels it does. */
  readonly classes: ReadonlyMap<Guid, readonly number[]>;
  /** The archetypes that add it, through selections. */
  readonly archetypes: ReadonlySet<Guid>;
  /** Whether anything else grants it: a feature, a feat selection, a Mythic path… */
  readonly other: boolean;
}

interface Finders {
  readonly ancestorsOf: (fact: Guid) => readonly Ancestor[];
  readonly routesOf: (fact: Guid) => Routes;
  /** For a feature only Gear gives: the common name of the items that give it, with their level when they share one. */
  readonly itemOf: (fact: Guid) => CommonName | undefined;
  /** The class an archetype belongs to. */
  readonly archetypeClass: (archetype: Guid) => Guid | undefined;
  /** Source 6: the common name of a fact's nearest shown grantors, with their level when they share one. */
  readonly familyOf: (fact: Guid, name: string) => CommonName | undefined;
}

/**
 * Where a fact's grants come from (source 5), through the feature selections it is an option of, which G's climb
 * climbs through: a class's progression (`levelEntry`), an archetype (`archetypeAdd`), or anything else.
 */
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

/**
 * Source 6 (map ticket 30): a fact's nearest shown grantors, climbing past those that share its own name, when their
 * names share leading words: that common name, cut before a trailing separator, and the level when every one grants
 * at the same level. Every route passes through one of them, so the common name holds for the fact.
 */
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

/**
 * Grantors' common name (`commonName`) among those that have a name, with the level they grant at when every one
 * grants at the same level.
 */
function commonOf(
  grantors: readonly { readonly name: string | undefined; readonly level: number | undefined }[],
): CommonName | undefined {
  const name = commonName(grantors.map((g) => g.name).filter((n): n is string => n !== undefined));
  if (name === undefined) return undefined;
  const levels = new Set(grantors.map((g) => g.level));
  return { name, level: levels.size === 1 ? [...levels][0] : undefined };
}

/**
 * The leading words a set of names share, when in every name they are the whole name or end at a separator (a dash,
 * a comma or an opening parenthesis): "Draconic Bloodline" from "Draconic Bloodline — Black" and "— Blue", but nothing
 * from "Second Mystery" and "Second Curse".
 */
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

/**
 * For a feature only Gear gives (map ticket 29): the items whose enchantments give it, climbing through what Gear
 * reaches, by their common name, and the level when every grant on the way carries the same one.
 */
function itemGrantor(
  G: GrantIndex,
  gear: ReadonlySet<Guid>,
  data: Pick<CheckedData, 'blueprints'>,
  fact: Guid,
): CommonName | undefined {
  // A Gear-only feature's grantors (its enchantment, its item) are reached only from the Gear (`reachableFromGear`).
  const isItem = (guid: Guid) => kindOf[data.blueprints.get(guid)!.$type] === 'items';
  const items = G.climb(fact, isItem, gear).filter((c) => isItem(c.grantor));
  return commonOf(items.map((c) => ({ name: shownName(data, c.grantor), level: c.level })));
}

/**
 * The shown grantors a Build can reach above a fact, nearest first: G's climb through every reachable grantor, each
 * with the nearest grant level on its path. A grantor that isn't shown is climbed through and never names anything.
 * Only a name that every route from the root to the fact passes through counts, so a qualifier holds for the
 * blueprint itself: a feature every draconic bloodline grants isn't qualified by one of them.
 */
function ancestorFinder(G: GrantIndex, data: Pick<CheckedData, 'blueprints'>): (fact: Guid) => readonly Ancestor[] {
  const nameOf = (guid: Guid) => shownName(data, guid);
  const isRoot = (guid: Guid) => data.blueprints.get(guid)?.$type === 'BlueprintRoot';
  /** Whether every route from the root to `fact` passes through a grantor named `name`: G's climb, stopping at them. */
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

/**
 * What a blueprint's requiring prerequisites name, where a player sees it (P's `namedWithLevel`): each fact, class and
 * archetype by its name, and one needed at a level with the level as well ("Lich 2").
 */
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
