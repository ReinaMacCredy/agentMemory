/**
 * agentMemory public API -- retrieval engine for maestro memory files.
 */

// Store
export { createStore, rebuildIndex, syncIndex } from './store/index-manager.ts';
export { scanMemoryFiles, readMemoryFile } from './store/scanner.ts';
export { parseFrontmatter } from './store/frontmatter.ts';
export { extractKeywords } from './store/keywords.ts';
export type { Store, SidecarIndex, IndexEntry, MemoryMeta, ScannedMemory, FeedbackEntry } from './store/types.ts';
export { STAGES, CATEGORIES } from './store/types.ts';

// Retrieval
export { mergeSignals, DEFAULT_WEIGHTS } from './retrieval/hybrid.ts';
export type { RetrievalSignal, HybridResult } from './retrieval/hybrid.ts';
export { selectWithMmr } from './retrieval/mmr.ts';
export type { MmrResult } from './retrieval/mmr.ts';
export { keywordSearch } from './retrieval/keyword.ts';
export { semanticSearch } from './retrieval/semantic.ts';

// Workflow signals
export { scoreStageProximity } from './workflow/stage.ts';
export { walkDependencyGraph } from './workflow/graph.ts';
export { recordFeedback, scoreMemoryEffectiveness } from './workflow/feedback.ts';

// Embeddings
export type { EmbeddingProvider } from './embeddings/provider.ts';
