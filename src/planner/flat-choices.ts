import { slotKey, type Build, type Pick as BuildPick, type SlotId } from '~engine/build';
import { isShown, refGuid, type Guid } from '~engine/data';
import type { Edit } from '~engine/edits';
import type { CheckedData } from '~engine/load';
import type { Engine } from '~engine/mcp';
import {
  backgroundPicker,
  firstLevelWith,
  heritageSlotIn,
  racePicker,
  type OptionStatus,
  type Picker,
  type RaceOption,
} from '~engine/pickers';
import { refusal } from '~engine/refusals';
import { walk, type OpenedSlot, type Walk } from '~engine/walk';

import type { Judged, NonEmpty } from './planner-state';
import { bareNameOf, listedName, shownName } from './words';

export interface FlatChoice {
  readonly key: string;
  readonly name: string;
  readonly edits: NonEmpty<Edit>;
  readonly current: boolean;
  readonly open: boolean;
  readonly note?: string;
  readonly reasons: readonly string[];
}

function variationPart(group: string, variation: string | undefined): string | undefined {
  if (variation === undefined || variation === group) return undefined;
  const rest = variation.startsWith(`${group} `)
    ? variation.slice(group.length).replace(/^\s*[—–-]?\s*/, '')
    : variation;
  const inner = /^\((.*)\)$/.exec(rest)?.[1] ?? rest;
  return inner === '' ? undefined : inner;
}

export function flatName(group: string, variation: string | undefined): string {
  const part = variationPart(group, variation);
  return part === undefined ? group : `${group} (${part})`;
}

export function joinedName(group: string, variation: string | undefined): string {
  const part = variationPart(group, variation);
  return part === undefined ? group : `${group} · ${part}`;
}

function optionLabel(engine: Engine, o: OptionStatus): string {
  return shownName(
    engine.data,
    o.feature,
    o.param,
    o.name === undefined ? undefined : { name: o.name, ...(o.qualifier !== undefined && { qualifier: o.qualifier }) },
  );
}

export function after(first: readonly Edit[], then: NonEmpty<Edit>): NonEmpty<Edit> {
  const [head, ...rest] = first;
  return head === undefined ? then : [head, ...rest, ...then];
}

function pickEdit(slot: SlotId, o: { readonly feature: Guid; readonly param?: OptionStatus['param'] }): Edit {
  return { kind: 'pick', slot, pick: { feature: o.feature, ...(o.param && { param: o.param }) } };
}

function pickAt(build: Build, slot: SlotId): BuildPick | undefined {
  const key = slotKey(slot);
  return build.picks.find((p) => slotKey(p.slot) === key);
}

function closedWords(engine: Engine, p: Picker | undefined, o: OptionStatus): readonly string[] {
  if (o.closed === undefined) return [];
  const r = refusal({ data: engine.data, G: engine.G, unit: p?.unit }, o.closed);
  return r.unmet.length > 0 ? r.unmet : [r.text];
}

function inherit(judged: Judged, words: readonly string[]): Pick<FlatChoice, 'open' | 'note' | 'reasons'> {
  return {
    open: judged.open && words.length === 0,
    ...(judged.note !== undefined && { note: judged.note }),
    reasons: [...judged.reasons, ...words],
  };
}

export function heritageSlot(engine: Engine, build: Build, w: Walk): OpenedSlot | undefined {
  if (build.race === undefined) return undefined;
  const found = heritageSlotIn(engine.data, w.slots);
  if (found !== undefined || build.levels.length > 0) return found;
  return heritageSlotIn(engine.data, walk(engine.data, firstLevelWith(engine.data, build, build.race), engine.G).slots);
}

export function raceLabel(engine: Engine, build: Build, w: Walk): string | undefined {
  if (build.race === undefined) return undefined;
  const slot = heritageSlot(engine, build, w);
  const pick = slot && pickAt(build, slot.id);
  return joinedName(bareNameOf(engine.data, build.race), pick && shownName(engine.data, pick.feature, pick.param));
}

function raceWords(engine: Engine, closed: RaceOption['closed']): readonly string[] {
  if (closed === undefined) return [];
  const r = refusal({ data: engine.data, G: engine.G }, closed);
  return r.unmet.length > 0 ? r.unmet : [r.text];
}

