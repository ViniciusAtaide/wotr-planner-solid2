import { createSignal, Show } from 'solid-js';

import Button from './Button';

export type ShareLinkProps =
  | { readonly state: 'making' }
  | { readonly state: 'ready'; readonly url: string }
  | { readonly state: 'failed'; readonly reason: string };

const MAKING_THE_LINK = 'Making the link…';

export default function ShareLink(props: ShareLinkProps) {
  let input: HTMLInputElement | undefined;
  const [copied, setCopied] = createSignal<string>();
  const url = () => (props.state === 'ready' ? props.url : undefined);
  const shown = () => {
    switch (props.state) {
      case 'making':
        return MAKING_THE_LINK;
      case 'ready':
        return props.url;
      case 'failed':
        return `No link: ${props.reason}`;
    }
  };
  const copy = async () => {
    const u = url();
    if (u === undefined) return;
    try {
      await navigator.clipboard.writeText(u);
      setCopied(u);
    } catch {
      input?.select();
    }
  };
  return (
    <div class="ww-share">
      <input
        ref={(el) => {
          input = el;
        }}
        readonly
        value={shown()}
        aria-label="Share link"
        aria-busy={props.state === 'making' ? 'true' : 'false'}
      />
      <Button variant="primary" disabled={url() === undefined} onClick={() => void copy()}>
        <Show when={copied() !== undefined && copied() === url()} fallback="Copy link">
          Link copied.
        </Show>
      </Button>
    </div>
  );
}
