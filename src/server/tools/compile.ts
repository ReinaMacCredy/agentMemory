/**
 * memory_compile -- Budget-aware context assembly.
 *
 * Runs hybrid retrieval, applies MMR diversity, returns
 * token-budgeted memory selection for agent brief injection.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';

export function registerCompileTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_compile',
    'Assemble workflow-scored memories within a token budget. Uses MMR for diversity.',
    {
      taskId: z.string().describe('Task to compile context for'),
      stage: z.enum(['discovery', 'research', 'planning', 'execution', 'review']).optional(),
      feature: z.string().optional(),
      budgetTokens: z.number().optional().describe('Token budget (default 1024)'),
    },
    async (params) => {
      // TODO Phase 3: full hybrid query + MMR + budget assembly
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ memories: [], budget: { used: 0, limit: params.budgetTokens ?? 1024 } }) }],
      };
    },
  );
}
