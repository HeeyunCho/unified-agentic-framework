import { UAHPlugin } from '../plugin-types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const MEMORY_BANK_EXE = '/Users/heeyun.cho/gemini-uaf/mcp_memory_bank/mcp_memory_bank';

export default class CachePlugin implements UAHPlugin {
  name = 'shadow-cache';

  getTools() {
    return [
      {
        name: "get_cached_resource",
        description: "Retrieve a resource from the local Shadow Cache. Reduces API hits.",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "e.g., 'jira:issue:MP-7' or 'notion:page:ID'" }
          },
          required: ["key"]
        }
      },
      {
        name: "set_cached_resource",
        description: "Manually update the local Shadow Cache for a resource.",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string" },
            value: { type: "string" },
            provider: { type: "string", enum: ["jira", "notion", "google", "github"] },
            ttl: { type: "number", description: "TTL in seconds (default 300)" }
          },
          required: ["key", "value", "provider"]
        }
      }
    ];
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
      if (name === "get_cached_resource") {
        const result = await this.callMemoryBank("cache_get", { key: args.key });
        if (result === "Cache Miss" || result === "Cache Expired") {
          return { content: [{ type: "text", text: `[CACHE MISS] ${args.key} is not in shadow or expired.` }] };
        }
        return { content: [{ type: "text", text: `[CACHE HIT] ${args.key}\n\n${result}` }] };
      }

      if (name === "set_cached_resource") {
        const { key, value, provider, ttl = 300 } = args;
        await this.callMemoryBank("cache_set", { key, value, provider, ttl });
        return { content: [{ type: "text", text: `[CACHE SET] Local shadow updated for ${key}.` }] };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
}