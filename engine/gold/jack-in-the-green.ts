import type { Build, LevelUp } from '../build';
import { facts, increase, pick, second, withParam, type Gold } from './gold';

const SORCERER = 'b3a505fb61437dc4097f43c3f8f9a4cf';
const MYTHIC_HERO = '247aa787806d5da4f89cfc3dff0b217f';
const AZATA = '9a3b2c63afa79744cbca46bea0da9a16';
const EXPECTED = [6, 7, 9, 11, 14, 15, 16, 17, 17, 19];
const HALFLING_RACE = 'b0c3ef2729c498f47970bb50fa1acd30';
const SYLVAN_SORCERER_ARCHETYPE = '711d5024ecc75f346b9cda609c3a1f83';
const HALFLING_HERITAGE_SELECTION = 'b3bebe76e6c64e2ca11585f9e3e2554a';
const HASTY_HALFLING = 'f2570b5becc54d659ca786488d107e69';
const BACKGROUNDS_BASE_SELECTION = 'f926dabeee7f8a54db8f2010b323383c';
const BACKGROUNDS_REGIONAL_SELECTION = 'fa621a249cc836f4382ca413b976e65e';
const BACKGROUND_WARRIOR_OF_THE_LINNORM_KINGS = '494c972a8e7626749aeda25582e2e88f';
const DEITY_SELECTION = '59e7a76987fe3b547b9cce045f4db3e4';
const ATHEISM_FEATURE = '92c0d2da0a836ce418a267093c09ca54';
const ANIMAL_COMPANION_SELECTION_SYLVAN_SORCERER = 'a540d7dfe1e2a174a94198aba037274c';
const ANIMAL_COMPANION_FEATURE_ELK = 'aa92fea676be33d4dafd176d699d7996';
const SORCERER_BONUS_FEAT = 'd6dd06f454b34014ab0903cb1ed2ade3';
const SPELL_PENETRATION = 'ee7dc126939e4d9438357fbd5980d459';
const BASIC_FEAT_SELECTION = '247a4068296e8be42890143f451b4b45';
const MOUNTED_COMBAT = 'f308a03bea0d69843a8ed0af003d47a9';
const BOLSTERED_SPELL_FEAT = 'fbf5d9ce931f47f3a0c818b3f8ef8414';
const SPELL_FOCUS = '16fa59cc9a72a6043b566b49184f53fe';
const FIRST_ASCENSION_SELECTION = '1421e0034a3afac458de08648d06faf0';
const AZATA_FIRST_LEVELS_PROGRESSION = '132afc1a28bd9d442821385f7cbf1c05';
const MYTHIC_ABILITY_SELECTION = 'ba0e5a900b775be4a99702f1ed08914d';
const SECOND_BLOODLINE = '3cf2ab2c320b73347a7c21cf0d0995bd';
const BLOODLINE_DRACONIC_BRONZE_PROGRESSION = '7e0f57d8d00464441974e303b84238ac';
const MYTHIC_FEAT_SELECTION = '9ee0f6745f555484299b0a1563b99d81';
const EXTRA_MYTHIC_ABILITY_MYTHIC_FEAT = '8a6a511c55e67d04db328cc49aaad2b8';
const ABUNDANT_CASTING = 'cf594fa8871332a4ba861c6002480ec2';
const SORCERER_FEAT_SELECTION = '3a60f0c0442acfb419b0c03b584e1394';
const BLOODLINE_DRACONIC_FEAT_SELECTION = 'f4b011d090e8ae543b1441bd594c7bf7';
const SKILL_FOCUS_ACROBATICS = '52dd89af385466c499338b7297896ded';
const HEIGHTEN_SPELL_FEAT = '2f5d1e705c7967546b72ad8218ccf99c';
const OUTFLANK = '422dab7309e1ad343935f33a4d6e9f11';
const ASCENDANT_ELEMENT_SELECTION = '535d4e5d8a5664f4797560c280941782';
const ASCENDANT_ELEMENT_ELECTRICITY = '7bf39f8d76f8c9441896222128f1673a';
const SPELL_SPECIALIZATION_FIRST = 'f327a765a4353d04f872482ef3e48c35';
const AZATA_SUPERPOWERS_SELECTION = '8a30e92cd04ff5b459ba7cb03584fda0';
const ZIPPY_MAGIC_FEATURE = '30b4200f897ba25419ba3a292aed4053';
const SPELL_PENETRATION_MYTHIC_FEAT = '51b6b22ff184eef46a675449e837365d';
const IMPROVED_INITIATIVE = '797f25d709f559546b29e7bcb181cc74';
const GREATER_SPELL_PENETRATION = '1978c3f91cfbbc24b9c9b0d017f4beec';
const ABUNDANT_CASTING_IMPROVED = '37046a54739ed4844b8e8307bbbeece2';
const SPELL_FOCUS_GREATER = '5b04b45b228461c43bad768eb0f7c7bf';
const LIFE_BONDING_FRIENDSHIP_SELECTION = 'cfad18f581584ac4ba066df067956477';
const SHAKE_IT_OFF = '6337b37f2a7c11b4ab0831d6780bce2a';
const EXPANDED_ARSENAL_SCHOOL = 'f137089c48364014aa3ec3b92ccaf2e2';
const LIFE_BONDING_FRIENDSHIP_SELECTION_1 = '69a33d6ced23446e819667149d088898';
const ALLIED_SPELLCASTER = '9093ceeefe9b84746a5993d619d7c86f';
const MYTHICAL_BEAST_MASTER = '89096871a6fdadd43ad31f5046696727';
const INDOMITABLE_MOUNT = '68e814f1f3ce55942a52c1dd536eaa5b';
const FAVORABLE_MAGIC_FEATURE = 'afcee6925a6eadf43820d12e0d966ebe';
const SPELL_FOCUS_MYTHIC_FEAT = '41fa2470ab50ff441b4cfbb2fc725109';
const ABUNDANT_CASTING_GREATER = 'db5be78901afbfa4e8ea5b399a88b92d';
const GREAT_FORTITUDE = '79042cb55f030614ea29956177977c52';
const ELEMENTAL_FOCUS_SELECTION = 'bb24cc01319528849b09a3ae8eec0b31';
const ELEMENTAL_FOCUS_ELECTRICITY = 'd439691f37d17804890bd9c263ae1e80';
const MARVELOUS_ENDURANCE_FEATURE = '40c43d4d27ebde647b796f9faf4f0299';
const SORCEROUS_REFLEX_MYTHIC_FEAT = 'f6f9f99993f9a92438bd4ffbfbb71837';

