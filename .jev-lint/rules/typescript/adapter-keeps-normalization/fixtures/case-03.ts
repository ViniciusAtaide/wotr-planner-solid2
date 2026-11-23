interface Build {
  readonly name?: string;
  readonly race?: string;
  readonly raceStat?: string;
}

type Edit =
  | { readonly kind: 'race'; readonly race: string }
  | { readonly kind: 'rename'; readonly name?: string };

interface Data {
  readonly selectableRaceStat: ReadonlySet<string>;
}

export function apply(build: Build, edit: Edit): Build {
  if (edit.kind === 'rename') {
    const { name: _name, ...rest } = build;
    return edit.name === undefined ? rest : { ...rest, name: edit.name };
  }
  return { ...build, race: edit.race };
}

export function applyWith(data: Data, build: Build, edit: Edit): Build {
  const after = apply(build, edit);
  if (edit.kind !== 'race' || data.selectableRaceStat.has(edit.race)) return after;
  const { raceStat: _stat, ...settled } = after;
  return settled;
}

declare function encode(build: Build): Promise<string>;

export async function rename(build: Build, name: string | undefined): Promise<string> {
  const edit: Edit = name === undefined ? { kind: 'rename' } : { kind: 'rename', name };
  return encode(apply(build, edit));
}
