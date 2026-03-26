/**
 * memory_query -- Workflow-aware semantic search.
 *
 * Pass taskId + stage to activate pipeline/graph signals.
 * Falls back to pure semantic without workflow context.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/sqlite.ts';

export function registerQueryTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_query',
    'Search memories with workflow-aware hybrid retrieval. Combines semantic, keyword, pipeline stage, dependency graph, and execution feedback signals.',
    {
      query: z.string().describe('Search query text'),
      taskId: z.string().optional().describe('Current task ID (activates dependency graph signal)'),
      stage: z.enum(['discovery', 'research', 'planning', 'execution', 'review']).optional().describe('Current pipeline stage (activates stage filter)'),
      feature: z.string().optional().describe('Feature scope'),
      project: z.string().optional().describe('Project scope'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      category: z.enum(['decision', 'research', 'architecture', 'convention', 'debug', 'execution']).optional(),
      limit: z.number().optional().describe('Max results (default 20)'),
    },
    async (params) => {
      // TODO: Phase 1 -- semantic + keyword retrieval
      // TODO: Phase 2 -- add workflow signals
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ results: [], query: params.query }) }],
      };
    },
  );
}
