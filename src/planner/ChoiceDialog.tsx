import { Portal, type JSX } from '@solidjs/web';
import { createSignal, For, onSettled, Show } from 'solid-js';

const FINE_POINTER = '(pointer: fine)';
const HASH_WATCH_MS = 250;

let holders = 0;

function ownsEntry(): boolean {
  return (history.state as { choiceDialog?: boolean } | null)?.choiceDialog === true;
}

function holdEntry(): void {
  holders += 1;
  if (!ownsEntry()) history.pushState({ choiceDialog: true }, '');
}

function releaseEntry(popped: boolean): void {
  holders = Math.max(0, holders - 1);
  if (popped) return;
  setTimeout(() => {
    if (holders > 0 || !ownsEntry()) return;
    const keep = location.hash;
    const restore = () => {
      window.removeEventListener('popstate', restore);
      if (location.hash !== keep) history.replaceState(null, '', keep === '' ? location.pathname : keep);
    };
    window.addEventListener('popstate', restore);
    history.back();
  }, 0);
}

export interface OptionDetail {
  readonly name: string;
  readonly closed: boolean;
  readonly lines: readonly string[];
  readonly meta?: string | undefined;
}

export function detailOf(target: EventTarget | null): OptionDetail | undefined {
  const option = target instanceof Element ? target.closest('.ww-option') : null;
  if (option === null) return undefined;
  return {
    name: option.querySelector('.ww-option__name')?.textContent ?? '',
    closed: option.classList.contains('ww-option--closed'),
    lines: [...option.querySelectorAll('.ww-refusal li')].map((li) => li.textContent ?? ''),
    meta: option.querySelector('.ww-option__meta')?.textContent ?? undefined,
  };
}

export function dialogStart(box: HTMLElement, fine: boolean): HTMLElement | null {
  const controls = 'button:not([disabled]):not([data-close]), [role="button"][tabindex="0"]';
  return box.querySelector<HTMLElement>(fine ? `input, ${controls}` : controls);
}

export interface ChoiceDialogProps {
  readonly title: string;
  readonly line: string;
  readonly onClose: () => void;
  readonly returnTo?: () => HTMLElement | undefined;
  readonly children: JSX.Element;
}

export function ChoiceDialog(props: ChoiceDialogProps) {
  let box: HTMLDivElement | undefined;
  const [detail, setDetail] = createSignal<OptionDetail | undefined>(undefined);
  onSettled(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.documentElement;
    root.classList.add('choice-open');
    holdEntry();
    let latest = location.hash;
    let popped = false;
    const watch = setInterval(() => {
      latest = location.hash;
    }, HASH_WATCH_MS);
    const onPop = () => {
      popped = true;
      if (location.hash !== latest) history.replaceState(null, '', latest === '' ? location.pathname : latest);
      props.onClose();
    };
    window.addEventListener('popstate', onPop);
    const frame = requestAnimationFrame(() => {
      if (box !== undefined) dialogStart(box, matchMedia(FINE_POINTER).matches)?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(watch);
      window.removeEventListener('popstate', onPop);
      root.classList.remove('choice-open');
      releaseEntry(popped);
      const back = opener?.isConnected === true && opener !== document.body ? opener : props.returnTo?.();
      back?.focus({ preventScroll: true });
    };
  });
  return (
    <Portal>
      <div class="choice-overlay">
        <div
          ref={(el) => {
            box = el;
          }}
          class="choice-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={props.title}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            props.onClose();
          }}
          onFocusIn={(e) => setDetail(detailOf(e.target) ?? detail())}
          onPointerOver={(e) => setDetail(detailOf(e.target) ?? detail())}
        >
          <header class="choice-dialog__head">
            <button type="button" class="trail-link" data-close onClick={() => props.onClose()}>
              ← Back
            </button>
            <div class="choice-dialog__titles">
              <h2 class="choice-dialog__title">{props.title}</h2>
              <p class="choice-dialog__line">{props.line}</p>
            </div>
          </header>
          <div class="choice-dialog__body">
            <div class="choice-dialog__list">{props.children}</div>
            <aside class="choice-dialog__detail" aria-label="The option in focus">
              <Show when={detail()} fallback={<p class="trail-note">Point at or focus an option to see it here.</p>}>
                {(d) => (
                  <>
                    <h3 class="choice-dialog__name">{d().name}</h3>
                    <p class="trail-note">{d().closed ? 'Closed' : 'Open'}</p>
                    <Show when={d().meta}>
                      <p class="trail-note">{d().meta}</p>
                    </Show>
                    <ul class="ww-refusal">
                      <For each={d().lines}>{(line) => <li>{line}</li>}</For>
                    </ul>
                  </>
                )}
              </Show>
            </aside>
          </div>
        </div>
      </div>
    </Portal>
  );
}
