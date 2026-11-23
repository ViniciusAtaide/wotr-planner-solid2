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

export function settle(data: Data, build: Build): Build {
  if (build.race === undefined || data.selectableRaceStat.has(build.race)) return build;
  const { raceStat: _stat, ...settled } = build;
  return settled;
}

export function applyWith(data: Data, build: Build, edit: Edit): Build {
  return settle(data, apply(build, edit));
}

declare function encode(build: Build): Promise<string>;

export async function setRace(data: Data, build: Build, race: string, raceStat?: string): Promise<string> {
  const raw = apply(build, raceStat === undefined ? { kind: 'race', race } : { kind: 'race', race, raceStat });
  return encode(settle(data, raw));
}
