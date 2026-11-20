import { Title } from '@solidjs/meta';

import Planner from '../planner/Planner';

/** The planner's page: one page at `/`, the Build in `#b=<code>` (map 13). */
export default function Home() {
  return (
    <>
      <Title>Worldwound Planner</Title>
      <Planner />
    </>
  );
}
