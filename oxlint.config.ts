import { defineConfig } from 'oxlint';
import solidV2 from 'eslint-plugin-solid/configs/v2';

export default defineConfig({
  jsPlugins: ['eslint-plugin-solid'],
  ignorePatterns: ['**/*.gen.*', 'dist'],
  settings: solidV2.settings,
  rules: solidV2.rules,
  overrides: [
    {
      // The engine is plain TypeScript shared by the UI, the MCP and the tests:
      // no Solid and no app code (ticket 16's amendment).
      files: ['engine/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['solid-js', 'solid-js/*', '@solidjs/*'],
                message: 'engine/ is plain TypeScript: no Solid imports.',
              },
              {
                group: ['**/src', '**/src/*'],
                message: 'engine/ must not import app code from src/.',
              },
            ],
          },
        ],
      },
    },
  ],
});
