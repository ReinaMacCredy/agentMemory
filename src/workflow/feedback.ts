/**
 * Execution feedback signal.
 *
 * Reads .maestro/feedback.jsonl to correlate memories with task outcomes.
 * Writes handled by the feedback MCP tool.
 */

import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import type { Store, FeedbackEntry } from '../store/types.ts';

/**
 * Append a feedback entry to feedback.jsonl.
 */
export function recordFeedback(store: Store, entry: FeedbackEntry): void {
  const line = JSON.stringify(entry) + '\n';
  appendFileSync(store.feedbackPath, line);
}

/**
 * Load all feedback entries.
 */
export function loadFeedback(store: Store): FeedbackEntry[] {
  if (!existsSync(store.feedbackPath)) return [];

  try {
    const raw = readFileSync(store.feedbackPath, 'utf-8');
    return raw.trim().split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as FeedbackEntry);
  } catch {
    return [];
  }
}

/**
 * Score a memory's effectiveness based on historical task outcomes.
 * Returns -1.0 to 1.0 where positive = correlated with success.
 */
export function scoreMemoryEffectiveness(store: Store, memoryRelPath: string): number {
  const entries = loadFeedback(store);
  const relevant = entries.filter(e => e.injectedPaths?.includes(memoryRelPath));

  if (relevant.length === 0) return 0;

  let score = 0;
  for (const entry of relevant) {
    if (entry.outcome === 'success') score += 1;
    else if (entry.outcome === 'failure') score -= 1;
    else score += 0.3;

    if (entry.revisionCount && entry.revisionCount > 1) {
      score -= (entry.revisionCount - 1) * 0.2;
    }

    if (entry.verificationPassed === true) score += 0.3;
    else if (entry.verificationPassed === false) score -= 0.3;
  }

  return Math.max(-1, Math.min(1, score / relevant.length));
}
