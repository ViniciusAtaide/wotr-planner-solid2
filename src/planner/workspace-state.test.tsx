import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { abilityScores, sameBuild, type Build, type SlotId } from '~engine/build';
import { decodeBuild, encodeBuild } from '~engine/codec';
import type { BlueprintCharacterClass } from '~engine/data';
import { readDataDir } from '~engine/data-dir';
import type { Edit } from '~engine/edits';
import { loadData } from '~engine/load';
import { engineOf } from '~engine/mcp';
import { picker } from '~engine/pickers';
import { walk } from '~engine/walk';

import { EMPTY } from './link';
import { plannerAt, type PlannerAction, type PlannerState, type Session } from './planner-state';
import {
  edited,
  LINK_OK,
  reducePage,
  reduceWorkspace,
  resolve,
  sameSelection,
  shown,
  workspaceAt,
  type Page,
  type PageAction,
  type Selection,
  type Side,
  type View,
  type WorkspaceState,
} from './workspace-state';

const files = readDataDir(join(process.cwd(), 'data'));
const e = engineOf(loadData(files.files, files.overrides));

const classNamed = (name: string) =>
  [...e.data.blueprints.values()].find(
    (bp) => bp.$type === 'BlueprintCharacterClass' && bp.name === name && !(bp as BlueprintCharacterClass).IsMythic,
  )?.guid ?? '';
const FIGHTER = classNamed('Fighter');
const WIZARD = classNamed('Wizard');
const POWER_ATTACK = '9972f33f977fc724c838e59641b2fca5';
const CLEAVE = 'd809b6c4ff2aaff4fa70d712a70f7d7b';
const TOUGHNESS = 'd09b20029e9abfe4480b356c92095623';
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
const CONFIRMING: Session = {
  kind: 'confirming',
  pending: { title: 'Weaker', summary: 'Clears picks.', clears: [], build: EMPTY },
};

const slotsOf = (b: Build): readonly SlotId[] => walk(e.data, b, e.G).slots.map((s) => s.id);
const forkedView = (side: Side, layout: 'one' | 'both' = 'both'): View => ({ kind: 'forked', layout, side });
const ws = (view: View, selection?: Selection): WorkspaceState => ({ view, selection, link: LINK_OK });
const page = (workspace: WorkspaceState, first: PlannerState, second: PlannerState): Page => ({
  workspace,
  first,
  second,
});
const resolvedOn = (p: Page) => {
  const build = p[edited(p.workspace.view)].present;
  return resolve(p.workspace.selection, build, slotsOf(build));
};

