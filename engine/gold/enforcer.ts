import type { Attribute, StatType } from '../data';
import { abilityScores, rankLevel, skillRanks, type Build, type LevelUp } from '../build';
import { chain, facts, increase, pick, racePick, withParam, type Gold } from './gold';

const SLAYER = 'c75e0971973957d4dbad24bc7957e4fb';
const ROGUE = '299aa766dee3cbf4790da4efb8c72484';
const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
const MYTHIC_HERO = '247aa787806d5da4f89cfc3dff0b217f';
const AZATA = '9a3b2c63afa79744cbca46bea0da9a16';
const RANK_LEVELS = [6, 7, 9, 11, 14, 15, 16, 17, 17, 20];
const INCREASES: Readonly<Record<number, Attribute>> = {
  4: 'Strength',
  8: 'Strength',
  12: 'Dexterity',
  16: 'Strength',
  20: 'Strength',
};

const level = (n: number): LevelUp => {
  const cls = n <= 15 ? SLAYER : n <= 19 ? ROGUE : FIGHTER;
  const skills: Partial<Record<StatType, number>> = { SkillAthletics: 1, SkillPerception: 1, SkillPersuasion: 1 };
  if (cls === ROGUE) Object.assign(skills, { SkillMobility: 1, SkillStealth: 1 });
  const raise = INCREASES[n];
  return { class: cls, skills: skillRanks(skills), ...(raise && { increase: raise }) };
};

