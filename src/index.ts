/**
 * agentMemory public API.
 *
 * When used as a library (imported by maestro), consumers use these exports.
 * When used standalone, the MCP server at src/server/mcp.ts is the entry point.
 */

// Store
export { createStore } from './store/sqlite.ts';
export type { Store } from './store/sqlite.ts';
export { writeMemory, deleteMemory, getMemory, searchByKeyword } from './store/repository.ts';
export type { Memory, MemoryWriteOpts } from './store/repository.ts';

// Retrieval
export { mergeSignals, DEFAULT_WEIGHTS } from './retrieval/hybrid.ts';
export type { RetrievalSignal, HybridResult } from './retrieval/hybrid.ts';
export { selectWithMmr } from './retrieval/mmr.ts';
export type { MmrResult } from './retrieval/mmr.ts';

// Workflow signals
export { scoreStageProximity } from './workflow/stage.ts';
export { walkDependencyGraph } from './workflow/graph.ts';
export { scoreMemoryEffectiveness } from './workflow/feedback.ts';

// Pipeline
export { chunkContent } from './pipeline/chunk.ts';
export type { Chunk } from './pipeline/chunk.ts';

// Embeddings
export type { EmbeddingProvider } from './embeddings/provider.ts';
