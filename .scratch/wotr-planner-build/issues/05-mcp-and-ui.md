# MCP and UI

Status: done
Session: ticket-03c-walk-fixes
Blocked by: 04 (map ticket 13 is resolved: build the UI to its answer)
Plan: [plan](../plan.md)

## Goal

The first version you can actually use. Agents build a character level by level through the MCP, and you explore Builds in a local UI. Neither can reach an impossible state, and every Refusal's text comes from R.

## Scope, in this order

1. **The MCP**, a thin layer over the engine that also tests it end to end ([MCP tool surface](../../wotr-planner/issues/08-mcp-tool-surface.md), [Where an MCP Build lives](../../wotr-planner/issues/06-where-an-mcp-build-lives.md)).
   - The 14 stateless tools: `start_build`, `set_start`, `level_up`, `next_slots`, `options`, `pick`, `set_skills`, `place_rank`, `equip`, `synergies`, `search`, `explain`, `sheet`, `compare`.
   - Every tool that changes a Build returns `{ code, build }` or a Refusal.
   - Cascade is a `mode` on `pick` and `equip`.
   - `options` returns open options first, 25 per page, and closed ones as counts by reason unless asked.
   - Served at `/mcp` by `bun start`, plus a stdio wrapper.
2. **The "enables / needs" links** ([Synergy link kinds](../../wotr-planner/issues/09-synergy-link-kinds.md)): the prerequisite-chain kind, from G and P, behind `synergies` and shown in the UI. The other link kinds come in ticket 06.
3. **The basic description**, until the Summaries in ticket 06 exist: an option shows its name, its prerequisites, what it grants and where it can be picked, with "no summary yet". Never game text.
4. **The UI**, local only (`bun start`). It follows the [Planner UI prototype](../../wotr-planner/issues/13-planner-ui-prototype.md) and `AGENTS.md` (Solid 2).
   - The walk runs in the browser on the content-hashed data document ([ADR 0004](../../../docs/adr/0004-committed-data-and-a-browser-side-walk.md)).
   - Share links use `/#b=<code>`.
   - Picks apply instantly. Only a Cascade shows a preview, and every edit can be undone and redone.

## Done when

- An agent can take a Build from `start_build` to level 20 and Mythic rank 10 through the MCP alone, without a single pick failing validation.
- Every Build code the MCP returns opens the same Build in the UI.
- Every Refusal's text in the MCP and the UI comes from R.
- In the UI, every option shows its status, closed options show their Refusal, and no sequence of UI actions reaches an impossible Build.

## Checkpoint 1 (2026-11-20): the MCP, its links and the basic description

- **The 14 tools** (`engine/mcp/tools.ts`), stateless over the engine, as map 08 and its amendment (`e48a9975`) set out. Changing tools return `{ code, build }` or a Refusal worded by R. `pick` and `equip` take `mode`. `options` pages 25 open options and counts closed ones by reason. `level_up` also takes the level's ability increase, which map 08's table had no tool for. `sheet` has no HP (amendment 6).
- **The registry** (`engine/mcp/registry.ts`): names, descriptions and JSON Schemas. **The server** (`src/mcp/server.ts`, `@modelcontextprotocol/sdk` 1.32.2) is stateless, at `/mcp` (streamable HTTP, JSON answers, `src/routes/mcp.ts`) under `bun start` and over stdio (`bun scripts/mcp-stdio.ts`). Both were checked by hand under Bun, and `src/server/mcp.test.ts` drives it through the SDK.
- **Links** (`engine/links.ts`): the prerequisite-chain kind from P and G, behind `synergies`, the options' badges and `compare`'s counts.
- **The basic description** (`engine/describe.ts`): the name, the prerequisites worded by R, what it grants, where it can be picked, and its chain links, with "No summary yet." and never game text.
- **End to end** (`engine/mcp/tools.test.ts`): Jack-in-the-Green goes from `start_build` to level 20 and Mythic rank 10 through the tools alone, with no pick refused, apart from his map-22 gap, which is left out. Every step's code opens the Build it returned.

## Outcome (2026-11-20)

Done, in two commits: the MCP, its links and the basic description (checkpoint 1), then the UI.

- **The data document** (`vite/data-document.ts`): the committed `data/` as one content-hashed JSON asset, `/assets/data-<hash>.json`. The build emits it for the client only, the dev server answers the same path, and `virtual:data-document` exports it. The browser fetches it once (7.3 MB, 1 MB gzipped) and runs G, the walk, S, R and E itself (`src/planner/engine.ts`). There is no API route.
- **One page at `/`** (`src/planner/Planner.tsx`). The Build lives in `#b=<code>`, written with `history.replaceState` as it changes. A pasted link opens through `hashchange`, and a link that doesn't decode says so and starts empty.
  - **The Timeline** (`Timeline.tsx`) has a row per level, with each Mythic rank at its Rank level, and a chip for every slot the walk opens.
  - **The side panel** (`panels.tsx`) holds the slot picker (open options first, closed ones with R's lines and Synergy wording, J/K, ↵, `/`), the level, rank and start editors, Add, and Gear with ADR 0002's opt-in.
  - On a phone the side panel is a full-screen sheet.
- **No impossible Build.** Every change goes through `createPlanner` (`state.ts`), which calls E:
  - `allows` applies at once;
  - `cascade` opens the Cascade preview, which applies only on confirm;
  - anything else is refused with R's words.

  Picks come only from S's open options. Controls snap back to the Build after a change that waits or is refused. Undo and redo (⌘Z, ⇧⌘Z) cover every change.
- **Fork and compare**: a second Build beside the first, with CompareToggle, StatBlocks marked where they differ, and the first place they diverge (`divergence`, now exported from `engine/mcp/tools.ts`).
- **E grew the UI's edits**: `addLevel`, `addRank`, `skills`, `increase`, `raceStat`, `dropLevel`, `dropRank`, `rankClass`, `countGear`. `Picker` carries its `unit`.
- **The codec** streams through `new Response(bytes).body`, which every runtime and jsdom has, instead of `Blob.stream()`. `vite.config.ts` imports its plugin with the `.ts` extension, so `tsconfig.json` allows that.
- **Tests** (`src/planner/planner.test.tsx`):
  - every code from a Fighter built step by step through the MCP opens the same Build in the UI, re-encodes to the same code, and shows every pick on the Timeline;
  - Jack-in-the-Green's code shows all 20 levels and 10 ranks;
  - a bad link is stale;
  - lowering Strength under Power Attack waits on the Cascade preview; cancel keeps the Build, confirm clears the pick, and undo restores it.
- **Checked in the browser**: desktop and 375 px, add a level, the picker's Refusals, the Cascade preview with cancel, confirm and undo, fork and side-by-side compare, the phone sheet, and a reload reopening the link.

- **Dark only (the user's call).** The user kept the Worldwound theme alone, so Parchment, the header's theme toggle and `public/theme.js` are gone. `tokens.css` has one `:root` set. Ticket 05a's Outcome still describes both themes.
- **Named props types (the coordinator's request).** Every component in `src/components/design/` and `src/planner/` takes `props: <Component>Props`, an exported interface, with shared unions such as `OptionStatus` and `BadgeKind` exported. `CODING_STANDARDS.md` gains the rule.

Left for later: the Mythic badge on options isn't set yet.

