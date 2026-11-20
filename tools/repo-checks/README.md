# Repo checks

Two deterministic checks that `bun run check` runs (as `bun run check:repo`, right after the lint): the import rules over the declared feature DAG, and the ban on comments in code (ADR 0008). Each prints one line per problem, naming the file, the import or line, and the rule in brackets, and exits 1 on any problem.

```bash
bun tools/repo-checks/main.ts            # both checks
bun tools/repo-checks/main.ts imports    # one of them
bun tools/repo-checks/main.ts comments
```

## Public entry

`index.ts` exports `importProblems`, `commentProblems`, `codeComments`, `cssComments`, `configImportProblems`, `FEATURES` and `APP_LAYER`. `main.ts` is the command line.

## The declared DAG (`features.ts`)

The one place the features and their allowed dependencies are written down. Each `Feature` has a folder, a layer (`engine`, `tools`, `vite`, `ui`, `server`) and the features it may import, test files included. `APP_LAYER` lists the framework-mandated files (`src/App.tsx`, `src/routes/`, the root configs…), which may import any feature's entry. `LAYER_DEPS` says which layers a layer may depend on (engine only on engine; tools on engine and tools; vite and server on engine; ui on engine and ui), and `BANNED_PACKAGES` which packages a layer may not import (the engine and the tools: no Solid, no Vite, no `virtual:` modules, no MCP SDK or server packages). A package entry ending in `/` or `:` is a prefix; any other entry matches the package and its subpaths, so `vite` doesn't catch `vitest`.

## The import check (`imports.ts`)

The files are every file git tracks or would track (`git ls-files --cached --others --exclude-standard`), minus `data/`, `decompiled/`, `blueprints/`, `dist/`, `node_modules/` and `.scratch/` (`files.ts`). oxc-parser gives each code file's static imports, re-exports and dynamic `import('…')` with a literal; `import type` counts like any import. Relative specifiers and `~engine/…` resolve to repo files (trying `.ts`, `.tsx`, `.mts`, `.mjs`, `.js` and `/index.ts`). Rules:

- `feature-owner`: every code file belongs to a declared feature or the app layer.
- `feature-entry`, `feature-readme`: every feature has an `index.ts` and a `README.md`.
- `deep-import`: an import that crosses into another feature must land on that feature's `index.ts`; a `../` path into its internals fails.
- `undeclared-dependency`: the edge from the importing feature to the imported one must be declared.
- `app-import`: a feature never imports the app layer.
- `banned-package`: per layer, as above.
- `unresolved`: a local import must name a file.
- `unused-dependency`: a declared edge that no import uses fails too, so the DAG stays an exact picture.
- `dag-unknown`, `layer`, `dag-cycle`: the declaration itself names only declared features, respects the layers, and has no cycle (a depth-first search reports the first cycle it finds).

## The comment check (`comments.ts`)

Code files (`.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs`) are tokenized by oxc-parser, which lists every comment, so a `//` inside a string, a template, a regular expression or JSX text is not one. CSS goes through a small scanner that skips single- and double-quoted strings and reports each `/* … */`. The allowed comments are the ones a tool reads: `/// <reference …>` directives and `// @vitest-environment …` pragmas. `GENERATED` lists the files a tool rewrites on every dev and build start (`file-routes.d.ts`, `solid-env.d.ts`), which are skipped. Everything a comment used to say goes to the owning feature's README, a `cite` value (engine citations, `engine/cite`), or a better name.

## The config-import check (`config-imports.ts`)

Vite loads `vite.config.ts` with Node's own module loader, so every runtime import the config reaches, through `vite/data-document` into `engine/data-dir`, `engine/compact` and on, must name its file with an extension (`./read-dir.ts`), and path aliases like `~engine/…` don't resolve there. The check starts at `vite.config.ts` and follows each relative runtime import that has an extension, reporting `[config-import]` for one without an extension and for an alias. Type-only imports are skipped (they're erased before loading), and packages are left to the loader.

## Tests

`repo-checks.test.ts` runs the checks on small in-memory inputs; the config-import check follows a planted chain and reports a missing extension and an alias, skipping a type-only import and a package; comments inside strings, templates, regular expressions and JSX text are ignored and real ones found; the allowed directives and the generated files pass; CSS strings are skipped; and each import rule fires with its message, including a cycle, an unknown name and a layer breach in a declared DAG.
