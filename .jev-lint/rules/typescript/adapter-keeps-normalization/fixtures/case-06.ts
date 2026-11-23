interface Build {
  readonly race?: string;
  readonly raceStat?: string;
}

type Edit = { readonly kind: 'race'; readonly race: string; readonly raceStat?: string };

interface Data {
  readonly selectableRaceStat: ReadonlySet<string>;
}

export function apply(build: Build, edit: Edit): Build {
  return edit.raceStat === undefined ? { race: edit.race } : { race: edit.race, raceStat: edit.raceStat };
}

export function applyWith(data: Data, build: Build, edit: Edit): Build {
  const after = apply(build, edit);
  if (data.selectableRaceStat.has(edit.race)) return after;
  const { raceStat: _stat, ...settled } = after;
  return settled;
}

declare function encode(build: Build): Promise<string>;

export async function changeRace(data: Data, build: Build, edit: Edit): Promise<string | { readonly refused: string }> {
  const wantsStat = edit.raceStat !== undefined || build.raceStat !== undefined;
  if (wantsStat && !data.selectableRaceStat.has(edit.race)) {
    return { refused: 'Clear the racial ability choice before changing to a race with a fixed bonus.' };
  }
  return encode(apply(build, edit));
}
