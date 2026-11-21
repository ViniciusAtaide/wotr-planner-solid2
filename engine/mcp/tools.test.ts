import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { placeKey, slotKey, type Build, type Place } from '../build';
import { decodeBuild, encodeBuild } from '../codec';
import { loadData } from '../load';
import { readDataDir } from '../data-dir';
import { jackInTheGreen } from '../gold';
import { archetypeCount, buildNameLength, listNames, namesIn, rankLevelRange, skillRankRange } from '../refusals';
import { walk } from '../walk';
import {
  engineOf,
  equip,
  explain,
  level_up,
  next_slots,
  options,
  pick,
  place_rank,
  search,
  set_skills,
  set_start,
  sheet,
  start_build,
  type Changed,
  type ToolRefusal,
} from './tools';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const e = engineOf(loadData(files.files, files.overrides));

const SPELL_SPECIALIZATION_FIRST = 'f327a765a4353d04f872482ef3e48c35';
const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
const TWO_HANDED_FIGHTER_ARCHETYPE = '84643e02a764bff4a9c1aba333a53c89';
const MUTATION_WARRIOR_ARCHETYPE = '758e0061a077e54409a3bf0eb51511e5';
const jack: Build = {
  ...jackInTheGreen.build,
  picks: jackInTheGreen.build.picks.filter(
    (p) => p.feature !== SPELL_SPECIALIZATION_FIRST && p.slot.selection !== SPELL_SPECIALIZATION_FIRST,
  ),
};

function ok<T>(r: T | ToolRefusal, step: string): T {
  if (typeof r === 'object' && r !== null && 'refused' in r) throw new Error(`${step}: ${JSON.stringify(r)}`);
  return r;
}

function timeline(b: Build): Place[] {
  const out: Place[] = [];
  const ranks = b.ranks ?? [];
  let r = 0;
  for (let l = 1; l <= b.levels.length; l++) {
    out.push({ level: l });
    while (r < ranks.length && (ranks[r]?.level ?? 0) <= l) out.push({ rank: ++r });
  }
  return out;
}

