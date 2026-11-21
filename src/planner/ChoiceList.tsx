import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onSettled,
  Show,
  useContext,
} from 'solid-js';
import type { Build } from '~engine/build';
import type { Edit } from '~engine/edits';
import type { Engine } from '~engine/mcp';

import { ClosedCount, OptionList, PickerOption } from '../design';
import { judgeAll, type Judged } from './planner-state';

export type { Judged };

export const FILTER_FROM = 13;
const CLOSED_SHOWN = 12;
export const CLOSED_PER_REASON = 3;

export function matches(name: string, text: string): boolean {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w !== '');
  const n = name.toLowerCase();
  return words.every((w) => n.includes(w));
}

export function clampMark(at: number, delta: number, count: number): number {
  return count === 0 ? 0 : Math.max(0, Math.min(count - 1, at + delta));
}

export function byReason<T>(rows: readonly T[], reasonOf: (row: T) => string): readonly (readonly [string, number])[] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(reasonOf(r), (counts.get(reasonOf(r)) ?? 0) + 1);
  return [...counts];
}

export function firstPerReason<T>(rows: readonly T[], reasonOf: (row: T) => string, each: number): T[] {
  const seen = new Map<string, number>();
  return rows.filter((r) => {
    const n = seen.get(reasonOf(r)) ?? 0;
    seen.set(reasonOf(r), n + 1);
    return n < each;
  });
}

export interface ChoiceRow {
  readonly key: string;
  readonly name: string;
  readonly open: boolean;
  readonly note?: string | undefined;
  readonly reasons: readonly string[];
  readonly current: boolean;
  readonly take: () => void;
}

export function judge(engine: Engine, build: Build, edit: Edit): Judged {
  return judgeAll(engine, build, [edit]);
}

export const REVEAL_STEP = 60;

export function createReveal(first: number, total: () => number) {
  const [limit, setLimit] = createSignal(first);
  let frame: number | undefined;
  onCleanup(() => {
    if (frame !== undefined) cancelAnimationFrame(frame);
  });
  const more = () => {
    let shown = limit();
    const grow = () => {
      shown += REVEAL_STEP;
      setLimit(shown);
      frame = shown < total() ? requestAnimationFrame(grow) : undefined;
    };
    grow();
  };
  return { limit, more };
}

export function currentFirst(rows: readonly ChoiceRow[]): ChoiceRow[] {
  return [...rows].sort(
    (a, b) => Number(b.current) - Number(a.current) || Number(b.open) - Number(a.open) || a.name.localeCompare(b.name),
  );
}

export function moveThroughOptions(e: KeyboardEvent): void {
  const down = e.key === 'j' || e.key === 'ArrowDown';
  if (!down && e.key !== 'k' && e.key !== 'ArrowUp') return;
  if ((e.target as HTMLElement).tagName === 'INPUT') return;
  const options = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.ww-option')];
  const at = options.indexOf(document.activeElement as HTMLElement);
  options[Math.max(0, Math.min(options.length - 1, at + (down ? 1 : -1)))]?.focus();
  e.preventDefault();
}

export const StepArrived = createContext<() => boolean>(() => true);

export function focusFilter(el: HTMLInputElement | undefined): void {
  if (el !== undefined && matchMedia('(pointer: fine)').matches) el.focus({ preventScroll: true });
}

export interface FilterProps {
  readonly label: string;
  readonly value: string;
  readonly onInput: (text: string) => void;
  readonly onEnter: () => void;
  readonly onMove?: (delta: number) => void;
}

export function Filter(props: FilterProps) {
  let input: HTMLInputElement | undefined;
  const arrived = useContext(StepArrived);
  onSettled(() => {
    if (arrived()) focusFilter(input);
  });
  return (
    <input
      ref={(el) => {
        input = el;
      }}
      class="trail-filter"
      type="search"
      placeholder="Type to filter, Enter takes the first ( / )"
      aria-label={props.label}
      data-picker-filter
      value={props.value}
      onInput={(e) => props.onInput(e.currentTarget.value)}
      onKeyDown={(e) => {
        const delta = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        if (delta !== 0 && props.onMove !== undefined) {
          e.preventDefault();
          props.onMove(delta);
          return;
        }
        if (e.key !== 'Enter') return;
        e.preventDefault();
        props.onEnter();
      }}
    />
  );
}

export interface ClosedToggle {
  readonly shown: boolean;
  readonly toggle: () => void;
}

