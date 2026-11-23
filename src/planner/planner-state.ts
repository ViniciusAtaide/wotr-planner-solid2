import { placeKey, sameBuild, type Build, type Pick, type Place } from '~engine/build';
import type { Guid } from '~engine/data';
import { classPicker } from '~engine/pickers';
import type { FailedRule } from '~engine/walk';
import { allows, cascade, type Breaks, type Edit } from '~engine/edits';
import type { Engine } from '~engine/mcp';
import { bareNameOf, groupedFailures, nameOf, namesIn, placesWords, refusal } from '~engine/refusals';
import { walk } from '~engine/walk';

import { nestedLabel } from './trail-state';

export type NonEmpty<T> = readonly [T, ...T[]];

export interface Pending {
  readonly title: string;
  readonly summary: string;
  readonly clears: readonly { readonly name: string; readonly place: string }[];
  readonly clearedSkills: readonly number[];
  readonly build: Build;
}

export type Session =
  | { readonly kind: 'idle' }
  | { readonly kind: 'confirming'; readonly pending: Pending }
  | { readonly kind: 'refused'; readonly lines: NonEmpty<string> };

export type Change = string | undefined;

export interface PlannerState {
  readonly past: readonly Build[];
  readonly present: Build;
  readonly future: readonly Build[];
  readonly session: Session;
  readonly change: Change;
  readonly pastChanges: readonly Change[];
  readonly futureChanges: readonly Change[];
}

export const OPENED_A_LINK = 'Opened a link';

export type PlannerAction =
  | { readonly kind: 'edit'; readonly edit: Edit; readonly title: string }
  | { readonly kind: 'edits'; readonly edits: NonEmpty<Edit>; readonly title: string }
  | { readonly kind: 'refuse'; readonly lines: NonEmpty<string> }
  | { readonly kind: 'confirm' }
  | { readonly kind: 'cancel' }
  | { readonly kind: 'dismiss' }
  | { readonly kind: 'undo' }
  | { readonly kind: 'redo' }
  | { readonly kind: 'replace'; readonly build: Build };

export type EditOutcome = 'applied' | 'confirming' | 'refused';

const IDLE: Session = { kind: 'idle' };

export function placeWords(p: Pick['slot']['place']): string {
  return 'level' in p ? `Level ${p.level}` : `Rank ${p.rank}`;
}

export function plannerAt(build: Build): PlannerState {
  return {
    past: [],
    present: build,
    future: [],
    session: IDLE,
    change: undefined,
    pastChanges: [],
    futureChanges: [],
  };
}

export function outcomeOf(s: PlannerState): EditOutcome {
  switch (s.session.kind) {
    case 'idle':
      return 'applied';
    case 'confirming':
      return 'confirming';
    case 'refused':
      return 'refused';
  }
}

function commit(s: PlannerState, next: Build, change: string): PlannerState {
  return {
    past: [...s.past, s.present],
    present: next,
    future: [],
    session: IDLE,
    change,
    pastChanges: [...s.pastChanges, s.change],
    futureChanges: [],
  };
}

export function brokenWords(engine: Engine, build: Build, b: Breaks): string[] {
  const unit = walk(engine.data, build, engine.G).unit;
  const names = namesIn(
    engine.data,
    b.picks.map((p) => p.feature),
  );
  return [
    ...groupedFailures({ data: engine.data, G: engine.G, unit }, b.others).map(
      (g) => `${placesWords(g.places)}: ${g.text}`,
    ),
    ...b.picks.map((p) => `${names.get(p.feature) ?? nameOf(engine.data, p.feature)} (${placeWords(p.slot.place)})`),
  ];
}

export type Verdict =
  | { readonly kind: 'applies'; readonly build: Build }
  | {
      readonly kind: 'clears';
      readonly build: Build;
      readonly cleared: readonly Pick[];
      readonly clearedSkills: readonly number[];
      readonly clearedRanks: readonly number[];
    }
  | { readonly kind: 'breaks'; readonly breaks: Breaks };

export function verdictOf(engine: Engine, build: Build, edit: Edit): Verdict {
  const allowed = allows(engine.data, build, edit, engine.G);
  if (allowed.ok) return { kind: 'applies', build: allowed.build };
  const c = cascade(engine.data, build, edit, engine.G);
  return c.ok
    ? {
        kind: 'clears',
        build: c.build,
        cleared: c.cleared,
        clearedSkills: c.clearedSkills,
        clearedRanks: c.clearedRanks,
      }
    : { kind: 'breaks', breaks: c };
}

