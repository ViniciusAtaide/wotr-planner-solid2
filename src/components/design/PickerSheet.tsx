import type { JSX } from '@solidjs/web';
import type { ParentProps } from 'solid-js';

import Button from './Button';

export interface PickerSheetProps extends ParentProps {
  /** The slot heading ("Bonus feat · L4"). */
  readonly title: string;
  readonly onBack?: () => void;
  readonly children: JSX.Element;
}

/**
 * PickerSheet (design system): on a phone, the picker as a full-screen sheet over the Timeline (map 13), closed by its
 * back button. On desktop the picker is a side panel instead.
 */
export default function PickerSheet(props: PickerSheetProps) {
  return (
    <section class="ww-sheet ww-fade" aria-label={`${props.title} picker`}>
      <div class="ww-sheet__bar">
        <Button variant="ghost" label="Back to Timeline" onClick={() => props.onBack?.()}>
          ← Back
        </Button>
        <h2>{props.title}</h2>
      </div>
      <div class="ww-sheet__body">{props.children}</div>
    </section>
  );
}
