/**
 * memory_compile -- Budget-aware context assembly for agent brief injection.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';
import { STAGES } from '../../store/types.ts';
import { compileMemories } from '../../retrieval/engine.ts';

export function registerCompileTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_compile',
    'Assemble workflow-scored memories within a token budget for agent brief injection.',
    {
      taskId: z.string().describe('Task to compile context for'),
      stage: z.enum(STAGES).optional(),
      feature: z.string().optional(),
      budgetTokens: z.number().optional().describe('Token budget (default 1024)'),
    },
    async (params) => {
      const result = await compileMemories(store, params.taskId, {
        stage: params.stage,
        feature: params.feature,
        budgetTokens: params.budgetTokens,
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({
          memories: result.sections.map(s => ({ path: s.path, name: s.name, score: s.score })),
          compiled: result.compiled,
          budget: { used: result.tokensUsed, limit: params.budgetTokens ?? 1024 },
        }) }],
      };
    },
  );
}
