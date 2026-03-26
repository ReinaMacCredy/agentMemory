/**
 * memory_query -- Workflow-aware hybrid search.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';
import { STAGES, CATEGORIES } from '../../store/types.ts';
import { syncIndex } from '../../store/index-manager.ts';
import { keywordSearch } from '../../retrieval/keyword.ts';
import { mergeSignals, type RetrievalSignal } from '../../retrieval/hybrid.ts';
import { semanticSearch } from '../../retrieval/semantic.ts';
import { buildStageSignals, buildFeedbackSignals } from '../../retrieval/signals.ts';

export function registerQueryTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_query',
    'Search memories with workflow-aware hybrid retrieval.',
    {
      query: z.string().describe('Search query text'),
      taskId: z.string().optional().describe('Current task ID'),
      stage: z.enum(STAGES).optional(),
      feature: z.string().optional().describe('Feature scope'),
      category: z.enum(CATEGORIES).optional(),
      limit: z.number().optional().describe('Max results (default 20)'),
    },
    async (params) => {
      await syncIndex(store, store.embedProvider);

      const allSignals: RetrievalSignal[][] = [];

      // Keyword search
      allSignals.push(keywordSearch(params.query, store.index, store.idfMap));

      // Semantic search (when embeddings available)
      if (store.embedProvider) {
        try {
          const queryVec = await store.embedProvider.embed(params.query);
          allSignals.push(semanticSearch(Array.from(queryVec), store.index));
        } catch { /* graceful fallback */ }
      }

      // Collect all candidates
      const candidateIds = new Set<string>();
      for (const signals of allSignals) for (const s of signals) candidateIds.add(s.memoryId);

      // Workflow signals
      if (params.stage) allSignals.push(buildStageSignals(candidateIds, store, params.stage));
      const fb = buildFeedbackSignals(candidateIds, store);
      if (fb.length > 0) allSignals.push(fb);

      // Merge and filter BEFORE slicing
      const merged = mergeSignals(allSignals);
      const filtered = merged.filter(r => {
        const entry = store.index.entries[r.memoryId];
        if (!entry) return false;
        if (params.feature && entry.metadata.feature !== params.feature) return false;
        if (params.category && entry.metadata.category !== params.category) return false;
        return true;
      });

      const limit = params.limit ?? 20;
      const results = filtered.slice(0, limit).map(r => {
        const entry = store.index.entries[r.memoryId]!;
        return {
          path: r.memoryId,
          name: r.memoryId.split('/').pop()?.replace('.md', '') ?? r.memoryId,
          score: Math.round(r.totalScore * 1000) / 1000,
          signals: r.signals,
          snippet: entry.snippet,
          feature: entry.metadata.feature,
          category: entry.metadata.category,
          stage: entry.metadata.stage,
        };
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ results, total: results.length }) }],
      };
    },
  );
}
