// ADR 0002's marking (ticket 03c): under the Gear opt-in, a choice the game allows only because of the Gear is marked
// with the worn items whose bonus it needs, a later choice resting on it is marked with the same items, and class
// choices are marked like feats (Walker.markGearDependent). Real data, cited by blueprint, and hand-built data.
import { describe, expect, it } from 'vitest';
import { placeKey, type Build, type Pick } from '../build';
import type { BlueprintArchetype, BlueprintCharacterClass } from '../data/types';
import {
  BASIC_FEAT_SELECTION,
  build,
  CHA_HEADBAND,
  data,
  DEX_BELT,
  DODGE,
  feature,
  FIGHTER,
  FIGHTER_FEAT_SELECTION,
  G,
  levels,
  needsFact,
  needsStat,
  scores,
  withBlueprints,
  withOptions,
} from './test-data';
import { walk, type Walk } from './walk';

const MYTHIC_HERO = '247aa787806d5da4f89cfc3dff0b217f';
const MYTHIC_FEAT_SELECTION = '9ee0f6745f555484299b0a1563b99d81';
const DODGE_MYTHIC = '3812d9ca1377c014c97fb3ac421ba9e6';
const STALWART_DEFENDER = 'd5917881586ff1d4d96d5b7cebda9464';
const SORCERER = 'b3a505fb61437dc4097f43c3f8f9a4cf';
const TOUGHNESS = 'd09b20029e9abfe4480b356c92095623';
const ENDURANCE = '54ee847996c25cd4ba8773d7b8555174';
const BOTH = { Belt: DEX_BELT, Head: CHA_HEADBAND };

const at = (level: number, selection: string, f: string, index = 0): Pick => ({
  slot: { place: { level }, selection, index },
  feature: f,
});
const marked = (w: Walk) =>
  w.gearDependent.map((d) => `${placeKey(d.place)} ${d.choice} ${d.subject} ${d.items.join(',')}`);