export interface ChoiceListProps {
  readonly label: string;
  readonly rows: readonly ChoiceRow[];
  readonly closed?: ClosedToggle;
}

export const SCROLL_STYLE = { 'max-height': 'var(--choice-list-max)', 'overflow-y': 'auto' } as const;

export function createClosedToggle(given: () => ClosedToggle | undefined): ClosedToggle {
  const [own, setOwn] = createSignal(false);
  return {
    get shown() {
      return given()?.shown ?? own();
    },
    toggle: () => {
      const outer = given();
      if (outer === undefined) setOwn((v) => !v);
      else outer.toggle();
    },
  };
}

export function markInView(scroller: HTMLElement | undefined): void {
  const row = scroller?.querySelector<HTMLElement>('.ww-option--marked');
  if (scroller === undefined || row === null || row === undefined) return;
  const box = scroller.getBoundingClientRect();
  const at = row.getBoundingClientRect();
  if (at.top < box.top) scroller.scrollTop -= box.top - at.top;
  else if (at.bottom > box.bottom) scroller.scrollTop += at.bottom - box.bottom;
}

const rowReason = (r: ChoiceRow) => r.reasons.join(' ') || 'closed';

export function ChoiceList(props: ChoiceListProps) {
  const [text, setText] = createSignal('');
  const [mark, setMark] = createSignal(0);
  const [all, setAll] = createSignal(false);
  let scroller: HTMLDivElement | undefined;
  const toggle = createClosedToggle(() => props.closed);
  const listed = createMemo(() => props.rows.filter((r) => matches(r.name, text())));
  const open = () => listed().filter((r) => r.open);
  const closed = () => listed().filter((r) => !r.open);
  const reveal = createReveal(CLOSED_SHOWN, () => closed().length);
  const closedShown = () => {
    if (!toggle.shown) return closed().filter((r) => r.current);
    return all() ? closed().slice(0, reveal.limit()) : firstPerReason(closed(), rowReason, CLOSED_PER_REASON);
  };
  const hidden = () => {
    if (!toggle.shown) return [];
    const shown = new Set(closedShown());
    return byReason(
      closed().filter((r) => !shown.has(r)),
      rowReason,
    );
  };
  const filtering = () => props.rows.length >= FILTER_FROM;
  createEffect(
    () => mark(),
    () => markInView(scroller),
  );
  return (
    <div class="trail-choices" onKeyDown={moveThroughOptions}>
      <Show when={filtering()}>
        <Filter
          label={props.label}
          value={text()}
          onInput={(t) => {
            setText(t);
            setMark(0);
          }}
          onMove={(delta) => setMark((m) => clampMark(m, delta, open().length))}
          onEnter={() => open()[mark()]?.take()}
        />
      </Show>
      <Show when={text() !== '' && listed().length === 0}>
        <p class="trail-note">No matches for “{text()}”.</p>
      </Show>
      <Show when={listed().length > 0 && open().length === 0}>
        <p class="trail-note">No choices open here.</p>
      </Show>
      <div
        class="trail-scroll"
        style={SCROLL_STYLE}
        ref={(el) => {
          scroller = el;
        }}
      >
        <OptionList>
          <For each={open()} keyed={(r) => r.key}>
            {(r, i) => (
              <PickerOption
                name={r().name}
                status="open"
                selected={r().current}
                marked={filtering() && i() === mark()}
                links={r().note}
                onPick={() => r().take()}
              />
            )}
          </For>
          <For each={closedShown()} keyed={(r) => r.key}>
            {(r) => <PickerOption name={r().name} status="closed" selected={r().current} refusal={r().reasons} />}
          </For>
          <Show when={hidden().length > 0}>
            <For each={hidden()}>{([reason, n]) => <ClosedCount text={`${n} more closed: ${reason}`} />}</For>
            <button
              type="button"
              class="trail-link"
              onClick={() => {
                setAll(true);
                reveal.more();
              }}
            >
              Show all closed
            </button>
          </Show>
        </OptionList>
      </div>
      <Show when={closed().length > 0}>
        <button
          type="button"
          class="trail-link"
          aria-pressed={toggle.shown ? 'true' : 'false'}
          onClick={() => toggle.toggle()}
        >
          {toggle.shown ? 'Hide closed' : `Show ${closed().length} closed`}
        </button>
      </Show>
    </div>
  );
}
