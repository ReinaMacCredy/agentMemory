/**
 * memory_store -- CRUD operations for memories.
 *
 * Actions: write, update, delete
 * Accepts stage, taskId, feature alongside content for workflow enrichment.
 * Auto-embeds on write.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/sqlite.ts';

export function registerStoreTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_store',
    'Write, update, or delete workflow memories. Auto-embeds on write.',
    {
      action: z.enum(['write', 'update', 'delete']).describe('Operation to perform'),
      content: z.string().optional().describe('Memory content (required for write/update)'),
      name: z.string().optional().describe('Memory name/identifier'),
      tags: z.array(z.string()).optional().describe('Tags for retrieval'),
      category: z.enum(['decision', 'research', 'architecture', 'convention', 'debug', 'execution']).optional(),
      stage: z.enum(['discovery', 'research', 'planning', 'execution', 'review']).optional().describe('Pipeline stage'),
      taskId: z.string().optional().describe('Associated task ID'),
      feature: z.string().optional().describe('Associated feature name'),
      project: z.string().optional().describe('Project identifier'),
      id: z.string().optional().describe('Memory ID (required for update/delete)'),
    },
    async (params) => {
      // TODO: Phase 1 implementation
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, action: params.action }) }],
      };
    },
  );
}
