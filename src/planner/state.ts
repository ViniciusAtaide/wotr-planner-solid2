import { createMemo, createSignal } from 'solid-js';
import type { Build } from '~engine/build';
import type { Edit } from '~engine/edits';
import type { Engine } from '~engine/mcp';
import { walk } from '~engine/walk';

import {
  outcomeOf,
  plannerAt,
  reducePlanner,
  type EditOutcome,
  type NonEmpty,
  type PlannerAction,
  type PlannerState,
} from './planner-state';

export { placeWords, type Pending } from './planner-state';

export function createPlanner(engine: Engine, initial: Build) {
  let latest = plannerAt(initial);
  const [state, setState] = createSignal<PlannerState>(latest);
  const restore = (next: PlannerState): PlannerState => {
    latest = next;
    setState(next);
    return next;
  };
  const send = (a: PlannerAction): PlannerState => restore(reducePlanner(engine, latest, a));
  const build = () => state().present;
  const session = () => state().session;
  const walked = createMemo(() => walk(engine.data, build(), engine.G));

  return {
    engine,
    state,
    latest: () => latest,
    restore,
    build,
    session,
    change: () => state().change,
    walked,
    pending: () => {
      const s = session();
      return s.kind === 'confirming' ? s.pending : undefined;
    },
    notice: () => {
      const s = session();
      return s.kind === 'refused' ? s.lines : undefined;
    },
    edit: (edit: Edit, title: string): EditOutcome => outcomeOf(send({ kind: 'edit', edit, title })),
    confirm: () => send({ kind: 'confirm' }),
    cancel: () => send({ kind: 'cancel' }),
    refuse: (lines: NonEmpty<string>) => send({ kind: 'refuse', lines }),
    dismissNotice: () => send({ kind: 'dismiss' }),
    canUndo: () => state().past.length > 0,
    canRedo: () => state().future.length > 0,
    undo: () => send({ kind: 'undo' }),
    redo: () => send({ kind: 'redo' }),
    replace: (next: Build) => send({ kind: 'replace', build: next }),
    reset: (next: Build) => send({ kind: 'reset', build: next }),
  };
}

export type Planner = ReturnType<typeof createPlanner>;
