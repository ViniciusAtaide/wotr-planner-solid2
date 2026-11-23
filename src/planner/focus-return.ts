const FINE_POINTER = '(pointer: fine)';

export function firstControl(el: HTMLElement, fine: boolean): HTMLElement | null {
  const controls = 'button:not([disabled]):not([data-back]):not([data-aside]), [role="button"][tabindex="0"]';
  return el.querySelector<HTMLElement>(fine ? `input, ${controls}` : controls);
}

function finePointer(): boolean {
  return typeof matchMedia !== 'function' || matchMedia(FINE_POINTER).matches;
}

function hereControl(): HTMLElement | null {
  const here = document.querySelector<HTMLElement>('.trail-here');
  return here === null ? null : firstControl(here, finePointer());
}

const STABLE: readonly (() => HTMLElement | null)[] = [
  () => document.querySelector<HTMLElement>('.trail-chip--target'),
  () => document.querySelector<HTMLElement>('.trail-field--target input:not([aria-haspopup])'),
  hereControl,
  () => document.querySelector<HTMLElement>('.trail-here button:not([disabled])'),
  () => document.querySelector<HTMLElement>('.planner-menu__button'),
];

export function stableControl(): HTMLElement | null {
  for (const find of STABLE) {
    const el = find();
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

const NEXT_STEP: readonly (() => HTMLElement | null)[] = [
  () => document.querySelector<HTMLElement>('.trail-chip--target'),
  () => document.querySelector<HTMLElement>('.trail-field--target input:not([aria-haspopup])'),
  hereControl,
  () => document.querySelector<HTMLElement>('.trail-here button:not([disabled])'),
];

function nextStepControl(): HTMLElement | null {
  if (document.querySelector('[role="dialog"]') !== null) return null;
  for (const find of NEXT_STEP) {
    const el = find();
    if (el !== null) return el;
  }
  return null;
}

export function focusNextStep(): void {
  requestAnimationFrame(() => keepFocus(undefined, nextStepControl));
}

export function afterPaint(run: () => void): void {
  requestAnimationFrame(() => setTimeout(run, 0));
}
