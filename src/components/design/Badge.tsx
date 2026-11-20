import type { JSX } from '@solidjs/web';

/** The words each status badge shows: its mark with its word, so color is never the only signal. */
const WORDS = { open: '✓ Open', closed: '✕ Closed', gear: '◈ Gear', mythic: 'Mythic' } as const;

/**
 * Badge (design system): `open`, `closed` and `gear` are status, `mythic` marks a Mythic option, and `link` is a
 * Synergy link, whose words the consumer gives ("→ enables 3", "← needs Power Attack").
 */
export default function Badge(props: {
  readonly kind: 'open' | 'closed' | 'gear' | 'mythic' | 'link';
  readonly children?: JSX.Element;
}) {
  return (
    <span class={['ww-badge', `ww-badge--${props.kind}`]}>
      {props.children ?? (props.kind === 'link' ? '' : WORDS[props.kind])}
    </span>
  );
}
