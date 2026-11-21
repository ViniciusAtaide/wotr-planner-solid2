import { Title } from '@solidjs/meta';
import type { JSX } from '@solidjs/web';
import { Loading } from 'solid-js';

export interface ShellProps {
  readonly home: string;
  readonly children: JSX.Element;
}

export function Shell(props: ShellProps) {
  return (
    <div class="ww-root app-main">
      <Title>Worldwound Planner</Title>
      <header class="app-header">
        <a class="app-header__name" href={props.home} aria-label="Worldwound Planner">
          <span class="app-header__full">Worldwound Planner</span>
          <span class="app-header__short" aria-hidden="true">
            WP
          </span>
        </a>
        <div class="app-header__center" id="app-header-center" />
        <span class="app-header__end" aria-hidden="true" />
      </header>
      <Loading fallback={<main>Loading…</main>}>{props.children}</Loading>
    </div>
  );
}
