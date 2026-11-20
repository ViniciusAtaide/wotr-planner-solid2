import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { placeKey, type Alignment } from '../build';
import { loadData } from '../load';
import { readDataDir } from '../data-dir';
import { buildGrantIndex } from '../grants';
import { ATTRIBUTES, walk } from '../walk';
import { enforcer, type Gold, jackInTheGreen } from '../gold';
import { compare, matchesName, namesFor, unexplained, type Disagreement, type Gap } from './compare';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const data = loadData(files.files, files.overrides);
const G = buildGrantIndex(data);
const GOLD: readonly Gold[] = [jackInTheGreen, enforcer];

function refused(build: string, place: string, name: string, line: string, ticket: string, why: string): Gap[] {
  return [`refused: ${name}`, line].map((l) => ({ build, place, line: l, ticket, why }));
}

const KNOWN_GAPS: readonly Gap[] = [
  ...refused('Jack-in-the-Green', 'L11', 'Spell Specialization', 'Spell Specialization', 'map 22', 'spell feats'),
];

function disagreements(): Disagreement[] {
  return GOLD.flatMap((gold) => compare(data, gold, walk(data, gold.build, G)));
}

describe('the gold builds', () => {
  it('gain every line of their write-ups, apart from the known gaps', () => {
    expect(unexplained(disagreements(), KNOWN_GAPS)).toEqual([]);
  });

  describe.each(GOLD)('$name', (gold) => {
    it("starts as the write-up: race, background and the level-1 scores with the race's modifiers", () => {
      const first = walk(
        data,
        { ...gold.build, levels: gold.build.levels.slice(0, 1), ranks: [], countGear: false },
        G,
      );
      expect(data.blueprints.get(gold.build.race ?? '')?.name).toBe(gold.start.race);
      const held = [...first.unit.facts()].map((f) => data.blueprints.get(f.blueprint)?.name);
      expect(held).toContain(gold.start.background);
      expect(Object.fromEntries(ATTRIBUTES.map((a) => [a, first.unit.permanent(a)]))).toEqual(gold.start.attributes);
    });

    it('is refused the same at every alignment the write-up allows', () => {
      const refusals = (alignment: Alignment) =>
        walk(data, { ...gold.build, alignment }, G).failures.map((f) => `${placeKey(f.place)} ${f.subject} ${f.rule}`);
      const own = refusals(gold.build.alignment as Alignment);
      for (const alignment of gold.start.alignments) expect(refusals(alignment)).toEqual(own);
    });

    it('depends on its Gear only where its write-up does', () => {
      const marked = walk(data, gold.build, G).gearDependent.map(
        (d) => `${placeKey(d.place)} ${d.subject} ${d.items.join(',')}`,
      );
      expect(marked).toEqual(
        gold.build.countGear ? ['L19 c126adbdf6ddd8245bda33694cd774e8 b6af4c1834999e74497b41588d1071cd'] : [],
      );
    });

    it('puts ranks in each skill the write-up lists', () => {
      for (const skill of gold.start.skills)
        expect(gold.build.levels.some((l) => (l.skills?.[skill] ?? 0) > 0)).toBe(true);
    });
  });

  it('reads "Name - Value" as the game\'s "Name — Value" or "Name (Value)"', () => {
    expect(namesFor('Animal Companion - Elk')).toContain('Animal Companion — Elk');
    expect(namesFor('Improved Critical - Battleaxe')).toContain('Improved Critical (Battleaxe)');
  });

  it("matches a line's bare name to the name the importer qualified, whatever its qualifier", () => {
    expect(matchesName('Menacing (Ranger 6)', ['Menacing'])).toBe(true);
    expect(matchesName('Menacing', ['Menacing'])).toBe(true);
    expect(matchesName('Menacing Mastery', ['Menacing'])).toBe(false);
  });
});
