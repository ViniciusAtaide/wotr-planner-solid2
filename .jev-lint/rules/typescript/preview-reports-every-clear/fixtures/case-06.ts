interface Pick {
  readonly slot: string;
  readonly feature: string;
}

interface Build {
  readonly picks: readonly Pick[];
  readonly ranks: readonly string[];
}

type Edit = { readonly kind: 'alignment'; readonly alignment: string };

type Cascade =
  | { readonly ok: false; readonly picks: readonly Pick[] }
  | {
      readonly ok: true;
      readonly cleared: readonly Pick[];
      readonly clearedSkills: readonly number[];
      readonly clearedRanks: readonly number[];
      readonly build: Build;
    };

interface AlignmentPreview {
  readonly picks: readonly string[];
  readonly skillLevels: number;
  readonly mythicRanks: number;
}

declare function cascade(build: Build, edit: Edit): Cascade;

export function previewAlignment(build: Build, edit: Edit): AlignmentPreview | undefined {
  const c = cascade(build, edit);
  if (!c.ok) return undefined;
  return {
    picks: c.cleared.map((p) => `${p.slot}: ${p.feature}`),
    skillLevels: c.clearedSkills.length,
    mythicRanks: c.clearedRanks.length,
  };
}
