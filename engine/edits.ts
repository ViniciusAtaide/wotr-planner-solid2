// E, edits (guide §4; map 11, "Cascade edits"; build ticket 04): every change to a Build goes through `apply`, and
// `allows` or `cascade` decides whether it keeps the Build possible. After an edit the walk re-judges the whole
// Build; what the edit breaks is every choice the walk now refuses that it accepted before. A plain edit that breaks
// anything is refused, naming what it breaks. A Cascade edit clears the broken picks, and the picks that clearing
// breaks in turn, and never moves one to another slot. Undo is going back to the earlier Build code.
import {
  placeKey,
  slotKey,
  withPick,
  type Alignment,
  type Build,
  type GearPlace,
  type Pick,
  type SlotId,
} from './build';
import type { CheckedData } from './data/load';
import type { Attribute, Guid, StatType } from './data/types';
import { buildGrantIndex, type GrantIndex, type GrantParam } from './grants';
import { walk, type Failure } from './walk/walk';

/** One change to a Build. */
export type Edit =
  /** A character level's class (1-based). */
  | { readonly kind: 'class'; readonly level: number; readonly class: Guid }
  | { readonly kind: 'scores'; readonly scores: Readonly<Record<Attribute, number>> }
  | { readonly kind: 'race'; readonly race: Guid | undefined; readonly raceStat?: Attribute }
  /** A class's archetypes (its Class choice). */
  | { readonly kind: 'archetypes'; readonly class: Guid; readonly archetypes: readonly Guid[] }
  | { readonly kind: 'alignment'; readonly alignment: Alignment | undefined }
  /** A slot's pick, or none to clear it. */
  | {
      readonly kind: 'pick';
      readonly slot: SlotId;
      readonly pick?: { readonly feature: Guid; readonly param?: GrantParam };
    }
  /** The item in one Gear place, or none to take it off. */
  | { readonly kind: 'gear'; readonly place: GearPlace; readonly item?: Guid }
  /** A Mythic rank's Rank level (ADR 0003), 1-based. */
  | { readonly kind: 'rankLevel'; readonly rank: number; readonly level: number }
  /** One more character level, of a class. */
  | { readonly kind: 'addLevel'; readonly class: Guid }
  /** One more Mythic rank, of a Mythic class, at a Rank level. */
  | { readonly kind: 'addRank'; readonly class: Guid; readonly level: number }
  /** A character level's skill ranks (1-based), replacing that level's. */
  | { readonly kind: 'skills'; readonly level: number; readonly skills: Readonly<Partial<Record<StatType, number>>> }
  /** A character level's ability increase (1-based), or none. */
  | { readonly kind: 'increase'; readonly level: number; readonly increase?: Attribute }
  /** The ability that takes the race's +2, or none. */
  | { readonly kind: 'raceStat'; readonly raceStat?: Attribute };

/** The Build with the edit made. Nothing is judged here. */
export function apply(build: Build, edit: Edit): Build {
  switch (edit.kind) {
    case 'class':
      return {
        ...build,
        levels: build.levels.map((l, i) => (i === edit.level - 1 ? { ...l, class: edit.class } : l)),
      };
    case 'scores':
      return { ...build, scores: edit.scores };
    case 'race': {
      const { race: _race, raceStat: _stat, ...rest } = build;
      return {
        ...rest,
        ...(edit.race !== undefined && { race: edit.race }),
        ...(edit.raceStat !== undefined && { raceStat: edit.raceStat }),
      };
    }
    case 'archetypes':
      return { ...build, classChoices: { ...build.classChoices, [edit.class]: { archetypes: edit.archetypes } } };
    case 'alignment': {
      const { alignment: _alignment, ...rest } = build;
      return edit.alignment === undefined ? rest : { ...rest, alignment: edit.alignment };
    }
    case 'pick':
      return edit.pick === undefined
        ? clearPicks(build, [edit.slot])
        : withPick(build, { slot: edit.slot, ...edit.pick });
    case 'gear': {
      const { [edit.place]: _held, ...gear } = build.gear ?? {};
      return { ...build, gear: edit.item === undefined ? gear : { ...gear, [edit.place]: edit.item } };
    }
    case 'rankLevel':
      return {
        ...build,
        ranks: (build.ranks ?? []).map((r, i) => (i === edit.rank - 1 ? { ...r, level: edit.level } : r)),
      };
    case 'addLevel':
      return { ...build, levels: [...build.levels, { class: edit.class }] };
    case 'addRank':
      return { ...build, ranks: [...(build.ranks ?? []), { class: edit.class, level: edit.level }] };
    case 'skills':
      return {
        ...build,
        levels: build.levels.map((l, i) => {
          if (i !== edit.level - 1) return l;
          const { skills: _skills, ...rest } = l;
          return Object.keys(edit.skills).length === 0 ? rest : { ...rest, skills: edit.skills };
        }),
      };
    case 'increase':
      return {
        ...build,
        levels: build.levels.map((l, i) => {
          if (i !== edit.level - 1) return l;
          const { increase: _increase, ...rest } = l;
          return edit.increase === undefined ? rest : { ...rest, increase: edit.increase };
        }),
      };
    case 'raceStat': {
      const { raceStat: _stat, ...rest } = build;
      return edit.raceStat === undefined ? rest : { ...rest, raceStat: edit.raceStat };
    }
  }
}

