const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment'] as const;

class EncodeError extends Error {}

function encodeSchool(school: string): number {
  const index = SCHOOLS.findIndex((s) => s === school);
  if (index < 0) throw new EncodeError(`not a value the code knows: ${school}`);
  return index;
}

export function pick(args: {
  readonly feature: string;
  readonly param?: Readonly<Record<string, string>>;
}): { code: string } | { refused: string } {
  const school = args.param?.SpellSchool;
  try {
    return { code: `${args.feature}.${school === undefined ? 0 : encodeSchool(school) + 1}` };
  } catch (err) {
    if (err instanceof EncodeError) return { refused: `${school} is not a spell school.` };
    throw err;
  }
}
