const STABLE = [
  '.trail-chip--target',
  '.trail-here input',
  '.trail-here button:not([disabled])',
  '.planner-menu__button',
] as const;

export function stableControl(): HTMLElement | null {
  for (const selector of STABLE) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el !== null) return el;
  }
  return null;
}

function usable(el: Element | null | undefined): el is HTMLElement {
  return el instanceof HTMLElement && el.isConnected && el !== document.body && !el.matches(':disabled');
}

export function focusLost(): boolean {
  return !usable(document.activeElement);
}

export function keepFocus(
  opener: HTMLElement | null | undefined,
  fallback: () => HTMLElement | null | undefined = stableControl,
): void {
  setTimeout(() => {
    if (!focusLost()) return;
    const target = usable(opener) ? opener : fallback();
    target?.focus({ preventScroll: true });
  }, 0);
}
