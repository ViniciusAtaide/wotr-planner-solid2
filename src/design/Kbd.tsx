import type { ParentProps } from 'solid-js';

export interface KbdProps extends ParentProps {}

export default function Kbd(props: KbdProps) {
  return <span class="ww-kbd">{props.children}</span>;
}
