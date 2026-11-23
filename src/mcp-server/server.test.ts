import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { loadData } from '~engine/load';
import { readDataDir } from '~engine/data-dir';
import { INSTRUCTIONS, engineOf } from '~engine/mcp';
import { createMcpServer } from './server';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
const engine = engineOf(loadData(files.files, files.overrides));

describe('the MCP server', { timeout: 30_000 }, () => {
  it('gives the workflow as its instructions when a client initializes, and lists the tools', async () => {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer(engine);
    await server.connect(serverSide);
    const client = new Client({ name: 'test', version: '0' });
    await client.connect(clientSide);
    expect(client.getInstructions()).toBe(INSTRUCTIONS);
    expect(INSTRUCTIONS).toContain('start_build');
    expect(INSTRUCTIONS).toContain('/#b=<code>');
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).not.toContain('compare');
    expect(tools.map((t) => t.name)).toContain('sheet');
    expect(tools.find((t) => t.name === 'pick')?.description).toContain('preview lists what a Cascade would clear');
    await client.close();
    await server.close();
  });
});
