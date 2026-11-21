import { createContext, createSignal, onSettled } from 'solid-js';

export const CollapsedLists = createContext<boolean>(false);

export interface FilterMemory {
  readonly text: () => string;
  readonly set: (text: string) => void;
}

export const StepFilter = createContext<FilterMemory | null>(null);

export function createFilterMemory(): FilterMemory {
  const [text, set] = createSignal('');
  return { text, set: (t) => set(t) };
}

export interface ListPanel {
  readonly shown: () => boolean;
  readonly collapsed: () => boolean;
  readonly show: () => void;
  readonly hide: () => void;
  readonly onFocusIn: () => void;
  readonly onFocusOut: (e: FocusEvent) => void;
  readonly onKeyDown: (e: KeyboardEvent) => void;
}

export function createListPanel(
  collapsible: () => boolean,
  openAtStart: boolean,
  box: () => HTMLElement | undefined,
): ListPanel {
  const [open, setOpen] = createSignal(openAtStart);
  const shown = () => !collapsible() || open();
  onSettled(() => {
    const away = (e: PointerEvent) => {
      const el = box();
      if (el !== undefined && e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  });
  return {
    shown,
    collapsed: () => !shown(),
    show: () => setOpen(true),
    hide: () => setOpen(false),
    onFocusIn: () => setOpen(true),
    onFocusOut: (e) => {
      const next = e.relatedTarget;
      const el = e.currentTarget;
      if (next instanceof Node && el instanceof Node && !el.contains(next)) setOpen(false);
    },
    onKeyDown: (e) => {
      if (e.key === 'Escape' && collapsible() && open()) {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') setOpen(true);
    },
  };
}
