import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { abilityScores, slotKey, type Build } from '~engine/build';
import { readDataDir } from '~engine/data-dir';
import { allows } from '~engine/edits';
import { loadData } from '~engine/load';
import { engineOf } from '~engine/mcp';
import { walk } from '~engine/walk';

import {
  after,
  backgroundChoices,
  backgroundLabel,
  flatName,
  joinedName,
  raceChoices,
  raceLabel,
  shownArchetypes,
  type FlatChoice,
} from './flat-choices';
import { verdictOfAll } from './planner-state';
import { backgroundSlot, characterPicksLine } from './trail-state';
import type { CheckedBuild } from '~engine/edits';

const trusted = (b: Build): CheckedBuild => b as CheckedBuild;

const files = readDataDir(join(process.cwd(), 'data'));
const e = engineOf(loadData(files.files, files.overrides));

const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
const TIEFLING = '5c4e42124dc2b4647af6e36cf2590500';
const SCORES = abilityScores({
  Strength: 13,
  Dexterity: 10,
  Constitution: 10,
  Intelligence: 10,
  Wisdom: 10,
  Charisma: 10,
});

const walked = (b: Build) => walk(e.data, b, e.G);
const named = (choices: readonly FlatChoice[], name: string): FlatChoice => {
  const c = choices.find((x) => x.name === name);
  if (c === undefined) throw new Error(`no ${name}`);
  return c;
};
const taken = (b: Build, c: FlatChoice): Build => {
  const v = verdictOfAll(e, trusted(b), c.edits);
  if (v.kind === 'breaks') throw new Error(`${c.name} breaks`);
  return v.build;
};

describe('flat names', () => {
  test('a variation goes in parentheses after its group', () => {
    expect(flatName('Noble', 'Courtier')).toBe('Noble (Courtier)');
    expect(flatName('Human', undefined)).toBe('Human');
    expect(flatName('Aasimar', 'Aasimar')).toBe('Aasimar');
    expect(flatName('Aasimar', 'Aasimar (Heritage)')).toBe('Aasimar (Heritage)');
    expect(flatName('Scholar', 'Scholar — Nature')).toBe('Scholar (Nature)');
    expect(joinedName('Aasimar', 'Aasimar (Angelkin (Angel-Blooded))')).toBe('Aasimar · Angelkin (Angel-Blooded)');
    expect(joinedName('Alchemist', 'Chirurgeon')).toBe('Alchemist · Chirurgeon');
    expect(joinedName('Human', undefined)).toBe('Human');
  });

  test('earlier edits go first', () => {
    expect(after([{ kind: 'dropLevel' }], [{ kind: 'dropRank' }])).toEqual([
      { kind: 'dropLevel' },
      { kind: 'dropRank' },
    ]);
    expect(after([], [{ kind: 'dropRank' }])).toEqual([{ kind: 'dropRank' }]);
  });
});

