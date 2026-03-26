/**
 * Shared workflow signal builders used by both query and compile tools.
 */

import type { Store } from '../store/types.ts';
import type { RetrievalSignal } from './hybrid.ts';
import { scoreStageProximity } from '../workflow/stage.ts';
import { scoreMemoryEffectiveness } from '../workflow/feedback.ts';

export function buildStageSignals(
  candidateIds: Set<string>,
  store: Store,
  currentStage: string,
): RetrievalSignal[] {
  const signals: RetrievalSignal[] = [];
  for (const relPath of candidateIds) {
    const entry = store.index.entries[relPath];
    if (!entry) continue;
    signals.push({
      memoryId: relPath,
      score: scoreStageProximity(entry.metadata.stage, currentStage),
      source: 'pipelineStage',
    });
  }
  return signals;
}

export function buildFeedbackSignals(
  candidateIds: Set<string>,
  store: Store,
): RetrievalSignal[] {
  const signals: RetrievalSignal[] = [];
  for (const relPath of candidateIds) {
    const eff = scoreMemoryEffectiveness(store, relPath);
    if (eff !== 0) {
      signals.push({ memoryId: relPath, score: (eff + 1) / 2, source: 'execFeedback' });
    }
  }
  return signals;
}
