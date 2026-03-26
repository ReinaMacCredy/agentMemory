/**
 * Semantic chunking -- split content at natural boundaries.
 *
 * Boundaries: paragraphs, headings, code blocks.
 * Max 512 tokens per chunk (estimated at chars/4).
 */

export interface Chunk {
  index: number;
  content: string;
  tokenEstimate: number;
}

const MAX_CHUNK_TOKENS = 512;
const CHARS_PER_TOKEN = 4;

/**
 * Split content into semantic chunks respecting natural boundaries.
 */
export function chunkContent(content: string): Chunk[] {
  if (!content.trim()) return [];

  const estimateTokens = (text: string) => Math.ceil(text.length / CHARS_PER_TOKEN);

  // If content fits in one chunk, don't split
  if (estimateTokens(content) <= MAX_CHUNK_TOKENS) {
    return [{ index: 0, content: content.trim(), tokenEstimate: estimateTokens(content) }];
  }

  // Split at heading boundaries first (## Heading)
  const sections = content.split(/(?=^#{1,3}\s)/m).filter(s => s.trim());

  const chunks: Chunk[] = [];
  let buffer = '';

  for (const section of sections) {
    const combined = buffer ? buffer + '\n\n' + section : section;

    if (estimateTokens(combined) <= MAX_CHUNK_TOKENS) {
      buffer = combined;
    } else {
      // Flush buffer
      if (buffer.trim()) {
        chunks.push({ index: chunks.length, content: buffer.trim(), tokenEstimate: estimateTokens(buffer) });
      }

      // If this section itself exceeds limit, split by paragraphs
      if (estimateTokens(section) > MAX_CHUNK_TOKENS) {
        const paragraphs = section.split(/\n\n+/).filter(p => p.trim());
        let paraBuffer = '';

        for (const para of paragraphs) {
          const paraCombined = paraBuffer ? paraBuffer + '\n\n' + para : para;
          if (estimateTokens(paraCombined) <= MAX_CHUNK_TOKENS) {
            paraBuffer = paraCombined;
          } else {
            if (paraBuffer.trim()) {
              chunks.push({ index: chunks.length, content: paraBuffer.trim(), tokenEstimate: estimateTokens(paraBuffer) });
            }
            paraBuffer = para;
          }
        }
        buffer = paraBuffer;
      } else {
        buffer = section;
      }
    }
  }

  // Flush remaining
  if (buffer.trim()) {
    chunks.push({ index: chunks.length, content: buffer.trim(), tokenEstimate: estimateTokens(buffer) });
  }

  return chunks;
}
