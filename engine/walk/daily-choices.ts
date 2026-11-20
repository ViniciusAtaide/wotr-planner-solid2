import type { CheckedData } from '../load';
import { refGuid, type AbilityApplyFact, type Guid } from '../data';

export const DAILY_CHOICES: ReadonlyMap<Guid, { readonly feature: string; readonly ability: Guid }> = new Map([
  [
    '70e6075a72633ba49804ccb6203fb18c',
    { feature: 'ShamanWanderingSpiritFeature', ability: '709db7ec794271b43b9c416b520d765c' },
  ],
  [
    '4439ae8c6360cd544b69d9d80ed42d5e',
    { feature: 'UnswornShamanWanderingSpiritFeature 1', ability: '88032ba214e97a442849ef0d15ce1485' },
  ],
  [
    '5f4ce80c304ed374caa1683fecb0a4e0',
    { feature: 'UnswornShamanWanderingSpiritFeature 2', ability: '77e02067a4f59ba4793c79a34391a658' },
  ],
  [
    '2674f98616188814fbba9f8fccf43564',
    { feature: 'ShamanWanderingHexFeature', ability: 'e7be24dd1cf591d4baecd9578705513d' },
  ],
  [
    'f15d95a394e950a42b1d6afbb9f781d9',
    { feature: 'ShamanWanderingHexFeature2', ability: '1c06611ab264115479d16c0ff3ab0446' },
  ],
  ['fb8490d1721bd5a4883c3b6559310351', { feature: 'WitchWanderingHex', ability: 'b209beab784d93546b40a2fa2a09ffa8' }],
  [
    '66ac87c379d8fd241b2e6bd3b4ae8774',
    { feature: 'UnswornShamanMinorSpiritFeature 1', ability: 'bff5039c06a4a494b84bbca5c1cf93e5' },
  ],
  [
    'f5e75561d34a41443968673167e69305',
    { feature: 'UnswornShamanMinorSpiritFeature 2', ability: '8e37166acde792f458c1c02a7392ab7c' },
  ],
  [
    '102cd634847750f4cb39982aa3b85d0e',
    { feature: 'UnswornShamanMinorSpiritFeature 3', ability: 'cf57e3971a4f8d340a200794ba586bf9' },
  ],
  [
    'aa7a455ccc63fd74ca2c10aad616fe68',
    { feature: 'UnswornShamanMinorSpiritFeature 4', ability: '4248be819e269724086d8f6b44fafd10' },
  ],
  [
    '220be7261ab7e3e48996ef11862a1219',
    { feature: 'UnswornShamanMinorSpiritFeature 5', ability: '49c4c45281805fc43aa66cd036825450' },
  ],
  [
    '1f6caa4503b5a1d4ea5e15499f65431e',
    { feature: 'UnswornShamanMinorSpiritFeature 6', ability: '6485fe813137acd41aa56df5a39e0195' },
  ],
  [
    '39aeefef2162d554cbb902e824b4274d',
    { feature: 'PossessedShamanWanderingSkillsFeature', ability: 'c8d7c885c44d6014499119be5b464ec6' },
  ],
  [
    'c785d2718021449f895a960c7840b4d0',
    { feature: 'TricksterPerceptionTier3Feature', ability: '8b530a3e37df440f9f9502eb379d7c36' },
  ],
  [
    '2c2283f5735d4e278f4088d9ff90edbb',
    { feature: 'MixedBloodlineFeature', ability: '352b4e8bb5ca4301b6e6084304a86546' },
  ],
  [
    'cd9ba53d5b144fd4aad4fc6b717ecd50',
    { feature: 'MixedBloodlineFeature2', ability: '291fa8cf38fa401397dd3c9b7515b153' },
  ],
]);

export const SECOND_DAILY_CHOICES: ReadonlyMap<Guid, Guid> = new Map([
  ['c785d2718021449f895a960c7840b4d0', '2902b0d47f674c678f306e4abc352ae8'],
]);

export const IN_PLAY_ABILITIES: ReadonlyMap<Guid, string> = new Map([
  ['404f6e3da48b87f4e9fca21150d47f71', 'CavalierTacticianFeature'],
  ['c7913a6c300cb994b8e800e1096f9280', 'CavalierTacticianGreater'],
  ['013a7537227c4b1f9d0bcff263aa21f6', 'ShifterDragonFormFeature20Evil'],
  ['3c3fdc824b084d8b8af30c2bc328b1d5', 'ShifterDragonFormFeature20Good'],
  ['e7079843d2454c08a61da4001009c9a1', 'ShifterDragonFormFeature20Neutral'],
]);

const offersCache = new WeakMap<CheckedData, ReadonlyMap<Guid, readonly Guid[]>>();

function offers(data: CheckedData): ReadonlyMap<Guid, readonly Guid[]> {
  let map = offersCache.get(data);
  if (map !== undefined) return map;
  const out = new Map<Guid, Guid[]>();
  const add = (feature: Guid, ability: Guid) => {
    for (const c of data.blueprints.get(ability)?.Components ?? []) {
      if (c.$type !== 'AbilityApplyFact') continue;
      for (const ref of (c as AbilityApplyFact).m_Facts) {
        const option = refGuid(ref);
        if (option === undefined) continue;
        const list = out.get(option) ?? [];
        if (!list.includes(feature)) list.push(feature);
        out.set(option, list);
      }
    }
  };
  for (const [feature, { ability }] of DAILY_CHOICES) add(feature, ability);
  for (const [feature, ability] of SECOND_DAILY_CHOICES) add(feature, ability);
  offersCache.set(data, (map = out));
  return map;
}

export function dailyChoiceOffers(data: CheckedData, fact: Guid): readonly Guid[] {
  return offers(data).get(fact) ?? [];
}
