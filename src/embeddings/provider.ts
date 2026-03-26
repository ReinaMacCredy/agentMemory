/**
 * EmbeddingProvider interface -- pluggable vector generation.
 *
 * Default: ONNX local (all-MiniLM-L6-v2, 384-dim).
 * Optional: API providers (Voyage, OpenAI).
 */

export interface EmbeddingProvider {
  readonly dimensions: number;
  embed(text: string): Promise<Float32Array>;
  embedBatch(texts: string[]): Promise<Float32Array[]>;
}
