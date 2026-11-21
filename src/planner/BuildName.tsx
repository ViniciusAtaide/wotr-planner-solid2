import { createSignal, Show } from 'solid-js';
import { toBuildName, type BuildName } from '~engine/build';
import { buildNameLength } from '~engine/refusals';

export const HEADER_SLOT = 'app-header-center';
export const UNTITLED = 'Untitled Build';
export const APP_TITLE = 'Worldwound Planner';

export function pageTitle(name: string | undefined): string {
  return name === undefined ? APP_TITLE : `${name} · ${APP_TITLE}`;
}

export function renameTitle(name: BuildName | undefined): string {
  return name === undefined ? 'Cleared the Build’s name' : `Named the Build ${name}`;
}

export interface BuildNameLabelProps {
  readonly name: string | undefined;
  readonly onRename: (name: BuildName | undefined) => void;
}

export function BuildNameLabel(props: BuildNameLabelProps) {
  const [editing, setEditing] = createSignal(false);
  const [refused, setRefused] = createSignal<string | undefined>(undefined);
  let input: HTMLInputElement | undefined;
  let label: HTMLButtonElement | undefined;
  const close = (refocus: boolean) => {
    setRefused(undefined);
    setEditing(false);
    if (refocus) queueMicrotask(() => label?.focus({ preventScroll: true }));
  };
  const save = (refocus: boolean): boolean => {
    const raw = input?.value ?? '';
    const name = raw.trim() === '' ? undefined : toBuildName(raw);
    if (raw.trim() !== '' && name === undefined) {
      setRefused(buildNameLength(raw));
      return false;
    }
    if (name !== props.name) props.onRename(name);
    close(refocus);
    return true;
  };
  return (
    <div class="build-name">
      <Show
        when={editing()}
        fallback={
          <button
            ref={(el) => {
              label = el;
            }}
            type="button"
            class={['build-name__label', { 'build-name__label--untitled': props.name === undefined }]}
            title="Name this Build"
            onClick={() => setEditing(true)}
          >
            {props.name ?? UNTITLED}
          </button>
        }
      >
        <input
          ref={(el) => {
            input = el;
            el.value = props.name ?? '';
            queueMicrotask(() => {
              el.focus({ preventScroll: true });
              el.select();
            });
          }}
          class="build-name__input"
          type="text"
          aria-label="Build name"
          aria-invalid={refused() === undefined ? undefined : 'true'}
          aria-describedby={refused() === undefined ? undefined : 'build-name-refused'}
          placeholder={UNTITLED}
          onInput={() => setRefused(undefined)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save(true);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              close(true);
            }
          }}
          onBlur={() => {
            if (editing() && !save(false)) close(false);
          }}
        />
        <Show when={refused()}>
          {(words) => (
            <p id="build-name-refused" class="build-name__refused" role="alert">
              {words()}
            </p>
          )}
        </Show>
      </Show>
    </div>
  );
}
