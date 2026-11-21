export type Layer = 'engine' | 'tools' | 'vite' | 'ui' | 'server';

export interface Feature {
  readonly path: string;
  readonly layer: Layer;
  readonly deps: readonly string[];
}

const engine = (name: string, ...deps: string[]): Feature => ({
  path: `engine/${name}`,
  layer: 'engine',
  deps: deps.map((d) => `engine/${d}`),
});

export const FEATURES: readonly Feature[] = [
  engine('cite'),
  engine('data', 'cite'),
  engine('data-dir', 'data'),
  engine('load', 'data', 'data-dir', 'cite'),
  engine('prerequisites', 'data', 'load', 'data-dir', 'cite'),
  engine('grants', 'data', 'load', 'data-dir', 'cite'),
  engine('build', 'data', 'grants', 'cite'),
  engine('gold', 'build', 'data', 'grants', 'cite'),
  engine('walk', 'data', 'load', 'prerequisites', 'grants', 'build', 'gold', 'data-dir', 'cite'),
  engine('gold-check', 'gold', 'walk', 'build', 'load', 'data', 'data-dir', 'grants'),
  engine('refusals', 'data', 'load', 'prerequisites', 'grants', 'build', 'walk'),
  engine('pickers', 'data', 'load', 'grants', 'build', 'walk', 'refusals', 'prerequisites', 'gold', 'data-dir', 'cite'),
  engine('edits', 'build', 'data', 'grants', 'walk', 'load', 'gold', 'data-dir'),
  engine('codec', 'build', 'data', 'load', 'grants', 'walk', 'gold', 'data-dir'),
  engine('compact', 'data', 'data-dir', 'load'),
  engine('links', 'data', 'load', 'grants', 'prerequisites'),
  engine('describe', 'data', 'load', 'grants', 'links', 'prerequisites', 'refusals'),
  engine(
    'mcp',
    'build',
    'codec',
    'data',
    'describe',
    'edits',
    'grants',
    'links',
    'pickers',
    'refusals',
    'walk',
    'load',
    'gold',
    'data-dir',
    'cite',
  ),
  { path: 'tools/dump', layer: 'tools', deps: [] },
  {
    path: 'tools/decompiled',
    layer: 'tools',
    deps: [
      'engine/cite',
      'engine/data',
      'engine/load',
      'engine/prerequisites',
      'engine/grants',
      'engine/build',
      'engine/gold',
      'engine/walk',
      'engine/pickers',
      'engine/mcp',
    ],
  },
  {
    path: 'tools/importer',
    layer: 'tools',
    deps: [
      'engine/cite',
      'engine/data',
      'engine/data-dir',
      'engine/load',
      'engine/prerequisites',
      'engine/grants',
      'engine/walk',
      'engine/pickers',
      'engine/compact',
      'tools/dump',
      'tools/decompiled',
    ],
  },
  { path: 'tools/repo-checks', layer: 'tools', deps: [] },
  { path: 'vite/data-document', layer: 'vite', deps: ['engine/data-dir', 'engine/compact'] },
  { path: 'src/design', layer: 'ui', deps: ['engine/walk'] },
  { path: 'src/shell', layer: 'ui', deps: [] },
  {
    path: 'src/planner',
    layer: 'ui',
    deps: [
      'src/design',
      'engine/build',
      'engine/codec',
      'engine/compact',
      'engine/data',
      'engine/data-dir',
      'engine/edits',
      'engine/gold',
      'engine/grants',
      'engine/links',
      'engine/load',
      'engine/mcp',
      'engine/pickers',
      'engine/refusals',
      'engine/walk',
    ],
  },
  { path: 'src/mcp-server', layer: 'server', deps: ['engine/data-dir', 'engine/load', 'engine/mcp'] },
];

export const APP_LAYER: readonly string[] = [
  'src/App.tsx',
  'src/Document.tsx',
  'src/router.ts',
  'src/middleware.ts',
  'src/server-config.ts',
  'src/vite-env.d.ts',
  'src/routes/',
  'vite.config.ts',
  'oxlint.config.ts',
  'env.ts',
  'vitest-setup.ts',
  'vitest-env-server-stub.ts',
  'file-routes.d.ts',
  'solid-env.d.ts',
];

export const LAYER_DEPS: Readonly<Record<Layer, readonly Layer[]>> = {
  engine: ['engine'],
  tools: ['engine', 'tools'],
  vite: ['engine'],
  ui: ['engine', 'ui'],
  server: ['engine'],
};

const UI_PACKAGES = ['solid-js', '@solidjs/', '@testing-library/', 'virtual:', 'filesystem-routing', 'vite'];
const SERVER_PACKAGES = ['@modelcontextprotocol/', '@remix-run/'];

export const BANNED_PACKAGES: Readonly<Record<Layer, readonly string[]>> = {
  engine: [...UI_PACKAGES, ...SERVER_PACKAGES],
  tools: [...UI_PACKAGES, ...SERVER_PACKAGES],
  vite: ['solid-js', '@solidjs/', ...SERVER_PACKAGES],
  ui: SERVER_PACKAGES,
  server: ['solid-js', '@solidjs/', 'virtual:data-document'],
};
