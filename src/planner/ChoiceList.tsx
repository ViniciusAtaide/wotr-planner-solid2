import { createMemo, createSignal, For, onSettled, Show } from 'solid-js';
import type { Build } from '~engine/build';
import type { Edit } from '~engine/edits';
import type { Engine } from '~engine/mcp';

import { ClosedCount, OptionList, PickerOption } from '../design';
import { brokenWords, laterPicks, verdictOf } from './planner-state';

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

export interface Judged {
  readonly open: boolean;
  readonly note?: string;
  readonly reasons: readonly string[];
}

export function judge(engine: Engine, build: Build, edit: Edit): Judged {
  const v = verdictOf(engine, build, edit);
  switch (v.kind) {
    case 'applies':
      return { open: true, reasons: [] };
    case 'clears':
      return { open: true, note: `Clears ${laterPicks(v.cleared.length)}`, reasons: [] };
    case 'breaks':
      return { open: false, reasons: brokenWords(engine, build, v.breaks) };
  }
}

export function currentFirst(rows: readonly ChoiceRow[]): ChoiceRow[] {
  return [...rows].sort(
    (a, b) => Number(b.current) - Number(a.current) || Number(b.open) - Number(a.open) || a.name.localeCompare(b.name),
  );
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
  const [allClosed, setAllClosed] = createSignal(false);
  const listed = createMemo(() => {
    const t = text().toLowerCase();
    return props.rows.filter((r) => t === '' || r.name.toLowerCase().includes(t));
  });
  const open = () => listed().filter((r) => r.open);
  const closed = () => listed().filter((r) => !r.open);
  const closedShown = () => (allClosed() ? closed() : closed().slice(0, CLOSED_SHOWN));
  return (
    <div class="trail-choices">
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
          <button type="button" class="trail-link" onClick={() => setAllClosed(true)}>
            Show all closed
          </button>
        </Show>
      </OptionList>
    </div>
  );
}
