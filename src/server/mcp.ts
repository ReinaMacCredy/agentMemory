/**
 * agentMemory MCP Server
 *
 * Workflow-aware retrieval engine for maestro memory files.
 * Read-only against .maestro/ -- only writes its own index + feedback.
 *
 * Accepts MAESTRO_DIR env var or defaults to .maestro in cwd.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.ts';
import { createStore } from '../store/index-manager.ts';
import { createLocalProvider } from '../embeddings/local.ts';
import { join } from 'node:path';

const maestroDir = process.env.MAESTRO_DIR ?? join(process.cwd(), '.maestro');
const store = createStore(maestroDir);

// Attempt to load ONNX embedding provider (graceful fallback to keyword-only)
try {
  const provider = await createLocalProvider();
  if (provider) {
    store.embedProvider = provider;
    console.error('[agent-memory] ONNX embeddings loaded (384-dim)');
  } else {
    console.error('[agent-memory] ONNX not available, using keyword-only retrieval');
  }
} catch {
  console.error('[agent-memory] ONNX not available, using keyword-only retrieval');
}

const server = new McpServer({
  name: 'agent-memory',
  version: '0.1.0',
});

registerTools(server, store);

const transport = new StdioServerTransport();
await server.connect(transport);
