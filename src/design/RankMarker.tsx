import { Show } from 'solid-js';

import { PickChips, type PickChip } from './LevelRow';

export interface RankMarkerProps {
  readonly rank: number;
  readonly path: string;
  readonly expected: number;
  readonly placed?: number | undefined;
  readonly picks?: readonly PickChip[];
}

export default function RankMarker(props: RankMarkerProps) {
  const where = () =>
    props.placed === undefined || props.placed === props.expected
      ? `Expected at level ${props.expected}`
      : `Expected at level ${props.expected}, placed at ${props.placed}`;
  return (
    <div class="ww-rank">
      <div class="ww-rank__mark">M{props.rank}</div>
      <div class="ww-level__body">
        <div class="ww-rank__title">
          Mythic Rank {props.rank}{' '}
          <small>
            {props.path} · {where()}
          </small>
        </div>
        <Show when={(props.picks?.length ?? 0) > 0}>
          <PickChips picks={props.picks ?? []} />
        </Show>
      </div>
    </div>
  );
}
