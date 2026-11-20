import { describe, expect, it } from 'vitest';
import { deriveTwins } from '~engine/data/twins';
import type { Blueprint, Guid, Override } from '~engine/data/types';
import { qualifyGear } from './gear-names';

// Hand-built from the game's own items (build ticket 02f, map ticket 29): each keeps its GUID and asset name from the
// dump, with only the fields the Gear rules read.
const r = (guid: Guid) => `!bp_${guid}`;
const blueprint = (guid: Guid, $type: string, assetName: string, name: string | undefined, fields: object = {}) =>
  [guid, { $type, guid, assetName, ...(name === undefined ? {} : { name }), Components: [], ...fields }] as const;
const requiresClass = (cls: Guid) => [{ $type: 'EquipmentRestrictionClass', Not: false, m_Class: r(cls) }];
const notClass = (cls: Guid) => ({ $type: 'EquipmentRestrictionClass', Not: true, m_Class: r(cls) });

const AEON_CLOAK = 'b24d6185acea1f949b026c3b58e47947';
const ANGEL_CLOAK = '2f45a11adb74b5a4a81f857a9886c5bd';
const DRAGON_CLOAK = '2c0129fc1485da149a68a1b0584cad91';
const FULL_PLATE = 'b067c338ede1bfc45be97d2d9ab934e8';
const FULL_PLATE_HELLKNIGHT = '29f9eb542c9985f4b904add8d843caf1';
const BATTLEAXE = '8fa0e2f75519e36429b045c19f56d43c';
const HANDAXE = '87f84ad210f27264fa7b7465e43e0348';
const BASHING_SHIELD = '5a326f3961ad985448c9c7b72c82b1a7';
const ENHANCEMENT_1 = 'd42fc23b92c640846ac137dc26e000d4';
const ENHANCEMENT_3 = '80bb8a737579e35498177e1e3c75899b';
const FINNEAN_BARDICHE_1 = '5c504850b5d3c824f9cd8b965ad2ccdb';
const FINNEAN_BARDICHE_2 = 'ee434b374a4c22845b46b517bab24eab';
const FINNEAN_GLAIVE_1 = 'c34fb7763fd01aa4fb2e6c5d2ee19781';
const FINNEAN_GLAIVE_2 = '4623ea8c6b6457549bb99d3b040813f7';
const BASHING_SHIELD_ARMOR = '5ba44cd58f731144a9f390c2c099abc6';

