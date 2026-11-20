// The walk on the committed data, area by area (ticket 03; guide §5 step 6). Each expectation is the game's own: a
// blueprint's data, cited by name and GUID, or the method the rule ports.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { placeKey, type Build, type LevelUp } from '../build';
import { loadData } from '../data/load';
import { readDataDir } from '../data/read-dir';
import {
  refGuid,
  type BlueprintProgression,
  type Component,
  type Condition,
  type ContextRankConfig,
} from '../data/types';
import { buildGrantIndex, reachableFromRoot } from '../grants';
import { prerequisites } from '../prerequisites';
import { conditionHolds, factHeld, judgeLeaf, prerequisiteStat } from './check';
import { DAILY_CHOICES, IN_PLAY_ABILITIES, SECOND_DAILY_CHOICES } from './daily-choices';
import { misfit } from './gear';
import { jackInTheGreen } from '../gold/jack-in-the-green';
import { calcLevel } from './progression';
import { casterTypeSpellLevel, hasCasterType } from './spellbooks';
import { feature, ref, withBlueprints, withOptions } from './test-data';
import { Unit } from './unit';
import { walk } from './walk';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const data = loadData(files.files, files.overrides);
const G = buildGrantIndex(data);

const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
const FIGHTER_PROGRESSION = 'b50e94b57be32f74892f381ae2a8905a';
const FIGHTER_FEAT_SELECTION = '41c8486641f7d6d4283ca9dae4147a9f';
const BASIC_FEAT_SELECTION = '247a4068296e8be42890143f451b4b45';
const SORCERER = 'b3a505fb61437dc4097f43c3f8f9a4cf';
const SYLVAN_SORCERER = '711d5024ecc75f346b9cda609c3a1f83';
const SORCERER_BLOODLINE_SELECTION = '24bef8d1bee12274686f6da6ccbc8914';
const SLAYER = 'c75e0971973957d4dbad24bc7957e4fb';
const SNEAK_ATTACK = '9b9eac6709e1c084cb18c3a366e0ec87';
const AZATA = '9a3b2c63afa79744cbca46bea0da9a16';
const HUMAN = '0a5d473ead98b0646b94495af250fdc4';
const HALFLING = 'b0c3ef2729c498f47970bb50fa1acd30';
const SHIELD_BASH = '121811173a614534e8720d7550aae253';

const levels = (cls: string, n: number, extra: Partial<LevelUp> = {}): LevelUp[] =>
  Array.from({ length: n }, () => ({ class: cls, ...extra }));
const build = (b: Partial<Build>): Build => ({ race: HUMAN, levels: [], picks: [], ...b });
const slotsOf = (b: Build, selection: string) =>
  walk(data, b, G)
    .slots.filter((s) => s.id.selection === selection)
    .map((s) => placeKey(s.id.place));

describe('area 1: a single class to level 20', () => {
  it("opens a slot for each level entry of the class's progression", () => {
    // FighterProgression b50e94b57be32f74892f381ae2a8905a lists FighterFeatSelection 41c8486641f7d6d4283ca9dae4147a9f
    // at the levels its LevelEntries say (LevelUpHelper.UpdateProgression grants each entry at its level).
    const p = data.blueprints.get(FIGHTER_PROGRESSION) as BlueprintProgression;
    const expected = p.LevelEntries.filter((e) => e.m_Features.some((r) => refGuid(r) === FIGHTER_FEAT_SELECTION)).map(
      (e) => `L${e.Level}`,
    );
    expect(slotsOf(build({ levels: levels(FIGHTER, 20) }), FIGHTER_FEAT_SELECTION)).toEqual(expected);
  });

  it('opens the character-level feat slot at every odd level', () => {
    // BasicFeatsProgression 5b72dd2ca2cb73b49903806ee8986325 grants BasicFeatSelection at odd levels; a Human's race
    // features add one more at level 1 (HumanRace 0a5d473ead98b0646b94495af250fdc4, guide §7 "Race and subrace").
    const odd = Array.from({ length: 10 }, (_, i) => `L${2 * i + 1}`);
    expect(slotsOf(build({ levels: levels(FIGHTER, 20) }), BASIC_FEAT_SELECTION)).toEqual(['L1', ...odd]);
  });

  it('refuses a 21st level of a class', () => {
    // BlueprintCharacterClass.MeetsPrerequisites: no class past level 20.
    const w = walk(data, build({ levels: levels(FIGHTER, 21) }), G);
    expect(w.failures).toContainEqual(
      expect.objectContaining({ place: { level: 21 }, choice: 'class', subject: FIGHTER }),
    );
  });
});

describe('area 2: archetypes', () => {
  it("removes and adds the archetype's level entries", () => {
    // SylvanSorcererArchetype 711d5024ecc75f346b9cda609c3a1f83 removes SorcererBloodlineSelection
    // 24bef8d1bee12274686f6da6ccbc8914 at level 1 (ProgressionData.CalculateLevelEntries).
    const plain = build({ levels: levels(SORCERER, 1) });
    const sylvan = build({ ...plain, classChoices: { [SORCERER]: { archetypes: [SYLVAN_SORCERER] } } });
    expect(slotsOf(plain, SORCERER_BLOODLINE_SELECTION)).toEqual(['L1']);
    expect(slotsOf(sylvan, SORCERER_BLOODLINE_SELECTION)).toEqual([]);
  });

  it('refuses an archetype of another class', () => {
    // AddArchetype.Check: the archetype must be one of the class's m_Archetypes.
    const w = walk(
      data,
      build({ levels: levels(FIGHTER, 1), classChoices: { [FIGHTER]: { archetypes: [SYLVAN_SORCERER] } } }),
      G,
    );
    expect(w.failures).toContainEqual(expect.objectContaining({ choice: 'archetype', subject: SYLVAN_SORCERER }));
  });

  it("counts an archetype's levels only where the progression lists it", () => {
    // BloodlineDraconicBronzeProgression 7e0f57d8d00464441974e303b84238ac lists MagusClass and, in m_Archetypes,
    // EldritchScionArchetype d078b2ef073f2814c9e338a789d97b73: a Magus's levels count only with that archetype
    // (BlueprintProgression.CalcLevel).
    const bronze = data.blueprints.get('7e0f57d8d00464441974e303b84238ac') as BlueprintProgression;
    const magus = (archetypes: string[]) => {
      const unit = new Unit(data);
      unit.classes.push({ class: '45a4607686d96a1498891b3286121780', level: 5, archetypes });
      return calcLevel(unit, bronze);
    };
    expect(magus([])).toBe(0);
    expect(magus(['d078b2ef073f2814c9e338a789d97b73'])).toBe(5);
  });
});

describe('areas 3 and 4: selections, nested selections and ranks', () => {
  it('opens a nested slot at the same level for a picked selection', () => {
    // SelectFeature.Apply: BackgroundsRegionalSelection fa621a249cc836f4382ca413b976e65e, picked in
    // BackgroundsBaseSelection f926dabeee7f8a54db8f2010b323383c, opens its own slot at level 1.
    const b = build({
      levels: levels(FIGHTER, 1),
      picks: [
        {
          slot: { place: { level: 1 }, selection: 'f926dabeee7f8a54db8f2010b323383c', index: 0 },
          feature: 'fa621a249cc836f4382ca413b976e65e',
        },
      ],
    });
    const nested = walk(data, b, G).slots.find((s) => s.id.selection === 'fa621a249cc836f4382ca413b976e65e');
    expect(nested).toMatchObject({ id: { place: { level: 1 }, index: 0 }, parent: expect.stringContaining('f926') });
  });

  it("refuses a pick that isn't in the slot's list", () => {
    // BlueprintFeatureSelection.CanSelect: the item must be in m_AllFeatures.
    const b = build({
      levels: levels(FIGHTER, 1),
      picks: [{ slot: { place: { level: 1 }, selection: FIGHTER_FEAT_SELECTION, index: 0 }, feature: SNEAK_ATTACK }],
    });
    expect(walk(data, b, G).failures).toContainEqual(
      expect.objectContaining({ choice: 'pick', rule: 'BlueprintFeatureSelection.CanSelect:m_AllFeatures' }),
    );
  });

  it("raises a feature's rank each time a progression grants it again", () => {
    // SlayerProgression 1f35d11937a06624b8a60db68c7869a1 grants SneakAttack 9b9eac6709e1c084cb18c3a366e0ec87 at 3,
    // 6, 9, 12, 15 and 18 (Feature.AddRank).
    const w = walk(data, build({ levels: levels(SLAYER, 18) }), G);
    const ranks = w.gains.filter((g) => g.fact === SNEAK_ATTACK).map((g) => [placeKey(g.place), g.rank]);
    expect(ranks).toEqual([
      ['L3', 1],
      ['L6', 2],
      ['L9', 3],
      ['L12', 4],
      ['L15', 5],
      ['L18', 6],
    ]);
  });
});

