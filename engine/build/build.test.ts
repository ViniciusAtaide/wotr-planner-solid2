import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  rankLevel,
  sameBuild,
  toArchetypes,
  toSkillRank,
  toSkillRanks,
  type Archetypes,
  type Build,
  type ClassChoice,
} from './build';

const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
const BASIC = '247a4068296e8be42890143f451b4b45';
const DODGE = '97e216dbb46ae3c4faef90cf6bbe6fd5';
const TOUGHNESS = 'd09b20029e9abfe4480b356c92095623';
const TWO_HANDED = '84643e02a764bff4a9c1aba333a53c89';
const MUTATION_WARRIOR = '758e0061a077e54409a3bf0eb51511e5';

const dodge = { slot: { place: { level: 1 }, selection: BASIC, index: 0 }, feature: DODGE };
const toughness = { slot: { place: { level: 1 }, selection: BASIC, index: 1 }, feature: TOUGHNESS };

describe('skill ranks (ticket 05d)', () => {
  it('drops a zero, as the Build code does, and refuses a negative or fractional rank', () => {
    expect(toSkillRank(0)).toBeUndefined();
    expect(toSkillRanks({ SkillAthletics: 0, SkillMobility: 2 })).toEqual({ SkillMobility: 2 });
    expect(toSkillRanks({ SkillAthletics: -1 })).toBeUndefined();
    expect(toSkillRanks({ SkillAthletics: 1.5 })).toBeUndefined();
  });
});

describe('archetypes: at most one per class (ticket 05d)', () => {
  it('takes none or one, and refuses two', () => {
    expect(toArchetypes([])).toEqual([]);
    expect(toArchetypes([TWO_HANDED])).toEqual([TWO_HANDED]);
    expect(toArchetypes([TWO_HANDED, MUTATION_WARRIOR])).toBeUndefined();
  });

  it('holds no two-element tuple, by type', () => {
    expectTypeOf<readonly [string, string]>().not.toExtend<ClassChoice['archetypes']>();
    expectTypeOf<readonly [string]>().toExtend<Archetypes>();
    expectTypeOf(toArchetypes).returns.toEqualTypeOf<Archetypes | undefined>();
  });
});

describe('sameBuild', () => {
  const build: Build = {
    levels: [{ class: FIGHTER }],
    ranks: [{ class: FIGHTER, level: rankLevel(1) }],
    picks: [dodge, toughness],
    gear: { Head: DODGE, Armor: TOUGHNESS },
  };

  it('compares picks by slot key, not by the order they were made in', () => {
    expect(sameBuild(build, { ...build, picks: [toughness, dodge] })).toBe(true);
    expect(sameBuild(build, { ...build, gear: { Armor: TOUGHNESS, Head: DODGE } })).toBe(true);
  });

  it('tells a different choice apart', () => {
    expect(sameBuild(build, { ...build, picks: [dodge] })).toBe(false);
    expect(sameBuild(build, { ...build, picks: [dodge, { ...toughness, feature: DODGE }] })).toBe(false);
    expect(sameBuild(build, { ...build, levels: [] })).toBe(false);
    expect(sameBuild(build, { ...build, countGear: true })).toBe(false);
  });
});
