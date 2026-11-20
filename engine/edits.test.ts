// E on the committed data (build ticket 04; map 11): a plain edit that breaks a choice is refused, naming it; a
// Cascade clears exactly what its preview lists; and every edit `allows` accepts leaves the Build possible.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { placeKey, slotKey, type Build } from './build';
import { loadData } from './data/load';
import { readDataDir } from './data/read-dir';
import { allows, apply, breaksOf, cascade, clearPicks, type Edit } from './edits';
import { enforcer } from './gold/enforcer';
import { jackInTheGreen } from './gold/jack-in-the-green';
import { buildGrantIndex } from './grants';
import { walk } from './walk/walk';

const files = readDataDir(fileURLToPath(new URL('../data', import.meta.url)));
const data = loadData(files.files, files.overrides);
const G = buildGrantIndex(data);

const BASIC = '247a4068296e8be42890143f451b4b45';
const TOUGHNESS = 'd09b20029e9abfe4480b356c92095623';
const jackL5: Edit = {
  kind: 'pick',
  slot: { place: { level: 5 }, selection: BASIC, index: 0 },
  pick: { feature: TOUGHNESS },
};

/** The refusals a walk records, as keys, to tell a Build no worse than another. */
const refusedKeys = (b: Build) =>
  new Set(
    walk(data, b, G).failures.map((f) => `${placeKey(f.place)} ${f.choice} ${f.slot ? slotKey(f.slot) : f.subject}`),
  );

describe('E: edits', () => {
  it('refuses a plain edit that breaks later picks, naming them', () => {
    // Jack's L5 Spell Focus (Evocation) holds up his L15 Greater Spell Focus and M8 Spell Focus (Mythic).
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
    // The Enforcer's belt holds up its L19 Greater Two-Weapon Fighting.
    const off: Edit = { kind: 'gear', place: 'Belt' };
    expect(allows(data, enforcer.build, off, G).ok).toBe(false);
    const c = cascade(data, enforcer.build, off, G);
    expect(c.ok ? c.cleared.map((p) => p.feature) : c).toEqual(['c126adbdf6ddd8245bda33694cd774e8']);
  });

  it('refuses a cascade whose break no cleared pick mends', () => {
    // Jack's level 1 as ArcaneTricksterClass 9c935a076d4fe4d4999fd48d853e3cf3, whose prerequisites (a caster level,
    // sneak attack, skill ranks) no first level meets: a class refusal that clearing picks can't mend.
    const c = cascade(
      data,
      jackInTheGreen.build,
      { kind: 'class', level: 1, class: '9c935a076d4fe4d4999fd48d853e3cf3' },
      G,
    );
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
});
