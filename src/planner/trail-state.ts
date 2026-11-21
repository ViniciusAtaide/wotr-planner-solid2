import { placeKey, slotKey, type Alignment, type Build, type Place, type SkillRanks, type SlotId } from '~engine/build';
import type { CheckedData } from '~engine/load';
import { expectedLevel } from '~engine/mcp';
import { BACKGROUNDS_BASE_SELECTION, characterWideSlots, heritageSlotIn, namesInList } from '~engine/pickers';
import { nameOf } from '~engine/refusals';
import type { OpenedSlot, Walk } from '~engine/walk';

import { backgroundChildren, flatName, joinedName } from './flat-choices';
import type { Selection } from './workspace-state';
import { bareNameOf, shownName } from './words';

export const CHAPTER_LEVELS = 4;

export type Step =
  | Selection
  | { readonly kind: 'mythic'; readonly rank: number; readonly at: number }
  | { readonly kind: 'nextLevel' }
  | { readonly kind: 'complete' };

export type Where =
  | { readonly kind: 'character' }
  | { readonly kind: 'scores' }
  | { readonly kind: 'level'; readonly level: number }
  | { readonly kind: 'rank'; readonly rank: number }
  | { readonly kind: 'next' }
  | { readonly kind: 'gear' }
  | { readonly kind: 'end' };

export interface TrailState {
  readonly skillsLeft: ReadonlySet<number>;
  readonly mythicLater: number | undefined;
  readonly unfolded: ReadonlySet<number>;
  readonly characterOpen: boolean | undefined;
  readonly otherClass: boolean;
  readonly closedShown: ReadonlySet<string>;
  readonly skillsCleared: ReadonlySet<number>;
  readonly dialog: string | undefined;
}

export type TrailAction =
  | { readonly kind: 'leaveSkills'; readonly level: number }
  | { readonly kind: 'mythicLater'; readonly level: number }
  | { readonly kind: 'toggleChapter'; readonly chapter: number }
  | { readonly kind: 'levelAdded' }
  | { readonly kind: 'character'; readonly open: boolean }
  | { readonly kind: 'otherClass'; readonly open: boolean }
  | { readonly kind: 'toggleClosed'; readonly list: string }
  | { readonly kind: 'skillsCleared'; readonly levels: readonly number[] }
  | { readonly kind: 'dialog'; readonly step: string | undefined };

export const TRAIL_START: TrailState = {
  skillsLeft: new Set(),
  mythicLater: undefined,
  unfolded: new Set(),
  characterOpen: undefined,
  otherClass: false,
  closedShown: new Set(),
  skillsCleared: new Set(),
  dialog: undefined,
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
    case 'skillsCleared':
      return a.levels.length === 0
        ? s
        : {
            ...s,
            skillsCleared: new Set([...s.skillsCleared, ...a.levels]),
            skillsLeft: new Set([...s.skillsLeft].filter((l) => !a.levels.includes(l))),
          };
    case 'dialog':
      return s.dialog === a.step ? s : { ...s, dialog: a.step };
    case 'toggleClosed': {
      const closedShown = new Set(s.closedShown);
      if (!closedShown.delete(a.list)) closedShown.add(a.list);
      return { ...s, closedShown };
    }
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

export function backgroundSlot(t: TrailView): OpenedSlot | undefined {
  return t.walk.slots.find((s) => s.id.selection === BACKGROUNDS_BASE_SELECTION);
}

export function isBackgroundSlot(t: TrailView, slot: SlotId): boolean {
  const base = backgroundSlot(t);
  if (base === undefined) return false;
  const key = slotKey(slot);
  return key === slotKey(base.id) || backgroundChildren(t.walk.slots, base.id).some((s) => slotKey(s.id) === key);
}

export function isHeritageSlot(t: TrailView, slot: SlotId): boolean {
  const heritage = heritageSlotIn(t.data, t.walk.slots);
  return heritage !== undefined && slotKey(heritage.id) === slotKey(slot);
}

export function characterChipSlots(t: TrailView): readonly OpenedSlot[] {
  const base = backgroundSlot(t);
  const children = new Set(
    base === undefined ? [] : backgroundChildren(t.walk.slots, base.id).map((s) => slotKey(s.id)),
  );
  return characterSlots(t).filter((s) => !children.has(slotKey(s.id)) && !isHeritageSlot(t, s.id));
}

export interface SkillBudget {
  readonly spent: number;
  readonly available: number;
}

export function sameRanks(a: SkillRanks, b: SkillRanks): boolean {
  const ranks = (r: SkillRanks): Record<string, number> => ({ ...r });
  const x = ranks(a);
  const y = ranks(b);
  return [...new Set([...Object.keys(x), ...Object.keys(y)])].every((k) => (x[k] ?? 0) === (y[k] ?? 0));
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

export function atLevelCap(t: TrailView): boolean {
  return t.build.levels.length >= t.walk.maxCharacterLevel;
}

export function mythicDue(t: TrailView, later: number | undefined): MythicDue | undefined {
  const levels = t.build.levels.length;
  if (t.walk.ranksEnded || (later === levels && !atLevelCap(t))) return undefined;
  const rank = (t.build.ranks?.length ?? 0) + 1;
  const at = expectedLevel(t.data, rank);
  return at > 0 && at <= levels ? { rank, at } : undefined;
}

export function clearedSkillsDue(
  t: TrailView,
  cleared: ReadonlySet<number> | undefined,
  left: ReadonlySet<number>,
): number | undefined {
  return [...(cleared ?? [])]
    .sort((a, b) => a - b)
    .find((level) => {
      if (level > t.build.levels.length || left.has(level)) return false;
      const b = skillBudget(t, level);
      return b.spent < b.available;
    });
}

export function nextStep(
  t: TrailView,
  s: Pick<TrailState, 'skillsLeft' | 'mythicLater'> & Partial<Pick<TrailState, 'skillsCleared'>>,
): Step {
  if (t.build.race === undefined) return { kind: 'race' };
  if (t.build.scores === undefined) return { kind: 'scores' };
  const empty = (slots: readonly OpenedSlot[]) => slots.find((x) => x.pick === undefined);
  const slot = empty(characterSlots(t)) ?? empty(shownSlots(t));
  if (slot !== undefined) return { kind: 'slot', slot: slot.id };
  const increase = increaseDue(t);
  if (increase !== undefined) return { kind: 'increase', level: increase };
  const redo = clearedSkillsDue(t, s.skillsCleared, s.skillsLeft);
  if (redo !== undefined) return { kind: 'skills', level: redo };
  const skills = skillsDue(t, s.skillsLeft);
  if (skills !== undefined) return { kind: 'skills', level: skills };
  const due = mythicDue(t, s.mythicLater);
  if (due !== undefined) return { kind: 'mythic', ...due };
  return atLevelCap(t) ? { kind: 'complete' } : { kind: 'nextLevel' };
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
    case 'scores':
      return { kind: 'scores' };
    case 'race':
      return { kind: 'character' };
    case 'mythic':
    case 'nextLevel':
      return { kind: 'next' };
    case 'complete':
      return { kind: 'end' };
  }
}

export function slotLabel(data: CheckedData, selection: string): string {
  return bareNameOf(data, selection).replace(/ selection$/i, '');
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
    case 'scores':
      return 'Your character · set the ability scores';
    case 'race':
      return 'Your character · choose a race';
    case 'mythic':
      return `Ascend to Mythic rank ${step.rank}`;
    case 'complete':
      return `Level ${t.build.levels.length}`;
    case 'nextLevel':
      return t.build.levels.length === 0
        ? 'Begin · choose a first class'
        : `Onward to level ${t.build.levels.length + 1}`;
  }
}