export function raceChoices(engine: Engine, build: Build, w: Walk): FlatChoice[] {
  const was = heritageSlot(engine, build, w);
  const wasPick = was && pickAt(build, was.id);
  const clearing = (keep: SlotId | undefined): Edit[] =>
    wasPick === undefined || (keep !== undefined && slotKey(keep) === slotKey(wasPick.slot))
      ? []
      : [{ kind: 'pick', slot: wasPick.slot }];
  return racePicker(engine.data, build, engine.G).flatMap((r): FlatChoice[] => {
    const raceName =
      r.name === undefined
        ? bareNameOf(engine.data, r.race)
        : listedName({ name: r.name, ...(r.qualifier !== undefined && { qualifier: r.qualifier }) });
    const raceEdit: Edit = { kind: 'race', race: r.race, ...(build.raceStat && { raceStat: build.raceStat }) };
    const race: Judged = { open: r.closed === undefined, reasons: raceWords(engine, r.closed) };
    const heritage = r.heritage;
    if (heritage === undefined) {
      return [
        {
          key: r.race,
          name: raceName,
          edits: after(clearing(undefined), [raceEdit]),
          current: build.race === r.race,
          ...inherit(race, []),
        },
      ];
    }
    return heritage.options
      .filter((o) => o.shown)
      .map((o) => ({
        key: `${r.race} ${o.feature}`,
        name: joinedName(raceName, optionLabel(engine, o)),
        edits: after(clearing(heritage.slot.id), [raceEdit, pickEdit(heritage.slot.id, o)]),
        current: build.race === r.race && wasPick?.feature === o.feature,
        ...inherit(race, closedWords(engine, undefined, o)),
      }));
  });
}

export function backgroundChildren(slots: readonly OpenedSlot[], base: SlotId): readonly OpenedSlot[] {
  const key = slotKey(base);
  return slots.filter((s) => s.parent === key);
}

export function backgroundLabel(engine: Engine, build: Build, w: Walk, base: SlotId): string | undefined {
  const group = pickAt(build, base);
  if (group === undefined) return undefined;
  const child = backgroundChildren(w.slots, base)
    .map((s) => pickAt(build, s.id))
    .find((p) => p !== undefined);
  return flatName(
    shownName(engine.data, group.feature, group.param),
    child && shownName(engine.data, child.feature, child.param),
  );
}

export const NO_BACKGROUND = 'None';

export function backgroundChoices(engine: Engine, build: Build, w: Walk, base: SlotId): FlatChoice[] {
  const p = backgroundPicker(engine.data, build, base, engine.G);
  if (p === undefined) return [];
  const group = pickAt(build, base);
  const wasChildren = backgroundChildren(w.slots, base)
    .map((s) => pickAt(build, s.id))
    .filter((q): q is BuildPick => q !== undefined);
  const open: Judged = { open: true, reasons: [] };
  return p.groups.flatMap(({ option: o, child }): FlatChoice[] => {
    const groupName = optionLabel(engine, o);
    const groupWords = closedWords(engine, p.base, o);
    const clearing = (keep: SlotId | undefined): Edit[] =>
      wasChildren
        .filter((q) => keep === undefined || slotKey(q.slot) !== slotKey(keep))
        .map((q) => ({ kind: 'pick', slot: q.slot }));
    const sameGroup = group?.feature === o.feature;
    if (child === undefined) {
      if (groupName === NO_BACKGROUND) return [];
      return [
        {
          key: o.feature,
          name: groupName,
          edits: after(clearing(undefined), [pickEdit(base, o)]),
          current: sameGroup,
          ...inherit(open, groupWords),
        },
      ];
    }
    const held = pickAt(build, child.slot.id);
    return child.options
      .filter((x) => x.shown)
      .map((x) => ({
        key: `${o.feature} ${x.feature}`,
        name: flatName(groupName, optionLabel(engine, x)),
        edits: after(clearing(child.slot.id), [pickEdit(base, o), pickEdit(child.slot.id, x)]),
        current: sameGroup && held?.feature === x.feature,
        ...inherit(open, [...groupWords, ...closedWords(engine, child, x)]),
      }));
  });
}

export function shownArchetypes(data: CheckedData, cls: Guid): readonly Guid[] {
  const bp = data.blueprints.get(cls);
  if (bp?.$type !== 'BlueprintCharacterClass') return [];
  return bp.m_Archetypes
    .map((r) => refGuid(r) ?? '')
    .filter((g) => {
      const a = data.blueprints.get(g);
      return a !== undefined && isShown(a);
    });
}
