/**
 * memory_admin -- Index maintenance and observability.
 *
 * Reindex, stats, health check.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';
import { rebuildIndex } from '../../store/index-manager.ts';

export function registerAdminTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_admin',
    'Memory index administration: stats, reindex, health check.',
    {
      action: z.enum(['stats', 'reindex', 'health']).describe('Admin operation'),
    },
    async (params) => {
      if (params.action === 'health') {
        const { existsSync } = await import('node:fs');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            status: 'ok',
            version: '0.1.0',
            maestroDir: store.maestroDir,
            maestroDirExists: existsSync(store.maestroDir),
            indexEntries: Object.keys(store.index.entries).length,
          }) }],
        };
      }

      if (params.action === 'stats') {
        const entries = Object.values(store.index.entries);
        const withEmbeddings = entries.filter(e => e.embedding !== null).length;
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            totalEntries: entries.length,
            withEmbeddings,
            embeddingCoverage: entries.length > 0 ? Math.round(withEmbeddings / entries.length * 100) + '%' : 'n/a',
            builtAt: store.index.builtAt,
          }) }],
        };
      }

      if (params.action === 'reindex') {
        const start = Date.now();
        const count = await rebuildIndex(store);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            reindexed: count,
            durationMs: Date.now() - start,
          }) }],
        };
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'unknown action' }) }] };
    },
  );
}
