/**
 * Database schema -- 6 tables for workflow-aware memory.
 *
 * memories:     Core memory entries with workflow metadata
 * chunks:       Semantic chunks of large memories
 * embeddings:   384-dim vectors for semantic search (vec0 in Phase 1+)
 * connections:  Memory-to-memory relationships (supersedes, extends, etc.)
 * task_deps:    Task dependency DAG for graph walk signal
 * feedback:     Task outcome records for learning loop
 */

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT CHECK(category IN ('decision', 'research', 'architecture', 'convention', 'debug', 'execution')),
    stage TEXT CHECK(stage IN ('discovery', 'research', 'planning', 'execution', 'review')),
    task_id TEXT,
    feature TEXT,
    project TEXT,
    tags TEXT DEFAULT '[]',
    priority INTEGER DEFAULT 2 CHECK(priority BETWEEN 0 AND 4),
    selection_count INTEGER DEFAULT 0,
    last_selected_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    relation TEXT NOT NULL CHECK(relation IN ('supersedes', 'extends', 'related', 'contradicts')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(source_id, target_id, relation)
  );

  CREATE TABLE IF NOT EXISTS task_deps (
    task_id TEXT NOT NULL,
    depends_on TEXT NOT NULL,
    feature TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY(task_id, depends_on)
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK(outcome IN ('success', 'failure', 'partial')),
    revision_count INTEGER DEFAULT 0,
    verification_passed INTEGER,
    duration_ms INTEGER,
    injected_memory_ids TEXT DEFAULT '[]',
    injected_doctrine_ids TEXT DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- FTS5 full-text index on memory content (BM25 keyword search)
  CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    name, content, tags,
    content=memories,
    content_rowid=rowid
  );

  -- Triggers to keep FTS in sync
  CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(rowid, name, content, tags) VALUES (new.rowid, new.name, new.content, new.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, name, content, tags) VALUES ('delete', old.rowid, old.name, old.content, old.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, name, content, tags) VALUES ('delete', old.rowid, old.name, old.content, old.tags);
    INSERT INTO memories_fts(rowid, name, content, tags) VALUES (new.rowid, new.name, new.content, new.tags);
  END;

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project);
  CREATE INDEX IF NOT EXISTS idx_memories_feature ON memories(feature);
  CREATE INDEX IF NOT EXISTS idx_memories_stage ON memories(stage);
  CREATE INDEX IF NOT EXISTS idx_memories_task_id ON memories(task_id);
  CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
  CREATE INDEX IF NOT EXISTS idx_chunks_memory_id ON chunks(memory_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_task_id ON feedback(task_id);
  CREATE INDEX IF NOT EXISTS idx_task_deps_task_id ON task_deps(task_id);
  CREATE INDEX IF NOT EXISTS idx_task_deps_depends_on ON task_deps(depends_on);
`;
