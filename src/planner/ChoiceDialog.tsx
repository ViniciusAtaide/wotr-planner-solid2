import { Portal, type JSX } from '@solidjs/web';
import { createSignal, For, onSettled, Show } from 'solid-js';

import { OptionDetails, type DetailHub, type OptionDetail, type OptionSummary } from './option-detail';

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

export function detailOf(target: EventTarget | null): OptionDetail | undefined {
  const option = target instanceof Element ? target.closest('.ww-option') : null;
  if (option === null) return undefined;
  const meta = option.querySelector('.ww-option__meta')?.textContent;
  return {
    name: option.querySelector('.ww-option__name')?.textContent ?? '',
    closed: option.classList.contains('ww-option--closed'),
    current: option.classList.contains('ww-option--selected'),
    summary: undefined,
    links: meta === undefined || meta === null ? [] : [meta],
    warnings: [],
    refusal: [...option.querySelectorAll('.ww-refusal li')].map((li) => li.textContent ?? ''),
  };
}

function keyOf(target: EventTarget | null): string | undefined {
  const el = target instanceof Element ? target.closest('[data-detail-key]') : null;
  return el?.getAttribute('data-detail-key') ?? undefined;
}

const ROLE_WORDS: Readonly<Record<string, string>> = {
  bonus: 'Bonus',
  save: 'Save',
  immunity: 'Immunity',
  resistance: 'Resistance',
  weakness: 'Weakness',
  requirement: 'Needs',
  trigger: 'When',
};

function SummaryBlock(props: { readonly summary: OptionSummary }) {
  return (
    <>
      <Show when={props.summary.written && props.summary.text}>
        {(text) => <p class="choice-dialog__summary">{text()}</p>}
      </Show>
      <Show
        when={props.summary.labels.length > 0}
        fallback={
          <Show when={!props.summary.written}>
            <p class="trail-note">No summary yet.</p>
          </Show>
        }
      >
        <ul class="choice-dialog__labels">
          <For each={props.summary.labels}>
            {(label) => (
              <li>
                <span class="choice-dialog__role">{ROLE_WORDS[label.role] ?? label.role}</span> {label.text}
              </li>
            )}
          </For>
        </ul>
      </Show>
    </>
  );
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
  let find: ((key: string) => OptionDetail | undefined) | undefined;
  let pointed: string | undefined;
  const hub: DetailHub = {
    resolve: (f) => {
      find = f;
      queueMicrotask(() => {
        if (pointed !== undefined) hub.point(pointed);
      });
    },
    point: (key) => {
      pointed = key;
      const found = key === undefined ? undefined : find?.(key);
      if (found !== undefined) setDetail(found);
    },
  };
  const follow = (target: EventTarget | null) => {
    const key = keyOf(target);
    const found = key === undefined ? undefined : find?.(key);
    setDetail(found ?? detailOf(target) ?? detail());
  };
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
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      props.onClose();
    };
    document.addEventListener('keydown', onEscape, true);
    const frame = requestAnimationFrame(() => {
      if (box !== undefined) dialogStart(box, matchMedia(FINE_POINTER).matches)?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(watch);
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onEscape, true);
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
          onFocusIn={(e) => follow(e.target)}
          onPointerOver={(e) => follow(e.target)}
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
            <div class="choice-dialog__list">
              <OptionDetails value={hub}>{props.children}</OptionDetails>
            </div>
            <aside class="choice-dialog__detail" aria-label="The option in focus">
              <Show when={detail()} fallback={<p class="trail-note">Point at or focus an option to see it here.</p>}>
                {(d) => (
                  <>
                    <h3 class="choice-dialog__name">{d().name}</h3>
                    <p class="trail-note">
                      {d().current ? 'Current · ' : ''}
                      {d().closed ? 'Closed' : 'Open'}
                    </p>
                    <ul class="ww-refusal">
                      <For each={d().refusal}>{(line) => <li>{line}</li>}</For>
                    </ul>
                    <Show when={d().summary}>{(summary) => <SummaryBlock summary={summary()} />}</Show>
                    <Show when={d().warnings.length > 0}>
                      <ul class="choice-dialog__warnings">
                        <For each={d().warnings}>{(line) => <li>{line}</li>}</For>
                      </ul>
                    </Show>
                    <Show when={d().links.length > 0}>
                      <ul class="choice-dialog__links">
                        <For each={d().links}>{(line) => <li>{line}</li>}</For>
                      </ul>
                    </Show>
                    <Show when={d().gear}>{(gear) => <p class="trail-note">{gear()}</p>}</Show>
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
