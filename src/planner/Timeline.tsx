import { For, Show } from 'solid-js';
import { placeKey, slotKey, type Place } from '~engine/build';
import { expectedLevel } from '~engine/mcp';
import { nameOf } from '~engine/refusals';

import { LevelRow, RankMarker, Timeline as TimelineFrame, type PickChip } from '../design';
import type { Planner } from './state';
import type { Selection } from './workspace-state';
import { optionName, ordinal } from './words';

function placesInWalkOrder(levels: number, rankLevels: readonly number[]): Place[] {
  const out: Place[] = [];
  let r = 0;
  for (let l = 1; l <= levels; l++) {
    out.push({ level: l });
    while (r < rankLevels.length && (rankLevels[r] ?? 0) <= l) out.push({ rank: ++r });
  }
  while (r < rankLevels.length) out.push({ rank: ++r });
  return out;
}

export interface TimelineProps {
  readonly planner: Planner;
  readonly selected: Selection | undefined;
  readonly onSelect: (s: Selection) => void;
}

export default function Timeline(props: TimelineProps) {
  const data = () => props.planner.engine.data;
  const places = () =>
    placesInWalkOrder(
      props.planner.build().levels.length,
      (props.planner.build().ranks ?? []).map((r) => r.level),
    );
  const chips = (place: Place): PickChip[] => {
    const w = props.planner.walked();
    const gear = new Set(w.gearDependent.flatMap((d) => (d.slot ? [slotKey(d.slot)] : [])));
    return w.slots
      .filter((s) => placeKey(s.id.place) === placeKey(place))
      .filter((s) => data().blueprints.get(s.id.selection)?.$type !== 'BlueprintParametrizedFeature')
      .map((s) => ({
        slot: nameOf(data(), s.id.selection),
        text: s.pick === undefined ? 'Choose' : optionName(data(), s.pick.feature, s.pick.param),
        empty: s.pick === undefined,
        gear: gear.has(slotKey(s.id)),
        onSelect: () => props.onSelect({ kind: 'slot', slot: s.id }),
      }));
  };
  const isActive = (place: Place) => {
    const s = props.selected;
    if (s === undefined) return false;
    if (s.kind === 'slot') return placeKey(s.slot.place) === placeKey(place);
    if (s.kind === 'level') return 'level' in place && place.level === s.level;
    if (s.kind === 'rank') return 'rank' in place && place.rank === s.rank;
    return false;
  };
  const levelChoices = (level: number): string | undefined => {
    const l = props.planner.build().levels[level - 1];
    if (l === undefined) return undefined;
    const ranks = Object.values(l.skills ?? {}).reduce((n, r) => n + (r ?? 0), 0);
    const parts = [ranks > 0 && `${ranks} skill ${ranks === 1 ? 'rank' : 'ranks'}`, l.increase && `${l.increase} +1`];
    const words = parts.filter((x): x is string => typeof x === 'string');
    return words.length === 0 ? undefined : words.join(' · ');
  };
  const levelDetail = (level: number) => {
    const b = props.planner.build();
    const l = b.levels[level - 1];
    if (l === undefined) return '';
    const classLevel = b.levels.slice(0, level).filter((x) => x.class === l.class).length;
    return [`${ordinal(classLevel)} level`, l.increase && `${l.increase} +1`].filter(Boolean).join(' · ');
  };
  return (
    <TimelineFrame>
      <Show
        when={places().length > 0}
        fallback={
          <div class="ww-level">
            <div class="ww-level__num">—</div>
            <div class="ww-level__body">No levels yet. Add the first level below.</div>
          </div>
        }
      >
        <For each={places()}>
          {(place) =>
            'level' in place ? (
              <LevelRow
                level={place.level}
                characterClass={nameOf(data(), props.planner.build().levels[place.level - 1]?.class ?? '')}
                detail={levelDetail(place.level)}
                active={isActive(place)}
                picks={[
                  {
                    slot: 'Level',
                    text: levelChoices(place.level) ?? 'Class, skills and increase',
                    empty: levelChoices(place.level) === undefined,
                    onSelect: () => props.onSelect({ kind: 'level', level: place.level }),
                  },
                  ...chips(place),
                ]}
              />
            ) : (
              <RankMarker
                rank={place.rank}
                path={nameOf(data(), props.planner.build().ranks?.[place.rank - 1]?.class ?? '')}
                expected={expectedLevel(data(), place.rank)}
                placed={props.planner.build().ranks?.[place.rank - 1]?.level}
                picks={[
                  {
                    slot: 'Rank',
                    text: 'Class and Rank level',
                    empty: true,
                    onSelect: () => props.onSelect({ kind: 'rank', rank: place.rank }),
                  },
                  ...chips(place),
                ]}
              />
            )
          }
        </For>
      </Show>
    </TimelineFrame>
  );
}
