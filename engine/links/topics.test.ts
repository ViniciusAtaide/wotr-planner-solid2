import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadData } from '../load';
import { readDataDir } from '../data-dir';
import { buildGrantIndex } from '../grants';
import { heldIndex, stackable, synergyOf, topicKey, topicsOf, weaponGroupsOf } from './topics';
import { enablesWith, linkIndex } from './links';
import { topicWords } from './words';
import type { Blueprint, Component } from '../data';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const data = loadData(files.files, files.overrides);
buildGrantIndex(data);

const COMBAT_CASTING = '06964d468fde1dc4aa71a92ea04d930d';
const DODGE = '97e216dbb46ae3c4faef90cf6bbe6fd5';
const SPELL_FOCUS = '16fa59cc9a72a6043b566b49184f53fe';
const STRENGTH_OF_THE_ABYSS_9 = 'd3ccd7c74caab594485c20f694aca91d';
const STRENGTH_OF_THE_ABYSS_13 = '13ea370344ca1444c928ddf8177fcdfc';
const ELEMENTAL_FOCUS_FIRE = '13bdf8d542811ac4ca228a53aa108145';
const ONE_FOOT_IN_THE_GRAVE = '045b1eef7a1577d44884e6f105f35a09';
const WEAPON_TRAINING_THROWN = '0bbf10151dd1d8d4c8653d245e425453';
const IMPROVED_ELVEN_IMMUNITIES = '12a62aa4876a4c6b95e8acca7a6f8369';

