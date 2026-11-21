import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { abilityScores, placeKey, slotKey, type Build, type Place, type SlotId } from '../build';
import { loadData } from '../load';
import { readDataDir } from '../data-dir';
import type { Blueprint } from '../data';
import { enforcer, jackInTheGreen } from '../gold';
import { buildGrantIndex } from '../grants';
import { candidates, picker, shownInSelection } from './pickers';
import {
  BACKGROUNDS_BASE_SELECTION,
  characterWideSlots,
  mythicStartingClass,
  offeredClasses,
  offeredMythicClasses,
  offeredRaces,
} from './offers';
import { featureTags, tagsOf } from './tags';
import { classPicker } from './class-picker';
import { backgroundPicker } from './background-picker';
import { firstLevelWith, heritageSlotIn, racePicker } from './race-picker';
import { namesInList } from './option-names';
import { gearClashes, gearClashIndex } from './gear-clashes';
import { guids } from '../data';
import { breaks, opensAt, refusal } from '../refusals';
import { prerequisites } from '../prerequisites';
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

describe('S: the pickers', { timeout: 30_000 }, () => {
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

describe('R: the Refusal', { timeout: 30_000 }, () => {
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

describe('what character creation offers (comparison bug 5)', { timeout: 30_000 }, () => {
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

  it('words a repeated unmet prerequisite once, and never lists a failing ForcedTrue one for a class', () => {
    const ranks = jackInTheGreen.build.ranks ?? [];
    const ANGEL = 'a5a9fe8f663d701488bd1db8ea40484e';
    const angelOverAzata = walk(
      data,
      { ...jackInTheGreen.build, ranks: [...ranks.slice(0, 3), { class: ANGEL, level: ranks[3]!.level }] },
      G,
    ).failures.find((f) => f.subject === ANGEL && f.rule === 'BlueprintCharacterClass.MeetsPrerequisites');
    expect(angelOverAzata?.unmet?.length).toBeGreaterThan(0);
    const once = refusal({ data, G }, angelOverAzata!);
    const twice = refusal(
      { data, G },
      { ...angelOverAzata!, unmet: [...angelOverAzata!.unmet!, ...angelOverAzata!.unmet!] },
    );
    expect(twice.unmet).toEqual(once.unmet);
    expect(once.unmet.join(' ')).not.toMatch(/Angel level/);
  });

  it("judges a level's or rank's classes at one paused walk, as the walk judges each class put there", () => {
    const placed = (b: Build, place: Place, cls: string): Build =>
      'level' in place
        ? place.level > b.levels.length
          ? { ...b, levels: [...b.levels, { class: cls }] }
          : { ...b, levels: b.levels.map((l, i) => (i === place.level - 1 ? { ...l, class: cls } : l)) }
        : { ...b, ranks: (b.ranks ?? []).map((r, i) => (i === place.rank - 1 ? { ...r, class: cls } : r)) };
    const short: Build = {
      ...jackInTheGreen.build,
      levels: jackInTheGreen.build.levels.slice(0, 10),
      ranks: (jackInTheGreen.build.ranks ?? []).filter((r) => r.level <= 10),
      picks: jackInTheGreen.build.picks.filter((p) =>
        'level' in p.slot.place ? p.slot.place.level <= 10 : p.slot.place.rank <= 4,
      ),
    };
    const cases: [string, Build, Place][] = [
      ...[3, 9, 15].flatMap((level): [string, Build, Place][] => [
        ['Jack', jackInTheGreen.build, { level }],
        ['Enforcer', enforcer.build, { level }],
      ]),
      ['Jack', jackInTheGreen.build, { rank: 3 }],
      ['Jack', jackInTheGreen.build, { rank: 8 }],
      ['Jack to 10', short, { level: 11 }],
    ];
    const differ: string[] = [];
    let laterOnly = 0;
    for (const [who, b, place] of cases) {
      const p = classPicker(data, b, place, G);
      expect(p?.options.length ?? 0).toBeGreaterThan(10);
      for (const o of p?.options ?? []) {
        const failures = walk(data, placed(b, place, o.class), G).failures;
        const here = failures.filter(
          (f) => placeKey(f.place) === placeKey(place) && f.subject === o.class && f.choice !== 'pick',
        );
        if ((o.closed !== undefined) !== here.length > 0) differ.push(`${who} ${placeKey(place)} ${o.class}`);
        if (o.closed === undefined && failures.length > walk(data, b, G).failures.length) laterOnly++;
      }
    }
    expect(differ).toEqual([]);
    expect(laterOnly).toBeGreaterThan(0);
  }, 120_000);

  it("judges each archetype at the class's paused walk, as the walk judges it taken with the class there", () => {
    const short: Build = {
      ...jackInTheGreen.build,
      levels: jackInTheGreen.build.levels.slice(0, 10),
      ranks: (jackInTheGreen.build.ranks ?? []).filter((r) => r.level <= 10),
      picks: jackInTheGreen.build.picks.filter((p) =>
        'level' in p.slot.place ? p.slot.place.level <= 10 : p.slot.place.rank <= 4,
      ),
    };
    const cases: [string, Build, Place][] = [
      ['Jack', jackInTheGreen.build, { level: 3 }],
      ['Enforcer', enforcer.build, { level: 3 }],
      ['Jack to 10', short, { level: 11 }],
    ];
    const differ: string[] = [];
    let judged = 0;
    for (const [who, b, place] of cases) {
      const p = classPicker(data, b, place, G);
      for (const o of p?.options ?? []) {
        if (o.closed !== undefined || (p?.unit.classLevel(o.class) ?? 0) > 0) continue;
        for (const a of o.archetypes) {
          const level = (place as { level: number }).level;
          const placed: Build = {
            ...b,
            levels:
              level > b.levels.length
                ? [...b.levels, { class: o.class }]
                : b.levels.map((l, i) => (i === level - 1 ? { ...l, class: o.class } : l)),
            classChoices: { ...b.classChoices, [o.class]: { archetypes: [a.archetype] } },
          };
          const here = walk(data, placed, G).failures.filter(
            (f) => f.choice === 'archetype' && f.subject === a.archetype && placeKey(f.place) === placeKey(place),
          );
          judged++;
          if ((a.closed !== undefined) !== here.length > 0) differ.push(`${who} ${placeKey(place)} ${a.archetype}`);
        }
      }
    }
    expect(judged).toBeGreaterThan(50);
    expect(differ).toEqual([]);
  }, 120_000);

  it("closes an archetype the Enforcer's race can't take, and hides a class the game shows only when its prerequisites hold", () => {
    const SORCERER = 'b3a505fb61437dc4097f43c3f8f9a4cf';
    const NINE_TAILED_HEIR = '65a630aa291f65047b90a2af5df75d83';
    const ELDRITCH_SCION_CLASS = 'f5b8c63b141b2f44cbb8c2d7579c34f5';
    const p = classPicker(data, enforcer.build, { level: 3 }, G);
    const heir = p?.options.find((o) => o.class === SORCERER)?.archetypes.find((a) => a.archetype === NINE_TAILED_HEIR);
    expect(heir?.closed?.rule).toBe('BlueprintArchetype.MeetsPrerequisites');
    const scion = p?.options.find((o) => o.class === ELDRITCH_SCION_CLASS);
    expect(scion?.closed?.rule).toBe('BlueprintCharacterClass.MeetsPrerequisites');
    expect(scion?.shown).toBe(false);
    expect(p?.options.find((o) => o.class === SORCERER)?.shown).toBe(true);
  });

  it('judges every race and heritage row as the walk and the slot picker judge them in the whole Build', () => {
    let heritages = 0;
    const differ: string[] = [];
    for (const gold of [jackInTheGreen, enforcer]) {
      for (const r of racePicker(data, gold.build, G)) {
        const raced: Build = { ...firstLevelWith(data, gold.build, r.race), levels: gold.build.levels, picks: [] };
        const w = walk(data, raced, G);
        const refused = w.failures.some((f) => f.choice === 'race' && f.subject === r.race);
        if ((r.closed !== undefined) !== refused) differ.push(`${gold.name} race ${r.race}`);
        const slot = heritageSlotIn(data, w.slots);
        if ((slot === undefined) !== (r.heritage === undefined)) differ.push(`${gold.name} heritage slot ${r.race}`);
        if (slot === undefined || r.heritage === undefined) continue;
        const whole = picker(data, raced, slot.id, G);
        for (const o of r.heritage.options) {
          heritages++;
          const there = whole?.options.find((x) => x.feature === o.feature);
          if ((o.closed === undefined) !== (there?.closed === undefined)) differ.push(`${gold.name} ${o.feature}`);
        }
      }
    }
    expect(heritages).toBeGreaterThan(10);
    expect(differ).toEqual([]);
  }, 120_000);

  it("judges every background group's sub-choices as the walk's own child slot does", () => {
    let judged = 0;
    const differ: string[] = [];
    for (const gold of [jackInTheGreen, enforcer]) {
      const base = walk(data, gold.build, G).slots.find((x) => x.id.selection === BACKGROUNDS_BASE_SELECTION);
      expect(base).toBeDefined();
      const bp = backgroundPicker(data, gold.build, base!.id, G);
      for (const group of bp?.groups ?? []) {
        const old = gold.build.picks.find((q) => slotKey(q.slot) === slotKey(base!.id))?.feature;
        const chosen: Build = {
          ...gold.build,
          picks: [
            ...gold.build.picks.filter((q) => slotKey(q.slot) !== slotKey(base!.id) && q.slot.selection !== old),
            { slot: base!.id, feature: group.option.feature },
          ],
        };
        const children = walk(data, chosen, G).slots.filter((x) => x.parent === slotKey(base!.id));
        if (children.length !== (group.child === undefined ? 0 : 1))
          differ.push(`${gold.name} children ${group.option.feature}`);
        if (group.child === undefined || children[0] === undefined) continue;
        if (slotKey(children[0].id) !== slotKey(group.child.slot.id))
          differ.push(`${gold.name} slot ${group.option.feature}`);
        const whole = picker(data, chosen, children[0].id, G);
        for (const o of group.child.options) {
          judged++;
          const there = whole?.options.find(
            (x) => x.feature === o.feature && JSON.stringify(x.param) === JSON.stringify(o.param),
          );
          if ((o.closed === undefined) !== (there?.closed === undefined)) differ.push(`${gold.name} ${o.feature}`);
        }
      }
    }
    expect(judged).toBeGreaterThan(10);
    expect(differ).toEqual([]);
  }, 120_000);

  it('words a condition by the family its options share, else by a few bare names', () => {
    const DRAGON_DISCIPLE = '72051275b1dbb2d42ba9118237794f7c';
    const p = classPicker(data, jackInTheGreen.build, { level: 10 }, G);
    const ddLeaf = prerequisites(data.blueprints.get(DRAGON_DISCIPLE)!, data.blueprints).find(
      (l) => l.names.kind === 'condition',
    )!;
    const [condition] = refusal(
      { data, G, unit: p?.unit },
      { rule: 'BlueprintCharacterClass.MeetsPrerequisites', unmet: [{ leaf: ddLeaf }] },
    ).unmet;
    expect(condition).toMatch(/^Needs a Draconic Bloodline( \(yours: [^)]+\))?\.$/);
    expect(condition!.length).toBeLessThan(80);
    const second = [...data.blueprints.values()].find((b) => b.assetName === 'BloodragerDragonBlackSecondBloodline')!;
    const leaf = prerequisites(second, data.blueprints).find((l) => l.names.kind === 'condition')!;
    const [line] = refusal(
      { data, G },
      { rule: 'BlueprintFeatureSelection.CanSelect:MeetsPrerequisites', unmet: [{ leaf }] },
    ).unmet;
    expect(line).toMatch(/^Needs one of .+ and \d+ more\.$/);
    expect(line!.length).toBeLessThanOrEqual(120);
    expect(line).not.toMatch(/Second Bloodrager Bloodline/);
  });

  it('marks the options that share an ability, a weapon, a school, an energy or a descriptor with what the gold Builds hold', () => {
    const kinds = (gold: typeof jackInTheGreen) => {
      const found = new Set<string>();
      for (const p of gold.build.picks)
        for (const o of picker(data, gold.build, p.slot, G)?.options ?? [])
          for (const s of o.synergy?.shared ?? []) found.add(s.topic.kind);
      return found;
    };
    expect([...kinds(jackInTheGreen)].sort()).toEqual(['descriptor', 'energy', 'school']);
    expect([...kinds(enforcer)].sort()).toEqual(expect.arrayContaining(['ability', 'weapon']));
  }, 120_000);

  it('names each option bare, and qualifies it only when another option in the same list shares its name', () => {
    const ALLIED_SPELLCASTER = '9093ceeefe9b84746a5993d619d7c86f';
    const ALLIED_SPELLCASTER_BUFF = '3de0359d9480cb549ab6cf1eac51f9dc';
    expect(data.blueprints.get(ALLIED_SPELLCASTER)?.name).toBe('Allied Spellcaster (feature)');
    const basic = jackInTheGreen.build.picks.find((p) => p.slot.selection === '247a4068296e8be42890143f451b4b45');
    const feats = picker(data, jackInTheGreen.build, basic!.slot, G);
    const allied = feats?.options.find((o) => o.feature === ALLIED_SPELLCASTER);
    expect(allied?.name).toBe('Allied Spellcaster');
    expect(allied?.qualifier).toBeUndefined();
    const both = namesInList(data, [ALLIED_SPELLCASTER, ALLIED_SPELLCASTER_BUFF]);
    expect(both.get(ALLIED_SPELLCASTER)).toEqual({ name: 'Allied Spellcaster', qualifier: 'feature' });
    expect(both.get(ALLIED_SPELLCASTER_BUFF)).toEqual({ name: 'Allied Spellcaster', qualifier: 'buff' });
    const mythics = classPicker(data, jackInTheGreen.build, { rank: 8 }, G);
    const names = (mythics?.options ?? []).map((o) => o.name);
    expect(names).toContain('Legend');
    expect(names).toContain('Gold Dragon');
    expect((mythics?.options ?? []).every((o) => o.qualifier === undefined)).toBe(true);
  });

  it('offers every path switch the walk takes, Legend by its own name, and not the story’s Legend choice', () => {
    const GOLD_DRAGON = 'daf1235b6217787499c14e4e32142523';
    const LEGEND = '3d420403f3e7340499931324640efe96';
    const offer = offeredMythicClasses(data);
    const guids = offer.map((c) => c.guid);
    for (const cls of [GOLD_DRAGON, '5295b8e13c2303f4c88bdb3d7760a757', '211f49705f478b3468db6daa802452a2', LEGEND])
      expect(guids).toContain(cls);
    expect(guids).not.toContain('b82f1fbd191e1f2498266ca41f05027f');
    expect(offer.find((c) => c.guid === LEGEND)?.name).toBe('Legend');
    expect(offer.find((c) => c.guid === GOLD_DRAGON)?.name).toBe('Gold Dragon');
    const ranks = jackInTheGreen.build.ranks ?? [];
    const goldAt = (rank: number) =>
      walk(
        data,
        {
          ...jackInTheGreen.build,
          ranks: [...ranks.slice(0, rank - 1), { class: GOLD_DRAGON, level: ranks[rank - 1]!.level }],
          picks: jackInTheGreen.build.picks.filter((p) => !('rank' in p.slot.place) || p.slot.place.rank < rank),
        },
        G,
      ).failures.filter((f) => f.subject === GOLD_DRAGON);
    expect(goldAt(7)).not.toEqual([]);
    expect(goldAt(8)).toEqual([]);
  });

  it('starts a character on Mythic Hero', () => {
    expect(mythicStartingClass(data)).toBe('247aa787806d5da4f89cfc3dff0b217f');
  });
});

describe('which slots belong to the character', { timeout: 30_000 }, () => {
  const BACKGROUNDS_CRAFTSMAN_SELECTION = 'fd36aaff6f41a2f4f9e91925d49a0d85';

  it('is the race’s bonus feat, the background with what it opens, and the deity; not the level’s feats', () => {
    const background: SlotId = { place: { level: 1 }, selection: BACKGROUNDS_BASE_SELECTION, index: 0 };
    const human: Build = {
      race: HUMAN,
      levels: [{ class: FIGHTER }],
      picks: [{ slot: background, feature: BACKGROUNDS_CRAFTSMAN_SELECTION }],
    };
    const slots = walk(data, human, G).slots;
    const wide = characterWideSlots(data, slots);
    const named = (selection: string, index = 0) => `L1/${selection}#${index}`;
    expect([...wide].sort()).toEqual(
      [named(BASIC, 0), slotKey(background), named(DEITY_SELECTION), named(BACKGROUNDS_CRAFTSMAN_SELECTION)].sort(),
    );
    expect(slots.find((s) => slotKey(s.id) === named(BASIC, 0))?.source.kind).toBe('race');
    expect(wide.has(named(BASIC, 1))).toBe(false);
    expect(wide.has(named(FIGHTER_FEAT))).toBe(false);
  });
});

describe('a feat’s tags, as the level-up list shows them', { timeout: 30_000 }, () => {
  it('reads PowerAttackFeature’s Damage and Melee, and none for a feature without tags', () => {
    expect(featureTags(data, POWER_ATTACK)).toEqual(['Damage', 'Melee']);
    expect(featureTags(data, '7d300f497584d9245ac24c062dce0bd6')).toBeUndefined();
  });

  it('reads tags as names or as the enum’s bits', () => {
    expect(tagsOf('Damage, Melee')).toEqual(['Damage', 'Melee']);
    expect(tagsOf(0x4 | 0x8)).toEqual(['Damage', 'Melee']);
    expect(tagsOf('None')).toEqual([]);
  });
});

const JACK_SPELL_SPECIALIZATION_GAP = 'f327a765a4353d04f872482ef3e48c35';

describe('which options the level-up screen lists', { timeout: 30_000 }, () => {
  it('lists every pick the gold Builds made, in its own slot', () => {
    for (const gold of [enforcer, jackInTheGreen]) {
      for (const pick of gold.build.picks.filter((p) => p.feature !== JACK_SPELL_SPECIALIZATION_GAP)) {
        const listed = picker(data, gold.build, pick.slot, G)?.options.find(
          (o) => o.feature === pick.feature && JSON.stringify(o.param) === JSON.stringify(pick.param),
        );
        expect({ slot: slotKey(pick.slot), feature: pick.feature, shown: listed?.shown }).toEqual({
          slot: slotKey(pick.slot),
          feature: pick.feature,
          shown: true,
        });
      }
    }
  }, 60_000);

  it('lists the background groups, and leaves out the companions’ backgrounds', () => {
    const background = { place: { level: 1 }, selection: 'f926dabeee7f8a54db8f2010b323383c', index: 0 };
    const fighter: Build = { race: HUMAN, scores, levels: [{ class: FIGHTER }], picks: [] };
    const shown = (picker(data, fighter, background, G)?.options ?? [])
      .filter((o) => o.shown)
      .map((o) => data.blueprints.get(o.feature)?.name);
    for (const group of ['Craftsman', 'Noble', 'Regional', 'Warrior']) expect(shown).toContain(group);
    expect(shown.some((n) => n?.startsWith('Urban Hunter'))).toBe(false);
    expect(shown.some((n) => n?.startsWith('Numerian Companion'))).toBe(false);
  });

  it('hides an option only when it is unavailable and the game marks it hidden while unavailable', () => {
    const named = { name: 'X', HideInUI: true, HideNotAvailibleInUI: true } as unknown as Blueprint;
    expect(shownInSelection(named, false)).toBe(true);
    expect(shownInSelection(named, true)).toBe(false);
    expect(shownInSelection({ ...named, HideNotAvailibleInUI: false } as Blueprint, true)).toBe(true);
    expect(shownInSelection({ HideInUI: false } as unknown as Blueprint, false)).toBe(false);
  });

  it('tells apart same-named options in one list by the prerequisite the game separates them by (MCP QA)', () => {
    const DRACONIC = 'f4b011d090e8ae543b1441bd594c7bf7';
    const ELEMENTAL = 'd2a4b74ee7e43a648b51d0f36db2aa34';
    const NATURE_MAGE = '7cb23fae66c54c6eb698c151aba54c0c';
    const UNLETTERED = '760f927485da2194da1e97f2ded0d0ca';
    const bloodlines = namesInList(data, [DRACONIC, ELEMENTAL]);
    expect(bloodlines.get(DRACONIC)).toEqual({ name: 'Bloodline Feat Selection', qualifier: 'Draconic Bloodline' });
    expect(bloodlines.get(ELEMENTAL)).toEqual({ name: 'Bloodline Feat Selection', qualifier: 'Elemental Bloodline' });
    const arcanists = namesInList(data, [NATURE_MAGE, UNLETTERED]);
    expect(arcanists.get(NATURE_MAGE)).toEqual({ name: 'Arcanist', qualifier: 'Nature Mage' });
    expect(arcanists.get(UNLETTERED)).toEqual({ name: 'Arcanist', qualifier: 'Unlettered Arcanist' });
    expect(namesInList(data, [DRACONIC]).get(DRACONIC)).toEqual({ name: 'Bloodline Feat Selection' });
    const shared: string[] = [];
    for (const bp of data.blueprints.values()) {
      if (!('m_AllFeatures' in bp)) continue;
      const seen = new Set<string>();
      for (const n of namesInList(data, guids(bp.m_AllFeatures)).values()) {
        const shown = n.qualifier === undefined ? n.name : `${n.name} (${n.qualifier})`;
        if (seen.has(shown)) shared.push(`${bp.assetName}: ${shown}`);
        seen.add(shown);
      }
    }
    expect(shared).toEqual([]);
  });

  it("finds a worn item's bonuses that won't stack with what the Build holds or wears in its other places (MCP QA)", () => {
    const RING_OF_PROTECTION_1 = 'f333bf86cd122974792162cbcd27c9ed';
    const ringed = { ...jackInTheGreen.build, gear: { Ring1: RING_OF_PROTECTION_1 } };
    expect(gearClashes(data, ringed, 'Ring2', RING_OF_PROTECTION_1, G)).toEqual([
      { stat: 'AC', descriptor: 'Deflection', with: [RING_OF_PROTECTION_1] },
    ]);
    expect(gearClashes(data, ringed, 'Ring1', RING_OF_PROTECTION_1, G)).toEqual([]);
    const rings = [...data.blueprints.values()]
      .filter((b) => b.$type === 'BlueprintItemEquipmentRing')
      .map((b) => b.guid);
    const index = gearClashIndex(data, ringed, 'Ring2', G);
    for (const ring of rings) expect(index(ring)).toEqual(gearClashes(data, ringed, 'Ring2', ring, G));
  });
});