const BATTLE_AXE = { WeaponCategory: 'Battleaxe' } as const;
const HALF_ELF_HERITAGE_SELECTION = '9df7b68d60544bcf8e5b56c0a4688e04';
const BASE_RASE_HALF_ELF_SELECTION = 'a9d54aab4e9243ca867341257aaa253e';
const ADAPTABILITY = '26a668c5a8c22354bac67bcd42e09a3f';
const SKILL_FOCUS_DIPLOMACY = '1621be43793c5bb43be55493e9c45924';
const BACKGROUNDS_BASE_SELECTION = 'f926dabeee7f8a54db8f2010b323383c';
const BACKGROUNDS_REGIONAL_SELECTION = 'fa621a249cc836f4382ca413b976e65e';
const BACKGROUND_ANDORAN_DIPLOMAT = 'f6b2d489b1d907f47a734b5f72f5200d';
const DEITY_SELECTION = '59e7a76987fe3b547b9cce045f4db3e4';
const ATHEISM_FEATURE = '92c0d2da0a836ce418a267093c09ca54';
const ARCANIST_EXPLOIT_SELECTION = 'b8bf3d5023f2d8c428fdf6438cecaea7';
const ARCANIST_EXPLOIT_WOODEN_FLESH_FEATURE = 'd84be1e69b0870543a959d43151f16e3';
const BASIC_FEAT_SELECTION = '247a4068296e8be42890143f451b4b45';
const TWO_WEAPON_FIGHTING = 'ac8aaf29054f5b74eb18f2af950e752d';
const SLAYER_TALENT_SELECTION_2 = '04430ad24988baa4daa0bcd4f1c7d118';
const RANGER_STYLE_SELECTION_2 = 'c6d0da9124735a44f93ac31df803b9a9';
const RANGER_STYLE_MENACING_SELECTION_2 = '1c5988e90e0657645972e7b28ba4ce8b';
const INTIMIDATING_PROWESS = 'd76497bfc48516e45a0831628f767a0f';
const SHIELD_BASH_FEATURE = '121811173a614534e8720d7550aae253';
const ARCANIST_EXPLOIT_ARMORED_MASK_FEATURE = '585f02be2202e1f4289e04e84cd787e5';
const OUTFLANK = '422dab7309e1ad343935f33a4d6e9f11';
const SLAYER_TALENT_SELECTION_6 = '43d1b15873e926848be2abf0ea3ad9a8';
const RANGER_STYLE_SELECTION_6 = '61f82ba786fe05643beb3cd3910233a8';
const RANGER_STYLE_MENACING_SELECTION_6 = 'a9998f05a0472bb4f8950304fe26ec0c';
const SHATTER_DEFENSES = '61a17ccbbb3d79445b0926347ec07577';
const FIRST_ASCENSION_SELECTION = '1421e0034a3afac458de08648d06faf0';
const TRICKSTER_FIRST_LEVELS_PROGRESSION = '11ba180ac736c894e937602e54f7320c';
const MYTHIC_ABILITY_SELECTION = 'ba0e5a900b775be4a99702f1ed08914d';
const DEFENSIVE_STUDY = 'ec041312142ba1f48a0044521f68fc0a';
const ARCANIST_EXPLOIT_DIMENSIONAL_SLIDE_FEATURE = '687f9c86f8afea34097d84569b5abd07';
const COMBAT_REFLEXES = '0f8939ae6f220984e8fb568abbdfba95';
const MYTHIC_FEAT_SELECTION = '9ee0f6745f555484299b0a1563b99d81';
const TWO_WEAPON_FIGHTING_MYTHIC_FEAT = 'c6afbb8c1a36a704a8041f35498f41a4';
const UNCANNY_DODGE_TALENT = 'ca5274d057152fa45b7527cad0927840';
const IMPROVED_CRITICAL = 'f4201c85a991369408740c6888362e20';
const INSPIRATIONAL_LEADER_FEATURE = 'ffa9a8b8ea27b2a48b3638e20673a687';
const ARCANIST_EXPLOIT_SPELL_RESISTANCE_FEATURE = '72d6f0a1d508738419b90f90ad1258fb';
const SHIELD_MASTER = 'dbec636d84482944f87435bd31522fcc';
const IMPROVED_CRITICAL_MYTHIC_FEAT = '8bc0190a4ec04bd489eec290aeaa6d07';
const AZATA_SUPERPOWERS_SELECTION = '8a30e92cd04ff5b459ba7cb03584fda0';
const INCREDIBLE_MIGHT_FEATURE = 'eef8d23a7e4acfe4d834a5de844c8c7c';
const SLAYER_TALENT_SELECTION_10 = '913b9cf25c9536949b43a2651b7ffb66';
const RANGER_STYLE_SELECTION_10 = '78177315fc63b474ea3cbb8df38fafcd';
const RANGER_STYLE_MENACING_SELECTION_10 = '7d5bd07830a5e2c478852bf8b860db2c';
const DREADFUL_CARNAGE = 'fc37b70e3d064a147a3a99db4a86ee12';
const ARCANIST_EXPLOIT_GREATER_SPELL_RESISTANCE_FEATURE = '1eba9b432ef464349befcc7f5c428849';
const TWO_WEAPON_FIGHTING_IMPROVED = '9af88f3ed8a017b45a6837eab7437629';
const CRIPPLING_STRIKE = 'b696bd7cb38da194fa3404032483d1db';
const ARCHMAGE_ARMOR = 'c3ef5076c0feb3c4f90c229714e62cd0';
const IMPROVED_INITIATIVE = '797f25d709f559546b29e7bcb181cc74';
const IMPROVED_INITIATIVE_MYTHIC_FEAT = '25f4cb387ba4ab94d944fdef3da9ab97';
const LIFE_BONDING_FRIENDSHIP_SELECTION = 'cfad18f581584ac4ba066df067956477';
const SHIELD_WALL = '8976de442862f82488a4b138a0a89907';
const ENDURING_SPELLS = '2f206e6d292bdfb4d981e99dcf08153f';
const LIFE_BONDING_FRIENDSHIP_SELECTION_1 = '69a33d6ced23446e819667149d088898';
const SHAKE_IT_OFF = '6337b37f2a7c11b4ab0831d6780bce2a';
const EXTRA_MYTHIC_ABILITY_MYTHIC_FEAT = '8a6a511c55e67d04db328cc49aaad2b8';
const ENDURING_SPELLS_GREATER = '13f9269b3b48ae94c896f0371ce5e23c';
const MARVELOUS_ENDURANCE_FEATURE = '40c43d4d27ebde647b796f9faf4f0299';
const SYLVAN_TRICKSTER_TALENT_SELECTION = '290bbcc3c3bb92144b853fd8fb8ff452';
const WITCH_HEX_ICEPLANT_FEATURE = '9af6dc2697c8ef24eab8ce1c697b05c4';
const BASHING_FINISH = '0b442a7b4aa598d4e912a4ecee0500ff';
const FINESSE_TRAINING_SELECTION = 'b78d146cea711a84598f0acef69462ea';
const FINESSE_TRAINING_LIGHT_SHIELD = 'bbe497b750f698c4eb99bcf97240a0d1';
const EVER_READY = '8161528d5b98b3e4a8a6a0ed327c3b6a';
const DOUBLE_DEBILITATION = 'dd699394df0ef8847abba26038333f02';
const TWO_WEAPON_FIGHTING_GREATER = 'c126adbdf6ddd8245bda33694cd774e8';
const FIGHTER_FEAT_SELECTION = '41c8486641f7d6d4283ca9dae4147a9f';
const SHIELD_FOCUS = 'ac57069b6bf8c904086171683992a92a';
const SHIELD_FOCUS_MYTHIC_FEAT = '502434c044c16304a92901a0b25d5216';
const SUPERSONIC_SPEED_FEATURE = '505456aa17dd18a4e8bd8172811a4fdc';
const HALF_ELF_RACE = 'b3646842ffbd01643ab4dac7479b20b0';
const ARCANE_ENFORCER_ARCHETYPE = '23a5d0ca607f6094097d509b2b1f4a10';
const SYLVAN_TRICKSTER_ARCHETYPE = '490394869f666c141bf8647b1a365220';
const MUTATION_WARRIOR_ARCHETYPE = '758e0061a077e54409a3bf0eb51511e5';
const BELT_OF_DEXTERITY_2 = 'b6af4c1834999e74497b41588d1071cd';

