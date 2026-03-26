/**
 * memory_query -- Workflow-aware hybrid search.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';
import { STAGES, CATEGORIES } from '../../store/types.ts';
import { queryMemories } from '../../retrieval/engine.ts';

export function registerQueryTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_query',
    'Search memories with workflow-aware hybrid retrieval.',
    {
      query: z.string().describe('Search query text'),
      taskId: z.string().optional(),
      stage: z.enum(STAGES).optional(),
      feature: z.string().optional(),
      category: z.enum(CATEGORIES).optional(),
      limit: z.number().optional().describe('Max results (default 20)'),
    },
    async (params) => {
      const results = await queryMemories(store, params.query, {
        stage: params.stage,
        feature: params.feature,
        category: params.category,
        limit: params.limit,
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ results, total: results.length }) }],
      };
    },
  );
}
