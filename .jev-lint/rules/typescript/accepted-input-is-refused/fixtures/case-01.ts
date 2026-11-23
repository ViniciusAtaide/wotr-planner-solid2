const SCHOOLS = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
] as const;

type Param = Readonly<Record<string, string>>;

export const pickSchema = {
  type: 'object',
  properties: {
    feature: { type: 'string' },
    param: { type: 'object', description: 'The parameter of a parametrized feat, such as SpellSchool.' },
  },
  required: ['feature'],
} as const;

function canSelectParam(param: Param): boolean {
  return param.SpellSchool !== 'None' && param.SpellSchool !== 'Universalist';
}

function encodeSchool(school: string): number {
  const index = SCHOOLS.findIndex((s) => s === school);
  if (index < 0) throw new Error(`not a value the code knows: ${school}`);
  return index;
}

export function pick(args: { readonly feature: string; readonly param?: Param }): { code: string } | { refused: string } {
  if (args.param !== undefined && !canSelectParam(args.param)) return { refused: 'That school can’t be chosen.' };
  const school = args.param?.SpellSchool;
  return { code: `${args.feature}.${school === undefined ? 0 : encodeSchool(school) + 1}` };
}
