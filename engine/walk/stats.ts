import type { Build, LevelUp } from '../build';
import type { Attribute, BlueprintArchetype, BlueprintCharacterClass, BlueprintRace, StatType } from '../data';
import type { FailedRule } from './failure';
import { ATTRIBUTES, isSkill, type Unit } from './unit';

export interface StatsHost {
  readonly unit: Unit;
  readonly build: Build;
  readonly level: { attributePoints: number };
  fail(
    failure: FailedRule & { readonly choice: 'raceStat' | 'scores' | 'increase' | 'skills'; readonly subject?: string },
  ): void;
}

const STAT_VALUE_COSTS = [-4, -4, -4, -4, -4, -4, -4, -4, -2, -1, 0, 1, 2, 3, 5, 7, 10, 13, 17, 17, 17, 17, 17, 17, 17];

export const POINT_BUY = 25;

export function attributeBonus(score: number): number {
  return Math.floor(score / 2) - 5;
}

export function pointBuyCost(scores: Readonly<Record<Attribute, number>>): number {
  return ATTRIBUTES.reduce((sum, a) => sum + (STAT_VALUE_COSTS[scores[a]] ?? Number.NaN), 0);
}

function scores(host: StatsHost): void {
  const s = host.build.scores;
  if (s === undefined) return;
  for (const a of ATTRIBUTES) {
    if (s[a] < 7)
      host.fail({ choice: 'scores', subject: a, rule: 'StatsDistribution.CanRemove', found: s[a], needed: 7 });
    else if (s[a] > 18 || !Number.isInteger(s[a])) {
      host.fail({ choice: 'scores', subject: a, rule: 'StatsDistribution.CanAdd', found: s[a], needed: 18 });
    }
  }
  const cost = pointBuyCost(s);
  if (!(cost <= POINT_BUY))
    host.fail({ choice: 'scores', rule: 'StatsDistribution.CanAdd', found: cost, needed: POINT_BUY });
  for (const a of ATTRIBUTES) host.unit.base.set(a, s[a]);
}

function raceStat(host: StatsHost): void {
  const chosen = host.build.raceStat;
  if (chosen === undefined) return;
  const race = host.unit.race === undefined ? undefined : (host.unit.bp(host.unit.race) as BlueprintRace | undefined);
  if (race?.SelectableRaceStat !== true) {
    host.fail({ choice: 'raceStat', subject: chosen, rule: 'SelectRaceStat.Check' });
    return;
  }
  host.unit.raceStat.set(chosen, 2);
}

function increase(host: StatsHost, level: LevelUp): void {
  const chosen = level.increase;
  if (chosen === undefined) return;
  if (host.level.attributePoints <= 0) {
    host.fail({ choice: 'increase', subject: chosen, rule: 'SpendAttributePoint.Check', found: 0, needed: 1 });
    return;
  }
  host.level.attributePoints--;
  host.unit.base.set(chosen, (host.unit.base.get(chosen) ?? 10) + 1);
}

function intelligencePoints(unit: Unit, level: number): number {
  const value = Math.floor(unit.permanent('Intelligence') / 2) - 5;
  const size = Math.abs(value);
  return Math.sign(value) * (level % 2 === 1 ? Math.trunc((size + 1) / 2) : Math.trunc(size / 2));
}

export function skillPointsAvailable(unit: Unit): number {
  let total = 0;
  for (let i = 1; i <= unit.characterLevel; i++) total += intelligencePoints(unit, i);
  for (const c of unit.classes) {
    const cls = unit.bp(c.class) as BlueprintCharacterClass | undefined;
    if (cls === undefined || cls.IsMythic) continue;
    const perLevel =
      cls.SkillPoints + c.archetypes.reduce((s, a) => s + ((unit.bp(a) as BlueprintArchetype).AddSkillPoints ?? 0), 0);
    total += perLevel * c.level;
  }
  total = Math.max(total, unit.characterLevel);
  const extra = unit.componentsOf('AddSkillPointPerCharacterLevel').length * unit.characterLevel;
  return Math.max(1, total + extra - unit.spentSkillPoints);
}

function skills(host: StatsHost, level: LevelUp): void {
  const { unit } = host;
  let left = skillPointsAvailable(unit);
  for (const [skill, ranks] of Object.entries(level.skills ?? {}) as [StatType, number][]) {
    for (let i = 0; i < ranks; i++) {
      const now = unit.base.get(skill) ?? 0;
      const refused: FailedRule | undefined = !isSkill(skill)
        ? { rule: 'SpendSkillPoint.Check:skill' }
        : now >= unit.characterLevel
          ? { rule: 'SpendSkillPoint.Check:ranks', found: now + 1, needed: unit.characterLevel }
          : left <= 0
            ? { rule: 'SpendSkillPoint.Check:points', found: 0, needed: 1 }
            : undefined;
      if (refused !== undefined) {
        host.fail({ choice: 'skills', subject: skill, ...refused });
        break;
      }
      left--;
      unit.spentSkillPoints++;
      unit.base.set(skill, now + 1);
    }
  }
}

export const applyStats = { scores, raceStat, increase, skills };