const level = (n: number): LevelUp => ({
  class: SORCERER,
  ...(n % 4 === 0 && { increase: 'Charisma' as const }),
  skills:
    n % 2 === 1
      ? { SkillMobility: 1, SkillPersuasion: 1, SkillUseMagicDevice: 1 }
      : { SkillMobility: 1, SkillPersuasion: 1 },
});

const build: Build = {
  race: HALFLING_RACE,
  alignment: 'ChaoticGood',
  scores: { Strength: 12, Dexterity: 14, Constitution: 14, Intelligence: 12, Wisdom: 8, Charisma: 17 },
  classChoices: { [SORCERER]: { archetypes: [SYLVAN_SORCERER_ARCHETYPE] } },
  levels: Array.from({ length: 20 }, (_, i) => level(i + 1)),
  ranks: EXPECTED.map((at, i) => ({ class: i < 2 ? MYTHIC_HERO : AZATA, level: at })),
  picks: [
    pick({ level: 1 }, HALFLING_HERITAGE_SELECTION, 0, HASTY_HALFLING),
    pick({ level: 1 }, BACKGROUNDS_BASE_SELECTION, 0, BACKGROUNDS_REGIONAL_SELECTION),
    pick({ level: 1 }, BACKGROUNDS_REGIONAL_SELECTION, 0, BACKGROUND_WARRIOR_OF_THE_LINNORM_KINGS),
    pick({ level: 1 }, DEITY_SELECTION, 0, ATHEISM_FEATURE),
    pick({ level: 1 }, ANIMAL_COMPANION_SELECTION_SYLVAN_SORCERER, 0, ANIMAL_COMPANION_FEATURE_ELK),
    pick({ level: 1 }, SORCERER_BONUS_FEAT, 0, SPELL_PENETRATION),
    pick({ level: 1 }, BASIC_FEAT_SELECTION, 0, MOUNTED_COMBAT),
    pick({ level: 3 }, BASIC_FEAT_SELECTION, 0, BOLSTERED_SPELL_FEAT),
    pick({ level: 5 }, BASIC_FEAT_SELECTION, 0, SPELL_FOCUS, {
      SpellSchool: 'Evocation',
    }),
    pick({ rank: 1 }, FIRST_ASCENSION_SELECTION, 0, AZATA_FIRST_LEVELS_PROGRESSION),
    pick({ rank: 1 }, MYTHIC_ABILITY_SELECTION, 0, SECOND_BLOODLINE),
    pick({ rank: 1 }, SECOND_BLOODLINE, 0, BLOODLINE_DRACONIC_BRONZE_PROGRESSION),
    pick({ rank: 2 }, MYTHIC_FEAT_SELECTION, 0, EXTRA_MYTHIC_ABILITY_MYTHIC_FEAT),
    pick({ rank: 2 }, EXTRA_MYTHIC_ABILITY_MYTHIC_FEAT, 0, ABUNDANT_CASTING),
    pick({ level: 7 }, SORCERER_FEAT_SELECTION, 0, BLOODLINE_DRACONIC_FEAT_SELECTION),
    pick({ level: 7 }, BLOODLINE_DRACONIC_FEAT_SELECTION, 0, SKILL_FOCUS_ACROBATICS),
    pick({ level: 7 }, BASIC_FEAT_SELECTION, 0, HEIGHTEN_SPELL_FEAT),
    pick({ level: 9 }, BASIC_FEAT_SELECTION, 0, OUTFLANK),
    pick({ rank: 3 }, MYTHIC_ABILITY_SELECTION, 0, ASCENDANT_ELEMENT_SELECTION),
    pick({ rank: 3 }, ASCENDANT_ELEMENT_SELECTION, 0, ASCENDANT_ELEMENT_ELECTRICITY),
    pick({ level: 11 }, BASIC_FEAT_SELECTION, 0, SPELL_SPECIALIZATION_FIRST),
    pick({ rank: 4 }, AZATA_SUPERPOWERS_SELECTION, 0, ZIPPY_MAGIC_FEATURE),
    pick({ rank: 4 }, MYTHIC_FEAT_SELECTION, 0, SPELL_PENETRATION_MYTHIC_FEAT),
    pick({ level: 13 }, SORCERER_FEAT_SELECTION, 0, BLOODLINE_DRACONIC_FEAT_SELECTION),
    pick({ level: 13 }, BLOODLINE_DRACONIC_FEAT_SELECTION, 0, IMPROVED_INITIATIVE),
    pick({ level: 13 }, BASIC_FEAT_SELECTION, 0, GREATER_SPELL_PENETRATION),
    pick({ rank: 5 }, MYTHIC_ABILITY_SELECTION, 0, ABUNDANT_CASTING_IMPROVED),
    pick({ level: 15 }, BASIC_FEAT_SELECTION, 0, SPELL_FOCUS_GREATER, {
      SpellSchool: 'Evocation',
    }),
    pick({ rank: 6 }, AZATA_SUPERPOWERS_SELECTION, 0, LIFE_BONDING_FRIENDSHIP_SELECTION),
    pick({ rank: 6 }, LIFE_BONDING_FRIENDSHIP_SELECTION, 0, SHAKE_IT_OFF),
    pick({ rank: 6 }, MYTHIC_FEAT_SELECTION, 0, EXPANDED_ARSENAL_SCHOOL, {
      SpellSchool: 'Enchantment',
    }),
    pick({ rank: 7 }, LIFE_BONDING_FRIENDSHIP_SELECTION_1, 0, ALLIED_SPELLCASTER),
    pick({ rank: 7 }, MYTHIC_ABILITY_SELECTION, 0, MYTHICAL_BEAST_MASTER),
    pick({ level: 17 }, BASIC_FEAT_SELECTION, 0, INDOMITABLE_MOUNT),
    pick({ rank: 8 }, AZATA_SUPERPOWERS_SELECTION, 0, FAVORABLE_MAGIC_FEATURE),
    pick({ rank: 8 }, MYTHIC_FEAT_SELECTION, 0, SPELL_FOCUS_MYTHIC_FEAT, {
      SpellSchool: 'Evocation',
    }),
    pick({ rank: 9 }, MYTHIC_ABILITY_SELECTION, 0, ABUNDANT_CASTING_GREATER),
    pick({ level: 19 }, SORCERER_FEAT_SELECTION, 0, BLOODLINE_DRACONIC_FEAT_SELECTION),
    pick({ level: 19 }, BLOODLINE_DRACONIC_FEAT_SELECTION, 0, GREAT_FORTITUDE),
    pick({ level: 19 }, BASIC_FEAT_SELECTION, 0, ELEMENTAL_FOCUS_SELECTION),
    pick({ level: 19 }, ELEMENTAL_FOCUS_SELECTION, 0, ELEMENTAL_FOCUS_ELECTRICITY),
    pick({ rank: 10 }, AZATA_SUPERPOWERS_SELECTION, 0, MARVELOUS_ENDURANCE_FEATURE),
    pick({ rank: 10 }, MYTHIC_FEAT_SELECTION, 0, SORCEROUS_REFLEX_MYTHIC_FEAT),
  ],
};

