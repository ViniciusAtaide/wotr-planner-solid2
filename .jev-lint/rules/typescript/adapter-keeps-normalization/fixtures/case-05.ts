interface Build {
  readonly race?: string;
  readonly raceStat?: string;
  readonly scores: Readonly<Record<string, number>>;
}

type Edit =
  | { readonly kind: 'race'; readonly race: string; readonly raceStat?: string }
  | { readonly kind: 'scores'; readonly scores: Readonly<Record<string, number>> };

interface Data {
  readonly selectableRaceStat: ReadonlySet<string>;
}

export function apply(build: Build, edit: Edit): Build {
  if (edit.kind === 'scores') return { ...build, scores: edit.scores };
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

export async function setStart(
  data: Data,
  build: Build,
  args: { readonly race?: string; readonly raceStat?: string; readonly scores?: Readonly<Record<string, number>> },
): Promise<string> {
  const edits: Edit[] = [
    ...(args.race !== undefined ? [{ kind: 'race', race: args.race } as const] : []),
    ...(args.scores !== undefined ? [{ kind: 'scores', scores: args.scores } as const] : []),
  ];
  const settled = edits.reduce((b, edit) => applyWith(data, b, edit), build);
  const raceStat = args.raceStat ?? build.raceStat;
  if (settled.race === undefined || raceStat === undefined) return encode(settled);
  return encode(apply(settled, { kind: 'race', race: settled.race, raceStat }));
}
