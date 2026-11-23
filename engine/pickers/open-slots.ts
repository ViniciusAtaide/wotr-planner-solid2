import { placeKey, slotKey, type Build, type Pick, type Place } from '../build';
import type { CheckedData } from '../load';
import type { OpenedSlot } from '../walk';

export function isSpellFeat(data: CheckedData, feature: string): boolean {
  const bp = data.blueprints.get(feature);
  return (
    bp?.$type === 'BlueprintParametrizedFeature' &&
    (bp.ParameterType === 'SpellSpecialization' || bp.ParameterType === 'LearnSpell')
  );
}

export function heldSpellFeat(data: CheckedData, build: Build, slot: OpenedSlot['id']): Pick | undefined {
  const pick = build.picks.find((p) => slotKey(p.slot) === slotKey(slot));
  return pick !== undefined && pick.param === undefined && isSpellFeat(data, pick.feature) ? pick : undefined;
}

export function openSlotsAt(
  data: CheckedData,
  build: Build,
  slots: readonly OpenedSlot[],
  place?: Place,
): readonly OpenedSlot[] {
  return slots.filter(
    (s) =>
      s.pick === undefined &&
      (place === undefined || placeKey(s.id.place) === placeKey(place)) &&
      data.blueprints.get(s.id.selection)?.$type !== 'BlueprintParametrizedFeature' &&
      heldSpellFeat(data, build, s.id) === undefined,
  );
}