describe('area 5: skill ranks', () => {
  const scores = { Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 12, Wisdom: 10, Charisma: 10 };

  it("spends the class's points and the Intelligence points, and refuses one rank more", () => {
    // SorcererClass b3a505fb61437dc4097f43c3f8f9a4cf has SkillPoints 2; Intelligence 12 adds 1 at odd levels
    // (LevelUpHelper.GetIntelligenceSkillPoints), so a Halfling's levels 1 and 2 give 3 and 2.
    const three = { SkillMobility: 1, SkillPersuasion: 1, SkillUseMagicDevice: 1 };
    const halfling = (l: LevelUp[]) => build({ race: HALFLING, scores, levels: l });
    const ok = walk(data, halfling(levels(SORCERER, 2, { skills: { SkillMobility: 1, SkillPersuasion: 1 } })), G);
    expect(ok.failures.filter((f) => f.choice === 'skills')).toEqual([]);
    const over = walk(data, halfling(levels(SORCERER, 2, { skills: three })), G);
    expect(over.failures).toContainEqual(
      expect.objectContaining({
        place: { level: 2 },
        choice: 'skills',
        rule: 'SpendSkillPoint.Check:points',
      }),
    );
  });

  it("adds the Human's extra point per level", () => {
    // HumanRace 0a5d473ead98b0646b94495af250fdc4's skilled trait carries AddSkillPointPerCharacterLevel
    // (HandleUnitCalculateSkillPointsOnLevelup adds the next character level), so the same three ranks fit.
    const three = { SkillMobility: 1, SkillPersuasion: 1, SkillUseMagicDevice: 1 };
    const w = walk(data, build({ scores, levels: levels(SORCERER, 2, { skills: three }) }), G);
    expect(w.failures.filter((f) => f.choice === 'skills')).toEqual([]);
  });

  it('caps ranks at the character level', () => {
    // SpendSkillPoint.Check: a skill's ranks stay at or below the character level.
    const w = walk(data, build({ scores, levels: [{ class: FIGHTER, skills: { SkillAthletics: 2 } }] }), G);
    expect(w.failures).toContainEqual(
      expect.objectContaining({ choice: 'skills', rule: 'SpendSkillPoint.Check:ranks', found: 2, needed: 1 }),
    );
  });

  it("makes a background's skill a class skill", () => {
    // BackgroundWarriorOfTheLinnormKings 494c972a8e7626749aeda25582e2e88f: AddBackgroundClassSkill SkillMobility,
    // which ModifiableValueSkill.ClassSkill counts.
    const b = build({
      levels: levels(SORCERER, 1),
      picks: [
        {
          slot: { place: { level: 1 }, selection: 'f926dabeee7f8a54db8f2010b323383c', index: 0 },
          feature: 'fa621a249cc836f4382ca413b976e65e',
        },
        {
          slot: { place: { level: 1 }, selection: 'fa621a249cc836f4382ca413b976e65e', index: 0 },
          feature: '494c972a8e7626749aeda25582e2e88f',
        },
      ],
    });
    expect(walk(data, build({ levels: levels(SORCERER, 1) }), G).unit.isClassSkill('SkillMobility')).toBe(false);
    expect(walk(data, b, G).unit.isClassSkill('SkillMobility')).toBe(true);
  });
});

describe('proficiencies', () => {
  const shieldBash = (cls: string): Build =>
    build({
      levels: levels(cls, 1),
      picks: [{ slot: { place: { level: 1 }, selection: BASIC_FEAT_SELECTION, index: 1 }, feature: SHIELD_BASH }],
    });

  it("lets a class's AddProficiencies meet a proficiency prerequisite", () => {
    // ShieldBashFeature 121811173a614534e8720d7550aae253 needs a shield proficiency (PrerequisiteProficiency); the
    // fighter's FighterProficiencies gives shields (AddProficiencies), the sorcerer's doesn't.
    expect(walk(data, shieldBash(FIGHTER), G).failures).toEqual([]);
    expect(walk(data, shieldBash(SORCERER), G).failures).toContainEqual(
      expect.objectContaining({
        subject: SHIELD_BASH,
        unmet: [{ leaf: expect.objectContaining({ names: expect.objectContaining({ kind: 'proficiency' }) }) }],
      }),
    );
  });

  it('starts every character with the natural weapons and no armour', () => {
    // UnitLogic/UnitProficiency.cs: m_WeaponProficiencies and m_ArmorProficiencies' initializers.
    const unit = new Unit(data);
    expect([...unit.weaponProficiencies()]).toEqual(['UnarmedStrike', 'Bite', 'Claw', 'Gore', 'Touch', 'Ray']);
    expect([...unit.armorProficiencies()]).toEqual(['None']);
  });
});

describe('spellbooks, as gates', () => {
  const ARCANE_TRICKSTER = '9c935a076d4fe4d4999fd48d853e3cf3';
  const casterLeaf = (level: number) =>
    walk(data, build({ levels: [...levels(SORCERER, level), { class: ARCANE_TRICKSTER }] }), G)
      .failures.filter((f) => f.subject === ARCANE_TRICKSTER)
      .flatMap((f) => f.unmet ?? [])
      .filter((u) => u.leaf.names.kind === 'casterType')
      .map(({ found, needed }) => ({ found, needed }));

  it("reads a class level's spellbook level, and MaxSpellLevel from its table", () => {
    // SorcererSpellbook b3db3766a4b605040b366265e2af0e50: its SpellsPerDay table first has 2nd-level spells at
    // caster level 4 (Spellbook.GetMaxSpellLevel; ApplySpellbook raises the base level at each Sorcerer level).
    const at = (n: number) =>
      casterTypeSpellLevel(walk(data, build({ levels: levels(SORCERER, n) }), G).unit, true, true);
    expect(at(3)).toBe(1);
    expect(at(4)).toBe(2);
  });

  it('gates a class on its caster prerequisite', () => {
    // ArcaneTricksterClass 9c935a076d4fe4d4999fd48d853e3cf3: PrerequisiteCasterTypeSpellLevel, arcane, level 2.
    expect(casterLeaf(3)).toEqual([{ found: 1, needed: 2 }]);
    expect(casterLeaf(4)).toEqual([]);
  });

  it("leaves the alchemist's spellbook out of the caster gates", () => {
    // AlchemistSpellbook 027d37761f3804042afa96fe3e9086cc carries IsAlchemistSpellbook, which
    // PrerequisiteCasterTypeSpellLevel.GetCasterTypeSpellLevel skips.
    const unit = walk(data, build({ levels: levels('0937bec61c0dabc468428f496580c721', 10) }), G).unit;
    expect(casterTypeSpellLevel(unit, true, false)).toBeUndefined();
    expect(casterTypeSpellLevel(unit, false, false)).toBeUndefined();
  });

  it('drops the spellbook of an archetype that removes it', () => {
    // MixedBloodRagerArchetype 10d92d54d19e4a59b5bbd4259ec0974f sets RemoveSpellbook (ClassData.AddArchetype).
    const bloodrager = 'd77e67a814d686842802c9cfd8ef8499';
    const plain = walk(data, build({ levels: levels(bloodrager, 1) }), G).unit;
    const mixed = walk(
      data,
      build({
        levels: levels(bloodrager, 1),
        classChoices: { [bloodrager]: { archetypes: ['10d92d54d19e4a59b5bbd4259ec0974f'] } },
      }),
      G,
    ).unit;
    expect(plain.classData(bloodrager)?.spellbook).toBeDefined();
    expect(mixed.classData(bloodrager)?.spellbook).toBeUndefined();
    expect(hasCasterType(mixed, true)).toBe(false);
  });
});

