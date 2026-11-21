import {
  placeKey,
  slotKey,
  withPick,
  type AbilityScores,
  type Alignment,
  type Archetypes,
  type Build,
  type GearPlace,
  type Pick,
  type RankLevel,
  type SkillRanks,
  type SlotId,
} from '../build';
import type { CheckedData } from '../load';
import type { Attribute, Guid } from '../data';
import { buildGrantIndex, type GrantIndex, type GrantParam } from '../grants';
import { walk, type Failure } from '../walk';

export type Edit =
  | { readonly kind: 'class'; readonly level: number; readonly class: Guid }
  | { readonly kind: 'scores'; readonly scores: AbilityScores }
  | { readonly kind: 'race'; readonly race: Guid | undefined; readonly raceStat?: Attribute | undefined }
  | { readonly kind: 'archetypes'; readonly class: Guid; readonly archetypes: Archetypes }
  | { readonly kind: 'alignment'; readonly alignment: Alignment | undefined }
  | {
      readonly kind: 'pick';
      readonly slot: SlotId;
      readonly pick?: { readonly feature: Guid; readonly param?: GrantParam };
    }
  | { readonly kind: 'gear'; readonly place: GearPlace; readonly item?: Guid }
  | { readonly kind: 'rankLevel'; readonly rank: number; readonly level: RankLevel }
  | { readonly kind: 'addLevel'; readonly class: Guid }
  | { readonly kind: 'addRank'; readonly class: Guid; readonly level: RankLevel }
  | { readonly kind: 'skills'; readonly level: number; readonly skills: SkillRanks }
  | { readonly kind: 'increase'; readonly level: number; readonly increase?: Attribute }
  | { readonly kind: 'raceStat'; readonly raceStat?: Attribute }
  | { readonly kind: 'dropLevel' }
  | { readonly kind: 'dropRank' }
  | { readonly kind: 'rankClass'; readonly rank: number; readonly class: Guid }
  | { readonly kind: 'countGear'; readonly on: boolean };

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
    case 'dropLevel':
      return { ...build, levels: build.levels.slice(0, -1) };
    case 'dropRank':
      return { ...build, ranks: (build.ranks ?? []).slice(0, -1) };
    case 'rankClass':
      return {
        ...build,
        ranks: (build.ranks ?? []).map((r, i) => (i === edit.rank - 1 ? { ...r, class: edit.class } : r)),
      };
    case 'countGear': {
      const { countGear: _count, ...rest } = build;
      return edit.on ? { ...rest, countGear: true } : rest;
    }
  }
}

export function clearPicks(build: Build, slots: readonly SlotId[]): Build {
  const cleared = new Set(slots.map(slotKey));
  return { ...build, picks: build.picks.filter((p) => !cleared.has(slotKey(p.slot))) };
}

const PLACELESS: ReadonlySet<Failure['choice']> = new Set(['gear', 'aspect']);

function keyedRefusals(data: CheckedData, build: Build, G: GrantIndex): Map<string, Failure> {
  const out = new Map<string, Failure>();
  for (const f of walk(data, build, G).failures) {
    const key =
      f.slot !== undefined
        ? `pick ${slotKey(f.slot)}`
        : PLACELESS.has(f.choice)
          ? `${f.choice} ${f.subject ?? ''}`
          : `${placeKey(f.place)} ${f.choice} ${f.subject ?? ''}`;
    if (!out.has(key)) out.set(key, f);
  }
  return out;
}

export interface Breaks {
  readonly picks: readonly Pick[];
  readonly others: readonly Failure[];
}

export function breaksOf(
  data: CheckedData,
  before: Build,
  after: Build,
  G: GrantIndex = buildGrantIndex(data),
): Breaks {
  const was = keyedRefusals(data, before, G);
  const now = keyedRefusals(data, after, G);
  const fresh = [...now].filter(([key]) => !was.has(key)).map(([, f]) => f);
  const pickSlots = new Set(fresh.filter((f) => f.slot !== undefined).map((f) => slotKey(f.slot as SlotId)));
  return {
    picks: after.picks.filter((p) => pickSlots.has(slotKey(p.slot))),
    others: fresh.filter((f) => f.slot === undefined),
  };
}

export type Verdict = { readonly ok: true; readonly build: Build } | ({ readonly ok: false } & Breaks);

