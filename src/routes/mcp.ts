import type { APIHandler } from 'filesystem-routing/api';

import { handleMcpRequest } from '../mcp-server';

const handle: APIHandler = (event) => handleMcpRequest(event.request);

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
