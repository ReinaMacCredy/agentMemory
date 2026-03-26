/**
 * Dependency graph walk signal.
 *
 * Reads maestro's .maestro/ task structure to find upstream tasks.
 * BFS proximity: 1-hop = 0.35, 2-hop = 0.15, 3+ = 0.05.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface TaskInfo {
  id: string;
  folder: string;
  dependsOn: string[];
}

/**
 * Walk the dependency graph from a task, return upstream task IDs with proximity scores.
 */
export function walkDependencyGraph(
  maestroDir: string,
  featureName: string,
  taskId: string,
  maxDepth = 3,
): Map<string, number> {
  const tasks = loadTaskDeps(maestroDir, featureName);
  const scores = new Map<string, number>();
  const visited = new Set<string>();
  let frontier = [taskId];
  let depth = 0;

  while (frontier.length > 0 && depth < maxDepth) {
    depth++;
    const nextFrontier: string[] = [];

    for (const current of frontier) {
      if (visited.has(current)) continue;
      visited.add(current);

      const task = tasks.get(current);
      if (!task) continue;

      for (const depId of task.dependsOn) {
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

function loadTaskDeps(maestroDir: string, featureName: string): Map<string, TaskInfo> {
  const tasks = new Map<string, TaskInfo>();
  const featureDir = join(maestroDir, 'features', featureName);
  const tasksDir = join(featureDir, 'tasks');
  if (existsSync(tasksDir)) {
    try {
      const dirs = readdirSync(tasksDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        const specPath = join(tasksDir, dir.name, 'spec.md');
        if (!existsSync(specPath)) continue;

        const spec = readFileSync(specPath, 'utf-8');
        const deps = extractDepsFromSpec(spec);
        tasks.set(dir.name, { id: dir.name, folder: dir.name, dependsOn: deps });
      }
    } catch { /* ignore */ }
  }

  return tasks;
}

function extractDepsFromSpec(spec: string): string[] {
  // Look for "depends_on:" or "blockedBy:" in spec content
  const deps: string[] = [];
  const match = spec.match(/(?:depends_on|blockedBy|dependencies):\s*\[([^\]]*)\]/i);
  if (match) {
    const items = match[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    deps.push(...items);
  }
  return deps;
}
