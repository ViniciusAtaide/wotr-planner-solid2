import type { ParentProps } from 'solid-js';

/** Kbd (design system): a key, for the keyboard-first planner's hints. Hidden on touch screens (app.css). */
export default function Kbd(props: ParentProps) {
  return <span class="ww-kbd">{props.children}</span>;
}