const blueprints = new Map<Guid, Blueprint>(
  [
    blueprint('15a85e67b7d69554cab9ed5830d0268e', 'BlueprintCharacterClass', 'AeonMythicClass', 'Aeon'),
    blueprint('a5a9fe8f663d701488bd1db8ea40484e', 'BlueprintCharacterClass', 'AngelMythicClass', 'Angel'),
    // The Bound of Possibility: one cloak per Mythic path; the Golden Dragon's has no restriction.
    blueprint(AEON_CLOAK, 'BlueprintItemEquipmentShoulders', 'Artifact_AeonCloakItem', 'The Bound of Possibility', {
      Components: requiresClass('15a85e67b7d69554cab9ed5830d0268e'),
      m_Enchantments: [],
    }),
    blueprint(ANGEL_CLOAK, 'BlueprintItemEquipmentShoulders', 'Artifact_AngelCloakItem', 'The Bound of Possibility', {
      Components: requiresClass('a5a9fe8f663d701488bd1db8ea40484e'),
      m_Enchantments: [],
    }),
    blueprint(DRAGON_CLOAK, 'BlueprintItemEquipmentShoulders', 'Artifact_DragonCloakItem', 'The Bound of Possibility', {
      m_Enchantments: [],
    }),
    // Adamantine Full Plate +2 and its Hellknight copy: equal in everything but GUID and asset name.
    blueprint('afd9065539b3ac5499eddca923654c4b', 'BlueprintArmorType', 'FullplateType', 'Heavy Armor — Full Plate'),
    blueprint('d1b05b901bab9524388ebfa0435902a6', 'BlueprintShieldType', 'HeavyShieldType', undefined),
    ...[FULL_PLATE, FULL_PLATE_HELLKNIGHT].map((guid, i) =>
      blueprint(
        guid,
        'BlueprintItemArmor',
        i === 0 ? 'AdamantineFullplateStandartPlus2' : 'AdamantineFullplateStandartPlus2_Hellknight',
        'Adamantine Full Plate +2',
        {
          Components: [notClass('610d836f3a3a9ed42a4349b62f002e96'), notClass('01a754e7c1b7c5946ba895a5ff0faffc')],
          m_Type: r('afd9065539b3ac5499eddca923654c4b'),
          m_Enchantments: [],
        },
      ),
    ),
    // Executioner of Evil: one relic per axe, told apart by the weapon type's name.
    blueprint('2bc77aa47f97de348aefcf03ec8fa43b', 'BlueprintWeaponType', 'Battleaxe', 'Battleaxe'),
    blueprint('54e7473ff73910c47812fd39c897dc1a', 'BlueprintWeaponType', 'Handaxe', 'Handaxe'),
    ...[
      [BATTLEAXE, 'RovagugRelicGrasshopperBattlaxeItem', '2bc77aa47f97de348aefcf03ec8fa43b'],
      [HANDAXE, 'RovagugRelicGrasshopperHandaxeItem', '54e7473ff73910c47812fd39c897dc1a'],
    ].map(([guid, asset, type]) =>
      blueprint(guid!, 'BlueprintItemWeapon', asset!, 'Executioner of Evil', {
        m_Type: r(type!),
        m_Enchantments: [],
        Double: false,
        m_SecondWeapon: null,
      }),
    ),
    // Finnean the Talking Weapon: one weapon per type and stage, the stages differing in their enhancement bonus.
    blueprint('b1cbf457fd471d148b39ae56667f405a', 'BlueprintWeaponType', 'Bardiche', 'Bardiche'),
    blueprint('7a14a1b224cd173449cb7ffc77d5f65c', 'BlueprintWeaponType', 'Glaive', 'Glaive'),
    ...[ENHANCEMENT_1, ENHANCEMENT_3].map((guid, i) =>
      blueprint(guid, 'BlueprintWeaponEnchantment', `Enhancement${2 * i + 1}`, undefined, {
        Components: [{ $type: 'WeaponEnhancementBonus', EnhancementBonus: 2 * i + 1, Stack: false }],
      }),
    ),
    ...[
      [FINNEAN_BARDICHE_1, 'FinneanBardicheStage1', 'b1cbf457fd471d148b39ae56667f405a', ENHANCEMENT_1],
      [FINNEAN_BARDICHE_2, 'FinneanBardicheStage2', 'b1cbf457fd471d148b39ae56667f405a', ENHANCEMENT_3],
      [FINNEAN_GLAIVE_1, 'FinneanGlaiveStage1', '7a14a1b224cd173449cb7ffc77d5f65c', ENHANCEMENT_1],
      [FINNEAN_GLAIVE_2, 'FinneanGlaiveStage2', '7a14a1b224cd173449cb7ffc77d5f65c', ENHANCEMENT_3],
    ].map(([guid, asset, type, enhancement]) =>
      blueprint(guid!, 'BlueprintItemWeapon', asset!, 'Finnean the Talking Weapon', {
        m_Type: r(type!),
        m_Enchantments: [r(enhancement!)],
        Double: false,
        m_SecondWeapon: null,
      }),
    ),
    // The Bashing Shield and its armour half share a name; the half is worn only as part of the shield.
    blueprint(BASHING_SHIELD, 'BlueprintItemShield', 'BashingShield', 'Bashing Shield', {
      m_ArmorComponent: r(BASHING_SHIELD_ARMOR),
      m_WeaponComponent: null,
    }),
    blueprint(BASHING_SHIELD_ARMOR, 'BlueprintItemArmor', 'BashingShieldArmor', 'Bashing Shield', {
      m_Type: r('d1b05b901bab9524388ebfa0435902a6'),
      m_Enchantments: [],
    }),
  ].map(([guid, value]) => [guid, value as unknown as Blueprint]),
);