describe('Synergy topics', { timeout: 30_000 }, () => {
  it("stacks exactly the bonus types the game's helper lists", () => {
    for (const d of ['None', 'Racial', 'Dodge', 'UntypedStackable', 'Feat', 'NaturalArmor'] as const)
      expect(stackable(d)).toBe(true);
    for (const d of ['Inherent', 'Competence', 'Insight', 'Enhancement', 'Morale'] as const)
      expect(stackable(d)).toBe(false);
  });

  it('reads an ability from an above-average score prerequisite, not from the Intelligence 3 gate', () => {
    expect(topicsOf(data, COMBAT_CASTING).map(topicKey)).not.toContain('ability Intelligence');
    expect(topicsOf(data, DODGE).map(topicKey)).toContain('ability Dexterity');
  });

  it("reads a parametrized pick's school or weapon from its parameter", () => {
    expect(topicsOf(data, SPELL_FOCUS, { SpellSchool: 'Evocation' }).map(topicKey)).toEqual(['school Evocation']);
    expect(topicsOf(data, SPELL_FOCUS, { WeaponCategory: 'Longsword' }).map(topicKey)).toContain('weapon Longsword');
  });

  it('warns that a bonus of the same type to the same stat as a held one will not stack', () => {
    const held = heldIndex(data, [{ blueprint: STRENGTH_OF_THE_ABYSS_9 }]);
    const s = synergyOf(data, held, { feature: STRENGTH_OF_THE_ABYSS_13 });
    expect(s.wontStack).toEqual([{ stat: 'Strength', descriptor: 'Inherent', with: [STRENGTH_OF_THE_ABYSS_9] }]);
    expect(s.shared.map((t) => topicKey(t.topic))).toEqual(['ability Strength']);
  });

  it('reads energy, a short descriptor list and weapon groups from the Summary carriers (06d)', () => {
    expect(topicsOf(data, ELEMENTAL_FOCUS_FIRE).map(topicKey)).toEqual(['energy Fire']);
    expect(topicsOf(data, ONE_FOOT_IN_THE_GRAVE).map(topicKey)).toEqual([
      'descriptor MindAffecting against',
      'descriptor Poison against',
      'descriptor Disease against',
      'descriptor Death against',
    ]);
    expect(topicsOf(data, WEAPON_TRAINING_THROWN).map(topicKey)).toContain('group Thrown');
    expect(topicsOf(data, IMPROVED_ELVEN_IMMUNITIES).map(topicKey)).toContain('school Enchantment');
  });

  it("links a parametrized pick's weapon to its groups, so Weapon Focus (Dagger) shares thrown weapons with Weapon Training", () => {
    expect(weaponGroupsOf(data, 'Dagger')).toEqual(['BladesLight', 'Thrown']);
    expect(topicsOf(data, SPELL_FOCUS, { WeaponCategory: 'Dagger' }).map(topicKey)).toEqual([
      'weapon Dagger',
      'group BladesLight',
      'group Thrown',
    ]);
    const held = heldIndex(data, [{ blueprint: SPELL_FOCUS, param: { WeaponCategory: 'Dagger' } }]);
    const s = synergyOf(data, held, { feature: WEAPON_TRAINING_THROWN });
    expect(s.shared.map((t) => topicKey(t.topic))).toContain('group Thrown');
  });

  it("links Weapon Focus and Improved Critical only on the weapon they're taken for, not on proficiencies or special-weapon gates (MCP QA)", () => {
    const WEAPON_FOCUS = '1e1f627d26ad36f43bbd26cc2bf8ac7e';
    const IMPROVED_CRITICAL = 'f4201c85a991369408740c6888362e20';
    const SIMPLE_WEAPONS = 'e70ecf1ed95ca2f40b754f1adb22bbdd';
    expect(topicsOf(data, WEAPON_FOCUS)).toEqual([]);
    expect(topicsOf(data, SIMPLE_WEAPONS)).toEqual([]);
    const held = heldIndex(data, [
      { blueprint: WEAPON_FOCUS, param: { WeaponCategory: 'Longsword' } },
      { blueprint: SIMPLE_WEAPONS },
    ]);
    const shared = (category: 'Longsword' | 'Dagger') =>
      synergyOf(data, held, { feature: IMPROVED_CRITICAL, param: { WeaponCategory: category } }).shared.map((t) =>
        topicKey(t.topic),
      );
    expect(shared('Longsword')).toEqual(['weapon Longsword']);
    expect(shared('Dagger')).toEqual([]);
  });

  it("links a weapon's group only to a group-based pick, and never on a race's ability bonus (QA pass 4)", () => {
    const WEAPON_FOCUS = '1e1f627d26ad36f43bbd26cc2bf8ac7e';
    const IMPROVED_CRITICAL = 'f4201c85a991369408740c6888362e20';
    const WEAPON_TRAINING_HEAVY_BLADES = '2a0ce0186af38ed419f47fce16f93c2a';
    const RAKSHASA_SPAWN = 'ea6a099d0e963e145a7268e4343d5924';
    const focus = heldIndex(data, [{ blueprint: WEAPON_FOCUS, param: { WeaponCategory: 'Longsword' } }]);
    expect(
      synergyOf(data, focus, { feature: IMPROVED_CRITICAL, param: { WeaponCategory: 'Falchion' } }).shared,
    ).toEqual([]);
    expect(
      synergyOf(data, focus, { feature: WEAPON_TRAINING_HEAVY_BLADES }).shared.map((t) => topicKey(t.topic)),
    ).toEqual(['group BladesHeavy']);
    const raced = heldIndex(data, [{ blueprint: RAKSHASA_SPAWN }]);
    expect(synergyOf(data, raced, { feature: DODGE }).shared).toEqual([]);
  });

  it('links a school only on the same side: your spells with your spells, saves with saves (QA pass 5)', () => {
    const ELVEN_IMMUNITIES = '2483a523984f44944a7cf157b21bf79c';
    const INDOMITABLE_WILL = 'e9ae7276574c170468937b617d993357';
    const focus = heldIndex(data, [{ blueprint: SPELL_FOCUS, param: { SpellSchool: 'Enchantment' } }]);
    const shared = (held: ReturnType<typeof heldIndex>, feature: string) =>
      synergyOf(data, held, { feature }).shared.map((t) => topicKey(t.topic));
    expect(shared(focus, ELVEN_IMMUNITIES)).toEqual([]);
    expect(shared(focus, IMPROVED_ELVEN_IMMUNITIES)).toEqual(['school Enchantment']);
    const saves = heldIndex(data, [{ blueprint: ELVEN_IMMUNITIES }]);
    expect(shared(saves, INDOMITABLE_WILL)).toEqual(['school Enchantment against']);
    expect(topicWords({ kind: 'school', school: 'Enchantment', against: true })).toBe(
      'saves against Enchantment spells',
    );
  });

  it('links a descriptor only on the same side: Fear spell DCs apart from defences against fear (QA pass 5)', () => {
    const IMMUNITY_TO_FEAR = '12a47d1d5d02fe34c8158ca58e0b3b60';
    const FEARLESS = '39144c817b70467499cc32e3cff59d81';
    const immunity = data.blueprints.get(IMMUNITY_TO_FEAR) as Blueprint;
    const fearImmunity = immunity.Components.find((c) => c.$type === 'BuffDescriptorImmunity') as Component;
    const fearDc = (guid: string): Blueprint =>
      ({ ...immunity, guid, Components: [{ ...fearImmunity, $type: 'IncreaseSpellDescriptorDC' }] }) as Blueprint;
    const DREAD_A = 'f0000000000000000000000000000001';
    const DREAD_B = 'f0000000000000000000000000000002';
    const withDc = {
      ...data,
      blueprints: new Map([...data.blueprints, [DREAD_A, fearDc(DREAD_A)], [DREAD_B, fearDc(DREAD_B)]]),
    };
    const shared = (held: string, feature: string) =>
      synergyOf(withDc, heldIndex(withDc, [{ blueprint: held }]), { feature }).shared.map((t) => topicKey(t.topic));
    expect(shared(IMMUNITY_TO_FEAR, FEARLESS)).toContain('descriptor Fear against');
    expect(shared(DREAD_A, DREAD_B)).toContain('descriptor Fear');
    expect(shared(IMMUNITY_TO_FEAR, DREAD_A)).toEqual([]);
    expect(shared(DREAD_A, FEARLESS)).toEqual([]);
    expect(topicWords({ kind: 'descriptor', descriptor: 'Fear', against: true })).toBe('defences against fear effects');
    expect(topicWords({ kind: 'energy', energy: 'Fire', against: true })).toBe('defences against fire');
  });

  it("computes a parametrized value's enables with its parameter (QA pass 4)", () => {
    const WEAPON_FOCUS = '1e1f627d26ad36f43bbd26cc2bf8ac7e';
    const named = (param: { WeaponCategory: 'Bardiche' | 'DuelingSword' | 'Rapier' }) =>
      enablesWith(data, WEAPON_FOCUS, param).map((g) => data.blueprints.get(g)?.name);
    const any = linkIndex(data)
      .enables(WEAPON_FOCUS)
      .map((g) => data.blueprints.get(g)?.name);
    expect(any).toEqual(expect.arrayContaining(['Aldori Swordlord', 'Fencing Grace', 'Slashing Grace']));
    const bardiche = named({ WeaponCategory: 'Bardiche' });
    for (const n of ['Aldori Swordlord', 'Fencing Grace', 'Slashing Grace']) expect(bardiche).not.toContain(n);
    expect(named({ WeaponCategory: 'DuelingSword' })).toEqual(
      expect.arrayContaining(['Aldori Swordlord', 'Slashing Grace']),
    );
    expect(named({ WeaponCategory: 'Rapier' })).toContain('Fencing Grace');
    expect(named({ WeaponCategory: 'Rapier' })).not.toContain('Aldori Swordlord');
  });
});
