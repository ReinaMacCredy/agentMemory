/**
 * Hybrid retrieval engine -- orchestrates all 6 signals.
 *
 * Weights (workflow-dominant):
 *   semantic:      0.25
 *   keyword:       0.15
 *   pipeline stage: 0.20
 *   dep graph:     0.20
 *   exec feedback: 0.15
 *   recency:       0.05
 */

export interface RetrievalSignal {
  memoryId: string;
  score: number;
  source: string;
}

export interface HybridResult {
  memoryId: string;
  totalScore: number;
  signals: Record<string, number>;
}

export const DEFAULT_WEIGHTS = {
  semantic: 0.25,
  keyword: 0.15,
  pipelineStage: 0.20,
  depGraph: 0.20,
  execFeedback: 0.15,
  recency: 0.05,
} as const;

export function mergeSignals(
  signals: RetrievalSignal[][],
  weights: Record<string, number> = DEFAULT_WEIGHTS,
): HybridResult[] {
  const scoreMap = new Map<string, { total: number; signals: Record<string, number> }>();

  for (const signalGroup of signals) {
    for (const signal of signalGroup) {
      const weight = weights[signal.source] ?? 0;
      const existing = scoreMap.get(signal.memoryId) ?? { total: 0, signals: {} };
      existing.signals[signal.source] = signal.score;
      existing.total += signal.score * weight;
      scoreMap.set(signal.memoryId, existing);
    }
  }

  return Array.from(scoreMap.entries())
    .map(([memoryId, data]) => ({ memoryId, totalScore: data.total, signals: data.signals }))
    .sort((a, b) => b.totalScore - a.totalScore);
}
