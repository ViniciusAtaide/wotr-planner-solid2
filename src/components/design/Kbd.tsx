import type { ParentProps } from 'solid-js';

export interface KbdProps extends ParentProps {}

/** Kbd (design system): a key, for the keyboard-first planner's hints. Hidden on touch screens (app.css). */
export default function Kbd(props: KbdProps) {
  return <span class="ww-kbd">{props.children}</span>;
}
