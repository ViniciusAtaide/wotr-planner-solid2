interface Pick {
  readonly slot: string;
  readonly feature: string;
}

interface Build {
  readonly picks: readonly Pick[];
}

type Edit = { readonly kind: 'race'; readonly race: string };

interface Cleared {
  readonly cleared: readonly Pick[];
  readonly clearedSkills: readonly number[];
  readonly clearedRanks: readonly number[];
}

type Cascade = { readonly ok: false } | ({ readonly ok: true; readonly build: Build } & Cleared);

declare function cascade(build: Build, edit: Edit): Cascade;

function clearsInWords(c: Cleared): string[] {
  return [
    ...c.cleared.map((p) => `${p.slot}: ${p.feature}`),
    ...c.clearedSkills.map((level) => `skill ranks at L${level}`),
    ...c.clearedRanks.map((rank) => `Mythic rank ${rank}`),
  ];
}

export function previewRaceChange(build: Build, edit: Edit): readonly string[] | undefined {
  const c = cascade(build, edit);
  return c.ok ? clearsInWords(c) : undefined;
}