/** The Build without the picks in these slots. */
export function clearPicks(build: Build, slots: readonly SlotId[]): Build {
  const cleared = new Set(slots.map(slotKey));
  return { ...build, picks: build.picks.filter((p) => !cleared.has(slotKey(p.slot))) };
}

/** A walk's refusals, each keyed by what it refuses, so two walks can be compared. */
function refusals(data: CheckedData, build: Build, G: GrantIndex): Map<string, Failure> {
  const out = new Map<string, Failure>();
  for (const f of walk(data, build, G).failures) {
    const key =
      f.slot === undefined ? `${placeKey(f.place)} ${f.choice} ${f.subject ?? ''}` : `pick ${slotKey(f.slot)}`;
    if (!out.has(key)) out.set(key, f);
  }
  return out;
}

/** What an edit breaks: the picks, and any other choice, the walk refuses after it and accepted before. */
export interface Breaks {
  /** The picks it breaks, in the Build's order. */
  readonly picks: readonly Pick[];
  /** The other choices it breaks (a class, an archetype, Gear…), each with its refusal. */
  readonly others: readonly Failure[];
}

/** What `after` breaks of `before`. */
export function breaksOf(
  data: CheckedData,
  before: Build,
  after: Build,
  G: GrantIndex = buildGrantIndex(data),
): Breaks {
  const was = refusals(data, before, G);
  const now = refusals(data, after, G);
  const fresh = [...now].filter(([key]) => !was.has(key)).map(([, f]) => f);
  const pickSlots = new Set(fresh.filter((f) => f.slot !== undefined).map((f) => slotKey(f.slot as SlotId)));
  return {
    picks: after.picks.filter((p) => pickSlots.has(slotKey(p.slot))),
    others: fresh.filter((f) => f.slot === undefined),
  };
}

/** A plain edit's verdict: allowed, or refused with what it breaks. */
export type Verdict = { readonly ok: true; readonly build: Build } | ({ readonly ok: false } & Breaks);

/** Whether a plain edit keeps the Build possible: it breaks nothing the Build had right. */
export function allows(data: CheckedData, build: Build, edit: Edit, G: GrantIndex = buildGrantIndex(data)): Verdict {
  const after = apply(build, edit);
  const broken = breaksOf(data, build, after, G);
  return broken.picks.length === 0 && broken.others.length === 0
    ? { ok: true, build: after }
    : { ok: false, ...broken };
}

/**
 * A Cascade edit: the edit, then every pick it breaks cleared, and every pick that clearing breaks, until nothing more
 * breaks. `cleared` is the preview, in the order the picks were cleared; `build` is what the Cascade leaves. It is
 * refused, with what it breaks, when the edit breaks a choice clearing picks can't mend: the edited pick itself, or a
 * class, archetype, Gear or other choice.
 */
export type Cascade =
  | { readonly ok: true; readonly cleared: readonly Pick[]; readonly build: Build }
  | ({ readonly ok: false } & Breaks);

export function cascade(data: CheckedData, build: Build, edit: Edit, G: GrantIndex = buildGrantIndex(data)): Cascade {
  let after = apply(build, edit);
  const cleared: Pick[] = [];
  for (;;) {
    const broken = breaksOf(data, build, after, G);
    const edited = edit.kind === 'pick' ? broken.picks.find((p) => slotKey(p.slot) === slotKey(edit.slot)) : undefined;
    if (broken.others.length > 0 || edited !== undefined) return { ok: false, ...broken };
    if (broken.picks.length === 0) return { ok: true, cleared, build: after };
    cleared.push(...broken.picks);
    after = clearPicks(
      after,
      broken.picks.map((p) => p.slot),
    );
  }
}
