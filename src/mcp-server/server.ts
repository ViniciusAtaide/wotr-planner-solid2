import { join } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadData } from '~engine/load';
import { readDataDir } from '~engine/data-dir';
import { TOOLS, engineOf, type Engine } from '~engine/mcp';

let engine: Engine | undefined;

export function sharedEngine(): Engine {
  if (engine === undefined) {
    const dir = process.env.WOTR_DATA ?? join(process.cwd(), 'data');
    const files = readDataDir(dir);
    engine = engineOf(loadData(files.files, files.overrides));
  }
  return engine;
}

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
