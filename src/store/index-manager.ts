/**
 * Sidecar index lifecycle manager.
 *
 * Manages retrieval-index.json: load, save, rebuild, sync.
 * The index caches keywords, embeddings, and metadata from .maestro/ memory files.
 * If deleted, it rebuilds from the .md files.
 */

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import type { Store, SidecarIndex, IndexEntry, MemoryMeta } from './types.ts';
import type { EmbeddingProvider } from '../embeddings/provider.ts';
import { scanMemoryFiles, readMemoryFile, readRawContent } from './scanner.ts';
import { extractKeywords, extractFilenameKeywords } from './keywords.ts';
import { basename } from 'node:path';

const INDEX_VERSION = 1;

/**
 * Create a Store pointing at a .maestro/ directory.
 * Loads existing index or creates an empty one.
 */
export function createStore(maestroDir: string): Store {
  const indexPath = join(maestroDir, 'retrieval-index.json');
  const feedbackPath = join(maestroDir, 'feedback.jsonl');
  const index = loadIndex(indexPath);

  return { maestroDir, indexPath, feedbackPath, index };
}

/**
 * Load the sidecar index from disk, or return an empty one.
 */
export function loadIndex(indexPath: string): SidecarIndex {
  if (!existsSync(indexPath)) {
    return { version: INDEX_VERSION, builtAt: '', entries: {} };
  }

  try {
    const raw = readFileSync(indexPath, 'utf-8');
    const parsed = JSON.parse(raw) as SidecarIndex;
    if (parsed.version !== INDEX_VERSION) {
      return { version: INDEX_VERSION, builtAt: '', entries: {} };
    }
    return parsed;
  } catch {
    return { version: INDEX_VERSION, builtAt: '', entries: {} };
  }
}

/**
 * Save the index atomically (write to tmp, rename).
 */
export function saveIndex(store: Store): void {
  store.index.builtAt = new Date().toISOString();
  const tmpPath = store.indexPath + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(store.index, null, 2));
  renameSync(tmpPath, store.indexPath);
}

/**
 * Full rebuild: scan all .md files, extract keywords, optionally embed.
 */
export async function rebuildIndex(store: Store, embedProvider?: EmbeddingProvider): Promise<number> {
  const relPaths = scanMemoryFiles(store.maestroDir);
  const entries: Record<string, IndexEntry> = {};

  for (const relPath of relPaths) {
    const mem = readMemoryFile(store.maestroDir, relPath);
    if (!mem) continue;

    const checksum = computeChecksum(mem.raw);
    const filenameKw = extractFilenameKeywords(basename(relPath));
    const bodyKw = extractKeywords(mem.body, mem.meta.tags);
    const keywords = [...new Set([...filenameKw, ...bodyKw])];
    const tokenCount = Math.ceil(mem.body.length / 4);

    let embedding: number[] | null = null;
    if (embedProvider) {
      try {
        const vec = await embedProvider.embed(mem.body);
        embedding = Array.from(vec);
      } catch {
        // Graceful fallback: no embedding for this entry
      }
    }

    entries[relPath] = { checksum, embedding, keywords, metadata: mem.meta, tokenCount };
  }

  store.index = { version: INDEX_VERSION, builtAt: new Date().toISOString(), entries };
  saveIndex(store);

  return Object.keys(entries).length;
}

/**
 * Incremental sync: only update stale or new entries.
 * Returns number of entries updated.
 */
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

  // Add/update entries for new or changed files
  for (const relPath of currentPaths) {
    const raw = readRawContent(store.maestroDir, relPath);
    if (!raw) continue;

    const checksum = computeChecksum(raw);
    const existing = store.index.entries[relPath];

    if (existing && existing.checksum === checksum) continue;

    // Stale or new -- re-index
    const mem = readMemoryFile(store.maestroDir, relPath);
    if (!mem) continue;

    const filenameKw = extractFilenameKeywords(basename(relPath));
    const bodyKw = extractKeywords(mem.body, mem.meta.tags);
    const keywords = [...new Set([...filenameKw, ...bodyKw])];
    const tokenCount = Math.ceil(mem.body.length / 4);

    let embedding: number[] | null = existing?.embedding ?? null;
    if (embedProvider) {
      try {
        const vec = await embedProvider.embed(mem.body);
        embedding = Array.from(vec);
      } catch {
        // Keep old embedding if available
      }
    }

    store.index.entries[relPath] = { checksum, embedding, keywords, metadata: mem.meta, tokenCount };
    updated++;
  }

  if (updated > 0) {
    saveIndex(store);
  }

  return updated;
}

/**
 * SHA-256 checksum of raw file content.
 */
export function computeChecksum(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}
