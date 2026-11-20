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

| Command                              | What it does                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| `bun run dev`                        | the app with streaming SSR at http://localhost:3000                              |
| `bun run check`                      | format check, lint, type check and every test; the pre-commit hook runs it       |
| `bun run format`                     | fixes formatting                                                                 |
| `bun scripts/dump/show.mjs <guid>`   | prints one blueprint from the dump, with its references named                    |
| `bun <file.ts>`                      | runs a TypeScript file in the repo, `~engine` imports included                   |
| `bun run engine-run <file.ts>`       | the same for a file outside the repo, such as a session scratchpad (note 1)      |
| `bun run census`                     | the leftover census (`scripts/dump/census.ts`)                                   |
| `bun run build && bun start`         | the built app; it serves the MCP at http://localhost:3000/mcp (streamable HTTP)  |
| `bun scripts/mcp-stdio.ts`           | the MCP over stdio, run from the repo root                                       |
| `bun scripts/sweep-pickers.ts`       | every picker option at every gold-build slot against the walk (minutes)          |

1. A file outside the repo has no `tsconfig.json` to resolve `~engine`, so `engine-run` points Bun at this one. Bun 1.3.5 then prints a harmless "Internal error: directory mismatch" line after the run. Bun runs the file top to bottom; a file that exports `main(args)` calls it under `if (import.meta.main)`, as `scripts/dump/census.ts` does.

## Where things are

| Path                         | Holds                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `engine/`                    | the rules engine: plain TypeScript, no Solid, shared by the UI, MCP and tests  |
| `tools/importer/`            | the importer and its allowlist (server side only)                              |
| `src/`                       | the Solid 2 app (started from Solid's fullstack template)                      |
| `docs/decompiled-guide.md`   | the engine's design                                                            |
| `docs/adr/`                  | architecture decisions                                                         |
| `GLOSSARY.md`                | the project's terms                                                            |
| `.scratch/wotr-planner/`     | the design map and its tickets                                                 |
| `.scratch/wotr-planner-build/` | the build plan and its tickets                                               |

## Licence

The game's mechanics are Open Game Content under the Open Game License v1.0a, as Owlcat Games' notice designates them. The published site carries that notice and its Section 15 credit. Names of feats, spells and items are the game's, used to refer to it.
