/**
 * Filesystem scanner -- crawls .maestro/ for memory files.
 * Scans features/star/memory/star.md and memory/star.md.
 * Read-only: never modifies .md files.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { parseFrontmatter } from './frontmatter.ts';
import type { ScannedMemory } from './types.ts';

/**
 * Scan a .maestro/ directory for all memory .md files.
 * Returns relative paths (relative to maestroDir).
 */
export function scanMemoryFiles(maestroDir: string): string[] {
  const paths: string[] = [];

  // Global memories: .maestro/memory/*.md
  const globalDir = join(maestroDir, 'memory');
  if (existsSync(globalDir)) {
    for (const file of listMdFiles(globalDir)) {
      paths.push(relative(maestroDir, join(globalDir, file)));
    }
  }

  // Feature memories: .maestro/features/*/memory/*.md
  const featuresDir = join(maestroDir, 'features');
  if (existsSync(featuresDir)) {
    const features = readdirSync(featuresDir, { withFileTypes: true });
    for (const feat of features) {
      if (!feat.isDirectory()) continue;
      const memDir = join(featuresDir, feat.name, 'memory');
      if (!existsSync(memDir)) continue;
      for (const file of listMdFiles(memDir)) {
        paths.push(relative(maestroDir, join(memDir, file)));
      }
    }
  }

  return paths;
}

/**
 * Read a single memory file and parse its frontmatter.
 */
export function readMemoryFile(maestroDir: string, relPath: string): ScannedMemory | null {
  const absPath = join(maestroDir, relPath);
  if (!existsSync(absPath)) return null;

  const raw = readFileSync(absPath, 'utf-8');
  const { meta, body } = parseFrontmatter(raw);

  // Infer feature name from path: features/<name>/memory/file.md
  if (!meta.feature) {
    const match = relPath.match(/^features\/([^/]+)\/memory\//);
    if (match) meta.feature = match[1];
  }

  return { relPath, raw, meta, body };
}

/**
 * Get the raw content of a memory file (for checksum comparison).
 */
export function readRawContent(maestroDir: string, relPath: string): string | null {
  const absPath = join(maestroDir, relPath);
  if (!existsSync(absPath)) return null;
  return readFileSync(absPath, 'utf-8');
}

function listMdFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.md') && statSync(join(dir, f)).isFile());
  } catch {
    return [];
  }
}