describe('area 6: ability scores', () => {
  const HALF_ELF = 'b3646842ffbd01643ab4dac7479b20b0';
  const scores = { Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 };

  it('refuses a point buy past 25 points or outside 7–18', () => {
    // StatsDistribution: s_StatValueCosts, CanAdd (up to 18) and CanRemove (down to 7), 25 points to spend.
    const over = { ...scores, Strength: 18, Dexterity: 18 }; // 17 + 17
    const low = { ...scores, Wisdom: 6 };
    const checks = (s: typeof scores) =>
      walk(data, build({ scores: s, levels: levels(FIGHTER, 1) }), G)
        .failures.filter((f) => f.choice === 'scores')
        .map(({ subject, rule, found, needed }) => ({ subject, rule, found, needed }));
    expect(checks(scores)).toEqual([]);
    expect(checks(over)).toEqual([{ subject: undefined, rule: 'StatsDistribution.CanAdd', found: 34, needed: 25 }]);
    expect(checks(low)).toEqual([{ subject: 'Wisdom', rule: 'StatsDistribution.CanRemove', found: 6, needed: 7 }]);
  });

  it('takes an ability increase only at a level that is a multiple of 4', () => {
    // SelectClass.Apply grants the attribute point; SpendAttributePoint.Check needs one.
    const at = (n: number) =>
      walk(data, build({ scores, levels: [...levels(FIGHTER, n - 1), { class: FIGHTER, increase: 'Strength' }] }), G);
    expect(at(4).unit.permanent('Strength')).toBe(11);
    expect(at(3).failures).toContainEqual(expect.objectContaining({ choice: 'increase' }));
  });

  it("adds the race's chosen +2 only for a race that lets the Build choose", () => {
    // SelectRaceStat: HalfElfRace b3646842ffbd01643ab4dac7479b20b0 has SelectableRaceStat; HalflingRace doesn't.
    const halfElf = walk(data, build({ race: HALF_ELF, raceStat: 'Strength', scores, levels: levels(FIGHTER, 1) }), G);
    expect(halfElf.unit.permanent('Strength')).toBe(12);
    const halfling = walk(data, build({ race: HALFLING, raceStat: 'Strength', scores, levels: levels(FIGHTER, 1) }), G);
    expect(halfling.failures).toContainEqual(expect.objectContaining({ choice: 'raceStat' }));
  });

  it("counts a heritage's Racial AddContextStatBonus in the permanent value", () => {
    // KindredRaisedHalfElf 5609d6e6cbd5422c8d6a1e7ee0b31a87: AddContextStatBonus, Racial, Charisma +2.
    const kindred = build({
      race: HALF_ELF,
      scores,
      levels: levels(FIGHTER, 1),
      picks: [
        {
          slot: { place: { level: 1 }, selection: '9df7b68d60544bcf8e5b56c0a4688e04', index: 0 },
          feature: '5609d6e6cbd5422c8d6a1e7ee0b31a87',
        },
      ],
    });
    expect(walk(data, kindred, G).unit.permanent('Charisma')).toBe(12);
  });

  it("reads a Rank value from the fact's ContextRankConfig", () => {
    // ShifterAspectWolverineBuff e0b35a32cf234381ab13c831106937f1: Constitution, Racial, Rank × 2; its Default
    // ContextRankConfig is Shifter levels by StartPlusDivStep (start 1, step 14), at most 20.
    const wolverine = data.blueprints.get('e0b35a32cf234381ab13c831106937f1');
    const config = wolverine?.Components.find(
      (c): c is ContextRankConfig => c.$type === 'ContextRankConfig' && (c as ContextRankConfig).m_Type === 'Default',
    ) as ContextRankConfig;
    const at = (level: number) => {
      const unit = new Unit(data);
      unit.classes.push({ class: 'a406d6ebea5c46bba3160246be03e96f', level, archetypes: [] });
      return unit.rankOf(config);
    };
    expect([at(9), at(14), at(15)]).toEqual([1, 1, 2]);
  });

  it("ranks the Tiefling heritage's Charisma penalty by its FeatureList", () => {
    // TieflingHeritageClassic c82bc8134f3a6e24994b8ef70fb4014a: AddStatBonusIfHasFact, Racial Charisma, a Rank value
    // whose FeatureList ContextRankConfig counts AbyssalBloodlineRequisiteFeature b09b58c7f8efff244a33269489abeac6 and
    // InfernalBloodlineRequisiteFeature: −2 with neither, 0 with one (Custom progression).
    const unit = new Unit(data);
    const source = { kind: 'race', from: HUMAN } as const;
    unit.attach('c82bc8134f3a6e24994b8ef70fb4014a', undefined, source, { level: 1 });
    expect(unit.permanent('Charisma')).toBe(8);
    unit.attach('b09b58c7f8efff244a33269489abeac6', undefined, source, { level: 1 });
    expect(unit.permanent('Charisma')).toBe(10);
  });

  it("lets a background's skill read a higher attribute", () => {
    // BackgroundAcolyte 7cc9014488caa5445a0c8b5e17b95466: ReplaceStatBaseAttribute, Persuasion reads Wisdom when its
    // bonus is higher (ModifiableValueSkill.CheckAttribute).
    const acolyte = (wis: number) =>
      walk(
        data,
        build({
          scores: { ...scores, Wisdom: wis },
          levels: levels(FIGHTER, 1),
          picks: [
            {
              slot: { place: { level: 1 }, selection: 'f926dabeee7f8a54db8f2010b323383c', index: 0 },
              feature: 'c25021c31f302c6449ecdbc978822507',
            },
            {
              slot: { place: { level: 1 }, selection: 'c25021c31f302c6449ecdbc978822507', index: 0 },
              feature: '7cc9014488caa5445a0c8b5e17b95466',
            },
          ],
        }),
        G,
      ).unit.skillAttribute('SkillPersuasion');
    expect(acolyte(14)).toBe('Wisdom');
    expect(acolyte(8)).toBe('Charisma');
  });
});

