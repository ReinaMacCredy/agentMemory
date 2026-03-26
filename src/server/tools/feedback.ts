/**
 * memory_feedback -- Record task outcomes for the learning loop.
 *
 * Correlates injected memories with task success/failure.
 * This is the signal that makes the system learn.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/sqlite.ts';

export function registerFeedbackTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_feedback',
    'Record task outcomes to improve future retrieval. Correlates selected memories with success/failure.',
    {
      taskId: z.string().describe('Completed task ID'),
      outcome: z.enum(['success', 'failure', 'partial']).describe('Task outcome'),
      revisionCount: z.number().optional().describe('Number of revisions (negative signal)'),
      verificationPassed: z.boolean().optional().describe('Build/test verification result'),
      durationMs: z.number().optional().describe('Task execution duration'),
      injectedMemoryIds: z.array(z.string()).optional().describe('Memory IDs that were injected for this task'),
      injectedDoctrineIds: z.array(z.string()).optional().describe('Doctrine IDs that were injected'),
    },
    async (params) => {
      // TODO: Phase 2 implementation
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ recorded: true, taskId: params.taskId }) }],
      };
    },
  );
}
