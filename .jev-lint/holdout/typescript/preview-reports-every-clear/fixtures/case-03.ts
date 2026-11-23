interface Pick {
  readonly slot: string;
  readonly feature: string;
}

interface Build {
  readonly picks: readonly Pick[];
  readonly ranks: readonly string[];
}

type Edit = { readonly kind: 'rankClass'; readonly rank: number; readonly class: string };

type Cascade =
  | { readonly ok: false; readonly picks: readonly Pick[] }
  | {
      readonly ok: true;
      readonly cleared: readonly Pick[];
      readonly clearedSkills: readonly number[];
      readonly clearedRanks: readonly number[];
      readonly build: Build;
    };

declare function cascade(build: Build, edit: Edit): Cascade;

export const previewRankChange = (build: Build, edit: Edit) => {
  const c = cascade(build, edit);
  if (!c.ok) return { refused: c.picks.length };
  return {
    preview: true,
    clears: [...c.cleared.map((p) => `${p.slot}: ${p.feature}`), ...c.clearedSkills.map((l) => `L${l} skills`)],
  };
};
