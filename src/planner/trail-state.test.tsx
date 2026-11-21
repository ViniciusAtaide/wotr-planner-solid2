import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { abilityScores, rankLevel, skillRanks, slotKey, toRankLevel, type Build, type SkillRanks } from '~engine/build';
import { cascade } from '~engine/edits';
import { readDataDir } from '~engine/data-dir';
import { jackInTheGreen } from '~engine/gold';
import { loadData } from '~engine/load';
import { engineOf, expectedLevel } from '~engine/mcp';
import { picker } from '~engine/pickers';
import { walk } from '~engine/walk';

import {
  atLevelCap,
  chapterOf,
  chapterRange,
  chapters,
  chapterSummary,
  characterEditing,
  characterFolded,
  characterSlots,
  firstCleared,
  folded,
  gearDependentSlots,
  keepsSelection,
  levelLine,
  levelOneDone,
  mythicDue,
  nextStep,
  reduceTrail,
  sameRanks,
  skillBudget,
  slotsAt,
  stepTitle,
  TRAIL_START,
  whereOf,
  type Step,
  type TrailState,
  type TrailView,
} from './trail-state';

const files = readDataDir(join(process.cwd(), 'data'));
const e = engineOf(loadData(files.files, files.overrides));

const HUMAN = '0a5d473ead98b0646b94495af250fdc4';
const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
const MYTHIC_HERO = '247aa787806d5da4f89cfc3dff0b217f';
const LEGEND = '3d420403f3e7340499931324640efe96';
const BASIC_FEAT_SELECTION = '247a4068296e8be42890143f451b4b45';
const FIGHTER_FEAT_SELECTION = '41c8486641f7d6d4283ca9dae4147a9f';
const POWER_ATTACK = '9972f33f977fc724c838e59641b2fca5';
const CLEAVE = 'd809b6c4ff2aaff4fa70d712a70f7d7b';
const SCORES = abilityScores({
  Strength: 13,
  Dexterity: 10,
  Constitution: 10,
  Intelligence: 10,
  Wisdom: 10,
  Charisma: 10,
});

const viewOf = (build: Build): TrailView => ({ data: e.data, build, walk: walk(e.data, build, e.G) });
type Left = Pick<TrailState, 'skillsLeft' | 'mythicLater'>;
const START: Left = { skillsLeft: new Set<number>(), mythicLater: undefined };
const next = (build: Build, s: Left = START): Step => nextStep(viewOf(build), s);

function filled(build: Build): Build {
  let b = build;
  for (;;) {
    const empty = walk(e.data, b, e.G).slots.find((s) => s.pick === undefined);
    if (empty === undefined) return b;
    const option = picker(e.data, b, empty.id, e.G)?.options.find((o) => o.shown && o.closed === undefined);
    if (option === undefined) throw new Error(`nothing open at ${slotKey(empty.id)}`);
    b = {
      ...b,
      picks: [...b.picks, { slot: empty.id, feature: option.feature, ...(option.param && { param: option.param }) }],
    };
  }
}

const human = (levels: number, skills?: SkillRanks): Build => ({
  race: HUMAN,
  scores: SCORES,
  levels: Array.from({ length: levels }, () => ({ class: FIGHTER, ...(skills && { skills }) })),
  picks: [],
});