export function keepsSelection(s: Selection | undefined): boolean {
  return s?.kind === 'skills' || s?.kind === 'rank' || s?.kind === 'gear' || s?.kind === 'scores';
}

export function hereLevel(t: TrailView, where: Where): number {
  switch (where.kind) {
    case 'level':
      return where.level;
    case 'rank':
      return t.build.ranks?.[where.rank - 1]?.level ?? t.build.levels.length;
    case 'character':
    case 'scores':
    case 'next':
    case 'gear':
      return t.build.levels.length + 1;
    case 'end':
      return t.build.levels.length;
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
  return (
    levels > 1 || (levels === 1 && (next.kind === 'nextLevel' || next.kind === 'mythic' || next.kind === 'complete'))
  );
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

export function gearDependentSlots(t: TrailView): ReadonlySet<string> {
  return new Set(t.walk.gearDependent.flatMap((g) => (g.slot === undefined ? [] : [slotKey(g.slot)])));
}

export function pickLabels(data: CheckedData, slots: readonly OpenedSlot[]): ReadonlyMap<string, string> {
  const names = namesInList(
    data,
    slots.flatMap((s) => (s.pick === undefined ? [] : [s.pick.feature])),
  );
  return new Map(
    slots.flatMap((s) =>
      s.pick === undefined
        ? []
        : [[slotKey(s.id), shownName(data, s.pick.feature, s.pick.param, names.get(s.pick.feature))] as const],
    ),
  );
}

function pickNames(t: TrailView, slots: readonly OpenedSlot[]): string[] {
  const gear = gearDependentSlots(t);
  const labels = pickLabels(t.data, slots);
  return slots.flatMap((s) => {
    const label = labels.get(slotKey(s.id));
    return label === undefined ? [] : [`${label}${gear.has(slotKey(s.id)) ? ' (Gear)' : ''}`];
  });
}

export function characterPicksLine(t: TrailView): string {
  const heritage = heritageSlotIn(t.data, t.walk.slots)?.pick;
  const race =
    t.build.race === undefined
      ? []
      : [joinedName(bareNameOf(t.data, t.build.race), heritage && shownName(t.data, heritage.feature, heritage.param))];
  const base = backgroundSlot(t);
  const child =
    base === undefined ? undefined : backgroundChildren(t.walk.slots, base.id).find((s) => s.pick !== undefined)?.pick;
  const slots = characterChipSlots(t);
  const names = pickNames(t, slots);
  const picked = slots.filter((s) => s.pick !== undefined);
  const rest = picked.map((s, i) => {
    const name = names[i] ?? '';
    return base !== undefined && slotKey(s.id) === slotKey(base.id)
      ? flatName(name, child && shownName(t.data, child.feature, child.param))
      : name;
  });
  return [...race, ...rest].join(' · ');
}

export function rankNumbersAt(build: Build, level: number): readonly number[] {
  const last = level === build.levels.length;
  return (build.ranks ?? []).flatMap((r, i) => (r.level === level || (last && r.level > level) ? [i + 1] : []));
}

export function levelLine(t: TrailView, level: number): string {
  const l = t.build.levels[level - 1];
  return [...pickNames(t, slotsAt(t, { level })), l?.increase && `${l.increase} +1`]
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
    classes: [...counts].map(([name, n]) => `${name} ×${n}`).join(' / '),
    ranks: ranks.map((r) => `M${r}`).join(' '),
    picks: levels
      .flatMap((l) => [
        levelLine(t, l),
        ...rankNumbersAt(t.build, l).map((r) => pickNames(t, slotsAt(t, { rank: r })).join(' · ')),
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
