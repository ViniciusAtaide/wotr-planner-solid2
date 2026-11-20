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
- **Parallel tickets:** a ticket run alongside another gets its own worktree from `scripts/worktree.sh <name>`, which also opens it as its own WebStorm project. Pass the worktree's path as `projectPath` to the IDE tools there (`CLAUDE.local.md`), and leave its changes uncommitted until the ticket's commit, so they can be reviewed in that window's Commit tab. Once merged, `scripts/worktree-done.sh <name>` closes that window and removes the worktree.
- **Game sources:** `blueprints/` (the dump) and `decompiled/` (the C#) are local and git-ignored. `bun scripts/dump/show.mjs <guid|name>` prints a blueprint.
- **Copyright boundary:** the repo holds the game's display names and nothing else of its text (ADR 0006). Describe rules in our own words and cite them by decompiled file and method.
