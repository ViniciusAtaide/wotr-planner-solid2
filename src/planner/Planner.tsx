import { Title } from '@solidjs/meta';
import { Portal } from '@solidjs/web';
import { createEffect, createMemo, createSignal, For, Match, onSettled, Show, Switch } from 'solid-js';
import type { Build } from '~engine/build';
import type { Attribute } from '~engine/data';
import { divergence, type Engine } from '~engine/mcp';
import { linkDidNotOpen } from '~engine/refusals';
import { walk } from '~engine/walk';

import { Button, CascadePreview, CompareToggle, Refusal } from '../design';
import { BuildNameLabel, HEADER_SLOT, pageTitle, renameTitle } from './BuildName';
import { loadEngine } from './engine';
import { keepFocus } from './focus-return';
import { EMPTY, openHash } from './link';
import { PlannerMenu, UndoLine } from './Menu';
import { createShareCode, shareLinkOf, type ShareCode } from './share-code';
import { browserStorage, readListMode, writeListMode, type ListMode } from './list-mode';
import type { NonEmpty } from './planner-state';
import { buildSheet } from './sheet';
import { createPlanner, type Planner as PlannerApi } from './state';
import Trail from './Trail';
import { firstCleared, reduceTrail, TRAIL_START, type TrailAction, type TrailState } from './trail-state';
import { unreachable } from './unreachable';
import {
  edited,
  reducePage,
  resolve,
  shown,
  workspaceAt,
  type Layout,
  type LinkStatus,
  type PageAction,
  type Side,
  type View,
} from './workspace-state';

export const PHONE_WIDTH_QUERY = '(max-width: 899px)';
export const NOTICE_LINES = 5;

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

const SIDE_NAME: Readonly<Record<Side, string>> = { first: 'First', second: 'Second' };
const other = (side: Side): Side => (side === 'first' ? 'second' : 'first');

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

export interface RefusalNoticeProps {
  readonly lines: NonEmpty<string>;
  readonly onDismiss: () => void;
}

