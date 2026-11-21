import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { slotKey, type Build, type Pick, type SlotId } from '~engine/build';
import type { Edit } from '~engine/edits';
import { linkIndex } from '~engine/links';
import { picker, type OptionStatus } from '~engine/pickers';
import { gearNote, listNames, nameOf, refusal } from '~engine/refusals';

import { Button, OptionList, PickerOption } from '../design';
import { Filter, moveThroughOptions, SCROLL_STYLE, type ClosedToggle } from './ChoiceList';
import { featCategory } from './feat-category';
import { after } from './flat-choices';
import { childSlotOf, pickRows, rowMembers, rowOpen, type PickRow } from './nested-options';
import type { NonEmpty } from './planner-state';
import type { TrailApi } from './steps';
import { slotLabel } from './trail-state';
import { scrollToIndex, WindowedRows } from './WindowedRows';
import { shownName } from './words';

const GROUP_REASONS = 3;

export interface PickStepProps {
  readonly trail: TrailApi;
  readonly slot: SlotId;
}

const listedOf = (o: OptionStatus) =>
  o.name === undefined ? undefined : { name: o.name, ...(o.qualifier !== undefined && { qualifier: o.qualifier }) };

export type Item =
  | { readonly kind: 'row'; readonly row: PickRow; readonly index: number }
  | { readonly kind: 'child'; readonly row: PickRow; readonly option: OptionStatus }
  | { readonly kind: 'none'; readonly row: PickRow };

function markable(it: Item): boolean {
  return it.kind === 'row' || (it.kind === 'child' && it.option.closed === undefined);
}

export function nextMark(items: readonly Item[], at: number, delta: number): number {
  for (let i = at + delta; i >= 0 && i < items.length; i += delta) {
    const it = items[i];
    if (it !== undefined && markable(it)) return i;
  }
  return Math.max(0, Math.min(at, items.length - 1));
}

function itemKey(it: Item): string {
  if (it.kind === 'row') return it.row.key;
  if (it.kind === 'none') return `${it.row.key}/none`;
  return `${it.row.key}/${it.option.feature} ${JSON.stringify(it.option.param ?? null)}`;
}

function sameItem(a: Item, b: Item): boolean {
  if (a.kind !== b.kind || a.row !== b.row) return false;
  if (a.kind === 'row' && b.kind === 'row') return a.index === b.index;
  if (a.kind === 'child' && b.kind === 'child') return a.option === b.option;
  return true;
}

export function paramLabel(full: string, group: string): string {
  if (!full.startsWith(`${group} (`) || !full.endsWith(')')) return full;
  return full.slice(group.length + 2, -1);
}

