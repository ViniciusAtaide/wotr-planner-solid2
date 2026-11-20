import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { abilityScores, slotKey, type Build, type SlotId } from '../build';
import { loadData } from '../load';
import { readDataDir } from '../data-dir';
import { enforcer, jackInTheGreen } from '../gold';
import { buildGrantIndex } from '../grants';
import { candidates, picker } from './pickers';
import { offeredClasses, offeredMythicClasses, offeredRaces } from './offers';
import { breaks, opensAt, refusal } from '../refusals';
import { pauseAt, walk } from '../walk';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const data = loadData(files.files, files.overrides);
const G = buildGrantIndex(data);

const HUMAN = '0a5d473ead98b0646b94495af250fdc4';
const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
const SORCERER = 'b3a505fb61437dc4097f43c3f8f9a4cf';
const BASIC = '247a4068296e8be42890143f451b4b45';
const FIGHTER_FEAT = '41c8486641f7d6d4283ca9dae4147a9f';
const POWER_ATTACK = '9972f33f977fc724c838e59641b2fca5';
const DODGE = '97e216dbb46ae3c4faef90cf6bbe6fd5';
const WEAPON_FOCUS = '1e1f627d26ad36f43bbd26cc2bf8ac7e';
const TWO_WEAPON_FIGHTING_GREATER = 'c126adbdf6ddd8245bda33694cd774e8';
const BELT_OF_DEXTERITY_2 = 'b6af4c1834999e74497b41588d1071cd';
const ASMODEUS_FEATURE = 'a3a5ccc9c670e6f4ca4a686d23b89900';
const DEITY_SELECTION = '59e7a76987fe3b547b9cce045f4db3e4';
const DOMAINS_SELECTION = '48525e5da45c9c243a343fc6545dbdb9';
const AIR_DOMAIN_PROGRESSION = '750bfcd133cd52f42acbd4f7bc9cc365';
const TOUGHNESS = 'd09b20029e9abfe4480b356c92095623';
const SPELL_FOCUS_GREATER = '5b04b45b228461c43bad768eb0f7c7bf';
const SPELL_FOCUS_MYTHIC_FEAT = '41fa2470ab50ff441b4cfbb2fc725109';
const scores = abilityScores({
  Strength: 10,
  Dexterity: 12,
  Constitution: 10,
  Intelligence: 10,
  Wisdom: 10,
  Charisma: 10,
});

describe('S: the pickers', () => {
  it.each([jackInTheGreen, enforcer])(
    "judges each of $name's own picks at its slot as the walk does",
    (gold) => {
      const refused = new Set(walk(data, gold.build, G).failures.flatMap((f) => (f.slot ? [slotKey(f.slot)] : [])));
      for (const p of gold.build.picks) {
        const paused = pauseAt(data, gold.build, p.slot, G);
        expect(paused, slotKey(p.slot)).toBeDefined();
        expect(paused?.judge(p.feature, p.param) !== undefined, slotKey(p.slot)).toBe(refused.has(slotKey(p.slot)));
      }
    },
    60_000,
  );

  it("lists a selection's items, a parametrized feat once per parameter", () => {
    const options = candidates(data, BASIC);
    const focus = options.filter((o) => o.feature === WEAPON_FOCUS);
    expect(focus).toContainEqual({
      feature: WEAPON_FOCUS,
      param: { WeaponCategory: 'Longsword' },
    });
    expect(focus.length).toBeGreaterThan(80);
    expect(options).toContainEqual({ feature: POWER_ATTACK });
  });

  it('shows an option open with the items it needs under the Gear opt-in', () => {
    const slot = enforcer.build.picks.find((p) => p.feature === TWO_WEAPON_FIGHTING_GREATER)?.slot as SlotId;
    const option = picker(data, enforcer.build, slot, G)?.options.find(
      (o) => o.feature === TWO_WEAPON_FIGHTING_GREATER,
    );
    expect(option).toMatchObject({ gearItems: [BELT_OF_DEXTERITY_2] });
    expect(option?.closed).toBeUndefined();
  });

  it('returns nothing for a slot the Build never opens', () => {
    expect(picker(data, jackInTheGreen.build, { place: { level: 2 }, selection: BASIC, index: 0 }, G)).toBeUndefined();
  });
});

describe('R: the Refusal', () => {
  const sorcerer: Build = { race: HUMAN, scores, levels: [{ class: SORCERER }], picks: [] };

  it('words an unmet stat with what the character has', () => {
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
    const CLERIC = '67819271767a9dd4fbfd4ae700befea0';
    const cleric: Build = {
      race: HUMAN,
      alignment: 'LawfulEvil',
      levels: [{ class: CLERIC }],
      picks: [
        {
          slot: { place: { level: 1 }, selection: DEITY_SELECTION, index: 0 },
          feature: ASMODEUS_FEATURE,
        },
      ],
    };
    const slot = { place: { level: 1 }, selection: DOMAINS_SELECTION, index: 0 };
    const paused = pauseAt(data, cleric, slot, G);
    const closed = paused?.judge(AIR_DOMAIN_PROGRESSION);
    const words = refusal({ data, G, unit: paused?.unit }, closed ?? { rule: 'LevelUpState.AddSelection' });
    expect(words.unmet.join(' ')).toMatch(
      /^Needs (a deity that allows it \(yours, Asmodeus.*, doesn't\)|one of .+)\.$/,
    );
  });

  it('lists the later picks a swap would break', () => {
    const swapped = breaks(
      data,
      jackInTheGreen.build,
      { slot: { place: { level: 5 }, selection: BASIC, index: 0 }, feature: TOUGHNESS },
      G,
    );
    expect(swapped.map((p) => p.feature)).toEqual([SPELL_FOCUS_GREATER, SPELL_FOCUS_MYTHIC_FEAT]);
  });

  it('names the later place where a closed option opens', () => {
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

describe('what character creation offers (comparison bug 5)', () => {
  const names = (bps: readonly { readonly name?: string | undefined }[]) => bps.map((b) => b.name);

  it('offers the root progression’s player classes and races, and no creature classes', () => {
    const classes = names(offeredClasses(data));
    expect(classes).toContain('Fighter');
    expect(classes).toContain('Winter Witch');
    for (const creature of ['Animal', 'Dragon', 'Monstrous Humanoid']) expect(classes).not.toContain(creature);
    expect(names(offeredRaces(data))).toHaveLength(12);
  });

  it('offers the Mythic paths, without the companions’ class or Shard Powers', () => {
    const mythics = names(offeredMythicClasses(data));
    for (const path of ['Mythic Hero', 'Aeon', 'Azata', 'Legend']) expect(mythics).toContain(path);
    expect(mythics).not.toContain('Mythic Companion');
    expect(mythics).not.toContain('Shard Powers');
  });
});
