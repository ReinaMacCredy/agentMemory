/**
 * YAML frontmatter parser (read-only).
 *
 * Handles maestro's memory format:
 * ---
 * tags: [auth, session]
 * category: decision
 * priority: 1
 * ---
 * Body content here...
 */

import type { MemoryMeta } from './types.ts';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export function parseFrontmatter(raw: string): { meta: MemoryMeta; body: string } {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { meta: {}, body: raw.trim() };

  const yamlBlock = match[1];
  const body = match[2].trim();
  const meta = parseYamlLite(yamlBlock);

  return { meta, body };
}

/**
 * Lightweight YAML parser for frontmatter.
 * Handles: strings, numbers, booleans, arrays (flow and block), nulls.
 * Does NOT handle nested objects or multi-line strings.
 */
function parseYamlLite(yaml: string): MemoryMeta {
  const meta: Record<string, unknown> = {};

  for (const line of yaml.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    meta[key] = parseValue(rawValue);
  }

  return normalizeMeta(meta);
}

function parseValue(raw: string): unknown {
  if (!raw || raw === 'null' || raw === '~') return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  // Flow-style array: [a, b, c]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map(s => {
      const v = s.trim();
      // Strip quotes
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        return v.slice(1, -1);
      }
      return v;
    });
  }

  // Number
  const num = Number(raw);
  if (!Number.isNaN(num) && raw !== '') return num;

  // Strip quotes
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }

  return raw;
}

function normalizeMeta(raw: Record<string, unknown>): MemoryMeta {
  return {
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : undefined,
    category: typeof raw.category === 'string' ? raw.category : undefined,
    stage: typeof raw.stage === 'string' ? raw.stage : undefined,
    priority: typeof raw.priority === 'number' ? raw.priority : undefined,
    feature: typeof raw.feature === 'string' ? raw.feature : undefined,
    taskId: typeof raw.taskId === 'string' ? raw.taskId : undefined,
    selectionCount: typeof raw.selectionCount === 'number' ? raw.selectionCount : undefined,
    lastSelectedAt: typeof raw.lastSelectedAt === 'string' ? raw.lastSelectedAt : undefined,
  };
}
