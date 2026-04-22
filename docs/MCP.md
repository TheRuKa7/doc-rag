# MCP Server — doc-rag

doc-rag ships an MCP (Model Context Protocol) server that exposes retrieval as a tool for Claude Desktop (or any MCP-aware client).

## Why?

Once registered, you can ask Claude Desktop questions like:
> "What does the Anthropic SDK say about prompt caching? Use the doc-rag tool."

Claude calls `retrieve_docs(query)`, gets back cited chunks, and synthesizes an answer. You get a personal, in-editor research assistant over your own corpora.

## Tools exposed

### `retrieve_docs(query: string, corpus?: string, top_k?: int)`
Returns an array of `{text, citation, score}` objects.

### `list_corpora()`
Returns available ingested corpora.

### `ingest_url(url: string, corpus: string)` *(v2)*
On-the-fly ingestion from a URL.

## Setup (Claude Desktop)

Add to `~/.claude-desktop/config.json`:

```json
{
  "mcpServers": {
    "doc-rag": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/doc-rag", "python", "-m", "doc_rag.mcp.server"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "POSTGRES_URL": "postgresql://localhost:5432/docrag"
      }
    }
  }
}
```

Restart Claude Desktop; `doc-rag` tools should appear.

## Implementation notes

- Uses `mcp` Python SDK
- Same retrieval pipeline as the REST API — one implementation, two transports
- Logs tool calls with OTLP for observability
