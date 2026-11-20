// The Enforcer, a Half-Elf Arcane Enforcer 15 / Sylvan Trickster 4 / Mutation Warrior 1 on the Azata path, converted
// once from the Rust planner's `enforcer.ron` (the write-up as written is its `source.txt`). Each line keeps the
// write-up's words, label prefixes dropped. The Build is the write-up's: its slots are the ones the game opens (each
// GUID's asset name is in the comment), with these choices the write-up leaves open, as the Rust planner settled them
// (its tickets 88, 91, 163, 171):
// - Chaotic Good and atheist;
// - Athletics, Perception and Persuasion a rank every level, and the rogue levels' Mobility and Stealth;
// - the Trickster's first ascension, then the Azata; the Mythic ranks at their Expected levels (MythicsSettings
//   3b8a6729da1e13a4e8e606e9f0fa38d8) except rank 10, taken at level 20 after Shield Focus, which Shield Focus
//   (Mythic) needs;
// - a Belt of Incredible Dexterity +2 (BeltOfDexterity2 b6af4c1834999e74497b41588d1071cd) under the Gear opt-in
//   (ADR 0002), so level 19's Greater Two-Weapon Fighting (Dexterity 19) is legal, and marked gear-dependent.
import type { Attribute, StatType } from '../data/types';
import type { Build, LevelUp } from '../build';
import { facts, increase, pick, withParam, type Gold } from './gold';

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
  return { class: cls, skills, ...(raise && { increase: raise }) };
};

const BATTLE_AXE = { WeaponCategory: 'Battleaxe' } as const;

