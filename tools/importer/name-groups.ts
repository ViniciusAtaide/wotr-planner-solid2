// What qualify.ts (blueprints a Build reaches) and gear-names.ts (items a Build equips) share: a group of blueprints
// with one display name, settled source by source (map tickets 27 and 29), name overrides last, then one left over
// bare; and the written names blueprints still share afterwards.
import type { CheckedData } from '~engine/data/load';
import { isShown, kindOf, type Blueprint, type Guid, type Override } from '~engine/data/types';
import { byName } from '~engine/util';

/** A `"change": "name"` override. */
export type NameOverride = Extract<Override, { change: 'name' }>;

/** A source's qualifiers for one blueprint, each with how near it is (lower is nearer). */
export type Candidates = ReadonlyMap<string, number>;

/** How a blueprint's name was settled: by which source, with which qualifier (none for a bare name). */
export interface Settled<S extends string> {
  readonly source: S | 'override' | 'bare';
  readonly qualifier: string | undefined;
  /** For a Gear twin: the item the pickers offer in its place. */
  readonly twinOf?: Guid;
}

/** One group while it is settled: the blueprints left open, and the settled ones. */
export interface Group<S extends string> {
  readonly name: string;
  left: Guid[];
  readonly settled: Map<Guid, Settled<S>>;
}

export function openGroup<S extends string>(name: string, guids: readonly Guid[]): Group<S> {
  return { name, left: [...guids], settled: new Map() };
}

/** Whether a settled member keeps the bare name: no qualifier, and not a twin. */
export function hasBare<S extends string>(group: Group<S>): boolean {
  return [...group.settled.values()].some((s) => s.qualifier === undefined && s.twinOf === undefined);
}

/** A group member as the name sources settled it. */
export interface Member<S extends string> {
  readonly guid: Guid;
  /** What settled it, or `undefined` while it is open. */
  readonly source: Settled<S>['source'] | undefined;
  /** The qualifier written after the name; for a twin, the one it collapses into has it. */
  readonly qualifier: string | undefined;
  /** For a Gear twin: the item the pickers offer in its place. */
  readonly twinOf?: Guid;
}

/** Settles `guid` and takes it out of those left. */
export function settle<S extends string>(group: Group<S>, guid: Guid, settled: Settled<S>): void {
  group.settled.set(guid, settled);
  group.left = group.left.filter((g) => g !== guid);
}

/** The qualifiers already taken in the group (`undefined` for a bare name). */
export function usedQualifiers<S extends string>(group: Group<S>): Set<string | undefined> {
  return new Set([...group.settled.values()].map((s) => s.qualifier));
}

/**
 * One source's pass over the blueprints left: each takes its nearest qualifier that no other blueprint left has as
 * near and the group hasn't taken, so two never take the same one. Returns whether it settled any.
 */
export function candidatePass<S extends string>(
  group: Group<S>,
  source: S,
  candidatesOf: (guid: Guid) => Candidates,
): boolean {
  const candidates = new Map(group.left.map((m) => [m, candidatesOf(m)]));
  const used = usedQualifiers(group);
  const found = new Map<Guid, string>();
  for (const m of group.left) {
    const hit = [...candidates.get(m)!]
      .sort(([qa, da], [qb, db]) => da - db || compare(qa, qb))
      .find(
        ([q, d]) => !used.has(q) && group.left.every((o) => o === m || (candidates.get(o)!.get(q) ?? Infinity) > d),
      );
    if (hit !== undefined) found.set(m, hit[0]);
  }
  for (const [m, qualifier] of found) settle(group, m, { source, qualifier });
  return found.size > 0;
}

/** A single qualifier, or none, as candidates. */
export function only(qualifier: string | undefined): Candidates {
  return qualifier === undefined ? new Map() : new Map([[qualifier, 0]]);
}

/**
 * Runs the steps in order until none settles any or one blueprint is left. Once a step settles some, the rest start
 * again from the first: a settled blueprint no longer stands in the way of a nearer qualifier it shared with them.
 */
