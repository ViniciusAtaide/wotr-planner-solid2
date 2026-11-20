// The MCP's tools end to end (build ticket 05): an agent takes a Build from start_build to level 20 and Mythic rank 10
// through the tools alone, with no pick failing validation; every step's code opens the Build it returned.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { placeKey, slotKey, type Build, type Place } from '../build';
import { decodeBuild, encodeBuild } from '../codec';
import { loadData } from '../data/load';
import { readDataDir } from '../data/read-dir';
import { jackInTheGreen } from '../gold/jack-in-the-green';
import { walk } from '../walk/walk';
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

/** Jack's known gap (map 22): SpellSpecializationFirst f327a765a4353d04f872482ef3e48c35 at L11, and the slot it opens. */
const GAP = 'f327a765a4353d04f872482ef3e48c35';
const jack: Build = {
  ...jackInTheGreen.build,
  picks: jackInTheGreen.build.picks.filter((p) => p.feature !== GAP && p.slot.selection !== GAP),
};

function ok<T>(r: T | ToolRefusal, step: string): T {
  if (typeof r === 'object' && r !== null && 'refused' in r) throw new Error(`${step}: ${JSON.stringify(r)}`);
  return r;
}

/** Every place of a Build, in walk order: each level, then the ranks placed at it. */
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

describe('the MCP, end to end', () => {
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
      // Every code a step returns opens the Build it returned (its picks in slot order, as the code holds them).
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
    // PowerAttackFeature needs Strength 13; an empty Build's scores are 10.
    const refused = await pick(e, { code: fighter.code, slot, feature: '9972f33f977fc724c838e59641b2fca5' });
    expect(refused).toEqual({
      refused: true,
      reason: "Its prerequisites aren't met.",
      unmet: ['Needs Strength 13 (yours: 10).'],
    });
  });

  it('searches, explains and gives the sheet', async () => {
    expect(search(e, { text: 'power attack' }).map((h) => h.guid)).toContain('9972f33f977fc724c838e59641b2fca5');
    expect(explain(e, { guid: '9972f33f977fc724c838e59641b2fca5' })).toMatchObject({
      name: 'Power Attack',
      prerequisites: ['Needs Strength 13.'],
      summary: 'No summary yet.',
    });
    const code = (await start_build(e)).code;
    const fighter = ok(await level_up(e, { code, class: '48ac8db94d5de7645906c7d0ad3bcfbd' }), 'level_up');
    // FighterClass's base attack table gives 1 at level 1.
    expect(ok(await sheet(e, { code: fighter.code }), 'sheet')).toMatchObject({ level: 1, baseAttackBonus: 1 });
  });
});
