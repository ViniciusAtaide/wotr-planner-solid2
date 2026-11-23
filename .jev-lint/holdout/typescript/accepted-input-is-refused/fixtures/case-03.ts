const SELECTABLE = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
  'Universalist',
] as const;

const ENCODED = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
] as const;

function selectable(school: string): boolean {
  return SELECTABLE.some((s) => s === school);
}

function encodeSchool(school: string): number {
  const index = ENCODED.findIndex((s) => s === school);
  if (index < 0) throw new Error(`not a value the code knows: ${school}`);
  return index + 1;
}

export function pickFocus(args: {
  readonly feature: string;
  readonly param?: { readonly SpellSchool?: string };
}): { code: string } | { refused: string } {
  const school = args.param?.SpellSchool;
  if (school === undefined) return { refused: 'Spell Focus needs a school.' };
  if (!selectable(school)) return { refused: `${school} is not a school you can focus on.` };
  return { code: `${args.feature}.${encodeSchool(school)}` };
}
