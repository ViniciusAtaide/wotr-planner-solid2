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

function knownSchool(school: string): boolean {
  const wanted = school.trim().toLowerCase();
  return SCHOOLS.some((s) => s.toLowerCase() === wanted);
}

function encodeSchool(school: string): number {
  const index = SCHOOLS.findIndex((s) => s === school);
  if (index < 0) throw new Error(`not a value the code knows: ${school}`);
  return index;
}

export function pick(args: { readonly feature: string; readonly param?: Param }): { code: string } | { refused: string } {
  const school = args.param?.SpellSchool;
  if (school !== undefined && !knownSchool(school)) return { refused: `${school} is not a spell school.` };
  return { code: `${args.feature}.${school === undefined ? 0 : encodeSchool(school) + 1}` };
}
