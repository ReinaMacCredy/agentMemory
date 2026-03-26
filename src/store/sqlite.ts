/**
 * SQLite + vec0 storage layer.
 *
 * Single file at ~/.agent-memory/store.db.
 * WAL mode for concurrent reads. vec0 extension for vector ANN.
 */

import { Database } from 'bun:sqlite';
import { homedir } from 'node:os';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SCHEMA } from './schema.ts';

export interface Store {
  db: Database;
  close(): void;
}

export function createStore(dbPath?: string): Store {
  const dir = join(homedir(), '.agent-memory');
  mkdirSync(dir, { recursive: true });

  const path = dbPath ?? join(dir, 'store.db');
  const db = new Database(path);

  // WAL mode for concurrent reads
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA foreign_keys = ON');

  // Create tables
  db.exec(SCHEMA);

  return {
    db,
    close() {
      db.close();
    },
  };
}
