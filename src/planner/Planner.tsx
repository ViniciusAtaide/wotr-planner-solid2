// The planner page (map 13): the Timeline, the side panel, undo and redo, the Share link, fork and compare. It runs in
// the browser only: the engine loads the data document once (ADR 0004) and the Build opens from `#b=<code>`.
import { createEffect, createMemo, createSignal, onSettled, Show } from 'solid-js';
import type { Build } from '~engine/build';
import { encodeBuild } from '~engine/codec';
import { divergence, type Engine } from '~engine/mcp/tools';
import { nameOf } from '~engine/refusals';
import { ATTRIBUTES } from '~engine/walk/unit';

import Button from '../components/design/Button';
import CascadePreview from '../components/design/CascadePreview';
import CompareToggle from '../components/design/CompareToggle';
import PickerSheet from '../components/design/PickerSheet';
import Refusal from '../components/design/Refusal';
import ShareLink from '../components/design/ShareLink';
import StatBlock, { type Stat } from '../components/design/StatBlock';
import { loadEngine } from './engine';
import { buildFromHash, EMPTY } from './link';
import { AddPanel, GearPanel, LevelPanel, RankPanel, SlotPicker, StartPanel } from './panels';
import { createPlanner, placeWords, type Planner as PlannerState } from './state';
import Timeline, { type Selection } from './Timeline';

/** Below this width the page is one column and the side panel is a full-screen sheet (map 13). */
const PHONE = '(max-width: 767px)';
const SHORT: Readonly<Record<string, string>> = {
  Strength: 'STR',
  Dexterity: 'DEX',
  Constitution: 'CON',
  Intelligence: 'INT',
  Wisdom: 'WIS',
  Charisma: 'CHA',
};

/** Loads the engine and the linked Build, then shows the planner. */
export default function Planner() {
  const [ready, setReady] = createSignal<{ engine: Engine; build: Build; stale: boolean }>();
  const [failed, setFailed] = createSignal<string>();
  onSettled(() => {
    loadEngine().then(
      async (engine) => setReady({ engine, ...(await buildFromHash(engine, location.hash)) }),
      (e: unknown) => setFailed(`The game data didn't load: ${String(e)}`),
    );
  });
  return (
    <Show when={ready()} keyed fallback={<main class="app-page">{failed() ?? 'Loading the game data…'}</main>}>
      {(r) => <Workspace staticEngine={r.engine} initialBuild={r.build} initialStale={r.stale} />}
    </Show>
  );
}

/** The Build code of a planner's Build, kept current; the last encode wins. */
function codeOf(engine: Engine, planner: PlannerState) {
  const [code, setCode] = createSignal('');
  let latest = 0;
  createEffect(
    () => planner.build(),
    (build) => {
      const n = ++latest;
      void encodeBuild(engine.data, build).then((c) => {
        if (n === latest) setCode(c);
      });
    },
  );
  return code;
}

/** Which of the two Builds the side panel edits. */
type Side = 'first' | 'second';
interface Focus {
  readonly side: Side;
  readonly selected: Selection | undefined;
}

interface WorkspaceProps {
  readonly staticEngine: Engine;
  readonly initialBuild: Build;
  readonly initialStale: boolean;
}

