import { createEffect, createMemo, createSignal, For, onSettled, Show, untrack, useContext } from 'solid-js';
import { slotKey, type Build, type Pick, type SlotId } from '~engine/build';
import type { Guid } from '~engine/data';
import type { Edit } from '~engine/edits';
import { enablesWith, linkIndex, linkNames } from '~engine/links';
import { picker, type OptionStatus } from '~engine/pickers';
import { clearsLaterText, gearNote, refusal } from '~engine/refusals';

import { Button, OptionList, PickerOption } from '../design';
import {
  Filter,
  moveThroughOptions,
  rankOrder,
  SCROLL_STYLE,
  StepArrived,
  type ClosedToggle,
  type FieldMode,
} from './ChoiceList';
import { featCategory } from './feat-category';
import { after } from './flat-choices';
import { CollapsedLists, createListPanel, StepFilter } from './list-panel';
import { clashLines, OptionDetails, summaryFor, synergyLines, type OptionDetail } from './option-detail';
import { childSlotOf, pickRows, rowMembers, rowOpen, type PickRow } from './nested-options';
import type { NonEmpty } from './planner-state';
import type { TrailApi } from './steps';
import { isSpellFeat, nestedLabel, slotLabel, SPELL_NOT_MODELLED } from './trail-state';
import { scrollToIndex, WindowedRows } from './WindowedRows';
import { shownName } from './words';

const GROUP_REASONS = 3;

const pickersByBuild = new WeakMap<object, WeakMap<Build, Map<string, ReturnType<typeof picker>>>>();

function pickerFor(...args: Parameters<typeof picker>): ReturnType<typeof picker> {
  const [data, build, slot, G] = args;
  const byGrants = pickersByBuild.get(G ?? data) ?? new WeakMap<Build, Map<string, ReturnType<typeof picker>>>();
  pickersByBuild.set(G ?? data, byGrants);
  const bySlot = byGrants.get(build) ?? new Map<string, ReturnType<typeof picker>>();
  byGrants.set(build, bySlot);
  const key = slotKey(slot);
  if (!bySlot.has(key)) bySlot.set(key, picker(data, build, slot, G));
  return bySlot.get(key);
}

