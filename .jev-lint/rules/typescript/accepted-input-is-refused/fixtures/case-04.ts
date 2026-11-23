const STATS = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'] as const;

type Stat = (typeof STATS)[number];

export const pickSchema = {
  type: 'object',
  properties: {
    feature: { type: 'string' },
    param: {
      type: 'object',
      properties: { StatType: { type: 'string', enum: STATS } },
      additionalProperties: false,
    },
  },
  required: ['feature'],
} as const;

function isStat(value: unknown): value is Stat {
  return STATS.some((s) => s === value);
}

function encodeStat(stat: Stat): number {
  const index = STATS.indexOf(stat);
  if (index < 0) throw new Error(`not a value the code knows: ${stat}`);
  return index;
}

export function pick(args: { readonly feature: string; readonly param?: { readonly StatType?: unknown } }):
  | { code: string }
  | { refused: string } {
  const stat = args.param?.StatType;
  if (stat === undefined) return { code: `${args.feature}.0` };
  if (!isStat(stat)) return { refused: 'Choose one of the six ability scores.' };
  return { code: `${args.feature}.${encodeStat(stat) + 1}` };
}
