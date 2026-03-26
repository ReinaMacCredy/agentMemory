/**
 * memory_compile -- Budget-aware context assembly.
 *
 * Runs hybrid retrieval, applies MMR diversity, reads .md bodies,
 * formats as markdown sections within token budget.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Store } from '../../store/types.ts';
import { syncIndex } from '../../store/index-manager.ts';
import { readMemoryFile } from '../../store/scanner.ts';
import { keywordSearch } from '../../retrieval/keyword.ts';
import { semanticSearch } from '../../retrieval/semantic.ts';
import { mergeSignals, type RetrievalSignal } from '../../retrieval/hybrid.ts';
import { selectWithMmr, type MmrResult } from '../../retrieval/mmr.ts';
import { scoreStageProximity } from '../../workflow/stage.ts';
import { scoreMemoryEffectiveness } from '../../workflow/feedback.ts';

export function registerCompileTool(server: McpServer, store: Store): void {
  server.tool(
    'memory_compile',
    'Assemble workflow-scored memories within a token budget for agent brief injection.',
    {
      taskId: z.string().describe('Task to compile context for'),
      stage: z.enum(['discovery', 'research', 'planning', 'execution', 'review']).optional(),
      feature: z.string().optional(),
      budgetTokens: z.number().optional().describe('Token budget (default 1024)'),
    },
    async (params) => {
      await syncIndex(store);

      const budget = params.budgetTokens ?? 1024;
      const allSignals: RetrievalSignal[][] = [];

      // Use taskId as query text for keyword search
      const queryText = params.taskId.replace(/[-_]/g, ' ');
      const kwSignals = keywordSearch(queryText, store.index);
      allSignals.push(kwSignals);

      // Collect all candidates
      const candidateIds = new Set(kwSignals.map(s => s.memoryId));

      // Also include all entries for feature if specified (ensures we don't miss relevant ones)
      if (params.feature) {
        for (const relPath of Object.keys(store.index.entries)) {
          if (relPath.includes(`features/${params.feature}/`)) {
            candidateIds.add(relPath);
          }
        }
      }

      // Stage scoring
      if (params.stage) {
        const stageSignals: RetrievalSignal[] = [];
        for (const relPath of candidateIds) {
          const entry = store.index.entries[relPath];
          if (!entry) continue;
          stageSignals.push({
            memoryId: relPath,
            score: scoreStageProximity(entry.metadata.stage, params.stage),
            source: 'pipelineStage',
          });
        }
        allSignals.push(stageSignals);
      }

      // Feedback scoring
      const feedbackSignals: RetrievalSignal[] = [];
      for (const relPath of candidateIds) {
        const eff = scoreMemoryEffectiveness(store, relPath);
        if (eff !== 0) {
          feedbackSignals.push({ memoryId: relPath, score: (eff + 1) / 2, source: 'execFeedback' });
        }
      }
      if (feedbackSignals.length > 0) allSignals.push(feedbackSignals);

      // Merge
      const merged = mergeSignals(allSignals);

      // Convert to MmrResult with token counts
      const mmrCandidates: MmrResult[] = merged.map(r => {
        const entry = store.index.entries[r.memoryId];
        return { ...r, tokenCount: entry?.tokenCount ?? 100 };
      });

      // Select with MMR + budget
      const selected = selectWithMmr(mmrCandidates, budget);

      // Read bodies and format
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

      // Format as markdown
      const compiled = memories
        .map(m => `## ${m.name}\n\n${m.body}`)
        .join('\n\n---\n\n');

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
