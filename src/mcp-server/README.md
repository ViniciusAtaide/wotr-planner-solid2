# MCP server

The MCP server (map 08; build ticket 05): the engine's agent tools (`~engine/mcp`) behind the official MCP SDK. It
keeps no state (map 06): the HTTP route makes one server per request, and stdio one per process. Both read the
committed data once.

## Public entry

`index.ts` exports:

- `sharedEngine`: the engine over the committed data, read on first use, from `data/` beside the working directory or
  from the directory `WOTR_DATA` names.
- `createMcpServer`: an MCP server that lists the tools and runs them; a tool's answer, a Refusal too, is its JSON.
- `handleMcpRequest` (`http.ts`): the streamable-HTTP handler the `/mcp` route delegates to, with one server per
  request and JSON responses.

## Usage

`stdio.ts` serves the MCP over stdio, for agents that start the planner as a process:

```sh
bun src/mcp-server/stdio.ts   # or: bun run mcp-stdio
```

Run it from the repo root, or set `WOTR_DATA` to the data directory.

## Tests

None of its own: the tools behind it are tested end to end in `engine/mcp/tools.test.ts`.
