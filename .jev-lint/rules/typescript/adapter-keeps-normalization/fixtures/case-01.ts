type Stat = 'Strength' | 'Dexterity' | 'Constitution' | 'Intelligence' | 'Wisdom' | 'Charisma';

interface Build {
  readonly race?: string;
  readonly raceStat?: Stat;
  readonly levels: readonly string[];
}

type Edit =
  | { readonly kind: 'race'; readonly race?: string; readonly raceStat?: Stat }
  | { readonly kind: 'rename'; readonly name: string };

interface Data {
  readonly selectableRaceStat: ReadonlySet<string>;
}

export function apply(build: Build, edit: Edit): Build {
  if (edit.kind !== 'race') return build;
  const { race: _race, raceStat: _stat, ...rest } = build;
  return {
    ...rest,
    ...(edit.race !== undefined && { race: edit.race }),
    ...(edit.raceStat !== undefined && { raceStat: edit.raceStat }),
  };
}

export function applyWith(data: Data, build: Build, edit: Edit): Build {
  const after = apply(build, edit);
  if (edit.kind !== 'race' || after.race === undefined || data.selectableRaceStat.has(after.race)) return after;
  const { raceStat: _stat, ...settled } = after;
  return settled;
}

declare function encode(build: Build): Promise<string>;

export async function setStart(build: Build, edits: readonly Edit[]): Promise<string> {
  const after = edits.reduce(apply, build);
  return encode(after);
}