export interface PickStepProps {
  readonly trail: TrailApi;
  readonly slot: SlotId;
  readonly field?: FieldMode | undefined;
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

const sorted = (names: readonly string[]): string[] => names.toSorted((a, b) => a.localeCompare(b));

export function paramLabel(full: string, group: string): string {
  if (!full.startsWith(`${group} (`) || !full.endsWith(')')) return full;
  return full.slice(group.length + 2, -1);
}

export function PickStep(props: PickStepProps) {
  const planner = () => props.trail.planner;
  const data = () => planner().engine.data;
  const remembered = useContext(StepFilter);
  const [text, setOwnText] = createSignal(untrack(() => remembered?.text() ?? ''));
  const setText = (t: string) => {
    setOwnText(t);
    remembered?.set(t);
  };
  const [mark, setMark] = createSignal(0);
  const [expanded, setExpanded] = createSignal<string | undefined>(undefined);
  const collapsing = useContext(CollapsedLists);
  const arrived = useContext(StepArrived);
  let box: HTMLDivElement | undefined;
  const panel = createListPanel(
    () => props.field !== undefined || collapsing,
    untrack(() => props.field === undefined && arrived()),
    () => box,
  );
  const idle = () => props.field !== undefined && !panel.shown();
  const p = createMemo(() =>
    idle() ? undefined : pickerFor(data(), planner().build(), props.slot, planner().engine.G),
  );
  createEffect(
    () => panel.shown(),
    (shown) => {
      if (!shown && props.field !== undefined) {
        setText('');
        setMark(0);
        setExpanded(undefined);
      }
    },
  );
  const pickAt = (slot: SlotId): Pick | undefined =>
    planner()
      .build()
      .picks.find((q) => slotKey(q.slot) === slotKey(slot));
  const current = () => pickAt(props.slot);
  const name = (o: OptionStatus) => shownName(data(), o.feature, o.param, listedOf(o));
  const groupName = (o: OptionStatus) => shownName(data(), o.feature, undefined, listedOf(o));
  const rows = createMemo(() =>
    rankOrder(pickRows(data(), p()?.options ?? [], { option: name, group: groupName }, text()), (r) => r.name, text()),
  );
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
    const enables = sorted(linkNames(data(), enablesWith(data(), o.feature, o.param, planner().engine.G)));
    const parts = [
      on.length > 0 && `Builds on ${sorted(linkNames(data(), on)).join(', ')}`,
      enables[0] !== undefined &&
        `Enables ${enables[0]}${enables.length > 1 ? ` → and ${enables.length - 1} more` : ''}`,
    ].filter((w) => typeof w === 'string');
    return parts.length > 0 ? parts.join(' · ') : undefined;
  };
  const buildsOn = (o: OptionStatus): readonly Guid[] =>
    linkIndex(data(), planner().engine.G)
      .needs(o.feature)
      .filter((g) => held().has(g));
  const linked = (o: OptionStatus | undefined) =>
    o !== undefined && (buildsOn(o).length > 0 || (o.synergy?.shared.length ?? 0) > 0);
  const clash = (o: OptionStatus | undefined) => (o?.synergy?.wontStack.length ?? 0) > 0;
  const heldLater = (o: OptionStatus | undefined) =>
    o?.clearsLater === undefined ? undefined : clearsLaterText(o.clearsLater.place);
  const summary = (o: OptionStatus | undefined) =>
    o === undefined ? undefined : summaryFor(data(), planner().engine.G, o.feature).text;
  const fullLinks = (o: OptionStatus): readonly string[] => {
    const on = buildsOn(o);
    const enables = enablesWith(data(), o.feature, o.param, planner().engine.G);
    return [
      ...(on.length > 0 ? [`Builds on ${sorted(linkNames(data(), on)).join(', ')}`] : []),
      ...synergyLines(data(), o.synergy),
      ...(enables.length > 0 ? [`Enables ${sorted(linkNames(data(), enables)).join(', ')}`] : []),
    ];
  };
  const detailOf = (row: PickRow, o: OptionStatus, child: boolean): OptionDetail => {
    if (!child && row.kind === 'params') {
      const open = rowOpen(row);
      return {
        name: row.name,
        closed: !open,
        current: holdsRow(row),
        summary: summaryFor(data(), planner().engine.G, row.feature),
        links: [
          ...fullLinks(o).filter((line) => !line.startsWith('Shares ')),
          ...new Set(row.options.flatMap((m) => synergyLines(data(), m.synergy))),
        ],
        warnings: [],
        refusal: open ? [] : rowWords(row),
      };
    }
    return detailOne(row, o, child);
  };
  const detailOne = (row: PickRow, o: OptionStatus, child: boolean): OptionDetail => ({
    name: !child ? row.name : row.kind === 'nested' ? nestedLabel(row.name, name(o)) : name(o),
    closed: o.closed === undefined ? false : true,
    current: child ? childCurrent(row, o) : row.kind === 'option' ? isCurrent(o) : holdsRow(row),
    summary: summaryFor(data(), planner().engine.G, o.feature),
    links: fullLinks(o),
    warnings: [...clashLines(data(), o.synergy), ...[heldLater(o)].filter((w) => w !== undefined)],
    refusal:
      o.closed === undefined ? [] : words(o, child && row.kind === 'nested' ? nested()?.picker?.unit : p()?.unit),
    gear: gearOf(o),
  });
  const findDetail = (key: string): OptionDetail | undefined => {
    const cut = key.indexOf('/');
    const rowKey = cut < 0 ? key : key.slice(0, cut);
    const row = rows().find((r) => r.key === rowKey);
    if (row === undefined) return undefined;
    if (cut < 0) {
      const o = lead(row);
      return o === undefined ? undefined : detailOf(row, o, false);
    }
    const o = children(row).find((c) => `${rowKey}/${c.feature} ${JSON.stringify(c.param ?? null)}` === key);
    return o === undefined ? undefined : detailOf(row, o, true);
  };
  const hub = useContext(OptionDetails);
  onSettled(() => hub?.resolve(findDetail));
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
  const currentName = () => {
    const c = current();
    if (c === undefined) return undefined;
    const own = shownName(data(), c.feature, c.param);
    const child = pickAt(childSlotOf(props.slot, c.feature));
    return child === undefined ? own : nestedLabel(own, shownName(data(), child.feature, child.param));
  };
  const apply = (edits: NonEmpty<Edit>, title: string) => {
    panel.hide();
    if (edits.length === 1) props.trail.edit(edits[0], title);
    else props.trail.editAll(edits, title);
  };
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
    return { row, slot: childSlot, picker: pickerFor(data(), chosen, childSlot, planner().engine.G) };
  });
  const takeNested = (row: PickRow & { readonly kind: 'nested' }, child: OptionStatus) =>
    apply(
      after(oldChildClears(row.option.feature), [
        pickOf(props.slot, row.option),
        pickOf(childSlotOf(props.slot, row.option.feature), child),
      ]),
      `Picked ${nestedLabel(row.name, name(child))}`,
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
  createEffect(
    () => {
      const list = items();
      const it = list[mark()];
      return { list, key: it === undefined ? closed()[0]?.key : itemKey(it) };
    },
    ({ key }) => hub?.point(key),
  );
  return (
    <Show
      when={props.field !== undefined || p()}
      fallback={<p class="trail-note">This choice doesn't open in the Build any more.</p>}
    >
      <div
        ref={(el) => {
          box = el;
        }}
        class="trail-step"
        onKeyDown={(e) => {
          panel.onKeyDown(e);
          onKey(e);
        }}
        onFocusIn={() => panel.onFocusIn()}
        onFocusOut={(e) => panel.onFocusOut(e)}
      >
        <Filter
          label={`Filter ${slotLabel(data(), props.slot.selection)} by name`}
          value={text()}
          onInput={(t) => {
            setText(t);
            setMark(0);
            panel.show();
            if (scroller !== undefined) scroller.scrollTop = 0;
          }}
          onMove={(delta) => setMark((m) => nextMark(items(), m, delta))}
          onEnter={() => enterItem(items()[mark()])}
          field={props.field}
          open={panel.shown()}
          onArrive={() => panel.show()}
          onOpen={() => panel.show()}
        />
        <Show
          when={
            current() !== undefined && current()?.param === undefined && isSpellFeat(data(), current()?.feature ?? '')
          }
        >
          <p class="trail-note">
            {currentName()} is held. {SPELL_NOT_MODELLED}
          </p>
        </Show>
        <Show when={props.field === undefined && panel.collapsed() && currentName()}>
          {(n) => <PickerOption name={n()} status="open" selected onPick={() => panel.show()} />}
        </Show>
        <Show when={panel.shown()}>
          <Show
            when={text() === '' || rows().length > 0}
            fallback={<p class="trail-note">No matches for “{text()}”.</p>}
          >
            <p class="trail-note">
              {open().length} open · {closed().length} closed
            </p>
          </Show>
          <Show when={rows().length > 0 && open().length === 0}>
            <p class="trail-note">No choices open here.</p>
          </Show>
          <div
            class="trail-scroll trail-scroll--two-line"
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
                              detailKey={itemKey(it)}
                              refusal={words(o, row.kind === 'nested' ? nested()?.picker?.unit : p()?.unit)}
                            />
                          }
                        >
                          <PickerOption
                            name={childName(row, o)}
                            status="open"
                            selected={childCurrent(row, o)}
                            marked={at === mark()}
                            detailKey={itemKey(it)}
                            summary={row.kind === 'nested' ? summary(o) : undefined}
                            linked={linked(o)}
                            clash={clash(o)}
                            held={heldLater(o)}
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
                        detailKey={row.key}
                        summary={summary(row.option)}
                        links={links(row.option)}
                        linked={linked(row.option)}
                        clash={clash(row.option)}
                        held={heldLater(row.option)}
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
                        detailKey={row.key}
                        summary={summary(lead(row))}
                        links={links(lead(row) as OptionStatus)}
                        linked={rowMembers(row).some((m) => linked(m))}
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
                    detailKey={r().key}
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
        </Show>
        <Show when={current() && !idle()}>
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
