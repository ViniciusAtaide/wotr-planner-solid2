# WotR Planner v1: the build

## Destination

The full-stack planner and its MCP server, as the design map specifies ([map](../wotr-planner/map.md)), running locally and published as a static site. Every pick a person or an agent makes is one the game allows. A Build can be incomplete but never impossible.

## How to work

- **One ticket per session, in order.** A ticket starts only when every ticket it is blocked by is `done`.
- **Claim first.** Set `Status: in-progress` and, under it, `Session: <session name>` before any work. When the "Done when" list holds, set `Status: done` (keep the `Session:` line) and add a short `## Outcome`: what was built, what was measured, and any follow-up.
- **One coordinator.** The coordinator is the planning session `local_1e4948e3-90e9-4432-a18b-2731593f48d6`, as named by the user on 2026-11-20. It is the only one that starts sessions, adds, splits or reorders tickets, or changes a ticket's "Blocked by". A ticket session that needs one of those asks the coordinator, which asks the user. Ticket sessions report their commit hash to the coordinator.
- **Parallel tickets** each run in their own worktree from `scripts/worktree.sh <name>` (branch `ticket/<name>`). One ticket at a time can stay in the main checkout.
- **The design is settled.** It lives in [docs/decompiled-guide.md](../../docs/decompiled-guide.md), the ADRs in [docs/adr/](../../docs/adr/), [GLOSSARY.md](../../GLOSSARY.md) and the map's resolved tickets. A ticket that runs into a design question stops and raises it as a new ticket on the map; it doesn't decide the question in passing.
- **Tools:** WebStorm (`mcp__webstorm__*`) everywhere, as `CLAUDE.local.md` says: `scripts/worktree.sh` opens each worktree as its own WebStorm project, and its path is the `projectPath`. RustRover for `~/code/wotr-planner`.
- **Review as you go:** the user follows a ticket in its WebStorm window's Commit tab, so a ticket's work stays uncommitted until its commit (or a checkpoint the coordinator agrees). After merging, the coordinator finishes the worktree with `scripts/worktree-done.sh <name>`, which closes its WebStorm window, then removes the worktree and its branch.
- **Commits:** one per session, made when its work is done, through the pre-commit hook, never bypassing it. In the main checkout, stage by path (never `git add -A`, since another session may share the folder) and commit to `main`. In a worktree, commit to its branch; the coordinator merges it.

## Tickets

