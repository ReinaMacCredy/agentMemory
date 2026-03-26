/**
 * Filesystem scanner -- crawls .maestro/ for memory .md files.
 * Read-only: never modifies files.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseFrontmatter } from './frontmatter.ts';
import type { ScannedMemory } from './types.ts';

export function scanMemoryFiles(maestroDir: string): string[] {
  const paths: string[] = [];

  for (const file of listMdFiles(join(maestroDir, 'memory'))) {
    paths.push(relative(maestroDir, join(maestroDir, 'memory', file)));
  }

  for (const feat of listDirs(join(maestroDir, 'features'))) {
    const memDir = join(maestroDir, 'features', feat, 'memory');
    for (const file of listMdFiles(memDir)) {
      paths.push(relative(maestroDir, join(memDir, file)));
    }
  }

  return paths;
}

export function readMemoryFile(maestroDir: string, relPath: string): ScannedMemory | null {
  try {
    const raw = readFileSync(join(maestroDir, relPath), 'utf-8');
    const { meta, body } = parseFrontmatter(raw);

    if (!meta.feature) {
      const match = relPath.match(/^features\/([^/]+)\/memory\//);
      if (match) meta.feature = match[1];
    }

    return { relPath, raw, meta, body };
  } catch {
    return null;
  }
}

function listMdFiles(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isFile() && d.name.endsWith('.md'))
      .map(d => d.name);
  } catch {
    return [];
  }
}

function listDirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch {
    return [];
  }
}
