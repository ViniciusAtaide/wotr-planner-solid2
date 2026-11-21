import { fileURLToPath } from 'node:url';
import { describe as suite, expect, it } from 'vitest';
import { loadData } from '../load';
import { readDataDir } from '../data-dir';
import { buildGrantIndex } from '../grants';
import { describe, NO_SUMMARY, summaryComponentTypes, summaryLabels, summaryText } from './describe';
import { EQUIPMENT_LABELLED, labelOf, labelsOf, type Role } from './labels';
import { spellDescriptors } from '../links';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const data = loadData(files.files, files.overrides);
const G = buildGrantIndex(data);

const CARRIERS: readonly (readonly [string, string, Role, string])[] = [
  [
    'AddDamageResistanceEnergy',
    '040bb87b39e4a7f4a8ddc011c5a50523',
    'resistance',
    'Resistance to fire that grows with level.',
  ],
  [
    'AddDamageResistancePhysical',
    '07eba4bb72c2e3845bb442dce85d3b58',
    'resistance',
    'Damage reduction that grows with level, which nothing overcomes.',
  ],
  ['AddEnergyDamageImmunity', '1da8b2233d59448fa045d9c2f1b1e275', 'immunity', 'Immune to cold damage.'],
  ['AddEnergyImmunity', '11ac3433adfa74642a93111624376070', 'immunity', 'Immune to fire damage.'],
  ['AddSpellResistance', '01182bcee8cb41640b7fa1b1ad772421', 'resistance', 'Spell resistance that grows with level.'],
  [
    'AddFortification',
    '33a6791617cd483b9d5794d40bec6c7d',
    'resistance',
    'A 25% chance to ignore a critical hit or precision damage.',
  ],
  [
    'SavingThrowBonusAgainstDescriptor',
    '045b1eef7a1577d44884e6f105f35a09',
    'save',
    '+4 on saves against mind-affecting, poison, disease, death or bleed effects.',
  ],
  [
    'SavingThrowBonusAgainstSchool',
    '12a62aa4876a4c6b95e8acca7a6f8369',
    'save',
    '+4 racial bonus on saves against Enchantment spells.',
  ],
  [
    'BuffDescriptorImmunity',
    '040bb87b39e4a7f4a8ddc011c5a50523',
    'immunity',
    'Immune to paralysis, confusion or sleep effects.',
  ],
  [
    'SpellImmunityToSpellDescriptor',
    '040bb87b39e4a7f4a8ddc011c5a50523',
    'immunity',
    'Immune to paralysis, confusion or sleep spells.',
  ],
  ['AddConditionImmunity', '0217aaa0c3f74dc39643c3e841636625', 'immunity', 'Immune to the entangled condition.'],
  ['AddImmunityToCriticalHits', '2e3e840ab458ce04c92064489f87ecc2', 'immunity', 'Immune to critical hits.'],
  [
    'AddImmunityToPrecisionDamage',
    '198fd8924dabcb5478d0f78bd453c586',
    'immunity',
    'Immune to precision damage, such as sneak attacks.',
  ],
  [
    'IncreaseSpellDescriptorDC',
    '13bdf8d542811ac4ca228a53aa108145',
    'bonus',
    '+1 to the save DC of fire spells and abilities.',
  ],
  ['IncreaseSpellSchoolDC', '0b71c1a7941bfa4429e281245371efc6', 'bonus', '+1 to the save DC of Enchantment spells.'],
  [
    'SpellPenetrationBonus',
    '0349b6dfdcd040b993735e240846a925',
    'bonus',
    '+5 competence bonus on caster level checks to overcome spell resistance.',
  ],
  ['ConcentrationBonus', '06964d468fde1dc4aa71a92ea04d930d', 'bonus', '+4 on concentration checks.'],
  [
    'IncreaseSpellDescriptorCasterLevel',
    '84e3920082103a34eb54dcca2e7904ae',
    'bonus',
    '+1 caster level for cold spells and abilities.',
  ],
  [
    'IncreaseSpellSchoolCasterLevel',
    '933b4d571a31b9a43aa424eac0a22068',
    'bonus',
    '+4 caster level for Divination spells.',
  ],
  [
    'SpellSpecializationParametrized',
    '0455bde9d7c7b8d488dd546ae140af64',
    'bonus',
    '+2 caster level for the chosen spell.',
  ],
  [
    'DraconicBloodlineArcana',
    '0b06a41777524044bf36e9f43b6a6e03',
    'bonus',
    'Extra damage on each damage die of cold spells, growing with level.',
  ],
  [
    'IncreaseAllSpellsDC',
    '0349b6dfdcd040b993735e240846a925',
    'bonus',
    '+1 to the save DC of all spells and abilities.',
  ],
  [
    'WeaponGroupAttackBonus',
    '0bbf10151dd1d8d4c8653d245e425453',
    'bonus',
    '+1 weapon training bonus on attack rolls with thrown weapons.',
  ],
  [
    'WeaponGroupDamageBonus',
    '0bbf10151dd1d8d4c8653d245e425453',
    'bonus',
    '+1 weapon training bonus on damage rolls with thrown weapons.',
  ],
  [
    'AttackBonusAgainstFactOwner',
    '020bd2ae61de90341b7f874b788c160a',
    'bonus',
    '+1 on attack rolls against Reptilian Humanoid.',
  ],
  [
    'DamageBonusAgainstFactOwner',
    '37f3ca7f3e584a5b9edb2cad88cf5ba7',
    'bonus',
    'A bonus that grows with level on damage rolls against certain foes.',
  ],
  [
    'ACBonusAgainstFactOwner',
    '0bcbe9e450b0e7b428f08f66c53c5136',
    'bonus',
    '+1 dodge bonus to AC against certain foes.',
  ],
  [
    'WeaponTraining',
    '0bbf10151dd1d8d4c8653d245e425453',
    'bonus',
    'Counts as weapon training, which raises the bonuses of the other trainings.',
  ],
  [
    'WeaponTypeDamageStatReplacement',
    '04f3b956e5a5cf649bce83774e0bfe4a',
    'bonus',
    'Adds Dexterity instead of Strength to damage with an elven curved blade, when it is higher.',
  ],
  [
    'ManeuverBonus',
    '06816910f76f55c4fbad0d19a0c37bcc',
    'bonus',
    'Half the mythic rank as a bonus on dirty trick (blind) combat maneuver checks.',
  ],
  ['ManeuverDefenceBonus', '05b6b99b0f394284899eccd4728031b7', 'bonus', '+4 to CMD against trip.'],
  [
    'WeaponFocusParametrized',
    '09c9e82965fb4334b984a1e9df3bd088',
    'bonus',
    '+1 on attack rolls with the chosen weapon, +2 with its mythic feat.',
  ],
  [
    'WeaponSpecializationParametrized',
    '31470b17e8446ae4ea0dacd6c5817d86',
    'bonus',
    '+2 on damage with the chosen weapon.',
  ],
  [
    'ImprovedCriticalParametrized',
    'f4201c85a991369408740c6888362e20',
    'bonus',
    'Doubles the critical threat range of the chosen weapon.',
  ],
  ['Blindsense', '0b15a8dce67746e1979dfc597f13827f', 'bonus', 'Blindsense 30 ft.'],
  ['BuffMovementSpeed', '077dd0c839f5dfd498cb2e34835fb06d', 'bonus', '-10 ft. speed.'],
  ['FavoredEnemy', '04314be4be2b7f444883ca8caf78a8a8', 'bonus', 'Favored enemy: Gnome.'],
  ['FavoredTerrain', '19e1c418cbad1b540ad52fee0fd7f16b', 'bonus', 'Favored terrain: forest.'],
  [
    'Evasion',
    '0d35d6c4d5eef8d4790d09bd9a874e57',
    'save',
    'Evasion: no damage from an effect that allows a Reflex save for half, when the save succeeds.',
  ],
  [
    'ImprovedEvasion',
    '0d35d6c4d5eef8d4790d09bd9a874e57',
    'save',
    'Improved evasion: half damage from an effect that allows a Reflex save for half, even when the save fails.',
  ],
  ['BuffAllSavesBonus', 'eb20cb0326444e348fc18f9b4d1644da', 'save', '+1 luck bonus on all saving throws.'],
  ['BuffAllSkillsBonus', '21fbafd5dc42d4d488c4d6caed46bc99', 'bonus', '+1 on all skill checks.'],
  ['ACBonusAgainstAttacks', '2a6091b97ad940943b46262600eaeaeb', 'bonus', '+4 to AC against attacks of opportunity.'],
  [
    'AttackTypeAttackBonus',
    '5eac31e457999334b98f98b60fc73b2f',
    'bonus',
    'A bonus that grows with level on melee attack rolls.',
  ],
  ['CMDBonusAgainstManeuvers', '25fa74e08bcc43c47816fa364f1d48b6', 'bonus', '+2 to CMD against trip.'],
  ['AddImmunityToAbilityScoreDamage', '2e193b5df54c4726b1894bc0a7dfc6c1', 'immunity', 'Immune to ability damage.'],
  [
    'AddImmunityToEnergyDrain',
    '8a75eb16bfff86949a4ddcb3dd2f83ae',
    'immunity',
    'Immune to energy drain and negative levels.',
  ],
  ['SavingThrowBonusAgainstFact', '0bcbe9e450b0e7b428f08f66c53c5136', 'save', '+1 on saves against certain sources.'],
  ['ArcaneSpellFailureIncrease', '1a0298abacb6e0f45b7e28553e99e76c', 'bonus', '-10% arcane spell failure from armor.'],
  [
    'AddEnergyVulnerability',
    '06d2f00616ad40c3b136d06dffc8f0b5',
    'weakness',
    'Vulnerable to sonic: takes half again as much damage from it.',
  ],
];

