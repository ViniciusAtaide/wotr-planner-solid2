import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { abilityScores, slotKey, type Build } from '../build';
import { decodeBuild, DecodeError, encodeBuild, keyHash, linkKeys, openBuild } from './codec';
import { loadData, type CheckedData } from '../load';
import { readDataDir } from '../data-dir';
import type { BlueprintFeature, Override } from '../data';
import { enforcer, jackInTheGreen } from '../gold';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const data = loadData(files.files, files.overrides);

const HUMAN = '0a5d473ead98b0646b94495af250fdc4';
const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
const BASIC = '247a4068296e8be42890143f451b4b45';
const DODGE = '97e216dbb46ae3c4faef90cf6bbe6fd5';
const TOUGHNESS = 'd09b20029e9abfe4480b356c92095623';
const TWO_HANDED = '84643e02a764bff4a9c1aba333a53c89';
const MUTATION_WARRIOR = '758e0061a077e54409a3bf0eb51511e5';

const inSlotOrder = (b: Build): Build => ({
  ...b,
  picks: [...b.picks].sort((x, y) => {
    const rank = (p: typeof x) => ('rank' in p.slot.place ? 1 : 0);
    const n = (p: typeof x) => ('rank' in p.slot.place ? p.slot.place.rank : p.slot.place.level);
    return (
      rank(x) - rank(y) ||
      n(x) - n(y) ||
      x.slot.selection.localeCompare(y.slot.selection) ||
      x.slot.index - y.slot.index
    );
  }),
});

const bytesOf = (code: string) =>
  Uint8Array.from(atob(code.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (code.length % 4)) % 4)), (c) =>
    c.charCodeAt(0),
  );

async function failsWith(code: string, reason: DecodeError['reason'], on: CheckedData = data): Promise<void> {
  await expect(decodeBuild(on, code)).rejects.toMatchObject({ reason });
}

describe('C: the Build code', () => {
  it('hashes a key with 32-bit FNV-1a', () => {
    expect(keyHash('a')).toBe(0xe40c292c);
    expect(keyHash('')).toBe(0x811c9dc5);
  });

  it('reads the frozen version-1 code', async () => {
    expect(await decodeBuild(data, 'AWOVUuuJfBSkJ3DDQ1R-2tWlBVxWgnqMDIyMAjx8XDxcjAyMzIwMDCCKgYVRlpGHgQEA')).toEqual({
      race: HUMAN,
      alignment: 'LawfulGood',
      scores: { Strength: 16, Dexterity: 12, Constitution: 14, Intelligence: 10, Wisdom: 12, Charisma: 10 },
      levels: [{ class: FIGHTER, skills: { SkillAthletics: 1 } }],
      picks: [
        {
          slot: { place: { level: 1 }, selection: BASIC, index: 0 },
          feature: '1e1f627d26ad36f43bbd26cc2bf8ac7e',
          param: { WeaponCategory: 'Longsword' },
        },
      ],
      gear: { MainHand: '6fd0a849531617844b195f452661b2cd' },
    });
  });

  it('finds no two GUIDs of one kind that share a hash', () => {
    expect(linkKeys(data).collisions).toEqual([]);
  });

  it.each([jackInTheGreen, enforcer])('round-trips $name unchanged', async (gold) => {
    const code = await encodeBuild(data, gold.build);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodeBuild(data, code)).toEqual(inSlotOrder(gold.build));
  });

  it('refuses what the encoder never writes', async () => {
    const small: Build = {
      race: HUMAN,
      levels: [{ class: FIGHTER }],
      picks: [{ slot: { place: { level: 1 }, selection: BASIC, index: 0 }, feature: DODGE }],
    };
    const code = await encodeBuild(data, small);
    expect(await decodeBuild(data, code)).toEqual(small);
    await failsWith('', 'empty');
    await failsWith('not base64!', 'base64');
    const version2 = bytesOf(code);
    version2[0] = 2;
    await failsWith(
      btoa(String.fromCharCode(...version2))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''),
      'version',
    );
    await failsWith('AQ', 'decompress');
    const greedy = await encodeBuild(data, {
      ...small,
      scores: abilityScores({
        Strength: 18,
        Dexterity: 18,
        Constitution: 10,
        Intelligence: 10,
        Wisdom: 10,
        Charisma: 10,
      }),
    });
    await failsWith(greedy, 'format');
    const twice = await encodeBuild(data, {
      ...small,
      picks: [...small.picks, { slot: { place: { level: 1 }, selection: BASIC, index: 0 }, feature: TOUGHNESS }],
    });
    await failsWith(twice, 'format');
    const twoArchetypes: Build = JSON.parse(
      JSON.stringify({ ...small, classChoices: { [FIGHTER]: { archetypes: [TWO_HANDED, MUTATION_WARRIOR] } } }),
    );
    await failsWith(await encodeBuild(data, twoArchetypes), 'format');
    const oneArchetype: Build = { ...small, classChoices: { [FIGHTER]: { archetypes: [TWO_HANDED] } } };
    expect(await decodeBuild(data, await encodeBuild(data, oneArchetype))).toEqual(oneArchetype);
    const blueprints = new Map(data.blueprints);
    blueprints.delete(DODGE);
    await failsWith(code, 'unknownKey', { ...data, blueprints });
  });

  describe('aliases (hand-built; no real one exists yet)', () => {
    const OLD = 'f6000000000000000000000000000001';
    const dodge = data.blueprints.get(DODGE) as BlueprintFeature;
    const oldData: CheckedData = { ...data, blueprints: new Map([...data.blueprints, [OLD, { ...dodge, guid: OLD }]]) };
    const alias = (target: string): Override => ({ change: 'alias', target, from: OLD, reason: 'test' });
    const withOld: Build = {
      race: HUMAN,
      levels: [{ class: FIGHTER }],
      picks: [{ slot: { place: { level: 1 }, selection: BASIC, index: 0 }, feature: OLD }],
    };

    it('reads an old GUID as the one GUID its alias names', async () => {
      const code = await encodeBuild(oldData, withOld);
      const aliased: CheckedData = { ...data, overrides: [...data.overrides, alias(DODGE)] };
      expect((await decodeBuild(aliased, code)).picks[0]?.feature).toBe(DODGE);
      await failsWith(code, 'unknownKey');
    });

    it('moves an old GUID several aliases name to the heir its slot takes, and counts it in the collision test', async () => {
      const code = await encodeBuild(oldData, withOld);
      const twoHeirs: CheckedData = { ...data, overrides: [...data.overrides, alias(DODGE), alias(TOUGHNESS)] };
      expect((await decodeBuild(twoHeirs, code)).picks[0]?.feature).toBe(OLD);
      const takes = (_b: Build, p: { feature: string }) => p.feature === TOUGHNESS;
      const opened = await openBuild(twoHeirs, code, takes);
      expect(opened.picks.map((p) => [slotKey(p.slot), p.feature])).toEqual([
        [slotKey({ place: { level: 1 }, selection: BASIC, index: 0 }), TOUGHNESS],
      ]);
      expect(linkKeys(twoHeirs).collisions).toEqual([]);
    });
  });

  it('opens a twin item as the one offered in its place (map 29)', async () => {
    const first = [...data.twins][0];
    expect(first).toBeDefined();
    const [twin, offered] = first ?? ['', ''];
    const code = await encodeBuild(data, { levels: [], picks: [], gear: { Belt: twin } });
    expect((await decodeBuild(data, code)).gear).toEqual({ Belt: offered });
  });
});
