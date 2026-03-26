/**
 * agentMemory MCP Server
 *
 * Workflow-aware retrieval engine for maestro memory files.
 * Read-only against .maestro/ -- only writes its own index + feedback.
 *
 * Accepts MAESTRO_DIR env var or defaults to .maestro in cwd.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.ts';
import { createStore } from '../store/index-manager.ts';
import { join } from 'node:path';

const maestroDir = process.env.MAESTRO_DIR ?? join(process.cwd(), '.maestro');
const store = createStore(maestroDir);

const server = new McpServer({
  name: 'agent-memory',
  version: '0.1.0',
});

registerTools(server, store);

const transport = new StdioServerTransport();
await server.connect(transport);