suite('Summary labels', { timeout: 30_000 }, () => {
  it('labels each of the 50 carriers', () => {
    expect(CARRIERS.map(([type]) => type)).toEqual(summaryComponentTypes);
  });

  it.each(CARRIERS)('words %s from a real blueprint (%s)', (type, guid, role, text) => {
    const component = data.blueprints
      .get(guid)
      ?.Components.find((c) => c.$type === type && labelOf(data, c) !== undefined);
    expect(component).toBeDefined();
    expect(labelOf(data, component!)).toEqual({ role, text });
  });

  it('never words a component it has no label for, nor a raw name', () => {
    for (const bp of data.blueprints.values())
      for (const c of bp.Components) {
        const label = labelOf(data, c);
        if (!summaryComponentTypes.includes(c.$type) && !EQUIPMENT_LABELLED.has(c.$type)) expect(label).toBeUndefined();
        if (label !== undefined)
          expect(label.text).not.toMatch(
            /\(internal\)|undefined|NaN|\b[A-Z][a-z]+[A-Z]\w*(Bonus|Immunity|Resistance)\b/,
          );
      }
  });

  it('reads all 64 spell descriptor bits, the sign bit included', () => {
    expect(spellDescriptors({ m_IntValue: '1' })).toEqual(['Fire']);
    expect(spellDescriptors({ m_IntValue: '-9223372036854775808' })).toEqual(['AnomalyDistortion']);
    expect(spellDescriptors({ m_IntValue: '4611686018427387904' })).toEqual(['NegativeLevel']);
    expect(spellDescriptors({ m_IntValue: '0' })).toEqual([]);
  });

  it("makes describe's Summary the labelled sentences, or no summary yet", () => {
    const combatCasting = describe(data, '06964d468fde1dc4aa71a92ea04d930d', G);
    expect(combatCasting?.labels).toEqual([{ role: 'bonus', text: '+4 on concentration checks.' }]);
    expect(combatCasting?.summary).toBe('+4 on concentration checks.');
    const unlabelled = [...data.blueprints.values()].find(
      (bp) => describe(data, bp.guid, G) !== undefined && labelsOf(data, bp.guid).length === 0,
    );
    expect(unlabelled && describe(data, unlabelled.guid, G)?.summary).toBe(NO_SUMMARY);
  });

  it('prefers a hand-written summary (06c), and says where each Summary comes from', () => {
    const dangerSense = describe(data, '0bcbe9e450b0e7b428f08f66c53c5136', G);
    expect(dangerSense?.summarySource).toBe('written');
    expect(dangerSense?.summary).toBe(
      '+1 dodge bonus to AC and +1 on all saving throws against traps, for each rank of Danger Sense (up to 6).',
    );
    expect(dangerSense?.labels.length).toBe(2);
    expect(describe(data, '06964d468fde1dc4aa71a92ea04d930d', G)?.summarySource).toBe('labels');
    expect(describe(data, '9972f33f977fc724c838e59641b2fca5', G)).toMatchObject({
      summarySource: 'none',
      summary: NO_SUMMARY,
    });
  });

  it("says a bonus grows per rank when the game multiplies it by the fact's rank", () => {
    expect(labelsOf(data, '0bcbe9e450b0e7b428f08f66c53c5136').map((l) => l.text)).toEqual([
      '+1 on saves against certain sources, per rank (up to 6).',
      '+1 dodge bonus to AC against certain foes, per rank (up to 6).',
    ]);
    expect(labelsOf(data, '06964d468fde1dc4aa71a92ea04d930d').map((l) => l.text)).toEqual([
      '+4 on concentration checks.',
    ]);
  });

  it("composes an item's Summary from the facts its enchantments grant, worded at the one rank an item gives", () => {
    const coldBelt = describe(data, '546c72cd7d8ec664ea5fcfae47c7b91b', G);
    expect(coldBelt).toMatchObject({ summarySource: 'labels', summary: 'Resistance 10 to cold.' });
    expect(coldBelt?.labels).toEqual([{ role: 'resistance', text: 'Resistance 10 to cold.' }]);
    expect(summaryText(data, '6ba58bebb6e6e2046a2847c0f0d18dfe', G)).toBe(
      'Immune to the blindness condition. Immune to gaze attack effects. Immune to gaze attack spells.',
    );
    expect(summaryLabels(data, '6ba58bebb6e6e2046a2847c0f0d18dfe', G).map((l) => l.role)).toEqual([
      'immunity',
      'immunity',
      'immunity',
    ]);
  });

  it("words the equipment bonuses the walk keeps: an item's stat and enhancement bonuses and mithral", () => {
    expect(summaryText(data, '4782eaff2231a524183c6f6034ee31db', G)).toBe(
      '+4 enhancement bonus to Strength. +4 enhancement bonus to Constitution.',
    );
    expect(summaryText(data, '1e785267696a49d40a5abd57d2de1910', G)).toBe(
      '+2 enhancement bonus on attack and damage rolls with this weapon.',
    );
    expect(summaryText(data, '031564eb2aaf45842b5a92a96f92f31d', G)).toBe(
      'Mithral: counts as one armor category lighter, heavy as medium and medium as light. +1 enhancement bonus to the AC this armor or shield gives.',
    );
  });

  it("says when a conditional grant applies, so a deity's cleric-only proficiency reads as one (MCP QA)", () => {
    const desna = describe(data, '2c0a3b9971327ba4d9d85354d16998c1', G);
    expect(desna?.grants.find((g) => g.guid === '7818ba3db79ac064e88fa14a2478b24b')).toEqual({
      guid: '7818ba3db79ac064e88fa14a2478b24b',
      name: expect.stringContaining('Starknife'),
      level: 1,
      when: 'at Cleric, Inquisitor or Warpriest level 1',
    });
  });
});
