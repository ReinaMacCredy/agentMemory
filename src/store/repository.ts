/**
 * Data access layer -- typed queries with transaction support.
 */

import type { Store } from './sqlite.ts';
import { randomUUID } from 'node:crypto';

export interface Memory {
  id: string;
  name: string;
  content: string;
  category?: string;
  stage?: string;
  taskId?: string;
  feature?: string;
  project?: string;
  tags: string[];
  priority: number;
  selectionCount: number;
  lastSelectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryWriteOpts {
  name: string;
  content: string;
  category?: string;
  stage?: string;
  taskId?: string;
  feature?: string;
  project?: string;
  tags?: string[];
  priority?: number;
}

export function writeMemory(store: Store, opts: MemoryWriteOpts): Memory {
  const id = randomUUID();
  const tags = JSON.stringify(opts.tags ?? []);
  const now = new Date().toISOString();

  store.db.run(
    `INSERT INTO memories (id, name, content, category, stage, task_id, feature, project, tags, priority, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, opts.name, opts.content, opts.category ?? null, opts.stage ?? null,
     opts.taskId ?? null, opts.feature ?? null, opts.project ?? null,
     tags, opts.priority ?? 2, now, now],
  );

  return {
    id, name: opts.name, content: opts.content,
    category: opts.category, stage: opts.stage,
    taskId: opts.taskId, feature: opts.feature, project: opts.project,
    tags: opts.tags ?? [], priority: opts.priority ?? 2,
    selectionCount: 0, createdAt: now, updatedAt: now,
  };
}

export function deleteMemory(store: Store, id: string): boolean {
  const result = store.db.run('DELETE FROM memories WHERE id = ?', [id]);
  return result.changes > 0;
}

export function getMemory(store: Store, id: string): Memory | null {
  const row = store.db.query('SELECT * FROM memories WHERE id = ?').get(id) as Record<string, unknown> | null;
  if (!row) return null;
  return rowToMemory(row);
}

export function searchByKeyword(store: Store, query: string, limit = 20): Memory[] {
  const rows = store.db.query(
    `SELECT m.* FROM memories_fts fts
     JOIN memories m ON m.rowid = fts.rowid
     WHERE memories_fts MATCH ?
     ORDER BY rank
     LIMIT ?`,
  ).all(query, limit) as Record<string, unknown>[];
  return rows.map(rowToMemory);
}

function rowToMemory(row: Record<string, unknown>): Memory {
  return {
    id: row.id as string,
    name: row.name as string,
    content: row.content as string,
    category: row.category as string | undefined,
    stage: row.stage as string | undefined,
    taskId: row.task_id as string | undefined,
    feature: row.feature as string | undefined,
    project: row.project as string | undefined,
    tags: JSON.parse((row.tags as string) ?? '[]'),
    priority: row.priority as number,
    selectionCount: row.selection_count as number,
    lastSelectedAt: row.last_selected_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
