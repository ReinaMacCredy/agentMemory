/**
 * Dependency graph walk signal.
 *
 * BFS through task dependency DAG. Memories from upstream tasks
 * get proximity bonus: 1-hop = 0.35, 2-hop = 0.15, 3+ = 0.05.
 */

import type { Store } from '../store/sqlite.ts';

interface DepRow {
  depends_on: string;
}

/**
 * Find all upstream task IDs via BFS and return proximity scores.
 */
export function walkDependencyGraph(
  store: Store,
  taskId: string,
  maxDepth = 3,
): Map<string, number> {
  const scores = new Map<string, number>();
  const visited = new Set<string>();
  let frontier = [taskId];
  let depth = 0;

  const stmt = store.db.query<DepRow, [string]>(
    'SELECT depends_on FROM task_deps WHERE task_id = ?',
  );

  while (frontier.length > 0 && depth < maxDepth) {
    depth++;
    const nextFrontier: string[] = [];

    for (const current of frontier) {
      if (visited.has(current)) continue;
      visited.add(current);

      const rows = stmt.all(current);
      for (const row of rows) {
        const depId = row.depends_on;
        if (!scores.has(depId)) {
          const score = depth === 1 ? 0.35 : depth === 2 ? 0.15 : 0.05;
          scores.set(depId, score);
          nextFrontier.push(depId);
        }
      }
    }

    frontier = nextFrontier;
  }

  return scores;
}
