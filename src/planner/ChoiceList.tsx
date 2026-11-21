import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  For,
  onSettled,
  Show,
  untrack,
  useContext,
} from 'solid-js';
import type { Build } from '~engine/build';
import type { Edit } from '~engine/edits';
import type { Engine } from '~engine/mcp';

import { OptionList, PickerOption } from '../design';
import { CollapsedLists, createListPanel, StepFilter } from './list-panel';
import { OptionDetails, type OptionDetail } from './option-detail';
import { judgeAll, type Judged } from './planner-state';
import { scrollToIndex, WindowedRows } from './WindowedRows';

export type { Judged };

export const FILTER_FROM = 13;

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

export interface FieldMode {
  readonly label: string;
  readonly value: string | undefined;
  readonly placeholder: string;
  readonly target: boolean;
  readonly arrive: boolean;
}

export interface FilterProps {
  readonly label: string;
  readonly value: string;
  readonly onInput: (text: string) => void;
  readonly onEnter: () => void;
  readonly onMove?: (delta: number) => void;
  readonly field?: FieldMode | undefined;
  readonly open?: boolean;
  readonly onArrive?: () => void;
  readonly onOpen?: () => void;
}

export function Filter(props: FilterProps) {
  let input: HTMLInputElement | undefined;
  const arrived = useContext(StepArrived);
  onSettled(() => {
    if (props.field === undefined && arrived()) focusFilter(input);
  });
  createEffect(
    () => props.field?.arrive === true,
    (due) => {
      if (!due) return;
      props.onArrive?.();
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      input?.scrollIntoView?.({ block: 'center', behavior: still ? 'auto' : 'smooth' });
      focusFilter(input);
      requestAnimationFrame(() => {
        const now = document.activeElement;
        if (now !== null && now !== document.body && now.isConnected) return;
        input?.closest('.trail-choices, .trail-step')?.querySelector<HTMLElement>('button.ww-option')?.focus({
          preventScroll: true,
        });
      });
    },
  );
  const box = () => (
    <input
      ref={(el) => {
        input = el;
      }}
      class={['trail-filter', { 'trail-field__input': props.field !== undefined }]}
      type="search"
      placeholder={
        props.field === undefined
          ? 'Type to filter, Enter takes the first ( / )'
          : props.open === true
            ? (props.field.value ?? props.field.placeholder)
            : props.field.placeholder
      }
      aria-label={props.field === undefined ? props.label : undefined}
      data-picker-filter
      value={props.field === undefined || props.open === true ? props.value : (props.field.value ?? '')}
      onInput={(e) => props.onInput(e.currentTarget.value)}
      onClick={() => props.onOpen?.()}
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
  return (
    <Show when={props.field} fallback={box()}>
      {(f) => (
        <label
          class={['trail-field', { 'trail-field--unset': f().value === undefined, 'trail-field--target': f().target }]}
        >
          <span class="trail-field__label">{f().label}</span>
          {box()}
        </label>
      )}
    </Show>
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
  readonly field?: FieldMode | undefined;
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

export function ChoiceList(props: ChoiceListProps) {
  const remembered = useContext(StepFilter);
  const [text, setOwnText] = createSignal(untrack(() => remembered?.text() ?? ''));
  const setText = (t: string) => {
    setOwnText(t);
    remembered?.set(t);
  };
  const [mark, setMark] = createSignal(0);
  let scroller: HTMLDivElement | undefined;
  const toggle = createClosedToggle(() => props.closed);
  const filtering = () => props.field !== undefined || props.rows.length >= FILTER_FROM;
  const collapsing = useContext(CollapsedLists);
  const arrived = useContext(StepArrived);
  let box: HTMLDivElement | undefined;
  const panel = createListPanel(
    () => props.field !== undefined || (collapsing && filtering()),
    untrack(() => props.field === undefined && arrived()),
    () => box,
  );
  const all = createMemo((): readonly ChoiceRow[] => (props.field !== undefined && !panel.shown() ? [] : props.rows));
  const listed = createMemo(() => all().filter((r) => matches(r.name, text())));
  const open = () => listed().filter((r) => r.open);
  const closed = () => listed().filter((r) => !r.open);
  const closedShown = () => (toggle.shown ? closed() : closed().filter((r) => r.current));
  createEffect(
    () => panel.shown(),
    (shown) => {
      if (!shown && props.field !== undefined) {
        setText('');
        setMark(0);
      }
    },
  );
  const current = () => all().find((r) => r.current);
  const take = (r: ChoiceRow | undefined) => {
    if (r === undefined) return;
    panel.hide();
    r.take();
  };
  const hub = useContext(OptionDetails);
  const findDetail = (key: string): OptionDetail | undefined => {
    const r = all().find((row) => row.key === key);
    return r === undefined
      ? undefined
      : {
          name: r.name,
          closed: !r.open,
          current: r.current,
          summary: undefined,
          links: r.note === undefined ? [] : [r.note],
          warnings: [],
          refusal: r.reasons,
        };
  };
  onSettled(() => hub?.resolve(findDetail));
  createEffect(
    () => mark(),
    (at) => scrollToIndex(scroller, at),
  );
  createEffect(
    () => {
      const list = listed();
      return { list, key: filtering() ? open()[mark()]?.key : undefined };
    },
    ({ key }) => hub?.point(key),
  );
  return (
    <div
      ref={(el) => {
        box = el;
      }}
      class="trail-choices"
      onKeyDown={(e) => {
        panel.onKeyDown(e);
        moveThroughOptions(e);
      }}
      onFocusIn={() => panel.onFocusIn()}
      onFocusOut={(e) => panel.onFocusOut(e)}
    >
      <Show when={filtering()}>
        <Filter
          label={props.label}
          value={text()}
          onInput={(t) => {
            setText(t);
            setMark(0);
            panel.show();
            if (scroller !== undefined) scroller.scrollTop = 0;
          }}
          onMove={(delta) => setMark((m) => clampMark(m, delta, open().length))}
          onEnter={() => take(open()[mark()])}
          field={props.field}
          open={panel.shown()}
          onArrive={() => panel.show()}
          onOpen={() => panel.show()}
        />
      </Show>
      <Show when={props.field === undefined && panel.collapsed() && current()}>
        {(r) => <PickerOption name={r().name} status="open" selected onPick={() => panel.show()} />}
      </Show>
      <Show when={panel.shown()}>
        <Show when={text() !== '' && listed().length === 0}>
          <p class="trail-note">No matches for “{text()}”.</p>
        </Show>
        <Show when={listed().length > 0 && open().length === 0}>
          <p class="trail-note">No choices open here.</p>
        </Show>
        <div
          class={['trail-scroll', { 'trail-scroll--two-line': all().some((r) => r.note !== undefined) }]}
          style={SCROLL_STYLE}
          ref={(el) => {
            scroller = el;
          }}
        >
          <OptionList>
            <WindowedRows items={open()} key={(r) => r.key} scroller={() => scroller}>
              {(r, i) => (
                <PickerOption
                  name={r.name}
                  status="open"
                  selected={r.current}
                  marked={filtering() && i === mark()}
                  detailKey={r.key}
                  links={r.note}
                  onPick={() => take(r)}
                />
              )}
            </WindowedRows>
            <For each={closedShown()} keyed={(r) => r.key}>
              {(r) => (
                <PickerOption
                  name={r().name}
                  status="closed"
                  selected={r().current}
                  detailKey={r().key}
                  refusal={r().reasons}
                />
              )}
            </For>
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
      </Show>
    </div>
  );
}
