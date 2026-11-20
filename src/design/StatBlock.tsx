import { For } from 'solid-js';
import { attributeBonus } from '~engine/walk';

export interface Stat {
  readonly name: string;
  readonly value: number;
  readonly diff?: boolean;
}

const modifier = (value: number) => {
  const mod = attributeBonus(value);
  return mod < 0 ? `−${-mod}` : `+${mod}`;
};

export interface StatBlockProps {
  readonly stats: readonly Stat[];
}

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
