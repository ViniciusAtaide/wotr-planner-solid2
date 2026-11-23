interface Pick {
  readonly slot: string;
  readonly feature: string;
}

interface Build {
  readonly picks: readonly Pick[];
}

type Edit = { readonly kind: 'pick'; readonly slot: string; readonly feature: string };

type Cascade =
  | { readonly ok: false; readonly picks: readonly Pick[] }
  | { readonly ok: true; readonly cleared: readonly Pick[]; readonly build: Build };

declare function cascade(build: Build, edit: Edit): Cascade;

export function previewEdit(build: Build, edit: Edit): { readonly clears: readonly string[] } | undefined {
  const c = cascade(build, edit);
  if (!c.ok) return undefined;
  return { clears: c.cleared.map((p) => `${p.slot}: ${p.feature}`) };
}
