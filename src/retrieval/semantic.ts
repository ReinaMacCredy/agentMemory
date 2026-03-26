/**
 * Cosine similarity scoring for semantic retrieval.
 *
 * Uses pre-computed embeddings from the sidecar index.
 */

import type { RetrievalSignal } from './hybrid.ts';
import type { SidecarIndex } from '../store/types.ts';

/**
 * Cosine similarity between two vectors.
 * Returns -1.0 to 1.0.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Score all index entries against a query embedding.
 * Returns sorted RetrievalSignal array.
 */
export function semanticSearch(
  queryEmbedding: number[],
  index: SidecarIndex,
): RetrievalSignal[] {
  const signals: RetrievalSignal[] = [];

  for (const [relPath, entry] of Object.entries(index.entries)) {
    if (!entry.embedding) continue;

    const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
    // Normalize from [-1,1] to [0,1]
    const score = (similarity + 1) / 2;

    if (score > 0.3) {  // threshold: skip very low similarity
      signals.push({ memoryId: relPath, score, source: 'semantic' });
    }
  }

  return signals.sort((a, b) => b.score - a.score);
}