describe('Gear names (map ticket 29)', () => {
  const data = { blueprints, twins: deriveTwins(blueprints) };
  const gear = qualifyGear(data, []);
  const member = (guid: Guid) => gear.groups.flatMap((g) => g.members).find((m) => m.guid === guid);

  it('qualifies The Bound of Possibility by the Mythic path each cloak requires, the unrestricted one staying bare', () => {
    // Artifact_AeonCloakItem b24d6185acea1f949b026c3b58e47947 requires AeonMythicClass (EquipmentRestrictionClass).
    expect(gear.names.get(AEON_CLOAK)).toBe('The Bound of Possibility (Aeon)');
    expect(member(AEON_CLOAK)?.source).toBe('restriction');
    expect(gear.names.get(ANGEL_CLOAK)).toBe('The Bound of Possibility (Angel)');
    expect(member(DRAGON_CLOAK)?.source).toBe('bare');
  });

  it('collapses the Hellknight copy of a plain armour into one choice, offered as the lowest GUID', () => {
    // AdamantineFullplateStandartPlus2_Hellknight 29f9eb542c9985f4b904add8d843caf1 has the lower GUID.
    expect(data.twins.get(FULL_PLATE)).toBe(FULL_PLATE_HELLKNIGHT);
    expect(member(FULL_PLATE)).toMatchObject({ source: 'twin', twinOf: FULL_PLATE_HELLKNIGHT });
    expect(member(FULL_PLATE_HELLKNIGHT)?.source).toBe('bare');
    expect(gear.collisions.size).toBe(0);
  });

  it("tells relics of one name apart by their weapon type's name", () => {
    expect(gear.names.get(BATTLEAXE)).toBe('Executioner of Evil (Battleaxe)');
    expect(gear.names.get(HANDAXE)).toBe('Executioner of Evil (Handaxe)');
  });

  it("tells Finnean's stages apart by their weapon type and enhancement bonus together, so none are twins", () => {
    // FinneanBardicheStage1 carries Enhancement1 (WeaponEnhancementBonus 1), Stage2 Enhancement3: +1 in chapter 1 and
    // +3 in chapter 3 (GameFAQs items.txt). Neither the type nor the bonus alone tells the four apart.
    expect(data.twins.has(FINNEAN_BARDICHE_2)).toBe(false);
    expect(gear.names.get(FINNEAN_BARDICHE_1)).toBe('Finnean the Talking Weapon (Bardiche +1)');
    expect(gear.names.get(FINNEAN_BARDICHE_2)).toBe('Finnean the Talking Weapon (Bardiche +3)');
    expect(gear.names.get(FINNEAN_GLAIVE_1)).toBe('Finnean the Talking Weapon (Glaive +1)');
    expect(member(FINNEAN_GLAIVE_2)).toMatchObject({ source: 'type and enhancement', qualifier: 'Glaive +3' });
  });

  it('tells two stages of one weapon apart by their enhancement bonus alone', () => {
    const two = new Map([...blueprints].filter(([g]) => g !== FINNEAN_GLAIVE_1 && g !== FINNEAN_GLAIVE_2));
    const names = qualifyGear({ blueprints: two, twins: deriveTwins(two) }, []).names;
    expect(names.get(FINNEAN_BARDICHE_1)).toBe('Finnean the Talking Weapon (+1)');
    expect(names.get(FINNEAN_BARDICHE_2)).toBe('Finnean the Talking Weapon (+3)');
  });

  it("leaves out a shield's armour half, which is never worn on its own", () => {
    expect(member(BASHING_SHIELD)).toBeUndefined();
    expect(member(BASHING_SHIELD_ARMOR)).toBeUndefined();
  });

  it('refuses an item name override where the rules settle the name', () => {
    const o: Override = { change: 'name', target: AEON_CLOAK, qualifier: 'x', reason: 'why' };
    expect(qualifyGear(data, [o]).problems).toEqual([
      `Artifact_AeonCloakItem ${AEON_CLOAK}: a name override, but restriction settles it; remove it`,
    ]);
  });
});
