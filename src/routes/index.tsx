import { Title } from '@solidjs/meta';

import { paths } from '../router';

/** The planner's page. Ticket 05 builds the Timeline and the picker here; until then it points to the gallery. */
export default function Home() {
  return (
    <main class="app-page">
      <Title>Worldwound Planner</Title>
      <h1 class="title">Worldwound Planner</h1>
      <p>Every pick the game allows, and none it doesn't.</p>
      <p>
        The Timeline comes next. The components it will use are in the <a href={paths.design()}>design gallery</a>.
      </p>
    </main>
  );
}