export function verdictOfAll(engine: Engine, build: Build, edits: NonEmpty<Edit>): Verdict {
  let now = build;
  const cleared: Pick[] = [];
  const clearedSkills = new Set<number>();
  const clearedRanks = new Set<number>();
  for (const edit of edits) {
    const v = verdictOf(engine, now, edit);
    if (v.kind === 'breaks') return v;
    if (v.kind === 'clears') {
      cleared.push(...v.cleared);
      for (const l of v.clearedSkills) clearedSkills.add(l);
      for (const r of v.clearedRanks) clearedRanks.add(r);
    }
    now = v.build;
  }
  const sorted = (xs: Set<number>) => [...xs].sort((a, b) => a - b);
  return cleared.length + clearedSkills.size + clearedRanks.size > 0
    ? { kind: 'clears', build: now, cleared, clearedSkills: sorted(clearedSkills), clearedRanks: sorted(clearedRanks) }
    : { kind: 'applies', build: now };
}

export function laterPicks(n: number): string {
  return `${n} later ${n === 1 ? 'pick' : 'picks'}`;
}

export function laterChoices(n: number): string {
  return `${n} later ${n === 1 ? 'choice' : 'choices'}`;
}

type Clears = Extract<Verdict, { readonly kind: 'clears' }>;

function childOf(picks: readonly Pick[], parent: Pick): Pick | undefined {
  return picks.find(
    (c) =>
      c !== parent && c.slot.selection === parent.feature && placeKey(c.slot.place) === placeKey(parent.slot.place),
  );
}

export function shownPicks(picks: readonly Pick[]): readonly Pick[] {
  return picks.filter((p) => !picks.some((parent) => childOf(picks, parent) === p));
}

export function clearedCount(v: Clears): number {
  return shownPicks(v.cleared).length + v.clearedSkills.length + v.clearedRanks.length;
}

function numbers(word: string, ns: readonly number[]): string {
  return `${word}${ns.length === 1 ? '' : 's'} ${ns.join(', ')}`;
}

export function clearsSummary(v: Clears): string {
  const n = clearedCount(v);
  const parts = [
    v.cleared.length > 0 ? laterPicks(shownPicks(v.cleared).length) : undefined,
    v.clearedSkills.length > 0 ? `the skill ranks of ${numbers('level', v.clearedSkills)}` : undefined,
    v.clearedRanks.length > 0 ? numbers('Mythic rank', v.clearedRanks) : undefined,
  ].filter((p) => p !== undefined);
  const list = parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1) ?? ''}`;
  const lead = parts.length < 2 ? `This breaks ${list}` : `This breaks ${laterChoices(n)}: ${list}`;
  return `${lead}. ${n === 1 ? 'It' : 'They'}'ll be cleared, not moved.`;
}

function whereIn(before: Build, place: Pick['slot']['place']): number {
  if ('level' in place) return place.level;
  return (before.ranks?.[place.rank - 1]?.level ?? before.levels.length) + place.rank / 100;
}

export function clearsList(engine: Engine, before: Build, v: Clears): Pending['clears'] {
  const names = namesIn(
    engine.data,
    v.cleared.map((p) => p.feature),
  );
  const own = (p: Pick) => names.get(p.feature) ?? nameOf(engine.data, p.feature);
  const named = (p: Pick, depth: number): string => {
    const child = depth < v.cleared.length ? childOf(v.cleared, p) : undefined;
    return child === undefined ? own(p) : nestedLabel(own(p), named(child, depth + 1));
  };
  const rows = [
    ...shownPicks(v.cleared).map((p) => ({
      at: whereIn(before, p.slot.place),
      row: { name: named(p, 0), place: placeWords(p.slot.place) },
    })),
    ...v.clearedSkills.map((level) => ({
      at: level + 0.001,
      row: { name: 'Skill ranks', place: `Level ${level}` },
    })),
    ...v.clearedRanks.map((rank) => {
      const cls = before.ranks?.[rank - 1]?.class;
      return {
        at: whereIn(before, { rank }) - 0.001,
        row: { name: cls === undefined ? 'Mythic rank' : bareNameOf(engine.data, cls), place: `Rank ${rank}` },
      };
    }),
  ];
  return rows.sort((a, b) => a.at - b.at).map((r) => r.row);
}

export interface Judged {
  readonly open: boolean;
  readonly note?: string;
  readonly reasons: readonly string[];
}

export function judgeAll(engine: Engine, build: Build, edits: NonEmpty<Edit>): Judged {
  const v = verdictOfAll(engine, build, edits);
  switch (v.kind) {
    case 'applies':
      return { open: true, reasons: [] };
    case 'clears':
      return {
        open: true,
        note: `Clears ${shownPicks(v.cleared).length === clearedCount(v) ? laterPicks(clearedCount(v)) : laterChoices(clearedCount(v))}`,
        reasons: [],
      };
    case 'breaks':
      return { open: false, reasons: brokenWords(engine, build, v.breaks) };
  }
}