const build: Build = {
  race: HALF_ELF_RACE,
  raceStat: 'Strength',
  alignment: 'ChaoticGood',
  scores: abilityScores({ Strength: 16, Dexterity: 16, Constitution: 14, Intelligence: 10, Wisdom: 8, Charisma: 12 }),
  classChoices: {
    [SLAYER]: { archetypes: [ARCANE_ENFORCER_ARCHETYPE] },
    [ROGUE]: { archetypes: [SYLVAN_TRICKSTER_ARCHETYPE] },
    [FIGHTER]: { archetypes: [MUTATION_WARRIOR_ARCHETYPE] },
  },
  levels: Array.from({ length: 20 }, (_, i) => level(i + 1)),
  ranks: RANK_LEVELS.map((at, i) => ({ class: i < 2 ? MYTHIC_HERO : AZATA, level: rankLevel(at) })),
  gear: { Belt: BELT_OF_DEXTERITY_2 },
  countGear: true,
  picks: [
    ...chain(
      racePick({ level: 1 }, HALF_ELF_HERITAGE_SELECTION, HALF_ELF_RACE, 0, BASE_RASE_HALF_ELF_SELECTION),
      ADAPTABILITY,
      SKILL_FOCUS_DIPLOMACY,
    ),
    ...chain(
      pick({ level: 1 }, BACKGROUNDS_BASE_SELECTION, 0, BACKGROUNDS_REGIONAL_SELECTION),
      BACKGROUND_ANDORAN_DIPLOMAT,
    ),
    pick({ level: 1 }, DEITY_SELECTION, 0, ATHEISM_FEATURE),
    pick({ level: 1 }, ARCANIST_EXPLOIT_SELECTION, 0, ARCANIST_EXPLOIT_WOODEN_FLESH_FEATURE),
    pick({ level: 1 }, BASIC_FEAT_SELECTION, 0, TWO_WEAPON_FIGHTING),
    ...chain(
      pick({ level: 2 }, SLAYER_TALENT_SELECTION_2, 0, RANGER_STYLE_SELECTION_2),
      RANGER_STYLE_MENACING_SELECTION_2,
      INTIMIDATING_PROWESS,
    ),
    pick({ level: 3 }, BASIC_FEAT_SELECTION, 0, SHIELD_BASH_FEATURE),
    pick({ level: 4 }, ARCANIST_EXPLOIT_SELECTION, 0, ARCANIST_EXPLOIT_ARMORED_MASK_FEATURE),
    pick({ level: 5 }, BASIC_FEAT_SELECTION, 0, OUTFLANK),
    ...chain(
      pick({ level: 6 }, SLAYER_TALENT_SELECTION_6, 0, RANGER_STYLE_SELECTION_6),
      RANGER_STYLE_MENACING_SELECTION_6,
      SHATTER_DEFENSES,
    ),
    pick({ rank: 1 }, FIRST_ASCENSION_SELECTION, 0, TRICKSTER_FIRST_LEVELS_PROGRESSION),
    pick({ rank: 1 }, MYTHIC_ABILITY_SELECTION, 0, DEFENSIVE_STUDY),
    pick({ level: 7 }, ARCANIST_EXPLOIT_SELECTION, 0, ARCANIST_EXPLOIT_DIMENSIONAL_SLIDE_FEATURE),
    pick({ level: 7 }, BASIC_FEAT_SELECTION, 0, COMBAT_REFLEXES),
    pick({ rank: 2 }, MYTHIC_FEAT_SELECTION, 0, TWO_WEAPON_FIGHTING_MYTHIC_FEAT),
    pick({ level: 8 }, SLAYER_TALENT_SELECTION_6, 0, UNCANNY_DODGE_TALENT),
    pick({ level: 9 }, BASIC_FEAT_SELECTION, 0, IMPROVED_CRITICAL, BATTLE_AXE),
    pick({ rank: 3 }, MYTHIC_ABILITY_SELECTION, 0, INSPIRATIONAL_LEADER_FEATURE),
    pick({ level: 10 }, ARCANIST_EXPLOIT_SELECTION, 0, ARCANIST_EXPLOIT_SPELL_RESISTANCE_FEATURE),
    pick({ level: 11 }, BASIC_FEAT_SELECTION, 0, SHIELD_MASTER),
    pick({ rank: 4 }, MYTHIC_FEAT_SELECTION, 0, IMPROVED_CRITICAL_MYTHIC_FEAT, BATTLE_AXE),
    pick({ rank: 4 }, AZATA_SUPERPOWERS_SELECTION, 0, INCREDIBLE_MIGHT_FEATURE),
    ...chain(
      pick({ level: 12 }, SLAYER_TALENT_SELECTION_10, 0, RANGER_STYLE_SELECTION_10),
      RANGER_STYLE_MENACING_SELECTION_10,
      DREADFUL_CARNAGE,
    ),
    pick({ level: 13 }, ARCANIST_EXPLOIT_SELECTION, 0, ARCANIST_EXPLOIT_GREATER_SPELL_RESISTANCE_FEATURE),
    pick({ level: 13 }, BASIC_FEAT_SELECTION, 0, TWO_WEAPON_FIGHTING_IMPROVED),
    pick({ level: 14 }, SLAYER_TALENT_SELECTION_10, 0, CRIPPLING_STRIKE),
    pick({ rank: 5 }, MYTHIC_ABILITY_SELECTION, 0, ARCHMAGE_ARMOR),
    pick({ level: 15 }, BASIC_FEAT_SELECTION, 0, IMPROVED_INITIATIVE),
    pick({ rank: 6 }, MYTHIC_FEAT_SELECTION, 0, IMPROVED_INITIATIVE_MYTHIC_FEAT),
    ...chain(pick({ rank: 6 }, AZATA_SUPERPOWERS_SELECTION, 0, LIFE_BONDING_FRIENDSHIP_SELECTION), SHIELD_WALL),
    pick({ rank: 7 }, MYTHIC_ABILITY_SELECTION, 0, ENDURING_SPELLS),
    pick({ rank: 7 }, LIFE_BONDING_FRIENDSHIP_SELECTION_1, 0, SHAKE_IT_OFF),
    ...chain(pick({ rank: 8 }, MYTHIC_FEAT_SELECTION, 0, EXTRA_MYTHIC_ABILITY_MYTHIC_FEAT), ENDURING_SPELLS_GREATER),
    pick({ rank: 8 }, AZATA_SUPERPOWERS_SELECTION, 0, MARVELOUS_ENDURANCE_FEATURE),
    pick({ level: 17 }, SYLVAN_TRICKSTER_TALENT_SELECTION, 0, WITCH_HEX_ICEPLANT_FEATURE),
    pick({ level: 17 }, BASIC_FEAT_SELECTION, 0, BASHING_FINISH),
    pick({ level: 18 }, FINESSE_TRAINING_SELECTION, 0, FINESSE_TRAINING_LIGHT_SHIELD),
    pick({ rank: 9 }, MYTHIC_ABILITY_SELECTION, 0, EVER_READY),
    pick({ level: 19 }, SYLVAN_TRICKSTER_TALENT_SELECTION, 0, DOUBLE_DEBILITATION),
    pick({ level: 19 }, BASIC_FEAT_SELECTION, 0, TWO_WEAPON_FIGHTING_GREATER),
    pick({ level: 20 }, FIGHTER_FEAT_SELECTION, 0, SHIELD_FOCUS),
    pick({ rank: 10 }, MYTHIC_FEAT_SELECTION, 0, SHIELD_FOCUS_MYTHIC_FEAT),
    pick({ rank: 10 }, AZATA_SUPERPOWERS_SELECTION, 0, SUPERSONIC_SPEED_FEATURE),
  ],
};