describe('Gear', () => {
  const DRUID = '610d836f3a3a9ed42a4349b62f002e96';
  const BLOODRAGER = 'd77e67a814d686842802c9cfd8ef8499';
  const MONK = 'e8f21e5b58e0569468e420ebea456124';
  const gearFailures = (b: Build) =>
    walk(data, b, G)
      .failures.filter((f) => f.choice === 'gear')
      .map(({ subject, rule, found, needed }) => ({ subject, rule, found, needed }));

  it("refuses armour a druid can't wear", () => {
    // AdamantineBanded ed04d2a914a93e046aadee8cc3109f65: EquipmentRestrictionClass Not DruidClass
    // 610d836f3a3a9ed42a4349b62f002e96 (EquipmentRestrictionClass.CanBeEquippedBy). A fighter wears it.
    const banded = { Armor: 'ed04d2a914a93e046aadee8cc3109f65' };
    expect(gearFailures(build({ levels: levels(DRUID, 1), gear: banded }))).toEqual([
      { subject: banded.Armor, rule: 'EquipmentRestrictionClass.CanBeEquippedBy', found: 1, needed: 0 },
    ]);
    expect(gearFailures(build({ levels: levels(FIGHTER, 1), gear: banded }))).toEqual([]);
  });

  it('refuses an item locked to another class', () => {
    // AmuletOfCirculatingBloodItem 5043aad8b5815cc4a86f93c7ff2b50e3: EquipmentRestrictionClass BloodragerClass.
    const amulet = { Neck: '5043aad8b5815cc4a86f93c7ff2b50e3' };
    expect(gearFailures(build({ levels: levels(FIGHTER, 1), gear: amulet }))).toEqual([
      { subject: amulet.Neck, rule: 'EquipmentRestrictionClass.CanBeEquippedBy', found: 0, needed: 1 },
    ]);
    expect(gearFailures(build({ levels: levels(BLOODRAGER, 1), gear: amulet }))).toEqual([]);
  });

  it('refuses an item locked to other alignments', () => {
    // DelameresBowItem 5fd95b425dd0b73488554abcb68382d3: EquipmentRestrictionAlignment Good (AlignmentMaskType).
    const bow = { MainHand: '5fd95b425dd0b73488554abcb68382d3' };
    expect(gearFailures(build({ alignment: 'ChaoticEvil', levels: levels(FIGHTER, 1), gear: bow }))).toEqual([
      {
        subject: bow.MainHand,
        rule: 'EquipmentRestrictionAlignment.CanBeEquippedBy',
        found: 'ChaoticEvil',
        needed: 'Good',
      },
    ]);
    expect(gearFailures(build({ alignment: 'ChaoticGood', levels: levels(FIGHTER, 1), gear: bow }))).toEqual([]);
  });

  it('refuses an item its place can’t take, and armour without proficiency', () => {
    // HandSlot.IsItemTypeSupported: a shield never goes in the main hand. ItemEntityArmor.CanBeEquippedInternal: a
    // sorcerer has no armour group but None.
    expect(
      gearFailures(build({ levels: levels(FIGHTER, 1), gear: { MainHand: 'a39fc345c33c4bf1aaec7988776039ba' } })),
    ).toEqual([
      {
        subject: 'a39fc345c33c4bf1aaec7988776039ba',
        rule: 'HandSlot.IsItemTypeSupported:shield',
        found: 'MainHand',
        needed: undefined,
      },
    ]);
    expect(
      gearFailures(build({ levels: levels(SORCERER, 1), gear: { Armor: 'ed04d2a914a93e046aadee8cc3109f65' } })),
    ).toEqual([
      {
        subject: 'ed04d2a914a93e046aadee8cc3109f65',
        rule: 'ItemEntityArmor.CanBeEquippedInternal',
        found: undefined,
        needed: 'Heavy',
      },
    ]);
  });

  it('lets a melee two-hander share the hands under the one-hand grip', () => {
    // ItemEntityWeapon.CanTakeOneHand: ColdIronGreatsword d48ee6124ad593f429e2e618726f2ef7 is two-handed and melee, so
    // with a shield in the off hand it fits only while GiantWeaponWielderFeature 38323bb032d740ab9045f1086705b0c7
    // sets FighterOnHandedGrip (AddMechanicsFeature).
    const gear = { MainHand: 'd48ee6124ad593f429e2e618726f2ef7', OffHand: 'a39fc345c33c4bf1aaec7988776039ba' };
    const unit = new Unit(data);
    expect(misfit(unit, gear, 'MainHand')).toEqual({ rule: 'HandSlot.IsItemSupported:twoHanded', found: gear.OffHand });
    unit.attach('38323bb032d740ab9045f1086705b0c7', undefined, { kind: 'race', from: HUMAN }, { level: 1 });
    expect(misfit(unit, gear, 'MainHand')).toBeUndefined();
  });

  it("holds a worn item's equipment feature", () => {
    // VanwardItem 4e59464e2d72ea44bb2a35e20f21ca8e: VanwardEnchantment's AddUnitFeatureEquipment holds VanwardFeature
    // 883237e9dac35ba4fba0cffc2af73fb9 while it is worn.
    const w = walk(
      data,
      build({ levels: levels(FIGHTER, 1), gear: { MainHand: '4e59464e2d72ea44bb2a35e20f21ca8e' } }),
      G,
    );
    expect(w.unit.hasFact('883237e9dac35ba4fba0cffc2af73fb9')).toBe(true);
  });

  it('holds a monk unlock only without armour', () => {
    // MonkFlurryOfBlowstUnlock fd99770e6bd240a4aab70f7af103e56a: MonkNoArmorAndMonkWeaponFeatureUnlock holds
    // FlurryOfBlows 332362f3bd39ebe46a740a36960fdcb4 with no armour, no shield and a monk weapon (an empty hand).
    const monk = (gear: Build['gear']) =>
      walk(data, build({ levels: [{ class: FIGHTER }, { class: MONK }], ...(gear && { gear }) }), G).unit.hasFact(
        '332362f3bd39ebe46a740a36960fdcb4',
      );
    expect(monk(undefined)).toBe(true);
    expect(monk({ Armor: 'c65f6fc979d5556489b20e478189cbdd' })).toBe(false); // ChainshirtStandard
  });

  it("counts the Gear's Enhancement bonus only under the opt-in", () => {
    // BeltOfDexterity2 b6af4c1834999e74497b41588d1071cd: Dexterity2's AddStatBonusEquipment, Enhancement +2, which
    // PrerequisiteStatValue reads (Modifier.IsPermanent) only when the Build opts in (ADR 0002).
    const belt = { Belt: 'b6af4c1834999e74497b41588d1071cd' };
    const dex = (countGear: boolean) =>
      walk(data, build({ levels: levels(FIGHTER, 1), gear: belt, countGear }), G).unit.permanent('Dexterity');
    expect(dex(false)).toBe(10);
    expect(dex(true)).toBe(12);
  });
});

describe('areas 7 and 8: race, and Mythic ranks at their Rank levels', () => {
  it("grants the race's features with the race, at level 0", () => {
    // SelectRace.Apply: HalflingRace b0c3ef2729c498f47970bb50fa1acd30's m_Features through AddFeaturesFromProgression.
    const w = walk(data, build({ race: HALFLING, levels: levels(FIGHTER, 1) }), G);
    const fromRace = w.gains.filter((g) => g.source.kind === 'race').map((g) => g.fact);
    expect(fromRace).toContain(HALFLING);
    expect(fromRace).toContain('39144c817b70467499cc32e3cff59d81'); // Fearless
  });

  it('places each Mythic rank after its Rank level, at any level, in rank order', () => {
    // ADR 0003: MythicStartingClass 247aa787806d5da4f89cfc3dff0b217f's rank 1 taken after level 2, well before its
    // Expected level 6; a rank placed before the one before it is refused.
    const hero = '247aa787806d5da4f89cfc3dff0b217f';
    const early = walk(data, build({ levels: levels(FIGHTER, 3), ranks: [{ class: hero, level: 2 }] }), G);
    const order = [...new Set(early.gains.map((g) => placeKey(g.place)))];
    expect(order.indexOf('M1')).toBe(order.indexOf('L2') + 1);
    expect(early.failures).toEqual([]);
    const disorder = walk(
      data,
      build({
        levels: levels(FIGHTER, 3),
        ranks: [
          { class: hero, level: 3 },
          { class: hero, level: 2 },
        ],
      }),
      G,
    );
    expect(disorder.failures).toContainEqual(expect.objectContaining({ choice: 'rank', place: { rank: 2 } }));
  });

  it('refuses a character level taken with a Mythic class', () => {
    // UnitProgressionData.AddClassLevel: a Mythic class raises the Mythic rank, never the character level.
    const w = walk(data, build({ levels: [{ class: '247aa787806d5da4f89cfc3dff0b217f' }] }), G);
    expect(w.failures).toContainEqual(expect.objectContaining({ choice: 'class' }));
  });
});

