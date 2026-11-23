# Jev reviews

Advisory review rules for [jev-lint](https://github.com/mizchi/jev-lint) 0.10.0, their evaluation suites, and its verdict cache. A rule here is an ast-grep matcher plus one sentence; a hosted model answers the sentence about each match with a probability. Nothing here is part of `bun run check` or the pre-commit hook, and no finding fails a run: every rule is `severity: info` and `category: advisory`. `.jev-lint.yaml` at the root picks which rules run; the commands are in the root `README.md` (note 2).

## Layout

- `rules/typescript/<id>/rule.yml`: a rule. jev-lint loads every rule under `rules/` on every run; `.jev-lint.yaml` enables it.
- `rules/typescript/<id>/fixtures/` and `expect.yml`: the rule's fitting suite. The only suite a cutoff may be chosen from.
- `holdout/typescript/<id>/`: the held-out suite. Its `rule.yml` is a symlink to the fitting rule, so both suites ask the same question at the same cutoff. A copy would drift, and `extends:` can't be used: in 0.10.0 `eval` resolves `extends` only against the shipped rules, not the ones under `rules/`.
- `verdicts/`: the verdict cache that live runs write. It is trusted input (a file added there can silence or invent a finding), so review it like code if it is committed. The formatter skips this folder.
- `index.ts`: an empty entry. `tools/repo-checks/features.ts` declares `.jev-lint` as a `tools` feature with no dependencies, so the fixture files pass the ownership check without an exemption: a fixture can't import anything, and the comment ban applies to it. TypeScript, oxlint and oxfmt don't read this folder, so fixtures are neither type-checked nor linted.

Labels and their reasons live only in `expect.yml`. Fixture files are named `case-NN.ts`, because the model sees the subject's path.

## The rules

Each rule comes from one defect the audit reproduced. `state: located` sends the matched node and its whole file. `context:` adds the named feature READMEs, read at load time, so editing one of those READMEs retires the verdicts given against the old text. The model sees nothing else: not the callees in other files, not the tests.

| Rule | Audit scenario | What it matches here (dry run) | Evidence the model gets | Evidence it does not get |
| --- | --- | --- | --- | --- |
| `preview-reports-every-clear` | A: `withMode`'s preview lists only `cleared`, while the Cascade also clears skill levels and Mythic ranks | `withMode`, `pick` and `equip` in `engine/mcp/tools.ts` (a function or arrow whose text says "preview") | `engine/mcp/tools.ts`; `engine/edits/README.md`, which lists the `Cascade` fields; `engine/mcp/README.md`, which defines `Mode` | `cascade`'s body in `engine/edits/edits.ts`; the fields are known only through the README |
| `adapter-keeps-normalization` | B: `set_start` folds its edits with the raw `apply`, so a race change keeps a `raceStat` that `applyWith` would drop | `applyWith` in `engine/edits/edits.ts`; `plainEdits`, `addLevelOrRank`, `set_skills` and `equip` in `engine/mcp/tools.ts` (a function that calls `apply` or folds with it) | the subject's file; `engine/edits/README.md`, which says what `applyWith` settles; `engine/mcp/README.md` | for a subject in `tools.ts`, `applyWith`'s body and the race-stat check |
| `accepted-input-is-refused` | C: `{SpellSchool: 'Banana'}` passes the schema and `canSelectParam` and makes the encoder throw | `pick` in `engine/mcp/tools.ts` (a function that reads `args.param`, the MCP handlers' convention) | `engine/mcp/tools.ts`; `engine/mcp/README.md`; `engine/codec/README.md`, which shows a school is encoded as a byte | the schema in `engine/mcp/registry.ts`, `canSelectParam` in `engine/walk`, and the encoder's source |

The third rule has the weakest evidence: in the real code the three layers sit in three files, and only two READMEs reach the model. An answer under the cutoff on `pick` is not evidence that the layers agree. A plain enum check isn't asked of the model at all; a membership test belongs in the code and its tests.

`preview-reports-every-clear` and `accepted-input-is-refused` keep 0.50, jev-lint's default for a rule with no `threshold:`, because their fitting suites put it inside the clean/defect gap. `adapter-keeps-normalization` has `threshold: 0.75`: in its second fitting run a near-boundary clean case scored 0.517, and 0.75 is the midpoint of that suite's gap (loudest clean 0.517, quietest defect 0.979). Both choices come from the fitting suites only; see the record below. Each rule has a `nextCheck`: the reproduction a reviewer runs before acting on a finding.

## Reading a result

- A finding is a probability over a cutoff, not a confirmed defect. Run its `nextCheck` first.
- A failed or rate-limited request or an unusable answer gives no verdict. jev-lint counts the missing verdicts in every format and exits 3. Read that as unreviewed, never as clean.
- jev-lint reports each finding at the matcher's `file:line` with the rule id and answer. `--json` and `--record <path>` keep them in a file.

## What a live run sends

`.jev-lint.yaml` points at OpenRouter's free `perplexity/pplx-decider-v1.3:free`. A live run sends each matched file whole, plus the rule's `context:` READMEs, to OpenRouter. The paths are `src`, `engine`, `tools` and `vite`. `data/`, `decompiled/`, `blueprints/`, `dist/`, `node_modules/` and `.scratch/` are excluded, so no game source is sent. Add `--dry-run --show-subjects` to any command to list the files and subjects before anything is sent.

Measured with `--dry-run --cache none` on this tree:

| Run | Requests | Input tokens (estimate) |
| --- | --- | --- |
| full `check`, all enabled rules | 171 (167 of them `fn-name-promises`) | ~1.48M |
| the three rules here, on the real code | 4 | ~45k |
| `eval .jev-lint/rules`, 3 passes | 54 | ~390k |
| `eval .jev-lint/holdout`, 3 passes | 54 | ~387k |

The free model is paced at one request about every 3.2 seconds, so a full `check` takes about nine minutes and each eval about three.

## Evaluating

The protocol, in order:

1. `bun --bun jev-lint eval .jev-lint/rules --dry-run` and `bun --bun jev-lint eval .jev-lint/holdout --dry-run` confirm each suite loads and matches (no requests).
2. `bun --bun jev-lint eval .jev-lint/rules` runs the fitting suites, three passes each. Choose a cutoff from these answers only, by reading each rule's `cleanTop`, its margins and its pass-to-pass spread. Write it as `threshold:` in `rule.yml`.
3. With the cutoffs fixed, run `bun --bun jev-lint eval .jev-lint/holdout` once and record the result below. If a held-out case fails, don't move the cutoff to fix it: rewrite the sentence or the matcher, add new held-out cases, and evaluate again.
4. `--accept` makes a run the suite's `baseline.json`; later runs and `--replay` compare against it.

The suites:

| Rule | Fitting: defect, corrected, hard clean, distractor, near-boundary | Held-out: defect, hard clean, distractor, near-boundary |
| --- | --- | --- |
| `preview-reports-every-clear` | 1, 1, 2, 1, 2 | 2 (another domain; one kind left out), 1, 2, 2 |
| `adapter-keeps-normalization` | 1, 1, 2, 4 (`applyWith` itself), 2 (+2 `applyWith`) | 2 (another edit kind; first edit settled, the rest not), 1, 5, 2 (+2 `applyWith`) |
| `accepted-input-is-refused` | 1, 1, 2, 0, 2 | 2 (another parameter; a check whose set is larger than the encoder's), 1, 2, 2 |

Each near-boundary pair (`case-05.ts`, `case-06.ts`) is one subtle defect and one clean case that looks like it: a preview that lists Mythic picks but not the ranks, against one that reports ranks only as a count; a settled fold that puts the old stat back with a raw `apply`, against a raw `apply` behind a guard that makes it safe; a case-insensitive check in front of an exact encoder, against a parser that refuses everything outside the encoder's set; and in the held-out suite, a preview that goes silent when no pick is cleared, race edits singled out for the raw step, and `in` against `Object.hasOwn`.

The second rule's corrected case folds with `applyWith` and never calls the raw `apply`, so its matcher skips it: the matcher clears it, not the model, and it isn't one of the suite's subjects.

Together the suites hold 50 matched subjects, 15 of them defects, all written to the audit's three scenarios. They can show how a rule separates these cases. They can't establish a precision or recall on this repository's code.

## Evaluation record

First live run, 2026-11-23, on `main` at 6c05d203 with this folder's rules uncommitted. The model was `openrouter:perplexity/pplx-decider-v1.3:free`; OpenRouter reported the deployment as `perplexity/pplx-decider-v1.3-20261112`. Every suite ran 3 passes at cutoff 0.50, and no verdict was missing. A score is the model's probability for one fixture; "spread" is the largest change between passes.

| Rule | Evidence | Fitting: flagged / missed / false flags | Fitting scores | Held-out: flagged / missed / false flags | Held-out scores |
| --- | --- | --- | --- | --- | --- |
| `preview-reports-every-clear` | the matched file, `engine/edits/README.md`, `engine/mcp/README.md` | 1 / 0 / 0 of 4 clean | defect 0.998; clean ≤ 0.122 (spread 0.046) | 2 / 0 / 0 of 3 clean | defects 0.993, 0.995; clean ≤ 0.002 |
| `adapter-keeps-normalization` | the matched file, `engine/edits/README.md`, `engine/mcp/README.md` | 1 / 0 / 0 of 6 clean | defect 0.998; clean ≤ 0.021 | 2 / 0 / 0 of 6 clean | defects 0.953, 0.988; clean ≤ 0.088 |
| `accepted-input-is-refused` | the matched file, `engine/mcp/README.md`, `engine/codec/README.md` | 1 / 0 / 0 of 3 clean | defect 0.999; clean ≤ 0.009 | 2 / 0 / 0 of 3 clean | defects 0.999, 0.999; clean ≤ 0.018 |

No decision changed between passes.

The same day, the three rules ran once on `engine/mcp/tools.ts` and `engine/edits/edits.ts`, where the audit's three defects are still present:

| Rule | Subjects | Flagged | Score |
| --- | --- | --- | --- |
| `preview-reports-every-clear` | 3 | `withMode` (the defect); `pick` and `equip`, which expose its preview | 0.994; 0.940, 0.918 |
| `adapter-keeps-normalization` | 5 | `plainEdits` (the defect). `applyWith`, `addLevelOrRank`, `set_skills` and `equip` were not flagged: `addLevelOrRank` folds with the raw `apply`, but only level, rank and archetype edits, which `applyWith` settles no differently | 0.990 |
| `accepted-input-is-refused` | 1 | `pick` (the defect, through three files) | 0.759 |

Second live run, the same day and model, after adding the near-boundary pairs. The fitting suites ran first at 0.50:

| Rule | Fitting: flagged / missed / false flags | Near-boundary scores |
| --- | --- | --- |
| `preview-reports-every-clear` | 2 / 0 / 0 of 5 clean | defect 0.950; clean 0.053 |
| `adapter-keeps-normalization` | 2 / 0 / 1 of 9 clean at 0.50; 2 / 0 / 0 at 0.75 | defect 0.979; clean **0.517** (the false flag) |
| `accepted-input-is-refused` | 2 / 0 / 0 of 4 clean | defect 0.978; clean 0.004 |

That false flag set `adapter-keeps-normalization` to 0.75. Then the held-out suites ran once, at 0.50, 0.75 and 0.50:

| Rule | Held-out: flagged / missed / false flags | Near-boundary scores |
| --- | --- | --- |
| `preview-reports-every-clear` | 3 / 0 / 0 of 4 clean | defect **0.716**; clean 0.004 |
| `adapter-keeps-normalization` | 3 / 0 / 0 of 9 clean | defect 0.972; clean 0.320 |
| `accepted-input-is-refused` | 2 / **1** / 0 of 4 clean | defect **0.015** (missed); clean 0.010 |

No decision changed between passes in either run. Each suite's `last.json` holds this second run; `bun --bun jev-lint eval <suite> --accept-last` makes it the suite's `baseline.json` without a request.

What this does and doesn't show:

- On the first cases each rule told its defects from its controls with a wide margin, and each caught the real defect it was written from. Those cases were easy for this model: a drift in the model or the sentence wouldn't have moved any of them across the cutoff.
- The near-boundary pairs found two weak spots. `adapter-keeps-normalization` can't tell a raw `apply` made safe by a guard from an unsafe one (0.517 and 0.320); the cutoff now sits above both, which is a fit to two cases, not a measured rate. `accepted-input-is-refused` missed the `in` check that also accepts inherited keys (`constructor`): a defect that needs knowledge of a JavaScript operator, the class jev-lint's own documentation says this kind of model is poor at. The held-out miss is recorded, not fixed by a cutoff: that check belongs in the code's own tests (a membership test with `Object.hasOwn`), not in this rule.
- `preview-reports-every-clear`'s held-out near-boundary defect scored 0.716, the first defect with a margin under 0.3. The suites now hold cases near each cutoff, so a later run can notice drift.
- The real-code run is the three defects the rules were written from, so it shows the rules reach their evidence in place, not that they find unknown defects. `accepted-input-is-refused` scored lowest there (0.759), as expected from its thinner evidence.
- A finding on `pick` or `equip` under the first rule repeats the `withMode` defect through a caller; it is one defect, not three.
- 50 fixture subjects and one run on two files are not a precision or recall for this repository, and the runs used the free model, not the TypeSafe Jev the shipped rules were fitted on.

## Not covered

- `git/diff-follows-instructions` holds a change against `AGENTS.md` only (`CLAUDE.md` when there is no `AGENTS.md`). `CODING_STANDARDS.md`, `GLOSSARY.md`, the ADRs and the feature READMEs are not part of that question.
- Citations: the deterministic checks in `tools/decompiled` (`README.md` there) check that a key is an identifier in the feature's code and that the cited method reads each cited field. Whether the cited method supports the rule as the engine ports it is not reviewed by any rule here; `tools/port-review` asks it through jev-lint's relations API instead, one comparison per citation.
- Framework mix-ups (Solid 1 or React patterns in Solid 2 code) stay with the deterministic linters (`oxlint`, `eslint-plugin-solid`); no rule here asks about them.
- Documentation drift and consistency across a whole change have no rule yet.
