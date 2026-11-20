// The MCP over stdio (map 08; build ticket 05), for agents that start the planner as a process:
//   bun scripts/mcp-stdio.ts      (run from the repo root, or set WOTR_DATA to the data directory)
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createMcpServer } from '../src/mcp/server';

await createMcpServer().connect(new StdioServerTransport());
