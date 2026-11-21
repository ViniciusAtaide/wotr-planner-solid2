import { describe, expect, it } from 'vitest';
import type { ComponentEntry, BlueprintEntry } from './allowlist';
import { reachable } from './import';
import { keptSet } from './keep-rule';
import { keepBlueprint, shortType, type FilterContext } from './filter';
import { displayName, neutralName, sharedKeyCollector } from './names';
import { applyPatch } from './overrides';
import { bool, enumOf, heldRefs, int, list, orDefault, orNull, ref } from './spec';

const g = (n: number) => `a${'0'.repeat(30)}${n}`;

function context(held: Record<string, string> = {}) {
  const problems: string[] = [];
  const dropped: string[] = [];
  const unlisted: string[] = [];
  const seen: string[] = [];
  const ctx: FilterContext = {
    problems,
    heldKind: (guid) => held[guid] as never,
    dumpType: () => 'BlueprintAbility',
    dropped: (at, guid) => dropped.push(`${at} ${guid}`),
    unlisted: (type) => unlisted.push(type),
    droppedComponent: (type) => dropped.push(type),
    droppedPart: (label) => dropped.push(label),
    seen: (owner, field, present) => seen.push(`${owner}.${field} ${present}`),
  };
  return { ctx, problems, dropped, unlisted, seen };
}

describe('specs', () => {
  it('check each value against its declared type', () => {
    const { ctx, problems } = context();
    expect(int.keep(3, 'a', ctx)).toBe(3);
    int.keep(1.5, 'b', ctx);
    bool.keep('yes', 'c', ctx);
    enumOf('Div2', 'Full').keep('Half', 'd', ctx);
    list(int).keep(null, 'e', ctx);
    expect(problems).toEqual([
      'b: expected an integer, found 1.5',
      'c: expected a boolean, found "yes"',
      'd: expected one of Div2, Full, found "Half"',
      'e: expected a list, found null',
    ]);
  });

  it('keep null only where the game leaves it null', () => {
    const { ctx, problems } = context();
    expect(orNull(list(int)).keep(null, 'a', ctx)).toBeNull();
    expect(problems).toEqual([]);
  });

  it('accept a reference only to a held blueprint of an expected kind', () => {
    const { ctx, problems } = context({ [g(1)]: 'features', [g(2)]: 'classes' });
    ref('features').keep(`!bp_${g(1)}`, 'a', ctx);
    ref('features').keep(`!bp_${g(2)}`, 'b', ctx);
    ref('features').keep(`!bp_${g(3)}`, 'c', ctx);
    expect(problems).toEqual([
      `b: names ${g(2)} (classes), expected one of features`,
      `c: names ${g(3)} (not held; the dump has a BlueprintAbility), expected one of features`,
    ]);
  });

  it('drop and count, in a held-references list, the references to blueprints the planner does not hold', () => {
    const { ctx, problems, dropped } = context({ [g(1)]: 'features' });
    expect(heldRefs('features').keep([`!bp_${g(1)}`, `!bp_${g(3)}`], 'x.m_Facts', ctx)).toEqual([`!bp_${g(1)}`]);
    expect(dropped).toEqual([`x.m_Facts ${g(3)}`]);
    expect(problems).toEqual([]);
  });
});

describe('keepBlueprint', () => {
  const entry: BlueprintEntry = {
    role: 'blueprint',
    type: 'BlueprintFeature',
    kind: 'features',
    name: 'm_DisplayName',
    fields: { Ranks: int, ExceptWhiteListed: orDefault(bool, false) },
    cite: [],
  };
  const components = new Map<string, ComponentEntry>([
    [
      'PrerequisiteFeature',
      { role: 'component', type: 'PrerequisiteFeature', fields: { Group: enumOf('All') }, cite: [] },
    ],
  ]);

  it('keeps allowlisted fields and components, fills defaults, and counts the rest', () => {
    const { ctx, problems, unlisted, seen } = context();
    const json = {
      $type: 'x, BlueprintFeature',
      Ranks: 1,
      HideInUI: true,
      Components: [
        { $type: 'y, PrerequisiteFeature', name: '$PrerequisiteFeature$1', Group: 'All', HideInUI: false },
        { $type: 'z, AddFacts', m_Facts: [] },
      ],
    };
    const kept = keepBlueprint(
      { guid: g(1), assetName: 'Thing', type: 'BlueprintFeature', json },
      entry,
      components,
      'Thing',
      ctx,
    );
    expect(kept).toEqual({
      $type: 'BlueprintFeature',
      guid: g(1),
      assetName: 'Thing',
      name: 'Thing',
      Ranks: 1,
      ExceptWhiteListed: false,
      Components: [{ $type: 'PrerequisiteFeature', Group: 'All' }],
    });
    expect(problems).toEqual([]);
    expect(unlisted).toEqual(['AddFacts']);
    expect(seen).toContain('BlueprintFeature.ExceptWhiteListed false');
  });

  it('reads the class name from a dump $type', () => {
    expect(shortType('5f2bdd25f161a0d4c97bee89cf923d77, BlueprintCharacterClass')).toBe('BlueprintCharacterClass');
  });
});

