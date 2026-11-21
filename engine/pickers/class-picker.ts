import type { Build, Place } from '../build';
import type { CheckedData } from '../load';
import type { Guid } from '../data';
import { buildGrantIndex, type GrantIndex } from '../grants';
import { pauseAtClass, type FailedRule, type Unit } from '../walk';
import { offeredClasses, offeredMythicClasses } from './offers';

export interface ClassOption {
  readonly class: Guid;
  readonly closed?: FailedRule;
}

export interface ClassPicker {
  readonly place: Place;
  readonly options: readonly ClassOption[];
  readonly unit: Unit;
}

export function classPicker(
  data: CheckedData,
  build: Build,
  place: Place,
  G: GrantIndex = buildGrantIndex(data),
  rankLevel?: number,
): ClassPicker | undefined {
  const paused = pauseAtClass(data, build, place, G, rankLevel);
  if (paused === undefined) return undefined;
  const candidates = 'rank' in place ? offeredMythicClasses(data) : offeredClasses(data);
  return {
    place,
    unit: paused.unit,
    options: candidates.map((c) => {
      const closed = paused.judge(c.guid)[0];
      return closed === undefined ? { class: c.guid } : { class: c.guid, closed };
    }),
  };
}
