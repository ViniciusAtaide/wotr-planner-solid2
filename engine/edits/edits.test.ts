import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { abilityScores, placeKey, sameBuild, skillRanks, slotKey, toBuildName, type Build } from '../build';
import { loadData } from '../load';
import { readDataDir } from '../data-dir';
import { allows, apply, breaksOf, cascade, clearPicks, type Edit } from './edits';
import { enforcer, jackInTheGreen } from '../gold';
import { buildGrantIndex } from '../grants';
import { walk } from '../walk';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const data = loadData(files.files, files.overrides);
const G = buildGrantIndex(data);

const BASIC = '247a4068296e8be42890143f451b4b45';
const TOUGHNESS = 'd09b20029e9abfe4480b356c92095623';
const ARCANE_TRICKSTER_CLASS = '9c935a076d4fe4d4999fd48d853e3cf3';
const jackL5: Edit = {
  kind: 'pick',
  slot: { place: { level: 5 }, selection: BASIC, index: 0 },
  pick: { feature: TOUGHNESS },
};

const refusedKeys = (b: Build) =>
  new Set(
    walk(data, b, G).failures.map((f) => `${placeKey(f.place)} ${f.choice} ${f.slot ? slotKey(f.slot) : f.subject}`),
  );

describe('E: edits', { timeout: 30_000 }, () => {
  it('refuses a plain edit that breaks later picks, naming them', () => {
    const verdict = allows(data, jackInTheGreen.build, jackL5, G);
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? [] : verdict.picks.map((p) => placeKey(p.slot.place))).toEqual(['L15', 'M8']);
  });

  it('clears exactly what its preview lists, and leaves the Build possible', () => {
    const c = cascade(data, jackInTheGreen.build, jackL5, G);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.build).toEqual(
      clearPicks(
        apply(jackInTheGreen.build, jackL5),
        c.cleared.map((p) => p.slot),
      ),
    );
    expect(c.cleared.map((p) => placeKey(p.slot.place))).toEqual(['L15', 'M8']);
    expect(breaksOf(data, jackInTheGreen.build, c.build, G)).toEqual({ picks: [], others: [] });
  });

  it('cascades a gear-dependent pick when its Gear comes off (ADR 0002)', () => {
    const off: Edit = { kind: 'gear', place: 'Belt' };
    expect(allows(data, enforcer.build, off, G).ok).toBe(false);
    const c = cascade(data, enforcer.build, off, G);
    expect(c.ok ? c.cleared.map((p) => p.feature) : c).toEqual(['c126adbdf6ddd8245bda33694cd774e8']);
  });

  it('refuses a cascade whose break no cleared pick mends', () => {
    const c = cascade(data, jackInTheGreen.build, { kind: 'class', level: 1, class: ARCANE_TRICKSTER_CLASS }, G);
    expect(c.ok).toBe(false);
    expect(c.ok ? [] : c.others.map((f) => f.rule)).toContain('BlueprintCharacterClass.MeetsPrerequisites');
  });

  it.each([
    ['alignment', { kind: 'alignment', alignment: 'NeutralGood' } as Edit],
    ['a later Rank level', { kind: 'rankLevel', rank: 10, level: 20 } as Edit],
    [
      'a pick cleared',
      { kind: 'pick', slot: { place: { rank: 10 }, selection: '9ee0f6745f555484299b0a1563b99d81', index: 0 } } as Edit,
    ],
    ['a level’s class', { kind: 'class', level: 20, class: '48ac8db94d5de7645906c7d0ad3bcfbd' } as Edit],
  ])('leaves Jack possible after %s when allows accepts it', (_name, edit) => {
    const verdict = allows(data, jackInTheGreen.build, edit, G);
    const after = verdict.ok ? verdict.build : cascade(data, jackInTheGreen.build, edit, G);
    const build = 'build' in after ? after.build : undefined;
    if (build === undefined) return;
    const before = refusedKeys(jackInTheGreen.build);
    expect([...refusedKeys(build)].filter((k) => !before.has(k))).toEqual([]);
  });

  it('leaves out of a refused Cascade the skill budgets it would clear (QA pass 2)', () => {
    const DRAGON_DISCIPLE = '72051275b1dbb2d42ba9118237794f7c';
    const edit: Edit = { kind: 'class', level: 1, class: DRAGON_DISCIPLE };
    const strict = allows(data, enforcer.build, edit, G);
    expect(strict.ok ? [] : strict.others.map((f) => f.rule)).toContain('SpendSkillPoint.Check:points');
    const c = cascade(data, enforcer.build, edit, G);
    expect(c.ok).toBe(false);
    expect(c.ok ? [] : c.others.map((f) => f.rule)).toEqual(['BlueprintCharacterClass.MeetsPrerequisites']);
  });

  it('refuses an over-budget point buy on a Build with no levels yet (ticket 05d)', () => {
    const empty: Build = { levels: [], picks: [] };
    const allEighteen = abilityScores({
      Strength: 18,
      Dexterity: 18,
      Constitution: 18,
      Intelligence: 18,
      Wisdom: 18,
      Charisma: 18,
    });
    expect(allows(data, empty, { kind: 'scores', scores: allEighteen }, G).ok).toBe(false);
  });

  describe('a failure the Build already had (ticket 05d)', () => {
    const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
    const LOCKED_AMULET = '5043aad8b5815cc4a86f93c7ff2b50e3';
    const fighter = (n: number): Build => ({
      levels: Array.from({ length: n }, () => ({ class: FIGHTER })),
      picks: [],
      gear: { Neck: LOCKED_AMULET },
    });

    it('is not a fresh break when a level is added or removed', () => {
      expect(walk(data, fighter(2), G).failures).toContainEqual(
        expect.objectContaining({ choice: 'gear', subject: LOCKED_AMULET }),
      );
      expect(allows(data, fighter(2), { kind: 'addLevel', class: FIGHTER }, G).ok).toBe(true);
      expect(allows(data, fighter(2), { kind: 'dropLevel' }, G).ok).toBe(true);
    });
  });

  it('clears the later ranks a switch no longer allows, when rank 8 changes from Gold Dragon to Devil', () => {
    const GOLD_DRAGON = 'daf1235b6217787499c14e4e32142523';
    const DEVIL = '211f49705f478b3468db6daa802452a2';
    const ranks = jackInTheGreen.build.ranks ?? [];
    const gold: Build = {
      ...jackInTheGreen.build,
      ranks: ranks.map((r, i) => (i >= 7 ? { ...r, class: GOLD_DRAGON } : r)),
      picks: jackInTheGreen.build.picks.filter((p) => !('rank' in p.slot.place) || p.slot.place.rank <= 7),
    };
    expect(walk(data, gold, G).failures.filter((f) => 'rank' in f.place)).toEqual([]);
    const edit: Edit = { kind: 'rankClass', rank: 8, class: DEVIL };
    expect(allows(data, gold, edit, G).ok).toBe(false);
    const c = cascade(data, gold, edit, G);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.clearedRanks).toEqual([9, 10]);
    expect(c.build.ranks?.map((r) => r.class)).toEqual([...ranks.slice(0, 7).map((r) => r.class), DEVIL]);
    expect(walk(data, c.build, G).failures.filter((f) => 'rank' in f.place)).toEqual([]);
  });

  it("clears a level's skill ranks when a class change leaves it over its budget, and lists them", () => {
    const ROGUE = '299aa766dee3cbf4790da4efb8c72484';
    const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
    const rogue = cascade(data, jackInTheGreen.build, { kind: 'class', level: 3, class: ROGUE }, G);
    expect(rogue.ok).toBe(true);
    if (!rogue.ok) return;
    const own = rogue.build.levels[2]?.skills ?? {};
    const extra = ['SkillAthletics', 'SkillKnowledgeArcana', 'SkillPerception'];
    const spent: Build = {
      ...rogue.build,
      levels: rogue.build.levels.map((l, i) =>
        i === 2 ? { ...l, skills: skillRanks({ ...own, ...Object.fromEntries(extra.map((k) => [k, 1])) }) } : l,
      ),
    };
    expect(walk(data, spent, G).failures.filter((f) => f.choice === 'skills')).toEqual([]);
    const edit: Edit = { kind: 'class', level: 3, class: FIGHTER };
    const refused = allows(data, spent, edit, G);
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.others).toContainEqual(
      expect.objectContaining({ place: { level: 3 }, choice: 'skills', rule: 'SpendSkillPoint.Check:points' }),
    );
    const c = cascade(data, spent, edit, G);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.clearedSkills).toEqual([3]);
    expect(c.build.levels[2]?.skills).toBeUndefined();
    expect(c.build.levels[2]?.class).toBe(FIGHTER);
    expect(walk(data, c.build, G).failures.filter((f) => f.choice === 'skills')).toEqual([]);
  });

  it("drops a racial +2 the new race doesn't let you choose, so the Build can go on", () => {
    const HUMAN = '0a5d473ead98b0646b94495af250fdc4';
    const TIEFLING = '5c4e42124dc2b4647af6e36cf2590500';
    const human: Build = {
      ...jackInTheGreen.build,
      race: HUMAN,
      raceStat: 'Strength',
      levels: [],
      ranks: [],
      picks: [],
    };
    expect(walk(data, human, G).failures).toEqual([]);
    const edit: Edit = { kind: 'race', race: TIEFLING, raceStat: 'Strength' };
    const v = allows(data, human, edit, G);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.build.race).toBe(TIEFLING);
    expect(v.build.raceStat).toBeUndefined();
    expect(walk(data, v.build, G).failures).toEqual([]);
    const c = cascade(data, human, edit, G);
    expect(c.ok && c.build.raceStat).toBeUndefined();
    const back = allows(data, v.build, { kind: 'race', race: HUMAN, raceStat: 'Dexterity' }, G);
    expect(back.ok && back.build.raceStat).toBe('Dexterity');
  });

  it('renames a Build in one edit that never touches the walk', () => {
    const name = toBuildName('  Jack of the Green  ');
    expect(name).toBe('Jack of the Green');
    const rename: Edit = { kind: 'rename', ...(name && { name }) };
    const verdict = allows(data, jackInTheGreen.build, rename, G);
    expect(verdict).toEqual({ ok: true, build: { ...jackInTheGreen.build, name } });
    const c = cascade(data, jackInTheGreen.build, rename, G);
    expect(c).toEqual({
      ok: true,
      cleared: [],
      clearedSkills: [],
      clearedRanks: [],
      build: { ...jackInTheGreen.build, name },
    });
    const renamed = apply(jackInTheGreen.build, rename);
    expect(sameBuild(renamed, jackInTheGreen.build)).toBe(false);
    expect(walk(data, renamed, G).failures).toEqual(walk(data, jackInTheGreen.build, G).failures);
    expect(apply(renamed, { kind: 'rename' })).toEqual(jackInTheGreen.build);
  });
});