export function PickStep(props: PickStepProps) {
  const planner = () => props.trail.planner;
  const data = () => planner().engine.data;
  const [text, setText] = createSignal('');
  const [mark, setMark] = createSignal(0);
  const [expanded, setExpanded] = createSignal<string | undefined>(undefined);
  const p = createMemo(() => picker(data(), planner().build(), props.slot, planner().engine.G));
  const pickAt = (slot: SlotId): Pick | undefined =>
    planner()
      .build()
      .picks.find((q) => slotKey(q.slot) === slotKey(slot));
  const current = () => pickAt(props.slot);
  const name = (o: OptionStatus) => shownName(data(), o.feature, o.param, listedOf(o));
  const groupName = (o: OptionStatus) => shownName(data(), o.feature, undefined, listedOf(o));
  const rows = createMemo(() => pickRows(data(), p()?.options ?? [], { option: name, group: groupName }, text()));
  const open = () => rows().filter(rowOpen);
  const closed = () => rows().filter((r) => !rowOpen(r));
  const showClosed: ClosedToggle = {
    get shown() {
      return props.trail.state().closedShown.has('pick');
    },
    toggle: () => props.trail.send({ kind: 'toggleClosed', list: 'pick' }),
  };
  let scroller: HTMLDivElement | undefined;
  createEffect(
    () => mark(),
    (at) => scrollToIndex(scroller, at),
  );
  const closedShown = () => (showClosed.shown ? closed() : closed().filter((r) => holdsRow(r)));
  const words = (o: OptionStatus, unit = p()?.unit): readonly string[] => {
    if (o.closed === undefined) return [];
    const r = refusal({ data: data(), G: planner().engine.G, unit }, o.closed);
    return r.unmet.length > 0 ? r.unmet : [r.text];
  };
  const rowWords = (row: PickRow): readonly string[] =>
    [...new Set(rowMembers(row).flatMap((o) => words(o)))].slice(0, GROUP_REASONS);

  const held = createMemo(() => new Set([...(p()?.unit.facts() ?? [])].map((f) => f.blueprint)));
  const links = (o: OptionStatus): string | undefined => {
    const index = linkIndex(data(), planner().engine.G);
    const on = index.needs(o.feature).filter((g) => held().has(g));
    const enables = index.enables(o.feature);
    const parts = [
      on.length > 0 && `Builds on ${listNames(data(), on).join(', ')}`,
      enables[0] !== undefined &&
        `Enables ${listNames(data(), enables)[0] ?? nameOf(data(), enables[0])}${enables.length > 1 ? ` → and ${enables.length - 1} more` : ''}`,
    ].filter((w) => typeof w === 'string');
    return parts.length > 0 ? parts.join(' · ') : undefined;
  };
  const isCurrent = (o: OptionStatus) => {
    const c = current();
    return c !== undefined && c.feature === o.feature && JSON.stringify(c.param) === JSON.stringify(o.param);
  };
  const holdsRow = (row: PickRow) => current()?.feature === (row.kind === 'params' ? row.feature : row.option.feature);
  const oldChildClears = (feature: string): Edit[] => {
    const was = current();
    if (was === undefined || was.feature === feature) return [];
    const child = childSlotOf(props.slot, was.feature);
    return pickAt(child) === undefined ? [] : [{ kind: 'pick', slot: child }];
  };
  const pickOf = (slot: SlotId, o: OptionStatus): Edit => ({
    kind: 'pick',
    slot,
    pick: { feature: o.feature, ...(o.param && { param: o.param }) },
  });
  const apply = (edits: NonEmpty<Edit>, title: string) =>
    edits.length === 1 ? props.trail.edit(edits[0], title) : props.trail.editAll(edits, title);
  const take = (o: OptionStatus) =>
    apply(after(oldChildClears(o.feature), [pickOf(props.slot, o)]), `Picked ${name(o)}`);
  const nested = createMemo(() => {
    const row = rows().find((r) => r.key === expanded());
    if (row?.kind !== 'nested') return undefined;
    const b = planner().build();
    const childSlot = childSlotOf(props.slot, row.option.feature);
    const dropped = new Set([
      slotKey(props.slot),
      ...oldChildClears(row.option.feature).flatMap((e) => (e.kind === 'pick' ? [slotKey(e.slot)] : [])),
    ]);
    const chosen: Build = {
      ...b,
      picks: [
        ...b.picks.filter((q) => !dropped.has(slotKey(q.slot))),
        { slot: props.slot, feature: row.option.feature },
      ],
    };
    return { row, slot: childSlot, picker: picker(data(), chosen, childSlot, planner().engine.G) };
  });
  const takeNested = (row: PickRow & { readonly kind: 'nested' }, child: OptionStatus) =>
    apply(
      after(oldChildClears(row.option.feature), [
        pickOf(props.slot, row.option),
        pickOf(childSlotOf(props.slot, row.option.feature), child),
      ]),
      `Picked ${row.name} (${name(child)})`,
    );
  const toggle = (key: string) => setExpanded((now) => (now === key ? undefined : key));
  const enterRow = (row: PickRow | undefined) => {
    if (row === undefined) return;
    if (row.kind === 'option') take(row.option);
    else setExpanded(row.key);
  };
  const onKey = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const parent = target.closest('[data-parent]')?.getAttribute('data-parent') ?? undefined;
    const childOf = target.closest('[data-child-of]')?.getAttribute('data-child-of') ?? undefined;
    if (e.key === 'ArrowRight' && parent !== undefined) {
      e.preventDefault();
      setExpanded(parent);
      return;
    }
    if (e.key === 'ArrowLeft' && (parent ?? childOf) !== undefined) {
      e.preventDefault();
      const key = parent ?? childOf;
      setExpanded(undefined);
      if (childOf !== undefined) {
        (e.currentTarget as HTMLElement)
          .querySelector<HTMLElement>(`[data-parent="${CSS.escape(key ?? '')}"] .ww-option`)
          ?.focus();
      }
      return;
    }
    moveThroughOptions(e);
  };
  const children = (row: PickRow): readonly OptionStatus[] => {
    const all = row.kind === 'params' ? row.options : row.kind === 'nested' ? (nested()?.picker?.options ?? []) : [];
    const shown = all.filter((o) => o.shown).toSorted((a, b) => childName(row, a).localeCompare(childName(row, b)));
    return [...shown.filter((o) => o.closed === undefined), ...shown.filter((o) => o.closed !== undefined)];
  };
  const childName = (row: PickRow, o: OptionStatus) =>
    row.kind === 'params' ? paramLabel(name(o), row.name) : name(o);
  const childCurrent = (row: PickRow, o: OptionStatus) => {
    if (row.kind !== 'nested') return isCurrent(o);
    return holdsRow(row) && pickAt(childSlotOf(props.slot, row.option.feature))?.feature === o.feature;
  };
  const gearOf = (o: OptionStatus | undefined) =>
    o?.gearItems === undefined ? undefined : gearNote(data(), o.gearItems);
  const takeChild = (row: PickRow, o: OptionStatus) => {
    if (row.kind === 'nested') takeNested(row, o);
    else take(o);
  };
  const lead = (row: PickRow): OptionStatus | undefined => rowMembers(row)[0];
  const enterItem = (it: Item | undefined) => {
    if (it?.kind === 'row') enterRow(it.row);
    else if (it?.kind === 'child' && it.option.closed === undefined) takeChild(it.row, it.option);
  };
  let lastItems = new Map<string, Item>();
  const items = createMemo((): Item[] => {
    const fresh = open().flatMap((row, index): Item[] => {
      const head: Item = { kind: 'row', row, index };
      if (row.kind === 'option' || expanded() !== row.key) return [head];
      const kids = children(row);
      return [
        head,
        ...(kids.length === 0
          ? [{ kind: 'none', row } as const]
          : kids.map((option) => ({ kind: 'child', row, option }) as const)),
      ];
    });
    const kept = new Map<string, Item>();
    const out = fresh.map((it) => {
      const key = itemKey(it);
      const before = lastItems.get(key);
      const same = before !== undefined && sameItem(before, it) ? before : it;
      kept.set(key, same);
      return same;
    });
    lastItems = kept;
    return out;
  });
  return (
    <Show when={p()} fallback={<p class="trail-note">This choice doesn't open in the Build any more.</p>}>
      <div class="trail-step" onKeyDown={onKey}>
        <Filter
          label={`Filter ${slotLabel(data(), props.slot.selection)} by name`}
          value={text()}
          onInput={(t) => {
            setText(t);
            setMark(0);
          }}
          onMove={(delta) => setMark((m) => nextMark(items(), m, delta))}
          onEnter={() => enterItem(items()[mark()])}
        />
        <Show when={text() === '' || rows().length > 0} fallback={<p class="trail-note">No matches for “{text()}”.</p>}>
          <p class="trail-note">
            {open().length} open · {closed().length} closed
          </p>
        </Show>
        <Show when={rows().length > 0 && open().length === 0}>
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
            <WindowedRows items={items()} key={itemKey} scroller={() => scroller}>
              {(it, at) => {
                const row = it.row;
                if (it.kind === 'none') {
                  return (
                    <div class="trail-sub-row" data-child-of={row.key}>
                      <p class="trail-note">Nothing to choose here yet.</p>
                    </div>
                  );
                }
                if (it.kind === 'child') {
                  const o = it.option;
                  return (
                    <div class="trail-sub-row" data-child-of={row.key}>
                      <Show
                        when={o.closed === undefined}
                        fallback={
                          <PickerOption
                            name={childName(row, o)}
                            status="closed"
                            refusal={words(o, row.kind === 'nested' ? nested()?.picker?.unit : p()?.unit)}
                          />
                        }
                      >
                        <PickerOption
                          name={childName(row, o)}
                          status="open"
                          selected={childCurrent(row, o)}
                          marked={at === mark()}
                          onPick={() => takeChild(row, o)}
                        />
                      </Show>
                    </div>
                  );
                }
                if (row.kind === 'option') {
                  return (
                    <PickerOption
                      name={row.name}
                      status="open"
                      icon={featCategory(data(), row.option.feature)}
                      selected={isCurrent(row.option)}
                      marked={at === mark()}
                      links={links(row.option)}
                      gear={gearOf(row.option)}
                      onPick={() => take(row.option)}
                    />
                  );
                }
                return (
                  <div class="trail-parent" data-parent={row.key}>
                    <PickerOption
                      name={row.name}
                      status="open"
                      icon={featCategory(data(), lead(row)?.feature ?? '')}
                      selected={holdsRow(row)}
                      marked={at === mark()}
                      expanded={expanded() === row.key}
                      links={links(lead(row) as OptionStatus)}
                      onPick={() => toggle(row.key)}
                    />
                  </div>
                );
              }}
            </WindowedRows>
            <For each={closedShown()} keyed={(r) => r.key}>
              {(r) => (
                <PickerOption
                  name={r().name}
                  status="closed"
                  icon={featCategory(data(), lead(r())?.feature ?? '')}
                  selected={holdsRow(r())}
                  links={links(lead(r()) as OptionStatus)}
                  refusal={r().kind === 'params' ? rowWords(r()) : words(lead(r()) as OptionStatus)}
                />
              )}
            </For>
          </OptionList>
        </div>
        <Show when={closed().length > 0}>
          <button
            type="button"
            class="trail-link"
            aria-pressed={showClosed.shown ? 'true' : 'false'}
            onClick={() => showClosed.toggle()}
          >
            {showClosed.shown ? 'Hide closed' : `Show ${closed().length} closed`}
          </button>
        </Show>
        <Show when={current()}>
          <Button
            variant="danger"
            onClick={() =>
              props.trail.edit({ kind: 'pick', slot: props.slot }, `Cleared ${slotLabel(data(), props.slot.selection)}`)
            }
          >
            Clear this pick
          </Button>
        </Show>
      </div>
    </Show>
  );
}
