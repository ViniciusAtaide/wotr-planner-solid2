// S and R on the committed data (build ticket 04). Each expectation is the game's, cited by blueprint and GUID.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { slotKey, type Build, type SlotId } from './build';
import { loadData } from './data/load';
import { readDataDir } from './data/read-dir';
import { enforcer } from './gold/enforcer';
import { jackInTheGreen } from './gold/jack-in-the-green';
import { buildGrantIndex } from './grants';
import { candidates, picker } from './pickers';
import { breaks, opensAt, refusal } from './refusals';
import { pauseAt, walk } from './walk/walk';

const files = readDataDir(fileURLToPath(new URL('../data', import.meta.url)));
const data = loadData(files.files, files.overrides);
const G = buildGrantIndex(data);

const HUMAN = '0a5d473ead98b0646b94495af250fdc4';
const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
const SORCERER = 'b3a505fb61437dc4097f43c3f8f9a4cf';
const BASIC = '247a4068296e8be42890143f451b4b45';
const FIGHTER_FEAT = '41c8486641f7d6d4283ca9dae4147a9f';
const POWER_ATTACK = '9972f33f977fc724c838e59641b2fca5';
const DODGE = '97e216dbb46ae3c4faef90cf6bbe6fd5';
const scores = { Strength: 10, Dexterity: 12, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 };

describe('S: the pickers', () => {
  it.each([jackInTheGreen, enforcer])(
    "judges each of $name's own picks at its slot as the walk does",
    (gold) => {
      // The pause point (build ticket 04): the end of the slot's band, the slot's own pick withdrawn.
      const refused = new Set(walk(data, gold.build, G).failures.flatMap((f) => (f.slot ? [slotKey(f.slot)] : [])));
      for (const p of gold.build.picks) {
        const paused = pauseAt(data, gold.build, p.slot, G);
        expect(paused, slotKey(p.slot)).toBeDefined();
        expect(paused?.judge(p.feature, p.param) !== undefined, slotKey(p.slot)).toBe(refused.has(slotKey(p.slot)));
      }
      // About 50 walks: well past vitest's 5 s default on a busy machine.
    },
    60_000,
  );

  it("lists a selection's items, a parametrized feat once per parameter", () => {
    // BasicFeatSelection's m_AllFeatures; WeaponFocus 1e1f627d26ad36f43bbd26cc2bf8ac7e takes a weapon category.
    const options = candidates(data, BASIC);
    const focus = options.filter((o) => o.feature === '1e1f627d26ad36f43bbd26cc2bf8ac7e');
    expect(focus).toContainEqual({
      feature: '1e1f627d26ad36f43bbd26cc2bf8ac7e',
      param: { WeaponCategory: 'Longsword' },
    });
    expect(focus.length).toBeGreaterThan(80);
    expect(options).toContainEqual({ feature: POWER_ATTACK });
  });

  it('shows an option open with the items it needs under the Gear opt-in', () => {
    // The Enforcer's L19 Greater Two-Weapon Fighting c126adbdf6ddd8245bda33694cd774e8 needs its belt (ADR 0002).
    const slot = enforcer.build.picks.find((p) => p.feature === 'c126adbdf6ddd8245bda33694cd774e8')?.slot as SlotId;
    const option = picker(data, enforcer.build, slot, G)?.options.find(
      (o) => o.feature === 'c126adbdf6ddd8245bda33694cd774e8',
    );
    expect(option).toMatchObject({ gearItems: ['b6af4c1834999e74497b41588d1071cd'] });
    expect(option?.closed).toBeUndefined();
  });

  it('returns nothing for a slot the Build never opens', () => {
    expect(picker(data, jackInTheGreen.build, { place: { level: 2 }, selection: BASIC, index: 0 }, G)).toBeUndefined();
  });
});

describe('R: the Refusal', () => {
  const sorcerer: Build = { race: HUMAN, scores, levels: [{ class: SORCERER }], picks: [] };

  it('words an unmet stat with what the character has', () => {
    // PowerAttackFeature 9972f33f977fc724c838e59641b2fca5 needs Strength 13 (PrerequisiteStatValue).
    const closed = picker(data, sorcerer, { place: { level: 1 }, selection: BASIC, index: 0 }, G)?.options.find(
      (o) => o.feature === POWER_ATTACK,
    )?.closed;
    expect(closed).toBeDefined();
    expect(refusal({ data, G }, closed ?? { rule: 'LevelUpState.AddSelection' })).toEqual({
      rule: 'BlueprintFeatureSelection.CanSelect:MeetsPrerequisites',
      text: "Its prerequisites aren't met.",
      unmet: ['Needs Strength 13 (yours: 10).'],
    });
  });

  it('words a nameless prerequisite by the kind of thing that grants it, and the Build’s own (map 19)', () => {
    // A cleric of Asmodeus a3a5ccc9c670e6f4ca4a686d23b89900 can't take the Air domain: AirDomainProgression needs
    // AirDomainAllowed, a nameless flag only deities grant.
    const CLERIC = '67819271767a9dd4fbfd4ae700befea0';
    const cleric: Build = {
      race: HUMAN,
      alignment: 'LawfulEvil',
      levels: [{ class: CLERIC }],
      picks: [
        {
          slot: { place: { level: 1 }, selection: '59e7a76987fe3b547b9cce045f4db3e4', index: 0 },
          feature: 'a3a5ccc9c670e6f4ca4a686d23b89900',
        },
      ],
    };
    const slot = { place: { level: 1 }, selection: '48525e5da45c9c243a343fc6545dbdb9', index: 0 };
    const paused = pauseAt(data, cleric, slot, G);
    const closed = paused?.judge('750bfcd133cd52f42acbd4f7bc9cc365');
    const words = refusal({ data, G, unit: paused?.unit }, closed ?? { rule: 'LevelUpState.AddSelection' });
    expect(words.unmet.join(' ')).toMatch(
      /^Needs (a deity that allows it \(yours, Asmodeus.*, doesn't\)|one of .+)\.$/,
    );
  });

  it('lists the later picks a swap would break', () => {
    // Jack's L5 Spell Focus (Evocation) holds up his L15 Greater Spell Focus and his M8 Spell Focus (Mythic).
    const swapped = breaks(
      data,
      jackInTheGreen.build,
      { slot: { place: { level: 5 }, selection: BASIC, index: 0 }, feature: 'd09b20029e9abfe4480b356c92095623' },
      G,
    );
    expect(swapped.map((p) => p.feature)).toEqual([
      '5b04b45b228461c43bad768eb0f7c7bf', // SpellFocusGreater
      '41fa2470ab50ff441b4cfbb2fc725109', // SpellFocusMythicFeat
    ]);
  });

  it('names the later place where a closed option opens', () => {
    // Dodge needs Dexterity 13: a Dexterity 12 fighter reaches it with the level-4 increase, at the L4 fighter feat.
    const fighter: Build = {
      race: HUMAN,
      scores,
      levels: Array.from({ length: 6 }, (_, i) => ({ class: FIGHTER, ...(i === 3 && { increase: 'Dexterity' }) })),
      picks: [],
    };
    const slot = { place: { level: 1 }, selection: FIGHTER_FEAT, index: 0 };
    expect(picker(data, fighter, slot, G)?.options.find((o) => o.feature === DODGE)?.closed).toBeDefined();
    expect(opensAt(data, fighter, slot, { feature: DODGE }, G)).toEqual({ level: 4 });
  });
});