describe('prerequisites the walk reads beyond P', () => {
  it('needs one deity of a deity list, whatever its Amount', () => {
    // PaladinClass bfa11238e7ae3544bbeb4d0b92e897ec: PrerequisiteFeaturesFromList of deities with Amount 0, which
    // IsDeity reads as one (PrerequisiteFeaturesFromList.CheckInternal); at the first level, before the deity band, it
    // is fulfilled (ConsiderFulfilled).
    const PALADIN = 'bfa11238e7ae3544bbeb4d0b92e897ec';
    const paladin = (deity: string) =>
      walk(
        data,
        build({
          alignment: 'LawfulGood',
          levels: levels(PALADIN, 2),
          picks: [
            { slot: { place: { level: 1 }, selection: '59e7a76987fe3b547b9cce045f4db3e4', index: 0 }, feature: deity },
          ],
        }),
        G,
      ).failures.filter((f) => f.choice === 'class');
    expect(paladin('92c0d2da0a836ce418a267093c09ca54')).toEqual([
      expect.objectContaining({ place: { level: 2 }, subject: PALADIN }),
    ]); // Atheism
    expect(paladin('afc775188deb7a44aa4cbde03512c671')).toEqual([]); // Erastil
  });

  it("meets a daily choice's option while the character holds the feature that offers it", () => {
    // ShamanWanderingSpiritFeature 70e6075a72633ba49804ccb6203fb18c gives ShamanWanderingSpiritAbility, whose
    // AbilityApplyFact applies ShamanBattleSpiritWanderingFeature 82ec7a49f3ab65a44bbf4177dfdfe469 (map ticket 24).
    const unit = new Unit(data);
    expect(factHeld(unit, '82ec7a49f3ab65a44bbf4177dfdfe469')).toBe(false);
    unit.attach('70e6075a72633ba49804ccb6203fb18c', undefined, { kind: 'race', from: HUMAN }, { level: 1 });
    expect(factHeld(unit, '82ec7a49f3ab65a44bbf4177dfdfe469')).toBe(true);
  });

  it('lists every feature that offers an AbilityApplyFact ability as a daily choice or an in-play ability', () => {
    // Map ticket 24: UnitHelper.Replenish and AbilityApplyFact.Apply make each such pick daily; Cavalier Tactician and
    // Greater Wyrmshifter are in-play effects.
    const listed = new Set([...DAILY_CHOICES.keys(), ...SECOND_DAILY_CHOICES.keys(), ...IN_PLAY_ABILITIES.keys()]);
    const offering = [...data.blueprints.values()]
      .filter((b) => b.$type === 'BlueprintAbility' && b.Components.some((c) => c.$type === 'AbilityApplyFact'))
      .flatMap((ability) => G.grantorsOf(ability.guid).map((g) => g.grantor));
    expect(offering.filter((f) => !listed.has(f))).toEqual([]);
    for (const [feature, { ability }] of DAILY_CHOICES) {
      expect(G.grantsOf(feature).map((g) => g.granted)).toContain(ability);
    }
  });
});

describe('path switches (map ticket 31)', () => {
  // Jack-in-the-Green's Build to Mythic rank 7 (Azata from rank 3), with rank 8 taken in `cls`.
  const jackTo = (cls: string, ranks = 8): Build => ({
    ...jackInTheGreen.build,
    ranks: [
      ...(jackInTheGreen.build.ranks ?? []).slice(0, 7),
      { class: cls, level: 17 },
      ...Array.from({ length: ranks - 8 }, () => ({ class: cls, level: 19 })),
    ],
    picks: jackInTheGreen.build.picks.filter((p) => !('rank' in p.slot.place) || p.slot.place.rank <= 7),
  });
  const ZIPPY_MAGIC = '30b4200f897ba25419ba3a292aed4053'; // M4, an Azata superpower: a path pick
  const IMPROVED_ABUNDANT = '37046a54739ed4844b8e8307bbbeece2'; // M5, a Mythic Ability pick
  const SPELL_PENETRATION_MYTHIC = '51b6b22ff184eef46a675449e837365d'; // M4, a Mythic Feat pick
  const DRAGON_COMPANION = 'cf36f23d60987224696f03be70351928'; // M3, from AzataProgression

  it('keeps the Mythic Feat and Ability picks and drops the path’s grants under Gold Dragon', () => {
    // GoldenDragonClass daf1235b6217787499c14e4e32142523 (m_IsHigherMythic):
    // UnitProgressionData.ReplaceAllMythicLevelsWithMythicHeroLevels, GetMythicSelectionsData.
    const w = walk(data, jackTo('daf1235b6217787499c14e4e32142523'), G);
    expect(w.failures.filter((f) => f.choice !== 'pick')).toEqual([]);
    for (const kept of [IMPROVED_ABUNDANT, SPELL_PENETRATION_MYTHIC]) expect(w.unit.hasFact(kept)).toBe(true);
    for (const lost of [ZIPPY_MAGIC, DRAGON_COMPANION]) expect(w.unit.hasFact(lost)).toBe(false);
    expect(w.dropped.map((d) => d.fact)).toEqual(expect.arrayContaining([ZIPPY_MAGIC, DRAGON_COMPANION]));
    expect(w.unit.classData(AZATA)).toBeUndefined();
    expect(w.unit.mythicLevel).toBe(8);
  });

  it("drops only the Azata's dragon under Devil, and refuses Devil from another path", () => {
    // devil.ron dropped_features (azata/dragon-companion); from: aeon, azata (map 31).
    const devil = '211f49705f478b3468db6daa802452a2';
    const w = walk(data, jackTo(devil), G);
    expect(w.unit.hasFact(DRAGON_COMPANION)).toBe(false);
    expect(w.unit.hasFact(ZIPPY_MAGIC)).toBe(true);
    expect(w.dropped.map((d) => d.fact)).toEqual([DRAGON_COMPANION]);
    const trickster = '8df873a8c6e48294abdb78c45834aa0a';
    const fromTrickster: Build = {
      ...jackTo(devil),
      ranks: jackTo(devil).ranks?.map((r, i) => (i >= 2 && i < 7 ? { ...r, class: trickster } : r)),
    };
    expect(walk(data, fromTrickster, G).failures).toContainEqual(
      expect.objectContaining({ subject: devil, rule: 'map31.devilFrom' }),
    );
  });

  it('keeps only ranks 1–2 under Legend, ends the ascensions, and raises the level cap to 40', () => {
    // GameFAQs other-mythic-paths.txt "Playing a Legend"; legend.ron kept_through_rank 2, further_ascensions false;
    // LegendClass 3d420403f3e7340499931324640efe96, whose LegendFeature sets LegendaryHero
    // (UnitProgressionData.MaxCharacterLevel).
    const legend = '3d420403f3e7340499931324640efe96';
    const w = walk(data, jackTo(legend), G);
    for (const lost of [IMPROVED_ABUNDANT, ZIPPY_MAGIC]) expect(w.unit.hasFact(lost)).toBe(false);
    expect(w.unit.hasFact('cf594fa8871332a4ba861c6002480ec2')).toBe(true); // Abundant Casting, rank 2
    expect(w.unit.mythicLevel).toBe(3);
    const more = walk(data, jackTo(legend, 9), G);
    expect(more.failures).toContainEqual(
      expect.objectContaining({ place: { rank: 9 }, rule: 'map31.legendEndsAscensions' }),
    );
    const level21 = (b: Build) =>
      walk(data, { ...b, levels: [...b.levels, { class: FIGHTER }] }, G).failures.filter(
        (f) => f.rule === 'UnitProgressionData.MaxCharacterLevel',
      );
    expect(level21(jackTo(legend))).toEqual([]);
    expect(level21(jackInTheGreen.build)).toHaveLength(1);
  });
});

describe('aspects kept on (map ticket 32)', () => {
  const SHIFTER = 'a406d6ebea5c46bba3160246be03e96f';
  const ASPECT_SELECTION = '121829d239124685b430f5263031bf83'; // ShifterAspectSelectionFeature, at Shifter 1 and 5
  const BEAR = '73ef2c330ff14e4bb2f5b7300622c552'; // ShifterAspectBear, which gives the toggle below (AddFacts)
  const BEAR_TOGGLE = 'e66b1350f66949d997e31a57ce638fee'; // ShifterAspectBearAbility, group ShifterAspect
  const WOLF_TOGGLE = '2ec2c06d00574e6795c48cb65e17cb52'; // ShifterAspectWolfAbility, group ShifterAspect
  const shifter = (aspects: string[], extra: Build['picks'] = []): Build =>
    build({
      levels: levels(SHIFTER, 5),
      aspects,
      picks: [{ slot: { place: { level: 1 }, selection: ASPECT_SELECTION, index: 0 }, feature: BEAR }, ...extra],
    });

  it("holds a kept-on toggle's buff, and only a listed toggle's", () => {
    // ActivatableAbility.ReapplyBuff: the toggle's m_Buff while it is on.
    const bearBuff = refGuid((data.blueprints.get(BEAR_TOGGLE) as { m_Buff: string }).m_Buff) ?? '';
    expect(walk(data, shifter([BEAR_TOGGLE]), G).unit.hasFact(bearBuff)).toBe(true);
    expect(walk(data, shifter([]), G).unit.hasFact(bearBuff)).toBe(false);
  });

  it('refuses a toggle the character never holds', () => {
    const w = walk(data, shifter([BEAR_TOGGLE, WOLF_TOGGLE]), G);
    expect(w.failures).toContainEqual(
      expect.objectContaining({ choice: 'aspect', subject: WOLF_TOGGLE, rule: 'map32.notHeld' }),
    );
  });

  it('refuses a toggle past its group size', () => {
    // ActivatableAbility.TryStart: the ShifterAspect group holds 1 (UnitPartActivatableAbility.GetGroupSize: no written
    // IncreaseActivatableAbilityGroupSize raises it; Final Aspect raises ShifterChimeraAspect).
    // ShifterAspectWolf ddf5d65742c842d79f74ac0d5cfbedf5, at Shifter 5, gives the Wolf toggle.
    const wolf = {
      slot: { place: { level: 5 }, selection: ASPECT_SELECTION, index: 0 },
      feature: 'ddf5d65742c842d79f74ac0d5cfbedf5',
    };
    const w = walk(data, shifter([BEAR_TOGGLE, WOLF_TOGGLE], [wolf]), G);
    expect(w.unit.hasFact(WOLF_TOGGLE)).toBe(true);
    expect(w.failures).toContainEqual(
      expect.objectContaining({
        choice: 'aspect',
        subject: WOLF_TOGGLE,
        rule: 'ActivatableAbility.TryStart',
        found: 2,
        needed: 1,
      }),
    );
  });
});

