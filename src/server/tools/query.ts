/**
 * memory_query -- Workflow-aware hybrid search.
 *
 * Searches the sidecar index using keyword + workflow signals.
 * Semantic signal added in Phase 3.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';
import { syncIndex } from '../../store/index-manager.ts';
import { readMemoryFile } from '../../store/scanner.ts';

export function registerQueryTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_query',
    'Search memories with workflow-aware hybrid retrieval. Combines semantic, keyword, pipeline stage, dependency graph, and execution feedback signals.',
    {
      query: z.string().describe('Search query text'),
      taskId: z.string().optional().describe('Current task ID (activates dependency graph signal)'),
      stage: z.enum(['discovery', 'research', 'planning', 'execution', 'review']).optional().describe('Current pipeline stage'),
      feature: z.string().optional().describe('Feature scope'),
      category: z.enum(['decision', 'research', 'architecture', 'convention', 'debug', 'execution']).optional(),
      limit: z.number().optional().describe('Max results (default 20)'),
    },
    async (params) => {
      // Auto-sync index (fast if nothing changed)
      await syncIndex(store);

      // TODO Phase 2: full keyword scoring + workflow signals
      // For now: return index entry count
      const entryCount = Object.keys(store.index.entries).length;
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ results: [], entryCount, query: params.query }) }],
      };
    },
  );
}