describe('auto-advance: each pick opens the next empty one', () => {
  test('a fresh Build starts on the race', () => {
    const fresh: Build = { levels: [], picks: [] };
    expect(next(fresh)).toEqual({ kind: 'race' });
    expect(stepTitle(viewOf(fresh), { kind: 'race' })).toBe('Your character · choose a race');
    expect(whereOf(viewOf(fresh), { kind: 'race' })).toEqual({ kind: 'character' });
    const scoredOnly: Build = { scores: SCORES, levels: [], picks: [] };
    expect(next(scoredOnly)).toEqual({ kind: 'race' });
  });

  test('a Build with its race starts on the ability scores, then its first unfinished step after them', () => {
    const unscored: Build = { race: HUMAN, levels: [], picks: [] };
    expect(next(unscored)).toEqual({ kind: 'scores' });
    expect(stepTitle(viewOf(unscored), { kind: 'scores' })).toBe('Your character · set the ability scores');
    expect(whereOf(viewOf(unscored), { kind: 'scores' })).toEqual({ kind: 'scores' });
    const scored: Build = { scores: SCORES, race: HUMAN, levels: [], picks: [] };
    expect(next(scored)).toEqual({ kind: 'nextLevel' });
    expect(stepTitle(viewOf(scored), { kind: 'nextLevel' })).toBe('Begin · choose a first class');
    const levelled = human(1);
    expect(next(levelled)).toEqual({ kind: 'slot', slot: characterSlots(viewOf(levelled))[0]?.id });
  });

  test('a Build from a link with levels but no scores still starts on the ability scores', () => {
    const unscored = filled({ race: HUMAN, levels: [{ class: FIGHTER }, { class: FIGHTER }], picks: [] });
    expect(next(unscored)).toEqual({ kind: 'scores' });
  });

  test('the character’s choices come first, then the level’s, in the walk’s order', () => {
    const build = human(1);
    const view = viewOf(build);
    const character = characterSlots(view).map((s) => s.id.selection);
    expect(character[0]).toBe(BASIC_FEAT_SELECTION);
    const first = next(build);
    expect(first).toEqual({ kind: 'slot', slot: characterSlots(view)[0]?.id });
    expect(stepTitle(view, first)).toBe('Your character · choose feat');

    let b = build;
    for (const s of characterSlots(view)) {
      const option = picker(e.data, b, s.id, e.G)?.options.find((o) => o.shown && o.closed === undefined);
      if (option !== undefined) b = { ...b, picks: [...b.picks, { slot: s.id, feature: option.feature }] };
    }
    const level = next(b);
    expect(level.kind).toBe('slot');
    if (level.kind !== 'slot') return;
    expect(slotsAt(viewOf(b), { level: 1 }).map((s) => slotKey(s.id))).toContain(slotKey(level.slot));
    expect(stepTitle(viewOf(b), level)).toMatch(/^Level 1 · choose /);
  });

  test('with every choice made: the ability increase that is due, then the last level’s skills, then the next level', () => {
    const four = filled(human(4));
    expect(next(four)).toEqual({ kind: 'increase', level: 4 });
    const raised: Build = {
      ...four,
      levels: four.levels.map((l, i) => (i === 3 ? { ...l, increase: 'Strength' } : l)),
    };
    expect(next(raised)).toEqual({ kind: 'skills', level: 4 });
    expect(stepTitle(viewOf(raised), { kind: 'skills', level: 4 })).toBe('Level 4 · train your skills');
    const budget = skillBudget(viewOf(raised), 4).available;
    const spent: Build = {
      ...raised,
      levels: raised.levels.map((l, i) =>
        i === 3
          ? {
              ...l,
              skills:
                budget >= 2
                  ? skillRanks({ SkillAthletics: 1, SkillMobility: budget - 1 })
                  : skillRanks({ SkillAthletics: 1 }),
            }
          : l,
      ),
    };
    expect(next(spent)).toEqual({ kind: 'nextLevel' });
    expect(stepTitle(viewOf(spent), { kind: 'nextLevel' })).toBe('Onward to level 5');
  });

  test('a Mythic rank due by its Expected level comes before the next level, and Not now puts it off one level', () => {
    const at = expectedLevel(e.data, 1);
    expect(at).toBeGreaterThan(0);
    const levels = filled({ ...human(at), levels: human(at).levels.map((l) => ({ ...l })) });
    const view = viewOf(levels);
    const left: Left = { skillsLeft: new Set([at]), mythicLater: undefined };
    const raised: Build = {
      ...levels,
      levels: levels.levels.map((l, i) =>
        (view.walk.attributePoints[i] ?? 0) > 0 ? { ...l, increase: 'Strength' } : l,
      ),
    };
    expect(next(raised, left)).toEqual({ kind: 'mythic', rank: 1, at });
    expect(stepTitle(viewOf(raised), { kind: 'mythic', rank: 1, at })).toBe('Ascend to Mythic rank 1');
    expect(next(raised, { ...left, mythicLater: at })).toEqual({ kind: 'nextLevel' });
    expect(mythicDue(viewOf({ ...raised, levels: [...raised.levels, { class: FIGHTER }] }), at)).toEqual({
      rank: 1,
      at,
    });
    const level = toRankLevel(at);
    if (level === undefined) throw new Error('no rank level');
    const ranked: Build = { ...raised, ranks: [{ class: MYTHIC_HERO, level }] };
    const second = expectedLevel(e.data, 2);
    expect(mythicDue(viewOf(ranked), undefined)).toEqual(
      second > 0 && second <= at ? { rank: 2, at: second } : undefined,
    );
  });

  test('no rank is offered once the walk says the ranks have ended (Legend at rank 8)', () => {
    const ranks = jackInTheGreen.build.ranks ?? [];
    const upTo8 = (eighth: string): Build => ({
      ...jackInTheGreen.build,
      ranks: [...ranks.slice(0, 7), { class: eighth, level: ranks[7]?.level ?? rankLevel(19) }],
      picks: jackInTheGreen.build.picks.filter((p) => !('rank' in p.slot.place) || p.slot.place.rank < 8),
    });
    const legend = viewOf(upTo8(LEGEND));
    expect(legend.walk.ranksEnded).toBe(true);
    expect(mythicDue(legend, undefined)).toBeUndefined();
    const onward = viewOf(upTo8(ranks[7]?.class ?? MYTHIC_HERO));
    expect(onward.walk.ranksEnded).toBe(false);
    expect(mythicDue(onward, undefined)?.rank).toBe(9);
  });
});