describe('prerequisite leaves (ticket 03c)', () => {
  const WEAPON_FOCUS = '1e1f627d26ad36f43bbd26cc2bf8ac7e';
  const ctxOf = (unit: Unit, owner: string) => ({ unit, place: { level: 1 }, firstLevel: false, owner });
  const leafOf = (owner: string, kind: string) => {
    const bp = data.blueprints.get(owner);
    const leaf = bp === undefined ? undefined : prerequisites(bp, data.blueprints).find((l) => l.names.kind === kind);
    if (leaf === undefined) throw new Error(`${owner} has no ${kind} leaf`);
    return leaf;
  };
  const human = { kind: 'race', from: HUMAN } as const;

  it('needs one feature of a list whose Amount is 0', () => {
    // WearyingStrike b4befb0a9b58e0e4687942661c55198d: PrerequisiteFeaturesFromList of AdvanceTalents
    // a33b99f95322d6741af83e9381b2391c and SneakyTricksFeature 4e1dfa97892645988937cfdcf7253c5e, Amount 0.
    // PrerequisiteFeaturesFromList.CheckInternal counts only on a held feature, so it needs one.
    const WEARYING = 'b4befb0a9b58e0e4687942661c55198d';
    const unit = new Unit(data);
    const leaf = leafOf(WEARYING, 'facts');
    expect(judgeLeaf(leaf, ctxOf(unit, WEARYING))).toEqual({ holds: false, found: 0, needed: 1 });
    unit.attach('a33b99f95322d6741af83e9381b2391c', undefined, human, { level: 1 });
    expect(judgeLeaf(leaf, ctxOf(unit, WEARYING))).toEqual({ holds: true, found: 1, needed: 1 });
  });

  it('reads every Amount-0 list that way', () => {
    // The data's other lists of that shape: DispellingAttack, CripplingStrike, ShiftersEdgeFeature, PetrifyingStrike,
    // EmboldeningStrike, LimitlessRage and ConfoundingBlades. None is met with nothing held.
    const unit = new Unit(data);
    const lists = [...data.blueprints.values()].flatMap((bp) =>
      prerequisites(bp, data.blueprints)
        .filter((l) => l.names.kind === 'facts' && l.names.Amount === 0 && !l.names.IsDeity)
        .map((l) => judgeLeaf(l, ctxOf(unit, bp.guid))),
    );
    expect(lists).toHaveLength(8);
    expect(lists.every((v) => !v.holds && v.needed === 1)).toBe(true);
  });

  it("reads a weapon subcategory from the feat's weapon category", () => {
    // SlashingGrace 697d64669eb2c0543abb9c9b07998a38 needs WeaponFocus 1e1f627d26ad36f43bbd26cc2bf8ac7e at a
    // OneHandedSlashing category (PrerequisiteParametrizedWeaponSubcategory.CheckFeature,
    // WeaponCategoryExtension.HasSubCategory): a longsword is one, a rapier isn't.
    const GRACE = '697d64669eb2c0543abb9c9b07998a38';
    const focusAt = (WeaponCategory: 'Longsword' | 'Rapier') => {
      const unit = new Unit(data);
      unit.attach('1e1f627d26ad36f43bbd26cc2bf8ac7e', { WeaponCategory }, human, { level: 1 });
      return judgeLeaf(leafOf(GRACE, 'weaponSubCategory'), ctxOf(unit, GRACE)).holds;
    };
    expect(focusAt('Longsword')).toBe(true);
    expect(focusAt('Rapier')).toBe(false);
  });

  it("refuses a weapon parameter of the Disabled subcategory, and runs the parameter's condition", () => {
    // BlueprintParametrizedFeature.CanSelect: WeaponFocus 1e1f627d26ad36f43bbd26cc2bf8ac7e at Sling, a Disabled
    // category, is refused. At Claw its PrerequisiteConditionForWeaponCategory asks for a claw equipped or no
    // AnimalCompanionClass 26b10d4340839004f960f9816f6109fe level, which a Build never has, so it is allowed.
    const focus = (WeaponCategory: 'Longsword' | 'Sling' | 'Claw') =>
      walk(
        data,
        build({
          levels: levels(FIGHTER, 1),
          picks: [
            {
              slot: { place: { level: 1 }, selection: FIGHTER_FEAT_SELECTION, index: 0 },
              feature: WEAPON_FOCUS,
              param: { WeaponCategory },
            },
          ],
        }),
        G,
      ).failures.map(({ rule, found }) => ({ rule, found }));
    expect(focus('Longsword')).toEqual([]);
    expect(focus('Sling')).toEqual([{ rule: 'BlueprintParametrizedFeature.CanSelect:Disabled', found: 'Sling' }]);
    expect(focus('Claw')).toEqual([]);
  });

  it('reads a weapon-equipped condition from the Gear in hand (hand-built)', () => {
    // WeaponFocus given a PrerequisiteConditionForWeaponCategory for Longsword that needs a longsword equipped
    // (ContextConditionIsWeaponEquipped.CheckCondition, CheckWeaponCategory): refused with empty hands, allowed with
    // StandardLongsword 6fd0a849531617844b195f452661b2cd in the main hand.
    const focusBp = data.blueprints.get(WEAPON_FOCUS);
    if (focusBp === undefined) throw new Error('no WeaponFocus');
    const equipped = {
      $type: 'ContextConditionIsWeaponEquipped',
      Not: false,
      JustCheckEmptyHand: false,
      BothHandsAreEmpty: false,
      CheckWeaponRangeType: false,
      CheckWeaponCategory: true,
      CheckSlot: false,
      Slot: 'PrimaryHand',
      RangeType: 'Melee',
      Category: 'Longsword',
      CheckOnCaster: true,
    };
    const condition = {
      $type: 'PrerequisiteConditionForWeaponCategory',
      m_WeaponCategories: ['Longsword'],
      m_Condition: equipped,
    } as Component;
    const hand = withBlueprints({ ...focusBp, Components: [...focusBp.Components, condition] });
    const focus = (gear: Build['gear']) =>
      walk(
        hand.data,
        build({
          levels: levels(FIGHTER, 1),
          ...(gear && { gear }),
          picks: [
            {
              slot: { place: { level: 1 }, selection: FIGHTER_FEAT_SELECTION, index: 0 },
              feature: WEAPON_FOCUS,
              param: { WeaponCategory: 'Longsword' },
            },
          ],
        }),
        hand.G,
      ).failures.map(({ rule, found }) => ({ rule, found }));
    expect(focus(undefined)).toEqual([
      { rule: 'BlueprintParametrizedFeature.CanSelect:IParamPrerequisite', found: 'Longsword' },
    ]);
    expect(focus({ MainHand: '6fd0a849531617844b195f452661b2cd' })).toEqual([]);
  });

  it('reads a stat a ReplaceStatForPrerequisites swaps in', () => {
    // KineticWarriorFeature ff14cb2bfab1c0547be66d8aaa7e4ada (Kinetic Knight): Intelligence prerequisites read
    // Constitution (ReplaceStatForPrerequisites.ResultStat, Policy NewStat). No Worm That Walks blueprint is in the data.
    const unit = new Unit(data);
    unit.base.set('Intelligence', 8);
    unit.base.set('Constitution', 16);
    expect(prerequisiteStat(unit, 'Intelligence')).toBe(8);
    unit.attach('ff14cb2bfab1c0547be66d8aaa7e4ada', undefined, human, { level: 1 });
    expect(prerequisiteStat(unit, 'Intelligence')).toBe(16);
  });
});