describe('ADR 0002: what a choice needs of the Gear', () => {
  it('marks a pick with the item that raises the score it reads, only when the score falls short without it', () => {
    // Dodge 97e216dbb46ae3c4faef90cf6bbe6fd5 needs Dexterity 13. BeltOfDexterity2 b6af4c1834999e74497b41588d1071cd
    // gives Dexterity +2 and HeadbandOfCharisma2 a3e8e907908ca7a40ac6da78e70bf33d Charisma +2: only the belt is marked.
    const dodge = (dex: number) =>
      walk(
        data,
        build({
          scores: scores({ Dexterity: dex }),
          levels: levels(FIGHTER, 1),
          gear: BOTH,
          countGear: true,
          picks: [at(1, FIGHTER_FEAT_SELECTION, DODGE)],
        }),
        G,
      );
    expect(marked(dodge(12))).toEqual([`L1 pick ${DODGE} ${DEX_BELT}`]);
    expect(marked(dodge(13))).toEqual([]);
  });

  it('marks a later pick that rests on a gear-dependent pick with its items', () => {
    // DodgeMythicFeat 3812d9ca1377c014c97fb3ac421ba9e6 needs only Dodge (PrerequisiteFeature), taken at M2 in
    // MythicFeatSelection 9ee0f6745f555484299b0a1563b99d81.
    const w = walk(
      data,
      build({
        scores: scores({ Dexterity: 12 }),
        levels: levels(FIGHTER, 2),
        ranks: [
          { class: MYTHIC_HERO, level: 2 },
          { class: MYTHIC_HERO, level: 2 },
        ],
        gear: BOTH,
        countGear: true,
        picks: [
          at(1, FIGHTER_FEAT_SELECTION, DODGE),
          { slot: { place: { rank: 2 }, selection: MYTHIC_FEAT_SELECTION, index: 0 }, feature: DODGE_MYTHIC },
        ],
      }),
      G,
    );
    expect(w.failures.filter((f) => f.choice === 'pick')).toEqual([]);
    expect(marked(w)).toEqual([`L1 pick ${DODGE} ${DEX_BELT}`, `M2 pick ${DODGE_MYTHIC} ${DEX_BELT}`]);
  });

  it('marks a class level whose prerequisites rest on a gear-dependent pick', () => {
    // StalwartDefenderClass d5917881586ff1d4d96d5b7cebda9464 needs Dodge, Toughness, Endurance and base attack 7.
    const stalwart: Build = build({
      scores: scores({ Dexterity: 12 }),
      levels: [...levels(FIGHTER, 7), { class: STALWART_DEFENDER }],
      gear: BOTH,
      countGear: true,
      picks: [
        at(1, BASIC_FEAT_SELECTION, TOUGHNESS),
        at(1, BASIC_FEAT_SELECTION, ENDURANCE, 1),
        at(1, FIGHTER_FEAT_SELECTION, DODGE),
      ],
    });
    const w = walk(data, stalwart, G);
    expect(w.failures.filter((f) => f.choice === 'class')).toEqual([]);
    expect(marked(w)).toContain(`L8 class ${STALWART_DEFENDER} ${DEX_BELT}`);
  });

  describe('hand-built', () => {
    const NEEDS_CHA = 'f4000000000000000000000000000001';
    const RESTS_ON_IT = 'f4000000000000000000000000000002';
    const hand = withBlueprints(
      feature(NEEDS_CHA, 'TestNeedsCharisma', [needsStat('Charisma', 13)]),
      feature(RESTS_ON_IT, 'TestRestsOnIt', [needsFact(NEEDS_CHA)]),
      withOptions(BASIC_FEAT_SELECTION, NEEDS_CHA, RESTS_ON_IT),
    );

    it('marks a Charisma feat with the headband alone, and a feat resting on it with the same', () => {
      const w = walk(
        hand.data,
        build({
          scores: scores({ Charisma: 12, Dexterity: 12 }),
          levels: levels(FIGHTER, 3),
          gear: BOTH,
          countGear: true,
          picks: [at(1, BASIC_FEAT_SELECTION, NEEDS_CHA), at(3, BASIC_FEAT_SELECTION, RESTS_ON_IT)],
        }),
        hand.G,
      );
      expect(marked(w)).toEqual([`L1 pick ${NEEDS_CHA} ${CHA_HEADBAND}`, `L3 pick ${RESTS_ON_IT} ${CHA_HEADBAND}`]);
    });

    it('marks an archetype and a class whose stat prerequisite needs the belt', () => {
      // TwoHandedFighterArchetype 84643e02a764bff4a9c1aba333a53c89 and StalwartDefenderClass, each given Dexterity 13 as
      // their only prerequisite besides the class's own. The fighter levels start at 2: the Gear goes on in the
      // ApplyClass band, after the Archetype band, so a first level's archetype never rests on it.
      const TWO_HANDED = '84643e02a764bff4a9c1aba333a53c89';
      const archetype = data.blueprints.get(TWO_HANDED) as BlueprintArchetype;
      const cls = data.blueprints.get(STALWART_DEFENDER) as BlueprintCharacterClass;
      const handClass = withBlueprints(
        { ...archetype, Components: [...archetype.Components, needsStat('Dexterity', 13)] },
        { ...cls, Components: [needsStat('Dexterity', 13)] },
      );
      const fighter = (countGear: boolean) =>
        walk(
          handClass.data,
          build({
            scores: scores({ Dexterity: 12 }),
            levels: [{ class: SORCERER }, { class: FIGHTER }, { class: STALWART_DEFENDER }],
            classChoices: { [FIGHTER]: { archetypes: [TWO_HANDED] } },
            gear: BOTH,
            countGear,
          }),
          handClass.G,
        );
      expect(marked(fighter(true))).toEqual([
        `L2 archetype ${TWO_HANDED} ${DEX_BELT}`,
        `L3 class ${STALWART_DEFENDER} ${DEX_BELT}`,
      ]);
      expect(fighter(false).failures).toContainEqual(
        expect.objectContaining({
          choice: 'archetype',
          rule: 'BlueprintArchetype.MeetsPrerequisites',
          unmet: [expect.objectContaining({ found: 12, needed: 13 })],
        }),
      );
    });
  });
});
