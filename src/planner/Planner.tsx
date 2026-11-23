import { Title } from '@solidjs/meta';
import { Portal } from '@solidjs/web';
import { createEffect, createMemo, createSignal, Match, onSettled, Show, Switch } from 'solid-js';
import type { Build } from '~engine/build';
import type { Engine } from '~engine/mcp';
import { linkCleared, linkDidNotOpen } from '~engine/refusals';
import { walk } from '~engine/walk';

import { Button, CascadePreview, Refusal } from '../design';
import { BuildNameLabel, HEADER_SLOT, pageTitle, renameTitle } from './BuildName';
import { loadEngine } from './engine';
import { afterHistorySettles, holdsHash, isOwnHashChange, onHistorySettled, writeHash } from './history-moves';
import { keepFocus } from './focus-return';
import { EMPTY, openHash } from './link';
import { PlannerMenu, UndoLine } from './Menu';
import { createShareCode, homeUrl, shareLinkOf } from './share-code';
import { browserStorage, readListMode, writeListMode, type ListMode } from './list-mode';
import { clearedRows, type NonEmpty } from './planner-state';
import { buildSheet } from './sheet';
import { createPlanner } from './state';
import Trail from './Trail';
import { firstCleared, reduceTrail, TRAIL_START, type TrailAction } from './trail-state';
import { unreachable } from './unreachable';
import { reducePage, resolve, workspaceAt, type LinkStatus, type PageAction } from './workspace-state';

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
            ? {
                kind: 'ready',
                engine,
                build: opened.build,
                link:
                  opened.cleared.length === 0
                    ? { kind: 'ok' }
                    : { kind: 'cleared', rows: clearedRows(engine, opened.build, opened.cleared), build: opened.build },
                hash,
              }
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

interface WorkspaceProps {
  readonly staticEngine: Engine;
  readonly initialBuild: Build;
  readonly initialLink: LinkStatus;
  readonly initialHash: string;
}

