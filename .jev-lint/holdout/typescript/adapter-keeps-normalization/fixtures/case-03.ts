interface Build {
  readonly race?: string;
  readonly raceStat?: string;
  readonly alignment?: string;
}

type Edit =
  | { readonly kind: 'race'; readonly race: string; readonly raceStat?: string }
  | { readonly kind: 'alignment'; readonly alignment: string };

interface Data {
  readonly selectableRaceStat: ReadonlySet<string>;
}

export function apply(build: Build, edit: Edit): Build {
  if (edit.kind === 'alignment') return { ...build, alignment: edit.alignment };
  const { raceStat: _stat, ...rest } = build;
  return edit.raceStat === undefined ? { ...rest, race: edit.race } : { ...rest, race: edit.race, raceStat: edit.raceStat };
}

export function applyWith(data: Data, build: Build, edit: Edit): Build {
  const after = apply(build, edit);
  if (edit.kind !== 'race' || data.selectableRaceStat.has(edit.race)) return after;
  const { raceStat: _stat, ...settled } = after;
  return settled;
}

declare function encode(build: Build): Promise<string>;

export async function applyStart(data: Data, build: Build, edits: readonly Edit[]): Promise<string> {
  const [first, ...rest] = edits;
  if (first === undefined) return encode(build);
  return encode(rest.reduce(apply, applyWith(data, build, first)));
}
