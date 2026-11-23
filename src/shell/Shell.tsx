import { Title } from '@solidjs/meta';
import type { JSX } from '@solidjs/web';
import { Loading } from 'solid-js';

export const LICENCE_PATH = `${import.meta.env.BASE_URL}open-game-license.txt`;

export interface ShellProps {
  readonly home: string;
  readonly children: JSX.Element;
}

export function Shell(props: ShellProps) {
  return (
    <div class="ww-root app-main">
      <Title>Worldwound Planner</Title>
      <header class="app-header">
        <div class="app-header__inner">
          <a class="app-header__name" href={props.home} aria-label="Worldwound Planner">
            <span class="app-header__full">Worldwound Planner</span>
            <span class="app-header__short" aria-hidden="true">
              WP
            </span>
          </a>
          <div class="app-header__center" id="app-header-center" />
          <div class="app-header__end" id="app-header-end" />
        </div>
      </header>
      <Loading fallback={<main>Loading…</main>}>{props.children}</Loading>
      <footer class="app-footer">
        Game mechanics are Open Game Content from Pathfinder: Wrath of the Righteous, © Owlcat Games, and the Pathfinder
        rules, © Paizo. A fan tool, not endorsed by either. <a href={LICENCE_PATH}>Open Game License v1.0a</a>
      </footer>
    </div>
  );
}
