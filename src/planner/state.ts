import { createMemo, createSignal } from 'solid-js';
import { placeKey, type Build, type Pick } from '~engine/build';
import { allows, cascade, type Breaks, type Edit } from '~engine/edits';
import type { Engine } from '~engine/mcp';
import { nameOf, refusal } from '~engine/refusals';
import { walk } from '~engine/walk';

export interface Pending {
  readonly title: string;
  readonly summary: string;
  readonly clears: readonly { readonly name: string; readonly place: string }[];
  readonly build: Build;
}

export function placeWords(p: Pick['slot']['place']): string {
  return 'level' in p ? `Level ${p.level}` : `Rank ${p.rank}`;
}

export function createPlanner(engine: Engine, initial: Build) {
  const [build, setBuild] = createSignal<Build>(initial);
  const [past, setPast] = createSignal<readonly Build[]>([]);
  const [future, setFuture] = createSignal<readonly Build[]>([]);
  const [pending, setPending] = createSignal<Pending | undefined>();
  const [notice, setNotice] = createSignal<readonly string[] | undefined>();
  const walked = createMemo(() => walk(engine.data, build(), engine.G));

  const commit = (next: Build) => {
    setPast((p) => [...p, build()]);
    setFuture([]);
    setBuild(next);
    setPending(undefined);
    setNotice(undefined);
  };

  const brokenWords = (b: Breaks): string[] => [
    ...b.picks.map((p) => `${nameOf(engine.data, p.feature)} (${placeWords(p.slot.place)})`),
    ...b.others.map(
      (f) => `${placeKey(f.place)}: ${refusal({ data: engine.data, G: engine.G, unit: walked().unit }, f).text}`,
    ),
  ];

  const edit = (e: Edit, title: string) => {
    const now = build();
    const verdict = allows(engine.data, now, e, engine.G);
    if (verdict.ok) return commit(verdict.build);
    const c = cascade(engine.data, now, e, engine.G);
    if (!c.ok) {
      setNotice(['That change breaks choices clearing picks can’t mend:', ...brokenWords(c)]);
      return;
    }
    const n = c.cleared.length;
    setPending({
      title,
      summary: `This breaks ${n} later ${n === 1 ? 'pick' : 'picks'}. They'll be cleared, not moved.`,
      clears: c.cleared.map((p) => ({ name: nameOf(engine.data, p.feature), place: placeWords(p.slot.place) })),
      build: c.build,
    });
  };

  return {
    engine,
    build,
    walked,
    pending,
    notice,
    edit,
    confirm: () => {
      const p = pending();
      if (p !== undefined) commit(p.build);
    },
    cancel: () => setPending(undefined),
    refuse: (lines: readonly string[]) => setNotice(lines),
    dismissNotice: () => setNotice(undefined),
    canUndo: () => past().length > 0,
    canRedo: () => future().length > 0,
    undo: () => {
      const p = past();
      const last = p.at(-1);
      if (last === undefined) return;
      setFuture((f) => [build(), ...f]);
      setPast(p.slice(0, -1));
      setBuild(last);
      setPending(undefined);
    },
    redo: () => {
      const f = future();
      const next = f[0];
      if (next === undefined) return;
      setPast((p) => [...p, build()]);
      setFuture(f.slice(1));
      setBuild(next);
      setPending(undefined);
    },
    replace: (next: Build) => commit(next),
    reset: (next: Build) => {
      setPast([]);
      setFuture([]);
      setBuild(next);
      setPending(undefined);
      setNotice(undefined);
    },
  };
}

export type Planner = ReturnType<typeof createPlanner>;
