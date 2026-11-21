import { placeKey, slotKey, type Alignment, type Build, type Place, type SlotId } from '~engine/build';
import type { CheckedData } from '~engine/load';
import { expectedLevel } from '~engine/mcp';
import { characterWideSlots } from '~engine/pickers';
import { nameOf } from '~engine/refusals';
import type { OpenedSlot, Walk } from '~engine/walk';

import type { Selection } from './workspace-state';
import { optionName } from './words';

export const CHAPTER_LEVELS = 4;

export type Step =
  | Selection
  | { readonly kind: 'mythic'; readonly rank: number; readonly at: number }
  | { readonly kind: 'nextLevel' };

export type Where =
  | { readonly kind: 'character' }
  | { readonly kind: 'level'; readonly level: number }
  | { readonly kind: 'rank'; readonly rank: number }
  | { readonly kind: 'next' }
  | { readonly kind: 'gear' };

export interface TrailState {
  readonly skillsLeft: ReadonlySet<number>;
  readonly mythicLater: number | undefined;
  readonly unfolded: ReadonlySet<number>;
  readonly characterOpen: boolean | undefined;
  readonly otherClass: boolean;
}

export type TrailAction =
  | { readonly kind: 'leaveSkills'; readonly level: number }
  | { readonly kind: 'mythicLater'; readonly level: number }
  | { readonly kind: 'toggleChapter'; readonly chapter: number }
  | { readonly kind: 'levelAdded' }
  | { readonly kind: 'character'; readonly open: boolean }
  | { readonly kind: 'otherClass'; readonly open: boolean };

export const TRAIL_START: TrailState = {
  skillsLeft: new Set(),
  mythicLater: undefined,
  unfolded: new Set(),
  characterOpen: undefined,
  otherClass: false,
};

export function reduceTrail(s: TrailState, a: TrailAction): TrailState {
  switch (a.kind) {
    case 'leaveSkills':
      return { ...s, skillsLeft: new Set([...s.skillsLeft, a.level]) };
    case 'mythicLater':
      return { ...s, mythicLater: a.level };
    case 'toggleChapter': {
      const unfolded = new Set(s.unfolded);
      if (!unfolded.delete(a.chapter)) unfolded.add(a.chapter);
      return { ...s, unfolded };
    }
    case 'levelAdded':
      return { ...s, unfolded: new Set(), otherClass: false };
    case 'character':
      return { ...s, characterOpen: a.open };
    case 'otherClass':
      return { ...s, otherClass: a.open };
  }
}

export interface TrailView {
  readonly data: CheckedData;
  readonly build: Build;
  readonly walk: Walk;
}

export function shownSlots(t: TrailView): readonly OpenedSlot[] {
  return t.walk.slots.filter((s) => t.data.blueprints.get(s.id.selection)?.$type !== 'BlueprintParametrizedFeature');
}

export function characterSlots(t: TrailView): readonly OpenedSlot[] {
  const wide = characterWideSlots(t.data, t.walk.slots);
  return shownSlots(t).filter((s) => wide.has(slotKey(s.id)));
}

export function slotsAt(t: TrailView, place: Place): readonly OpenedSlot[] {
  const wide = characterWideSlots(t.data, t.walk.slots);
  const key = placeKey(place);
  return shownSlots(t).filter((s) => placeKey(s.id.place) === key && !wide.has(slotKey(s.id)));
}

export function isCharacterSlot(t: TrailView, slot: SlotId): boolean {
  return characterWideSlots(t.data, t.walk.slots).has(slotKey(slot));
}

export interface SkillBudget {
  readonly spent: number;
  readonly available: number;
}

export function skillsSpent(build: Build, level: number): number {
  return Object.values(build.levels[level - 1]?.skills ?? {}).reduce((n, r) => n + (r ?? 0), 0);
}

export function skillBudget(t: TrailView, level: number): SkillBudget {
  return { spent: skillsSpent(t.build, level), available: t.walk.skillPoints[level - 1] ?? 0 };
}

export function skillsDue(t: TrailView, left: ReadonlySet<number>): number | undefined {
  const last = t.build.levels.length;
  if (last === 0 || left.has(last)) return undefined;
  const b = skillBudget(t, last);
  return b.spent < b.available ? last : undefined;
}

