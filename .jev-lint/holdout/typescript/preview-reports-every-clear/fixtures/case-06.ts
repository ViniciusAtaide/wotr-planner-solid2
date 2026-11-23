interface Pick {
  readonly slot: string;
  readonly feature: string;
}

interface Build {
  readonly picks: readonly Pick[];
}

type Edit = { readonly kind: 'archetypes'; readonly class: string; readonly archetypes: readonly string[] };

interface Clears {
  readonly cleared: readonly Pick[];
  readonly clearedSkills: readonly number[];
  readonly clearedRanks: readonly number[];
}

type Cascade = { readonly ok: false } | ({ readonly ok: true; readonly build: Build } & Clears);

const IN_WORDS: { readonly [K in keyof Clears]: (value: Clears[K][number]) => string } = {
  cleared: (p) => `${p.slot}: ${p.feature}`,
  clearedSkills: (level) => `L${level}: skill ranks`,
  clearedRanks: (rank) => `M${rank}: Mythic rank`,
};

declare function cascade(build: Build, edit: Edit): Cascade;

export function previewArchetypes(build: Build, edit: Edit): readonly string[] | undefined {
  const c = cascade(build, edit);
  if (!c.ok) return undefined;
  const kinds = Object.keys(IN_WORDS) as (keyof Clears)[];
  return kinds.flatMap((kind) => (c[kind] as readonly (Pick | number)[]).map((v) => IN_WORDS[kind](v as never)));
}
