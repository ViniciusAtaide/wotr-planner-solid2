import type { JSX } from '@solidjs/web';
import { Show, type ParentProps } from 'solid-js';

import Kbd from './Kbd';

/** A button's look besides the default: `primary`, `ghost` or `danger`. */
export type ButtonVariant = 'primary' | 'ghost' | 'danger';

export interface ButtonProps extends ParentProps {
  readonly variant?: ButtonVariant;
  readonly kbd?: string;
  readonly disabled?: boolean;
  readonly type?: 'button' | 'submit';
  readonly label?: string;
  readonly onClick?: () => void;
  readonly children: JSX.Element;
}

/**
 * Button (design system): `primary` (gold, one per view), the default, `ghost` (quiet: Undo, Cancel) and `danger` (an
 * action that clears picks). Label it with the verb and its object; `kbd` adds the shortcut's hint.
 */
export default function Button(props: ButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      class={[
        'ww-btn',
        {
          'ww-btn--primary': props.variant === 'primary',
          'ww-btn--ghost': props.variant === 'ghost',
          'ww-btn--danger': props.variant === 'danger',
        },
      ]}
      disabled={props.disabled}
      aria-label={props.label}
      onClick={() => props.onClick?.()}
    >
      {props.children}
      <Show when={props.kbd}>{(key) => <Kbd>{key()}</Kbd>}</Show>
    </button>
  );
}
