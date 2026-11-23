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

export async function chooseVariantRace(
  data: Data,
  build: Build,
  race: string,
  raceStat: string,
): Promise<string | { readonly refused: string }> {
  if (!data.selectableRaceStat.has(race)) return { refused: `${race} doesn't let you choose where its +2 goes.` };
  return encode(apply(build, { kind: 'race', race, raceStat }));
}