function Workspace(props: WorkspaceProps) {
  const first = createPlanner(props.staticEngine, props.initialBuild);
  const second = createPlanner(props.staticEngine, EMPTY);
  const firstCode = codeOf(props.staticEngine, first);
  const secondCode = codeOf(props.staticEngine, second);
  const [forked, setForked] = createSignal(false);
  /** Which Builds show: one, the other, or both side by side. */
  const [view, setView] = createSignal('First');
  /** What the side panel shows, and in which Build. A new focus mounts a fresh panel (its filter starts empty). */
  const [focus, setFocus] = createSignal<Focus>({
    side: 'first',
    selected: props.initialBuild.levels.length === 0 ? { kind: 'start' } : undefined,
  });
  const side = () => focus().side;
  const selected = () => focus().selected;
  const setSide = (s: Side) => setFocus({ side: s, selected: selected() });
  const setSelected = (sel: Selection | undefined) => setFocus({ side: side(), selected: sel });
  const [stale, setStale] = createSignal(props.initialStale);
  const [phone, setPhone] = createSignal(false);
  const active = () => (side() === 'first' ? first : second);
  const code = () => (side() === 'first' ? firstCode() : secondCode());
  const url = () => `${location.origin}/#b=${code()}`;

  // The first Build's code is the page's link, so a reload reopens it.
  createEffect(
    () => firstCode(),
    (c) => {
      if (c !== '') history.replaceState(null, '', `#b=${c}`);
    },
  );

  const select = (s: Side) => (sel: Selection) => setFocus({ side: s, selected: sel });
  const fork = () => {
    second.reset(first.build());
    setForked(true);
    setView(phone() ? 'Second' : 'Side by side');
    setSide('second');
  };
  const unfork = () => {
    setForked(false);
    setView('First');
    setSide('first');
  };
  const shows = (s: Side) => (!forked() ? s === 'first' : view() === 'Side by side' || view().toLowerCase() === s);

  onSettled(() => {
    const media = matchMedia(PHONE);
    const onMedia = () => setPhone(media.matches);
    onMedia();
    media.addEventListener('change', onMedia);
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof Element && e.target.closest('input, select, textarea') !== null;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) active().redo();
        else active().undo();
      } else if (e.key === '/' && !typing) {
        const filter = document.querySelector<HTMLInputElement>('[data-picker-filter]');
        if (filter !== null) {
          e.preventDefault();
          filter.focus();
        }
      } else if (e.key === 'Escape' && phone() && active().pending() === undefined) {
        setSelected(undefined);
      }
    };
    window.addEventListener('keydown', onKey);
    // A Share link pasted into this tab changes only the hash: open its Build (undo returns to the one before).
    const onHash = () => {
      if (location.hash === `#b=${firstCode()}`) return;
      void buildFromHash(props.staticEngine, location.hash).then(({ build, stale: s }) => {
        if (s) setStale(true);
        else first.replace(build);
      });
    };
    window.addEventListener('hashchange', onHash);
    return () => {
      media.removeEventListener('change', onMedia);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
    };
  });

  /** The six scores at the Build's last level, marked where the two Builds differ. */
  const stats = (p: PlannerState, other?: PlannerState): Stat[] =>
    ATTRIBUTES.map((a) => {
      const value = p.walked().unit.permanent(a);
      return {
        name: SHORT[a] ?? a,
        value,
        ...(other && forked() && { diff: other.walked().unit.permanent(a) !== value }),
      };
    });
  const diverge = createMemo(() => (forked() ? divergence([first.build(), second.build()]).divergeAt : undefined));

  const title = () => {
    const s = selected();
    if (s === undefined) return '';
    switch (s.kind) {
      case 'slot':
        return `${nameOf(props.staticEngine.data, s.slot.selection)} · ${placeWords(s.slot.place)}`;
      case 'level':
        return `Level ${s.level}`;
      case 'rank':
        return `Mythic Rank ${s.rank}`;
      case 'start':
        return 'Start';
      case 'add':
        return 'Add a level or rank';
      case 'gear':
        return 'Gear';
    }
  };
  /** The panel for a focus, mounted fresh for each one. */
  const panelOf = (f: Focus) => {
    const p = f.side === 'first' ? first : second;
    const sel = f.selected;
    switch (sel?.kind) {
      case 'slot':
        return (
          <SlotPicker
            planner={p}
            slot={sel.slot}
            onPicked={() => {
              if (phone()) setSelected(undefined);
            }}
          />
        );
      case 'level':
        return <LevelPanel planner={p} level={sel.level} />;
      case 'rank':
        return <RankPanel planner={p} rank={sel.rank} />;
      case 'start':
        return <StartPanel planner={p} />;
      case 'gear':
        return <GearPanel planner={p} />;
      default:
        return <AddPanel planner={p} />;
    }
  };
  const panel = () => (
    <Show when={focus()} keyed>
      {(f) => panelOf(f)}
    </Show>
  );

  const column = (s: Side, p: PlannerState, other: PlannerState) => (
    <section class="planner-build" aria-label={s === 'first' ? 'First Build' : 'Second Build'}>
      <Show when={forked()}>
        <h2 class="planner-build__title">{s === 'first' ? 'First Build' : 'Second Build'}</h2>
      </Show>
      <StatBlock stats={stats(p, other)} />
      <Timeline planner={p} selected={side() === s ? selected() : undefined} onSelect={select(s)} />
      <div class="planner-build__more">
        <Button onClick={() => select(s)({ kind: 'add' })}>Add a level or rank</Button>
      </div>
    </section>
  );

  return (
    <main class="planner">
      <div class="planner-bar" role="toolbar" aria-label="Build">
        <Button variant="ghost" kbd="⌘Z" disabled={!active().canUndo()} onClick={() => active().undo()}>
          Undo
        </Button>
        <Button variant="ghost" kbd="⇧⌘Z" disabled={!active().canRedo()} onClick={() => active().redo()}>
          Redo
        </Button>
        <Button variant="ghost" onClick={() => setSelected({ kind: 'start' })}>
          Start
        </Button>
        <Button variant="ghost" onClick={() => setSelected({ kind: 'gear' })}>
          Gear
        </Button>
        <Show when={forked()} fallback={<Button onClick={fork}>Fork this Build</Button>}>
          <CompareToggle
            segments={phone() ? ['First', 'Second'] : ['First', 'Second', 'Side by side']}
            value={view()}
            onChange={(v) => {
              setView(v);
              if (v !== 'Side by side') setSide(v === 'First' ? 'first' : 'second');
            }}
          />
          <Button variant="ghost" onClick={unfork}>
            Close the fork
          </Button>
        </Show>
      </div>
      <div class="planner-share">
        <ShareLink url={url()} />
      </div>
      <Show when={stale()}>
        <div class="planner-notice" role="status">
          <Refusal lines={["This link's Build doesn't open with this game data, so the planner starts empty."]} />
          <Button variant="ghost" onClick={() => setStale(false)}>
            Dismiss
          </Button>
        </div>
      </Show>
      <Show when={active().notice()}>
        {(lines) => (
          <div class="planner-notice" role="alert">
            <div>
              <p>{lines()[0]}</p>
              <Refusal lines={lines().slice(1)} />
            </div>
            <Button variant="ghost" onClick={() => active().dismissNotice()}>
              Dismiss
            </Button>
          </div>
        )}
      </Show>
      <Show when={diverge()}>
        {(at) => (
          <p class="planner-diverge">
            The Builds first differ at {at().replace(/^L/, 'Level ').replace(/^M/, 'Rank ')}.
          </p>
        )}
      </Show>
      <div class={['planner-body', { 'planner-body--compare': forked() && view() === 'Side by side' }]}>
        <div class="planner-builds">
          <Show when={shows('first')}>{column('first', first, second)}</Show>
          <Show when={forked() && shows('second')}>{column('second', second, first)}</Show>
        </div>
        <Show
          when={phone()}
          fallback={
            <aside class="planner-side" aria-label="Side panel">
              {panel()}
            </aside>
          }
        >
          <Show when={selected()}>
            <div class="planner-sheet">
              <PickerSheet title={title()} onBack={() => setSelected(undefined)}>
                {panel()}
              </PickerSheet>
            </div>
          </Show>
        </Show>
      </div>
      <Show when={active().pending()}>
        {(p) => (
          <div class="planner-overlay">
            <CascadePreview
              title={p().title}
              summary={p().summary}
              clears={p().clears}
              onCancel={() => active().cancel()}
              onConfirm={() => active().confirm()}
            />
          </div>
        )}
      </Show>
    </main>
  );
}
