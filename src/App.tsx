import { paths, Router } from './router';
import './design';
import { Shell } from './shell';
import './planner';

export default function App() {
  return <Router>{(props) => <Shell home={paths()}>{props.children}</Shell>}</Router>;
}