const AE = 'Arcane Enforcer';
const ST = 'Sylvan Trickster';
const SLAYER_STUDY_TARGET_FEATURE = '09bdd9445ac38044389476689ae8d5a1';
const SNEAK_ATTACK = '9b9eac6709e1c084cb18c3a366e0ec87';

export const enforcer: Gold = {
  name: 'Enforcer',
  build,
  start: {
    race: 'Half-Elf',
    background: 'Andoren Diplomat',
    attributes: { Strength: 18, Dexterity: 16, Constitution: 14, Intelligence: 10, Wisdom: 8, Charisma: 12 },
    skills: ['SkillAthletics', 'SkillPerception', 'SkillPersuasion'],
    alignments: ['ChaoticNeutral', 'ChaoticGood', 'NeutralGood'],
  },
  places: [
    {
      place: { level: 1 },
      class: AE,
      lines: [
        facts('Arcane Reservoir', '9d1e2212594cf47438fff2fa3477b954'),
        facts('Studied Target +1', SLAYER_STUDY_TARGET_FEATURE),
        facts('Wooden Flesh', 'd84be1e69b0870543a959d43151f16e3'),
        facts('Two-Weapon Fighting', 'ac8aaf29054f5b74eb18f2af950e752d'),
        facts('Skill Focus - Persuasion', '1621be43793c5bb43be55493e9c45924'),
      ],
    },
    {
      place: { level: 2 },
      class: AE,
      lines: [
        facts(
          'Menacing Style - Intimidating Prowess',
          'c6d0da9124735a44f93ac31df803b9a9',
          '1c5988e90e0657645972e7b28ba4ce8b',
          'd76497bfc48516e45a0831628f767a0f',
        ),
      ],
    },
    {
      place: { level: 3 },
      class: AE,
      lines: [facts('+1d6 sneak', SNEAK_ATTACK), facts('Shield Bash', '121811173a614534e8720d7550aae253')],
    },
    {
      place: { level: 4 },
      class: AE,
      lines: [facts('Armored Mask', '585f02be2202e1f4289e04e84cd787e5'), increase('+1 Strength', 'Strength')],
    },
    {
      place: { level: 5 },
      class: AE,
      lines: [
        facts('Studied Target +2', SLAYER_STUDY_TARGET_FEATURE),
        facts('Outflank', '422dab7309e1ad343935f33a4d6e9f11'),
      ],
    },
    {
      place: { level: 6 },
      class: AE,
      lines: [
        facts('+1d6 sneak', SNEAK_ATTACK),
        facts(
          'Menacing Style - Shatter Defenses',
          '61f82ba786fe05643beb3cd3910233a8',
          'a9998f05a0472bb4f8950304fe26ec0c',
          '61a17ccbbb3d79445b0926347ec07577',
        ),
      ],
    },
    {
      place: { level: 7 },
      class: AE,
      lines: [
        facts('Studied Target (Swift)', '40d4f55a5ac0e4f469d67d36c0dfc40b'),
        facts('Dimensional Slide', '687f9c86f8afea34097d84569b5abd07'),
        facts('Combat Reflexes', '0f8939ae6f220984e8fb568abbdfba95'),
      ],
    },
    {
      place: { level: 8 },
      class: AE,
      lines: [facts('Uncanny Dodge', 'ca5274d057152fa45b7527cad0927840'), increase('+1 Strength', 'Strength')],
    },
    {
      place: { level: 9 },
      class: AE,
      lines: [
        facts('+1d6 sneak', SNEAK_ATTACK),
        withParam('Improved Critical - Battleaxe', 'f4201c85a991369408740c6888362e20', BATTLE_AXE),
      ],
    },
    {
      place: { level: 10 },
      class: AE,
      lines: [
        facts('Studied Target +3', SLAYER_STUDY_TARGET_FEATURE),
        facts('Spell Resistance', '72d6f0a1d508738419b90f90ad1258fb'),
      ],
    },
    { place: { level: 11 }, class: AE, lines: [facts('Shield Master', 'dbec636d84482944f87435bd31522fcc')] },
    {
      place: { level: 12 },
      class: AE,
      lines: [
        facts('+1d6 sneak', SNEAK_ATTACK),
        facts(
          'Menacing Style - Dreadful Carnage',
          '78177315fc63b474ea3cbb8df38fafcd',
          '7d5bd07830a5e2c478852bf8b860db2c',
          'fc37b70e3d064a147a3a99db4a86ee12',
        ),
        increase('+1 Dexterity', 'Dexterity'),
      ],
    },
    {
      place: { level: 13 },
      class: AE,
      lines: [
        facts('Greater Spell Resistance', '1eba9b432ef464349befcc7f5c428849'),
        facts('Improved Two-Weapon Fighting', '9af88f3ed8a017b45a6837eab7437629'),
      ],
    },
    { place: { level: 14 }, class: AE, lines: [facts('Crippling Strike', 'b696bd7cb38da194fa3404032483d1db')] },
    {
      place: { level: 15 },
      class: AE,
      lines: [
        facts('Studied Target +4', SLAYER_STUDY_TARGET_FEATURE),
        facts('+1d6 sneak', SNEAK_ATTACK),
        facts('Improved Initiative', '797f25d709f559546b29e7bcb181cc74'),
      ],
    },
    {
      place: { level: 16 },
      class: ST,
      lines: [
        facts('Weapon Finesse', '90e54424d682d104ab36436bd527af09'),
        facts('Trapfinding', 'dbb6b3bffe6db3547b31c3711653838e'),
        facts('+1d6 sneak', SNEAK_ATTACK),
        increase('+1 Strength', 'Strength'),
      ],
    },
    {
      place: { level: 17 },
      class: ST,
      lines: [
        facts('Evasion', '576933720c440aa4d8d42b0c54b77e80'),
        facts('Iceplant', '9af6dc2697c8ef24eab8ce1c697b05c4'),
        facts('Bashing Finish', '0b442a7b4aa598d4e912a4ecee0500ff'),
      ],
    },
    {
      place: { level: 18 },
      class: ST,
      lines: [
        facts('Danger Sense', '0bcbe9e450b0e7b428f08f66c53c5136'),
        facts('+1d6 sneak', SNEAK_ATTACK),
        facts('Finesse Training - Light Shield', 'bbe497b750f698c4eb99bcf97240a0d1'),
      ],
    },
    {
      place: { level: 19 },
      class: ST,
      lines: [
        facts('Debilitating Injury', 'def114eb566dfca448e998969bf51586'),
        facts("Resist Nature's Lure", 'ad6a5b0e1a65c3540986cf9a7b006388'),
        facts('Double Debilitation', 'dd699394df0ef8847abba26038333f02'),
        facts('Greater Two-Weapon Fighting', 'c126adbdf6ddd8245bda33694cd774e8'),
      ],
    },
    {
      place: { level: 20 },
      class: 'Mutation Warrior',
      lines: [facts('Shield Focus', 'ac57069b6bf8c904086171683992a92a'), increase('+1 Strength', 'Strength')],
    },
    {
      place: { rank: 1 },
      class: 'Mythic Hero',
      lines: [
        facts('Bypass Epic DR', 'c60933cc085132b49970cbc4a4b8338f'),
        facts('Bit of Fun', '11ba180ac736c894e937602e54f7320c'),
        facts('Defensive Study', 'ec041312142ba1f48a0044521f68fc0a'),
      ],
    },
    {
      place: { rank: 2 },
      class: 'Mythic Hero',
      lines: [
        facts('Hard to Kill', 'bef12729fa3f9b34488634f61751e295'),
        facts("Summon Will-o'-Wisp", '8963c914c07ccd0489d1d34a8d1a5865'),
        facts('Creative Approach', '4cd530e060eccbc4b99f232abbf9c3f1'),
        facts('Two-Weapon Fighting (Mythic)', 'c6afbb8c1a36a704a8041f35498f41a4'),
      ],
    },
    {
      place: { rank: 3 },
      class: 'Azata',
      lines: [
        facts('Dragon Companion', 'cf36f23d60987224696f03be70351928'),
        facts('Song of Heroic Resolve', '90185ba04ff485845bbac7512e2c3c73'),
        facts('Summon Mastodon', '6190d39083ffc6b4386f86ac73a47e1f'),
        facts('Inspirational Leader', 'ffa9a8b8ea27b2a48b3638e20673a687'),
      ],
    },
    {
      place: { rank: 4 },
      class: 'Azata',
      lines: [
        facts('Summon Movanic Deva', 'd779bcb070a85ec47a49a2723b00f79f'),
        facts('Incredible Might', 'eef8d23a7e4acfe4d834a5de844c8c7c'),
        withParam('Improved Critical (Mythic) - Battleaxe', '8bc0190a4ec04bd489eec290aeaa6d07', BATTLE_AXE),
      ],
    },
    {
      place: { rank: 5 },
      class: 'Azata',
      lines: [
        facts('Song of Broken Chains', '31a8a71445f21a044b01eb877b8540db'),
        facts('Summon Azata Ghael', '60d146d694f1d9142b8a48e977c8e3b4'),
        facts('Archmage Armor', 'c3ef5076c0feb3c4f90c229714e62cd0'),
      ],
    },
    {
      place: { rank: 6 },
      class: 'Azata',
      lines: [
        facts('Song of Defiance', 'c2be02bc2014d4c4cbaf7c442a7f076f'),
        facts('Summon Astral Deva', 'edc2d236d6993814fb4f09fb8d2b6c17'),
        facts(
          'Life-Bonding Friendship (Shield Wall)',
          'cfad18f581584ac4ba066df067956477',
          '8976de442862f82488a4b138a0a89907',
        ),
        facts('Improved Initiative (Mythic)', '25f4cb387ba4ab94d944fdef3da9ab97'),
      ],
    },
    {
      place: { rank: 7 },
      class: 'Azata',
      lines: [
        facts('Song of Courageous Defender', 'a1dd79df6909b0142915a3a88df4837d'),
        facts('Summon Astral Devas', 'ab8e798732dc2284eb7ae2b1c48b09c6'),
        facts(
          'Life-Bonding Friendship (Shake It Off)',
          '69a33d6ced23446e819667149d088898',
          '6337b37f2a7c11b4ab0831d6780bce2a',
        ),
        facts('Enduring Spells', '2f206e6d292bdfb4d981e99dcf08153f'),
      ],
    },
    {
      place: { rank: 8 },
      class: 'Azata',
      lines: [
        facts('Summon Azata Ghaels and Astral Devas', 'b4ce3e07c9d974f4fa748af0e8a0a77b'),
        facts('Marvelous Endurance', '40c43d4d27ebde647b796f9faf4f0299'),
        facts(
          'Extra Mythic Ability - Greater Enduring Spells',
          '8a6a511c55e67d04db328cc49aaad2b8',
          '13f9269b3b48ae94c896f0371ce5e23c',
        ),
      ],
    },
    {
      place: { rank: 9 },
      class: 'Azata',
      lines: [
        facts('Summon Hamadryads', '8403a6cec131de949b42cfa329963736'),
        facts('Ever Ready', '8161528d5b98b3e4a8a6a0ed327c3b6a'),
      ],
    },
    {
      place: { rank: 10 },
      class: 'Azata',
      lines: [
        facts('Supersonic Speed', '505456aa17dd18a4e8bd8172811a4fdc'),
        facts('Mythic Shield Focus', '502434c044c16304a92901a0b25d5216'),
      ],
    },
  ],
};
