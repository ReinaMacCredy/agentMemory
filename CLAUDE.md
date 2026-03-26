# agentMemory

Read-only retrieval engine for maestro `.maestro/` memory files. Indexes `.md` memories with hybrid search (keyword + semantic + workflow signals).

## Key Principles

- **Read-only**: Never write or modify `.maestro/` memory `.md` files. Only write `retrieval-index.json` and `feedback.jsonl`.
- **Graceful fallback**: If ONNX embeddings fail, fall back to keyword-only retrieval. Never crash on missing model.
- **Incremental sync**: Use checksums to detect changed files. Only re-index what changed.

## Architecture

- `src/store/` -- scanner, index manager, frontmatter parser, keyword extraction
- `src/retrieval/` -- hybrid merge (6 signals), BM25 keyword, cosine semantic, MMR diversity
- `src/workflow/` -- pipeline stage scoring, dependency graph BFS, execution feedback from JSONL
- `src/embeddings/` -- pluggable provider interface, ONNX local implementation
- `src/server/` -- MCP server with 5 tools (query, compile, feedback, graph, admin)

## Build and Test

```bash
bun install
bun run typecheck
bun test
```

## Maestro Integration

This repo is a companion to **maestro** (`~/Code/maestro/`). The relationship:

- **maestro** owns all memory writes (`.maestro/features/*/memory/*.md`)
- **agentMemory** is a read-only retrieval engine that indexes those files
- maestro imports agentMemory as a dependency: `"agent-memory": "file:../agentMemory"`
- The adapter lives in maestro at `src/infra/toolbox/tools/external/agent-memory/`
- When agentMemory is installed, maestro's DCP uses `compile()` for hybrid retrieval
- Without agentMemory, maestro falls back to standard keyword scoring

### After Making Changes
1. `bun run typecheck` in this repo
2. `cd ~/Code/maestro && bun install` to pick up changes
3. `bun run typecheck && bun run build` in maestro to verify

### What agentMemory Writes
- `.maestro/retrieval-index.json` -- sidecar index (keywords, checksums, embeddings)
- `.maestro/feedback.jsonl` -- task outcome records for the learning loop
- Nothing else. Never touch `.md` files.

## Standards

- TypeScript strict mode
- Bun runtime (bun:test for tests)
- No `any` types
- Conventional commits: `feat`, `fix`, `refactor`, `chore`
- File names: kebab-case
