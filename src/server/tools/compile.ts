/**
 * memory_compile -- Budget-aware context assembly.
 *
 * Replaces maestro DCP's selectMemories(). Returns token-budgeted,
 * MMR-diverse memory selection with workflow scoring.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/sqlite.ts';

export function registerCompileTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_compile',
    'Assemble workflow-scored memories within a token budget. Uses MMR for diversity. Designed for agent brief injection.',
    {
      taskId: z.string().describe('Task to compile context for'),
      stage: z.enum(['discovery', 'research', 'planning', 'execution', 'review']).optional(),
      feature: z.string().optional(),
      project: z.string().optional(),
      budgetTokens: z.number().optional().describe('Token budget (default 1024)'),
      includeDoctrineCorrelation: z.boolean().optional().describe('Factor in doctrine effectiveness'),
    },
    async (params) => {
      // TODO: Phase 2 implementation
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ memories: [], budget: { used: 0, limit: params.budgetTokens ?? 1024 } }) }],
      };
    },
  );
}
