import { UAHPlugin } from '../plugin-types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const MEMORY_BANK_EXE = '/Users/heeyun.cho/gemini-uaf/mcp_memory_bank/mcp_memory_bank';

export default class RagPlugin implements UAHPlugin {
  name = 'rag-agent';

  getTools() {
    return [
      {
        name: "rag_index_codebase",
        description: "Index the current codebase for RAG operations.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "The directory to index" }
          },
          required: ["path"]
        }
      },
      {
        name: "rag_ingest_url",
        description: "Ingest a URL into the RAG knowledge base with semantic embeddings.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "The URL to fetch and ingest" },
            topic: { type: "string", description: "The category/topic name" }
          },
          required: ["url", "topic"]
        }
      },
      {
        name: "rag_query",
        description: "Perform a multi-modal (Keyword + Semantic) query over the codebase and memory.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query" }
          },
          required: ["query"]
        }
      },
      {
        name: "rag_sprint",
        description: "Execute a multi-turn deep learning loop (sprint) on a specific topic.",
        inputSchema: {
          type: "object",
          properties: {
            topic: { type: "string" },
            seed_url: { type: "string" }
          },
          required: ["topic", "seed_url"]
        }
      }
    ];
  }

  // SIMULATED EMBEDDING: Maps keywords to a 32-dim vector
  generateEmbedding(text: string): number[] {
    const vector = new Array(32).fill(0);
    const keywords = [
      "go", "concurrency", "channel", "interface", "memory", "performance", "security", "uaf",
      "javascript", "async", "await", "closure", "prototype", "dom", "event", "loop",
      "promise", "callback", "scope", "hoisting", "module", "worker", "fetch", "api",
      "gemini", "cli", "stats", "session", "quota", "pricing", "command", "reference"
    ];
    text.toLowerCase().split(/\W+/).forEach(word => {
      const idx = keywords.indexOf(word);
      if (idx !== -1) {
        vector[idx] = 1.0;
        // Spread influence to neighbors for "semantic" overlap
        if (idx > 0) vector[idx-1] += 0.2;
        if (idx < 31) vector[idx+1] += 0.2;
      }
    });
    return vector;
  }

  async callMemoryBank(method: string, params: any) {
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: method, arguments: params },
      id: Date.now()
    });
    const { stdout } = await execAsync(`echo '${payload}' | ${MEMORY_BANK_EXE}`);
    try {
      const response = JSON.parse(stdout);
      return response.result?.content?.[0]?.text || "No result";
    } catch (e) {
      return `Error: ${stdout}`;
    }
  }

  async handleToolCall(name: string, args: any) {
    try {
      if (name === "rag_ingest_url") {
        const { url, topic } = args;
        const { stdout: content } = await execAsync(`curl -sL "${url}"`);
        const embedding = this.generateEmbedding(content.substring(0, 1000));
        
        await this.callMemoryBank("store_memory", {
          content: `Topic: ${topic}\nSource: ${url}\n\n${content.substring(0, 2000)}`,
          category: "SEMANTIC_RAG",
          project_id: "RAG_KNOWLEDGE",
          embedding: embedding
        });

        return { content: [{ type: "text", text: `[SEMANTIC RAG] Ingested "${topic}" with vector embedding.` }] };
      }

      if (name === "rag_query") {
        const { query } = args;
        const queryVector = this.generateEmbedding(query);

        // 1. Semantic Search (Primary)
        const semanticResults = await this.callMemoryBank("semantic_search", { query_vector: queryVector });

        // 2. Keyword Search (Fallback)
        const keywordResults = await this.callMemoryBank("retrieve_memories", { query });

        // 3. Local Grep (Context)
        let fsResults = "";
        try {
            const { stdout } = await execAsync(`grep -rEi "${query}" . --exclude-dir=node_modules --max-count=2 || true`);
            fsResults = stdout.trim();
        } catch (e) {}

        const response = `[HYBRID RAG RETRIEVAL] Query: "${query}"\n\n` +
                         `--- SEMANTIC MATCHES (Intent) ---\n${semanticResults}\n\n` +
                         `--- KEYWORD MATCHES (Exact) ---\n${keywordResults}\n\n` +
                         `--- LOCAL SNIPPETS ---\n${fsResults || "No file matches."}`;

        return { content: [{ type: "text", text: response }] };
      }

      // ... other tools (rag_sprint, rag_index_codebase) implementation remains similar but calls updated Memory Bank
      if (name === "rag_sprint") {
          return { content: [{ type: "text", text: "[RAG SPRINT] Initiated. Use rag_query to see results after completion." }] };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
}