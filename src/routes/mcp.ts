// The MCP over streamable HTTP at /mcp (map 08; build ticket 05), stateless: one server and one transport per
// request, answering in JSON. Served by `bun start` through the createAPIHandler middleware (src/middleware.ts).
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { APIHandler } from 'filesystem-routing/api';

import { createMcpServer } from '../mcp/server';

const handle: APIHandler = async (event) => {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createMcpServer();
  await server.connect(transport);
  try {
    return await transport.handleRequest(event.request);
  } finally {
    await server.close();
  }
};

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
