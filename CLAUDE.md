# WotR Planner

A Pathfinder: Wrath of the Righteous build planner (Solid 2) and an MCP server for agents. The game's data and rules decide every choice.

- **Current work:** `.scratch/wotr-planner-build/plan.md`, then the ticket you're given. "How to work" there is the process.
- **Decisions:** `.scratch/wotr-planner/map.md` indexes every settled design question; `docs/adr/` holds the hard-to-reverse ones. A design question no ticket answers goes to the user, then to a new map ticket.
- **Engine design:** `docs/decompiled-guide.md`: the game's model, the data shape, the modules and the order of work.
- **Terms:** `GLOSSARY.md`. Use its words in code, tests and prose.
- **Solid UI (`src/`):** read `AGENTS.md` before editing anything under `src/`. Solid 2 is neither React nor Solid 1.x.
- **Review:** `CODING_STANDARDS.md` holds the judgement rules a reviewer applies to a diff.
- **Bun:** Bun is the package manager and runtime: `bun install`, `bun run <script>`, `bun <file.ts>`; never npm, npx or node. Only vitest runs on Node (its worker pools fail on Bun), and the scripts already call it that way.
- **Checks:** `bun run check` (format, lint, types, tests) must pass; the pre-commit hook runs it. `bun run format` fixes formatting.
- **Commits:** sessions share this checkout, so another session's changes may already be staged. Commit with `scripts/commit-paths.sh <message-file> <path>...`, which commits exactly those paths (deletions included) through the hook.
- **Parallel tickets:** a ticket run alongside another gets its own worktree from `scripts/worktree.sh <name>`, which also opens it as its own WebStorm project. Pass the worktree's path as `projectPath` to the IDE tools there (`CLAUDE.local.md`), and leave its changes uncommitted until the ticket's commit, so they can be reviewed in that window's Commit tab. Once merged, `scripts/worktree-done.sh <name>` closes that window and removes the worktree.
- **Game sources:** `blueprints/` (the dump) and `decompiled/` (the C#) are local and git-ignored. `bun tools/dump/show.mjs <guid|name>` (or `bun run show -- <guid|name>`) prints a blueprint.
- **Layout:** one folder per feature (`engine/<feature>`, `tools/<feature>`, `src/<feature>`, `vite/data-document`), each with an `index.ts` (its only public entry), its tests, its styles and a `README.md`. Features import each other only through `index.ts` and only along the DAG declared in `tools/repo-checks/features.ts`; the framework's files (`src/App.tsx`, `src/routes/`, root configs) stay thin (ADR 0008).
- **No comments in code:** `bun run check` fails on any comment in `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs` or `.css` (only `/// <reference …>` and `// @vitest-environment …` pass). Notes go in the feature's `README.md`; an unclear name is renamed instead.
- **Copyright boundary:** the repo holds the game's display names and nothing else of its text (ADR 0006). Describe rules in our own words in the feature's `README.md`, and cite them by decompiled file and method as `cite` values in its `cites.ts` (`engine/cite`), which a test checks against `decompiled/`.
