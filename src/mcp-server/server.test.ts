import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';

import { createMcpServer } from './server';

describe('the MCP server', () => {
  it('lists the 14 tools and answers a call with the tool’s JSON', async () => {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await createMcpServer().connect(serverSide);
    const client = new Client({ name: 'test', version: '0' });
    await client.connect(clientSide);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual([
      'start_build',
      'set_start',
      'level_up',
      'next_slots',
      'options',
      'pick',
      'set_skills',
      'place_rank',
      'equip',
      'synergies',
      'search',
      'explain',
      'sheet',
      'compare',
    ]);
    const result = await client.callTool({ name: 'start_build', arguments: {} });
    const [content] = result.content as { type: string; text: string }[];
    expect(JSON.parse(content?.text ?? '{}')).toMatchObject({ build: { levels: [], picks: [] } });
    await client.close();
  }, 60_000);
});
