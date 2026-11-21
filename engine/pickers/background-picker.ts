import { slotKey, type Build, type SlotId } from '../build';
import type { CheckedData } from '../load';
import { buildGrantIndex, type GrantIndex } from '../grants';
import { picker, type OptionStatus, type Picker } from './pickers';

export interface BackgroundGroup {
  readonly option: OptionStatus;
  readonly child?: Picker;
}

export interface BackgroundPicker {
  readonly base: Picker;
  readonly groups: readonly BackgroundGroup[];
}

export function backgroundPicker(
  data: CheckedData,
  build: Build,
  base: SlotId,
  G: GrantIndex = buildGrantIndex(data),
): BackgroundPicker | undefined {
  const p = picker(data, build, base, G);
  if (p === undefined) return undefined;
  const baseKey = slotKey(base);
  const placeKeyOf = (s: SlotId) => JSON.stringify(s.place);
  const old = build.picks.find((q) => slotKey(q.slot) === baseKey)?.feature;
  const kept = build.picks.filter(
    (q) => slotKey(q.slot) !== baseKey && !(q.slot.selection === old && placeKeyOf(q.slot) === placeKeyOf(base)),
  );
  const groups = p.options
    .filter((o) => o.shown)
    .map((option): BackgroundGroup => {
      if (data.blueprints.get(option.feature)?.$type !== 'BlueprintFeatureSelection') return { option };
      const childSlot: SlotId = { place: base.place, selection: option.feature, index: 0 };
      const chosen: Build = { ...build, picks: [...kept, { slot: base, feature: option.feature }] };
      const child = picker(data, chosen, childSlot, G);
      return child === undefined ? { option } : { option, child };
    });
  return { base: p, groups };
}
