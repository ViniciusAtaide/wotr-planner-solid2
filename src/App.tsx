import { Title } from '@solidjs/meta';
import { Loading } from 'solid-js';

import ThemeToggle from './components/ThemeToggle';
import { paths, Router } from './router';
import './styles/tokens.css';
import './styles/components.css';
import './styles/app.css';

export default function App() {
  return (
    <Router>
      {(props) => (
        <div class="ww-root app-main">
          <Title>Worldwound Planner</Title>
          <header class="app-header">
            <a class="app-header__name" href={paths()}>
              Worldwound Planner
            </a>
            <ThemeToggle />
          </header>
          <Loading fallback={<main>Loading…</main>}>{props.children}</Loading>
        </div>
      )}
    </Router>
  );
}
