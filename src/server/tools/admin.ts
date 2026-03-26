/**
 * memory_admin -- Index maintenance and observability.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';
import { rebuildIndex, syncIndex } from '../../store/index-manager.ts';
import { existsSync, statSync } from 'node:fs';

export function registerAdminTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_admin',
    'Memory index administration: stats, reindex, health check.',
    {
      action: z.enum(['stats', 'reindex', 'sync', 'health']).describe('Admin operation'),
    },
    async (params) => {
      if (params.action === 'health') {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            status: 'ok',
            version: '0.1.0',
            maestroDir: store.maestroDir,
            maestroDirExists: existsSync(store.maestroDir),
            indexEntries: Object.keys(store.index.entries).length,
            indexBuiltAt: store.index.builtAt || 'never',
          }) }],
        };
      }

      if (params.action === 'stats') {
        const entries = Object.values(store.index.entries);
        const withEmbeddings = entries.filter(e => e.embedding !== null).length;
        const totalTokens = entries.reduce((sum, e) => sum + e.tokenCount, 0);
        let indexSizeBytes = 0;
        try {
          indexSizeBytes = statSync(store.indexPath).size;
        } catch { /* ignore */ }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            totalEntries: entries.length,
            totalTokens,
            withEmbeddings,
            embeddingCoverage: entries.length > 0 ? Math.round(withEmbeddings / entries.length * 100) + '%' : 'n/a',
            indexSizeBytes,
            builtAt: store.index.builtAt,
          }) }],
        };
      }

      if (params.action === 'reindex') {
        const start = Date.now();
        const count = await rebuildIndex(store, store.embedProvider);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            action: 'reindex',
            indexed: count,
            durationMs: Date.now() - start,
          }) }],
        };
      }

      if (params.action === 'sync') {
        const start = Date.now();
        const updated = await syncIndex(store, store.embedProvider);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            action: 'sync',
            updated,
            totalEntries: Object.keys(store.index.entries).length,
            durationMs: Date.now() - start,
          }) }],
        };
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'unknown action' }) }] };
    },
  );
}
