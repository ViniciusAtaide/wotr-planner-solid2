import type { JSX } from '@solidjs/web';
import { Show, type ParentProps } from 'solid-js';

import Kbd from './Kbd';

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
