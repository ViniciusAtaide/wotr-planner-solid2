import { createMemo, createSignal, For, onCleanup, onSettled, Show } from 'solid-js';
import type { Build } from '~engine/build';
import type { Edit } from '~engine/edits';
import type { Engine } from '~engine/mcp';

import { ClosedCount, OptionList, PickerOption } from '../design';
import { judgeAll, type Judged } from './planner-state';

export type { Judged };

export const FILTER_FROM = 13;
const CLOSED_SHOWN = 12;

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
  const letter = e.key === 'j' || e.key === 'k';
  const down = e.key === 'j' || e.key === 'ArrowDown';
  if (!letter && !down && e.key !== 'ArrowUp') return;
  const typing = (e.target as HTMLElement).tagName === 'INPUT';
  if (typing && (letter || !down)) return;
  const options = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.ww-option')];
  const at = options.indexOf(document.activeElement as HTMLElement);
  options[Math.max(0, Math.min(options.length - 1, at + (down ? 1 : -1)))]?.focus();
  e.preventDefault();
}

export function focusFilter(el: HTMLInputElement | undefined): void {
  if (el !== undefined && matchMedia('(pointer: fine)').matches) el.focus({ preventScroll: true });
}

export interface FilterProps {
  readonly label: string;
  readonly value: string;
  readonly onInput: (text: string) => void;
  readonly onEnter: () => void;
}

export function Filter(props: FilterProps) {
  let input: HTMLInputElement | undefined;
  onSettled(() => focusFilter(input));
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
        if (e.key !== 'Enter') return;
        e.preventDefault();
        props.onEnter();
      }}
    />
  );
}

export interface ChoiceListProps {
  readonly label: string;
  readonly rows: readonly ChoiceRow[];
}

export function ChoiceList(props: ChoiceListProps) {
  const [text, setText] = createSignal('');
  const listed = createMemo(() => {
    const t = text().toLowerCase();
    return props.rows.filter((r) => t === '' || r.name.toLowerCase().includes(t));
  });
  const open = () => listed().filter((r) => r.open);
  const closed = () => listed().filter((r) => !r.open);
  const reveal = createReveal(CLOSED_SHOWN, () => closed().length);
  const closedShown = () => closed().slice(0, reveal.limit());
  return (
    <div class="trail-choices" onKeyDown={moveThroughOptions}>
      <Show when={props.rows.length >= FILTER_FROM}>
        <Filter label={props.label} value={text()} onInput={setText} onEnter={() => open()[0]?.take()} />
      </Show>
      <OptionList>
        <For each={open()} keyed={(r) => r.key}>
          {(r) => (
            <PickerOption
              name={r().name}
              status="open"
              selected={r().current}
              links={r().note}
              onPick={() => r().take()}
            />
          )}
        </For>
        <For each={closedShown()} keyed={(r) => r.key}>
          {(r) => <PickerOption name={r().name} status="closed" refusal={r().reasons} />}
        </For>
        <Show when={closed().length > closedShown().length}>
          <ClosedCount text={`${closed().length - closedShown().length} more closed`} />
          <button type="button" class="trail-link" onClick={() => reveal.more()}>
            Show all closed
          </button>
        </Show>
      </OptionList>
    </div>
  );
}
