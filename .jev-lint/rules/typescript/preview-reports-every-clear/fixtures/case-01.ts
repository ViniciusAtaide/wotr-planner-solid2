interface Pick {
  readonly slot: string;
  readonly feature: string;
}

interface Build {
  readonly picks: readonly Pick[];
  readonly skills: Readonly<Record<number, Readonly<Record<string, number>>>>;
  readonly ranks: readonly string[];
}

type Edit = { readonly kind: 'pick'; readonly slot: string; readonly feature: string };

type Cascade =
  | { readonly ok: false; readonly picks: readonly Pick[] }
  | {
      readonly ok: true;
      readonly cleared: readonly Pick[];
      readonly clearedSkills: readonly number[];
      readonly clearedRanks: readonly number[];
      readonly build: Build;
    };

type Mode = 'strict' | 'preview' | 'cascade';

type Result =
  | { readonly build: Build }
  | { readonly refused: readonly string[] }
  | { readonly preview: true; readonly clears: readonly string[] };

declare function cascade(build: Build, edit: Edit): Cascade;
declare function strict(build: Build, edit: Edit): Result;

function pickInWords(p: Pick): string {
  return `${p.slot}: ${p.feature}`;
}

export function withMode(build: Build, edit: Edit, mode: Mode): Result {
  if (mode === 'strict') return strict(build, edit);
  const c = cascade(build, edit);
  if (!c.ok) return { refused: c.picks.map(pickInWords) };
  if (mode === 'preview') return { preview: true, clears: c.cleared.map(pickInWords) };
  return { build: c.build };
}
