/**
 * Local ONNX embedding provider using Transformers.js.
 *
 * Model: Xenova/all-MiniLM-L6-v2 (384-dim, ~90MB, auto-cached).
 * Lazy loading: first call downloads the model.
 * Graceful fallback: if ONNX fails, returns null.
 */

import type { EmbeddingProvider } from './provider.ts';

let pipeline: any = null;
let extractor: any = null;

async function getExtractor() {
  if (extractor) return extractor;

  try {
    // Dynamic import -- @xenova/transformers may not be installed
    const { pipeline: createPipeline } = await import('@xenova/transformers');
    extractor = await createPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    return extractor;
  } catch (e) {
    console.error('[agent-memory] Failed to load ONNX model:', (e as Error).message);
    return null;
  }
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = 384;

  async embed(text: string): Promise<Float32Array> {
    const ext = await getExtractor();
    if (!ext) throw new Error('Embedding model not available');

    const output = await ext(text, { pooling: 'mean', normalize: true });
    return new Float32Array(output.data);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    const results: Float32Array[] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }
}

/**
 * Create a local embedding provider.
 * Returns null if the ONNX runtime is not available.
 */
export async function createLocalProvider(): Promise<EmbeddingProvider | null> {
  try {
    const provider = new LocalEmbeddingProvider();
    // Test that the model loads
    await provider.embed('test');
    return provider;
  } catch {
    return null;
  }
}
