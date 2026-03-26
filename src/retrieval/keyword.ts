/**
 * BM25-style keyword scoring from the sidecar index.
 *
 * Approximates BM25 using pre-extracted keyword arrays:
 * - TF: term appears in entry's keywords (binary for now -- present or not)
 * - IDF: log(N / df) where df = number of entries containing the term
 */

import type { RetrievalSignal } from './hybrid.ts';
import type { SidecarIndex } from '../store/types.ts';

/**
 * Score a single entry against query tokens.
 * Returns 0.0-1.0 normalized score.
 */
export function scoreKeywordMatch(
  queryTokens: string[],
  entryKeywords: string[],
  totalEntries: number,
  idfMap: Map<string, number>,
): number {
  if (queryTokens.length === 0 || entryKeywords.length === 0) return 0;

  const entrySet = new Set(entryKeywords);
  let score = 0;

  for (const token of queryTokens) {
    if (entrySet.has(token)) {
      score += idfMap.get(token) ?? 1;
    }
  }

  // Normalize by max possible score (all query tokens matching with max IDF)
  const maxScore = queryTokens.reduce((sum, t) => sum + (idfMap.get(t) ?? 1), 0);
  return maxScore > 0 ? Math.min(1, score / maxScore) : 0;
}

/**
 * Build IDF map from the index: log(N / df) for each keyword.
 */
export function buildIdfMap(index: SidecarIndex): Map<string, number> {
  const totalEntries = Object.keys(index.entries).length;
  if (totalEntries === 0) return new Map();

  const docFreq = new Map<string, number>();

  for (const entry of Object.values(index.entries)) {
    const seen = new Set<string>();
    for (const kw of entry.keywords) {
      if (!seen.has(kw)) {
        docFreq.set(kw, (docFreq.get(kw) ?? 0) + 1);
        seen.add(kw);
      }
    }
  }

  const idfMap = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idfMap.set(term, Math.log(totalEntries / df));
  }

  return idfMap;
}

/**
 * Score all index entries against a query, return as retrieval signals.
 */
export function keywordSearch(
  queryText: string,
  index: SidecarIndex,
  cachedIdfMap?: Map<string, number>,
): RetrievalSignal[] {
  const queryTokens = queryText
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3);

  if (queryTokens.length === 0) return [];

  const totalEntries = Object.keys(index.entries).length;
  const idfMap = cachedIdfMap ?? buildIdfMap(index);
  const signals: RetrievalSignal[] = [];

  for (const [relPath, entry] of Object.entries(index.entries)) {
    const score = scoreKeywordMatch(queryTokens, entry.keywords, totalEntries, idfMap);
    if (score > 0) {
      signals.push({ memoryId: relPath, score, source: 'keyword' });
    }
  }

  return signals.sort((a, b) => b.score - a.score);
}
