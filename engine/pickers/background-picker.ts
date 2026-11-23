import { childSlot, slotKey, type Build, type SlotId } from '../build';
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
  const kept = build.picks.filter((q) => slotKey(q.slot) !== baseKey && !slotKey(q.slot).endsWith(`<${baseKey}`));
  const groups = p.options
    .filter((o) => o.shown)
    .map((option): BackgroundGroup => {
      if (data.blueprints.get(option.feature)?.$type !== 'BlueprintFeatureSelection') return { option };
      const chosen: Build = { ...build, picks: [...kept, { slot: base, feature: option.feature }] };
      const child = picker(data, chosen, childSlot(base, option.feature), G);
      return child === undefined ? { option } : { option, child };
    });
  return { base: p, groups };
}