const S = 'Sylvan Sorcerer';

export const jackInTheGreen: Gold = {
  name: 'Jack-in-the-Green',
  build,
  start: {
    race: 'Halfling',
    background: 'Warrior of the Linnorm Kings',
    attributes: { Strength: 10, Dexterity: 16, Constitution: 14, Intelligence: 12, Wisdom: 8, Charisma: 19 },
    skills: ['SkillMobility', 'SkillPersuasion', 'SkillUseMagicDevice'],
    alignments: ['ChaoticNeutral', 'ChaoticGood', 'NeutralGood'],
  },
  places: [
    {
      place: { level: 1 },
      class: S,
      lines: [
        facts('Animal Companion - Elk', 'aa92fea676be33d4dafd176d699d7996'),
        second(
          '(Draconic Bloodline Arcana; Grow Claws)',
          '677ae97f60d26474bbc24a50520f9424',
          'fb1a5347f7188b740a125daa28704c31',
        ),
        facts('Spell Penetration', 'ee7dc126939e4d9438357fbd5980d459'),
        facts('Mounted Combat', 'f308a03bea0d69843a8ed0af003d47a9'),
      ],
    },
    { place: { level: 2 }, class: S, lines: [] },
    {
      place: { level: 3 },
      class: S,
      lines: [
        facts('Woodland Stride', '11f4072ea766a5840a46e6660894527d'),
        second('(Dragon Resistances I)', '920ae03f1b4ed1b4bb5217099103e54a'),
        facts('Entangle', '058554b14b5845f4985bb1fc5b85bfff'),
        second('(Mage Armor)', '7d6a30b40a950434ba19b9561e81313b'),
        facts('Metamagic (Bolstered)', 'fbf5d9ce931f47f3a0c818b3f8ef8414'),
      ],
    },
    { place: { level: 4 }, class: S, lines: [increase('Charisma +1', 'Charisma')] },
    {
      place: { level: 5 },
      class: S,
      lines: [
        facts('Hideous Laughter', 'b90d5afdf3f1f8f448474de8d078b67e'),
        second('(Resist Electricity)', '1d3fcbb51257dd6448a48db489cdd3ad'),
        withParam('Spell Focus - Evocation', '16fa59cc9a72a6043b566b49184f53fe', { SpellSchool: 'Evocation' }),
      ],
    },
    { place: { level: 6 }, class: S, lines: [] },
    {
      place: { level: 7 },
      class: S,
      lines: [
        facts('Deep Slumber', '512923c9bed17fb45abbdf8672caa7b5'),
        second('(Dispel Magic)', '606cdd9198fb270429ab6dce1a6b14f1'),
        facts('Skill Focus (Mobility)', '52dd89af385466c499338b7297896ded'),
        facts('Metamagic (Heighten)', '2f5d1e705c7967546b72ad8218ccf99c'),
      ],
    },
    { place: { level: 8 }, class: S, lines: [increase('Charisma +1', 'Charisma')] },
    {
      place: { level: 9 },
      class: S,
      lines: [
        facts('Fleeting Glance', '9d67add74ffa4934aa638c2d9b573336'),
        second('(Dragon Resistances II)', '57b9d5a7cce17b846a9a1b6ec4b73648'),
        facts('Poison', 'e7aec99942280534ea1a59805218571c'),
        second('(Fear)', '0fbdfba2f12527a49982d790a056d14b'),
        facts('Outflank', '422dab7309e1ad343935f33a4d6e9f11'),
      ],
    },
    { place: { level: 10 }, class: S, lines: [] },
    {
      place: { level: 11 },
      class: S,
      lines: [
        facts('Vinetrap', 'dbd31f54340bff5488da32711a58cbe2'),
        second('(Spell Resistance)', '2386614435b923a4397a41e1d112eca9'),
        facts('Spell Specialization', 'f327a765a4353d04f872482ef3e48c35'),
      ],
    },
    { place: { level: 12 }, class: S, lines: [increase('Charisma +1', 'Charisma')] },
    {
      place: { level: 13 },
      class: S,
      lines: [
        facts('Dispel Magic, Greater', 'ee79528fc9614884687738c6dd114869'),
        second('(Dragonkind I)', 'b10c54491148de84b858763588664a8a'),
        facts('Improved Initiative', '797f25d709f559546b29e7bcb181cc74'),
        facts('Greater Spell Penetration', '1978c3f91cfbbc24b9c9b0d017f4beec'),
      ],
    },
    { place: { level: 14 }, class: S, lines: [] },
    {
      place: { level: 15 },
      class: S,
      lines: [
        facts('Fey Magic', 'a9ffe3e08a080c8478bae321e70c7de6'),
        second(
          '(Dragon Resistances III; Wings)',
          '2698841e4b5974e4f94968d61cf64b2f',
          'ed71d51317d79d24ebe172cd9107e695',
        ),
        facts('Changestaff', '0ad64544a23a9f54abb0917085e35d92'),
        second('(Dragonkind II)', '5b13008bdc18a0c4db321ae9f04ba77f'),
        withParam('Greater Spell Focus - Evocation', '5b04b45b228461c43bad768eb0f7c7bf', { SpellSchool: 'Evocation' }),
      ],
    },
    { place: { level: 16 }, class: S, lines: [increase('Charisma +1', 'Charisma')] },
    {
      place: { level: 17 },
      class: S,
      lines: [
        facts('Summon Nereid', '4a9a759a627a62541bea02a75017328a'),
        second('(Dragonkind III)', 'a5e3c6ee70f04c6489fd0bac3582db74'),
        facts('Indomitable Mount', '68e814f1f3ce55942a52c1dd536eaa5b'),
      ],
    },
    { place: { level: 18 }, class: S, lines: [] },
    {
      place: { level: 19 },
      class: S,
      lines: [
        facts('Summon Hamadryad', 'c6d25830bf5c1cc47bd48cf47f363d29'),
        second('(Overwhelming Presence)', '32d443e6a4103d84b9243822c3abec97'),
        facts('Great Fortitude', '79042cb55f030614ea29956177977c52'),
        facts('Elemental Focus - Electricity', 'bb24cc01319528849b09a3ae8eec0b31', 'd439691f37d17804890bd9c263ae1e80'),
      ],
    },
    {
      place: { level: 20 },
      class: S,
      lines: [
        facts(
          'Soul of the Fey (Power of Wyrms)',
          '6dba3a0ba5a32c645ba07bcc17873682',
          'd81844b1f549df1418ccc40ccca3274a',
        ),
        increase('Charisma +1', 'Charisma'),
      ],
    },
    {
      place: { rank: 1 },
      class: 'Mythic Hero',
      lines: [
        facts('Bypass Epic DR', 'c60933cc085132b49970cbc4a4b8338f'),
        facts('Instrument of Freedom', '132afc1a28bd9d442821385f7cbf1c05'),
        facts(
          'Second Bloodline - Bronze Dragon',
          '3cf2ab2c320b73347a7c21cf0d0995bd',
          '7e0f57d8d00464441974e303b84238ac',
        ),
      ],
    },
    {
      place: { rank: 2 },
      class: 'Mythic Hero',
      lines: [
        facts('Hard to Kill', 'bef12729fa3f9b34488634f61751e295'),
        facts("Freedom's Child", '164511ae9ccec854b94b5def9d9cf0e8'),
        facts('Summon Azata Bralani', '62ece3b9b2126a44faa276bbb5bd1014'),
        facts(
          'Extra Mythic Ability - Abundant Casting',
          '8a6a511c55e67d04db328cc49aaad2b8',
          'cf594fa8871332a4ba861c6002480ec2',
        ),
      ],
    },
    {
      place: { rank: 3 },
      class: 'Azata',
      lines: [
        facts('Dragon Companion', 'cf36f23d60987224696f03be70351928'),
        facts('Song of Heroic Resolve', '90185ba04ff485845bbac7512e2c3c73'),
        facts('Summon Mastodon', '6190d39083ffc6b4386f86ac73a47e1f'),
        facts('Ascendant Element - Electricity', '7bf39f8d76f8c9441896222128f1673a'),
      ],
    },
    {
      place: { rank: 4 },
      class: 'Azata',
      lines: [
        facts('Summon Movanic Deva', 'd779bcb070a85ec47a49a2723b00f79f'),
        facts('Zippy Magic', '30b4200f897ba25419ba3a292aed4053'),
        facts('Spell Penetration (Mythic)', '51b6b22ff184eef46a675449e837365d'),
      ],
    },
    {
      place: { rank: 5 },
      class: 'Azata',
      lines: [
        facts('Song of Broken Chains', '31a8a71445f21a044b01eb877b8540db'),
        facts('Summon Azata Ghael', '60d146d694f1d9142b8a48e977c8e3b4'),
        facts('Improved Abundant Casting', '37046a54739ed4844b8e8307bbbeece2'),
      ],
    },
    {
      place: { rank: 6 },
      class: 'Azata',
      lines: [
        facts('Song of Defiance', 'c2be02bc2014d4c4cbaf7c442a7f076f'),
        facts('Summon Astral Deva', 'edc2d236d6993814fb4f09fb8d2b6c17'),
        facts(
          'Life-Bonding Friendship (Shake It Off)',
          'cfad18f581584ac4ba066df067956477',
          '6337b37f2a7c11b4ab0831d6780bce2a',
        ),
        withParam('Expanded Arsenal - Enchantment', 'f137089c48364014aa3ec3b92ccaf2e2', { SpellSchool: 'Enchantment' }),
      ],
    },
    {
      place: { rank: 7 },
      class: 'Azata',
      lines: [
        facts('Song of Courageous Defender', 'a1dd79df6909b0142915a3a88df4837d'),
        facts('Summon Astral Devas', 'ab8e798732dc2284eb7ae2b1c48b09c6'),
        facts(
          'Life-Bonding Friendship (Allied Spellcaster)',
          '69a33d6ced23446e819667149d088898',
          '9093ceeefe9b84746a5993d619d7c86f',
        ),
        facts('Mythical Beast', '89096871a6fdadd43ad31f5046696727'),
      ],
    },
    {
      place: { rank: 8 },
      class: 'Azata',
      lines: [
        facts('Summon Azata Ghaels and Astral Devas', 'b4ce3e07c9d974f4fa748af0e8a0a77b'),
        facts('Favorable Magic', 'afcee6925a6eadf43820d12e0d966ebe'),
        withParam('Spell Focus (Mythic) - Evocation', '41fa2470ab50ff441b4cfbb2fc725109', { SpellSchool: 'Evocation' }),
      ],
    },
    {
      place: { rank: 9 },
      class: 'Azata',
      lines: [
        facts('Summon Hamadryads', '8403a6cec131de949b42cfa329963736'),
        facts('Greater Abundant Casting', 'db5be78901afbfa4e8ea5b399a88b92d'),
      ],
    },
    {
      place: { rank: 10 },
      class: 'Azata',
      lines: [
        facts('Marvelous Endurance', '40c43d4d27ebde647b796f9faf4f0299'),
        facts('Sorcerous Reflex', 'f6f9f99993f9a92438bd4ffbfbb71837'),
      ],
    },
  ],
};
