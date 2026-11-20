import { For } from 'solid-js';

/** One ability score, as the walk computes it at a level. */
export interface Stat {
  /** The short name ("STR"). */
  readonly name: string;
  readonly value: number;
  /** In compare: the score differs from the other Build's. */
  readonly diff?: boolean;
}

/** ModifiableValueAttributeStat.Bonus, as the sheet shows it: value / 2 − 5, signed, with a true minus. */
const modifier = (value: number) => {
  const mod = Math.floor(value / 2) - 5;
  return mod < 0 ? `−${-mod}` : `+${mod}`;
};

export interface StatBlockProps {
  readonly stats: readonly Stat[];
}

/**
 * StatBlock (design system): the six ability scores at a level, from the walk, without Gear unless the Build opts in
 * (ADR 0002). Six columns, or three on a phone. No hit points: the walk doesn't compute them.
 */
export default function StatBlock(props: StatBlockProps) {
  return (
    <div class="ww-stats">
      <For each={props.stats}>
        {(stat) => (
          <div class="ww-stat">
            <span class="ww-stat__name">{stat.name}</span>
            <span class={['ww-stat__value', { 'ww-stat__value--diff': stat.diff === true }]}>{stat.value}</span>
            <span class="ww-stat__mod">{modifier(stat.value)}</span>
          </div>
        )}
      </For>
    </div>
  );
}
