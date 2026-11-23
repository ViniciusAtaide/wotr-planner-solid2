const CATEGORY_CODES: readonly number[] = [3, 7, 12, 19, 24];

interface Args {
  readonly feature: string;
  readonly param?: { readonly WeaponCategory?: number };
}

export const equipSchema = {
  type: 'object',
  properties: { feature: { type: 'string' }, param: { type: 'object' } },
} as const;

function legalCategory(code: number): boolean {
  return Number.isInteger(code) && code > 0;
}

function writeCategory(code: number): string {
  const at = CATEGORY_CODES.indexOf(code);
  if (at === -1) throw new RangeError(`unknown weapon category ${code}`);
  return at.toString(16);
}

export const choose = (args: Args): { readonly code: string } | { readonly refused: string } => {
  const category = args.param?.WeaponCategory;
  if (category !== undefined && !legalCategory(category)) return { refused: 'Not a weapon category.' };
  return { code: `${args.feature}:${category === undefined ? '-' : writeCategory(category)}` };
};