export function runSteps<S extends string>(group: Group<S>, steps: readonly (() => boolean)[]): void {
  for (let progress = true; progress && group.left.length > 1;) {
    progress = steps.some((step) => group.left.length > 1 && step());
  }
}

/**
 * The last source: the name overrides of the blueprints the steps leave, where more than one is left or one already
 * keeps the bare name. Each override met is added to `consumed`, applied or refused; a refused one is a problem.
 */
export function overridePass<S extends string>(
  group: Group<S>,
  nameOverrides: ReadonlyMap<Guid, NameOverride>,
  consumed: Set<Guid>,
  problem: (guid: Guid, problem: string) => void,
): void {
  if (group.left.length <= 1 && !hasBare(group)) return;
  const used = usedQualifiers(group);
  for (const m of group.left) {
    const o = nameOverrides.get(m);
    if (o === undefined) continue;
    consumed.add(m);
    if (used.has(o.qualifier)) {
      problem(m, `its name override's qualifier "${o.qualifier}" is taken in its group`);
      continue;
    }
    used.add(o.qualifier);
    settle(group, m, { source: 'override', qualifier: o.qualifier });
  }
}

/** One blueprint left over keeps the plain name, when none does yet. */
export function lastBare<S extends string>(group: Group<S>): void {
  if (group.left.length === 1 && !hasBare(group))
    settle(group, group.left[0]!, { source: 'bare', qualifier: undefined });
}

/** Each name override no group used: the source that settled its target instead, or that nothing shares its name. */
export function unusedOverrideProblems(
  nameOverrides: ReadonlyMap<Guid, NameOverride>,
  consumed: ReadonlySet<Guid>,
  groups: readonly { readonly members: readonly { readonly guid: Guid; readonly source: string | undefined }[] }[],
  data: Pick<CheckedData, 'blueprints'>,
  nothingShares: string,
): string[] {
  const problems: string[] = [];
  const members = new Map<Guid, { readonly source: string | undefined }>();
  for (const g of groups) for (const m of g.members) if (!members.has(m.guid)) members.set(m.guid, m);
  for (const target of nameOverrides.keys()) {
    const bp = data.blueprints.get(target);
    if (consumed.has(target) || bp === undefined) continue;
    const member = members.get(target);
    problems.push(
      `${bp.assetName} ${target}: a name override, but ${
        member === undefined ? nothingShares : `${member.source} settles it`
      }; remove it`,
    );
  }
  return problems;
}

/**
 * The `"change": "name"` overrides of items (`items`, Gear's) or of every other blueprint, by target, and the targets
 * named by more than one.
 */
export function nameOverridesOf(
  overrides: readonly Override[],
  data: Pick<CheckedData, 'blueprints'>,
  items: boolean,
): { readonly byTarget: ReadonlyMap<Guid, NameOverride>; readonly repeated: readonly Guid[] } {
  const byTarget = new Map<Guid, NameOverride>();
  const repeated: Guid[] = [];
  for (const o of overrides) {
    if (
      o.change !== 'name' ||
      (kindOf[data.blueprints.get(o.target)?.$type as Blueprint['$type']] === 'items') !== items
    )
      continue;
    if (byTarget.has(o.target)) repeated.push(o.target);
    byTarget.set(o.target, o);
  }
  return { byTarget, repeated };
}

/**
 * Qualifies the names `guids` share: each name more than one has is a group, in name order, its members in `order`.
 * `steps` settles a group from its sources; the name overrides then settle what is left, one left over keeps the bare
 * name, and `last` runs. Returns the groups with their members, and the written name of each qualified blueprint (a
 * twin's is the name of the item it collapses into).
 */
