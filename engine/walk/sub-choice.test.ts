import { describe, expect, it } from 'vitest';
import { childSlot, parentKey, slotKey, type Build, type Pick, type SlotId } from '../build';
import { BASIC_FEAT_SELECTION, build, data, FIGHTER, G, HUMAN, levels } from './test-data';
import { walk } from './walk';

const SKILL_FOCUS = 'c9629ef9eebb88b479b2fbc5e836656a';
const LORE_RELIGION = 'c541f80af8d0af4498e1abb6025780c7';
const ATHLETICS = '9db907332bdaec1468cff3a99efef5b4';

const levelFeat: SlotId = { place: { level: 1 }, selection: BASIC_FEAT_SELECTION, index: 0 };
const humanFeat: SlotId = { place: { level: 1 }, selection: BASIC_FEAT_SELECTION, index: 0, from: HUMAN };
const skillOf = (parent: SlotId) => childSlot(parent, SKILL_FOCUS);
const focus = (parent: SlotId, skill: string): Pick[] => [
  { slot: parent, feature: SKILL_FOCUS },
  { slot: skillOf(parent), feature: skill },
];
const fighter = (picks: Pick[]): Build => build({ race: HUMAN, levels: levels(FIGHTER, 1), picks });

describe('a sub-choice names the slot that opened it (map 35)', { timeout: 30_000 }, () => {
  it('builds a sub-choice id from its parent alone, index 0', () => {
    const child = skillOf(levelFeat);
    expect(child).toEqual({ place: { level: 1 }, selection: SKILL_FOCUS, index: 0, parent: slotKey(levelFeat) });
    expect(parentKey(child)).toBe(slotKey(levelFeat));
    expect(parentKey(levelFeat)).toBeUndefined();
    expect(slotKey(skillOf(levelFeat))).not.toBe(slotKey(skillOf(humanFeat)));
  });

  it("opens each Skill Focus's skill list under its own feat, the same with or without the other", () => {
    const opened = (picks: Pick[]) =>
      walk(data, fighter(picks), G)
        .slots.filter((s) => s.id.selection === SKILL_FOCUS)
        .map((s) => slotKey(s.id))
        .sort();
    expect(opened(focus(levelFeat, LORE_RELIGION))).toEqual([slotKey(skillOf(levelFeat))]);
    expect(opened(focus(humanFeat, ATHLETICS))).toEqual([slotKey(skillOf(humanFeat))]);
    expect(opened([...focus(levelFeat, LORE_RELIGION), ...focus(humanFeat, ATHLETICS)])).toEqual(
      [slotKey(skillOf(levelFeat)), slotKey(skillOf(humanFeat))].sort(),
    );
  });

  it("keeps one feat's skill when the other feat's pick goes", () => {
    const both = [...focus(levelFeat, LORE_RELIGION), ...focus(humanFeat, ATHLETICS)];
    const w = walk(data, fighter(both), G);
    expect(w.failures).toEqual([]);
    expect(w.unit.hasFact(LORE_RELIGION)).toBe(true);
    expect(w.unit.hasFact(ATHLETICS)).toBe(true);
    const withoutHuman = walk(data, fighter(focus(levelFeat, LORE_RELIGION)), G);
    expect(withoutHuman.failures).toEqual([]);
    expect(withoutHuman.unit.hasFact(LORE_RELIGION)).toBe(true);
    const withoutLevel = walk(data, fighter(focus(humanFeat, ATHLETICS)), G);
    expect(withoutLevel.failures).toEqual([]);
    expect(withoutLevel.unit.hasFact(ATHLETICS)).toBe(true);
  });

  it('refuses the same skill twice, whichever Skill Focus comes first', () => {
    for (const [first, second] of [
      [levelFeat, humanFeat],
      [humanFeat, levelFeat],
    ] as const) {
      const w = walk(data, fighter([...focus(first, LORE_RELIGION), ...focus(second, LORE_RELIGION)]), G);
      const refused = w.failures.filter((f) => f.choice === 'pick').map((f) => (f.slot ? slotKey(f.slot) : ''));
      expect(refused).toHaveLength(1);
      expect([slotKey(skillOf(levelFeat)), slotKey(skillOf(humanFeat))]).toContain(refused[0]);
    }
  });
});