export function increaseDue(t: TrailView): number | undefined {
  const at = t.build.levels.findIndex((l, i) => (t.walk.attributePoints[i] ?? 0) > 0 && l.increase === undefined);
  return at === -1 ? undefined : at + 1;
}

export function increaseOffered(t: TrailView, level: number): boolean {
  return (t.walk.attributePoints[level - 1] ?? 0) > 0;
}

export interface MythicDue {
  readonly rank: number;
  readonly at: number;
}

export function mythicDue(t: TrailView, later: number | undefined): MythicDue | undefined {
  const levels = t.build.levels.length;
  if (later === levels) return undefined;
  const rank = (t.build.ranks?.length ?? 0) + 1;
  const at = expectedLevel(t.data, rank);
  return at > 0 && at <= levels ? { rank, at } : undefined;
}

export function nextStep(t: TrailView, s: Pick<TrailState, 'skillsLeft' | 'mythicLater'>): Step {
  const empty = (slots: readonly OpenedSlot[]) => slots.find((x) => x.pick === undefined);
  const slot = empty(characterSlots(t)) ?? empty(shownSlots(t));
  if (slot !== undefined) return { kind: 'slot', slot: slot.id };
  const increase = increaseDue(t);
  if (increase !== undefined) return { kind: 'increase', level: increase };
  const skills = skillsDue(t, s.skillsLeft);
  if (skills !== undefined) return { kind: 'skills', level: skills };
  const due = mythicDue(t, s.mythicLater);
  if (due !== undefined) return { kind: 'mythic', ...due };
  return { kind: 'nextLevel' };
}

export function whereOf(t: TrailView, step: Step): Where {
  switch (step.kind) {
    case 'slot': {
      if (isCharacterSlot(t, step.slot)) return { kind: 'character' };
      const place = step.slot.place;
      return 'level' in place ? { kind: 'level', level: place.level } : { kind: 'rank', rank: place.rank };
    }
    case 'increase':
    case 'skills':
    case 'level':
      return { kind: 'level', level: step.level };
    case 'rank':
      return { kind: 'rank', rank: step.rank };
    case 'gear':
      return { kind: 'gear' };
    case 'mythic':
    case 'nextLevel':
      return { kind: 'next' };
  }
}

export function slotLabel(data: CheckedData, selection: string): string {
  return nameOf(data, selection).replace(/ selection$/i, '');
}

export function slotWords(data: CheckedData, selection: string): string {
  return slotLabel(data, selection).toLowerCase();
}

function placeTitle(place: Place): string {
  return 'level' in place ? `Level ${place.level}` : `Mythic rank ${place.rank}`;
}

export function stepTitle(t: TrailView, step: Step): string {
  switch (step.kind) {
    case 'slot':
      return `${isCharacterSlot(t, step.slot) ? 'Your character' : placeTitle(step.slot.place)} · choose ${slotWords(t.data, step.slot.selection)}`;
    case 'increase':
      return `Level ${step.level} · raise an ability`;
    case 'skills':
      return `Level ${step.level} · train your skills`;
    case 'level':
      return `Level ${step.level} · the class`;
    case 'rank':
      return `Mythic rank ${step.rank} · the path`;
    case 'gear':
      return 'Your gear';
    case 'mythic':
      return `Ascend to Mythic rank ${step.rank}`;
    case 'nextLevel':
      return t.build.levels.length === 0
        ? 'Begin · choose a first class'
        : `Onward to level ${t.build.levels.length + 1}`;
  }
}

export function keepsSelection(s: Selection | undefined): boolean {
  return s?.kind === 'skills' || s?.kind === 'rank' || s?.kind === 'gear';
}

export function hereLevel(t: TrailView, where: Where): number {
  switch (where.kind) {
    case 'level':
      return where.level;
    case 'rank':
      return t.build.ranks?.[where.rank - 1]?.level ?? t.build.levels.length;
    case 'character':
    case 'next':
    case 'gear':
      return t.build.levels.length + 1;
  }
}

export function chapterOf(level: number): number {
  return Math.ceil(level / CHAPTER_LEVELS);
}

export function chapterRange(chapter: number): { readonly first: number; readonly last: number } {
  return { first: (chapter - 1) * CHAPTER_LEVELS + 1, last: chapter * CHAPTER_LEVELS };
}

