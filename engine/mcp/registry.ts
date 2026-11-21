import type { Engine } from './tools';
import * as tools from './tools';

type Json = Record<string, unknown>;

export interface ToolDef {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Json;
  readonly run: (e: Engine, args: Json) => unknown;
}

const code = { type: 'string', description: 'A Build code (also a Share link: /#b=<code>).' };
const guid = { type: 'string', pattern: '^[0-9a-f]{32}$', description: 'A blueprint GUID.' };
const place = {
  type: 'object',
  description: 'A character level, or a Mythic rank.',
  oneOf: [
    { properties: { level: { type: 'integer', minimum: 1 } }, required: ['level'], additionalProperties: false },
    { properties: { rank: { type: 'integer', minimum: 1 } }, required: ['rank'], additionalProperties: false },
  ],
};
const slot = {
  type: 'object',
  description: 'A slot, as next_slots gives it: its place, its selection GUID and its index.',
  properties: { place, selection: guid, index: { type: 'integer', minimum: 0 } },
  required: ['place', 'selection', 'index'],
  additionalProperties: false,
};
const param = {
  type: 'object',
  description: 'The parameter of a parametrized feat: one of WeaponCategory, SpellSchool, StatType or Blueprint.',
};
const mode = {
  type: 'string',
  enum: ['strict', 'preview', 'cascade'],
  description:
    'strict refuses a change that breaks later picks; preview lists what cascade would clear; cascade clears them.',
};
const attribute = {
  type: 'string',
  enum: ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
};

const object = (properties: Json, required: readonly string[] = []): Json => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

