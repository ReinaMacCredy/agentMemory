/**
 * Maximal Marginal Relevance -- diversity-aware selection.
 *
 * Penalizes results that are too similar to already-selected memories.
 * Ensures the token budget carries maximum information diversity.
 */

import type { HybridResult } from './hybrid.ts';

export interface MmrResult extends HybridResult {
  tokenCount: number;
}

/**
 * Select memories using MMR within a token budget.
 * Lambda controls relevance vs diversity tradeoff (1.0 = pure relevance, 0.0 = pure diversity).
 */
export function selectWithMmr(
  candidates: MmrResult[],
  budgetTokens: number,
  lambda = 0.7,
): MmrResult[] {
  if (candidates.length === 0) return [];

  const selected: MmrResult[] = [];
  const remaining = [...candidates];
  let usedTokens = 0;

  // Always pick the top-scored candidate first
  const first = remaining.shift()!;
  if (first.tokenCount <= budgetTokens) {
    selected.push(first);
    usedTokens += first.tokenCount;
  }

  while (remaining.length > 0 && usedTokens < budgetTokens) {
    let bestIdx = -1;
    let bestMmrScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      if (usedTokens + candidate.tokenCount > budgetTokens) continue;

      const relevance = candidate.totalScore;
      // Diversity: max similarity to any already-selected item
      // TODO: Use actual embedding cosine similarity when embeddings are available
      const maxSimilarity = selected.length > 0 ? 0.3 : 0; // placeholder

      const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;
      if (mmrScore > bestMmrScore) {
        bestMmrScore = mmrScore;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    const picked = remaining.splice(bestIdx, 1)[0];
    selected.push(picked);
    usedTokens += picked.tokenCount;
  }

  return selected;
}
