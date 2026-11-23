interface Build {
  readonly race?: string;
  readonly raceStat?: string;
  readonly levels: readonly string[];
}

type Edit = { readonly kind: 'race'; readonly race: string; readonly raceStat?: string };

interface Data {
  readonly selectableRaceStat: ReadonlySet<string>;
}

type Verdict = { readonly ok: true; readonly build: Build } | { readonly ok: false; readonly breaks: readonly string[] };

export function apply(build: Build, edit: Edit): Build {
  const { raceStat: _stat, ...rest } = build;
  return edit.raceStat === undefined ? { ...rest, race: edit.race } : { ...rest, race: edit.race, raceStat: edit.raceStat };
}

export function applyWith(data: Data, build: Build, edit: Edit): Build {
  const after = apply(build, edit);
  if (data.selectableRaceStat.has(edit.race)) return after;
  const { raceStat: _stat, ...settled } = after;
  return settled;
}

declare function breaksBetween(before: Build, after: Build): readonly string[];
declare function encode(build: Build): Promise<string>;

export function allows(data: Data, build: Build, edit: Edit): Verdict {
  const raw = apply(build, edit);
  const settled = applyWith(data, build, edit);
  const breaks = breaksBetween(build, raw);
  return breaks.length === 0 ? { ok: true, build: settled } : { ok: false, breaks };
}

export async function changeRace(data: Data, build: Build, edit: Edit): Promise<string | readonly string[]> {
  const verdict = allows(data, build, edit);
  return verdict.ok ? encode(verdict.build) : verdict.breaks;
}