describe('races with their heritages', () => {
  const fresh: Build = { scores: SCORES, levels: [], picks: [] };

  test('each race is listed with each heritage, and a race without one on its own', () => {
    const choices = raceChoices(e, fresh, walked(fresh));
    const names = choices.map((c) => c.name);
    expect(names).toContain('Tiefling · Beastbrood (Rakshasa-Spawn)');
    expect(names).toContain('Dwarf · Barrow Dwarf');
    expect(names).toContain('Human');
    expect(names.filter((n) => n.startsWith('Human'))).toEqual(['Human']);
    expect(names).toContain('Aasimar');
    expect(names.filter((n) => /^(\w+) \(\1 /.test(n))).toEqual([]);
    expect(choices.every((c) => c.open)).toBe(true);
  });

  test('one row sets the race and its heritage before level 1, and the heritage holds at level 1', () => {
    const row = named(raceChoices(e, fresh, walked(fresh)), 'Tiefling · Beastbrood (Rakshasa-Spawn)');
    const raced = taken(fresh, row);
    expect(raced.race).toBe(TIEFLING);
    expect(raceLabel(e, raced, walked(raced))).toBe('Tiefling · Beastbrood (Rakshasa-Spawn)');
    const levelled = allows(e.data, raced, { kind: 'addLevel', class: FIGHTER }, e.G);
    expect(levelled.ok).toBe(true);
    if (!levelled.ok) return;
    expect(raceLabel(e, levelled.build, walked(levelled.build))).toBe('Tiefling · Beastbrood (Rakshasa-Spawn)');
    expect(walked(levelled.build).slots.filter((s) => s.source.kind === 'race' && s.pick === undefined)).toEqual([]);
    expect(named(raceChoices(e, levelled.build, walked(levelled.build)), row.name).current).toBe(true);
  });

  test('another race clears the old heritage first, so it clears no later pick', () => {
    const fresh1: Build = { scores: SCORES, levels: [{ class: FIGHTER }], picks: [] };
    const tiefling = taken(
      fresh1,
      named(raceChoices(e, fresh1, walked(fresh1)), 'Tiefling · Beastbrood (Rakshasa-Spawn)'),
    );
    const human = named(raceChoices(e, tiefling, walked(tiefling)), 'Human');
    expect(human.note).toBeUndefined();
    expect(verdictOfAll(e, trusted(tiefling), human.edits).kind).toBe('applies');
    const now = taken(tiefling, human);
    const heritages = new Set(
      walked(tiefling)
        .slots.filter((s) => s.source.kind === 'race')
        .map((s) => slotKey(s.id)),
    );
    expect(now.picks.filter((p) => heritages.has(slotKey(p.slot)))).toEqual([]);
  });
});

describe('backgrounds with their variations', () => {
  const levelled: Build = { scores: SCORES, levels: [{ class: FIGHTER }], picks: [] };
  const base = () => {
    const b = backgroundSlot({ data: e.data, build: trusted(levelled), walk: walked(levelled) });
    if (b === undefined) throw new Error('no background slot');
    return b.id;
  };

  test('each group is listed with each variation, and a group without one on its own', () => {
    const names = backgroundChoices(e, levelled, walked(levelled), base()).map((c) => c.name);
    expect(names).toContain('Noble (Courtier)');
    expect(names).toContain('Warrior (Gladiator)');
    expect(names).not.toContain('Noble');
    expect(names).not.toContain('None');
    expect(names.filter((n) => /\(Background Selection\)/.test(n))).toEqual([]);
  });

  test('one row takes the group and its variation, and another group clears the old variation', () => {
    const courtier = named(backgroundChoices(e, levelled, walked(levelled), base()), 'Noble (Courtier)');
    const noble = taken(levelled, courtier);
    expect(backgroundLabel(e, noble, walked(noble), base())).toBe('Noble (Courtier)');
    const guard = named(backgroundChoices(e, noble, walked(noble), base()), 'Warrior (Guard)');
    const warrior = taken(noble, guard);
    expect(backgroundLabel(e, warrior, walked(warrior), base())).toBe('Warrior (Guard)');
    expect(warrior.picks).toHaveLength(2);
  });
});

describe('the character’s picks line', () => {
  test('names the race and the background as their flat pairs (QA pass 2)', () => {
    const fresh: Build = { scores: SCORES, levels: [{ class: FIGHTER }], picks: [] };
    const raced = taken(fresh, named(raceChoices(e, fresh, walked(fresh)), 'Tiefling · Beastbrood (Rakshasa-Spawn)'));
    const base = backgroundSlot({ data: e.data, build: trusted(raced), walk: walked(raced) });
    if (base === undefined) throw new Error('no background slot');
    const done = taken(raced, named(backgroundChoices(e, raced, walked(raced), base.id), 'Scholar (Nature)'));
    const line = characterPicksLine({ data: e.data, build: trusted(done), walk: walked(done) });
    expect(line.startsWith('Tiefling · Beastbrood (Rakshasa-Spawn) · ')).toBe(true);
    expect(line).toContain('Scholar (Nature)');
    expect(line).not.toContain('Scholar — Nature');
    expect(line.split('Beastbrood')).toHaveLength(2);
  });
});

describe('archetypes', () => {
  test('a class lists the archetypes the game shows', () => {
    expect(shownArchetypes(e.data, FIGHTER).length).toBeGreaterThan(0);
    expect(shownArchetypes(e.data, TIEFLING)).toEqual([]);
  });
});
