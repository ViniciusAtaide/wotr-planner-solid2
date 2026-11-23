import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { slotKey, type Pick, type SlotId } from '../build';
import { loadData } from '../load';
import { readDataDir } from '../data-dir';
import { enforcer, jackInTheGreen } from '../gold';
import type { Gold } from '../gold';
import { buildGrantIndex } from '../grants';
import { picker, walkVerdict, type OptionStatus } from './pickers';
import { namedFacts, prerequisites } from '../prerequisites';
import { refusal } from '../refusals';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const data = loadData(files.files, files.overrides);
const G = buildGrantIndex(data);

const goldSlot = (gold: typeof enforcer, selection: string): SlotId => {
  const found = gold.build.picks.find((p) => p.slot.selection === selection);
  if (found === undefined) throw new Error(`no gold pick in ${selection}`);
  return found.slot;
};

const SAMPLES: readonly {
  readonly kind: string;
  readonly gold: Gold;
  readonly slot: SlotId;
  readonly judgeOnlyASample?: true;
}[] = [
  {
    kind: 'a BasicFeatSelection with parametrized feats',
    gold: enforcer,
    slot: { place: { level: 9 }, selection: '247a4068296e8be42890143f451b4b45', index: 0 },
    judgeOnlyASample: true,
  },
  {
    kind: 'a nested selection',
    gold: enforcer,
    slot: goldSlot(enforcer, '26a668c5a8c22354bac67bcd42e09a3f'),
  },
  {
    kind: 'a waived slot',
    gold: enforcer,
    slot: goldSlot(enforcer, '7d5bd07830a5e2c478852bf8b860db2c'),
  },
  {
    kind: 'a Mythic slot',
    gold: jackInTheGreen,
    slot: { place: { rank: 6 }, selection: '9ee0f6745f555484299b0a1563b99d81', index: 0 },
  },
];

const factsNamedByPrerequisites = (feature: string) => {
  const bp = data.blueprints.get(feature);
  return new Set(bp === undefined ? [] : prerequisites(bp, data.blueprints).flatMap(namedFacts));
};

function sampled(options: readonly OptionStatus[], pick: Pick): OptionStatus[] {
  const near = factsNamedByPrerequisites(pick.feature);
  const touches = (o: OptionStatus) =>
    o.feature === pick.feature || near.has(o.feature) || factsNamedByPrerequisites(o.feature).has(pick.feature);
  const gold = JSON.stringify(pick.param);
  const atGold = new Set(options.filter((o) => JSON.stringify(o.param) === gold).map((o) => o.feature));
  const firstOf = new Map<string, OptionStatus>();
  for (const o of options) if (!firstOf.has(o.feature)) firstOf.set(o.feature, o);
  const neighbourhood = options.filter(
    (o) => touches(o) && (atGold.has(o.feature) ? JSON.stringify(o.param) === gold : firstOf.get(o.feature) === o),
  );
  const chosen = new Set(neighbourhood);
  const rest = options.filter((o) => !chosen.has(o));
  const stride = Math.max(1, Math.ceil(rest.length / Math.max(1, 100 - neighbourhood.length)));
  return [...neighbourhood, ...rest.filter((_, i) => i % stride === 0)];
}

describe('every picker status agrees with the walk', { timeout: 30_000 }, () => {
  it.each(SAMPLES)(
    'at $kind',
    ({ gold, slot, judgeOnlyASample: sample }) => {
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