describe('WorkspaceState', () => {
  test('fork, from one Build only: the second Build is a fresh copy, shown side by side and edited', () => {
    const first: PlannerState = { ...plannerAt(levelled(2)), past: [cleaver] };
    const second = plannerAt(levelled(3));
    const forked = reducePage(e, page(ws({ kind: 'single' }), first, second), { kind: 'fork' });
    expect(forked.workspace.view).toEqual({ kind: 'forked', layout: 'both', side: 'second' });
    expect(forked.second).toEqual(plannerAt(levelled(2)));
    expect(forked.first).toBe(first);
    expect(reducePage(e, forked, { kind: 'fork' })).toBe(forked);
  });

  test('close keeps the first Build when the first is edited', () => {
    const first: PlannerState = { ...plannerAt(levelled(2)), past: [cleaver] };
    const before = page(ws(forkedView('first')), first, plannerAt(levelled(3)));
    const closed = reducePage(e, before, { kind: 'close' });
    expect(closed.workspace.view).toEqual({ kind: 'single' });
    expect(closed.first).toBe(first);
  });

  test('close keeps the second Build, history and all, when the second is edited', () => {
    const second: PlannerState = {
      past: [cleaver, levelled(2)],
      present: levelled(3),
      future: [levelled(4)],
      session: { kind: 'idle' },
      change: 'Level 3',
      pastChanges: [undefined, 'Level 2'],
      futureChanges: ['Level 4'],
    };
    const closed = reducePage(e, page(ws(forkedView('second')), plannerAt(cleaver), second), { kind: 'close' });
    expect(closed.workspace.view).toEqual({ kind: 'single' });
    expect(closed.first).toBe(second);
  });

  test('a side switch, fork and close are refused while the edited Build waits on the preview', () => {
    const s = ws(forkedView('second', 'one'), { kind: 'gear' });
    expect(reduceWorkspace(s, { kind: 'show', layout: 'one', side: 'first' }, 'confirming')).toBe(s);
    expect(
      reduceWorkspace(s, { kind: 'select', selection: { kind: 'skills', level: 1 }, side: 'first' }, 'confirming'),
    ).toBe(s);
    expect(reduceWorkspace(s, { kind: 'close' }, 'confirming')).toBe(s);
    const single = ws({ kind: 'single' });
    expect(reduceWorkspace(single, { kind: 'fork' }, 'confirming')).toBe(single);
    expect(reduceWorkspace(s, { kind: 'show', layout: 'both', side: 'second' }, 'confirming').view).toEqual(
      forkedView('second', 'both'),
    );
    expect(reduceWorkspace(s, { kind: 'show', layout: 'one', side: 'first' }, 'idle').view).toEqual(
      forkedView('first', 'one'),
    );
    const confirming = page(s, plannerAt(cleaver), { ...plannerAt(cleaver), session: CONFIRMING });
    expect(reducePage(e, confirming, { kind: 'show', layout: 'one', side: 'first' })).toBe(confirming);
  });

  test('show and close do nothing while one Build shows', () => {
    const single = ws({ kind: 'single' });
    expect(reduceWorkspace(single, { kind: 'show', layout: 'both', side: 'second' }, 'idle')).toBe(single);
    expect(reduceWorkspace(single, { kind: 'close' }, 'idle')).toBe(single);
  });

  test('both Builds show side by side on a desktop, and only the edited one on a phone', () => {
    expect(shown(forkedView('second'), false)).toEqual(['first', 'second']);
    expect(shown(forkedView('second'), true)).toEqual(['second']);
    expect(shown(forkedView('first', 'one'), false)).toEqual(['first']);
    expect(shown({ kind: 'single' }, true)).toEqual(['first']);
  });

  test('a link that opens resets a link that did not, and replaces the edited Build', () => {
    const failed: WorkspaceState = {
      ...ws(forkedView('second')),
      link: { kind: 'didNotOpen', on: 'paste', reason: 'notACode' },
    };
    const opened = reducePage(e, page(failed, plannerAt(cleaver), plannerAt(cleaver)), {
      kind: 'linkOpened',
      build: levelled(2),
    });
    expect(opened.workspace.link).toEqual({ kind: 'ok' });
    expect(opened.second.present).toEqual(levelled(2));
    expect(opened.second.past).toEqual([cleaver]);
    expect(opened.first.present).toBe(cleaver);
  });

  test('dismissLink sets the link status back to ok; edits leave it', () => {
    const failed = reduceWorkspace(
      ws({ kind: 'single' }),
      { kind: 'linkFailed', on: 'load', reason: 'otherData' },
      'idle',
    );
    expect(failed.link).toEqual({ kind: 'didNotOpen', on: 'load', reason: 'otherData' });
    const edited = reducePage(e, page(failed, plannerAt(cleaver), plannerAt(EMPTY)), {
      kind: 'planner',
      action: { kind: 'edit', edit: ADD_LEVEL, title: 'Add level 2' },
    });
    expect(edited.first.present.levels).toHaveLength(2);
    expect(edited.workspace.link).toBe(failed.link);
    expect(reduceWorkspace(failed, { kind: 'dismissLink' }, 'idle').link).toEqual({ kind: 'ok' });
  });

  test('a link that opens closes any open step (QA, flat lists)', () => {
    const open = { ...workspaceAt(cleaver, LINK_OK), selection: { kind: 'race' } as const };
    expect(reduceWorkspace(open, { kind: 'linkOpened' }, 'idle').selection).toBeUndefined();
  });

  test('sameSelection compares by kind and key', () => {
    expect(sameSelection({ kind: 'slot', slot: FEAT }, { kind: 'slot', slot: { ...FEAT } })).toBe(true);
    expect(sameSelection({ kind: 'slot', slot: FEAT }, { kind: 'slot', slot: BONUS_COMBAT_FEAT })).toBe(false);
    expect(sameSelection({ kind: 'level', level: 2 }, { kind: 'rank', rank: 2 })).toBe(false);
    expect(sameSelection(undefined, undefined)).toBe(true);
    expect(sameSelection({ kind: 'gear' }, undefined)).toBe(false);
  });
});