| # | Ticket | Blocked by | Guide §5 |
| --- | --- | --- | --- |
| 01 | [Data contract: setup, allowlist, loader and P](issues/01-data-contract.md) | none | 2, 3 |
| 02 | [The importer, with the grant index](issues/02-importer-and-grant-index.md) | 01 | 4, 5 |
| 02a | [Hidden grants and the unlisted types](issues/02a-hidden-grants-and-unlisted-types.md) | 02 | 4, 5 |
| 02b | [Items, Gear data and trimming](issues/02b-items-gear-data-and-trimming.md) | 02a | 4 |
| 02c | [Shared names](issues/02c-shared-names.md) | 02a | 4 |
| 02d | [One grant reader](issues/02d-one-grant-reader.md) | 02b, committed | 4, 5 |
| 02e | [Ticket 02 review fixes](issues/02e-review-fixes.md) | 03's second checkpoint (`d3dfe57`) | 4, 5 |
| 03 | [The walk, with gear checks](issues/03-the-walk.md) | 02a, 02d; 02b for its Gear area only; 02e for its remaining work | 6 |
| 03b | [Saves as a second acceptance suite](issues/03b-saves-as-acceptance-tests.md) | 03; the user's list of clean saves | 6 |
| 02f | [Qualifiers for several grantors and Gear items](issues/02f-qualifiers-grantors-and-gear.md) | 03 (both rewrite `data/`) | 4 |
| 03c | [Ticket 03 review fixes: the walk](issues/03c-walk-review-fixes.md) | 03, 02f | 6 |
| 02g | [Ticket 02 and 03 review fixes: the importer and names](issues/02g-importer-review-fixes.md) | 03, 02f | 4 |
| 04 | [Pickers, refusals, edits and the Build code](issues/04-pickers-refusals-edits-and-the-build-code.md) | 03, 02c, 02f, 03c, 02g | 7, 8 |
| 05a | [Port the design system into the app](issues/05a-design-system-port.md) | 05's MCP checkpoint | 10 |
| 05 | [MCP and UI](issues/05-mcp-and-ui.md) | 04; 05a for its UI (scope 4) | 10 |
| 05b | [Preload the data document](issues/05b-preload-the-data-document.md) | 05; the user's queued review work (state machines, skills, type strength, lean proof) | 10 |
| 05c | [A compact data document](issues/05c-compact-data-document.md) | 05b | 10 |
| 05d | [State-machine fixes: Builds a code can hold](issues/05d-state-machine-fixes.md) | 05c | 6, 7, 8 |
| 07 | [The levelling trail (UI remake, part 1)](issues/07-the-levelling-trail.md) | none (the UX audit's bugs were fixed in `6d07a62c`) | 10 |
| 05e | [Legend's rank, the fake Legend class, and Gold Dragon on offer](issues/05e-legend-switch-rank.md) | none | 6, 7 |
| 08 | [Sub-choices nested under their parent in pick lists](issues/08-nested-sub-choices.md) | the flat choice lists work | 10 |
| 10 | [Choice lists: inline first or modal first](issues/10-choice-list-mode.md) | the capped choice lists change | 10 |
| 11 | [The top bar: the Build's name, first focus, and "WP" on phones](issues/11-top-bar-build-name.md) | none | 7, 10 |
| 06 | [After first use: summaries, more links, the published site](issues/06-after-first-use.md) | 05 | none |
| 06a | [The importer keeps the Summary carriers](issues/06a-importer-keeps-summary-carriers.md) | none (parent 06) | 4 |
| 06b | [Summary labels and templates](issues/06b-summary-labels.md) | 06a | none |
| 06c | [Hand-written summaries](issues/06c-hand-written-summaries.md) | 06b | none |
| 06d | [The other Synergy link kinds](issues/06d-synergy-link-kinds.md) | 06a for energy and descriptors | none |

Ticket 02 was split on 2026-11-19 when its remaining work outgrew one ticket ([review-before-03.md](review-before-03.md)): 02a, 02b and 02c carry it, and ticket 03's areas each allowlist what they read. 02b runs alongside 03.

Ticket 02d was added on 2026-11-20 from an architecture review: G becomes a complete index of grants, the importer stops keeping its own copy of the grant rules, and a check holds the walk to applying every grant type G indexes. The same review settled how ticket 04's pickers pause the walk (ticket 04's S).

Tickets 03c and 02g were added on 2026-11-20 from the two-axis review of 02 and 03 together. The user chose to fix every finding before 04. They run in parallel: 03c owns `engine/` (not `engine/data/`), and 02g owns `tools/`, `scripts/dump/`, `engine/data/` and `data/`.

Tickets 01–05 reach the first usable version: agents build validated characters through the MCP, and a local UI explores Builds. Ticket 06 is polish that waits until the planner is in use.

The check script (guide step 9) isn't a ticket of its own. Ticket 01 starts it, and every later ticket adds its checks to it.

## Alongside, on the map

- [Save files as an oracle](../wotr-planner/issues/18-save-files-as-an-oracle.md): research that needs no input from the user, so it can start any time. If saves turn out to be readable, they join the gold builds as acceptance tests from ticket 03 on.
- [Planner UI for fast exploration](../wotr-planner/issues/13-planner-ui-prototype.md): a prototype the user reacts to, worked on mock data. Ticket 05's UI waits for it.
- **Path switches in detail** stay in the map's "Not yet specified" until ticket 03 reaches them.
