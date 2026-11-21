import type { JSX } from '@solidjs/web';
import { createMemo, createSignal, For, onSettled, Show, untrack } from 'solid-js';

export const OVERSCAN = 6;
const FALLBACK_ROW = 44;

export function rowHeightOf(el: HTMLElement): number {
  const style = getComputedStyle(el);
  const height = Number.parseFloat(style.getPropertyValue('--choice-row-height'));
  const gap = Number.parseFloat(style.getPropertyValue('--choice-row-gap'));
  return (Number.isFinite(height) && height > 0 ? height : FALLBACK_ROW) + (Number.isFinite(gap) && gap > 0 ? gap : 0);
}

export interface RowWindow {
  readonly start: number;
  readonly end: number;
  readonly row: number;
}

export function windowOf(top: number, height: number, row: number, count: number, overscan = OVERSCAN): RowWindow {
  if (height <= 0 || row <= 0) return { start: 0, end: count, row: 0 };
  const start = Math.max(0, Math.floor(top / row) - overscan);
  const end = Math.min(count, Math.ceil((top + height) / row) + overscan);
  return { start, end, row };
}

export function scrollToIndex(scroller: HTMLElement | undefined, index: number): void {
  if (scroller === undefined || scroller.clientHeight <= 0 || index < 0) return;
  const row = rowHeightOf(scroller);
  const top = index * row;
  if (top < scroller.scrollTop) scroller.scrollTop = top;
  else if (top + row > scroller.scrollTop + scroller.clientHeight)
    scroller.scrollTop = top + row - scroller.clientHeight;
}

interface Placed<T> {
  readonly item: T;
  readonly index: number;
}

export interface WindowedRowsProps<T> {
  readonly items: readonly T[];
  readonly key: (item: T) => string;
  readonly scroller: () => HTMLElement | undefined;
  readonly children: (item: T, index: number) => JSX.Element;
}

export function WindowedRows<T>(props: WindowedRowsProps<T>) {
  const [view, setView] = createSignal({ top: 0, height: 0, row: 0 });
  onSettled(() => {
    const el = props.scroller();
    if (el === undefined) return;
    const measure = () => setView({ top: el.scrollTop, height: el.clientHeight, row: rowHeightOf(el) });
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const resized = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    resized?.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      resized?.disconnect();
    };
  });
  const range = () => {
    const v = view();
    return windowOf(v.top, v.height, v.row, props.items.length);
  };
  const row = (p: Placed<T>) => untrack(() => props.children(p.item, p.index));
  let kept = new Map<string, Placed<T>>();
  const placed = createMemo((): Placed<T>[] => {
    const { start, end } = range();
    const next = new Map<string, Placed<T>>();
    const out = props.items.slice(start, end).map((item, i) => {
      const key = props.key(item);
      const before = kept.get(key);
      const p =
        before !== undefined && before.item === item && before.index === start + i
          ? before
          : { item, index: start + i };
      next.set(key, p);
      return p;
    });
    kept = next;
    return out;
  });
  return (
    <>
      <Show when={range().row > 0 && range().start > 0}>
        <div class="trail-window-gap" aria-hidden="true" style={{ height: `${range().start * range().row}px` }} />
      </Show>
      <For each={placed()} keyed={(p) => props.key(p.item)}>
        {(p) => (
          <div class={['trail-window-row', { 'trail-window-row--fixed': range().row > 0 }]} data-index={p().index}>
            {row(p())}
          </div>
        )}
      </For>
      <Show when={range().row > 0 && range().end < props.items.length}>
        <div
          class="trail-window-gap"
          aria-hidden="true"
          style={{ height: `${(props.items.length - range().end) * range().row}px` }}
        />
      </Show>
    </>
  );
}
