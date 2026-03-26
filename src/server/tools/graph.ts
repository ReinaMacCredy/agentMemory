/**
 * memory_graph -- Read-only task dependency traversal.
 *
 * Reads maestro's task structure for the dependency graph signal.
 * Returns upstream memory paths with proximity scores.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';

export function registerGraphTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_graph',
    'Traverse task dependencies to find upstream memories with proximity scores.',
    {
      taskId: z.string().describe('Task ID to traverse from'),
      feature: z.string().optional().describe('Feature scope'),
      maxDepth: z.number().optional().describe('Max traversal depth (default 3)'),
    },
    async (params) => {
      // TODO Phase 3: BFS walk maestro's task deps
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ taskId: params.taskId, upstream: [] }) }],
      };
    },
  );
}
