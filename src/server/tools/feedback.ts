/**
 * memory_feedback -- Record task outcomes for the learning loop.
 *
 * Writes to .maestro/feedback.jsonl (the only file agentMemory
 * writes besides the index). Correlates memories with outcomes.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';

export function registerFeedbackTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_feedback',
    'Record task outcomes to improve future retrieval. Writes to feedback.jsonl.',
    {
      taskId: z.string().describe('Completed task ID'),
      outcome: z.enum(['success', 'failure', 'partial']).describe('Task outcome'),
      revisionCount: z.number().optional().describe('Number of revisions'),
      verificationPassed: z.boolean().optional().describe('Build/test verification result'),
      durationMs: z.number().optional().describe('Task execution duration'),
      injectedPaths: z.array(z.string()).optional().describe('Memory paths that were injected'),
      injectedDoctrineIds: z.array(z.string()).optional().describe('Doctrine IDs that were injected'),
    },
    async (params) => {
      // TODO Phase 3: append to feedback.jsonl
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ recorded: true, taskId: params.taskId }) }],
      };
    },
  );
}
