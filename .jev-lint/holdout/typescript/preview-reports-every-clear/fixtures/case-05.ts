interface Pick {
  readonly slot: string;
  readonly feature: string;
}

interface Build {
  readonly picks: readonly Pick[];
}

type Edit = { readonly kind: 'scores'; readonly scores: Readonly<Record<string, number>> };

type Cascade =
  | { readonly ok: false }
  | {
      readonly ok: true;
      readonly cleared: readonly Pick[];
      readonly clearedSkills: readonly number[];
      readonly clearedRanks: readonly number[];
      readonly build: Build;
    };

declare function cascade(build: Build, edit: Edit): Cascade;

export function previewScores(build: Build, edit: Edit): readonly string[] {
  const c = cascade(build, edit);
  if (!c.ok || c.cleared.length === 0) return [];
  return [
    ...c.cleared.map((p) => `${p.slot}: ${p.feature}`),
    ...c.clearedSkills.map((level) => `L${level}: skill ranks`),
    ...c.clearedRanks.map((rank) => `M${rank}: Mythic rank`),
  ];
}