export function RefusalNotice(props: RefusalNoticeProps) {
  const [all, setAll] = createSignal(false);
  createEffect(
    () => props.lines,
    () => {
      setAll(false);
    },
  );
  const reasons = () => props.lines.slice(1);
  return (
    <div class="planner-notice" role="alert">
      <div>
        <p>{props.lines[0]}</p>
        <Refusal lines={all() ? reasons() : reasons().slice(0, NOTICE_LINES)} />
        <Show when={!all() && reasons().length > NOTICE_LINES}>
          <button type="button" class="trail-link" onClick={() => setAll(true)}>
            …and {reasons().length - NOTICE_LINES} more
          </button>
        </Show>
      </div>
      <Button
        variant="ghost"
        onClick={() => {
          props.onDismiss();
          keepFocus(undefined);
        }}
      >
        Dismiss
      </Button>
    </div>
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
  const [firstTrail, setFirstTrail] = createSignal<TrailState>(TRAIL_START);
  const [secondTrail, setSecondTrail] = createSignal<TrailState>(TRAIL_START);
  const trails: Readonly<Record<Side, () => TrailState>> = { first: firstTrail, second: secondTrail };
  const sendTrail = (side: Side, a: TrailAction) =>
    (side === 'first' ? setFirstTrail : setSecondTrail)((s) => reduceTrail(s, a));
  let latest = workspaceAt(props.initialBuild, props.initialLink);
  const [workspace, setWorkspace] = createSignal(latest);
  const [phone, setPhone] = createSignal(false);
  const [closing, setClosing] = createSignal(false);
  const [listMode, setListMode] = createSignal<ListMode>(readListMode(browserStorage));

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
  let wasConfirming = false;
  createEffect(
    () => confirming(),
    (now) => {
      const ended = wasConfirming && !now;
      wasConfirming = now;
      if (ended) keepFocus(focusedOutsideDialog);
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

  let ownHash = props.initialLink.kind === 'ok' ? openedHash : '';
  let brokenOver: Build | undefined = props.initialLink.kind === 'ok' ? undefined : props.initialBuild;
  createEffect(
    () => ({ code: linkCode(), broken: workspace().link.kind === 'didNotOpen' }),
    ({ code, broken }) => {
      if (code.kind !== 'current') return;
      if (code.of !== undefined && code.of !== active().build()) return;
      if (broken && active().latest().present === brokenOver) return;
      brokenOver = undefined;
      ownHash = `#b=${code.code}`;
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
      brokenOver = active().latest().present;
      send({ kind: 'linkFailed', on: 'paste', reason: opened.reason });
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
        const field = e.target instanceof Element ? e.target.closest('input, select, textarea') : null;
        const typing = field !== null;
        const emptyFilter =
          field instanceof HTMLInputElement && field.hasAttribute('data-picker-filter') && field.value === '';
        if (undoKey && (!typing || emptyFilter)) {
          e.preventDefault();
          send({ kind: 'planner', action: { kind: e.shiftKey ? 'redo' : 'undo' } });
        } else if (e.key === '/' && !typing) {
          const filter = document.querySelector<HTMLInputElement>('[data-picker-filter]');
          if (filter !== null) {
            e.preventDefault();
            filter.focus();
          }
        } else if (e.key === 'Escape' && !e.defaultPrevented && workspace().selection !== undefined) {
          send({ kind: 'select', selection: undefined });
        }
        return;
      }
      default:
        unreachable(session);
    }
  };

  onSettled(() => {
    history.scrollRestoration = 'manual';
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

  const confirm = () => {
    const before = active().latest().present;
    const pending = active().latest().session;
    send({ kind: 'planner', action: { kind: 'confirm' } });
    const after = active().latest().present;
    if (after === before) return;
    if (pending.kind === 'confirming') {
      sendTrail(editedSide(), { kind: 'skillsCleared', levels: pending.pending.clearedSkills });
    }
    const slot = firstCleared(before, { data: engine.data, build: after, walk: walk(engine.data, after, engine.G) });
    send({ kind: 'select', selection: slot === undefined ? undefined : { kind: 'slot', slot } });
  };

  const scoreDiffers = (s: Side) => (a: Attribute) => {
    const rival = planners[other(s)];
    return forked() !== undefined && planners[s].walked().unit.permanent(a) !== rival.walked().unit.permanent(a);
  };
  const diverge = createMemo(() => (forked() ? divergence([first.build(), second.build()]).divergeAt : undefined));
  const linkNotice = () => {
    const l = workspace().link;
    return l.kind === 'didNotOpen' ? linkDidNotOpen(l.on, l.reason) : undefined;
  };

  const column = (s: Side) => (
    <section
      class={['planner-build', { 'planner-build--other': forked() !== undefined && editedSide() !== s }]}
      aria-label={SIDE_TITLE[s]}
    >
      <Show when={forked()}>
        <div class="planner-build__head">
          <h2 class="planner-build__title">{SIDE_TITLE[s]}</h2>
          <Show when={editedSide() !== s}>
            <Button onClick={() => send({ kind: 'select', selection: undefined, side: s })}>
              Edit the {SIDE_TITLE[s]}
            </Button>
          </Show>
        </div>
      </Show>
      <div class="planner-build__trail" inert={forked() !== undefined && editedSide() !== s}>
        <Trail
          planner={planners[s]}
          state={trails[s]()}
          send={(a) => sendTrail(s, a)}
          selection={editedSide() === s ? resolved() : undefined}
          select={(selection) => send({ kind: 'select', selection, side: s })}
          phone={phone()}
          diff={scoreDiffers(s)}
          listMode={listMode()}
        />
      </div>
    </section>
  );

  const [headerSlot, setHeaderSlot] = createSignal<HTMLElement | null>(null);
  onSettled(() => {
    setHeaderSlot(document.getElementById(HEADER_SLOT));
  });
  const nameLabel = () => (
    <BuildNameLabel
      name={active().build().name}
      onRename={(name) => {
        active().edit({ kind: 'rename', ...(name !== undefined && { name }) }, renameTitle(name));
      }}
    />
  );

  return (
    <main class="planner">
      <Title>{pageTitle(active().build().name)}</Title>
      <Show when={headerSlot()}>{(slot) => <Portal mount={slot()}>{nameLabel()}</Portal>}</Show>
      <div class="planner-behind" inert={confirming()}>
        <div class="planner-bar" role="toolbar" aria-label="Build">
          <Show when={headerSlot() === null}>
            <div class="planner-bar__name">{nameLabel()}</div>
          </Show>
          <Show when={forked()}>
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
                <span class="planner-bar__close">
                  <Show
                    when={closing()}
                    fallback={
                      <Button variant="ghost" onClick={() => setClosing(true)}>
                        Close the fork…
                      </Button>
                    }
                  >
                    <span class="planner-bar__ask">
                      Keep the {SIDE_NAME[v().side]} Build and drop the {SIDE_NAME[other(v().side)]} Build?
                    </span>
                    <Button
                      variant="danger"
                      onClick={() => {
                        setClosing(false);
                        send({ kind: 'close' });
                      }}
                    >
                      Keep {SIDE_NAME[v().side]}
                    </Button>
                    <Button variant="ghost" onClick={() => setClosing(false)}>
                      Cancel
                    </Button>
                  </Show>
                </span>
              </>
            )}
          </Show>
          <PlannerMenu
            listMode={listMode()}
            onListMode={(mode) => {
              setListMode(mode);
              writeListMode(browserStorage, mode);
            }}
            link={shareLinkOf(linkCode(), location.origin)}
            forked={forked() !== undefined}
            onFork={() => send({ kind: 'fork' })}
            sheet={() => buildSheet({ data: engine.data, build: active().build(), walk: active().walked() })}
          />
        </div>
        <div class="planner-notices">
          <Show when={linkNotice()}>
            {(words) => (
              <div class="planner-notice" role="status">
                <Refusal lines={[words()]} />
                <Button
                  variant="ghost"
                  onClick={() => {
                    send({ kind: 'dismissLink' });
                    keepFocus(undefined);
                  }}
                >
                  Dismiss
                </Button>
              </div>
            )}
          </Show>
          <Show when={active().notice()}>
            {(lines) => (
              <RefusalNotice lines={lines()} onDismiss={() => send({ kind: 'planner', action: { kind: 'dismiss' } })} />
            )}
          </Show>
        </div>
        <Show when={diverge()}>
          {(at) => (
            <p class="planner-diverge">
              The Builds first differ at {at().replace(/^L/, 'Level ').replace(/^M/, 'Rank ')}.
            </p>
          )}
        </Show>
        <div class={['planner-builds', { 'planner-builds--compare': shown(view(), phone()).length > 1 }]}>
          <For each={shown(view(), phone())}>{(s) => column(s)}</For>
        </div>
        <UndoLine
          change={active().change()}
          canUndo={active().canUndo()}
          onUndo={() => send({ kind: 'planner', action: { kind: 'undo' } })}
        />
      </div>
      <Show when={active().pending()}>
        {(p) => (
          <div class="planner-overlay">
            <CascadePreview
              title={p().title}
              summary={p().summary}
              clears={p().clears}
              onCancel={() => send({ kind: 'planner', action: { kind: 'cancel' } })}
              onConfirm={confirm}
            />
          </div>
        )}
      </Show>
    </main>
  );
}
