import type { ParentProps } from 'solid-js';

/** The words each status badge shows: its mark with its word, so color is never the only signal. */
const WORDS = { open: '✓ Open', closed: '✕ Closed', gear: '◈ Gear', mythic: 'Mythic' } as const;

/** What a badge marks: `open`, `closed` and `gear` are status, `mythic` a Mythic option, `link` a Synergy link. */
export type BadgeKind = 'open' | 'closed' | 'gear' | 'mythic' | 'link';

export interface BadgeProps extends ParentProps {
  readonly kind: BadgeKind;
}

/**
 * Badge (design system): `open`, `closed` and `gear` are status, `mythic` marks a Mythic option, and `link` is a
 * Synergy link, whose words the consumer gives ("→ enables 3", "← needs Power Attack").
 */
export default function Badge(props: BadgeProps) {
  return (
    <span class={['ww-badge', `ww-badge--${props.kind}`]}>
      {props.children ?? (props.kind === 'link' ? '' : WORDS[props.kind])}
    </span>
  );
}