export const TOOLS: readonly ToolDef[] = [
  {
    name: 'start_build',
    description: 'Start an empty Build, with an optional name of at most 60 characters. Returns its code.',
    inputSchema: object({ name: { type: 'string' } }),
    run: (e, a) => tools.start_build(e, a as Parameters<typeof tools.start_build>[1]),
  },
  {
    name: 'set_start',
    description:
      "Set the race, the race's chosen +2, the point buy and the alignment. Subrace, background and deity are level-1 picks.",
    inputSchema: object(
      {
        code,
        race: guid,
        raceStat: attribute,
        scores: object(
          Object.fromEntries(
            (attribute.enum as string[]).map((a) => [a, { type: 'integer', minimum: 7, maximum: 18 }]),
          ),
          attribute.enum as string[],
        ),
        alignment: {
          type: 'string',
          enum: [
            'LawfulGood',
            'NeutralGood',
            'ChaoticGood',
            'LawfulNeutral',
            'TrueNeutral',
            'ChaoticNeutral',
            'LawfulEvil',
            'NeutralEvil',
            'ChaoticEvil',
          ],
        },
      },
      ['code'],
    ),
    run: (e, a) => tools.set_start(e, a as Parameters<typeof tools.set_start>[1]),
  },
  {
    name: 'level_up',
    description:
      "Add a level of a class, or the next Mythic rank for a Mythic class. An archetype, at most one per class, applies at the class's first level; an ability increase comes at every fourth level. Returns the new code and the slots the level opened.",
    inputSchema: object(
      { code, class: guid, archetypes: { type: 'array', items: guid, maxItems: 1 }, increase: attribute },
      ['code', 'class'],
    ),
    run: (e, a) => tools.level_up(e, a as Parameters<typeof tools.level_up>[1]),
  },
  {
    name: 'next_slots',
    description: 'The open slots, in walk order: place, band and selection.',
    inputSchema: object({ code }, ['code']),
    run: (e, a) => tools.next_slots(e, a as Parameters<typeof tools.next_slots>[1]),
  },
  {
    name: 'options',
    description:
      "A slot's options: open ones first, 25 a page, each with its summary and what the Build holds that it builds on; closed ones as counts by reason, and with include_closed listed 25 a page too. pages says how many pages there are.",
    inputSchema: object(
      {
        code,
        slot,
        text: { type: 'string', description: 'Only options whose name holds this.' },
        page: { type: 'integer', minimum: 1 },
        include_closed: { type: 'boolean' },
      },
      ['code', 'slot'],
    ),
    run: (e, a) => tools.options(e, a as Parameters<typeof tools.options>[1]),
  },
  {
    name: 'pick',
    description: 'Put an option in a slot. A closed option is refused with its reason.',
    inputSchema: object({ code, slot, feature: guid, param, mode }, ['code', 'slot', 'feature']),
    run: (e, a) => tools.pick(e, a as Parameters<typeof tools.pick>[1]),
  },
  {
    name: 'set_skills',
    description:
      'A character level\'s skill ranks, replacing that level\'s. Name each skill as sheet shows it ("Mobility", "Knowledge (Arcana)") or by its game key ("SkillMobility").',
    inputSchema: object(
      {
        code,
        level: { type: 'integer', minimum: 1 },
        ranks: { type: 'object', additionalProperties: { type: 'integer' } },
      },
      ['code', 'level', 'ranks'],
    ),
    run: (e, a) => tools.set_skills(e, a as Parameters<typeof tools.set_skills>[1]),
  },
  {
    name: 'place_rank',
    description: 'Move a Mythic rank to a character level; notes when it is off the Expected level.',
    inputSchema: object(
      { code, rank: { type: 'integer', minimum: 1, maximum: 10 }, level: { type: 'integer', minimum: 1 } },
      ['code', 'rank', 'level'],
    ),
    run: (e, a) => tools.place_rank(e, a as Parameters<typeof tools.place_rank>[1]),
  },
  {
    name: 'equip',
    description: 'Put an item in a Gear place, or take it off when no item is given.',
    inputSchema: object(
      {
        code,
        place: {
          type: 'string',
          enum: [
            'Armor',
            'Head',
            'Glasses',
            'Neck',
            'Shoulders',
            'Shirt',
            'Belt',
            'Wrist',
            'Gloves',
            'Feet',
            'Ring1',
            'Ring2',
            'MainHand',
            'OffHand',
          ],
        },
        item: guid,
        mode,
      },
      ['code', 'place'],
    ),
    run: (e, a) => tools.equip(e, a as Parameters<typeof tools.equip>[1]),
  },
  {
    name: 'synergies',
    description:
      'Open options that build on what the Build holds (the prerequisite chain), at one slot or every open slot.',
    inputSchema: object({ code, slot }, ['code']),
    run: (e, a) => tools.synergies(e, a as Parameters<typeof tools.synergies>[1]),
  },
  {
    name: 'search',
    description:
      'Blueprints the game shows whose name holds the text, with GUID, name and summary line: 50 a page by name, with the total and the number of pages. An empty text lists a kind.',
    inputSchema: object(
      {
        text: { type: 'string' },
        kind: { type: 'string', description: 'A data kind: classes, archetypes, features, selections, races, items…' },
        page: { type: 'integer', minimum: 1 },
      },
      ['text'],
    ),
    run: (e, a) => tools.search(e, a as Parameters<typeof tools.search>[1]),
  },
  {
    name: 'explain',
    description:
      'A blueprint described: summary, prerequisites, what it grants, where it can be picked, what it needs and enables.',
    inputSchema: object({ guid }, ['guid']),
    run: (e, a) => tools.explain(e, a as Parameters<typeof tools.explain>[1]),
  },
  {
    name: 'sheet',
    description:
      "The Build's name and the numbers at a character level: ability scores, base attack, saves, skills, spellbooks.",
    inputSchema: object({ code, level: { type: 'integer', minimum: 1 } }, ['code']),
    run: (e, a) => tools.sheet(e, a as Parameters<typeof tools.sheet>[1]),
  },
  {
    name: 'compare',
    description:
      '2–4 Builds side by side at checkpoint levels: sheets, chain link counts and the first place they diverge.',
    inputSchema: object(
      {
        codes: { type: 'array', items: code, minItems: 2, maxItems: 4 },
        levels: { type: 'array', items: { type: 'integer', minimum: 1 } },
      },
      ['codes', 'levels'],
    ),
    run: (e, a) => tools.compare(e, a as Parameters<typeof tools.compare>[1]),
  },
];
