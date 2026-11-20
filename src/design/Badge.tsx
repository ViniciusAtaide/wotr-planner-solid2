import type { ParentProps } from 'solid-js';

const STATUS_WORDS = { open: '✓ Open', closed: '✕ Closed', gear: '◈ Gear', mythic: 'Mythic' } as const;

export type BadgeKind = 'open' | 'closed' | 'gear' | 'mythic' | 'link';

export interface BadgeProps extends ParentProps {
  readonly kind: BadgeKind;
}

export default function Badge(props: BadgeProps) {
  return (
    <span class={['ww-badge', `ww-badge--${props.kind}`]}>
      {props.children ?? (props.kind === 'link' ? '' : STATUS_WORDS[props.kind])}
    </span>
  );
}
