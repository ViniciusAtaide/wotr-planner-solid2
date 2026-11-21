import { createEffect, createSignal, onSettled, Show } from 'solid-js';

import type { ShareLinkProps } from '../design';

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
}

export function PlannerMenu(props: PlannerMenuProps) {
  const [open, setOpen] = createSignal(false);
  const [link, setLink] = createSignal<Copied>('idle');
  const [sheet, setSheet] = createSignal<Copied>('idle');
  const [said, setSaid] = createSignal<string | undefined>(undefined);
  const copied = (words: string) => {
    setOpen(false);
    setSaid(words);
    setTimeout(() => {
      if (said() === words) setSaid(undefined);
    }, SAID_FOR_MS);
  };
  let root: HTMLDivElement | undefined;
  createEffect(
    () => (props.link.state === 'ready' ? props.link.url : props.link.state),
    () => {
      setLink('idle');
    },
  );
  onSettled(() => {
    const away = (e: Event) => {
      if (root !== undefined && e.target instanceof Node && !root.contains(e.target)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  });
  const linkLabel = () => {
    switch (props.link.state) {
      case 'making':
        return 'Making the link…';
      case 'failed':
        return `No link: ${props.link.reason}`;
      case 'ready':
        return LINK_WORDS[link()];
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
        type="button"
        class="planner-menu__button"
        aria-label="Build menu"
        aria-haspopup="menu"
        aria-expanded={open() ? 'true' : 'false'}
        onClick={() => {
          setSheet('idle');
          setLink('idle');
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
        <div class="planner-menu__list" role="menu" aria-label="Build">
          <button
            type="button"
            role="menuitem"
            disabled={props.link.state !== 'ready'}
            onClick={() => {
              if (props.link.state !== 'ready') return;
              void copyText(props.link.url).then((c) => {
                setLink(c);
                if (c === 'copied') copied(LINK_WORDS.copied);
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
                setOpen(false);
                props.onFork();
              }}
            >
              Fork this Build
            </button>
          </Show>
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              void copyText(props.sheet()).then((c) => {
                setSheet(c);
                if (c === 'copied') copied(SHEET_WORDS.copied);
              })
            }
          >
            {SHEET_WORDS[sheet()]}
          </button>
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