const build: Build = {
  race: 'b3646842ffbd01643ab4dac7479b20b0', // HalfElfRace
  raceStat: 'Strength',
  alignment: 'ChaoticGood',
  // 16/16/14/10/8/12 costs 10 + 10 + 5 + 0 - 2 + 2 = 25 (StatsDistribution); the Half-Elf's +2 Strength makes the
  // write-up's 18.
  scores: { Strength: 16, Dexterity: 16, Constitution: 14, Intelligence: 10, Wisdom: 8, Charisma: 12 },
  classChoices: {
    [SLAYER]: { archetypes: ['23a5d0ca607f6094097d509b2b1f4a10'] }, // ArcaneEnforcerArchetype
    [ROGUE]: { archetypes: ['490394869f666c141bf8647b1a365220'] }, // SylvanTricksterArchetype
    [FIGHTER]: { archetypes: ['758e0061a077e54409a3bf0eb51511e5'] }, // MutationWarriorArchetype
  },
  levels: Array.from({ length: 20 }, (_, i) => level(i + 1)),
  ranks: RANK_LEVELS.map((at, i) => ({ class: i < 2 ? MYTHIC_HERO : AZATA, level: at })),
  gear: { Belt: 'b6af4c1834999e74497b41588d1071cd' }, // BeltOfDexterity2: Dexterity2, an Enhancement +2
  countGear: true,
  picks: [
    pick({ level: 1 }, '9df7b68d60544bcf8e5b56c0a4688e04', 0, 'a9d54aab4e9243ca867341257aaa253e'), // HalfElfHeritageSelection -> BaseRaseHalfElfSelection
    pick({ level: 1 }, 'a9d54aab4e9243ca867341257aaa253e', 0, '26a668c5a8c22354bac67bcd42e09a3f'), // BaseRaseHalfElfSelection -> Adaptability
    pick({ level: 1 }, '26a668c5a8c22354bac67bcd42e09a3f', 0, '1621be43793c5bb43be55493e9c45924'), // Adaptability -> SkillFocusDiplomacy
    pick({ level: 1 }, 'f926dabeee7f8a54db8f2010b323383c', 0, 'fa621a249cc836f4382ca413b976e65e'), // BackgroundsBaseSelection -> BackgroundsRegionalSelection
    pick({ level: 1 }, 'fa621a249cc836f4382ca413b976e65e', 0, 'f6b2d489b1d907f47a734b5f72f5200d'), // BackgroundsRegionalSelection -> BackgroundAndoranDiplomat
    pick({ level: 1 }, '59e7a76987fe3b547b9cce045f4db3e4', 0, '92c0d2da0a836ce418a267093c09ca54'), // DeitySelection -> AtheismFeature
    pick({ level: 1 }, 'b8bf3d5023f2d8c428fdf6438cecaea7', 0, 'd84be1e69b0870543a959d43151f16e3'), // ArcanistExploitSelection -> ArcanistExploitWoodenFleshFeature
    pick({ level: 1 }, '247a4068296e8be42890143f451b4b45', 0, 'ac8aaf29054f5b74eb18f2af950e752d'), // BasicFeatSelection -> TwoWeaponFighting
    pick({ level: 2 }, '04430ad24988baa4daa0bcd4f1c7d118', 0, 'c6d0da9124735a44f93ac31df803b9a9'), // SlayerTalentSelection2 -> RangerStyleSelection2
    pick({ level: 2 }, 'c6d0da9124735a44f93ac31df803b9a9', 0, '1c5988e90e0657645972e7b28ba4ce8b'), // RangerStyleSelection2 -> RangerStyleMenacingSelection2
    pick({ level: 2 }, '1c5988e90e0657645972e7b28ba4ce8b', 0, 'd76497bfc48516e45a0831628f767a0f'), // RangerStyleMenacingSelection2 -> IntimidatingProwess
    pick({ level: 3 }, '247a4068296e8be42890143f451b4b45', 0, '121811173a614534e8720d7550aae253'), // BasicFeatSelection -> ShieldBashFeature
    pick({ level: 4 }, 'b8bf3d5023f2d8c428fdf6438cecaea7', 0, '585f02be2202e1f4289e04e84cd787e5'), // ArcanistExploitSelection -> ArcanistExploitArmoredMaskFeature
    pick({ level: 5 }, '247a4068296e8be42890143f451b4b45', 0, '422dab7309e1ad343935f33a4d6e9f11'), // BasicFeatSelection -> Outflank
    pick({ level: 6 }, '43d1b15873e926848be2abf0ea3ad9a8', 0, '61f82ba786fe05643beb3cd3910233a8'), // SlayerTalentSelection6 -> RangerStyleSelection6
    pick({ level: 6 }, '61f82ba786fe05643beb3cd3910233a8', 0, 'a9998f05a0472bb4f8950304fe26ec0c'), // RangerStyleSelection6 -> RangerStyleMenacingSelection6
    pick({ level: 6 }, 'a9998f05a0472bb4f8950304fe26ec0c', 0, '61a17ccbbb3d79445b0926347ec07577'), // RangerStyleMenacingSelection6 -> ShatterDefenses
    pick({ rank: 1 }, '1421e0034a3afac458de08648d06faf0', 0, '11ba180ac736c894e937602e54f7320c'), // FirstAscensionSelection -> TricksterFirstLevelsProgression
    pick({ rank: 1 }, 'ba0e5a900b775be4a99702f1ed08914d', 0, 'ec041312142ba1f48a0044521f68fc0a'), // MythicAbilitySelection -> DefensiveStudy
    pick({ level: 7 }, 'b8bf3d5023f2d8c428fdf6438cecaea7', 0, '687f9c86f8afea34097d84569b5abd07'), // ArcanistExploitSelection -> ArcanistExploitDimensionalSlideFeature
    pick({ level: 7 }, '247a4068296e8be42890143f451b4b45', 0, '0f8939ae6f220984e8fb568abbdfba95'), // BasicFeatSelection -> CombatReflexes
    pick({ rank: 2 }, '9ee0f6745f555484299b0a1563b99d81', 0, 'c6afbb8c1a36a704a8041f35498f41a4'), // MythicFeatSelection -> TwoWeaponFightingMythicFeat
    pick({ level: 8 }, '43d1b15873e926848be2abf0ea3ad9a8', 0, 'ca5274d057152fa45b7527cad0927840'), // SlayerTalentSelection6 -> UncannyDodgeTalent
    pick({ level: 9 }, '247a4068296e8be42890143f451b4b45', 0, 'f4201c85a991369408740c6888362e20', BATTLE_AXE), // BasicFeatSelection -> ImprovedCritical
    pick({ rank: 3 }, 'ba0e5a900b775be4a99702f1ed08914d', 0, 'ffa9a8b8ea27b2a48b3638e20673a687'), // MythicAbilitySelection -> InspirationalLeaderFeature
    pick({ level: 10 }, 'b8bf3d5023f2d8c428fdf6438cecaea7', 0, '72d6f0a1d508738419b90f90ad1258fb'), // ArcanistExploitSelection -> ArcanistExploitSpellResistanceFeature
    pick({ level: 11 }, '247a4068296e8be42890143f451b4b45', 0, 'dbec636d84482944f87435bd31522fcc'), // BasicFeatSelection -> ShieldMaster
    pick({ rank: 4 }, '9ee0f6745f555484299b0a1563b99d81', 0, '8bc0190a4ec04bd489eec290aeaa6d07', BATTLE_AXE), // MythicFeatSelection -> ImprovedCriticalMythicFeat
    pick({ rank: 4 }, '8a30e92cd04ff5b459ba7cb03584fda0', 0, 'eef8d23a7e4acfe4d834a5de844c8c7c'), // AzataSuperpowersSelection -> IncredibleMightFeature
    pick({ level: 12 }, '913b9cf25c9536949b43a2651b7ffb66', 0, '78177315fc63b474ea3cbb8df38fafcd'), // SlayerTalentSelection10 -> RangerStyleSelection10
    pick({ level: 12 }, '78177315fc63b474ea3cbb8df38fafcd', 0, '7d5bd07830a5e2c478852bf8b860db2c'), // RangerStyleSelection10 -> RangerStyleMenacingSelection10
    pick({ level: 12 }, '7d5bd07830a5e2c478852bf8b860db2c', 0, 'fc37b70e3d064a147a3a99db4a86ee12'), // RangerStyleMenacingSelection10 -> DreadfulCarnage
    pick({ level: 13 }, 'b8bf3d5023f2d8c428fdf6438cecaea7', 0, '1eba9b432ef464349befcc7f5c428849'), // ArcanistExploitSelection -> ArcanistExploitGreaterSpellResistanceFeature
    pick({ level: 13 }, '247a4068296e8be42890143f451b4b45', 0, '9af88f3ed8a017b45a6837eab7437629'), // BasicFeatSelection -> TwoWeaponFightingImproved
    pick({ level: 14 }, '913b9cf25c9536949b43a2651b7ffb66', 0, 'b696bd7cb38da194fa3404032483d1db'), // SlayerTalentSelection10 -> CripplingStrike
    pick({ rank: 5 }, 'ba0e5a900b775be4a99702f1ed08914d', 0, 'c3ef5076c0feb3c4f90c229714e62cd0'), // MythicAbilitySelection -> ArchmageArmor
    pick({ level: 15 }, '247a4068296e8be42890143f451b4b45', 0, '797f25d709f559546b29e7bcb181cc74'), // BasicFeatSelection -> Improved Initiative
    pick({ rank: 6 }, '9ee0f6745f555484299b0a1563b99d81', 0, '25f4cb387ba4ab94d944fdef3da9ab97'), // MythicFeatSelection -> ImprovedInitiativeMythicFeat
    pick({ rank: 6 }, '8a30e92cd04ff5b459ba7cb03584fda0', 0, 'cfad18f581584ac4ba066df067956477'), // AzataSuperpowersSelection -> LifeBondingFriendshipSelection
    pick({ rank: 6 }, 'cfad18f581584ac4ba066df067956477', 0, '8976de442862f82488a4b138a0a89907'), // LifeBondingFriendshipSelection -> ShieldWall
    pick({ rank: 7 }, 'ba0e5a900b775be4a99702f1ed08914d', 0, '2f206e6d292bdfb4d981e99dcf08153f'), // MythicAbilitySelection -> EnduringSpells
    pick({ rank: 7 }, '69a33d6ced23446e819667149d088898', 0, '6337b37f2a7c11b4ab0831d6780bce2a'), // LifeBondingFriendshipSelection1 -> ShakeItOff
    pick({ rank: 8 }, '9ee0f6745f555484299b0a1563b99d81', 0, '8a6a511c55e67d04db328cc49aaad2b8'), // MythicFeatSelection -> ExtraMythicAbilityMythicFeat
    pick({ rank: 8 }, '8a6a511c55e67d04db328cc49aaad2b8', 0, '13f9269b3b48ae94c896f0371ce5e23c'), // ExtraMythicAbilityMythicFeat -> EnduringSpellsGreater
    pick({ rank: 8 }, '8a30e92cd04ff5b459ba7cb03584fda0', 0, '40c43d4d27ebde647b796f9faf4f0299'), // AzataSuperpowersSelection -> MarvelousEnduranceFeature
    pick({ level: 17 }, '290bbcc3c3bb92144b853fd8fb8ff452', 0, '9af6dc2697c8ef24eab8ce1c697b05c4'), // SylvanTricksterTalentSelection -> WitchHexIceplantFeature
    pick({ level: 17 }, '247a4068296e8be42890143f451b4b45', 0, '0b442a7b4aa598d4e912a4ecee0500ff'), // BasicFeatSelection -> BashingFinish
    pick({ level: 18 }, 'b78d146cea711a84598f0acef69462ea', 0, 'bbe497b750f698c4eb99bcf97240a0d1'), // FinesseTrainingSelection -> FinesseTrainingLightShield
    pick({ rank: 9 }, 'ba0e5a900b775be4a99702f1ed08914d', 0, '8161528d5b98b3e4a8a6a0ed327c3b6a'), // MythicAbilitySelection -> EverReady
    pick({ level: 19 }, '290bbcc3c3bb92144b853fd8fb8ff452', 0, 'dd699394df0ef8847abba26038333f02'), // SylvanTricksterTalentSelection -> DoubleDebilitation
    pick({ level: 19 }, '247a4068296e8be42890143f451b4b45', 0, 'c126adbdf6ddd8245bda33694cd774e8'), // BasicFeatSelection -> TwoWeaponFightingGreater
    pick({ level: 20 }, '41c8486641f7d6d4283ca9dae4147a9f', 0, 'ac57069b6bf8c904086171683992a92a'), // FighterFeatSelection -> ShieldFocus
    pick({ rank: 10 }, '9ee0f6745f555484299b0a1563b99d81', 0, '502434c044c16304a92901a0b25d5216'), // MythicFeatSelection -> ShieldFocusMythicFeat
    pick({ rank: 10 }, '8a30e92cd04ff5b459ba7cb03584fda0', 0, '505456aa17dd18a4e8bd8172811a4fdc'), // AzataSuperpowersSelection -> SupersonicSpeedFeature
  ],
};

