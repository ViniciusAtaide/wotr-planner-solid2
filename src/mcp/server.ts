// The MCP server (map 08; build ticket 05): the engine's tools (engine/mcp/) behind the official SDK. It keeps no
// state (map 06): the HTTP route makes one server per request, and stdio one per process. Both read the committed
// data once.
import { join } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadData } from '~engine/data/load';
import { readDataDir } from '~engine/data/read-dir';
import { TOOLS } from '~engine/mcp/registry';
import { engineOf, type Engine } from '~engine/mcp/tools';

let engine: Engine | undefined;

/** The engine over the committed data, read on first use: `data/` beside the working directory, or `WOTR_DATA`. */
export function sharedEngine(): Engine {
  if (engine === undefined) {
    const dir = process.env.WOTR_DATA ?? join(process.cwd(), 'data');
    const files = readDataDir(dir);
    engine = engineOf(loadData(files.files, files.overrides));
  }
  return engine;
}

/** An MCP server that lists the tools and runs them; a tool's answer (a Refusal too) is its JSON. */
export function createMcpServer(e: Engine = sharedEngine()): Server {
  const server = new Server({ name: 'wotr-planner', version: '0.0.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = TOOLS.find((t) => t.name === request.params.name);
    if (tool === undefined) {
      return { isError: true, content: [{ type: 'text', text: `No tool named ${request.params.name}.` }] };
    }
    const result = await tool.run(e, request.params.arguments ?? {});
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });
  return server;
}
