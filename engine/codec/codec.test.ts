import { fileURLToPath } from 'node:url';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { abilityScores, childSlot, slotKey, toBuildName, type Build, type BuildName } from '../build';
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
  picks: [...b.picks].sort((x, y) =>
    slotKey(x.slot) < slotKey(y.slot) ? -1 : slotKey(x.slot) > slotKey(y.slot) ? 1 : 0,
  ),
});

const bytesOf = (code: string) =>
  Uint8Array.from(atob(code.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (code.length % 4)) % 4)), (c) =>
    c.charCodeAt(0),
  );

async function failsWith(code: string, reason: DecodeError['reason'], on: CheckedData = data): Promise<void> {
  await expect(decodeBuild(on, code)).rejects.toMatchObject({ reason });
}

describe('C: the Build code', { timeout: 30_000 }, () => {
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
    expect(inSlotOrder(await decodeBuild(data, code))).toEqual(inSlotOrder(gold.build));
  });

  describe('version 1 codes, read under the old numbering (map 35)', () => {
    const V1_JACK =
      'AavojMxLOso3eTs1scXZScdA2CBmxht8GKS2LeLznRseovKqvpv3PTqRNY9L5GW7FdNxtiWRUcEzGT5pgdxnv2DJ5NKLO23ep9y4l_vne6jC4aoaEA4_qPUVpNdu69ZZIPrI5ydgenXfiv2i95e1NJwJ2wrCOqWv54LEGzy2BIFoY0cbdxCtl8schKxO5ccdH5D4Asl7j0H0Bt-7ySC6V2VDH0wdiF26LPsbiP2zT61gYt7m36-K_yz2SLKrOKXz9qtLXvZfEPvcLabHL5c7udWZTd0KYm8rrZs_50DzOZA8iP0wXMrnHtttJZC85uqVF0Dic24Iq4LEFwbUdIHEvSV_tILYO6xO52numxgZ9EKuFKTu9KJJO0Hq9q2ptwGpi60qKwKJ67fdKQaJWx_6bAUS75xwvI-RgZmRh4-Ph0NQhIGZgZGFkYuRgQlEw3hsKDx6yXGxsXNy8_ELCAoKMzJqMzAyM7AwIJNMjMysKELMMDYzmGRlZmBhYmVgB3PYwdIQNieY5AaTvDCSGcbmh2gTBHOEwRJwkgVKMjIyg1wMJ5kZGJnA4kxgNth-EAnyD5gNIVnBJBtYnA1kDQuYYmBkRyI54CQTKyPYqYxcCJKBgQEA';
    const V1_ENFORCER =
      'AZvMeO3e2fCrB7inkouDbmZdRcaPgvQELM5OOgbCBjEz3uDDIPVLl0VZg_R8VP9sADKPfV2Z0A0PUfn0_vxwh-d3vt7f81vy0YmseVwiL9ubvY-7gNw7R3vSBhAGyU_--lOzffF-2dw_30MVDlfVgHDVMffCVfedWB96fWb88UI7vp7N_BmMDTLbZensOyB9PckXCkH8Bo8tQfFPZqvFHcuJAuF-xUWWIMzh9c4bJN_LmH8VpH6j04unIHVRkrFyIPEMtfNuIHGWnLg0EL_2x7Qap5tcH2Iuq-eB8GLptJhfTKncIDGQ_LRVjsUg9WvyWn6CxJ__lOoFiav8uOMDohdNUD9fcO_uuYwa60cRBn4sKu1_wOYevNh4FCQuWL_wWefaxA2FGw0lJuZt_n0kvlvLJS_7r9QX-Zl1ZlO3-tSazwXxK9V4DB-GS_n8ybj5GST-1fG5Ckh8848T10HiCwNqukDidS2emSB2UlrLd819EyN3WJ3OA6lrUS6cDVJnfeiz1blbTI9nnd5oD1IPYoPk9z6rfg6Sv82hVgUS33pe58gLJ7EMRkZmRgEBPi4OHhEGZhCHhRGdZsQhTqw8EyH9rAyMEBYnIwMRbJh9XGzsnNx8_AKCgiLMjIyMZgyMzAwsDMgkEyMzKwMzmMOMJAFnM4HZTEhsZjCbBUyygkk2sDicZGFgYEciOcAkJzMDC6MUAxeYww0mecAaeJDYvGA2hOQDk_xgUhCJFAKTwkikCIhkZGRmYAKTLAyMYOcygh3KyAInGaUYwe5lBLuUkQ3GZmFgZEciOVBJZgZGTjCbC4lkY2QAAA';
    const V1_TWO_SKILL_FOCUS =
      'AeOWUuuJfBSkJ3DDQ1SeqUPBAkSDxEBsEP5Uv18WRMulTpzGyMDAAMIMLAyMzAzMDEyMzKwMzAwgDguIZGQBSQIA';
    const SKILL_FOCUS = 'c9629ef9eebb88b479b2fbc5e836656a';
    const LORE_RELIGION = 'c541f80af8d0af4498e1abb6025780c7';
    const ATHLETICS = '9db907332bdaec1468cff3a99efef5b4';

    it.each([
      [V1_JACK, jackInTheGreen],
      [V1_ENFORCER, enforcer],
    ] as const)('opens a gold Build written by version 1 to the same Build (%#)', async (code, gold) => {
      expect(inSlotOrder(await decodeBuild(data, code))).toEqual(inSlotOrder(gold.build));
    });

    it('gives each sub-choice of a version 1 code to the parent the old walk paired it with', async () => {
      const levelFeat = { place: { level: 1 }, selection: BASIC, index: 0 };
      const humanFeat = { place: { level: 1 }, selection: BASIC, index: 0, from: HUMAN };
      const opened = await decodeBuild(data, V1_TWO_SKILL_FOCUS);
      const under = (parent: typeof levelFeat) =>
        opened.picks.find((p) => slotKey(p.slot) === slotKey(childSlot(parent, SKILL_FOCUS)))?.feature;
      expect(under(levelFeat)).toBe(LORE_RELIGION);
      expect(under(humanFeat)).toBe(ATHLETICS);
      const again = await decodeBuild(data, await encodeBuild(data, opened));
      expect(inSlotOrder(again)).toEqual(inSlotOrder(opened));
      expect(bytesOf(await encodeBuild(data, opened))[0]).toBe(2);
    });
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
    const version3 = bytesOf(code);
    version3[0] = 3;
    await failsWith(
      btoa(String.fromCharCode(...version3))
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

  describe("the Build's name (ticket 11)", () => {
    const small: Build = { race: HUMAN, levels: [{ class: FIGHTER }], picks: [] };
    const named = (name: string): Build => ({ ...small, name: toBuildName(name) as BuildName });
    const toCode = (bytes: Uint8Array) =>
      btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    const reworked = async (build: Build, change: (body: Uint8Array) => Uint8Array): Promise<string> => {
      const bytes = bytesOf(await encodeBuild(data, build));
      const body = change(new Uint8Array(inflateRawSync(bytes.subarray(1))));
      return toCode(Uint8Array.from([bytes[0] ?? 0, ...deflateRawSync(body)]));
    };
    const withName = (raw: Uint8Array) => (body: Uint8Array) => Uint8Array.from([...body, raw.length, ...raw]);

    it('round-trips a Build with a name, and one without, exactly', async () => {
      for (const build of [small, named('Sosiel the Kind'), named('Ærendil ⚔ 龍'), named('x'.repeat(60))])
        expect(await decodeBuild(data, await encodeBuild(data, build))).toEqual(build);
    });

    it('writes nothing for a nameless Build, so every code written so far opens nameless', async () => {
      const nameless = bytesOf(await encodeBuild(data, small));
      const body = inflateRawSync(nameless.subarray(1));
      const namedBody = inflateRawSync(bytesOf(await encodeBuild(data, named('Seelah'))).subarray(1));
      expect([...namedBody.subarray(0, body.length)]).toEqual([...body]);
      expect([...namedBody.subarray(body.length)]).toEqual([6, ...new TextEncoder().encode('Seelah')]);
      expect(
        await decodeBuild(data, 'AWOVUuuJfBSkJ3DDQ1R-2tWlBVxWgnqMDIyMAjx8XDxcjAyMzIwMDCCKgYVRlpGHgQEA'),
      ).not.toHaveProperty('name');
    });

    it('keeps names to trimmed text of 1 to 60 characters', () => {
      expect(toBuildName('  Ember  ')).toBe('Ember');
      expect(toBuildName('   ')).toBeUndefined();
      expect(toBuildName('x'.repeat(60))).toBe('x'.repeat(60));
      expect(toBuildName('x'.repeat(61))).toBeUndefined();
      expect(toBuildName('龍'.repeat(60))).toBe('龍'.repeat(60));
    });

    it('refuses anything after the name, and a name the planner never writes', async () => {
      const utf8 = (s: string) => new TextEncoder().encode(s);
      await failsWith(await reworked(named('Arue'), (b) => Uint8Array.from([...b, 0])), 'format');
      await failsWith(await reworked(small, withName(utf8(' Arue'))), 'format');
      await failsWith(await reworked(small, withName(utf8(''))), 'format');
      await failsWith(await reworked(small, withName(utf8('x'.repeat(61)))), 'format');
      await failsWith(await reworked(small, withName(Uint8Array.from([0xff, 0xfe]))), 'format');
      await failsWith(await reworked(small, (b) => Uint8Array.from([...b, 9, 65])), 'format');
      expect(await decodeBuild(data, await reworked(small, withName(utf8('Arue'))))).toEqual(named('Arue'));
    });
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
