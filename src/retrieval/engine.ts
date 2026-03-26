/**
 * High-level retrieval functions -- the full scoring pipeline.
 *
 * These are the functions consumers (maestro adapter, MCP tools) should call.
 * They contain all signal scoring, merging, and selection logic in one place.
 */

import type { Store, IndexEntry } from '../store/types.ts';
import { syncIndex } from '../store/index-manager.ts';
import { readMemoryFile } from '../store/scanner.ts';
import { keywordSearch } from './keyword.ts';
import { semanticSearch } from './semantic.ts';
import { mergeSignals, type RetrievalSignal } from './hybrid.ts';
import { selectWithMmr, type MmrResult } from './mmr.ts';
import { buildStageSignals, buildFeedbackSignals } from './signals.ts';

const SYNC_DEBOUNCE_MS = 500;
let lastSyncAt = 0;

async function ensureSynced(store: Store): Promise<void> {
  const now = Date.now();
  if (now - lastSyncAt < SYNC_DEBOUNCE_MS) return;
  await syncIndex(store, store.embedProvider);
  lastSyncAt = now;
}

export interface QueryResult {
  path: string;
  name: string;
  score: number;
  signals: Record<string, number>;
  snippet: string;
  feature?: string;
  category?: string;
  stage?: string;
  tags?: string[];
}

export interface CompileResult {
  compiled: string;
  sections: Array<{ name: string; path: string; content: string; score: number; tags: string[]; category: string }>;
  tokensUsed: number;
}

export async function queryMemories(
  store: Store,
  queryText: string,
  opts?: { stage?: string; feature?: string; category?: string; limit?: number },
): Promise<QueryResult[]> {
  await ensureSynced(store);

  const allSignals: RetrievalSignal[][] = [];

  allSignals.push(keywordSearch(queryText, store.index, store.idfMap));

  if (store.embedProvider) {
    try {
      const queryVec = await store.embedProvider.embed(queryText);
      allSignals.push(semanticSearch(Array.from(queryVec), store.index));
    } catch { /* graceful fallback */ }
  }

  const candidateIds = new Set<string>();
  for (const signals of allSignals) for (const s of signals) candidateIds.add(s.memoryId);

  if (opts?.stage) allSignals.push(buildStageSignals(candidateIds, store, opts.stage));
  const fb = buildFeedbackSignals(candidateIds, store);
  if (fb.length > 0) allSignals.push(fb);

  const merged = mergeSignals(allSignals);

  const filtered = merged.filter(r => {
    const entry = store.index.entries[r.memoryId];
    if (!entry) return false;
    if (opts?.feature && entry.metadata.feature !== opts.feature) return false;
    if (opts?.category && entry.metadata.category !== opts.category) return false;
    return true;
  });

  const limit = opts?.limit ?? 20;
  return filtered.slice(0, limit).map(r => {
    const entry = store.index.entries[r.memoryId]!;
    return {
      path: r.memoryId,
      name: r.memoryId.split('/').pop()?.replace('.md', '') ?? r.memoryId,
      score: Math.round(r.totalScore * 1000) / 1000,
      signals: r.signals,
      snippet: entry.snippet,
      feature: entry.metadata.feature,
      category: entry.metadata.category,
      stage: entry.metadata.stage,
      tags: entry.metadata.tags,
    };
  });
}

export async function compileMemories(
  store: Store,
  taskId: string,
  opts?: { stage?: string; feature?: string; budgetTokens?: number },
): Promise<CompileResult> {
  await ensureSynced(store);

  const budget = opts?.budgetTokens ?? 1024;
  const allSignals: RetrievalSignal[][] = [];

  const queryText = taskId.replace(/[-_]/g, ' ');
  allSignals.push(keywordSearch(queryText, store.index, store.idfMap));

  // Expand candidates to include full feature scope
  const candidateIds = new Set<string>();
  for (const signals of allSignals) for (const s of signals) candidateIds.add(s.memoryId);
  if (opts?.feature) {
    for (const relPath of Object.keys(store.index.entries)) {
      if (relPath.includes(`features/${opts.feature}/`)) candidateIds.add(relPath);
    }
  }

  if (opts?.stage) allSignals.push(buildStageSignals(candidateIds, store, opts.stage));
  const fb = buildFeedbackSignals(candidateIds, store);
  if (fb.length > 0) allSignals.push(fb);

  const merged = mergeSignals(allSignals);
  const mmrCandidates: MmrResult[] = merged.map(r => ({
    ...r,
    tokenCount: store.index.entries[r.memoryId]?.tokenCount ?? 100,
  }));
  const selected = selectWithMmr(mmrCandidates, budget);

  const sections: CompileResult['sections'] = [];
  let tokensUsed = 0;

  for (const sel of selected) {
    const mem = readMemoryFile(store.maestroDir, sel.memoryId);
    if (!mem) continue;
    const entry = store.index.entries[sel.memoryId];
    sections.push({
      name: sel.memoryId.split('/').pop()?.replace('.md', '') ?? sel.memoryId,
      path: sel.memoryId,
      content: mem.body,
      score: Math.round(sel.totalScore * 1000) / 1000,
      tags: entry?.metadata.tags ?? [],
      category: entry?.metadata.category ?? 'unknown',
    });
    tokensUsed += sel.tokenCount;
  }

  const compiled = sections.map(s => `## ${s.name}\n\n${s.content}`).join('\n\n---\n\n');

  return { compiled, sections, tokensUsed };
}
