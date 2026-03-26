/**
 * Keyword extraction for the sidecar index.
 *
 * Extracts from: filename segments + body text + tags.
 * Filters stopwords and short tokens (<4 chars).
 */

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'some', 'them',
  'than', 'its', 'over', 'such', 'that', 'this', 'with', 'will', 'each',
  'from', 'they', 'were', 'which', 'their', 'said', 'what', 'when', 'where',
  'would', 'make', 'like', 'into', 'could', 'time', 'very', 'your', 'about',
  'also', 'just', 'then', 'more', 'should', 'these', 'other', 'after',
  'todo', 'note', 'using', 'used', 'does', 'need', 'only',
]);

/**
 * Extract unique keywords from text content and optional tags.
 */
export function extractKeywords(text: string, tags?: string[]): string[] {
  const tokens = new Set<string>();

  // Tokenize body text
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w));

  for (const w of words) {
    tokens.add(w);
  }

  // Add tags directly (they're already curated)
  if (tags) {
    for (const tag of tags) {
      const t = tag.toLowerCase().trim();
      if (t.length >= 2) tokens.add(t);
    }
  }

  return Array.from(tokens);
}

/**
 * Extract keywords from a filename (split on - and _).
 */
export function extractFilenameKeywords(filename: string): string[] {
  const base = filename.replace(/\.md$/i, '');
  return base
    .split(/[-_]/)
    .map(s => s.toLowerCase())
    .filter(s => s.length >= 4 && !STOPWORDS.has(s));
}
