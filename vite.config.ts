import { fileURLToPath } from 'node:url';
import { fileRoutes } from 'filesystem-routing/vite';
import { defineConfig } from 'vitest/config';
import solid from '@solidjs/vite-plugin';

import { dataDocument } from './vite/data-document/index.ts';

export default defineConfig({
  plugins: [
    solid({
      start: {
        middleware: './src/middleware.ts',
        nodeServer: true,
      },
      ssr: true,
      diagnostics: true,
      serverFunctions: { serverSetup: './src/server-config.ts' },
      extensions: ['.jsx', '.tsx'],
    }),
    fileRoutes({ httpMethods: true, types: true }),
    dataDocument(),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      '~engine': fileURLToPath(new URL('./engine', import.meta.url)),
    },
  },
  test: {
    globals: false,
    setupFiles: ['./vitest-setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'engine',
          environment: 'node',
          setupFiles: [],
          include: ['engine/**/*.test.ts', 'tools/**/*.test.ts'],
          isolate: false,
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
          environment: 'node',
          include: ['src/mcp-server/**/*.test.ts'],
          alias: [
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
