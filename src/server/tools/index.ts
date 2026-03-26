/**
 * Tool registration -- wires all 6 MCP tools to the server.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/sqlite.ts';
import { registerStoreTool } from './store.ts';
import { registerQueryTool } from './query.ts';
import { registerCompileTool } from './compile.ts';
import { registerFeedbackTool } from './feedback.ts';
import { registerGraphTool } from './graph.ts';
import { registerAdminTool } from './admin.ts';

export function registerTools(server: McpServer, store: Store): void {
  registerStoreTool(server, store);
  registerQueryTool(server, store);
  registerCompileTool(server, store);
  registerFeedbackTool(server, store);
  registerGraphTool(server, store);
  registerAdminTool(server, store);
}