describe('skills close on their budget or on Done', () => {
  test('the budget is the walk’s points for the level; the step stays open until they are spent', () => {
    const one = filled(human(1));
    const budget = skillBudget(viewOf(one), 1);
    expect(budget).toEqual({ spent: 0, available: walk(e.data, one, e.G).skillPoints[0] });
    expect(budget.available).toBeGreaterThan(1);
    expect(next(one)).toEqual({ kind: 'skills', level: 1 });
    const partly: Build = { ...one, levels: [{ class: FIGHTER, skills: skillRanks({ SkillAthletics: 1 }) }] };
    expect(skillBudget(viewOf(partly), 1).spent).toBe(1);
    expect(next(partly)).toEqual({ kind: 'skills', level: 1 });
    const done = reduceTrail(TRAIL_START, { kind: 'leaveSkills', level: 1 });
    expect(next(partly, done)).toEqual({ kind: 'nextLevel' });
  });
});

describe('chapters and folding (phones only)', () => {
  test('chapters of four end on the milestone levels', () => {
    expect(chapters(9)).toEqual([1, 2, 3]);
    expect(chapterRange(2)).toEqual({ first: 5, last: 8 });
    expect([1, 4, 5, 8, 9].map(chapterOf)).toEqual([1, 1, 2, 2, 3]);
  });

  test('a finished chapter before the current step folds; the current one, an unfinished one and a tapped one don’t', () => {
    const v = { phone: true, levels: 13, here: 14, unfolded: new Set<number>() };
    expect([1, 2, 3, 4].map((n) => folded(n, v))).toEqual([true, true, true, false]);
    expect(folded(2, { ...v, here: 6 })).toBe(false);
    expect(folded(1, { ...v, here: 6 })).toBe(true);
    expect(folded(1, { ...v, phone: false })).toBe(false);
    const opened = reduceTrail(TRAIL_START, { kind: 'toggleChapter', chapter: 2 });
    expect(folded(2, { ...v, unfolded: opened.unfolded })).toBe(false);
    expect(folded(2, { ...v, unfolded: reduceTrail(opened, { kind: 'toggleChapter', chapter: 2 }).unfolded })).toBe(
      true,
    );
    expect(reduceTrail(opened, { kind: 'levelAdded' }).unfolded.size).toBe(0);
    const shown = reduceTrail(TRAIL_START, { kind: 'toggleClosed', list: 'pick' });
    expect(shown.closedShown.has('pick')).toBe(true);
    expect(reduceTrail(shown, { kind: 'levelAdded' }).closedShown.has('pick')).toBe(true);
    expect(reduceTrail(shown, { kind: 'toggleClosed', list: 'pick' }).closedShown.has('pick')).toBe(false);
  });

  test('level 1 is done once its every choice is made, not when it is added', () => {
    const added = human(1);
    expect(levelOneDone(viewOf(added), next(added))).toBe(false);
    const made = filled(added);
    const spent = { skillsLeft: new Set([1]), mythicLater: undefined };
    expect(levelOneDone(viewOf(made), next(made, spent))).toBe(true);
    expect(levelOneDone(viewOf(human(2)), next(human(2)))).toBe(true);
    expect(levelOneDone(viewOf({ levels: [], picks: [] }), { kind: 'nextLevel' })).toBe(false);
  });

  test('on a phone the card shrinks to one line once level 1 is done, unless opened or holding the step', () => {
    const v = { phone: true, levelOneDone: true, open: undefined, hereIsCharacter: false };
    expect(characterFolded(v)).toBe(true);
    expect(characterFolded({ ...v, levelOneDone: false })).toBe(false);
    expect(characterFolded({ ...v, open: true })).toBe(false);
    expect(characterFolded({ ...v, hereIsCharacter: true })).toBe(false);
    expect(characterFolded({ ...v, phone: false })).toBe(false);
    expect(characterEditing({ phone: true, levelOneDone: false, open: undefined })).toBe(true);
    expect(characterEditing({ phone: true, levelOneDone: true, open: undefined })).toBe(false);
    expect(characterEditing({ phone: true, levelOneDone: true, open: true })).toBe(true);
  });

  test('from 900 px wide the card never folds and keeps its controls', () => {
    expect(characterEditing({ phone: false, levelOneDone: true, open: undefined })).toBe(true);
    expect(characterEditing({ phone: false, levelOneDone: true, open: false })).toBe(true);
  });
});

