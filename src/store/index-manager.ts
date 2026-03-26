/**
 * Sidecar index lifecycle manager.
 *
 * Manages retrieval-index.json: load, save, rebuild, sync.
 * If deleted, it rebuilds from the .md files.
 */

import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import type { Store, SidecarIndex, IndexEntry } from './types.ts';
import type { EmbeddingProvider } from '../embeddings/provider.ts';
import { scanMemoryFiles, readMemoryFile } from './scanner.ts';
import { parseFrontmatter } from './frontmatter.ts';
import { extractKeywords, extractFilenameKeywords } from './keywords.ts';

const INDEX_VERSION = 1;
const SNIPPET_LENGTH = 200;

export function createStore(maestroDir: string): Store {
  const indexPath = join(maestroDir, 'retrieval-index.json');
  const feedbackPath = join(maestroDir, 'feedback.jsonl');
  const index = loadIndex(indexPath);
  return { maestroDir, indexPath, feedbackPath, index };
}

export function loadIndex(indexPath: string): SidecarIndex {
  try {
    const raw = readFileSync(indexPath, 'utf-8');
    const parsed = JSON.parse(raw) as SidecarIndex;
    if (parsed.version !== INDEX_VERSION) {
      return emptyIndex();
    }
    return parsed;
  } catch {
    return emptyIndex();
  }
}

export function saveIndex(store: Store): void {
  store.index.builtAt = new Date().toISOString();
  store.idfMap = undefined; // invalidate cached IDF
  const tmpPath = store.indexPath + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(store.index));
  renameSync(tmpPath, store.indexPath);
}

export async function rebuildIndex(store: Store, embedProvider?: EmbeddingProvider): Promise<number> {
  const relPaths = scanMemoryFiles(store.maestroDir);
  const entries: Record<string, IndexEntry> = {};

  for (const relPath of relPaths) {
    const entry = await buildEntry(store.maestroDir, relPath, embedProvider);
    if (entry) entries[relPath] = entry;
  }

  store.index = { version: INDEX_VERSION, builtAt: new Date().toISOString(), entries };
  saveIndex(store);
  return Object.keys(entries).length;
}

export async function syncIndex(store: Store, embedProvider?: EmbeddingProvider): Promise<number> {
  const currentPaths = scanMemoryFiles(store.maestroDir);
  const currentSet = new Set(currentPaths);
  let updated = 0;

  // Remove entries for deleted files
  for (const existingPath of Object.keys(store.index.entries)) {
    if (!currentSet.has(existingPath)) {
      delete store.index.entries[existingPath];
      updated++;
    }
  }

  // Add/update stale or new entries
  for (const relPath of currentPaths) {
    const mem = readMemoryFile(store.maestroDir, relPath);
    if (!mem) continue;

    const checksum = computeChecksum(mem.raw);
    const existing = store.index.entries[relPath];
    if (existing && existing.checksum === checksum) continue;

    const entry = await buildEntry(store.maestroDir, relPath, embedProvider, mem.raw);
    if (entry) {
      // Preserve old embedding if re-embedding fails
      if (!entry.embedding && existing?.embedding) entry.embedding = existing.embedding;
      store.index.entries[relPath] = entry;
      updated++;
    }
  }

  if (updated > 0) saveIndex(store);
  return updated;
}

export function computeChecksum(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function emptyIndex(): SidecarIndex {
  return { version: INDEX_VERSION, builtAt: '', entries: {} };
}

/**
 * Build a single index entry from a memory file.
 * Accepts optional pre-read raw content to avoid double-read.
 */
async function buildEntry(
  maestroDir: string,
  relPath: string,
  embedProvider?: EmbeddingProvider,
  preReadRaw?: string,
): Promise<IndexEntry | null> {
  const mem = preReadRaw
    ? (() => { const { meta, body } = parseFrontmatter(preReadRaw); return { relPath, raw: preReadRaw, meta, body }; })()
    : readMemoryFile(maestroDir, relPath);
  if (!mem) return null;

  const checksum = computeChecksum(mem.raw);
  const filenameKw = extractFilenameKeywords(basename(relPath));
  const bodyKw = extractKeywords(mem.body, mem.meta.tags);
  const keywords = [...new Set([...filenameKw, ...bodyKw])];
  const snippet = mem.body.slice(0, SNIPPET_LENGTH);
  const tokenCount = Math.ceil(mem.body.length / 4);

  let embedding: number[] | null = null;
  if (embedProvider) {
    try {
      const vec = await embedProvider.embed(mem.body);
      embedding = Array.from(vec);
    } catch { /* graceful fallback */ }
  }

  return { checksum, embedding, keywords, snippet, metadata: mem.meta, tokenCount };
}
