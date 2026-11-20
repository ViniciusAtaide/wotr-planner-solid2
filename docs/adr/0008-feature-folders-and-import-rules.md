# Feature folders, a declared import DAG, and no comments in code

The repo is one folder per feature, features import each other only through their entries and only along a declared DAG, and code holds no comments (user, 2026-11-20: "rearchitect the project with one folder per feature, strict import bans and no comments in code deterministic lint rule"). Before, the engine was a flat `engine/` of module files with a few subfolders, the UI split by kind (`src/components/design/`, `src/styles/`, `src/mcp/`, `src/server/`), scripts and dump tools sat in `scripts/`, the only import rule was an oxlint ban on Solid and `src/` inside `engine/`, and the rules' citations and design notes lived in code comments, about 2,400 of them.

## The layout

Each feature is one folder with an `index.ts` (its only public entry), its code, its tests, its styles and a `README.md`. Features follow the guide's modules (§4) and the UI's parts:

- **Engine** (`engine/`, alias `~engine/<feature>`; plain TypeScript): `cite` (the citation value), `data` (the game-shaped data model, `DataFile`, item lookups, twins, the prerequisite type set), `data-dir` (Node only: reads a data root), `load` (the loader and its checks), `prerequisites` (P), `grants` (G), `build` (the Build value), `gold` (the gold Builds), `walk` (W, with the grant-coverage check), `gold-check` (the gold acceptance test), `refusals` (R), `pickers` (S, with the sweep script), `edits` (E), `codec` (C), `links` (Synergy links), `describe` (Summaries), `mcp` (the agent tools).
- **Tools** (`tools/`, Node on Bun): `dump` (the dump reader and `show`/`refs`/`referrer-tree`), `decompiled` (reading the C#, and the citation check), `importer` (I and A, with the census), `repo-checks` (the two checks below).
- **App** (`src/`, `vite/`): `src/design` (the design system and the `/design` gallery), `src/shell` (the page frame), `src/planner` (the planner page: Timeline, panels and the slot picker, its state, the browser engine, the Share link), `src/mcp-server` (the MCP server, its HTTP handler and its stdio entry), `vite/data-document` (the data document plugin).
- **App layer**: the files the framework puts in fixed places (`src/App.tsx`, `src/Document.tsx`, `src/router.ts`, `src/middleware.ts`, `src/server-config.ts`, `src/vite-env.d.ts`, `src/routes/`) and the root configs. They stay thin and may import any feature's entry. `scripts/` keeps only the worktree shell scripts.

Three boundaries moved to make the graph acyclic. The loader no longer imports P: the set of prerequisite component types moved to `engine/data`, and P's reader table is typed over the same union, so the two sets are equal by construction. The gold Builds split from the comparison that walks them (`engine/gold` and `engine/gold-check`), because the walk's own tests use the Builds. `DataFile` moved to `engine/data`, so the Node-only `engine/data-dir` and the loader both sit on the model. Two rules the UI computed itself moved into the walk, where their citations live: the ability bonus (`attributeBonus`) and the item types each Gear place takes (`PLACE_ITEM_TYPES`).

## The dependency DAG

Declared once, in `tools/repo-checks/features.ts`, test files included:

```
engine/cite          → —
engine/data          → cite
engine/data-dir      → data
engine/load          → data, data-dir, cite
engine/prerequisites → data, load, data-dir, cite
engine/grants        → data, load, data-dir, cite
engine/build         → data, grants, cite
engine/gold          → build, data, grants, cite
engine/walk          → data, load, prerequisites, grants, build, gold, data-dir, cite
engine/gold-check    → gold, walk, build, load, data, data-dir, grants
engine/refusals      → data, load, prerequisites, grants, build, walk
engine/pickers       → data, load, grants, build, walk, refusals, prerequisites, gold, data-dir, cite
engine/edits         → build, data, grants, walk, load, gold, data-dir
engine/codec         → build, data, load, grants, walk, gold, data-dir
engine/links         → data, load, grants, prerequisites
engine/describe      → data, load, grants, links, prerequisites, refusals
engine/mcp           → build, codec, data, describe, edits, grants, links, pickers, refusals, walk, load, gold, data-dir, cite
tools/dump           → —
tools/decompiled     → engine: cite, data, load, prerequisites, grants, build, gold, walk, pickers, mcp
tools/importer       → engine: cite, data, data-dir, load, prerequisites, grants, walk; tools/dump, tools/decompiled
tools/repo-checks    → —
vite/data-document   → engine/data-dir
src/design           → engine/walk
src/shell            → —
src/planner          → src/design; engine: build, codec, data, data-dir, edits, gold, grants, links, load, mcp, pickers, refusals, walk
src/mcp-server       → engine: data-dir, load, mcp
app layer            → any feature's entry
```

Layers bound it further: an engine feature depends only on engine features and never imports Solid, Vite, `virtual:` modules or the MCP SDK; tools depend on the engine and other tools; the UI and the server reach the engine only through its features' entries.

## The checks

Both run in `bun run check` (`bun run check:repo`, after the lint) and print one line per problem naming the file, the import or line, and the rule.

- **Imports** (`tools/repo-checks/imports.ts`): oxc-parser lists each file's imports, re-exports and literal dynamic imports; relative and `~engine` specifiers resolve to repo files. It fails on a file no feature owns, a feature with no `index.ts` or `README.md`, an import into another feature that isn't its `index.ts` (so a `../` into another feature's internals), an edge the DAG doesn't declare, a feature importing the app layer, a banned package for the layer, an unresolved local import, a declared edge nothing uses, and a declaration with a cycle, an unknown feature or a layer breach.
- **Comments** (`tools/repo-checks/comments.ts`): every comment in `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs` and `.css` files the repo owns (not `node_modules/`, `data/`, `decompiled/`, `blueprints/`, `dist/`, `.scratch/`). oxc-parser's comment list finds them, so a `//` in a string, template, regular expression or JSX text is not one; CSS uses a small scanner that skips quoted strings.

The only allowed comments are the two a tool reads: `/// <reference …>` directives and `// @vitest-environment …` pragmas. Two generated files are skipped, `file-routes.d.ts` and `solid-env.d.ts`, because filesystem-routing and @solidjs/vite-plugin rewrite them on every dev and build start. No lint-disable or `@ts-expect-error` comment was needed. `tsconfig.json`'s comments went too, though JSON isn't checked.

## Where the comments went

- **Citations of the decompiled C# became `cite` values** (user, 2026-11-20). One shape everywhere: each feature that ports rules has a `cites.ts` exporting `cites`, a record from the name of the code that ports a rule (a function, table, type or class, or `Name.member` for one entry or field) to its citations, each `Path/File.cs Method` with optional `(Field, Field)`, relative to `decompiled/Assembly-CSharp/Kingmaker/`, the allowlist's format, parsed by `parseCite` in `engine/cite`. The registries are in `engine/data`, `load`, `prerequisites`, `grants`, `build`, `gold`, `walk`, `pickers` and `mcp`, and `tools/importer` (whose allowlist entries keep their own `cite` field). `tools/decompiled/cites.test.ts` collects every engine registry and checks the format, that each key names something in its feature, and, where `decompiled/` is present, that the file exists and declares the member; `tools/importer/cites.test.ts` does the same for the importer. A citation in a test sits on the entry of the code that test exercises. Where a comment cited a field or property, the cite names the declaring type with the field in parentheses.
- **Everything else went to the owning feature's `README.md`**, in our own words (ADR 0006): what each rule does, the why, and the map tickets, build tickets and ADRs. The app layer's notes are in `src/README.md` and the root configs' in the repo `README.md`.
- **Unclear names became clear names**: internal renames, and GUID literals in the gold Builds and tests became constants named after their blueprints.

## Considered Options

- oxlint's `no-restricted-imports` with per-folder overrides: it can ban patterns, but not express "only along these edges, only through the entry", nor check the DAG itself, so one checker holds every rule and the oxlint override went.
- The `typescript` package's scanner for comments: this repo's TypeScript is 7 (the native port), which ships no JS compiler API. oxc-parser (pinned dev dependency) is a full parser that returns the comment list.
- Allowing test-only edges that point back up the stack: rejected; with tests counted the declared graph is still a DAG, which the three moved boundaries above made possible.
- Splitting Timeline, panels and the picker into features of their own: they share the planner's state and wording helpers, so a split needs a fourth feature for that shared state and buys nothing; they stay files of `src/planner`.

## Consequences

A new file belongs to a feature or fails the check; a new cross-feature import needs its edge in `features.ts`, and an edge that falls out of use must leave it. A rule's citation is data a test checks, so a wrong path or a renamed method fails `bun run check` where the decompiled sources are present. The App imports the planner's entry to load its stylesheet in order, so the planner's code is in the entry chunk instead of a route chunk. ADR texts before this one name paths that have since moved.
