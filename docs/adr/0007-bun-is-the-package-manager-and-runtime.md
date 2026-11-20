# Bun is the package manager and runtime

The repo installs with Bun and runs its scripts, importer, dev server, build and server on Bun, never npm or Node (user, 2026-11-20). Parallel tickets each get a worktree, and `npm ci` gave every one its own 178 MB copy in about 2 s. `bun install` clones packages from Bun's global cache (copy-on-write on APFS), so a new worktree costs 1–2 MB and installs in 0.16 s. Bun also runs TypeScript files directly, so the Node loaders `tools/importer/run.mjs` and `scripts/engine-run.mjs` are gone. Installs use the isolated linker (`bunfig.toml`), so a package can import only what it declares.

## Considered Options

- pnpm: a hard-linked global store gives the same disk saving with a strict layout. Rejected because the user wanted one tool for installing and running, with no Node.
- Bun only as the package manager, with Node still the runtime: rejected for the same reason; it keeps two tools and the TypeScript loaders.
- Porting the tests to `bun test`: tried and dropped (2026-11-20). The engine suite moved with little more than its imports, but the client suite needed a hand-written Bun plugin that replays @solidjs/vite-plugin's compile passes (primitive names, `lazy()`, the JSX compile, location remapping) and a hand-built jsdom global, since jsdom's `runScripts` window can't dispatch events under Bun 1.3.5. That is upkeep the repo would carry for every plugin release, so vitest stays for all three suites.

## Consequences

Vitest still runs on Node. Under Bun 1.3.5 every vitest worker pool fails to start (forks: `child.channel.unref` is missing; threads: a Worker's stdout is null), so `check` and `test` call `vitest` without `--bun`, which runs it on Node. When a Bun release fixes this, the scripts drop the exception, and Node leaves the toolchain. Until then a Node install stays on the machine and in WebStorm's run configurations for vitest. Everything else in WebStorm uses Bun as its package manager.
