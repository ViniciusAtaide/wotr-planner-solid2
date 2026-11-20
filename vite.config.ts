import { fileURLToPath } from 'node:url';
import { fileRoutes } from 'filesystem-routing/vite';
import { defineConfig } from 'vitest/config';
import solid from '@solidjs/vite-plugin';

export default defineConfig({
  // Turnkey streaming SSR: no index.html and no entry files — the plugin
  // generates the entries around src/App.tsx, wrapped in src/Document.tsx.
  // `vite build` emits client assets to dist/client and the request handler
  // to dist/server, plus the server (dist/server/node.js) `bun start` runs.
  plugins: [
    solid({
      start: {
        middleware: './src/middleware.ts',
        // Emit dist/server/node.js: a ready-to-run server on node:http, which
        // Bun runs (static assets + the handler). Other platforms import
        // dist/server/server.js.
        nodeServer: true,
        // Typed env is on by convention: ./env.ts is probed automatically.
        // (Set the top-level `env: false` option to opt out.)
      },
      // Set to false for a static shell + API server: pages render on the
      // client while server functions, sessions, and API routes keep working.
      ssr: true,
      // Dev-only: capture control at /__solid/diagnostics (see AGENTS.md).
      diagnostics: true,
      // The serverSetup module runs in the handler graph before any dispatch:
      // it registers the router's single-flight collector.
      serverFunctions: { serverSetup: './src/server-config.ts' },
      // `extensions` makes @solidjs/vite-plugin also compile the `?pick=` route
      // modules the fileRoutes plugin emits (their ids end in a query string).
      extensions: ['.jsx', '.tsx'],
    }),
    // `httpMethods` also scans route modules for GET/POST/... exports (API
    // routes); handler modules never enter the client bundle.
    fileRoutes({ httpMethods: true, types: true }),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      // The rules engine at the repo root (ticket 16's amendment).
      '~engine': fileURLToPath(new URL('./engine', import.meta.url)),
    },
  },
  test: {
    globals: false,
    setupFiles: ['./vitest-setup.ts'],
    // Three projects because they need different halves of the framework, or
    // none of it: the engine runs in plain node, component tests run in a DOM
    // against the browser build, server-runtime tests (the session suite) run
    // in node against the real server build.
    // Vitest itself runs on Node, not Bun: under Bun 1.3.5 its worker pools
    // fail to start (forks: `child.channel.unref` is missing; threads: a
    // Worker's stdout is null), so the scripts call `vitest` without `--bun`.
    projects: [
      {
        extends: true,
        test: {
          // The rules engine and the importer: plain TypeScript in node,
          // with no DOM and no Solid.
          name: 'engine',
          environment: 'node',
          setupFiles: [],
          include: ['engine/**/*.test.ts', 'tools/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
        },
      },
      {
        extends: true,
        test: {
          name: 'server',
          // environment:'node' projects get the server posture from the
          // plugin automatically (server conditions, framework inlined).
          environment: 'node',
          include: ['src/server/**/*.test.ts'],
          alias: [
            // Tests run outside the turnkey server: the plugin's env module
            // is stubbed with the same contract (live process.env reads).
            {
              find: 'virtual:solid-env/server',
              replacement: fileURLToPath(new URL('./vitest-env-server-stub.ts', import.meta.url)),
            },
          ],
        },
      },
    ],
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
  },
});