export function allows(data: CheckedData, build: Build, edit: Edit, G: GrantIndex = buildGrantIndex(data)): Verdict {
  const after = apply(build, edit);
  const broken = breaksOf(data, build, after, G);
  return broken.picks.length === 0 && broken.others.length === 0
    ? { ok: true, build: after }
    : { ok: false, ...broken };
}

export type Cascade =
  | {
      readonly ok: true;
      readonly cleared: readonly Pick[];
      readonly clearedSkills: readonly number[];
      readonly clearedRanks: readonly number[];
      readonly build: Build;
    }
  | ({ readonly ok: false } & Breaks);

const levelOf = (f: Failure) => ('level' in f.place ? f.place.level : undefined);
const rankOf = (f: Failure) => ('rank' in f.place ? f.place.rank : undefined);

function editedSkillsLevel(edit: Edit): number | undefined {
  return edit.kind === 'skills' ? edit.level : undefined;
}

function editedRank(build: Build, edit: Edit): number | undefined {
  if (edit.kind === 'rankClass' || edit.kind === 'rankLevel') return edit.rank;
  if (edit.kind === 'addRank') return (build.ranks?.length ?? 0) + 1;
  return undefined;
}

function dropRanksFrom(build: Build, rank: number): { readonly build: Build; readonly picks: readonly Pick[] } {
  const beyond = (p: Pick) => 'rank' in p.slot.place && p.slot.place.rank >= rank;
  return {
    build: { ...build, ranks: (build.ranks ?? []).slice(0, rank - 1), picks: build.picks.filter((p) => !beyond(p)) },
    picks: build.picks.filter(beyond),
  };
}

function clearSkills(build: Build, levels: readonly number[]): Build {
  return {
    ...build,
    levels: build.levels.map((l, i) => {
      if (!levels.includes(i + 1)) return l;
      const { skills: _skills, ...rest } = l;
      return rest;
    }),
  };
}

export function cascade(data: CheckedData, build: Build, edit: Edit, G: GrantIndex = buildGrantIndex(data)): Cascade {
  let after = apply(build, edit);
  const cleared: Pick[] = [];
  const clearedSkills = new Set<number>();
  const clearedRanks: number[] = [];
  for (;;) {
    const broken = breaksOf(data, build, after, G);
    const refuse = { ok: false as const, ...broken };
    const edited = edit.kind === 'pick' ? broken.picks.find((p) => slotKey(p.slot) === slotKey(edit.slot)) : undefined;
    if (edited !== undefined) return refuse;
    const skills = broken.others.filter((f) => f.choice === 'skills' && levelOf(f) !== undefined);
    const ranks = broken.others.filter((f) => (f.choice === 'class' || f.choice === 'rank') && rankOf(f) !== undefined);
    if (broken.others.length > skills.length + ranks.length) return refuse;
    const skillLevels = [...new Set(skills.map((f) => levelOf(f) as number))].filter(
      (l) => Object.keys(after.levels[l - 1]?.skills ?? {}).length > 0,
    );
    const firstRank = ranks.length === 0 ? undefined : Math.min(...ranks.map((f) => rankOf(f) as number));
    const ownSkills = editedSkillsLevel(edit);
    const ownRank = editedRank(build, edit);
    if (skills.length > 0 && (skillLevels.length === 0 || (ownSkills !== undefined && skillLevels.includes(ownSkills))))
      return refuse;
    if (
      firstRank !== undefined &&
      (firstRank > (after.ranks?.length ?? 0) || (ownRank !== undefined && firstRank <= ownRank))
    )
      return refuse;
    if (broken.picks.length === 0 && skillLevels.length === 0 && firstRank === undefined)
      return { ok: true, cleared, clearedSkills: [...clearedSkills].sort((a, b) => a - b), clearedRanks, build: after };
    cleared.push(...broken.picks);
    after = clearPicks(
      after,
      broken.picks.map((p) => p.slot),
    );
    if (skillLevels.length > 0) {
      for (const l of skillLevels) clearedSkills.add(l);
      after = clearSkills(after, skillLevels);
    }
    if (firstRank !== undefined) {
      for (let r = firstRank; r <= (after.ranks?.length ?? 0); r++) clearedRanks.push(r);
      const dropped = dropRanksFrom(after, firstRank);
      cleared.push(...dropped.picks);
      after = dropped.build;
    }
  }
}
