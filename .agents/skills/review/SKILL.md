---
name: review
description: >-
  Review a diff, commit, or feature in wotr-planner against the project's coding
  standards, glossary, Solid 2 rules, and deterministic checks. Use before
  committing, when asked for a code review, or when auditing a feature folder.
---

# Review a diff or feature in WotR Planner

Apply judgement rules that deterministic tooling cannot verify, then confirm the automated gates.

## Read first

1. [CODING_STANDARDS.md](../../CODING_STANDARDS.md) — fidelity to the game, single source of truth, scope boundaries, and conventions.
2. [GLOSSARY.md](../../GLOSSARY.md) — canonical project terms and their `_Avoid_` alternatives.
3. [AGENTS.md](../../AGENTS.md) — project invariants and the Solid 2.0 primer (required for any change under `src/`).
4. Each touched feature's `README.md` — check whether the README still matches the code.

## Judgement checklist

- **Fidelity to the game (`engine/`, `tools/importer/`):**
  - Every ported rule has a `cite` entry in its feature's `cites.ts`, reads only fields that the cited C# method reads, and is explained in our own words in the feature's `README.md`.
  - Game fields keep the dump's exact names and shape (ADR 0005); no planner-side renaming or reshaping.
  - Test expectations come from game facts (named blueprint + GUID or C# method), not counts of our own output.
  - Data fixes go in `data/overrides/` with a reason, never inline hacks or manual edits to imported JSON.
- **One answer per question:**
  - Prerequisites stay in `P`, grants in `G`, walk legality in `W`, pickers in `S`, refusal wording in `R`, edits in `E`, build code in `C`. Flag duplicated logic or refusal strings worded outside `R`.
- **Scope & boundaries:**
  - No design decision settled in passing without a ticket in `.scratch/wotr-planner/map.md` or an ADR in `docs/adr/`.
  - Copyright boundary (ADR 0006): display names only — no game descriptions, copied C#, or raw dump JSON in code, tests, or docs.
  - Terms match `GLOSSARY.md`.
- **Solid 2 UI (`src/`):**
  - Props read through `props.*` (never destructured), passed as values (not accessors), and typed via exported `interface <Component>Props`.
  - `createEffect(compute, apply)` split into two functions; store updates via draft setters; `onSettled` instead of `onMount`; no reactive reads at top of component/flow bodies; no `untrack` to silence `STRICT_READ_UNTRACKED`.
- **Tests & naming:**
  - Tests walking real `data/` carry `{ timeout: 30_000 }` (or `60_000` / `120_000` for slower tests).
  - Unclear names are renamed rather than commented (comments are banned by `check:repo`).
  - Feature `README.md` updated to match behavioral changes.

## Automated checks

Run the deterministic gates:

```bash
bun run check
```

If local `blueprints/` or `decompiled/` are absent, run the available subset:

```bash
bun run format:check && bun run lint && bun run check:repo && bun run typecheck && bun run test -- --run --project engine --project client --project server
```

Optional advisory LLM checks (require `OPENROUTER_API_KEY`; see `.jev-lint/README.md`):

- `bun run lint:jev` — review lines changed since `main`.
- `bun run lint:jev:commits` — check unpushed commits against `AGENTS.md`.
- `bun run review:ports -- <feature>` — compare cited C# methods against TypeScript ports.

## Report format

Group findings by severity (blocking defects first, then standards/clarity findings). For each finding cite `file:line`, the violated rule or standard, why it matters, and the concrete fix.
