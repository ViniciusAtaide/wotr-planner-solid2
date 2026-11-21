import { slotKey, type Build, type Pick as BuildPick, type SlotId } from '~engine/build';
import { isShown, refGuid, type Guid } from '~engine/data';
import type { Edit } from '~engine/edits';
import type { CheckedData } from '~engine/load';
import type { Engine } from '~engine/mcp';
import { offeredClasses, offeredRaces, picker, type OptionStatus, type Picker } from '~engine/pickers';
import { refusal } from '~engine/refusals';
import { walk, type OpenedSlot, type Walk } from '~engine/walk';

import { judgeAll, type Judged, type NonEmpty } from './planner-state';
import { optionName } from './words';

export interface FlatChoice {
  readonly key: string;
  readonly name: string;
  readonly edits: NonEmpty<Edit>;
  readonly current: boolean;
  readonly open: boolean;
  readonly note?: string;
  readonly reasons: readonly string[];
}

export function flatName(group: string, variation: string | undefined): string {
  return variation === undefined ? group : `${group} (${variation})`;
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

export function isHeritageSelection(data: CheckedData, selection: Guid): boolean {
  const bp = data.blueprints.get(selection);
  return bp?.$type === 'BlueprintFeatureSelection' && bp.Groups.includes('Racial');
}

export function heritageSlotIn(data: CheckedData, slots: readonly OpenedSlot[]): OpenedSlot | undefined {
  return slots.find(
    (s) => s.source.kind === 'race' && s.parent === undefined && isHeritageSelection(data, s.id.selection),
  );
}

function firstLevelOf(data: CheckedData, build: Build, race: Guid): Build {
  const placeholder = offeredClasses(data)[0];
  const first = build.levels[0] ?? (placeholder === undefined ? undefined : { class: placeholder.guid });
  return {
    race,
    ...(build.raceStat && { raceStat: build.raceStat }),
    ...(build.alignment && { alignment: build.alignment }),
    ...(build.scores && { scores: build.scores }),
    levels: first === undefined ? [] : [first],
    picks: [],
  };
}

export function heritageSlot(engine: Engine, build: Build, w: Walk): OpenedSlot | undefined {
  if (build.race === undefined) return undefined;
  const found = heritageSlotIn(engine.data, w.slots);
  if (found !== undefined || build.levels.length > 0) return found;
  return heritageSlotIn(engine.data, walk(engine.data, firstLevelOf(engine.data, build, build.race), engine.G).slots);
}

export function raceLabel(engine: Engine, build: Build, w: Walk): string | undefined {
  if (build.race === undefined) return undefined;
  const race = engine.data.blueprints.get(build.race);
  const slot = heritageSlot(engine, build, w);
  const pick = slot && pickAt(build, slot.id);
  return flatName(
    race?.name ?? race?.assetName ?? build.race,
    pick && optionName(engine.data, pick.feature, pick.param),
  );
}

export function raceChoices(engine: Engine, build: Build, w: Walk): FlatChoice[] {
  const data = engine.data;
  const was = heritageSlot(engine, build, w);
  const wasPick = was && pickAt(build, was.id);
  const clearing = (keep: SlotId | undefined): Edit[] =>
    wasPick === undefined || (keep !== undefined && slotKey(keep) === slotKey(wasPick.slot))
      ? []
      : [{ kind: 'pick', slot: wasPick.slot }];
  return offeredRaces(data).flatMap((r): FlatChoice[] => {
    const raceName = r.name ?? r.assetName;
    const raceEdit: Edit = { kind: 'race', race: r.guid, ...(build.raceStat && { raceStat: build.raceStat }) };
    const judged: Judged =
      r.guid === build.race
        ? { open: true, reasons: [] }
        : judgeAll(engine, build, after(clearing(undefined), [raceEdit]));
    const probe = firstLevelOf(data, build, r.guid);
    const slot = heritageSlotIn(data, walk(data, probe, engine.G).slots);
    if (slot === undefined) {
      return [
        {
          key: r.guid,
          name: raceName,
          edits: after(clearing(undefined), [raceEdit]),
          current: build.race === r.guid,
          ...inherit(judged, []),
        },
      ];
    }
    const p = picker(data, probe, slot.id, engine.G);
    return (p?.options ?? [])
      .filter((o) => o.shown)
      .map((o) => ({
        key: `${r.guid} ${o.feature}`,
        name: flatName(raceName, optionName(data, o.feature, o.param)),
        edits: after(clearing(slot.id), [raceEdit, pickEdit(slot.id, o)]),
        current: build.race === r.guid && wasPick?.feature === o.feature,
        ...inherit(judged, closedWords(engine, p, o)),
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
    optionName(engine.data, group.feature, group.param),
    child && optionName(engine.data, child.feature, child.param),
  );
}

export function backgroundChoices(engine: Engine, build: Build, w: Walk, base: SlotId): FlatChoice[] {
  const data = engine.data;
  const baseKey = slotKey(base);
  const p = picker(data, build, base, engine.G);
  const group = pickAt(build, base);
  const wasChildren = backgroundChildren(w.slots, base)
    .map((s) => pickAt(build, s.id))
    .filter((q): q is BuildPick => q !== undefined);
  const others = build.picks.filter((q) => slotKey(q.slot) !== baseKey && !wasChildren.includes(q));
  return (p?.options ?? [])
    .filter((o) => o.shown)
    .flatMap((o): FlatChoice[] => {
      const groupName = optionName(data, o.feature, o.param);
      const groupWords = closedWords(engine, p, o);
      const open: Judged = { open: true, reasons: [] };
      const chosen: Build = { ...build, picks: [...others, { slot: base, feature: o.feature }] };
      const children = backgroundChildren(walk(data, chosen, engine.G).slots, base);
      const clearing = (keep: SlotId | undefined): Edit[] =>
        wasChildren
          .filter((q) => keep === undefined || slotKey(q.slot) !== slotKey(keep))
          .map((q) => ({ kind: 'pick', slot: q.slot }));
      const sameGroup = group?.feature === o.feature;
      if (children.length === 0) {
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
      return children.flatMap((child) => {
        const cp = picker(data, chosen, child.id, engine.G);
        const held = pickAt(build, child.id);
        return (cp?.options ?? [])
          .filter((x) => x.shown)
          .map((x) => ({
            key: `${o.feature} ${x.feature}`,
            name: flatName(groupName, optionName(data, x.feature, x.param)),
            edits: after(clearing(child.id), [pickEdit(base, o), pickEdit(child.id, x)]),
            current: sameGroup && held?.feature === x.feature,
            ...inherit(open, [...groupWords, ...closedWords(engine, cp, x)]),
          }));
      });
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
