interface Item {
  readonly guid: string;
  readonly place: string;
}

interface Build {
  readonly gear: Readonly<Record<string, string>>;
  readonly enchantments: readonly string[];
}

type Unequip =
  | { readonly ok: false; readonly reason: string }
  | {
      readonly ok: true;
      readonly removed: readonly Item[];
      readonly lostEnchantments: readonly string[];
      readonly build: Build;
    };

declare function unequip(build: Build, place: string): Unequip;

export function equipPreview(build: Build, place: string): readonly string[] {
  const u = unequip(build, place);
  if (!u.ok) return [u.reason];
  return u.removed.map((item) => `${item.place}: ${item.guid}`);
}
