import { sameBuild, type Build, type Pick } from '~engine/build';
import { allows, cascade, type Breaks, type Edit } from '~engine/edits';
import type { Engine } from '~engine/mcp';
import { nameOf, refusalWords } from '~engine/refusals';
import { walk } from '~engine/walk';

export type NonEmpty<T> = readonly [T, ...T[]];

export interface Pending {
  readonly title: string;
  readonly summary: string;
  readonly clears: readonly { readonly name: string; readonly place: string }[];
  readonly build: Build;
}

export type Session =
  | { readonly kind: 'idle' }
  | { readonly kind: 'confirming'; readonly pending: Pending }
  | { readonly kind: 'refused'; readonly lines: NonEmpty<string> };

export interface PlannerState {
  readonly past: readonly Build[];
  readonly present: Build;
  readonly future: readonly Build[];
  readonly session: Session;
}

export type PlannerAction =
  | { readonly kind: 'edit'; readonly edit: Edit; readonly title: string }
  | { readonly kind: 'refuse'; readonly lines: NonEmpty<string> }
  | { readonly kind: 'confirm' }
  | { readonly kind: 'cancel' }
  | { readonly kind: 'dismiss' }
  | { readonly kind: 'undo' }
  | { readonly kind: 'redo' }
  | { readonly kind: 'replace'; readonly build: Build }
  | { readonly kind: 'reset'; readonly build: Build };

export type EditOutcome = 'applied' | 'confirming' | 'refused';

const IDLE: Session = { kind: 'idle' };

export function placeWords(p: Pick['slot']['place']): string {
  return 'level' in p ? `Level ${p.level}` : `Rank ${p.rank}`;
}

export function plannerAt(build: Build): PlannerState {
  return { past: [], present: build, future: [], session: IDLE };
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

function commit(s: PlannerState, next: Build): PlannerState {
  return { past: [...s.past, s.present], present: next, future: [], session: IDLE };
}

function brokenWords(engine: Engine, build: Build, b: Breaks): string[] {
  const unit = walk(engine.data, build, engine.G).unit;
  return [
    ...b.picks.map((p) => `${nameOf(engine.data, p.feature)} (${placeWords(p.slot.place)})`),
    ...b.others.map((f) => `${placeWords(f.place)}: ${refusalWords({ data: engine.data, G: engine.G, unit }, f)}`),
  ];
}

function edited(engine: Engine, s: PlannerState, edit: Edit, title: string): PlannerState {
  const now = s.present;
  const verdict = allows(engine.data, now, edit, engine.G);
  if (verdict.ok) return commit(s, verdict.build);
  const c = cascade(engine.data, now, edit, engine.G);
  if (!c.ok) {
    return {
      ...s,
      session: {
        kind: 'refused',
        lines: ['That change can’t be made. It would break:', ...brokenWords(engine, now, c)],
      },
    };
  }
  const n = c.cleared.length;
  return {
    ...s,
    session: {
      kind: 'confirming',
      pending: {
        title,
        summary: `This breaks ${n} later ${n === 1 ? 'pick' : 'picks'}. They'll be cleared, not moved.`,
        clears: c.cleared.map((p) => ({ name: nameOf(engine.data, p.feature), place: placeWords(p.slot.place) })),
        build: c.build,
      },
    },
  };
}

function undone(s: PlannerState): PlannerState {
  const last = s.past.at(-1);
  if (last === undefined) return s;
  return { past: s.past.slice(0, -1), present: last, future: [s.present, ...s.future], session: IDLE };
}

function redone(s: PlannerState): PlannerState {
  const [next, ...rest] = s.future;
  if (next === undefined) return s;
  return { past: [...s.past, s.present], present: next, future: rest, session: IDLE };
}

export function reducePlanner(engine: Engine, s: PlannerState, a: PlannerAction): PlannerState {
  const confirming = s.session.kind === 'confirming';
  switch (a.kind) {
    case 'edit':
      return confirming ? s : edited(engine, s, a.edit, a.title);
    case 'refuse':
      return confirming ? s : { ...s, session: { kind: 'refused', lines: a.lines } };
    case 'confirm':
      return s.session.kind === 'confirming' ? commit(s, s.session.pending.build) : s;
    case 'cancel':
      return confirming ? { ...s, session: IDLE } : s;
    case 'dismiss':
      return s.session.kind === 'refused' ? { ...s, session: IDLE } : s;
    case 'undo':
      return confirming ? { ...s, session: IDLE } : undone(s);
    case 'redo':
      return confirming ? s : redone(s);
    case 'replace':
      return sameBuild(s.present, a.build) ? s : commit(s, a.build);
    case 'reset':
      return plannerAt(a.build);
  }
}
