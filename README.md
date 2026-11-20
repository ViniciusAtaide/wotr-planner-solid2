# WotR Planner

A build planner for Pathfinder: Wrath of the Righteous (patch 2.7.0x), and an MCP server that lets agents build characters level by level. Every choice it offers is one the game allows: a Build can be incomplete, never impossible.

The game is the source of truth. Its blueprint dump supplies the data and its decompiled code supplies the rules. Both stay local and are never committed. The planner commits the game-shaped data it imports, filtered by a cited allowlist.

## Setup

Bun is the package manager and runtime ([bun.sh](https://bun.sh), version in `package.json`'s `packageManager`). Node is needed only for the tests: vitest's worker pools don't start on Bun yet, so `vitest` runs on Node.

```bash
bun install            # also enables the pre-commit hook
```

Put the game sources at the repo root. Both are git-ignored:

- `blueprints/blueprints_raw_2.7.0x_0.binz`: BubblePrintsData release `2.7.0x_0`
- `decompiled/`: xADDBx/WrathDecompiled at `6ce4a6b`

## Commands

| Command                                  | What it does                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `bun run dev`                            | the app with streaming SSR at http://localhost:3000                                 |
| `bun run check`                          | format check, lint, the repo checks, type check, the importer check and every test  |
| `bun run check:repo`                     | the import DAG and the comment ban alone (`tools/repo-checks`)                      |
| `bun run format`                         | fixes formatting                                                                    |
| `bun run show -- <guid\|name>`           | prints blueprints from the dump, with their references named (`tools/dump/show.mjs`) |
| `bun <file.ts>`                          | runs a TypeScript file in the repo, `~engine` imports included                      |
| `bun run engine-run <file.ts>`           | the same for a file outside the repo, such as a session scratchpad (note 1)         |
| `bun run census`                         | the leftover census (`tools/importer/census.ts`)                                    |
| `bun run build && bun start`             | the built app; it serves the MCP at http://localhost:3000/mcp (streamable HTTP)     |
| `bun run mcp-stdio`                      | the MCP over stdio (`src/mcp-server/stdio.ts`), run from the repo root              |
| `bun engine/pickers/sweep.ts`            | every picker option at every gold-build slot against the walk (minutes)             |

1. A file outside the repo has no `tsconfig.json` to resolve `~engine`, so `engine-run` points Bun at this one. Bun 1.3.5 then prints a harmless "Internal error: directory mismatch" line after the run. Bun runs the file top to bottom; a file that exports `main(args)` calls it under `if (import.meta.main)`, as `tools/importer/census.ts` does.

## Where things are

The code is one folder per feature, each with an `index.ts` (its only public entry), its tests, its styles and a `README.md` holding its rules and notes. The features, their allowed dependencies and the rules that check them are in ADR 0008 and `tools/repo-checks/features.ts`.

| Path                           | Holds                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `engine/<feature>/`            | the rules engine, one folder per module (P, G, W, S, R, E, C…): plain TypeScript, no Solid     |
| `tools/<feature>/`             | the importer, the dump reader, the decompiled-C# reader and the repo checks (Node, run on Bun) |
| `src/<feature>/`               | the Solid 2 app's features: the design system, the shell, the planner, the MCP server          |
| `src/` root and `src/routes/`  | the app layer the framework expects, kept thin (`src/README.md`)                               |
| `vite/data-document/`          | the Vite plugin serving the data document                                                      |
| `scripts/`                     | the worktree shell scripts                                                                     |
| `docs/decompiled-guide.md`     | the engine's design                                                                            |
| `docs/adr/`                    | architecture decisions                                                                         |
| `GLOSSARY.md`                  | the project's terms                                                                            |
| `.scratch/wotr-planner/`       | the design map and its tickets                                                                 |
| `.scratch/wotr-planner-build/` | the build plan and its tickets                                                                 |

## Configuration

Code holds no comments (ADR 0008), so the root config files' notes live here.

- `vite.config.ts`: turnkey streaming SSR, with no `index.html` and no entry files: @solidjs/vite-plugin generates the entries around `src/App.tsx`, wrapped in `src/Document.tsx`. `vite build` writes client assets to `dist/client` and the request handler to `dist/server`, plus `dist/server/node.js` (`nodeServer: true`), a ready-to-run `node:http` server that `bun start` runs; other platforms import `dist/server/server.js`. Typed env is on by convention (`env.ts` is probed; the top-level `env: false` opts out). `ssr: false` would give a static shell plus an API server. `diagnostics: true` serves the dev-only capture control at `/__solid/diagnostics` (AGENTS.md). `serverFunctions.serverSetup` pins `src/server-config.ts` into the handler graph. `extensions` makes the plugin also compile the `?pick=` route modules filesystem-routing emits (their ids end in a query string). `fileRoutes({ httpMethods: true })` also scans route modules for `GET`/`POST`/… exports, and handler modules never enter the client bundle. `dataDocument()` serves the committed data as one content-hashed document the browser walks (ADR 0004); the config imports it with the `.ts` extension, as Vite's native config loader requires, which is also why `tsconfig.json` sets `allowImportingTsExtensions`. The `~engine` alias (with the matching `paths` entry in `tsconfig.json`) points at `engine/` (ticket 16's amendment): `~engine/<feature>` is that feature's entry.
- Vitest has three projects because they need different halves of the framework, or none of it: `engine` runs the engine and the tools in plain Node, with no DOM and no Solid; `client` runs component tests in a DOM against the browser build; `server` runs server-runtime tests in Node against the server build (a `node` project gets the server conditions from the plugin automatically). Vitest itself runs on Node, not Bun: under Bun 1.3.5 its worker pools fail to start (forks: `child.channel.unref` is missing; threads: a Worker's stdout is null), so the scripts call `vitest` without `--bun` (ADR 0007).
- `vitest-setup.ts` registers @testing-library/jest-dom's matchers (`toHaveTextContent` and the rest) with vitest's `expect`, types included.
- `vitest-env-server-stub.ts` stands in for the plugin's `virtual:solid-env/server` in the `server` tests, which run outside the turnkey server. It keeps the same contract: `process.env` read through a live proxy at access time, so a test can set a variable for itself.
- `env.ts` is the typed env schema, probed by the plugin from the project root. The planner reads no variable yet. `server` variables come through `virtual:solid-env/server`, read from `process.env` at boot; `client` variables carry the `VITE_` prefix and are baked into the bundle.
- `file-routes.d.ts` and `solid-env.d.ts` are generated on every dev and build start; the comment check skips them.

## Licence

The game's mechanics are Open Game Content under the Open Game License v1.0a, as Owlcat Games' notice designates them. The published site carries that notice and its Section 15 credit. Names of feats, spells and items are the game's, used to refer to it.