describe('grants through G (ticket 03c)', () => {
  it("gives a Trickster's Lore (Religion) domain the rank of the lore (m_SetRankFrom)", () => {
    // TricksterLoreReligionAirDomainFeature 2dc50974356942c7b9f2ccfdcdeb7d61, taken at M4 through
    // TricksterLoreReligionTier2Progression fd158d5f035346288776f18e76f6721e: its ContextActionAddFeature adds
    // TricksterLoreReligionAirDomainRankFeature 5e9edb9d48e04f90bce23b2ddd402c66 at the rank of
    // TricksterLoreReligionDomainFeature c0e6f7e7a9fc4db386f5f84466c0195f (ContextActionAddFeature.RunAction,
    // Feature.SetRank), two a rank by then: 8. AirDomainProgression 750bfcd133cd52f42acbd4f7bc9cc365 counts that rank
    // (m_FeaturesRankIncrease, BlueprintProgression.CalcLevel), so the domain stands at level 8, not 1.
    const TRICKSTER = '8df873a8c6e48294abdb78c45834aa0a';
    const TIER_2_SELECTION = 'ae4e619162a44996b77973f3abd7781a';
    const w = walk(
      data,
      {
        ...jackInTheGreen.build,
        ranks: [
          ...(jackInTheGreen.build.ranks ?? []).slice(0, 2),
          { class: TRICKSTER, level: 12 },
          { class: TRICKSTER, level: 13 },
        ],
        picks: [
          ...jackInTheGreen.build.picks.filter((p) => !('rank' in p.slot.place) || p.slot.place.rank <= 2),
          {
            slot: { place: { rank: 3 }, selection: '4fbc563529717de4d92052048143e0f1', index: 0 },
            feature: '04177c4ddec20ae4ca04388f9cf23518', // TricksterLoreReligionTier1Feature
          },
          {
            slot: { place: { rank: 4 }, selection: '5cd96c3460844fc458dc3e1656dafa42', index: 0 },
            feature: 'fd158d5f035346288776f18e76f6721e',
          },
          {
            slot: { place: { rank: 4 }, selection: TIER_2_SELECTION, index: 0 },
            feature: '3e006bc9bbf0b884a8d8853350bee846', // TricksterLoreReligionTier2Parametrized
            param: { Blueprint: '2dc50974356942c7b9f2ccfdcdeb7d61' },
          },
        ],
      },
      G,
    );
    expect(w.failures.filter((f) => 'rank' in f.place)).toEqual([]);
    expect(w.unit.rank('c0e6f7e7a9fc4db386f5f84466c0195f')).toBe(8);
    expect(w.unit.rank('5e9edb9d48e04f90bce23b2ddd402c66')).toBe(8);
    expect(w.unit.progressions.get('750bfcd133cd52f42acbd4f7bc9cc365')?.level).toBe(8);
  });

  it('applies a buff only when the action makes it Permanent', () => {
    // G's actionGrant: ContextActionApplyBuff grants for good only when Permanent (ContextActionApplyBuff.RunAction gives
    // any other a duration). Hand-built feats copy UnswornShamanStonesSpiritWanderingFeature 1's action, whose buff is
    // 31fa137926c7c8142af917409a1f8731.
    const BUFF = '31fa137926c7c8142af917409a1f8731';
    const actions = (Permanent: boolean) =>
      ({
        $type: 'AddFactContextActions',
        Activated: { Actions: [{ $type: 'ContextActionApplyBuff', Permanent, m_Buff: ref(BUFF) }] },
      }) as Component;
    const [FOR_GOOD, A_WHILE] = ['f5000000000000000000000000000001', 'f5000000000000000000000000000002'];
    const hand = withBlueprints(
      feature(FOR_GOOD, 'TestBuffForGood', [actions(true)]),
      feature(A_WHILE, 'TestBuffForAWhile', [actions(false)]),
      withOptions(BASIC_FEAT_SELECTION, FOR_GOOD, A_WHILE),
    );
    const holdsBuff = (f: string) =>
      walk(
        hand.data,
        build({
          levels: levels(FIGHTER, 1),
          picks: [{ slot: { place: { level: 1 }, selection: BASIC_FEAT_SELECTION, index: 0 }, feature: f }],
        }),
        hand.G,
      ).unit.hasFact(BUFF);
    expect(holdsBuff(FOR_GOOD)).toBe(true);
    expect(holdsBuff(A_WHILE)).toBe(false);
  });
});

