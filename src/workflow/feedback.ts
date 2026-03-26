/**
 * Execution feedback signal.
 *
 * Tracks which memories were injected for which tasks,
 * correlates with task outcomes, and adjusts future scores.
 */

import type { Store } from '../store/sqlite.ts';

interface FeedbackRow {
  outcome: string;
  revision_count: number;
  verification_passed: number | null;
  injected_memory_ids: string;
}

/**
 * Compute effectiveness score for a memory based on historical outcomes.
 * Returns -1.0 to 1.0 where positive = correlated with success.
 */
export function scoreMemoryEffectiveness(store: Store, memoryId: string): number {
  const rows = store.db.query<FeedbackRow, [string]>(
    `SELECT outcome, revision_count, verification_passed, injected_memory_ids
     FROM feedback
     WHERE injected_memory_ids LIKE ?
     ORDER BY created_at DESC
     LIMIT 20`,
  ).all(`%${memoryId}%`);

  if (rows.length === 0) return 0; // no data, neutral score

  let score = 0;
  for (const row of rows) {
    const ids: string[] = JSON.parse(row.injected_memory_ids);
    if (!ids.includes(memoryId)) continue;

    if (row.outcome === 'success') score += 1;
    else if (row.outcome === 'failure') score -= 1;
    else score += 0.3; // partial

    // Revision penalty: each revision beyond 1 is a negative signal
    if (row.revision_count > 1) score -= (row.revision_count - 1) * 0.2;

    // Verification bonus
    if (row.verification_passed === 1) score += 0.3;
    else if (row.verification_passed === 0) score -= 0.3;
  }

  // Normalize to -1..1
  return Math.max(-1, Math.min(1, score / rows.length));
}
