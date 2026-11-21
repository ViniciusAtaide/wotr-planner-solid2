import { join } from 'node:path';
import { describe, expect, expectTypeOf, test } from 'vitest';
import {
  abilityScores,
  toAbilityScores,
  toArchetypes,
  toRankLevel,
  toSkillRanks,
  type AbilityScores,
  type Archetypes,
  type Ascension,
  type Build,
  type ClassChoice,
  type RankLevel,
  type SkillRanks,
  type SlotId,
} from '~engine/build';
import type { Edit } from '~engine/edits';
import { readDataDir } from '~engine/data-dir';
import { loadData } from '~engine/load';
import { engineOf } from '~engine/mcp';

import {
  OPENED_A_LINK,
  outcomeOf,
  plannerAt,
  reducePlanner,
  type PlannerAction,
  type PlannerState,
  type Session,
} from './planner-state';
import type { ShareCode } from './share-code';
import type { LinkStatus, View } from './workspace-state';

const files = readDataDir(join(process.cwd(), 'data'));
const e = engineOf(loadData(files.files, files.overrides));

const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
const POWER_ATTACK = '9972f33f977fc724c838e59641b2fca5';
const CLEAVE = 'd809b6c4ff2aaff4fa70d712a70f7d7b';
const FEAT: SlotId = { place: { level: 1 }, selection: '247a4068296e8be42890143f451b4b45', index: 0 };
const BONUS_COMBAT_FEAT: SlotId = { place: { level: 1 }, selection: '41c8486641f7d6d4283ca9dae4147a9f', index: 0 };
const SCORES = { Strength: 13, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 };

const cleaver: Build = {
  scores: abilityScores(SCORES),
  levels: [{ class: FIGHTER }],
  picks: [
    { slot: FEAT, feature: POWER_ATTACK },
    { slot: BONUS_COMBAT_FEAT, feature: CLEAVE },
  ],
};
const levelled = (n: number): Build => ({ ...cleaver, levels: Array.from({ length: n }, () => ({ class: FIGHTER })) });

const ADD_LEVEL: Edit = { kind: 'addLevel', class: FIGHTER };
const WEAKER: Edit = { kind: 'scores', scores: abilityScores({ ...SCORES, Strength: 10 }) };
const EARLY_INCREASE: Edit = { kind: 'increase', level: 1, increase: 'Strength' };

const before = levelled(1);
const now = levelled(2);
const after = levelled(3);
const previewed = levelled(4);
const REFUSED: Session = { kind: 'refused', lines: ['Refused.'] };
const CONFIRMING: Session = {
  kind: 'confirming',
  pending: { title: 'Weaker', summary: 'Clears picks.', clears: [], build: previewed },
};
const at = (session: Session): PlannerState => ({
  past: [before],
  present: now,
  future: [after],
  session,
  change: 'Level 2',
  pastChanges: [undefined],
  futureChanges: ['Level 3'],
});
const states = { idle: at({ kind: 'idle' }), refused: at(REFUSED), confirming: at(CONFIRMING) };
type Kind = keyof typeof states;

const run = (s: PlannerState, a: PlannerAction) => reducePlanner(e, s, a);

