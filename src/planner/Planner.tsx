import { createEffect, createMemo, createSignal, For, Match, onSettled, Show, Switch } from 'solid-js';
import type { Build } from '~engine/build';
import { divergence, type Engine } from '~engine/mcp';
import { linkDidNotOpen, nameOf } from '~engine/refusals';
import { ATTRIBUTES } from '~engine/walk';

import {
  Button,
  CascadePreview,
  CompareToggle,
  PickerSheet,
  Refusal,
  ShareLink,
  StatBlock,
  type Stat,
} from '../design';
import { loadEngine } from './engine';
import { EMPTY, openHash } from './link';
import { AddPanel, GearPanel, LevelPanel, RankPanel, SlotPicker, StartPanel } from './panels';
import { createShareCode, shareLinkOf, type ShareCode } from './share-code';
import { createPlanner, placeWords, type Planner as PlannerApi } from './state';
import Timeline from './Timeline';
import { unreachable } from './unreachable';
import {
  edited,
  reducePage,
  resolve,
  sameSelection,
  shown,
  workspaceAt,
  type Layout,
  type LinkStatus,
  type PageAction,
  type Selection,
  type Side,
  type View,
} from './workspace-state';

const PHONE_WIDTH_QUERY = '(max-width: 767px)';
const ATTRIBUTE_ABBREVIATIONS: Readonly<Record<string, string>> = {
  Strength: 'STR',
  Dexterity: 'DEX',
  Constitution: 'CON',
  Intelligence: 'INT',
  Wisdom: 'WIS',
  Charisma: 'CHA',
};

type Boot =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly reason: string }
  | {
      readonly kind: 'ready';
      readonly engine: Engine;
      readonly build: Build;
      readonly link: LinkStatus;
      readonly hash: string;
    };

export default function Planner() {
  const [boot, setBoot] = createSignal<Boot>({ kind: 'loading' });
  const start = () => {
    setBoot({ kind: 'loading' });
    loadEngine().then(
      async (engine) => {
        const hash = location.hash;
        const opened = await openHash(engine, hash);
        setBoot(
          opened.kind === 'opened'
            ? { kind: 'ready', engine, build: opened.build, link: { kind: 'ok' }, hash }
            : {
                kind: 'ready',
                engine,
                build: EMPTY,
                link: { kind: 'didNotOpen', on: 'load', reason: opened.reason },
                hash,
              },
        );
      },
      (e: unknown) => setBoot({ kind: 'failed', reason: `The game data didn't load: ${String(e)}` }),
    );
  };
  onSettled(start);
  const ready = () => {
    const b = boot();
    return b.kind === 'ready' ? b : undefined;
  };
  const failed = () => {
    const b = boot();
    return b.kind === 'failed' ? b : undefined;
  };
  return (
    <Switch>
      <Match when={ready()} keyed>
        {(r) => <Workspace staticEngine={r.engine} initialBuild={r.build} initialLink={r.link} initialHash={r.hash} />}
      </Match>
      <Match when={failed()}>
        {(f) => (
          <main class="app-page">
            <p>{f().reason}</p>
            <Button onClick={start}>Retry</Button>
          </main>
        )}
      </Match>
      <Match when={boot().kind === 'loading'}>
        <main class="app-page">Loading the game data…</main>
      </Match>
    </Switch>
  );
}

type Forked = Extract<View, { readonly kind: 'forked' }>;
type Segment = 'First' | 'Second' | 'Side by side';

const SEGMENT_SHOWS: Readonly<Record<Segment, { readonly layout: Layout; readonly side?: Side }>> = {
  First: { layout: 'one', side: 'first' },
  Second: { layout: 'one', side: 'second' },
  'Side by side': { layout: 'both' },
};
const SIDE_SEGMENT: Readonly<Record<Side, Segment>> = { first: 'First', second: 'Second' };
const PHONE_SEGMENTS: readonly Segment[] = ['First', 'Second'];
const DESKTOP_SEGMENTS: readonly Segment[] = ['First', 'Second', 'Side by side'];
const SIDE_TITLE: Readonly<Record<Side, string>> = { first: 'First Build', second: 'Second Build' };

function pressedSegment(view: Forked, phone: boolean): Segment {
  return view.layout === 'both' && !phone ? 'Side by side' : SIDE_SEGMENT[view.side];
}

interface WorkspaceProps {
  readonly staticEngine: Engine;
  readonly initialBuild: Build;
  readonly initialLink: LinkStatus;
  readonly initialHash: string;
}

