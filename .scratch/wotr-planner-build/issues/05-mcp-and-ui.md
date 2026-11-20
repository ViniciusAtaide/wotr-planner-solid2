# MCP and UI

Status: in-progress
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
