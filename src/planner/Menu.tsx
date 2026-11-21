import { createSignal, For, onSettled, Show } from 'solid-js';

import type { ShareLinkProps } from '../design';
import { keepFocus } from './focus-return';
import type { ListMode } from './list-mode';

export type Copied = 'idle' | 'copied' | 'refused';

export async function copyText(text: string): Promise<Copied> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'refused';
  }
}

const SAID_FOR_MS = 3000;
const LIST_MODES: readonly (readonly [ListMode, string])[] = [
  ['inline', 'Inline first'],
  ['modal', 'Modal first'],
];

const LINK_WORDS: Readonly<Record<Copied, string>> = {
  idle: 'Copy link',
  copied: 'Link copied.',
  refused: 'Copy refused: the address bar holds the link',
};
const SHEET_WORDS: Readonly<Record<Copied, string>> = {
  idle: 'Export as text',
  copied: 'Build sheet copied.',
  refused: 'Copy refused by the browser',
};

export interface PlannerMenuProps {
  readonly link: ShareLinkProps;
  readonly forked: boolean;
  readonly onFork: () => void;
  readonly sheet: () => string;
  readonly listMode: ListMode;
  readonly onListMode: (mode: ListMode) => void;
}

function menuItems(list: HTMLElement): HTMLElement[] {
  return [...list.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)')];
}

export function moveInMenu(e: KeyboardEvent): void {
  const list = e.currentTarget;
  if (!(list instanceof HTMLElement)) return;
  const items = menuItems(list);
  if (items.length === 0) return;
  const at = items.indexOf(document.activeElement as HTMLElement);
  const last = items.length - 1;
  const to =
    e.key === 'ArrowDown'
      ? at < 0 || at === last
        ? 0
        : at + 1
      : e.key === 'ArrowUp'
        ? at <= 0
          ? last
          : at - 1
        : e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? last
            : undefined;
  if (to === undefined) return;
  e.preventDefault();
  items[to]?.focus();
}

export function PlannerMenu(props: PlannerMenuProps) {
  const [open, setOpen] = createSignal(false);
  const [said, setSaid] = createSignal<string | undefined>(undefined);
  const copied = (words: string) => {
    setOpen(false);
    setSaid(words);
    setTimeout(() => {
      if (said() === words) setSaid(undefined);
    }, SAID_FOR_MS);
  };
  let root: HTMLDivElement | undefined;
  let toggle: HTMLButtonElement | undefined;
  const close = () => {
    setOpen(false);
    keepFocus(toggle);
  };
  onSettled(() => {
    const away = (e: Event) => {
      if (root !== undefined && e.target instanceof Node && !root.contains(e.target)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open()) close();
    };
    const moved = () => setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    window.addEventListener('hashchange', moved);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('hashchange', moved);
    };
  });
  const linkLabel = () => {
    switch (props.link.state) {
      case 'making':
        return 'Making the link…';
      case 'failed':
        return `No link: ${props.link.reason}`;
      case 'ready':
        return LINK_WORDS.idle;
    }
  };
  return (
    <div
      class="planner-menu"
      ref={(el) => {
        root = el;
      }}
    >
      <button
        ref={(el) => {
          toggle = el;
        }}
        type="button"
        class="planner-menu__button"
        aria-label="Build menu"
        aria-haspopup="menu"
        aria-expanded={open() ? 'true' : 'false'}
        onClick={() => {
          setSaid(undefined);
          setOpen(!open());
        }}
      >
        ⋯
      </button>
      <span class="planner-menu__said" role="status">
        {said()}
      </span>
      <Show when={open()}>
        <div
          ref={(el) => {
            queueMicrotask(() => menuItems(el)[0]?.focus());
          }}
          class="planner-menu__list"
          role="menu"
          aria-label="Build"
          onKeyDown={(e) => moveInMenu(e)}
        >
          <button
            type="button"
            role="menuitem"
            disabled={props.link.state !== 'ready'}
            onClick={() => {
              if (props.link.state !== 'ready') return;
              close();
              void copyText(props.link.url).then((c) => {
                if (c === 'copied') copied(LINK_WORDS.copied);
                else setSaid(LINK_WORDS.refused);
              });
            }}
          >
            {linkLabel()}
          </button>
          <Show when={!props.forked}>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                props.onFork();
              }}
            >
              Fork this Build
            </button>
          </Show>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              void copyText(props.sheet()).then((c) => {
                if (c === 'copied') copied(SHEET_WORDS.copied);
                else setSaid(SHEET_WORDS.refused);
              });
            }}
          >
            {SHEET_WORDS.idle}
          </button>
          <div class="planner-menu__group" role="group" aria-label="Choice lists">
            <span class="planner-menu__label">Choice lists</span>
            <For each={LIST_MODES}>
              {([mode, words]) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={props.listMode === mode ? 'true' : 'false'}
                  onClick={() => {
                    close();
                    props.onListMode(mode);
                  }}
                >
                  {words}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}

export interface UndoLineProps {
  readonly change: string | undefined;
  readonly canUndo: boolean;
  readonly onUndo: () => void;
}

export function UndoLine(props: UndoLineProps) {
  return (
    <div class="planner-undo" aria-live="polite">
      <Show when={props.canUndo}>
        <span class="planner-undo__what">{props.change ?? ''}</span>
        <button type="button" class="trail-link" onClick={() => props.onUndo()}>
          Undo
        </button>
      </Show>
    </div>
  );
}
