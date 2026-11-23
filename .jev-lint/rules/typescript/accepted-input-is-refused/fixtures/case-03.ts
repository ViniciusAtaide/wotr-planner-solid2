const CATEGORIES = new Map<string, number>([
  ['Longsword', 1],
  ['Dagger', 2],
  ['Greataxe', 3],
]);

type Param = Readonly<Record<string, string>>;

function encodeCategory(name: string): number | undefined {
  return CATEGORIES.get(name);
}

export function pick(args: { readonly feature: string; readonly param?: Param }): { code: string } | { refused: string } {
  const category = args.param?.WeaponCategory;
  if (category === undefined) return { code: `${args.feature}.0` };
  const encoded = encodeCategory(category);
  if (encoded === undefined) return { refused: `${category} is not a weapon category.` };
  return { code: `${args.feature}.${encoded}` };
}
