import { createMemo, Show } from 'solid-js';

import { ChoiceList, currentFirst, type ChoiceRow } from './ChoiceList';
import { backgroundChoices, raceChoices, type FlatChoice } from './flat-choices';
import { closedToggle, type TrailApi } from './steps';
import { backgroundSlot } from './trail-state';

export interface CharacterStepProps {
  readonly trail: TrailApi;
}

function rowsOf(trail: TrailApi, choices: readonly FlatChoice[], title: (name: string) => string): ChoiceRow[] {
  return currentFirst(
    choices.map((c) => ({
      key: c.key,
      name: c.name,
      open: c.open,
      note: c.note,
      reasons: c.reasons,
      current: c.current,
      take: () => {
        if (!c.current) trail.editAll(c.edits, title(c.name));
      },
    })),
  );
}

export function RaceStep(props: CharacterStepProps) {
  const planner = () => props.trail.planner;
  const rows = createMemo(() =>
    rowsOf(props.trail, raceChoices(planner().engine, planner().build(), planner().walked()), (n) => `Race ${n}`),
  );
  return (
    <ChoiceList label="Filter races and heritages by name" rows={rows()} closed={closedToggle(props.trail, 'race')} />
  );
}

export function BackgroundStep(props: CharacterStepProps) {
  const planner = () => props.trail.planner;
  const base = () => backgroundSlot(props.trail.view())?.id;
  const rows = createMemo(() => {
    const slot = base();
    return slot === undefined
      ? []
      : rowsOf(
          props.trail,
          backgroundChoices(planner().engine, planner().build(), planner().walked(), slot),
          (n) => `Background ${n}`,
        );
  });
  return (
    <Show when={base()} fallback={<p class="trail-note">The background opens at level 1.</p>}>
      <ChoiceList label="Filter backgrounds by name" rows={rows()} closed={closedToggle(props.trail, 'background')} />
    </Show>
  );
}