describe('applyPatch', () => {
  it('removes and replaces by JSON Pointer, leaving the input unchanged', () => {
    const json = { Components: [{ a: 1 }, { b: 2 }], Ranks: 1 };
    const problems: string[] = [];
    const patched = applyPatch(
      json,
      [
        { op: 'remove', path: '/Components/0' },
        { op: 'replace', path: '/Ranks', value: 3 },
      ],
      'x',
      problems,
    );
    expect(patched).toEqual({ Components: [{ b: 2 }], Ranks: 3 });
    expect(json.Components).toHaveLength(2);
    expect(problems).toEqual([]);
  });

  it('reports a path that does not resolve', () => {
    const problems: string[] = [];
    applyPatch({ Components: [] }, [{ op: 'remove', path: '/Components/4' }], 'x', problems);
    expect(problems).toEqual(["x: override path /Components/4 doesn't resolve"]);
  });
});

describe('reachable', () => {
  it('follows every reference from the roots, ignoring references the dump lacks', () => {
    const refs = new Map([
      [g(1), [g(2)]],
      [g(2), [g(3), g(9)]],
      [g(3), [g(1)]],
      [g(4), [g(1)]],
    ]);
    expect(reachable([g(1)], refs)).toEqual(new Set([g(1), g(2), g(3)]));
  });
});

describe('the keep rule (tickets 02b and 02d)', () => {
  const id = (n: number) => `c${String(n).padStart(31, '0')}`;
  const bp = (n: number, $type: string, fields: object = {}, Components: readonly object[] = []) =>
    [id(n), { $type, guid: id(n), assetName: `B${n}`, Components, ...fields }] as const;
  const r = (n: number) => `!bp_${id(n)}`;
  const addFacts = (...facts: number[]) => ({ $type: 'AddFacts', m_Facts: facts.map(r) });
  const blueprints = new Map<string, never>(
    [
      bp(1, 'BlueprintRoot', {
        Progression: {
          m_FeatsProgression: null,
          m_BasicFeatSelection: null,
          m_DeitySelection: null,
          m_CharacterClasses: [r(2)],
          m_CharacterMythics: [],
          m_MythicStartingClass: null,
          m_MythicLegenFake: null,
          m_MythicLegen: null,
          m_CharacterRaces: [],
        },
      }),
      bp(2, 'BlueprintCharacterClass', { m_Progression: r(3), m_Archetypes: [], m_Spellbook: r(4) }),
      bp(3, 'BlueprintProgression', { LevelEntries: [{ Level: 1, m_Features: [r(6), r(12), r(15)] }] }),
      bp(4, 'BlueprintSpellbook', { m_SpellsPerDay: r(5) }),
      bp(5, 'BlueprintSpellsTable'),
      bp(6, 'BlueprintFeature', {}, [{ $type: 'PrerequisiteFeature', m_Feature: r(7) }]),
      bp(7, 'BlueprintFeature'),
      bp(8, 'BlueprintFeature'),
      bp(9, 'BlueprintItemEquipmentRing', { m_Enchantments: [r(10)] }),
      bp(10, 'BlueprintEquipmentEnchantment', {}, [{ $type: 'AddUnitFeatureEquipment', m_Feature: r(11) }]),
      bp(11, 'BlueprintFeature'),
      bp(12, 'BlueprintFeature', {}, [addFacts(13, 17)]),
      bp(13, 'BlueprintBuff', {}, [addFacts(14)]),
      bp(14, 'BlueprintBuff', {}, [addFacts(16)]),
      bp(16, 'BlueprintFeature'),
      bp(17, 'BlueprintBuff', {}, [addFacts(18)]),
      bp(18, 'BlueprintBuff'),
      bp(15, 'BlueprintFeature', {}, [
        addFacts(19, 23),
        { $type: 'BuffExtraEffects', m_CheckedBuff: r(20), m_ExtraEffectBuff: r(21), m_ExceptionFact: null },
      ]),
      bp(19, 'BlueprintActivatableAbility', { m_Buff: r(20) }),
      bp(20, 'BlueprintBuff'),
      bp(21, 'BlueprintBuff', {}, [addFacts(22)]),
      bp(22, 'BlueprintFeature'),
      bp(23, 'BlueprintActivatableAbility', { m_Buff: r(24) }),
      bp(24, 'BlueprintBuff', {}, [addFacts(25)]),
      bp(25, 'BlueprintFeature'),
    ].map(([guid, value]) => [guid, value as never]),
  );
  const kept = keptSet({ blueprints }, new Map([[id(15), new Set([id(20)])]]));

  it("keeps G's reach from the root, and what the kept fields name (a spellbook, its table, a prerequisite's target)", () => {
    for (const n of [1, 2, 3, 6, 4, 5, 7]) expect(kept.has(id(n)), `B${n}`).toBe(true);
  });

  it("keeps an item, and the enchantment and feature it gives (G's reach from the Gear)", () => {
    for (const n of [9, 10, 11]) expect(kept.has(id(n)), `B${n}`).toBe(true);
  });

  it('trims what nothing kept reaches or names', () => {
    expect(kept.has(id(8))).toBe(false);
  });

  it('keeps the Grant carriers on a grant path to a kept fact, through a chain of them', () => {
    for (const n of [13, 14, 16]) expect(kept.has(id(n)), `B${n}`).toBe(true);
  });

  it('trims a Grant carrier that leads to nothing kept', () => {
    for (const n of [17, 18]) expect(kept.has(id(n)), `B${n}`).toBe(false);
  });

  it('keeps a toggle through the buff a kept BuffExtraEffects checks, and what that adds', () => {
    for (const n of [19, 20, 21, 22]) expect(kept.has(id(n)), `B${n}`).toBe(true);
  });

  it("never counts a toggle's buff as held unless a kept field names it", () => {
    for (const n of [23, 24, 25]) expect(kept.has(id(n)), `B${n}`).toBe(false);
  });

  it('keeps a carrier first reached through a kept toggle buff, whatever order the rule meets the blueprints in', () => {
    const root = blueprints.get(id(1)) as unknown as { Progression: object };
    for (const order of [
      [31, 32],
      [32, 31],
    ]) {
      const late = new Map<string, never>(
        [
          bp(1, 'BlueprintRoot', { Progression: { ...root.Progression, m_CharacterClasses: [r(30)] } }),
          bp(30, 'BlueprintCharacterClass', { m_Progression: r(36), m_Archetypes: [] }),
          bp(36, 'BlueprintProgression', { LevelEntries: [{ Level: 1, m_Features: order.map(r) }] }),
          bp(31, 'BlueprintFeature'),
          bp(32, 'BlueprintFeature', {}, [
            addFacts(33),
            { $type: 'BuffExtraEffects', m_CheckedBuff: r(34), m_ExtraEffectBuff: r(37), m_ExceptionFact: null },
          ]),
          bp(33, 'BlueprintActivatableAbility', { m_Buff: r(34) }),
          bp(34, 'BlueprintBuff', {}, [addFacts(35)]),
          bp(35, 'BlueprintBuff', {}, [addFacts(31)]),
          bp(37, 'BlueprintBuff'),
        ].map(([guid, value]) => [guid, value as never]),
      );
      const keptLate = keptSet({ blueprints: late }, new Map([[id(32), new Set([id(34)])]]));
      for (const n of [31, 32, 33, 34, 35]) expect(keptLate.has(id(n)), `B${n}, order ${order}`).toBe(true);
    }
  });
});