describe('the areas ticket 03 left untested (ticket 03c)', () => {
  const jackTo = (cls: string): Build => ({
    ...jackInTheGreen.build,
    ranks: [...(jackInTheGreen.build.ranks ?? []).slice(0, 7), { class: cls, level: 17 }],
    picks: jackInTheGreen.build.picks.filter((p) => !('rank' in p.slot.place) || p.slot.place.rank <= 7),
  });

  it('keeps the Mythic Feat picks and drops the path under Swarm That Walks', () => {
    // SwarmThatWalksClass 5295b8e13c2303f4c88bdb3d7760a757 (m_IsHigherMythic):
    // UnitProgressionData.ReplaceAllMythicLevelsWithMythicHeroLevels, GetMythicSelectionsData.
    const w = walk(data, jackTo('5295b8e13c2303f4c88bdb3d7760a757'), G);
    expect(w.failures.filter((f) => f.choice !== 'pick')).toEqual([]);
    expect(w.unit.hasFact('51b6b22ff184eef46a675449e837365d')).toBe(true); // Spell Penetration (Mythic), M4
    expect(w.unit.hasFact('30b4200f897ba25419ba3a292aed4053')).toBe(false); // Zippy Magic, an Azata superpower
    expect(w.unit.classData(AZATA)).toBeUndefined();
    expect(w.unit.mythicLevel).toBe(8);
  });

  it("drops the Aeon's gazes under Devil", () => {
    // devil.ron dropped_selections (map 31): the picks in AeonGazeFirstSelection 7e468a5266235454e9dcefee315ee6d5
    // (M3: AeonDRGazeFeature f102b11d85a11d14c811569c0ffcaa6e) and AeonGazeSecondSelection
    // 7d498e034d18ca94baea19d7edee7403 (M5: AeonDCGazeFeature 7d3707bec182f5d428c444d7b7ead812) go.
    const AEON = '15a85e67b7d69554cab9ed5830d0268e';
    const DR_GAZE = 'f102b11d85a11d14c811569c0ffcaa6e';
    const DC_GAZE = '7d3707bec182f5d428c444d7b7ead812';
    const ranks = jackInTheGreen.build.ranks ?? [];
    const aeon = (devil: boolean): Build => ({
      ...jackInTheGreen.build,
      ranks: [
        ...ranks.slice(0, 7).map((r, i) => (i >= 2 ? { ...r, class: AEON } : r)),
        ...(devil ? [{ class: '211f49705f478b3468db6daa802452a2', level: 17 }] : []),
      ],
      picks: [
        ...jackInTheGreen.build.picks.filter((p) => !('rank' in p.slot.place) || p.slot.place.rank <= 2),
        { slot: { place: { rank: 3 }, selection: '7e468a5266235454e9dcefee315ee6d5', index: 0 }, feature: DR_GAZE },
        { slot: { place: { rank: 5 }, selection: '7d498e034d18ca94baea19d7edee7403', index: 0 }, feature: DC_GAZE },
      ],
    });
    const before = walk(data, aeon(false), G);
    expect([before.unit.hasFact(DR_GAZE), before.unit.hasFact(DC_GAZE)]).toEqual([true, true]);
    const after = walk(data, aeon(true), G);
    expect([after.unit.hasFact(DR_GAZE), after.unit.hasFact(DC_GAZE)]).toEqual([false, false]);
    expect(after.dropped.map((d) => d.fact)).toEqual(expect.arrayContaining([DR_GAZE, DC_GAZE]));
  });

  it('merges a Mythic spellbook pick into a spellbook the character has and the selection allows', () => {
    // AngelIncorporateSpellbook e1fbb0e0e610a3a4d91e5e5284587939, at Angel 1 (AngelProgression):
    // BlueprintFeatureSelectMythicSpellbook.CanSelect takes a held spellbook of m_AllowedSpellbooks (ClericSpellbook
    // 4673d19a0cf2fab4f885cc4d1353da33 is one, SorcererSpellbook b3db3766a4b605040b366265e2af0e50 isn't), and
    // SelectFeature.Apply merges it (Spellbook.AddSpecialList).
    const ANGEL = 'a5a9fe8f663d701488bd1db8ea40484e';
    const INCORPORATE = 'e1fbb0e0e610a3a4d91e5e5284587939';
    const CLERIC = '67819271767a9dd4fbfd4ae700befea0';
    const CLERIC_SPELLBOOK = '4673d19a0cf2fab4f885cc4d1353da33';
    const SORCERER_SPELLBOOK = 'b3db3766a4b605040b366265e2af0e50';
    const WIZARD_SPELLBOOK = '5a38c9ac8607890409fcb8f6342da6f4';
    const angel = (cls: string, Blueprint: string) => {
      const w = walk(
        data,
        build({
          levels: levels(cls, 3),
          ranks: [
            { class: '247aa787806d5da4f89cfc3dff0b217f', level: 1 },
            { class: '247aa787806d5da4f89cfc3dff0b217f', level: 2 },
            { class: ANGEL, level: 3 },
          ],
          picks: [
            {
              slot: { place: { rank: 3 }, selection: INCORPORATE, index: 0 },
              feature: INCORPORATE,
              param: { Blueprint },
            },
          ],
        }),
        G,
      );
      return { w, refused: w.failures.filter((f) => f.subject === INCORPORATE).map(({ rule }) => rule) };
    };
    const cleric = angel(CLERIC, CLERIC_SPELLBOOK);
    expect(cleric.refused).toEqual([]);
    expect(cleric.w.unit.spellbooks.get(CLERIC_SPELLBOOK)?.merged).toBe(true);
    expect(angel(CLERIC, WIZARD_SPELLBOOK).refused).toEqual([
      'BlueprintFeatureSelectMythicSpellbook.CanSelect:spellbook',
    ]);
    expect(angel(SORCERER, SORCERER_SPELLBOOK).refused).toEqual([
      'BlueprintFeatureSelectMythicSpellbook.CanSelect:m_AllowedSpellbooks',
    ]);
  });

  it("waives a basic feat's prerequisites under the Trickster's Knowledge (World) tier 3", () => {
    // TricksterKnowledgeWorldTier3Feature 26691ec239c84568bd27b055a1528912 sets TricksterIgnoreFeatPrerequisites
    // (AddMechanicsFeature), which BlueprintFeatureSelection.IsIgnorePrerequisites reads for the root's
    // BasicFeatSelection. Jack's L19 basic feat becomes Power Attack 9972f33f977fc724c838e59641b2fca5 (Strength 13).
    const TRICKSTER = '8df873a8c6e48294abdb78c45834aa0a';
    const POWER_ATTACK = '9972f33f977fc724c838e59641b2fca5';
    const tiers = [
      ['4fbc563529717de4d92052048143e0f1', 3, '06983a66bd6bac04db3996cd3064d9f0'],
      ['5cd96c3460844fc458dc3e1656dafa42', 4, '8b6fe337865492645892cc8db5dd0e01'],
      ['446f4a8b32019f5478a8dfeddac74710', 7, '26691ec239c84568bd27b055a1528912'],
    ] as const;
    const trickster = (upTo: number): Build => ({
      ...jackInTheGreen.build,
      ranks: [
        ...(jackInTheGreen.build.ranks ?? []).slice(0, 2),
        ...Array.from({ length: 5 }, (_, i) => ({ class: TRICKSTER, level: 12 + i })),
      ],
      picks: [
        // Jack's own picks to rank 2, less the L19 basic feat (ElementalFocusSelection bb24cc01319528849b09a3ae8eec0b31).
        ...jackInTheGreen.build.picks.filter((p) =>
          'rank' in p.slot.place
            ? p.slot.place.rank <= 2
            : !(
                p.slot.place.level === 19 &&
                [BASIC_FEAT_SELECTION, 'bb24cc01319528849b09a3ae8eec0b31'].includes(p.slot.selection)
              ),
        ),
        ...tiers
          .filter(([, rank]) => rank <= upTo)
          .map(([selection, rank, f]) => ({ slot: { place: { rank }, selection, index: 0 }, feature: f })),
        { slot: { place: { level: 19 }, selection: BASIC_FEAT_SELECTION, index: 0 }, feature: POWER_ATTACK },
      ],
    });
    const refusedPowerAttack = (b: Build) => walk(data, b, G).failures.filter((f) => f.subject === POWER_ATTACK);
    expect(refusedPowerAttack(trickster(4))).toEqual([
      expect.objectContaining({ rule: 'BlueprintFeatureSelection.CanSelect:MeetsPrerequisites' }),
    ]);
    expect(refusedPowerAttack(trickster(7))).toEqual([]);
  });

  it('judges the main character: a companion-only class is refused, the main-character tests pass', () => {
    // MythicCompanionClass 530b6a79cb691c24ba99e1577b4beb6d: PrerequisiteMainCharacter with Companion
    // (IsMainCharacter != Companion). ContextConditionIsMainCharacter.CheckCondition and EquipmentRestrictionMainPlayer
    // hold for a Build (map ticket 01): MaskOfNothingItem 8344b46a6e404227b72d129073383a6c carries the restriction.
    const w = walk(
      data,
      build({
        levels: levels(FIGHTER, 1),
        ranks: [{ class: '530b6a79cb691c24ba99e1577b4beb6d', level: 1 }],
        gear: { Head: '8344b46a6e404227b72d129073383a6c' },
      }),
      G,
    );
    expect(w.failures).toContainEqual(
      expect.objectContaining({
        choice: 'class',
        subject: '530b6a79cb691c24ba99e1577b4beb6d',
        unmet: expect.arrayContaining([
          expect.objectContaining({ leaf: expect.objectContaining({ names: { kind: 'mainCharacter' } }) }),
        ]),
      }),
    );
    expect(w.failures.filter((f) => f.choice === 'gear')).toEqual([]);
    const unit = new Unit(data);
    const ctx = { unit, place: { level: 1 }, firstLevel: false, owner: '' };
    expect(conditionHolds({ $type: 'ContextConditionIsMainCharacter', Not: false } as Condition, ctx)).toBe(true);
  });

  it('never holds a story-granted feature', () => {
    // BackgroundRekarthDLC2 ab8136b1b9d54982a5c9faf100547483 needs Scout_FeatureList 27d646fc04ff43f48af74300a4a58f9e,
    // which only the story grants: nothing a Build reaches gives it (map ticket 25).
    const SCOUT = '27d646fc04ff43f48af74300a4a58f9e';
    expect(reachableFromRoot(data, G).has(SCOUT)).toBe(false);
    const w = walk(
      data,
      build({
        levels: levels(FIGHTER, 1),
        picks: [
          {
            slot: { place: { level: 1 }, selection: 'f926dabeee7f8a54db8f2010b323383c', index: 0 },
            feature: 'ab8136b1b9d54982a5c9faf100547483',
          },
        ],
      }),
      G,
    );
    expect(w.failures).toContainEqual(
      expect.objectContaining({
        rule: 'BlueprintFeatureSelection.CanSelect:MeetsPrerequisites',
        unmet: [
          expect.objectContaining({ leaf: expect.objectContaining({ names: { kind: 'fact', m_Feature: SCOUT } }) }),
        ],
      }),
    );
  });
});
