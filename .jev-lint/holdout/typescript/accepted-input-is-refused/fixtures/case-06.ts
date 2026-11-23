const SCHOOL_CODES: Readonly<Record<string, number>> = {
  Abjuration: 1,
  Conjuration: 2,
  Divination: 3,
  Enchantment: 4,
  Evocation: 5,
  Illusion: 6,
  Necromancy: 7,
  Transmutation: 8,
};

function isSchool(name: string): boolean {
  return Object.hasOwn(SCHOOL_CODES, name);
}

function writeSchool(name: string): string {
  const code = SCHOOL_CODES[name];
  if (typeof code !== 'number') throw new TypeError(`no code for school ${name}`);
  return code.toString(16);
}

export function pick(args: {
  readonly feature: string;
  readonly param?: { readonly SpellSchool?: string };
}): { code: string } | { refused: string } {
  const school = args.param?.SpellSchool;
  if (school === undefined) return { code: `${args.feature}.0` };
  if (!isSchool(school)) return { refused: `${school} is not a spell school.` };
  return { code: `${args.feature}.${writeSchool(school)}` };
}