const AE = 'Arcane Enforcer';
const ST = 'Sylvan Trickster';
const STUDIED = '09bdd9445ac38044389476689ae8d5a1'; // SlayerStudyTargetFeature
const SNEAK = '9b9eac6709e1c084cb18c3a366e0ec87'; // SneakAttack

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
        facts('Studied Target +1', STUDIED),
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
      lines: [facts('+1d6 sneak', SNEAK), facts('Shield Bash', '121811173a614534e8720d7550aae253')],
    },
    {
      place: { level: 4 },
      class: AE,
      lines: [facts('Armored Mask', '585f02be2202e1f4289e04e84cd787e5'), increase('+1 Strength', 'Strength')],
    },
    {
      place: { level: 5 },
      class: AE,
      lines: [facts('Studied Target +2', STUDIED), facts('Outflank', '422dab7309e1ad343935f33a4d6e9f11')],
    },
    {
      place: { level: 6 },
      class: AE,
      lines: [
        facts('+1d6 sneak', SNEAK),
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
        facts('+1d6 sneak', SNEAK),
        withParam('Improved Critical - Battleaxe', 'f4201c85a991369408740c6888362e20', BATTLE_AXE),
      ],
    },
    {
      place: { level: 10 },
      class: AE,
      lines: [facts('Studied Target +3', STUDIED), facts('Spell Resistance', '72d6f0a1d508738419b90f90ad1258fb')],
    },
    { place: { level: 11 }, class: AE, lines: [facts('Shield Master', 'dbec636d84482944f87435bd31522fcc')] },
    {
      place: { level: 12 },
      class: AE,
      lines: [
        facts('+1d6 sneak', SNEAK),
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
        facts('Studied Target +4', STUDIED),
        facts('+1d6 sneak', SNEAK),
        facts('Improved Initiative', '797f25d709f559546b29e7bcb181cc74'),
      ],
    },
    {
      place: { level: 16 },
      class: ST,
      lines: [
        facts('Weapon Finesse', '90e54424d682d104ab36436bd527af09'),
        facts('Trapfinding', 'dbb6b3bffe6db3547b31c3711653838e'),
        facts('+1d6 sneak', SNEAK),
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
        facts('+1d6 sneak', SNEAK),
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
