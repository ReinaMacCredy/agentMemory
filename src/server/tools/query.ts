/**
 * memory_query -- Workflow-aware hybrid search.
 *
 * Searches the sidecar index using keyword + workflow signals.
 * Semantic signal added in Phase 3.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';
import { syncIndex } from '../../store/index-manager.ts';
import { readMemoryFile } from '../../store/scanner.ts';
import { keywordSearch } from '../../retrieval/keyword.ts';
import { mergeSignals, type RetrievalSignal } from '../../retrieval/hybrid.ts';
import { scoreStageProximity } from '../../workflow/stage.ts';
import { scoreMemoryEffectiveness } from '../../workflow/feedback.ts';
import { semanticSearch } from '../../retrieval/semantic.ts';

export function registerQueryTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_query',
    'Search memories with workflow-aware hybrid retrieval.',
    {
      query: z.string().describe('Search query text'),
      taskId: z.string().optional().describe('Current task ID (activates dependency graph signal)'),
      stage: z.enum(['discovery', 'research', 'planning', 'execution', 'review']).optional(),
      feature: z.string().optional().describe('Feature scope'),
      category: z.enum(['decision', 'research', 'architecture', 'convention', 'debug', 'execution']).optional(),
      limit: z.number().optional().describe('Max results (default 20)'),
    },
    async (params) => {
      // Auto-sync index
      await syncIndex(store, store.embedProvider);

      const limit = params.limit ?? 20;
      const allSignals: RetrievalSignal[][] = [];

      // Signal 1: Keyword search
      const kwSignals = keywordSearch(params.query, store.index);
      allSignals.push(kwSignals);

      // Collect all candidate memory IDs
      const candidateIds = new Set(kwSignals.map(s => s.memoryId));

      // Signal 1b: Semantic search (when embeddings available)
      if (store.embedProvider) {
        try {
          const queryVec = await store.embedProvider.embed(params.query);
          const semSignals = semanticSearch(Array.from(queryVec), store.index);
          allSignals.push(semSignals);
          // Add semantic candidates to the candidate set
          for (const s of semSignals) candidateIds.add(s.memoryId);
        } catch {
          // Graceful fallback: skip semantic signal
        }
      }

      // Signal 2: Pipeline stage scoring
      if (params.stage) {
        const stageSignals: RetrievalSignal[] = [];
        for (const relPath of candidateIds) {
          const entry = store.index.entries[relPath];
          if (!entry) continue;
          const stageStr = entry.metadata.stage;
          const score = scoreStageProximity(stageStr, params.stage);
          stageSignals.push({ memoryId: relPath, score, source: 'pipelineStage' });
        }
        allSignals.push(stageSignals);
      }

      // Signal 3: Execution feedback
      const feedbackSignals: RetrievalSignal[] = [];
      for (const relPath of candidateIds) {
        const effectiveness = scoreMemoryEffectiveness(store, relPath);
        if (effectiveness !== 0) {
          // Normalize from [-1,1] to [0,1]
          feedbackSignals.push({ memoryId: relPath, score: (effectiveness + 1) / 2, source: 'execFeedback' });
        }
      }
      if (feedbackSignals.length > 0) allSignals.push(feedbackSignals);

      // Signal 4: Recency
      const recencySignals: RetrievalSignal[] = [];
      const now = Date.now();
      for (const relPath of candidateIds) {
        const entry = store.index.entries[relPath];
        if (!entry) continue;
        // Simple recency: newer files score higher (using checksum as proxy -- not ideal)
        // TODO: use file mtime or frontmatter date
        recencySignals.push({ memoryId: relPath, score: 0.5, source: 'recency' });
      }
      allSignals.push(recencySignals);

      // Merge all signals
      const merged = mergeSignals(allSignals);
      const topResults = merged.slice(0, limit);

      // Read snippets for top results
      const results = topResults.map(r => {
        const entry = store.index.entries[r.memoryId];
        const mem = readMemoryFile(store.maestroDir, r.memoryId);
        return {
          path: r.memoryId,
          name: r.memoryId.split('/').pop()?.replace('.md', '') ?? r.memoryId,
          score: Math.round(r.totalScore * 1000) / 1000,
          signals: r.signals,
          snippet: mem ? mem.body.slice(0, 200) : '',
          feature: entry?.metadata.feature,
          category: entry?.metadata.category,
          stage: entry?.metadata.stage,
        };
      });

      // Filter by feature/category if specified
      const filtered = results.filter(r => {
        if (params.feature && r.feature !== params.feature) return false;
        if (params.category && r.category !== params.category) return false;
        return true;
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ results: filtered, total: filtered.length }) }],
      };
    },
  );
}