function Workspace(props: WorkspaceProps) {
  const engine = props.staticEngine;
  const openedHash = props.initialHash;
  const planner = createPlanner(engine, props.initialBuild);
  const linkCode = createShareCode(engine, planner.build);
  const [trail, setTrail] = createSignal(TRAIL_START);
  const sendTrail = (a: TrailAction) => setTrail((s) => reduceTrail(s, a));
  let latest = workspaceAt(props.initialLink);
  const [workspace, setWorkspace] = createSignal(latest);
  const [phone, setPhone] = createSignal(false);
  const [listMode, setListMode] = createSignal<ListMode>(readListMode(browserStorage));

  const send = (a: PageAction) => {
    const page = { workspace: latest, planner: planner.latest() };
    const next = reducePage(engine, page, a);
    if (next.planner !== page.planner) planner.restore(next.planner);
    if (next.workspace !== page.workspace) {
      latest = next.workspace;
      setWorkspace(latest);
    }
  };

  const confirming = () => planner.session().kind === 'confirming';
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
      planner.build(),
      planner.walked().slots.map((s) => s.id),
    ),
  );

  let ownHash = props.initialLink.kind === 'ok' ? openedHash : '';
  const writeOwnHash = () => {
    if (ownHash !== '' && !holdsHash(ownHash)) writeHash(ownHash);
  };
  let brokenOver: Build | undefined = props.initialLink.kind === 'ok' ? undefined : props.initialBuild;
  createEffect(
    () => ({ code: linkCode(), build: planner.build(), broken: workspace().link.kind === 'didNotOpen' }),
    ({ code, build, broken }) => {
      if (code.kind !== 'current') return;
      if (code.of !== undefined && code.of !== build) return;
      if (broken && planner.latest().present === brokenOver) return;
      brokenOver = undefined;
      ownHash = `#b=${code.code}`;
      afterHistorySettles(writeOwnHash);
    },
  );

  let latestHash = 0;
  const onHash = () => {
    if (isOwnHashChange()) return;
    const hash = location.hash;
    const c = linkCode();
    if (c.kind === 'current' && hash === `#b=${c.code}`) return;
    const n = ++latestHash;
    void openHash(engine, hash).then((opened) => {
      if (n !== latestHash) return;
      if (opened.kind === 'opened') {
        send({ kind: 'linkOpened', build: opened.build, cleared: clearedRows(engine, opened.build, opened.cleared) });
        return;
      }
      send({ kind: 'linkFailed', on: 'paste', reason: opened.reason });
      afterHistorySettles(() => {
        if (ownHash !== '') writeHash(ownHash);
      });
    });
  };

  const onKey = (e: KeyboardEvent) => {
    const session = planner.latest().session;
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
    const stopSettled = onHistorySettled(writeOwnHash);
    if (location.hash !== openedHash) onHash();
    return () => {
      stopSettled();
      media.removeEventListener('change', onMedia);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('hashchange', onHash);
    };
  });

  const confirm = () => {
    const before = planner.latest().present;
    const pending = planner.latest().session;
    send({ kind: 'planner', action: { kind: 'confirm' } });
    const after = planner.latest().present;
    if (after === before) return;
    if (pending.kind === 'confirming') {
      sendTrail({ kind: 'skillsCleared', levels: pending.pending.clearedSkills });
    }
    const slot = firstCleared(before, { data: engine.data, build: after, walk: walk(engine.data, after, engine.G) });
    send({ kind: 'select', selection: slot === undefined ? undefined : { kind: 'slot', slot } });
  };

  const linkNotice = (): readonly string[] | undefined => {
    const l = workspace().link;
    if (l.kind === 'didNotOpen') return [linkDidNotOpen(l.on, l.reason)];
    if (l.kind === 'cleared') return [linkCleared(l.rows.length), ...l.rows.map((r) => `${r.name} (${r.place})`)];
    return undefined;
  };

  const [headerSlot, setHeaderSlot] = createSignal<HTMLElement | null>(null);
  const [menuSlot, setMenuSlot] = createSignal<HTMLElement | null>(null);
  onSettled(() => {
    setMenuSlot(document.getElementById('app-header-end'));
    setHeaderSlot(document.getElementById(HEADER_SLOT));
  });
  const nameLabel = () => (
    <BuildNameLabel
      name={planner.build().name}
      onRename={(name) => {
        planner.edit({ kind: 'rename', ...(name !== undefined && { name }) }, renameTitle(name));
      }}
    />
  );

  const menu = () => (
    <PlannerMenu
      listMode={listMode()}
      onListMode={(mode) => {
        setListMode(mode);
        writeListMode(browserStorage, mode);
      }}
      link={shareLinkOf(linkCode(), homeUrl(location.origin))}
      sheet={() => buildSheet({ data: engine.data, build: planner.build(), walk: planner.walked() })}
    />
  );

  return (
    <main class="planner">
      <Title>{pageTitle(planner.build().name)}</Title>
      <Show when={headerSlot()}>{(slot) => <Portal mount={slot()}>{nameLabel()}</Portal>}</Show>
      <Show when={menuSlot()}>
        {(slot) => (
          <Portal mount={slot()}>
            <div inert={confirming()}>{menu()}</div>
          </Portal>
        )}
      </Show>
      <div class="planner-behind" inert={confirming()}>
        <div class="planner-bar" role="toolbar" aria-label="Build">
          <Show when={headerSlot() === null}>
            <div class="planner-bar__name">{nameLabel()}</div>
          </Show>
          <Show when={menuSlot() === null}>{menu()}</Show>
        </div>
        <div class="planner-notices">
          <Show when={linkNotice()}>
            {(words) => (
              <div class="planner-notice" role="status">
                <Refusal lines={words()} />
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
          <Show when={planner.notice()}>
            {(lines) => (
              <RefusalNotice lines={lines()} onDismiss={() => send({ kind: 'planner', action: { kind: 'dismiss' } })} />
            )}
          </Show>
        </div>
        <Trail
          planner={planner}
          state={trail()}
          send={sendTrail}
          selection={resolved()}
          select={(selection) => send({ kind: 'select', selection })}
          phone={phone()}
          listMode={listMode()}
        />
        <UndoLine
          change={planner.change()}
          canUndo={planner.canUndo()}
          onUndo={() => send({ kind: 'planner', action: { kind: 'undo' } })}
        />
      </div>
      <Show when={planner.pending()}>
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
