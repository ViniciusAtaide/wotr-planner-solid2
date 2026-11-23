interface Pick {
  readonly slot: string;
  readonly feature: string;
}

interface Build {
  readonly picks: readonly Pick[];
  readonly ranks: readonly string[];
}

type Edit = { readonly kind: 'class'; readonly level: number; readonly class: string };

type Cascade =
  | { readonly ok: false; readonly picks: readonly Pick[] }
  | {
      readonly ok: true;
      readonly cleared: readonly Pick[];
      readonly clearedSkills: readonly number[];
      readonly clearedRanks: readonly number[];
      readonly build: Build;
    };

interface Preview {
  readonly preview: true;
  readonly picks: readonly Pick[];
  readonly skillLevels: readonly number[];
  readonly mythicRanks: readonly number[];
}

declare function cascade(build: Build, edit: Edit): Cascade;

export const previewClassChange = (build: Build, edit: Edit): Preview | undefined => {
  const c = cascade(build, edit);
  if (!c.ok) return undefined;
  return { preview: true, picks: c.cleared, skillLevels: c.clearedSkills, mythicRanks: c.clearedRanks };
};

export function describePreview(p: Preview): string {
  return `${p.picks.length} picks, skill ranks at ${p.skillLevels.length} levels, ${p.mythicRanks.length} Mythic ranks`;
}
