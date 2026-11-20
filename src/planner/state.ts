// One Build being planned: its state and history. Every change goes through E (engine/edits.ts), so no sequence of UI
// actions reaches an impossible Build: a plain edit applies at once; one that breaks later picks opens the Cascade
// preview (map 11), which applies only on confirm; one a cascade can't mend is refused with R's words.
import { createMemo, createSignal } from 'solid-js';
import { placeKey, type Build, type Pick } from '~engine/build';
import { allows, cascade, type Breaks, type Edit } from '~engine/edits';
import type { Engine } from '~engine/mcp/tools';
import { nameOf, refusal } from '~engine/refusals';
import { walk } from '~engine/walk/walk';

/** A Cascade edit waiting for its confirm: what it clears, and the Build it leaves. */
export interface Pending {
  readonly title: string;
  readonly summary: string;
  readonly clears: readonly { readonly name: string; readonly place: string }[];
  readonly build: Build;
}

/** A place in words: "Level 8", "Rank 3". */
export function placeWords(p: Pick['slot']['place']): string {
  return 'level' in p ? `Level ${p.level}` : `Rank ${p.rank}`;
}

export function createPlanner(engine: Engine, initial: Build) {
  const [build, setBuild] = createSignal<Build>(initial);
  const [past, setPast] = createSignal<readonly Build[]>([]);
  const [future, setFuture] = createSignal<readonly Build[]>([]);
  const [pending, setPending] = createSignal<Pending | undefined>();
  /** Why the last edit couldn't apply, in R's words. */
  const [notice, setNotice] = createSignal<readonly string[] | undefined>();
  const walked = createMemo(() => walk(engine.data, build(), engine.G));

  const commit = (next: Build) => {
    setPast((p) => [...p, build()]);
    setFuture([]);
    setBuild(next);
    setPending(undefined);
    setNotice(undefined);
  };

  /** What an edit breaks, in words: each pick with its place, each other choice with R's reason. */
  const brokenWords = (b: Breaks): string[] => [
    ...b.picks.map((p) => `${nameOf(engine.data, p.feature)} (${placeWords(p.slot.place)})`),
    ...b.others.map(
      (f) => `${placeKey(f.place)}: ${refusal({ data: engine.data, G: engine.G, unit: walked().unit }, f).text}`,
    ),
  ];

  /**
   * Makes an edit: at once when it breaks nothing; through the Cascade preview when clearing picks mends what it
   * breaks; otherwise refused, naming what it would break.
   */
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
    /** Replaces the Build outright, as opening a link does. Undo still reaches the one before. */
    replace: (next: Build) => commit(next),
    /** Starts over from a Build with no history: a fork's copy. */
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
