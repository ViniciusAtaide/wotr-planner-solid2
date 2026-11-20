import { describe, expect, it } from 'vitest';
import { rankLevel, type Build } from '../build';
import { jackInTheGreen } from '../gold';
import {
  addFacts,
  BASIC_FEAT_SELECTION,
  build,
  data,
  feature,
  FIGHTER,
  G,
  levels,
  needsFact,
  withBlueprints,
  withOptions,
} from './test-data';
import { walk } from './walk';

const LEGEND = '3d420403f3e7340499931324640efe96';
const DRUID = '610d836f3a3a9ed42a4349b62f002e96';
const SPELL_PENETRATION_MYTHIC = '51b6b22ff184eef46a675449e837365d';
const SPELL_PENETRATION_MYTHIC_UPGRADE = '544056cc5aca4d03823e13c5f8873c88';
const AZATA_SUMMON_TIER_2 = '370dbb8167f84a14f9e8bebfccf25b4e';
const ADAMANTINE_BANDED = 'ed04d2a914a93e046aadee8cc3109f65';
const ADAMANTINE_HEAVY_FEATURE = 'dbbf704bfcc78854ab149597ef9aae7c';

describe('a fact goes with the fact that granted it', () => {
  it("drops the mythic feat's upgrade when Legend drops the feat", () => {
    const jack = walk(data, jackInTheGreen.build, G);
    expect(jack.unit.hasFact(SPELL_PENETRATION_MYTHIC_UPGRADE)).toBe(true);
    const legend: Build = {
      ...jackInTheGreen.build,
      ranks: [...(jackInTheGreen.build.ranks ?? []).slice(0, 7), { class: LEGEND, level: rankLevel(17) }],
      picks: jackInTheGreen.build.picks.filter((p) => !('rank' in p.slot.place) || p.slot.place.rank <= 7),
    };
    const w = walk(data, legend, G);
    expect(w.unit.hasFact(SPELL_PENETRATION_MYTHIC)).toBe(false);
    expect(w.unit.hasFact(SPELL_PENETRATION_MYTHIC_UPGRADE)).toBe(false);
    expect(w.dropped.map((d) => d.fact)).toContain(SPELL_PENETRATION_MYTHIC_UPGRADE);
  });

  it('drops an Azata summon tier once a later tier removes its source', () => {
    const w = walk(data, jackInTheGreen.build, G);
    expect(w.gains.map((g) => g.fact)).toContain(AZATA_SUMMON_TIER_2);
    expect(w.unit.hasFact('62ece3b9b2126a44faa276bbb5bd1014')).toBe(false);
    expect(w.unit.hasFact(AZATA_SUMMON_TIER_2)).toBe(false);
  });

  it("takes a worn item's fact off with the item", () => {
    const armoured = (second: string) =>
      walk(
        data,
        build({
          alignment: 'TrueNeutral',
          levels: [{ class: FIGHTER }, { class: second }],
          gear: { Armor: ADAMANTINE_BANDED },
        }),
        G,
      );
    expect(armoured(FIGHTER).unit.hasFact(ADAMANTINE_HEAVY_FEATURE)).toBe(true);
    const druid = armoured(DRUID);
    expect(druid.unit.hasFact(ADAMANTINE_HEAVY_FEATURE)).toBe(false);
    expect(druid.failures).toContainEqual(
      expect.objectContaining({ place: { level: 2 }, choice: 'gear', subject: ADAMANTINE_BANDED }),
    );
    expect(druid.failures.filter((f) => f.choice === 'gear' && f.subject === ADAMANTINE_BANDED)).toHaveLength(1);
  });

  it("drops what a worn item's fact gave with it, and a later pick that needs it fails (hand-built)", () => {
    const GIFT = 'f3000000000000000000000000000001';
    const NEEDS_GIFT = 'f3000000000000000000000000000002';
    const armourFeature = data.blueprints.get(ADAMANTINE_HEAVY_FEATURE);
    if (armourFeature === undefined) throw new Error('no AdamantineArmorHeavyFeature');
    const hand = withBlueprints(
      { ...armourFeature, Components: [...armourFeature.Components, addFacts(GIFT)] },
      feature(GIFT, 'TestArmourGift', []),
      feature(NEEDS_GIFT, 'TestNeedsArmourGift', [needsFact(GIFT)]),
      withOptions(BASIC_FEAT_SELECTION, NEEDS_GIFT),
    );
    const armoured = (second: string) =>
      walk(
        hand.data,
        build({
          alignment: 'TrueNeutral',
          levels: [{ class: FIGHTER }, { class: second }, { class: FIGHTER }],
          gear: { Armor: ADAMANTINE_BANDED },
          picks: [{ slot: { place: { level: 3 }, selection: BASIC_FEAT_SELECTION, index: 0 }, feature: NEEDS_GIFT }],
        }),
        hand.G,
      );
    const fighter = armoured(FIGHTER);
    expect(fighter.unit.hasFact(GIFT)).toBe(true);
    expect(fighter.failures.filter((f) => f.choice === 'pick')).toEqual([]);
    const druid = armoured(DRUID);
    expect(druid.unit.hasFact(GIFT)).toBe(false);
    expect(druid.failures).toContainEqual(
      expect.objectContaining({
        place: { level: 3 },
        subject: NEEDS_GIFT,
        rule: 'BlueprintFeatureSelection.CanSelect:MeetsPrerequisites',
        unmet: [
          expect.objectContaining({ leaf: expect.objectContaining({ names: { kind: 'fact', m_Feature: GIFT } }) }),
        ],
      }),
    );
  });

  it("drops what an aspect's buff gave when the aspect goes off", () => {
    const SHIFTER = 'a406d6ebea5c46bba3160246be03e96f';
    const ASPECT_SELECTION = '121829d239124685b430f5263031bf83';
    const ENDURANCE = '54ee847996c25cd4ba8773d7b8555174';
    const shifter = (n: number) =>
      walk(
        data,
        build({
          levels: levels(SHIFTER, n),
          aspects: ['e66b1350f66949d997e31a57ce638fee', '5107da0ffa3a4b7bac5fd24f87e7852d'],
          picks: [
            {
              slot: { place: { level: 1 }, selection: ASPECT_SELECTION, index: 0 },
              feature: 'e8c3d7a903a6433bbcfb3d70c97451ce',
            },
            {
              slot: { place: { level: 5 }, selection: ASPECT_SELECTION, index: 0 },
              feature: '73ef2c330ff14e4bb2f5b7300622c552',
            },
          ],
        }),
        G,
      ).unit;
    expect(shifter(4).hasFact('0bdfd34b7e5a4639bf6b716fa2ac0098')).toBe(true);
    expect(shifter(4).hasFact(ENDURANCE)).toBe(true);
    expect(shifter(5).hasFact('0bdfd34b7e5a4639bf6b716fa2ac0098')).toBe(false);
    expect(shifter(5).hasFact(ENDURANCE)).toBe(false);
  });

  it('keeps a feature granted twice until either grant goes, as FeatureCollection merges them', () => {
    const GIFT = 'f3000000000000000000000000000011';
    const A = 'f3000000000000000000000000000012';
    const B = 'f3000000000000000000000000000013';
    const DROPS_A = 'f3000000000000000000000000000014';
    const hand = withBlueprints(
      feature(GIFT, 'TestSharedGift', []),
      feature(A, 'TestGiverA', [addFacts(GIFT)]),
      feature(B, 'TestGiverB', [addFacts(GIFT)]),
      feature(DROPS_A, 'TestDropsA', [{ $type: 'RemoveFeatureOnApply', m_Feature: `!bp_${A}` } as never]),
      withOptions(BASIC_FEAT_SELECTION, A, B, DROPS_A),
    );
    const at = (place: number, index: number, f: string) => ({
      slot: { place: { level: place }, selection: BASIC_FEAT_SELECTION, index },
      feature: f,
    });
    const w = (picks: Build['picks']) => walk(hand.data, build({ levels: levels(FIGHTER, 3), picks }), hand.G).unit;
    expect(w([at(1, 0, A), at(1, 1, B)]).hasFact(GIFT)).toBe(true);
    expect(w([at(1, 0, A), at(1, 1, B), at(3, 0, DROPS_A)]).hasFact(GIFT)).toBe(false);
    expect(w([at(1, 0, A), at(1, 1, B), at(3, 0, DROPS_A)]).hasFact(B)).toBe(true);
  });
  it("follows a buff's Stacking when two grants give it and one goes", () => {
    const holdsAfterDrop = (buff: string) => {
      const [A, B, DROPS_A] = [
        'f3000000000000000000000000000021',
        'f3000000000000000000000000000022',
        'f3000000000000000000000000000023',
      ];
      const hand = withBlueprints(
        feature(A, 'TestBuffGiverA', [addFacts(buff)]),
        feature(B, 'TestBuffGiverB', [addFacts(buff)]),
        feature(DROPS_A, 'TestDropsBuffGiverA', [{ $type: 'RemoveFeatureOnApply', m_Feature: `!bp_${A}` } as never]),
        withOptions(BASIC_FEAT_SELECTION, A, B, DROPS_A),
      );
      const at = (place: number, index: number, f: string) => ({
        slot: { place: { level: place }, selection: BASIC_FEAT_SELECTION, index },
        feature: f,
      });
      const picks = [at(1, 0, A), at(1, 1, B), at(3, 0, DROPS_A)];
      return walk(hand.data, build({ levels: levels(FIGHTER, 3), picks }), hand.G).unit.hasFact(buff);
    };
    expect(holdsAfterDrop('0bdfd34b7e5a4639bf6b716fa2ac0098')).toBe(true);
    expect(holdsAfterDrop('44569e9e95364bf42b1071382a8a89da')).toBe(false);
  });
});
