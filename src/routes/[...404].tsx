import { Title } from '@solidjs/meta';
import type { RouteDefinition } from '@solidjs/router';
import { httpStatus } from '@solidjs/web';

import { paths } from '../router';

// The catch-all route. httpStatus() sets the response status during SSR (a no-op in the browser); it runs in preload
// so the status code is set before the response head flushes.
export const route = {
  preload: () => httpStatus(404),
} satisfies RouteDefinition;

export default function NotFound() {
  return (
    <main class="app-page">
      <Title>Not found · Worldwound Planner</Title>
      <h1 class="title">Not found</h1>
      <p>
        No page here. <a href={paths()}>Back to the planner</a>.
      </p>
    </main>
  );
}