describe('PlannerState: one test per table cell', () => {
  const cells: readonly [PlannerAction['kind'], Kind, (s: PlannerState, next: PlannerState) => void][] = [
    [
      'edit',
      'idle',
      (s, n) => {
        expect(n.present.levels).toHaveLength(3);
        expect(n.past).toEqual([...s.past, s.present]);
        expect(n.future).toEqual([]);
        expect(n.session.kind).toBe('idle');
        expect(n.change).toBe('Add level 3');
        expect(n.pastChanges).toEqual([undefined, 'Level 2']);
        expect(n.futureChanges).toEqual([]);
      },
    ],
    [
      'edit',
      'refused',
      (s, n) => {
        expect(n.present.levels).toHaveLength(3);
        expect(n.past).toEqual([...s.past, s.present]);
        expect(n.session.kind).toBe('idle');
      },
    ],
    ['edit', 'confirming', (s, n) => expect(n).toBe(s)],
    ['refuse', 'idle', (s, n) => expect(n).toEqual({ ...s, session: { kind: 'refused', lines: ['Again.'] } })],
    ['refuse', 'refused', (s, n) => expect(n).toEqual({ ...s, session: { kind: 'refused', lines: ['Again.'] } })],
    ['refuse', 'confirming', (s, n) => expect(n).toBe(s)],
    ['confirm', 'idle', (s, n) => expect(n).toBe(s)],
    ['confirm', 'refused', (s, n) => expect(n).toBe(s)],
    [
      'confirm',
      'confirming',
      (s, n) =>
        expect(n).toEqual({
          past: [...s.past, s.present],
          present: previewed,
          future: [],
          session: { kind: 'idle' },
          change: 'Weaker',
          pastChanges: [undefined, 'Level 2'],
          futureChanges: [],
        }),
    ],
    ['cancel', 'idle', (s, n) => expect(n).toBe(s)],
    ['cancel', 'refused', (s, n) => expect(n).toBe(s)],
    ['cancel', 'confirming', (s, n) => expect(n).toEqual({ ...s, session: { kind: 'idle' } })],
    ['dismiss', 'idle', (s, n) => expect(n).toBe(s)],
    ['dismiss', 'refused', (s, n) => expect(n).toEqual({ ...s, session: { kind: 'idle' } })],
    ['dismiss', 'confirming', (s, n) => expect(n).toBe(s)],
    [
      'undo',
      'idle',
      (_, n) =>
        expect(n).toEqual({
          past: [],
          present: before,
          future: [now, after],
          session: { kind: 'idle' },
          change: undefined,
          pastChanges: [],
          futureChanges: ['Level 2', 'Level 3'],
        }),
    ],
    [
      'undo',
      'refused',
      (_, n) =>
        expect(n).toEqual({
          past: [],
          present: before,
          future: [now, after],
          session: { kind: 'idle' },
          change: undefined,
          pastChanges: [],
          futureChanges: ['Level 2', 'Level 3'],
        }),
    ],
    ['undo', 'confirming', (s, n) => expect(n).toEqual({ ...s, session: { kind: 'idle' } })],
    [
      'redo',
      'idle',
      (_, n) =>
        expect(n).toEqual({
          past: [before, now],
          present: after,
          future: [],
          session: { kind: 'idle' },
          change: 'Level 3',
          pastChanges: [undefined, 'Level 2'],
          futureChanges: [],
        }),
    ],
    [
      'redo',
      'refused',
      (_, n) =>
        expect(n).toEqual({
          past: [before, now],
          present: after,
          future: [],
          session: { kind: 'idle' },
          change: 'Level 3',
          pastChanges: [undefined, 'Level 2'],
          futureChanges: [],
        }),
    ],
    ['redo', 'confirming', (s, n) => expect(n).toBe(s)],
    [
      'replace',
      'idle',
      (_, n) =>
        expect(n).toEqual({
          past: [before, now],
          present: cleaver,
          future: [],
          session: { kind: 'idle' },
          change: OPENED_A_LINK,
          pastChanges: [undefined, 'Level 2'],
          futureChanges: [],
        }),
    ],
    [
      'replace',
      'refused',
      (_, n) =>
        expect(n).toEqual({
          past: [before, now],
          present: cleaver,
          future: [],
          session: { kind: 'idle' },
          change: OPENED_A_LINK,
          pastChanges: [undefined, 'Level 2'],
          futureChanges: [],
        }),
    ],
    [
      'replace',
      'confirming',
      (_, n) =>
        expect(n).toEqual({
          past: [before, now],
          present: cleaver,
          future: [],
          session: { kind: 'idle' },
          change: OPENED_A_LINK,
          pastChanges: [undefined, 'Level 2'],
          futureChanges: [],
        }),
    ],
    ['reset', 'idle', (_, n) => expect(n).toEqual(plannerAt(cleaver))],
    ['reset', 'refused', (_, n) => expect(n).toEqual(plannerAt(cleaver))],
    ['reset', 'confirming', (_, n) => expect(n).toEqual(plannerAt(cleaver))],
  ];
  const actions: Readonly<Record<PlannerAction['kind'], PlannerAction>> = {
    edit: { kind: 'edit', edit: ADD_LEVEL, title: 'Add level 3' },
    refuse: { kind: 'refuse', lines: ['Again.'] },
    confirm: { kind: 'confirm' },
    cancel: { kind: 'cancel' },
    dismiss: { kind: 'dismiss' },
    undo: { kind: 'undo' },
    redo: { kind: 'redo' },
    replace: { kind: 'replace', build: cleaver },
    reset: { kind: 'reset', build: cleaver },
  };

  test.each(cells)('%s while %s', (action, kind, check) => {
    const s = states[kind];
    check(s, run(s, actions[action]));
  });

  test('every cell of the table is covered', () => {
    expect(cells).toHaveLength(Object.keys(actions).length * Object.keys(states).length);
  });
});

