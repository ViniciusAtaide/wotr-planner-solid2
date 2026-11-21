import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadData } from '../load';
import { readDataDir } from '../data-dir';
import { buildGrantIndex } from '../grants';
import { heldIndex, stackable, synergyOf, topicKey, topicsOf } from './topics';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const data = loadData(files.files, files.overrides);
buildGrantIndex(data);

const COMBAT_CASTING = '06964d468fde1dc4aa71a92ea04d930d';
const DODGE = '97e216dbb46ae3c4faef90cf6bbe6fd5';
const SPELL_FOCUS = '16fa59cc9a72a6043b566b49184f53fe';
const STRENGTH_OF_THE_ABYSS_9 = 'd3ccd7c74caab594485c20f694aca91d';
const STRENGTH_OF_THE_ABYSS_13 = '13ea370344ca1444c928ddf8177fcdfc';

describe('Synergy topics', { timeout: 30_000 }, () => {
  it("stacks exactly the bonus types the game's helper lists", () => {
    for (const d of ['None', 'Racial', 'Dodge', 'UntypedStackable', 'Feat', 'NaturalArmor'] as const)
      expect(stackable(d)).toBe(true);
    for (const d of ['Inherent', 'Competence', 'Insight', 'Enhancement', 'Morale'] as const)
      expect(stackable(d)).toBe(false);
  });

  it('reads an ability from an above-average score prerequisite, not from the Intelligence 3 gate', () => {
    expect(topicsOf(data, COMBAT_CASTING).map(topicKey)).not.toContain('ability Intelligence');
    expect(topicsOf(data, DODGE).map(topicKey)).toContain('ability Dexterity');
  });

  it("reads a parametrized pick's school or weapon from its parameter", () => {
    expect(topicsOf(data, SPELL_FOCUS, { SpellSchool: 'Evocation' }).map(topicKey)).toEqual(['school Evocation']);
    expect(topicsOf(data, SPELL_FOCUS, { WeaponCategory: 'Longsword' }).map(topicKey)).toContain('weapon Longsword');
  });

  it('warns that a bonus of the same type to the same stat as a held one will not stack', () => {
    const held = heldIndex(data, [{ blueprint: STRENGTH_OF_THE_ABYSS_9 }]);
    const s = synergyOf(data, held, { feature: STRENGTH_OF_THE_ABYSS_13 });
    expect(s.wontStack).toEqual([{ stat: 'Strength', descriptor: 'Inherent', with: [STRENGTH_OF_THE_ABYSS_9] }]);
    expect(s.shared.map((t) => topicKey(t.topic))).toEqual(['ability Strength']);
  });
});