describe('editing and the Cascade', () => {
  test('a Cascade lands on the first pick it cleared', () => {
    const feat = { place: { level: 1 }, selection: BASIC_FEAT_SELECTION, index: 0 };
    const bonus = { place: { level: 1 }, selection: FIGHTER_FEAT_SELECTION, index: 0 };
    const cleaver: Build = {
      scores: SCORES,
      levels: [{ class: FIGHTER }],
      picks: [
        { slot: feat, feature: POWER_ATTACK },
        { slot: bonus, feature: CLEAVE },
      ],
    };
    const c = cascade(e.data, cleaver, { kind: 'scores', scores: abilityScores({ ...SCORES, Strength: 10 }) }, e.G);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const landed = firstCleared(cleaver, viewOf(c.build));
    expect(landed && slotKey(landed)).toBe(slotKey(feat));
    expect(firstCleared(cleaver, viewOf(cleaver))).toBeUndefined();
  });

  test('skills, a rank and Gear stay open after an edit; a pick, an increase and a level go back to the next choice', () => {
    expect(keepsSelection({ kind: 'skills', level: 2 })).toBe(true);
    expect(keepsSelection({ kind: 'rank', rank: 1 })).toBe(true);
    expect(keepsSelection({ kind: 'gear' })).toBe(true);
    expect(keepsSelection({ kind: 'increase', level: 4 })).toBe(false);
    expect(keepsSelection({ kind: 'level', level: 1 })).toBe(false);
    expect(keepsSelection(undefined)).toBe(false);
  });
});

describe('QA pass 1', () => {
  const DODGE = '97e216dbb46ae3c4faef90cf6bbe6fd5';
  const DEX_BELT = 'b6af4c1834999e74497b41588d1071cd';

  test('a pick taken through Gear is marked where the trail names it (ADR 0002)', () => {
    const slot = { place: { level: 1 }, selection: FIGHTER_FEAT_SELECTION, index: 0 };
    const dodge = (countGear: boolean): Build => ({
      scores: abilityScores({ ...SCORES, Dexterity: 12 }),
      levels: [{ class: FIGHTER }],
      gear: { Belt: DEX_BELT },
      countGear,
      picks: [{ slot, feature: DODGE }],
    });
    const counted = viewOf(dodge(true));
    expect(gearDependentSlots(counted).has(slotKey(slot))).toBe(true);
    expect(levelLine(counted, 1)).toContain('Dodge (Gear)');
    expect(levelLine(viewOf(dodge(false)), 1)).not.toContain('(Gear)');
  });

  test('at the level cap a due rank is offered even after Not now, and a finished Build ends complete', () => {
    expect(atLevelCap(viewOf(human(20)))).toBe(true);
    expect(atLevelCap(viewOf(human(19)))).toBe(false);
    expect(mythicDue(viewOf(human(19)), 19)).toBeUndefined();
    expect(mythicDue(viewOf(human(20)), 20)?.rank).toBe(1);
    const finished = filled(jackInTheGreen.build);
    const done = next(finished, { skillsLeft: new Set([20]), mythicLater: undefined });
    expect(done).toEqual({ kind: 'complete' });
    expect(whereOf(viewOf(finished), done)).toEqual({ kind: 'end' });
  });

  test('a Cascade’s cleared skill ranks get a trail step until spent or left (QA pass 2)', () => {
    const two = filled(human(2, skillRanks({ SkillAthletics: 1 })));
    const cleared: Build = { ...two, levels: two.levels.map((l, i) => (i === 0 ? { class: l.class } : l)) };
    const s = reduceTrail(TRAIL_START, { kind: 'skillsCleared', levels: [1] });
    expect(nextStep(viewOf(cleared), { ...s, skillsLeft: new Set([2]) })).toEqual({ kind: 'skills', level: 1 });
    const left = reduceTrail(s, { kind: 'leaveSkills', level: 1 });
    expect(nextStep(viewOf(cleared), { ...left, skillsLeft: new Set([...left.skillsLeft, 2]) }).kind).not.toBe(
      'skills',
    );
  });

  test('a folded chapter counts its levels per class so they do not read as a class level', () => {
    expect(chapterSummary(viewOf(human(4)), 1).classes).toBe('Fighter ×4');
  });

  test('two levels hold the same skills whatever the key order', () => {
    expect(
      sameRanks(
        skillRanks({ SkillAthletics: 1, SkillMobility: 1 }),
        skillRanks({ SkillMobility: 1, SkillAthletics: 1 }),
      ),
    ).toBe(true);
    expect(sameRanks(skillRanks({ SkillAthletics: 1 }), skillRanks({ SkillMobility: 1 }))).toBe(false);
    expect(sameRanks({}, {})).toBe(true);
  });
});
