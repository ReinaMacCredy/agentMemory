/**
 * memory_feedback -- Record task outcomes for the learning loop.
 *
 * Appends to .maestro/feedback.jsonl.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';
import { recordFeedback } from '../../workflow/feedback.ts';

export function registerFeedbackTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_feedback',
    'Record task outcomes to improve future memory retrieval.',
    {
      taskId: z.string().describe('Completed task ID'),
      outcome: z.enum(['success', 'failure', 'partial']).describe('Task outcome'),
      revisionCount: z.number().optional(),
      verificationPassed: z.boolean().optional(),
      durationMs: z.number().optional(),
      injectedPaths: z.array(z.string()).optional().describe('Memory paths that were injected'),
      injectedDoctrineIds: z.array(z.string()).optional(),
    },
    async (params) => {
      recordFeedback(store, {
        taskId: params.taskId,
        outcome: params.outcome,
        revisionCount: params.revisionCount,
        verificationPassed: params.verificationPassed,
        durationMs: params.durationMs,
        injectedPaths: params.injectedPaths,
        injectedDoctrineIds: params.injectedDoctrineIds,
        recordedAt: new Date().toISOString(),
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({
          recorded: true,
          taskId: params.taskId,
          outcome: params.outcome,
        }) }],
      };
    },
  );
}