export function chapters(levels: number): readonly number[] {
  return Array.from({ length: chapterOf(levels) }, (_, i) => i + 1);
}

export interface FoldView {
  readonly phone: boolean;
  readonly levels: number;
  readonly here: number;
  readonly unfolded: ReadonlySet<number>;
}

export function folded(chapter: number, v: FoldView): boolean {
  const finished = chapterRange(chapter).last <= v.levels;
  return v.phone && finished && chapter < chapterOf(v.here) && !v.unfolded.has(chapter);
}

export function levelOneDone(t: TrailView, next: Step): boolean {
  const levels = t.build.levels.length;
  return levels > 1 || (levels === 1 && (next.kind === 'nextLevel' || next.kind === 'mythic'));
}

export interface CardView {
  readonly phone: boolean;
  readonly levelOneDone: boolean;
  readonly open: boolean | undefined;
}

export function characterFolded(v: CardView & { readonly hereIsCharacter: boolean }): boolean {
  return v.phone && v.levelOneDone && v.open !== true && !v.hereIsCharacter;
}

export function characterEditing(v: CardView): boolean {
  return !v.phone || (v.open ?? !v.levelOneDone);
}

export function classLevelAt(build: Build, level: number): number {
  const cls = build.levels[level - 1]?.class;
  return build.levels.slice(0, level).filter((l) => l.class === cls).length;
}

export function isFirstLevelOfClass(build: Build, level: number): boolean {
  return classLevelAt(build, level) === 1;
}

export function alignmentWords(a: Alignment): string {
  return a === 'TrueNeutral' ? 'Neutral' : a.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function characterLine(data: CheckedData, build: Build): string {
  return [
    build.race === undefined ? 'No race yet' : nameOf(data, build.race),
    build.alignment && alignmentWords(build.alignment),
    build.raceStat && `+2 ${build.raceStat}`,
  ]
    .filter((x) => typeof x === 'string')
    .join(' · ');
}

function pickNames(data: CheckedData, slots: readonly OpenedSlot[]): string[] {
  return slots.flatMap((s) => (s.pick === undefined ? [] : [optionName(data, s.pick.feature, s.pick.param)]));
}

export function characterPicksLine(t: TrailView): string {
  return pickNames(t.data, characterSlots(t)).join(' · ');
}

export function rankNumbersAt(build: Build, level: number): readonly number[] {
  const last = level === build.levels.length;
  return (build.ranks ?? []).flatMap((r, i) => (r.level === level || (last && r.level > level) ? [i + 1] : []));
}

export function levelLine(t: TrailView, level: number): string {
  const l = t.build.levels[level - 1];
  return [...pickNames(t.data, slotsAt(t, { level })), l?.increase && `${l.increase} +1`]
    .filter((x) => typeof x === 'string')
    .join(' · ');
}

export interface ChapterSummary {
  readonly classes: string;
  readonly ranks: string;
  readonly picks: string;
}

export function chapterSummary(t: TrailView, chapter: number): ChapterSummary {
  const { first, last } = chapterRange(chapter);
  const levels = Array.from({ length: last - first + 1 }, (_, i) => first + i).filter(
    (l) => l <= t.build.levels.length,
  );
  const counts = new Map<string, number>();
  for (const l of levels) {
    const name = nameOf(t.data, t.build.levels[l - 1]?.class ?? '');
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const ranks = levels.flatMap((l) => rankNumbersAt(t.build, l));
  return {
    classes: [...counts].map(([name, n]) => `${name} ${n}`).join(' / '),
    ranks: ranks.map((r) => `M${r}`).join(' '),
    picks: levels
      .flatMap((l) => [
        levelLine(t, l),
        ...rankNumbersAt(t.build, l).map((r) => pickNames(t.data, slotsAt(t, { rank: r })).join(' · ')),
      ])
      .filter((x) => x !== '')
      .join(' · '),
  };
}

export function firstCleared(before: Build, after: TrailView): SlotId | undefined {
  const kept = new Set(after.build.picks.map((p) => slotKey(p.slot)));
  const cleared = new Set(before.picks.map((p) => slotKey(p.slot)).filter((k) => !kept.has(k)));
  return after.walk.slots.find((s) => s.pick === undefined && cleared.has(slotKey(s.id)))?.id;
}
