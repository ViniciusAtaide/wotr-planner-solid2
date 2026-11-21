---
name: qa-pass
description: Run a QA pass on the planner's web UI in a scratch checkout and report bugs and UI quirks, ranked, without fixing anything. Use after a merge to main, or when the user or coordinator asks for QA, a QA pass, or a check of the UI in the browser.
---

# QA pass on the planner

You hunt for what a real user would hit, and you report it. You fix nothing.

## Setup

Other sessions work in the main checkout, so test a scratch checkout of `main` (or the commit you were given):

```bash
QA="$TMPDIR/qa-$(date +%s)"
git -C /Users/thaynamarcela/code/wotr-planner-solid2 worktree add --detach "$QA" main
for d in node_modules blueprints decompiled; do ln -s /Users/thaynamarcela/code/wotr-planner-solid2/$d "$QA/$d"; done
```

Start `bun run dev -- --port <free port 3100–3199>` in `$QA` as a background command. WebStorm doesn't have this checkout open: use the built-in file tools there. When done, stop the server and `git -C /Users/thaynamarcela/code/wotr-planner-solid2 worktree remove --force "$QA"`.

Drive the app with the built-in browser (`mcp__Claude_Browser__*`; load the schemas you need in one ToolSearch). **Front the tab with `tabs_select` before timing anything**: a hidden pane throttles frames and skews every timing. Test at 375 px (`resize_window` preset `mobile`) and at 1280 px (preset `desktop`).

Read first: `src/planner/README.md`, the tickets the pass is checking (`.scratch/wotr-planner-build/issues/`), and the previous pass's report if you're given one.

## What to exercise

The brief says what changed; always cover it, plus:
- a full Build: scores, race with heritage, alignment, background, levels 1–20 with a multiclass and an archetype, Mythic ranks 1–10 with a path and a switch at rank 8;
- edits that Cascade, Undo and Redo, ⌘Z right after a pick;
- every choice list: filtering, keyboard, closed choices and their Refusals, names (no internal qualifiers);
- the Share link: reopen in a new tab, a broken link;
- Gear, Export, fork and compare;
- each list open and each pick's time (over 200 ms is a finding), and the console.

A finding is anything wrong, confusing, inconsistent or ugly: overflow, clipped text, layout shift, lost focus, stale UI after an edit, a dead-end step, wrong counts, an option the game wouldn't offer or a missing one it would, a Build that won't reopen from its link, a console error.

## Report

Under 600 words. If the brief lists earlier findings, open with a table rechecking each (fixed, or still broken with how to reproduce). Then new findings, most severe first, on this scale:

| Severity | Meaning |
| --- | --- |
| 4 | Blocks the user or loses work (an impossible Build, a lost Build) |
| 3 | A step can't be completed, or something important is unreachable |
| 2 | Wrong, slow or confusing, with a way around |
| 1 | Cosmetic |

Each finding: severity, exact steps, what you expected, the width, a screenshot path in your scratch folder, and the recommended fix with its layer (engine, pickers, planner UI, CSS). End with what you exercised and found clean.
