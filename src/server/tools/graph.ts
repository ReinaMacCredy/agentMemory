/**
 * memory_graph -- Read-only task dependency traversal.
 *
 * Reads maestro's task structure, returns upstream task memories
 * with BFS proximity scores.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';
import { walkDependencyGraph } from '../../workflow/graph.ts';

export function registerGraphTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_graph',
    'Traverse task dependencies to find upstream memories with proximity scores.',
    {
      taskId: z.string().describe('Task ID to traverse from'),
      feature: z.string().describe('Feature name'),
      maxDepth: z.number().optional().describe('Max traversal depth (default 3)'),
    },
    async (params) => {
      const scores = walkDependencyGraph(
        store.maestroDir,
        params.feature,
        params.taskId,
        params.maxDepth ?? 3,
      );

      // Find memories associated with upstream tasks
      const upstream: Array<{ taskId: string; proximity: number; memories: string[] }> = [];

      for (const [depTaskId, proximity] of scores) {
        // Find memories that reference this task ID
        const memories: string[] = [];
        for (const [relPath, entry] of Object.entries(store.index.entries)) {
          if (entry.metadata.taskId === depTaskId) {
            memories.push(relPath);
          }
          // Also match by filename containing the task ID
          if (relPath.includes(depTaskId)) {
            if (!memories.includes(relPath)) memories.push(relPath);
          }
        }
        upstream.push({ taskId: depTaskId, proximity, memories });
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({
          taskId: params.taskId,
          feature: params.feature,
          upstream,
        }) }],
      };
    },
  );
}