describe('the MCP, end to end', { timeout: 30_000 }, () => {
  it('takes Jack-in-the-Green to level 20 and Mythic rank 10 through the tools alone', async () => {
    let step: Changed = await start_build(e);
    step = ok(
      await set_start(e, {
        code: step.code,
        ...(jack.race && { race: jack.race }),
        ...(jack.raceStat && { raceStat: jack.raceStat }),
        ...(jack.scores && { scores: jack.scores }),
        ...(jack.alignment && { alignment: jack.alignment }),
      }),
      'set_start',
    );
    const firstLevelOf = new Map<string, number>();
    jack.levels.forEach((l, i) => firstLevelOf.set(l.class, firstLevelOf.get(l.class) ?? i + 1));
    for (const place of timeline(jack)) {
      const at = placeKey(place);
      if ('level' in place) {
        const l = jack.levels[place.level - 1];
        if (l === undefined) throw new Error(at);
        const archetypes =
          firstLevelOf.get(l.class) === place.level ? jack.classChoices?.[l.class]?.archetypes : undefined;
        step = ok(
          await level_up(e, {
            code: step.code,
            class: l.class,
            ...(archetypes && { archetypes }),
            ...(l.increase && { increase: l.increase }),
          }),
          `${at} level_up`,
        );
        if (l.skills)
          step = ok(await set_skills(e, { code: step.code, level: place.level, ranks: l.skills }), `${at} skills`);
      } else {
        const r = jack.ranks?.[place.rank - 1];
        if (r === undefined) throw new Error(at);
        step = ok(await level_up(e, { code: step.code, class: r.class }), `${at} level_up`);
        step = ok(await place_rank(e, { code: step.code, rank: place.rank, level: r.level }), `${at} place_rank`);
      }
      for (const p of jack.picks.filter((q) => placeKey(q.slot.place) === at)) {
        const r = ok(
          await pick(e, { code: step.code, slot: p.slot, feature: p.feature, ...(p.param && { param: p.param }) }),
          `${at} pick ${slotKey(p.slot)}`,
        );
        if ('preview' in r) throw new Error('a strict pick never previews');
        step = r;
      }
      const opened = await decodeBuild(e.data, step.code);
      expect(await encodeBuild(e.data, opened)).toBe(step.code);
      expect(new Set(opened.picks.map((q) => JSON.stringify(q)))).toEqual(
        new Set(step.build.picks.map((q) => JSON.stringify(q))),
      );
    }
    for (const [place, item] of Object.entries(jack.gear ?? {})) {
      const r = ok(await equip(e, { code: step.code, place: place as never, item }), `equip ${place}`);
      if ('preview' in r) throw new Error('a strict equip never previews');
      step = r;
    }
    expect(step.build.levels).toHaveLength(20);
    expect(step.build.ranks).toHaveLength(10);
    expect(walk(e.data, step.build, e.G).failures).toEqual([]);
    expect(ok(await next_slots(e, { code: step.code }), 'next_slots').map((s) => s.place)).toContain('L11');
  }, 120_000);

  it('lists open options first, 25 a page, closed ones by reason, and refuses a closed pick with R’s words', async () => {
    const fighter = ok(
      await level_up(e, { code: (await start_build(e)).code, class: '48ac8db94d5de7645906c7d0ad3bcfbd' }),
      'level_up',
    );
    const slot = fighter.slots.find((s) => s.selection === 'Feat')?.slot;
    expect(slot).toBeDefined();
    if (slot === undefined) return;
    const listed = ok(await options(e, { code: fighter.code, slot }), 'options');
    expect(listed.open.length).toBe(25);
    expect(listed.openTotal).toBeGreaterThan(25);
    expect(Object.values(listed.closedByReason).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(listed.closed).toBeUndefined();
    expect(listed.pages).toBe(Math.ceil(listed.openTotal / 25));
    const closed1 = ok(await options(e, { code: fighter.code, slot, include_closed: true }), 'options');
    const closed2 = ok(await options(e, { code: fighter.code, slot, include_closed: true, page: 2 }), 'options');
    expect(closed1.closedTotal).toBeGreaterThan(25);
    expect(closed1.closed?.length).toBe(25);
    expect(closed2.closed?.map((o) => o.feature)).not.toEqual(closed1.closed?.map((o) => o.feature));
    expect(closed1.pages).toBe(Math.max(Math.ceil(closed1.openTotal / 25), Math.ceil(closed1.closedTotal / 25)));
    const refused = await pick(e, { code: fighter.code, slot, feature: '9972f33f977fc724c838e59641b2fca5' });
    expect(refused).toEqual({
      refused: true,
      reason: "Its prerequisites aren't met.",
      unmet: ['Needs Strength 13 (yours: 10).'],
    });
  });

  it('refuses a Rank level or skill ranks no Build code holds, with R’s words (ticket 05d)', async () => {
    const code = (await start_build(e)).code;
    const fighter = ok(await level_up(e, { code, class: '48ac8db94d5de7645906c7d0ad3bcfbd' }), 'level_up');
    const hero = ok(await level_up(e, { code: fighter.code, class: '247aa787806d5da4f89cfc3dff0b217f' }), 'rank');
    for (const level of [0, -1, 2.5, 300]) {
      expect(await place_rank(e, { code: hero.code, rank: 1, level })).toEqual({
        refused: true,
        reason: rankLevelRange(level),
      });
    }
    expect(await set_skills(e, { code: hero.code, level: 1, ranks: { SkillAthletics: -1 } })).toEqual({
      refused: true,
      reason: skillRankRange({ SkillAthletics: -1 }),
    });
    expect(ok(await place_rank(e, { code: hero.code, rank: 1, level: 1 }), 'place_rank').build.ranks?.[0]?.level).toBe(
      1,
    );
  });

  it('refuses two archetypes for one class with R’s words, as the level-up screen holds one (ticket 05d)', async () => {
    const code = (await start_build(e)).code;
    const archetypes = [TWO_HANDED_FIGHTER_ARCHETYPE, MUTATION_WARRIOR_ARCHETYPE];
    expect(await level_up(e, { code, class: FIGHTER, archetypes })).toEqual({
      refused: true,
      reason: archetypeCount(archetypes),
    });
    const one = ok(await level_up(e, { code, class: FIGHTER, archetypes: [TWO_HANDED_FIGHTER_ARCHETYPE] }), 'one');
    expect(one.build.classChoices?.[FIGHTER]?.archetypes).toEqual([TWO_HANDED_FIGHTER_ARCHETYPE]);
  });

  it('searches, explains and gives the sheet', async () => {
    expect(search(e, { text: 'power attack' }).hits.map((h) => h.guid)).toContain('9972f33f977fc724c838e59641b2fca5');
    const classes = search(e, { text: '', kind: 'classes' });
    expect(classes.total).toBeGreaterThan(50);
    expect(classes.hits.length).toBe(50);
    expect(classes.pages).toBe(Math.ceil(classes.total / 50));
    const rest = search(e, { text: '', kind: 'classes', page: 2 });
    expect([...classes.hits, ...rest.hits].map((h) => h.name)).toContain('Wizard');
    expect(explain(e, { guid: '9972f33f977fc724c838e59641b2fca5' })).toMatchObject({
      name: 'Power Attack',
      prerequisites: ['Needs Strength 13.'],
      summary: 'No summary yet.',
    });
    expect(explain(e, { guid: '06964d468fde1dc4aa71a92ea04d930d' })).toMatchObject({
      name: 'Combat Casting',
      summary: '+4 on concentration checks.',
      labels: [{ role: 'bonus', text: '+4 on concentration checks.' }],
    });
    const code = (await start_build(e)).code;
    const fighter = ok(await level_up(e, { code, class: '48ac8db94d5de7645906c7d0ad3bcfbd' }), 'level_up');
    expect(ok(await sheet(e, { code: fighter.code }), 'sheet')).toMatchObject({ level: 1, baseAttackBonus: 1 });
  });

  it("names a Build at its start, refuses a name over 60 characters in R's words, and shows the name on the sheet", async () => {
    const started = ok(await start_build(e, { name: '  Lann  ' }), 'start_build');
    expect((await decodeBuild(e.data, started.code)).name).toBe('Lann');
    const fighter = ok(
      await level_up(e, { code: started.code, class: '48ac8db94d5de7645906c7d0ad3bcfbd' }),
      'level_up',
    );
    expect(ok(await sheet(e, { code: fighter.code }), 'sheet')).toMatchObject({ name: 'Lann', level: 1 });
    expect(await start_build(e, { name: 'x'.repeat(61) })).toEqual({
      refused: true,
      reason: buildNameLength('x'.repeat(61)),
    });
    expect(buildNameLength('x'.repeat(61))).toBe("A Build's name is at most 60 characters, not 61.");
    expect(
      (await decodeBuild(e.data, ok(await start_build(e, { name: '  ' }), 'start_build').code)).name,
    ).toBeUndefined();
  });

  it('names a list bare, qualifying only names that collide in it (QA pass 2)', () => {
    const SEIZE_FEATURE = '1191ef3065e6f8e4f9fbe1b7e3c0f760';
    const SEIZE_BUFF = '953c3dbda63dcdb4aad6c54c1a4590d0';
    const COORDINATED_FEATURE = 'b186cea78dce3a04aacff0a81786008c';
    expect(listNames(e.data, [SEIZE_FEATURE, COORDINATED_FEATURE])).toEqual([
      'Seize the Moment',
      'Coordinated Maneuvers',
    ]);
    expect(listNames(e.data, [SEIZE_FEATURE, SEIZE_BUFF])).toEqual([
      'Seize the Moment (feature)',
      'Seize the Moment (buff)',
    ]);
    expect(namesIn(e.data, [COORDINATED_FEATURE]).get(COORDINATED_FEATURE)).toBe('Coordinated Maneuvers');
  });

  it("refuses a Mythic rank past 10 in level_up, in R's words (MCP QA)", async () => {
    const jack = await encodeBuild(e.data, jackInTheGreen.build);
    const lastRank = jackInTheGreen.build.ranks?.at(-1)?.class ?? '';
    const r = await level_up(e, { code: jack, class: lastRank });
    expect(r).toMatchObject({ refused: true });
    expect(JSON.stringify(r)).toContain('Mythic ranks stop at 10.');
  });

  it("refuses a parametrized feat picked without its parameter, in R's words (MCP QA)", async () => {
    const BASIC_FEATS = '247a4068296e8be42890143f451b4b45';
    const feat = jackInTheGreen.build.picks.find(
      (p) => p.slot.selection === BASIC_FEATS && 'level' in p.slot.place && p.slot.place.level >= 7,
    )!;
    const jack = await encodeBuild(e.data, jackInTheGreen.build);
    const r = await pick(e, { code: jack, slot: feat.slot, feature: '1e1f627d26ad36f43bbd26cc2bf8ac7e' });
    expect(r).toMatchObject({ refused: true });
    expect(JSON.stringify(r)).toContain('This feat is taken for one weapon; pick it with that choice.');
  });

  it('takes skills by the names the sheet shows or by their game keys, and names the skills when one is unknown (MCP QA)', async () => {
    const fighter = ok(
      await level_up(e, { code: (await start_build(e)).code, class: '48ac8db94d5de7645906c7d0ad3bcfbd' }),
      'level_up',
    );
    const shown = ok(
      await set_skills(e, { code: fighter.code, level: 1, ranks: { Athletics: 1, 'knowledge (world)': 1 } }),
      'set_skills',
    );
    expect(shown.build.levels[0]?.skills).toEqual({ SkillAthletics: 1, SkillKnowledgeWorld: 1 });
    const keyed = ok(await set_skills(e, { code: fighter.code, level: 1, ranks: { SkillAthletics: 1 } }), 'set_skills');
    expect(keyed.build.levels[0]?.skills).toEqual({ SkillAthletics: 1 });
    const unknown = await set_skills(e, { code: fighter.code, level: 1, ranks: { Climb: 1 } });
    expect(unknown).toEqual({
      refused: true,
      reason:
        'Not a skill: "Climb". The skills are Mobility, Perception, Thievery, Athletics, Persuasion, Lore (Nature), Knowledge (Arcana), Lore (Religion), Knowledge (World), Stealth, Use Magic Device.',
    });
  });
});
