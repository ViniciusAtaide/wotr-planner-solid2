import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { childSlot, placeKey, slotKey, type Build, type Place, type SlotId } from '../build';
import { decodeBuild, encodeBuild } from '../codec';
import { loadData } from '../load';
import { readDataDir } from '../data-dir';
import { enforcer, jackInTheGreen } from '../gold';
import {
  archetypeCount,
  buildNameLength,
  listNames,
  namesIn,
  rankLevelRange,
  skillRankRange,
  statName,
} from '../refusals';
import { walk } from '../walk';
import {
  brief,
  engineOf,
  expectedLevel,
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
  synergies,
  type Changed,
  type ToolRefusal,
} from './tools';
import { TOOLS } from './registry';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const e = engineOf(loadData(files.files, files.overrides));

const isRefusal = (x: unknown): x is ToolRefusal => typeof x === 'object' && x !== null && 'refused' in x;

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
    expect(ok(await next_slots(e, { code: step.code }), 'next_slots').slots.map((s) => s.place)).toContain('L11');
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

  it('names a level in the brief by its archetype, as the planner titles it (QA pass 9)', async () => {
    const code = (await start_build(e)).code;
    const mutant = ok(
      await level_up(e, { code, class: FIGHTER, archetypes: [MUTATION_WARRIOR_ARCHETYPE] }),
      'level_up',
    );
    const again = ok(await level_up(e, { code: mutant.code, class: FIGHTER }), 'level_up');
    expect(brief(e, again.build)).toBe('no race · Mutation Warrior 2 · 0 picks');
  });

  it('searches, explains and gives the sheet', async () => {
    expect(search(e, { text: 'power attack' }).hits.map((h) => h.guid)).toContain('9972f33f977fc724c838e59641b2fca5');
    const classes = search(e, { text: '', kind: 'classes' });
    expect(classes.total).toBeGreaterThan(50);
    expect(classes.hits.length).toBe(50);
    expect(classes.pages).toBe(Math.ceil(classes.total / 50));
    const rest = search(e, { text: '', kind: 'classes', page: 2 });
    expect([...classes.hits, ...rest.hits].map((h) => h.name)).toContain('Wizard');
    const shields = search(e, { text: 'Masterwork Spiked Heavy Shield', kind: 'items' }).hits.map((h) => h.name);
    expect(shields.filter((n) => n === 'Masterwork Spiked Heavy Shield')).toHaveLength(1);
    expect(explain(e, { guid: '9972f33f977fc724c838e59641b2fca5' })).toMatchObject({
      name: 'Power Attack',
      prerequisites: ['Needs Strength 13.'],
      summary: expect.stringMatching(/^While on: -1 on melee attack rolls/),
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
    expect(statName('SkillThievery')).toBe('Trickery');
    for (const name of ['Trickery', 'trickery', 'SkillThievery', 'Thievery']) {
      const tricky = ok(await set_skills(e, { code: fighter.code, level: 1, ranks: { [name]: 1 } }), 'set_skills');
      expect(tricky.build.levels[0]?.skills, name).toEqual({ SkillThievery: 1 });
    }
    const unknown = await set_skills(e, { code: fighter.code, level: 1, ranks: { Climb: 1 } });
    expect(unknown).toEqual({
      refused: true,
      reason:
        'Not a skill: "Climb". The skills are Mobility, Perception, Trickery, Athletics, Persuasion, Lore (Nature), Knowledge (Arcana), Lore (Religion), Knowledge (World), Stealth, Use Magic Device.',
    });
  });

  it('explains every option that options offers, open or closed, at slots of both gold Builds (MCP QA)', async () => {
    const refusedExplain: string[] = [];
    let explained = 0;
    for (const gold of [jackInTheGreen, enforcer]) {
      const code = await encodeBuild(e.data, gold.build);
      const picks = gold.build.picks;
      const slots = [0, 1, 2, 3, Math.floor(picks.length / 2), picks.length - 3, picks.length - 1]
        .map((i) => picks[i]?.slot)
        .filter((s): s is NonNullable<typeof s> => s !== undefined);
      for (const slot of slots) {
        for (let page = 1, pages = 1; page <= pages; page++) {
          const listed = ok(await options(e, { code, slot, include_closed: true, page }), 'options');
          pages = listed.pages;
          for (const o of [...listed.open, ...(listed.closed ?? [])]) {
            explained++;
            if (isRefusal(explain(e, { guid: o.feature }))) refusedExplain.push(`${o.name} ${o.feature}`);
          }
        }
      }
    }
    expect(explained).toBeGreaterThan(500);
    expect(refusedExplain).toEqual([]);
  }, 120_000);

  it('names what a blueprint needs and enables in explain (MCP QA)', () => {
    const powerAttack = explain(e, { guid: '9972f33f977fc724c838e59641b2fca5' });
    expect(isRefusal(powerAttack)).toBe(false);
    if (isRefusal(powerAttack)) return;
    expect(powerAttack.enables.length).toBeGreaterThan(0);
    for (const link of [...powerAttack.needs, ...powerAttack.enables]) expect(link.name).not.toBe(link.guid);
    expect(powerAttack.enables.map((l) => l.name)).toContain('Cleave');
  });

  it('notes a Mythic rank off its usual level in plain words, with no internal reference (MCP QA)', async () => {
    const jack = await encodeBuild(e.data, jackInTheGreen.build);
    const usual = expectedLevel(e.data, 10);
    const moved = await place_rank(e, { code: jack, rank: 10, level: usual === 20 ? 19 : 20 });
    expect(isRefusal(moved)).toBe(false);
    if (isRefusal(moved)) return;
    expect(moved.note).toMatch(/^Mythic rank 10 is usually reached at character level \d+\.$/);
  });

  it('names the places an item goes in when equip refuses it for its place (MCP QA)', async () => {
    const jack = await encodeBuild(e.data, jackInTheGreen.build);
    const RING_OF_PROTECTION_1 = 'f333bf86cd122974792162cbcd27c9ed';
    const BELT_OF_GIANT_STRENGTH_2 = 'c354de364a714ee4dbe2cfee628df267';
    expect(await equip(e, { code: jack, place: 'Belt', item: RING_OF_PROTECTION_1 })).toEqual({
      refused: true,
      reason: "It doesn't go in this place; it goes in a Ring 1 or Ring 2 place.",
    });
    expect(await equip(e, { code: jack, place: 'Head', item: BELT_OF_GIANT_STRENGTH_2 })).toEqual({
      refused: true,
      reason: "It doesn't go in this place; it goes in the Belt place.",
    });
  });

  it('gives each synergies row the slot, place and feature that pick takes, with places spelled as next_slots spells them (MCP QA)', async () => {
    const open = {
      ...jackInTheGreen.build,
      picks: jackInTheGreen.build.picks.filter((p) => !('rank' in p.slot.place && p.slot.place.rank >= 9)),
    };
    const code = await encodeBuild(e.data, open);
    const rows = ok(await synergies(e, { code }), 'synergies');
    expect(rows.length).toBeGreaterThan(0);
    const places = new Set(ok(await next_slots(e, { code }), 'next_slots').slots.map((s) => s.place));
    for (const row of rows) expect(places.has(row.place)).toBe(true);
    expect(rows.some((r) => r.place.startsWith('M'))).toBe(true);
    const row = rows[0]!;
    const taken = ok(
      await pick(e, { code, slot: row.slot, feature: row.feature, ...(row.param && { param: row.param }) }),
      'pick',
    );
    expect('build' in taken).toBe(true);
    if (!('build' in taken)) return;
    expect(taken.build.picks).toContainEqual(expect.objectContaining({ slot: row.slot, feature: row.feature }));
  });

  describe('sub-choices and refused picks (map 35)', () => {
    const SKILL_FOCUS = 'c9629ef9eebb88b479b2fbc5e836656a';
    const LORE_RELIGION = 'c541f80af8d0af4498e1abb6025780c7';
    const HUMAN = '0a5d473ead98b0646b94495af250fdc4';
    const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
    const BASIC = '247a4068296e8be42890143f451b4b45';
    const run = (name: string, args: Record<string, unknown>) =>
      TOOLS.find((t) => t.name === name)!.run(e, args) as Promise<Record<string, unknown>>;

    it("gives a sub-choice's slot its parent in next_slots, and pick takes it back", async () => {
      const fighter = ok(
        await level_up(e, {
          code: ok(await set_start(e, { code: (await start_build(e)).code, race: HUMAN }), 'set_start').code,
          class: FIGHTER,
        }),
        'level_up',
      );
      const levelFeat: SlotId = { place: { level: 1 }, selection: BASIC, index: 0 };
      const focused = ok(await pick(e, { code: fighter.code, slot: levelFeat, feature: SKILL_FOCUS }), 'pick') as {
        code: string;
      };
      const listed = ok(await next_slots(e, { code: focused.code }), 'next_slots');
      const skill = listed.slots.find((s) => s.slot.selection === SKILL_FOCUS)?.slot;
      expect(skill?.parent).toBe(slotKey(levelFeat));
      expect(skill).toEqual(childSlot(levelFeat, SKILL_FOCUS));
      const taken = ok(await pick(e, { code: focused.code, slot: skill!, feature: LORE_RELIGION }), 'pick') as {
        code: string;
      };
      const after = await decodeBuild(e.data, taken.code);
      expect(after.picks.find((p) => p.feature === LORE_RELIGION)?.slot.parent).toBe(slotKey(levelFeat));
    });

    it("labels each open slot in the planner's words, and a sub-choice by its parent's slot and pick (QA pass 9)", async () => {
      const fighter = ok(
        await level_up(e, {
          code: ok(await set_start(e, { code: (await start_build(e)).code, race: HUMAN }), 'set_start').code,
          class: FIGHTER,
        }),
        'level_up',
      );
      const listed = ok(await next_slots(e, { code: fighter.code }), 'next_slots');
      expect(listed.slots.map((s) => [s.label, s.selection])).toEqual([
        ['Human bonus feat', 'Feat'],
        ['Feat', 'Feat'],
        ['Background', 'Background Selection'],
        ['Deity', 'Deity Selection'],
        ['Bonus Combat Feat', 'Bonus Combat Feat'],
      ]);
      const levelFeat: SlotId = { place: { level: 1 }, selection: BASIC, index: 0 };
      const focused = ok(await pick(e, { code: fighter.code, slot: levelFeat, feature: SKILL_FOCUS }), 'pick') as {
        code: string;
      };
      const sub = ok(await next_slots(e, { code: focused.code }), 'next_slots');
      expect(sub.slots.find((s) => s.slot.selection === SKILL_FOCUS)?.label).toBe('Feat: Skill Focus');
    });

    it('opens a code holding a pick the walk refuses with that pick cleared, and names it', async () => {
      const levelFeat: SlotId = { place: { level: 1 }, selection: BASIC, index: 0 };
      const humanFeat: SlotId = { ...levelFeat, from: HUMAN };
      const twice: Build = {
        race: HUMAN,
        levels: [{ class: FIGHTER }],
        picks: [
          { slot: levelFeat, feature: SKILL_FOCUS },
          { slot: childSlot(levelFeat, SKILL_FOCUS), feature: LORE_RELIGION },
          { slot: humanFeat, feature: SKILL_FOCUS },
          { slot: childSlot(humanFeat, SKILL_FOCUS), feature: LORE_RELIGION },
        ],
      };
      const code = await encodeBuild(e.data, twice);
      const listed = await run('next_slots', { code });
      expect(listed.clearedOnOpen).toHaveLength(1);
      expect(listed.clearedOnOpen).toEqual(['L1 Human bonus feat: Skill Focus (Lore — Religion)']);
      const open = (listed.slots as { slot: SlotId }[])
        .filter((s) => s.slot.selection === SKILL_FOCUS)
        .map((s) => slotKey(s.slot));
      expect(open).toHaveLength(1);
      expect([slotKey(childSlot(levelFeat, SKILL_FOCUS)), slotKey(childSlot(humanFeat, SKILL_FOCUS))]).toContain(
        open[0],
      );
    });
  });

  it('says which later pick an option would clear (QA pass 6)', async () => {
    const jack = await encodeBuild(e.data, jackInTheGreen.build);
    const slot = { place: { level: 1 }, selection: 'd6dd06f454b34014ab0903cb1ed2ade3', index: 0 };
    const listed = ok(await options(e, { code: jack, slot, text: 'spell focus' }), 'options');
    const evocation = listed.open.find((o) => JSON.stringify(o.param) === JSON.stringify({ SpellSchool: 'Evocation' }));
    expect(evocation?.clears).toBe('Held at level 5; taking it here clears that pick.');
    expect(listed.open.filter((o) => o.clears !== undefined)).toHaveLength(1);
  });

  it("says a race's +2 is still to choose after a race change (QA pass 6)", async () => {
    const HUMAN = '0a5d473ead98b0646b94495af250fdc4';
    const GNOME = 'ef35a22c9a27da345a4528f0d5889157';
    const human = ok(await set_start(e, { code: (await start_build(e)).code, race: HUMAN }), 'set_start');
    expect(ok(await next_slots(e, { code: human.code }), 'next_slots').raceStatToChoose).toBe(true);
    const chosen = ok(await set_start(e, { code: human.code, raceStat: 'Strength' }), 'set_start');
    expect(ok(await next_slots(e, { code: chosen.code }), 'next_slots').raceStatToChoose).toBeUndefined();
    const gnome = ok(await set_start(e, { code: human.code, race: GNOME }), 'set_start');
    expect(ok(await next_slots(e, { code: gnome.code }), 'next_slots').raceStatToChoose).toBeUndefined();
  });

  it('gives the skill budget when ranks go over it, and says when the last level still has points to spend (MCP QA)', async () => {
    const fighter = ok(
      await level_up(e, { code: (await start_build(e)).code, class: '48ac8db94d5de7645906c7d0ad3bcfbd' }),
      'level_up',
    );
    const left = ok(await next_slots(e, { code: fighter.code }), 'next_slots').skillPointsLeft;
    expect(left?.level).toBe(1);
    const budget = left?.points ?? 0;
    expect(budget).toBeGreaterThan(0);
    const all = [
      'Athletics',
      'Mobility',
      'Perception',
      'Persuasion',
      'Stealth',
      'Trickery',
      'Lore (Nature)',
      'Use Magic Device',
    ];
    const over = Object.fromEntries(all.slice(0, budget + 1).map((s) => [s, 1]));
    expect(await set_skills(e, { code: fighter.code, level: 1, ranks: over })).toEqual({
      refused: true,
      reason: `No skill points left at this level: it has ${budget} to spend, and these ranks take ${budget + 1}.`,
    });
    const spent = ok(
      await set_skills(e, {
        code: fighter.code,
        level: 1,
        ranks: Object.fromEntries(all.slice(0, budget).map((s) => [s, 1])),
      }),
      'set_skills',
    );
    expect(ok(await next_slots(e, { code: spent.code }), 'next_slots').skillPointsLeft).toBeUndefined();
  });

  it('answers a change over the MCP with the code and a brief line, not the whole Build (MCP QA)', async () => {
    const run = (name: string, args: Record<string, unknown>) => TOOLS.find((t) => t.name === name)!.run(e, args);
    const started = (await run('start_build', { name: 'Lann' })) as Record<string, unknown>;
    expect(started).toEqual({ code: expect.any(String), brief: 'Lann · no race · no levels · 0 picks' });
    const jack = await encodeBuild(e.data, jackInTheGreen.build);
    const placed = (await run('place_rank', {
      code: jack,
      rank: 1,
      level: jackInTheGreen.build.ranks![0]!.level,
    })) as Record<string, unknown>;
    expect(placed.build).toBeUndefined();
    expect(placed.brief).toMatch(/^Halfling · .* · \d+ picks/);
    expect(JSON.stringify(placed).length).toBeLessThan(1500);
    const sheeted = (await run('sheet', { code: placed.code as string })) as Record<string, unknown>;
    expect(sheeted.build).toEqual(expect.objectContaining({ race: jackInTheGreen.build.race }));
  });

  it("refuses a level_up on its own class's reasons, not as a break of other choices (MCP QA)", async () => {
    const azata = [...e.data.blueprints.values()].find(
      (b) => b.$type === 'BlueprintCharacterClass' && b.name === 'Azata',
    )!;
    const mortal = await encodeBuild(e.data, {
      ...jackInTheGreen.build,
      ranks: [],
      picks: jackInTheGreen.build.picks.filter((p) => !('rank' in p.slot.place)),
    });
    const r = await level_up(e, { code: mortal, class: azata.guid });
    expect(r).toMatchObject({ refused: true });
    expect(r).not.toHaveProperty('breaks');
    expect(JSON.stringify(r)).not.toContain('would break other choices');
    expect(JSON.stringify(r)).toContain('Mythic Hero');
  });

  it("splits each save into its base and ability modifier, and adds Gear's enhancement in scoresWithGear (MCP QA)", async () => {
    const belted = await encodeBuild(e.data, {
      ...jackInTheGreen.build,
      gear: { Belt: 'c354de364a714ee4dbe2cfee628df267' },
    });
    const s = ok(await sheet(e, { code: belted }), 'sheet');
    expect(s.scoresWithGear?.Strength).toBe(s.scores.Strength + 2);
    expect(s.scoresWithGear?.Dexterity).toBe(s.scores.Dexterity);
    const fort = s.saves.fortitude;
    expect(fort.ability).toBe(Math.floor(s.scores.Constitution / 2) - 5);
    expect(fort.withAbility).toBe(fort.base + fort.ability);
    const plain = ok(await sheet(e, { code: await encodeBuild(e.data, jackInTheGreen.build) }), 'sheet');
    expect(plain.scoresWithGear).toBeUndefined();
  });

  it('counts closed options by one reason per rule, not one per weapon, while each listed option keeps its own reason (MCP QA)', async () => {
    const code = await encodeBuild(e.data, jackInTheGreen.build);
    const slot = jackInTheGreen.build.picks.find(
      (p) =>
        p.slot.selection === '247a4068296e8be42890143f451b4b45' && 'level' in p.slot.place && p.slot.place.level >= 7,
    )!.slot;
    const listed = ok(await options(e, { code, slot, include_closed: true }), 'options');
    const reasons = Object.keys(listed.closedByReason);
    expect(reasons).toContain('Needs proficiency with its weapon.');
    expect(
      reasons.filter((r) => r.startsWith('Needs proficiency with ') && r !== 'Needs proficiency with its weapon.'),
    ).toEqual([]);
    expect(reasons.length).toBeLessThan(10);
    const all = [
      listed,
      ...(await Promise.all(
        Array.from({ length: listed.pages - 1 }, (_, i) =>
          options(e, { code, slot, include_closed: true, page: i + 2 }),
        ),
      )),
    ];
    const texts = all.flatMap((l) => (isRefusal(l) ? [] : (l.closed ?? []))).map((o) => o.refusal?.text ?? '');
    expect(texts.some((t) => /^Needs proficiency with (?!its weapon)/.test(t))).toBe(true);
  });

  it('says the point buy spent, and lists each prerequisite once in explain (MCP QA)', async () => {
    const started = ok(
      await set_start(e, {
        code: (await start_build(e)).code,
        scores: { Strength: 16, Dexterity: 12, Constitution: 14, Intelligence: 10, Wisdom: 12, Charisma: 10 },
      }),
      'set_start',
    );
    expect(started.pointBuy?.of).toBe(25);
    expect(started.pointBuy?.spent).toBeGreaterThan(0);
    const zealot = search(e, { text: 'Domain Zealot' }).hits.find((h) => h.name === 'Domain Zealot');
    const d = zealot && explain(e, { guid: zealot.guid });
    expect(d && !isRefusal(d) && new Set(d.prerequisites).size === d.prerequisites.length).toBe(true);
  });

  it("warns when a worn item's bonus won't stack with what the Build holds or wears (MCP QA)", async () => {
    const RING_OF_PROTECTION_1 = 'f333bf86cd122974792162cbcd27c9ed';
    const ringed = await encodeBuild(e.data, { ...jackInTheGreen.build, gear: { Ring1: RING_OF_PROTECTION_1 } });
    const second = ok(await equip(e, { code: ringed, place: 'Ring2', item: RING_OF_PROTECTION_1 }), 'equip');
    expect('wontStack' in second && second.wontStack).toEqual([
      "Its deflection bonus to AC won't stack with Ring of Protection +1; both are +1, so only one counts.",
    ]);
    const RING_OF_PROTECTION_3 = '31315100c28e6a2418396fb152466fcd';
    const better = ok(await equip(e, { code: ringed, place: 'Ring2', item: RING_OF_PROTECTION_3 }), 'equip');
    expect('wontStack' in better && better.wontStack).toEqual([
      "Its deflection bonus to AC won't stack with Ring of Protection +1; the higher, +3, counts.",
    ]);
    const first = ok(
      await equip(e, {
        code: await encodeBuild(e.data, jackInTheGreen.build),
        place: 'Ring1',
        item: RING_OF_PROTECTION_1,
      }),
      'equip',
    );
    expect('wontStack' in first).toBe(false);
  });

  it("closes a pick whose prerequisite reads the alignment while none is chosen, in R's words (QA pass 5)", async () => {
    const DEITY_SELECTION = '59e7a76987fe3b547b9cce045f4db3e4';
    const ASMODEUS = 'a3a5ccc9c670e6f4ca4a686d23b89900';
    const { alignment: _alignment, ...unaligned } = jackInTheGreen.build;
    const code = await encodeBuild(e.data, unaligned);
    const slot = jackInTheGreen.build.picks.find((p) => p.slot.selection === DEITY_SELECTION)!.slot;
    const listed = ok(await options(e, { code, slot, include_closed: true, text: 'Asmodeus' }), 'options');
    const asmodeus = listed.closed?.find((o) => o.feature === ASMODEUS);
    expect(asmodeus?.refusal?.unmet).toContain('Choose an alignment first.');
    expect(listed.open.find((o) => o.feature === ASMODEUS)).toBeUndefined();
  });

  it('places a rank taken early at the last character level, and says when it is usually reached (QA pass 9)', async () => {
    const MYTHIC_HERO = '247aa787806d5da4f89cfc3dff0b217f';
    let code = (await start_build(e)).code;
    for (let l = 1; l <= 5; l++) code = ok(await level_up(e, { code, class: FIGHTER }), `L${l}`).code;
    const first = expectedLevel(e.data, 1);
    expect(first).toBeGreaterThan(5);
    const rank = ok(await level_up(e, { code, class: MYTHIC_HERO }), 'M1');
    expect(rank.characterLevel).toBe(5);
    expect(rank.build.ranks?.[0]?.level).toBe(5);
    expect(rank.note).toBe(
      `Mythic rank 1 is taken early, at character level 5; it is usually reached at ${first}. place_rank moves it.`,
    );
  });

  it('places a Mythic rank at its Expected level when the character levels came first, and says when one is due (MCP QA)', async () => {
    const MYTHIC_HERO = '247aa787806d5da4f89cfc3dff0b217f';
    let code = (await start_build(e)).code;
    const dueAt: (number | undefined)[] = [];
    for (let l = 1; l <= 20; l++) {
      const up = ok(await level_up(e, { code, class: FIGHTER }), `L${l}`);
      dueAt.push(up.mythicRankDue?.expectedLevel);
      code = up.code;
    }
    const first = expectedLevel(e.data, 1);
    expect(dueAt.indexOf(first)).toBe(first - 1);
    expect(dueAt.slice(0, first - 1).every((d) => d === undefined)).toBe(true);
    expect(ok(await next_slots(e, { code }), 'next_slots').mythicRankDue).toEqual({ rank: 1, expectedLevel: first });
    const rank = ok(await level_up(e, { code, class: MYTHIC_HERO }), 'M1');
    expect(rank.characterLevel).toBe(first);
    expect(rank.build.ranks?.[0]?.level).toBe(first);
    expect(rank.note).toBeUndefined();
    expect(ok(await next_slots(e, { code: rank.code }), 'next_slots').mythicRankDue).toEqual({
      rank: 2,
      expectedLevel: expectedLevel(e.data, 2),
    });
  });

  it('places a Mythic rank at the last character level, naming what its Expected level would break (MCP QA)', async () => {
    const ARCANIST = '52dbfd8505e22f84fad8d702611f60b7';
    const MYTHIC_HERO = '247aa787806d5da4f89cfc3dff0b217f';
    const LICH = '5d501618a28bdc24c80007a5c937dcb7';
    const HOLY_WATER_JET = '3ff84c64d01075d4cbc3dc274c48a4bf';
    let code = (await start_build(e)).code;
    for (let l = 1; l <= 20; l++) code = ok(await level_up(e, { code, class: ARCANIST }), `L${l}`).code;
    const exploit = ok(await next_slots(e, { code }), 'next_slots').slots.find(
      (s) => s.place === 'L15' && s.selection === 'Arcanist Exploits',
    )!.slot;
    code = (ok(await pick(e, { code, slot: exploit, feature: HOLY_WATER_JET }), 'pick') as Changed).code;
    for (let r = 1; r <= 2; r++) code = ok(await level_up(e, { code, class: MYTHIC_HERO }), `M${r}`).code;
    const lich = ok(await level_up(e, { code, class: LICH }), 'M3');
    expect(lich.characterLevel).toBe(20);
    expect(lich.note).toBe(
      `Mythic rank 3 is placed at character level 20, since at ${expectedLevel(e.data, 3)} it would break L15 Arcanist Exploits: Holy Water Jet.`,
    );
  });

  it("gives a level's skill points, counting a later Intelligence increase for every level so far, as the game does (MCP QA)", async () => {
    const ARCANIST = '52dbfd8505e22f84fad8d702611f60b7';
    const HUMAN = '0a5d473ead98b0646b94495af250fdc4';
    const scores = { Strength: 10, Dexterity: 14, Constitution: 14, Intelligence: 17, Wisdom: 10, Charisma: 10 };
    const started = ok(
      await set_start(e, { code: (await start_build(e)).code, race: HUMAN, raceStat: 'Intelligence', scores }),
      'set_start',
    );
    const five = {
      'Knowledge (Arcana)': 1,
      'Knowledge (World)': 1,
      'Use Magic Device': 1,
      Perception: 1,
      Persuasion: 1,
    };
    let code = started.code;
    const budgets: number[] = [];
    for (let l = 1; l <= 4; l++) {
      const up = ok(
        await level_up(e, { code, class: ARCANIST, ...(l === 4 && { increase: 'Intelligence' }) }),
        `L${l}`,
      );
      budgets.push(up.skillPoints ?? 0);
      const set = ok(await set_skills(e, { code: up.code, level: l, ranks: five }), `skills L${l}`);
      expect(set.skillPointsLeft).toEqual(l < 4 ? undefined : { level: 4, points: 2 });
      code = set.code;
    }
    expect(budgets).toEqual([5, 5, 5, 7]);
    expect(ok(await next_slots(e, { code }), 'next_slots').skillPointsLeft).toEqual({ level: 4, points: 2 });
  });
});
