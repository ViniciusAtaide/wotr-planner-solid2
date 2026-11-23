import { join } from 'node:path';
import { describe, expect, expectTypeOf, test } from 'vitest';
import {
  childSlot,
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
import { jackInTheGreen } from '~engine/gold';
import { engineOf } from '~engine/mcp';
import { nameOf } from '~engine/refusals';

import {
  brokenWords,
  clearsList,
  clearsSummary,
  OPENED_A_LINK,
  outcomeOf,
  plannerAt,
  reducePlanner,
  type PlannerAction,
  type PlannerState,
  type Session,
} from './planner-state';
import type { ShareCode } from './share-code';
import type { LinkStatus } from './workspace-state';
import type { CheckedBuild } from '~engine/edits';

const trusted = (b: Build): CheckedBuild => b as CheckedBuild;

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
  pending: { title: 'Weaker', summary: 'Clears picks.', clears: [], clearedSkills: [], build: trusted(previewed) },
};
const at = (session: Session): PlannerState => ({
  past: [trusted(before)],
  present: trusted(now),
  future: [trusted(after)],
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
    [
      'edits',
      'idle',
      (s, n) => {
        expect(n.present.levels).toHaveLength(4);
        expect(n.past).toEqual([...s.past, s.present]);
        expect(n.future).toEqual([]);
        expect(n.session.kind).toBe('idle');
        expect(n.change).toBe('Add levels 3 and 4');
        expect(n.pastChanges).toEqual([undefined, 'Level 2']);
      },
    ],
    [
      'edits',
      'refused',
      (s, n) => {
        expect(n.present.levels).toHaveLength(4);
        expect(n.past).toEqual([...s.past, s.present]);
        expect(n.session.kind).toBe('idle');
      },
    ],
    ['edits', 'confirming', (s, n) => expect(n).toBe(s)],
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
  ];
  const actions: Readonly<Record<PlannerAction['kind'], PlannerAction>> = {
    edit: { kind: 'edit', edit: ADD_LEVEL, title: 'Add level 3' },
    edits: { kind: 'edits', edits: [ADD_LEVEL, ADD_LEVEL], title: 'Add levels 3 and 4' },
    refuse: { kind: 'refuse', lines: ['Again.'] },
    confirm: { kind: 'confirm' },
    cancel: { kind: 'cancel' },
    dismiss: { kind: 'dismiss' },
    undo: { kind: 'undo' },
    redo: { kind: 'redo' },
    replace: { kind: 'replace', build: trusted(cleaver) },
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
  test('an edit that changes nothing adds no history entry, for one edit or several (QA pass 1)', () => {
    const good = run(plannerAt(trusted(cleaver)), {
      kind: 'edit',
      edit: { kind: 'alignment', alignment: 'LawfulGood' },
      title: 'Good',
    });
    expect(good.past).toHaveLength(1);
    const again = run(good, { kind: 'edit', edit: { kind: 'alignment', alignment: 'LawfulGood' }, title: 'Good' });
    expect(again.past).toHaveLength(1);
    expect(again.change).toBe('Good');
    expect(outcomeOf(again)).toBe('applied');
    const both = run(good, {
      kind: 'edits',
      edits: [
        { kind: 'alignment', alignment: 'LawfulGood' },
        { kind: 'alignment', alignment: 'LawfulGood' },
      ],
      title: 'Good twice',
    });
    expect(both.past).toHaveLength(1);
    const refused: PlannerState = { ...good, session: REFUSED };
    expect(
      run(refused, { kind: 'edit', edit: { kind: 'alignment', alignment: 'LawfulGood' }, title: 'Good' }).session,
    ).toEqual({
      kind: 'idle',
    });
  });

  test('a refusal names its reasons before the picks it would break (QA pass 2)', () => {
    const lines = brokenWords(e, cleaver, {
      picks: cleaver.picks,
      others: [
        {
          place: { level: 1 },
          choice: 'class',
          subject: cleaver.levels[0]?.class ?? '',
          rule: 'BlueprintCharacterClass.MeetsPrerequisites',
        },
      ],
    });
    expect(lines[0]).toMatch(/^Level 1: /);
    expect(lines.slice(1).every((l) => l.endsWith(' (Level 1)'))).toBe(true);
  });

  test('a reason the same at several levels shows once, with its levels (QA pass 6)', () => {
    const failure = (level: number) => ({
      place: { level },
      choice: 'class' as const,
      subject: cleaver.levels[0]?.class ?? '',
      rule: 'BlueprintCharacterClass.MeetsPrerequisites' as const,
    });
    const lines = brokenWords(e, cleaver, { picks: [], others: [failure(1), failure(2), failure(3), failure(5)] });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^Levels 1–3 and 5: /);
  });

  test('a preview words cleared picks, skill ranks and Mythic ranks together', () => {
    const clears = (cleared: number, clearedSkills: number[], clearedRanks: number[]) =>
      clearsSummary({
        kind: 'clears',
        build: trusted(cleaver),
        cleared: cleaver.picks.slice(0, cleared),
        clearedSkills,
        clearedRanks,
      });
    expect(clears(1, [3], [9, 10])).toBe(
      "This breaks 4 later choices: 1 later pick, the skill ranks of level 3 and Mythic ranks 9, 10. They'll be cleared, not moved.",
    );
    expect(clears(0, [3], [])).toBe("This breaks the skill ranks of level 3. It'll be cleared, not moved.");
    expect(clears(0, [], [9])).toBe("This breaks Mythic rank 9. It'll be cleared, not moved.");
  });

  test('a preview lists a nested pick as one row, under its parent’s name, and counts it once (QA pass 6)', () => {
    const parent = {
      slot: { place: { level: 2 }, selection: '247a4068296e8be42890143f451b4b45', index: 0 },
      feature: POWER_ATTACK,
    };
    const child = { slot: childSlot(parent.slot, POWER_ATTACK), feature: CLEAVE };
    const v = {
      kind: 'clears' as const,
      build: trusted(cleaver),
      cleared: [parent, child],
      clearedSkills: [],
      clearedRanks: [],
    };
    expect(clearsList(e, cleaver, v)).toEqual([{ name: 'Feat: Power Attack (Cleave)', place: 'Level 2' }]);
    expect(clearsSummary(v)).toBe("This breaks 1 later pick. It'll be cleared, not moved.");
  });

  test('a rank 8 switch that later ranks no longer follow lists them in the preview (QA pass 1)', () => {
    const GOLD_DRAGON = 'daf1235b6217787499c14e4e32142523';
    const DEVIL = '211f49705f478b3468db6daa802452a2';
    const ranks = jackInTheGreen.build.ranks ?? [];
    const gold: Build = {
      ...jackInTheGreen.build,
      ranks: ranks.map((r, i) => (i >= 7 ? { ...r, class: GOLD_DRAGON } : r)),
      picks: jackInTheGreen.build.picks.filter((p) => !('rank' in p.slot.place) || p.slot.place.rank <= 7),
    };
    const n = run(plannerAt(trusted(gold)), {
      kind: 'edit',
      edit: { kind: 'rankClass', rank: 8, class: DEVIL },
      title: 'Devil',
    });
    expect(n.session.kind).toBe('confirming');
    if (n.session.kind !== 'confirming') return;
    expect(n.session.pending.clears).toEqual(
      expect.arrayContaining([
        { name: nameOf(e.data, GOLD_DRAGON), place: 'Rank 9' },
        { name: nameOf(e.data, GOLD_DRAGON), place: 'Rank 10' },
      ]),
    );
    expect(n.session.pending.summary).toContain('Mythic ranks 9, 10');
    const at = (place: string) => {
      const [word, num] = place.split(' ');
      const k = Number(num);
      return word === 'Level' ? k : (gold.ranks?.[k - 1]?.level ?? 20) + k / 100;
    };
    const order = n.session.pending.clears.map((c) => at(c.place));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test('a preview that clears one pick says so in the singular (QA pass 1)', () => {
    const one: Build = { ...cleaver, picks: cleaver.picks.slice(0, 1) };
    const n = run(plannerAt(trusted(one)), { kind: 'edit', edit: WEAKER, title: 'Strength score' });
    expect(n.session.kind === 'confirming' && n.session.pending.clears).toHaveLength(1);
    expect(n.session.kind === 'confirming' && n.session.pending.summary).toBe(
      "This breaks 1 later pick. It'll be cleared, not moved.",
    );
  });

  test('an edit that breaks later picks, mendable by clearing them, waits on the preview', () => {
    const n = run(plannerAt(trusted(cleaver)), { kind: 'edit', edit: WEAKER, title: 'Strength score' });
    expect(outcomeOf(n)).toBe('confirming');
    expect(n.present).toBe(cleaver);
    expect(n.session.kind === 'confirming' && n.session.pending.clears).toEqual([
      { name: 'Power Attack', place: 'Level 1' },
      { name: 'Cleave', place: 'Level 1' },
    ]);
  });

  test('an edit nothing mends is refused in R’s words, and a later applied edit replaces the refusal', () => {
    const n = run(plannerAt(trusted(cleaver)), { kind: 'edit', edit: EARLY_INCREASE, title: 'Increase Strength' });
    expect(outcomeOf(n)).toBe('refused');
    expect(n.session.kind === 'refused' && n.session.lines[0]).toBe('That change can’t be made. It would break:');
    const applied = run(n, { kind: 'edit', edit: ADD_LEVEL, title: 'Add level 2' });
    expect(outcomeOf(applied)).toBe('applied');
    expect(applied.session.kind).toBe('idle');
  });

  test('a refused class names the prerequisites it misses (audit)', () => {
    const n = run(plannerAt(trusted(cleaver)), {
      kind: 'edit',
      edit: { kind: 'class', level: 1, class: '9c935a076d4fe4d4999fd48d853e3cf3' },
      title: 'Level 1 as Arcane Trickster',
    });
    expect(outcomeOf(n)).toBe('refused');
    const line = n.session.kind === 'refused' ? n.session.lines.find((l) => l.startsWith('Level 1:')) : undefined;
    expect(line).toMatch(/^Level 1: The class's prerequisites aren't met: .*Needs /);
  });

  test('undo and redo with nothing to walk leave the state as it is', () => {
    const s = plannerAt(trusted(cleaver));
    expect(run(s, { kind: 'undo' })).toBe(s);
    expect(run(s, { kind: 'redo' })).toBe(s);
  });

  test('replace with the same Build, picks in another order, is skipped', () => {
    const s = plannerAt(trusted(cleaver));
    expect(run(s, { kind: 'replace', build: trusted({ ...cleaver, picks: [...cleaver.picks].reverse() }) })).toBe(s);
  });
});

describe('impossible states do not type-check', () => {
  test('the unions hold no impossible state', () => {
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
