/**
 * Core types for the retrieval engine.
 */

export const STAGES = ['discovery', 'research', 'planning', 'execution', 'review'] as const;
export type Stage = typeof STAGES[number];

export const CATEGORIES = ['decision', 'research', 'architecture', 'convention', 'debug', 'execution'] as const;
export type Category = typeof CATEGORIES[number];

export interface IndexEntry {
  checksum: string;
  embedding: number[] | null;
  keywords: string[];
  snippet: string;
  metadata: MemoryMeta;
  tokenCount: number;
}

export interface MemoryMeta {
  tags?: string[];
  category?: string;
  stage?: string;
  priority?: number;
  feature?: string;
  taskId?: string;
  selectionCount?: number;
  lastSelectedAt?: string;
  connections?: Array<{ target: string; relation: string }>;
}

export interface SidecarIndex {
  version: number;
  builtAt: string;
  entries: Record<string, IndexEntry>;
}

export interface Store {
  readonly maestroDir: string;
  readonly indexPath: string;
  readonly feedbackPath: string;
  index: SidecarIndex;
  embedProvider?: import('../embeddings/provider.ts').EmbeddingProvider;
  /** Cached IDF map -- invalidated when index changes. */
  idfMap?: Map<string, number>;
}

export interface ScannedMemory {
  relPath: string;
  raw: string;
  meta: MemoryMeta;
  body: string;
}

export interface FeedbackEntry {
  taskId: string;
  outcome: 'success' | 'failure' | 'partial';
  revisionCount?: number;
  verificationPassed?: boolean;
  durationMs?: number;
  injectedPaths?: string[];
  injectedDoctrineIds?: string[];
  recordedAt: string;
}
