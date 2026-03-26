/**
 * memory_graph -- Task dependency registration and memory connections.
 *
 * Registers task DAG so the dependency graph walk signal works.
 * Also manages memory-to-memory connections (supersedes, extends, contradicts).
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/sqlite.ts';

export function registerGraphTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_graph',
    'Register task dependencies and memory connections for graph-aware retrieval.',
    {
      action: z.enum(['register_deps', 'connect', 'disconnect', 'traverse']).describe('Graph operation'),
      taskId: z.string().optional().describe('Task ID (for register_deps)'),
      dependsOn: z.array(z.string()).optional().describe('Upstream task IDs'),
      sourceId: z.string().optional().describe('Source memory ID (for connect/disconnect)'),
      targetId: z.string().optional().describe('Target memory ID'),
      relation: z.enum(['supersedes', 'extends', 'related', 'contradicts']).optional(),
      fromId: z.string().optional().describe('Start node for traversal'),
      maxDepth: z.number().optional().describe('Max traversal depth (default 3)'),
    },
    async (params) => {
      // TODO: Phase 2 implementation
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ action: params.action, success: true }) }],
      };
    },
  );
}