describe('PlannerState: edit outcomes and the rest of the rules', () => {
  test('an edit that breaks later picks, mendable by clearing them, waits on the preview', () => {
    const n = run(plannerAt(cleaver), { kind: 'edit', edit: WEAKER, title: 'Strength score' });
    expect(outcomeOf(n)).toBe('confirming');
    expect(n.present).toBe(cleaver);
    expect(n.session.kind === 'confirming' && n.session.pending.clears).toEqual([
      { name: 'Power Attack', place: 'Level 1' },
      { name: 'Cleave', place: 'Level 1' },
    ]);
  });

  test('an edit nothing mends is refused in R’s words, and a later applied edit replaces the refusal', () => {
    const n = run(plannerAt(cleaver), { kind: 'edit', edit: EARLY_INCREASE, title: 'Increase Strength' });
    expect(outcomeOf(n)).toBe('refused');
    expect(n.session.kind === 'refused' && n.session.lines[0]).toBe('That change can’t be made. It would break:');
    const applied = run(n, { kind: 'edit', edit: ADD_LEVEL, title: 'Add level 2' });
    expect(outcomeOf(applied)).toBe('applied');
    expect(applied.session.kind).toBe('idle');
  });

  test('a refused class names the prerequisites it misses (audit)', () => {
    const n = run(plannerAt(cleaver), {
      kind: 'edit',
      edit: { kind: 'class', level: 1, class: '9c935a076d4fe4d4999fd48d853e3cf3' },
      title: 'Level 1 as Arcane Trickster',
    });
    expect(outcomeOf(n)).toBe('refused');
    const line = n.session.kind === 'refused' ? n.session.lines.find((l) => l.startsWith('Level 1:')) : undefined;
    expect(line).toMatch(/^Level 1: The class's prerequisites aren't met: .*Needs /);
  });

  test('undo and redo with nothing to walk leave the state as it is', () => {
    const s = plannerAt(cleaver);
    expect(run(s, { kind: 'undo' })).toBe(s);
    expect(run(s, { kind: 'redo' })).toBe(s);
  });

  test('replace with the same Build, picks in another order, is skipped', () => {
    const s = plannerAt(cleaver);
    expect(run(s, { kind: 'replace', build: { ...cleaver, picks: [...cleaver.picks].reverse() } })).toBe(s);
  });
});

describe('impossible states do not type-check', () => {
  test('the unions hold no impossible state', () => {
    expectTypeOf<Extract<View, { kind: 'single' }>>().not.toHaveProperty('side');
    expectTypeOf<{ kind: 'forked'; layout: 'both'; side: 'second' }>().toExtend<View>();
    expectTypeOf<{ kind: 'refused'; lines: readonly [] }>().not.toExtend<Session>();
    expectTypeOf<{ kind: 'refused'; lines: readonly ['Why.'] }>().toExtend<Session>();
    expectTypeOf<{ kind: 'current' }>().not.toExtend<ShareCode>();
    expectTypeOf<{ kind: 'current'; code: string }>().toExtend<ShareCode>();
    expectTypeOf<{ kind: 'didNotOpen'; reason: 'notACode' }>().not.toExtend<LinkStatus>();
    expectTypeOf<{ kind: 'didNotOpen'; on: 'paste'; reason: 'notACode' }>().toExtend<LinkStatus>();
  });

  test('the constructors return the value or undefined', () => {
    expectTypeOf(toRankLevel).returns.toEqualTypeOf<RankLevel | undefined>();
    expectTypeOf(toSkillRanks).returns.toEqualTypeOf<SkillRanks | undefined>();
    expectTypeOf(toAbilityScores).returns.toEqualTypeOf<AbilityScores | undefined>();
    expectTypeOf(toArchetypes).returns.toEqualTypeOf<Archetypes | undefined>();
  });

  test('a Build holds only values its code can', () => {
    expectTypeOf<number>().not.toExtend<Ascension['level']>();
    expectTypeOf<readonly [string, string]>().not.toExtend<ClassChoice['archetypes']>();
  });
});
