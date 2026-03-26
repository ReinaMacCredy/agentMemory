/**
 * agentMemory public API.
 *
 * Retrieval engine for maestro memory files.
 * Read-only against .maestro/ -- only writes its own index + feedback.
 */

// Store
export { createStore, loadIndex, saveIndex, rebuildIndex, syncIndex } from './store/index-manager.ts';
export { scanMemoryFiles, readMemoryFile } from './store/scanner.ts';
export { parseFrontmatter } from './store/frontmatter.ts';
export { extractKeywords, extractFilenameKeywords } from './store/keywords.ts';
export type { Store, SidecarIndex, IndexEntry, MemoryMeta, ScannedMemory, FeedbackEntry } from './store/types.ts';

// Retrieval
export { mergeSignals, DEFAULT_WEIGHTS } from './retrieval/hybrid.ts';
export type { RetrievalSignal, HybridResult } from './retrieval/hybrid.ts';
export { selectWithMmr } from './retrieval/mmr.ts';
export type { MmrResult } from './retrieval/mmr.ts';

// Workflow signals
export { scoreStageProximity } from './workflow/stage.ts';

// Pipeline
export { chunkContent } from './pipeline/chunk.ts';
export type { Chunk } from './pipeline/chunk.ts';

// Embeddings
export type { EmbeddingProvider } from './embeddings/provider.ts';
