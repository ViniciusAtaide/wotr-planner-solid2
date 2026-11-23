interface Slot {
  readonly place: string;
  readonly selection: string;
}

interface Pick {
  readonly slot: Slot;
  readonly feature: string;
}

interface Build {
  readonly picks: readonly Pick[];
  readonly ranks: readonly string[];
}

type Edit = { readonly kind: 'pick'; readonly slot: Slot; readonly feature: string };

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

export function previewPick(build: Build, edit: Edit): readonly string[] | undefined {
  const c = cascade(build, edit);
  if (!c.ok) return undefined;
  const levelPicks = c.cleared.filter((p) => p.slot.place.startsWith('L'));
  const mythicPicks = c.cleared.filter((p) => p.slot.place.startsWith('M'));
  return [
    ...levelPicks.map((p) => `${p.slot.place} ${p.slot.selection}: ${p.feature}`),
    ...c.clearedSkills.map((level) => `L${level}: skill ranks`),
    ...mythicPicks.map((p) => `${p.slot.place} ${p.slot.selection}: ${p.feature}`),
  ];
}