export function judgeClasses(
  engine: Engine,
  build: Build,
  place: Place,
  classes: readonly Guid[],
  edit: (cls: Guid) => Edit,
  rankLevel?: number,
): ReadonlyMap<Guid, ClassJudged> {
  const p = classPicker(engine.data, build, place, engine.G, rankLevel);
  if (p === undefined) return new Map(classes.map((c) => [c, judgeAll(engine, build, [edit(c)])]));
  const words = (closed: FailedRule): readonly string[] => {
    const r = refusal({ data: engine.data, G: engine.G, unit: p.unit }, closed);
    return r.unmet.length > 0 ? r.unmet : [r.text];
  };
  const labelOf = (n: { readonly name?: string; readonly qualifier?: string }) =>
    n.name === undefined ? {} : { label: n.qualifier === undefined ? n.name : `${n.name} (${n.qualifier})` };
  return new Map(
    p.options.map((o): [Guid, ClassJudged] => [
      o.class,
      {
        open: o.closed === undefined,
        reasons: o.closed === undefined ? [] : words(o.closed),
        shown: o.shown,
        ...labelOf(o),
        archetypes: new Map(
          o.archetypes.map((a): [Guid, ArchetypeJudged] => [
            a.archetype,
            { open: a.closed === undefined, reasons: a.closed === undefined ? [] : words(a.closed), ...labelOf(a) },
          ]),
        ),
      },
    ]),
  );
}

export interface ArchetypeJudged extends Judged {
  readonly label?: string;
}

export interface ClassJudged extends Judged {
  readonly label?: string;
  readonly shown?: boolean;
  readonly archetypes?: ReadonlyMap<Guid, ArchetypeJudged>;
}

function edited(engine: Engine, s: PlannerState, edits: NonEmpty<Edit>, title: string): PlannerState {
  const v = verdictOfAll(engine, s.present, edits);
  switch (v.kind) {
    case 'applies':
      return sameBuild(s.present, v.build) ? { ...s, session: IDLE } : commit(s, v.build, title);
    case 'breaks':
      return {
        ...s,
        session: {
          kind: 'refused',
          lines: ['That change can’t be made. It would break:', ...brokenWords(engine, s.present, v.breaks)],
        },
      };
    case 'clears':
      return {
        ...s,
        session: {
          kind: 'confirming',
          pending: {
            title,
            summary: clearsSummary(v),
            clears: clearsList(engine, s.present, v),
            clearedSkills: v.clearedSkills,
            build: v.build,
          },
        },
      };
  }
}

function undone(s: PlannerState): PlannerState {
  const last = s.past.at(-1);
  if (last === undefined) return s;
  return {
    past: s.past.slice(0, -1),
    present: last,
    future: [s.present, ...s.future],
    session: IDLE,
    change: s.pastChanges.at(-1),
    pastChanges: s.pastChanges.slice(0, -1),
    futureChanges: [s.change, ...s.futureChanges],
  };
}

function redone(s: PlannerState): PlannerState {
  const [next, ...rest] = s.future;
  if (next === undefined) return s;
  const [change, ...later] = s.futureChanges;
  return {
    past: [...s.past, s.present],
    present: next,
    future: rest,
    session: IDLE,
    change,
    pastChanges: [...s.pastChanges, s.change],
    futureChanges: later,
  };
}

export function reducePlanner(engine: Engine, s: PlannerState, a: PlannerAction): PlannerState {
  const confirming = s.session.kind === 'confirming';
  switch (a.kind) {
    case 'edit':
      return confirming ? s : edited(engine, s, [a.edit], a.title);
    case 'edits':
      return confirming ? s : edited(engine, s, a.edits, a.title);
    case 'refuse':
      return confirming ? s : { ...s, session: { kind: 'refused', lines: a.lines } };
    case 'confirm':
      return s.session.kind === 'confirming' ? commit(s, s.session.pending.build, s.session.pending.title) : s;
    case 'cancel':
      return confirming ? { ...s, session: IDLE } : s;
    case 'dismiss':
      return s.session.kind === 'refused' ? { ...s, session: IDLE } : s;
    case 'undo':
      return confirming ? { ...s, session: IDLE } : undone(s);
    case 'redo':
      return confirming ? s : redone(s);
    case 'replace':
      return sameBuild(s.present, a.build) ? s : commit(s, a.build, OPENED_A_LINK);
  }
}
