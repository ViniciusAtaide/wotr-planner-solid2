import type { Build } from '../build';
import type { CheckedData } from '../load';
import type { Guid } from '../data';
import { buildGrantIndex, type GrantIndex } from '../grants';
import { raceRefusal, walk, type FailedRule, type OpenedSlot } from '../walk';
import { offeredClasses, offeredRaces } from './offers';
import { namesInList } from './option-names';
import { picker, type OptionStatus } from './pickers';

export interface RaceOption {
  readonly race: Guid;
  readonly closed?: FailedRule;
  readonly name?: string;
  readonly qualifier?: string;
  readonly heritage?: { readonly slot: OpenedSlot; readonly options: readonly OptionStatus[] };
}

export function heritageSlotIn(data: CheckedData, slots: readonly OpenedSlot[]): OpenedSlot | undefined {
  return slots.find((s) => {
    if (s.source.kind !== 'race' || s.parent !== undefined) return false;
    const bp = data.blueprints.get(s.id.selection);
    return bp?.$type === 'BlueprintFeatureSelection' && bp.Groups.includes('Racial');
  });
}

export function raceStatPending(data: CheckedData, build: Build): boolean {
  const bp = build.race === undefined ? undefined : data.blueprints.get(build.race);
  return bp?.$type === 'BlueprintRace' && bp.SelectableRaceStat && build.raceStat === undefined;
}

export function firstLevelWith(data: CheckedData, build: Build, race: Guid): Build {
  const bp = data.blueprints.get(race);
  const keepsStat = bp?.$type === 'BlueprintRace' && bp.SelectableRaceStat;
  const placeholder = offeredClasses(data)[0];
  const first = build.levels[0] ?? (placeholder === undefined ? undefined : { class: placeholder.guid });
  return {
    race,
    ...(keepsStat && build.raceStat && { raceStat: build.raceStat }),
    ...(build.alignment && { alignment: build.alignment }),
    ...(build.scores && { scores: build.scores }),
    ...(build.classChoices && { classChoices: build.classChoices }),
    levels: first === undefined ? [] : [first],
    picks: [],
  };
}

export function racePicker(data: CheckedData, build: Build, G: GrantIndex = buildGrantIndex(data)): RaceOption[] {
  const races = offeredRaces(data);
  const names = namesInList(
    data,
    races.map((r) => r.guid),
  );
  return races.map((r) => {
    const closed = raceRefusal(data, build, r.guid);
    const probe = firstLevelWith(data, build, r.guid);
    const slot = heritageSlotIn(data, walk(data, probe, G).slots);
    const heritage = slot === undefined ? undefined : picker(data, probe, slot.id, G);
    return {
      race: r.guid,
      ...names.get(r.guid),
      ...(closed && { closed }),
      ...(heritage && { heritage: { slot: heritage.slot, options: heritage.options } }),
    };
  });
}
