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

type School = (typeof SCHOOLS)[number];

type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issue: string };

interface PickArgs {
  readonly feature: string;
  readonly param?: { readonly SpellSchool?: School };
}

function parsePickArgs(raw: unknown): Parsed<PickArgs> {
  if (typeof raw !== 'object' || raw === null) return { ok: false, issue: 'expected an object' };
  const { feature, param } = raw as { feature?: unknown; param?: { SpellSchool?: unknown } };
  if (typeof feature !== 'string') return { ok: false, issue: 'feature must be a GUID' };
  const school = param?.SpellSchool;
  if (school === undefined) return { ok: true, value: { feature } };
  if (!SCHOOLS.some((s) => s === school)) return { ok: false, issue: `unknown spell school ${String(school)}` };
  return { ok: true, value: { feature, param: { SpellSchool: school as School } } };
}

function encodeSchool(school: School): number {
  const index = SCHOOLS.indexOf(school);
  if (index < 0) throw new Error(`not a value the code knows: ${school}`);
  return index;
}

export function handlePick(raw: unknown): { code: string } | { refused: string } {
  const parsed = parsePickArgs(raw);
  if (!parsed.ok) return { refused: parsed.issue };
  const args = parsed.value;
  const school = args.param?.SpellSchool;
  return { code: `${args.feature}.${school === undefined ? 0 : encodeSchool(school) + 1}` };
}
