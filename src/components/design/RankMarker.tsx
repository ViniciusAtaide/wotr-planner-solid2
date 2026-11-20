import { Show } from 'solid-js';

import { PickChips, type PickChip } from './LevelRow';

/**
 * RankMarker (design system): a Mythic rank in the Timeline, between the character levels at its Rank level. A rank
 * placed away from its Expected level is only a hint (ADR 0003): "Expected at level 6, placed at 8".
 */
export default function RankMarker(props: {
  readonly rank: number;
  /** The Mythic path's game name. */
  readonly path: string;
  readonly expected: number;
  /** The Rank level, when it differs from the Expected level. */
  readonly placed?: number;
  readonly picks?: readonly PickChip[];
}) {
  const where = () =>
    props.placed === undefined || props.placed === props.expected
      ? `Expected at level ${props.expected}`
      : `Expected at level ${props.expected}, placed at ${props.placed}`;
  return (
    <div class="ww-rank">
      <div class="ww-rank__mark">M{props.rank}</div>
      {/* The title and the rank's picks stack as a level row's body does. */}
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