describe('resolve: a selection whose target is gone resolves to undefined', () => {
  const single = (selection: Selection, first: PlannerState) =>
    page(ws({ kind: 'single' }, selection), first, plannerAt(EMPTY));

  test('after dropLevel', () => {
    const p = single({ kind: 'level', level: 2 }, plannerAt(levelled(2)));
    expect(resolvedOn(p)).toEqual({ kind: 'level', level: 2 });
    const dropped = reducePage(e, p, {
      kind: 'planner',
      action: { kind: 'edit', edit: { kind: 'dropLevel' }, title: 'Remove level 2' },
    });
    expect(dropped.first.present.levels).toHaveLength(1);
    expect(resolvedOn(dropped)).toBeUndefined();
  });

  test('after undo', () => {
    const added = reducePage(e, single({ kind: 'level', level: 2 }, plannerAt(cleaver)), {
      kind: 'planner',
      action: { kind: 'edit', edit: ADD_LEVEL, title: 'Add level 2' },
    });
    expect(resolvedOn(added)).toEqual({ kind: 'level', level: 2 });
    expect(resolvedOn(reducePage(e, added, { kind: 'planner', action: { kind: 'undo' } }))).toBeUndefined();
  });

  test('after a class change', () => {
    const selection: Selection = { kind: 'slot', slot: BONUS_COMBAT_FEAT };
    expect(resolve(selection, cleaver, slotsOf(cleaver))).toBe(selection);
    const wizard: Build = { ...cleaver, levels: [{ class: WIZARD }], picks: [] };
    expect(resolve(selection, wizard, slotsOf(wizard))).toBeUndefined();
  });

  test('after replace', () => {
    const p = single({ kind: 'level', level: 3 }, plannerAt(levelled(3)));
    expect(resolvedOn(reducePage(e, p, { kind: 'linkOpened', build: cleaver }))).toBeUndefined();
  });

  test('after a side switch', () => {
    const p = page(ws(forkedView('first'), { kind: 'level', level: 2 }), plannerAt(levelled(2)), plannerAt(cleaver));
    expect(resolvedOn(p)).toEqual({ kind: 'level', level: 2 });
    expect(resolvedOn(reducePage(e, p, { kind: 'show', layout: 'one', side: 'second' }))).toBeUndefined();
  });
});

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EDITS: readonly Edit[] = [
  ADD_LEVEL,
  { kind: 'dropLevel' },
  WEAKER,
  { kind: 'scores', scores: abilityScores(SCORES) },
  { kind: 'increase', level: 1, increase: 'Strength' },
  { kind: 'pick', slot: FEAT, pick: { feature: TOUGHNESS } },
  { kind: 'pick', slot: FEAT, pick: { feature: POWER_ATTACK } },
  { kind: 'class', level: 1, class: WIZARD },
];
const SELECTIONS: readonly (Selection | undefined)[] = [
  undefined,
  { kind: 'gear' },
  { kind: 'increase', level: 1 },
  { kind: 'skills', level: 2 },
  { kind: 'level', level: 1 },
  { kind: 'level', level: 3 },
  { kind: 'rank', rank: 1 },
  { kind: 'slot', slot: FEAT },
  { kind: 'slot', slot: BONUS_COMBAT_FEAT },
];
const LINKED: readonly Build[] = [cleaver, levelled(2), EMPTY];
const SIDES: readonly Side[] = ['first', 'second'];

function randomAction(next: () => number): PageAction {
  const one = <T,>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)] as T;
  const planner = (action: PlannerAction): PageAction => ({ kind: 'planner', action });
  const makers: readonly (() => PageAction)[] = [
    () => planner({ kind: 'edit', edit: one(EDITS), title: 'An edit' }),
    () => planner({ kind: 'edit', edit: one(EDITS), title: 'An edit' }),
    () => planner({ kind: 'refuse', lines: ['Refused.'] }),
    () => planner({ kind: 'confirm' }),
    () => planner({ kind: 'cancel' }),
    () => planner({ kind: 'dismiss' }),
    () => planner({ kind: 'undo' }),
    () => planner({ kind: 'redo' }),
    () => ({ kind: 'select', selection: one(SELECTIONS), ...(next() < 0.5 && { side: one(SIDES) }) }),
    () => ({ kind: 'show', layout: next() < 0.5 ? 'one' : 'both', side: one(SIDES) }),
    () => ({ kind: 'fork' }),
    () => ({ kind: 'close' }),
    () => ({ kind: 'linkOpened', build: one(LINKED) }),
    () => ({ kind: 'linkFailed', on: 'paste', reason: 'notACode' }),
    () => ({ kind: 'dismissLink' }),
  ];
  return one(makers)();
}

function exists(selection: Selection, build: Build): boolean {
  switch (selection.kind) {
    case 'slot':
      return picker(e.data, build, selection.slot, e.G) !== undefined;
    case 'level':
    case 'increase':
    case 'skills':
      return build.levels[selection.level - 1] !== undefined;
    case 'rank':
      return build.ranks?.[selection.rank - 1] !== undefined;
    case 'gear':
    case 'scores':
    case 'race':
      return true;
  }
}

describe('random action sequences over both reducers and the glue', () => {
  test.each([1, 7, 42, 2026])('seed %i', { timeout: 120_000 }, async (seed) => {
    const next = seeded(seed);
    let p: Page = { workspace: workspaceAt(cleaver, LINK_OK), first: plannerAt(cleaver), second: plannerAt(EMPTY) };
    let phone = false;
    for (let step = 0; step < 60; step++) {
      if (next() < 0.1) phone = !phone;
      const action = randomAction(next);
      p = reducePage(e, p, action);
      const where = `seed ${seed}, step ${step}, ${JSON.stringify(action)}`;
      const side = edited(p.workspace.view);
      const others = SIDES.filter((s) => s !== side);
      expect(
        others.filter((s) => p[s].session.kind === 'confirming'),
        where,
      ).toEqual([]);
      expect(shown(p.workspace.view, phone), where).toContain(side);
      for (const s of SIDES) {
        const present = p[s].present;
        expect(sameBuild(await decodeBuild(e.data, await encodeBuild(e.data, present)), present), where).toBe(true);
      }
      const r = resolvedOn(p);
      if (r !== undefined) expect(exists(r, p[side].present), where).toBe(true);
    }
  });
});