export function qualifyGroups<S extends string>(opts: {
  readonly guids: Iterable<Guid>;
  readonly bp: (guid: Guid) => Blueprint;
  readonly order: (a: Guid, b: Guid) => number;
  readonly steps: (group: Group<S>) => void;
  readonly nameOverrides: ReadonlyMap<Guid, NameOverride>;
  readonly consumed: Set<Guid>;
  readonly problems: string[];
  readonly last?: (group: Group<S>) => void;
}): {
  readonly groups: { readonly name: string; readonly members: readonly Member<S>[] }[];
  readonly names: Map<Guid, string>;
} {
  const { bp } = opts;
  const groups: { readonly name: string; readonly members: readonly Member<S>[] }[] = [];
  const names = new Map<Guid, string>();
  for (const [name, all] of [...byName(opts.guids, (g) => bp(g).name)].sort(([a], [b]) => compare(a, b))) {
    if (all.length < 2) continue;
    all.sort(opts.order);
    const group = openGroup<S>(name, all);
    opts.steps(group);
    overridePass(group, opts.nameOverrides, opts.consumed, (g, p) =>
      opts.problems.push(`${bp(g).assetName} ${g}: ${p}`),
    );
    lastBare(group);
    opts.last?.(group);
    for (const [g, s] of group.settled) {
      if (s.twinOf === undefined && s.qualifier !== undefined) names.set(g, `${name} (${s.qualifier})`);
    }
    // A twin is written with the name of the item it collapses into.
    for (const [g, s] of group.settled)
      if (s.twinOf !== undefined && names.has(s.twinOf)) names.set(g, names.get(s.twinOf)!);
    groups.push({
      name,
      members: all.map((guid) => ({
        guid,
        ...(group.settled.get(guid) ?? { source: undefined, qualifier: undefined }),
      })),
    });
  }
  return { groups, names };
}

/** The word for a blueprint's kind (qualify.ts's source 3; for an item, Gear's slot word), in our own words. */
export const kindWords: { readonly [K in Blueprint['$type']]: string } = {
  BlueprintRoot: 'root',
  BlueprintCharacterClass: 'class',
  BlueprintArchetype: 'archetype',
  BlueprintProgression: 'progression',
  BlueprintFeatureSelection: 'selection',
  BlueprintFeatureSelectMythicSpellbook: 'selection',
  BlueprintFeature: 'feature',
  BlueprintParametrizedFeature: 'feature',
  BlueprintFeatureReplaceSpellbook: 'spellbook',
  BlueprintRace: 'race',
  BlueprintBuff: 'buff',
  BlueprintAbility: 'ability',
  BlueprintActivatableAbility: 'toggle',
  BlueprintUnit: 'unit',
  BlueprintStatProgression: 'table',
  BlueprintSpellsTable: 'table',
  BlueprintSpellbook: 'spellbook',
  BlueprintMythicsSettings: 'settings',
  BlueprintItemWeapon: 'weapon',
  BlueprintItemArmor: 'armor',
  BlueprintItemShield: 'shield',
  BlueprintItemEquipmentBelt: 'belt',
  BlueprintItemEquipmentFeet: 'feet',
  BlueprintItemEquipmentGlasses: 'glasses',
  BlueprintItemEquipmentGloves: 'gloves',
  BlueprintItemEquipmentHead: 'head',
  BlueprintItemEquipmentNeck: 'neck',
  BlueprintItemEquipmentRing: 'ring',
  BlueprintItemEquipmentShirt: 'shirt',
  BlueprintItemEquipmentShoulders: 'shoulders',
  BlueprintItemEquipmentWrist: 'wrist',
  BlueprintWeaponType: 'weapon type',
  BlueprintArmorType: 'armor type',
  BlueprintShieldType: 'shield type',
  BlueprintEquipmentEnchantment: 'enchantment',
  BlueprintWeaponEnchantment: 'enchantment',
  BlueprintArmorEnchantment: 'enchantment',
};

/** The written names that more than one of `guids` still has, by name. */
export function collisionsOf(guids: Iterable<Guid>, written: (guid: Guid) => string): Map<string, readonly Guid[]> {
  return new Map([...byName(guids, written)].filter(([, g]) => g.length > 1).sort(([a], [b]) => compare(a, b)));
}

/** A blueprint's name where a player sees it (`isShown`); a nameless or hidden blueprint has none to give. */
export function shownName(data: Pick<CheckedData, 'blueprints'>, guid: Guid): string | undefined {
  const bp = data.blueprints.get(guid);
  return bp !== undefined && isShown(bp) ? bp.name : undefined;
}

export function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
