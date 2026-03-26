/**
 * Tool registration -- wires 5 MCP tools to the server.
 * No store/write tool -- maestro owns all memory writes.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';
import { registerQueryTool } from './query.ts';
import { registerCompileTool } from './compile.ts';
import { registerFeedbackTool } from './feedback.ts';
import { registerGraphTool } from './graph.ts';
import { registerAdminTool } from './admin.ts';

export function registerTools(server: McpServer, store: Store): void {
  registerQueryTool(server, store);
  registerCompileTool(server, store);
  registerFeedbackTool(server, store);
  registerGraphTool(server, store);
  registerAdminTool(server, store);
}