describe('displayName', () => {
  const strings = new Map([
    ['k1', 'Power Attack'],
    ['k2', 'Fighter'],
    ['k3', '  '],
  ]);

  it('resolves a field by its own key, else by its shared string', () => {
    expect(displayName({ m_Key: 'k1', Shared: null }, strings)).toBe('Power Attack');
    expect(displayName({ m_Key: '', Shared: { assetguid: 'x', stringkey: 'k2' } }, strings)).toBe('Fighter');
  });

  it('gives no name to a blueprint whose field is empty or blank', () => {
    expect(displayName({ m_Key: '', Shared: null }, strings)).toBeUndefined();
    expect(displayName({ m_Key: 'k3', Shared: null }, strings)).toBeUndefined();
    expect(displayName(undefined, strings)).toBeUndefined();
  });

  const ASSET = '57a22bffe5504154dac129a31bb00f64';
  const reference = (key: string) =>
    JSON.stringify({ LocalizedName: { m_Key: '', Shared: { assetguid: ASSET, stringkey: key } } }, null, 2);
  const lostKey = { m_Key: '', Shared: { assetguid: ASSET, stringkey: '' } };

  it('names a field whose shared reference lost its key by the key every other reference to that asset gives', () => {
    const shared = sharedKeyCollector();
    shared.add(reference('k2'));
    shared.add(reference('k2'));
    shared.add(reference(''));
    expect(displayName(lostKey, strings, shared.keys())).toBe('Fighter');
  });

  it('names nothing from an asset whose references disagree on its key', () => {
    const shared = sharedKeyCollector();
    shared.add(reference('k1'));
    shared.add(reference('k2'));
    expect(shared.keys().has(ASSET)).toBe(false);
    expect(displayName(lostKey, strings, shared.keys())).toBeUndefined();
  });
});

describe('neutralName', () => {
  it('writes a template name in a neutral form', () => {
    expect(neutralName('{Name}, L{mf|ord|ady} of Death')).toBe('Lord/Lady of Death');
  });

  it('leaves a plain name alone, and refuses a token it does not know', () => {
    expect(neutralName('Power Attack')).toBeUndefined();
    expect(() => neutralName('{Race} Heritage')).toThrow();
  });
});
