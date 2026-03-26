/**
 * agentMemory MCP Server
 *
 * Workflow-aware memory layer for agent-driven development.
 * Exposes 6 tools over stdio/SSE transport.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.ts';
import { createStore } from '../store/sqlite.ts';

const store = createStore();

const server = new McpServer({
  name: 'agent-memory',
  version: '0.1.0',
});

registerTools(server, store);

const transport = new StdioServerTransport();
await server.connect(transport);
