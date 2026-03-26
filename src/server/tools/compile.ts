/**
 * memory_compile -- Budget-aware context assembly for agent brief injection.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';
import { STAGES } from '../../store/types.ts';
import { syncIndex } from '../../store/index-manager.ts';
import { readMemoryFile } from '../../store/scanner.ts';
import { keywordSearch } from '../../retrieval/keyword.ts';
import { mergeSignals, type RetrievalSignal } from '../../retrieval/hybrid.ts';
import { selectWithMmr, type MmrResult } from '../../retrieval/mmr.ts';
import { buildStageSignals, buildFeedbackSignals } from '../../retrieval/signals.ts';

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
      await syncIndex(store, store.embedProvider);

      const budget = params.budgetTokens ?? 1024;
      const allSignals: RetrievalSignal[][] = [];

      const queryText = params.taskId.replace(/[-_]/g, ' ');
      allSignals.push(keywordSearch(queryText, store.index, store.idfMap));

      // Collect all candidates (keyword matches + feature scope)
      const candidateIds = new Set<string>();
      for (const signals of allSignals) for (const s of signals) candidateIds.add(s.memoryId);
      if (params.feature) {
        for (const relPath of Object.keys(store.index.entries)) {
          if (relPath.includes(`features/${params.feature}/`)) candidateIds.add(relPath);
        }
      }

      // Workflow signals (shared with query tool)
      if (params.stage) allSignals.push(buildStageSignals(candidateIds, store, params.stage));
      const fb = buildFeedbackSignals(candidateIds, store);
      if (fb.length > 0) allSignals.push(fb);

      const merged = mergeSignals(allSignals);
      const mmrCandidates: MmrResult[] = merged.map(r => ({
        ...r,
        tokenCount: store.index.entries[r.memoryId]?.tokenCount ?? 100,
      }));
      const selected = selectWithMmr(mmrCandidates, budget);

      // Read full bodies for selected memories only
      const memories: Array<{ path: string; name: string; body: string; score: number }> = [];
      let usedTokens = 0;
      for (const sel of selected) {
        const mem = readMemoryFile(store.maestroDir, sel.memoryId);
        if (!mem) continue;
        memories.push({
          path: sel.memoryId,
          name: sel.memoryId.split('/').pop()?.replace('.md', '') ?? sel.memoryId,
          body: mem.body,
          score: Math.round(sel.totalScore * 1000) / 1000,
        });
        usedTokens += sel.tokenCount;
      }

      const compiled = memories.map(m => `## ${m.name}\n\n${m.body}`).join('\n\n---\n\n');

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({
          memories: memories.map(m => ({ path: m.path, name: m.name, score: m.score })),
          compiled,
          budget: { used: usedTokens, limit: budget },
        }) }],
      };
    },
  );
}