function Workspace(props: WorkspaceProps) {
  const engine = props.staticEngine;
  const openedHash = props.initialHash;
  const first = createPlanner(engine, props.initialBuild);
  const second = createPlanner(engine, EMPTY);
  const planners: Readonly<Record<Side, PlannerApi>> = { first, second };
  const codes: Readonly<Record<Side, () => ShareCode>> = {
    first: createShareCode(engine, first.build),
    second: createShareCode(engine, second.build),
  };
  let latest = workspaceAt(props.initialBuild, props.initialLink);
  const [workspace, setWorkspace] = createSignal(latest);
  const [phone, setPhone] = createSignal(false);

  const send = (a: PageAction) => {
    const page = { workspace: latest, first: first.latest(), second: second.latest() };
    const next = reducePage(engine, page, a);
    if (next.first !== page.first) first.restore(next.first);
    if (next.second !== page.second) second.restore(next.second);
    if (next.workspace !== page.workspace) {
      latest = next.workspace;
      setWorkspace(latest);
    }
  };

  const view = () => workspace().view;
  const editedSide = () => edited(view());
  const active = () => planners[editedSide()];
  const linkCode = () => codes[editedSide()]();
  const forked = (): Forked | undefined => {
    const v = view();
    return v.kind === 'forked' ? v : undefined;
  };
  const confirming = () => active().session().kind === 'confirming';
  let focusedOutsideDialog: HTMLElement | undefined;
  createEffect(
    () => confirming(),
    (now) => {
      if (now) return;
      const back = focusedOutsideDialog;
      if (back?.isConnected === true && document.activeElement !== back) back.focus();
    },
  );
  const resolved = createMemo(() =>
    resolve(
      workspace().selection,
      active().build(),
      active()
        .walked()
        .slots.map((s) => s.id),
    ),
  );
  const focus = createMemo(() => ({ side: editedSide(), selection: resolved() }), {
    equals: (a, b) => a.side === b.side && sameSelection(a.selection, b.selection),
  });

  let ownHash = props.initialLink.kind === 'ok' ? openedHash : '';
  createEffect(
    () => linkCode(),
    (c) => {
      if (c.kind !== 'current') return;
      ownHash = `#b=${c.code}`;
      if (location.hash !== ownHash) history.replaceState(null, '', ownHash);
    },
  );

  let latestHash = 0;
  const onHash = () => {
    const hash = location.hash;
    const c = linkCode();
    if (c.kind === 'current' && hash === `#b=${c.code}`) return;
    const n = ++latestHash;
    void openHash(engine, hash).then((opened) => {
      if (n !== latestHash) return;
      if (opened.kind === 'opened') {
        send({ kind: 'linkOpened', build: opened.build });
        return;
      }
      send({ kind: 'linkFailed', on: 'paste', reason: opened.reason });
      history.replaceState(null, '', ownHash === '' ? `${location.pathname}${location.search}` : ownHash);
    });
  };

  const onKey = (e: KeyboardEvent) => {
    const session = active().latest().session;
    const undoKey = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z';
    switch (session.kind) {
      case 'confirming':
        if (undoKey) {
          e.preventDefault();
          if (!e.shiftKey) send({ kind: 'planner', action: { kind: 'undo' } });
        } else if (e.key === 'Escape') send({ kind: 'planner', action: { kind: 'cancel' } });
        return;
      case 'idle':
      case 'refused': {
        const typing = e.target instanceof Element && e.target.closest('input, select, textarea') !== null;
        if (undoKey && !typing) {
          e.preventDefault();
          send({ kind: 'planner', action: { kind: e.shiftKey ? 'redo' : 'undo' } });
        } else if (e.key === '/' && !typing) {
          const filter = document.querySelector<HTMLInputElement>('[data-picker-filter]');
          if (filter !== null) {
            e.preventDefault();
            filter.focus();
          }
        } else if (e.key === 'Escape' && phone()) send({ kind: 'select', selection: undefined });
        return;
      }
      default:
        unreachable(session);
    }
  };

  onSettled(() => {
    const media = matchMedia(PHONE_WIDTH_QUERY);
    const onMedia = () => setPhone(media.matches);
    onMedia();
    media.addEventListener('change', onMedia);
    window.addEventListener('keydown', onKey);
    const onFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('[role="dialog"]') === null) {
        focusedOutsideDialog = e.target;
      }
    };
    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('hashchange', onHash);
    if (location.hash !== openedHash) onHash();
    return () => {
      media.removeEventListener('change', onMedia);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('hashchange', onHash);
    };
  });

  const lastLevelScores = (p: PlannerApi, other: PlannerApi): Stat[] =>
    ATTRIBUTES.map((a) => {
      const value = p.walked().unit.permanent(a);
      return {
        name: ATTRIBUTE_ABBREVIATIONS[a] ?? a,
        value,
        ...(forked() && { diff: other.walked().unit.permanent(a) !== value }),
      };
    });
  const diverge = createMemo(() => (forked() ? divergence([first.build(), second.build()]).divergeAt : undefined));
  const linkNotice = () => {
    const l = workspace().link;
    return l.kind === 'didNotOpen' ? linkDidNotOpen(l.on, l.reason) : undefined;
  };

  const title = (s: Selection | undefined): string => {
    if (s === undefined) return '';
    switch (s.kind) {
      case 'slot':
        return `${nameOf(engine.data, s.slot.selection)} · ${placeWords(s.slot.place)}`;
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
  const panelOf = (side: Side, sel: Selection | undefined) => {
    const p = planners[side];
    switch (sel?.kind) {
      case 'slot':
        return (
          <SlotPicker
            planner={p}
            slot={sel.slot}
            onPicked={(outcome) => {
              if (outcome === 'applied' && phone()) send({ kind: 'select', selection: undefined });
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
      case 'add':
      case undefined:
        return <AddPanel planner={p} />;
    }
  };
  const panel = () => (
    <Show when={focus()} keyed>
      {(f) => panelOf(f.side, f.selection)}
    </Show>
  );

  const column = (s: Side) => (
    <section class="planner-build" aria-label={SIDE_TITLE[s]}>
      <Show when={forked()}>
        <h2 class="planner-build__title">{SIDE_TITLE[s]}</h2>
      </Show>
      <StatBlock stats={lastLevelScores(planners[s], planners[s === 'first' ? 'second' : 'first'])} />
      <Show when={planners[s].build().levels.length === 0}>
        <p class="planner-stats-note">Point buy only: the race and its +2 count from level 1.</p>
      </Show>
      <Timeline
        planner={planners[s]}
        selected={editedSide() === s ? resolved() : undefined}
        onSelect={(selection) => send({ kind: 'select', selection, side: s })}
      />
      <div class="planner-build__more">
        <Button onClick={() => send({ kind: 'select', selection: { kind: 'add' }, side: s })}>
          Add a level or rank
        </Button>
      </div>
    </section>
  );

  return (
    <main class="planner">
      <div class="planner-behind" inert={confirming()}>
        <div class="planner-bar" role="toolbar" aria-label="Build">
          <Button
            variant="ghost"
            kbd="⌘Z"
            disabled={!active().canUndo()}
            onClick={() => send({ kind: 'planner', action: { kind: 'undo' } })}
          >
            Undo
          </Button>
          <Button
            variant="ghost"
            kbd="⇧⌘Z"
            disabled={!active().canRedo()}
            onClick={() => send({ kind: 'planner', action: { kind: 'redo' } })}
          >
            Redo
          </Button>
          <Button variant="ghost" onClick={() => send({ kind: 'select', selection: { kind: 'start' } })}>
            Start
          </Button>
          <Button variant="ghost" onClick={() => send({ kind: 'select', selection: { kind: 'gear' } })}>
            Gear
          </Button>
          <Show when={forked()} fallback={<Button onClick={() => send({ kind: 'fork' })}>Fork this Build</Button>}>
            {(v) => (
              <>
                <CompareToggle
                  segments={phone() ? PHONE_SEGMENTS : DESKTOP_SEGMENTS}
                  value={pressedSegment(v(), phone())}
                  onChange={(segment) => {
                    const to = SEGMENT_SHOWS[segment];
                    send({ kind: 'show', layout: to.layout, side: to.side ?? v().side });
                  }}
                />
                <Button variant="ghost" onClick={() => send({ kind: 'close' })}>
                  Close the fork
                </Button>
              </>
            )}
          </Show>
        </div>
        <div class="planner-share">
          <ShareLink {...shareLinkOf(linkCode(), location.origin)} />
        </div>
        <Show when={linkNotice()}>
          {(words) => (
            <div class="planner-notice" role="status">
              <Refusal lines={[words()]} />
              <Button variant="ghost" onClick={() => send({ kind: 'dismissLink' })}>
                Dismiss
              </Button>
            </div>
          )}
        </Show>
        <Show when={active().notice()}>
          {(lines) => (
            <div class="planner-notice" role="alert">
              <div>
                <p>{lines()[0]}</p>
                <Refusal lines={lines().slice(1)} />
              </div>
              <Button variant="ghost" onClick={() => send({ kind: 'planner', action: { kind: 'dismiss' } })}>
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
        <div class={['planner-body', { 'planner-body--compare': shown(view(), phone()).length > 1 }]}>
          <div class="planner-builds">
            <For each={shown(view(), phone())}>{(s) => column(s)}</For>
          </div>
          <Show
            when={phone()}
            fallback={
              <aside class="planner-side" aria-label="Side panel">
                {panel()}
              </aside>
            }
          >
            <Show when={resolved()}>
              {(s) => (
                <div class="planner-sheet">
                  <PickerSheet title={title(s())} onBack={() => send({ kind: 'select', selection: undefined })}>
                    {panel()}
                  </PickerSheet>
                </div>
              )}
            </Show>
          </Show>
        </div>
      </div>
      <Show when={active().pending()}>
        {(p) => (
          <div class="planner-overlay">
            <CascadePreview
              title={p().title}
              summary={p().summary}
              clears={p().clears}
              onCancel={() => send({ kind: 'planner', action: { kind: 'cancel' } })}
              onConfirm={() => send({ kind: 'planner', action: { kind: 'confirm' } })}
            />
          </div>
        )}
      </Show>
    </main>
  );
}
