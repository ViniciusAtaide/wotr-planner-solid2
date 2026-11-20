// The pickers agree with the walk (build ticket 04, guide §6): at a slot of each kind, each option's picker status
// equals what the walk says when the Build takes that option there, and every closed option carries a Refusal. At the
// BasicFeatSelection slot it judges a fixed sample of about 100 options (Coordinator, 2026-11-20); the whole sweep,
// every option at every slot of both gold builds, is scripts/sweep-pickers.ts.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { slotKey, type Pick, type SlotId } from './build';
import { loadData } from './data/load';
import { readDataDir } from './data/read-dir';
import { enforcer } from './gold/enforcer';
import type { Gold } from './gold/gold';
import { jackInTheGreen } from './gold/jack-in-the-green';
import { buildGrantIndex } from './grants';
import { picker, walkVerdict, type OptionStatus } from './pickers';
import { namedFacts, prerequisites } from './prerequisites';
import { refusal } from './refusals';

const files = readDataDir(fileURLToPath(new URL('../data', import.meta.url)));
const data = loadData(files.files, files.overrides);
const G = buildGrantIndex(data);

/** One slot of each kind, from the gold builds. */
const SAMPLES: readonly {
  readonly kind: string;
  readonly gold: Gold;
  readonly slot: SlotId;
  /** Judge only a sample of the options (`sampled`), not all. */
  readonly sampled?: true;
}[] = [
  {
    // The Enforcer's L9 basic feat, whose pick is Improved Critical at a weapon: BasicFeatSelection, with every
    // parametrized feat at every parameter.
    kind: 'a BasicFeatSelection with parametrized feats',
    gold: enforcer,
    slot: { place: { level: 9 }, selection: '247a4068296e8be42890143f451b4b45', index: 0 },
    sampled: true,
  },
  {
    // Adaptability 26a668c5a8c22354bac67bcd42e09a3f, nested in the Half-Elf's BaseRaseHalfElfSelection.
    kind: 'a nested selection',
    gold: enforcer,
    slot: { place: { level: 1 }, selection: '26a668c5a8c22354bac67bcd42e09a3f', index: 0 },
  },
  {
    // RangerStyleMenacingSelection10 7d5bd07830a5e2c478852bf8b860db2c, which waives prerequisites (IgnorePrerequisites).
    kind: 'a waived slot',
    gold: enforcer,
    slot: { place: { level: 12 }, selection: '7d5bd07830a5e2c478852bf8b860db2c', index: 0 },
  },
  {
    // Jack's M6 Mythic Feat, whose pick is Expanded Arsenal at a school.
    kind: 'a Mythic slot',
    gold: jackInTheGreen,
    slot: { place: { rank: 6 }, selection: '9ee0f6745f555484299b0a1563b99d81', index: 0 },
  },
];

/** The facts a blueprint's prerequisites name. */
const needs = (feature: string) => {
  const bp = data.blueprints.get(feature);
  return new Set(bp === undefined ? [] : prerequisites(bp, data.blueprints).flatMap(namedFacts));
};

/**
 * A fixed sample of about 100 options: the gold pick's neighbourhood (the picked feat, what its prerequisites name,
 * and what names it, a parametrized one at the gold pick's parameter or else its first), then every k-th of the rest,
 * in the picker's order.
 */
function sampled(options: readonly OptionStatus[], pick: Pick): OptionStatus[] {
  const near = needs(pick.feature);
  const touches = (o: OptionStatus) =>
    o.feature === pick.feature || near.has(o.feature) || needs(o.feature).has(pick.feature);
  const gold = JSON.stringify(pick.param);
  const atGold = new Set(options.filter((o) => JSON.stringify(o.param) === gold).map((o) => o.feature));
  const firstOf = new Map<string, OptionStatus>();
  for (const o of options) if (!firstOf.has(o.feature)) firstOf.set(o.feature, o);
  // One entry per neighbouring feat: at the gold parameter when it takes it, else its first.
  const neighbourhood = options.filter(
    (o) => touches(o) && (atGold.has(o.feature) ? JSON.stringify(o.param) === gold : firstOf.get(o.feature) === o),
  );
  const chosen = new Set(neighbourhood);
  const rest = options.filter((o) => !chosen.has(o));
  const stride = Math.max(1, Math.ceil(rest.length / Math.max(1, 100 - neighbourhood.length)));
  return [...neighbourhood, ...rest.filter((_, i) => i % stride === 0)];
}

describe('every picker status agrees with the walk', () => {
  it.each(SAMPLES)(
    'at $kind',
    ({ gold, slot, sampled: sample }) => {
      const p = picker(data, gold.build, slot, G);
      expect(p?.options.length ?? 0).toBeGreaterThan(0);
      const picked = gold.build.picks.find((q) => slotKey(q.slot) === slotKey(slot));
      const options = sample && picked ? sampled(p?.options ?? [], picked) : (p?.options ?? []);
      if (sample) expect(options.length).toBeLessThan(130);
      const disagree = options.filter(
        (o) => (walkVerdict(data, gold.build, slot, o, G) === undefined) !== (o.closed === undefined),
      );
      expect(disagree.map((o) => `${slotKey(slot)} ${o.feature} ${JSON.stringify(o.param ?? {})}`)).toEqual([]);
      for (const o of options) {
        if (o.closed === undefined) continue;
        const r = refusal({ data, G }, o.closed);
        expect(r.text).not.toBe('');
        expect(r.unmet.length > 0).toBe((o.closed.unmet?.length ?? 0) > 0);
      }
    },
    120_000,
  );
});
