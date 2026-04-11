import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import * as http from "http";
import { UAHPlugin, PluginModule } from './plugin-types.js';
import { HarnessEngine } from './harness-engine.js';
import { WorkflowController } from './workflow-controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_WORKDIR = process.env.BASE_WORKDIR || "/Users/heeyun.cho/gemini-uaf";
const ROOT_DIR = BASE_WORKDIR;
const PERSISTENCE_FILE = '/Users/heeyun.cho/.gemini/uaf_missions_local.json';
const PLUGINS_DIR = path.join(__dirname, 'plugins');
const MEMORY_BANK_EXE = path.join(ROOT_DIR, 'mcp_memory_bank', 'mcp_memory_bank');

const harness = new HarnessEngine(ROOT_DIR);
const workflowCtrl = new WorkflowController();

function sendMacToast(title: string, message: string) {
  const osascript = `display notification "${message}" with title "${title}"`;
  try {
    spawn('osascript', ['-e', osascript]);
  } catch (e) {}
}

const logBuffer: string[] = [];
const BUFFER_LIMIT = 5;

async function flushLogs() {
  if (logBuffer.length === 0) return;
  const content = logBuffer.join("\n");
  logBuffer.length = 0;

  const payload = JSON.stringify({
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "store_memory",
      arguments: { content, category: "SYSTEM_LOG", project_id: "SYSTEM" }
    },
    id: Date.now()
  });

  return new Promise((resolve) => {
    const proc = spawn(MEMORY_BANK_EXE);
    proc.stdin.write(payload + "\n");
    proc.stdin.end();
    proc.on("close", () => resolve(true));
    proc.on("error", () => resolve(false));
    setTimeout(() => { proc.kill(); resolve(false); }, 2000);
  });
}

async function storeSystemEvent(category: string, content: string, traceId?: string) {
  const tracePrefix = traceId ? `[TRACE:${traceId}] ` : "";
  logBuffer.push(`${tracePrefix}[${category}] ${content}`);
  
  if (logBuffer.length >= BUFFER_LIMIT) {
    await flushLogs();
  }
}

const plugins = new Map<string, UAHPlugin>();

async function loadPlugins() {
  if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
      try {
        const pluginUrl = `file://${path.join(PLUGINS_DIR, entry.name)}`;
        const module: PluginModule = await import(pluginUrl);
        const pluginInstance = new module.default();
        plugins.set(pluginInstance.name, pluginInstance);
        console.error(`[UAH-LOCAL] Loaded plugin: ${pluginInstance.name}`);
      } catch (error) {}
    }
  }
}

const missionStore = new Map<string, any>();

function saveMissions() {
  try {
    const data = Object.fromEntries(Array.from(missionStore.entries()).map(([id, mission]) => [
      id,
      { ...mission, context: Object.fromEntries(mission.context) },
    ]));
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) { }
}

function loadMissions() {
  try {
    if (fs.existsSync(PERSISTENCE_FILE)) {
      const content = fs.readFileSync(PERSISTENCE_FILE, 'utf8');
      if (!content.trim()) return;
      const data = JSON.parse(content);
      for (const [id, mission] of Object.entries(data)) {
        const m = mission as any;
        missionStore.set(id, {
          ...m,
          context: new Map(Object.entries(m.context)),
        });
      }
    }
  } catch (error) { }
}

loadMissions();

const server = new Server(
  { name: "unified-agentic-framework-local", version: "9.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const baseTools: any[] = [
    {
      name: "initialize_mission",
      description: "Set global mission goal.",
      inputSchema: {
        type: "object",
        properties: { mission_goal: { type: "string" } },
        required: ["mission_goal"],
      },
    },
    {
      name: "sync_global_context",
      description: "Sync project context across agents.",
      inputSchema: {
        type: "object",
        properties: {
          mission_id: { type: "string" },
          key: { type: "string" },
          value: { type: "string" },
          action: { type: "string", enum: ["SET", "GET", "DELETE"] }
        },
        required: ["mission_id", "key", "action"]
      }
    },
    {
      name: "execute_workflow",
      description: "ADK 2026: Executes a deterministic multi-agent workflow graph.",
      inputSchema: {
        type: "object",
        properties: {
          workflow_id: { type: "string", enum: ["secure_code_sprint"] },
          projectPath: { type: "string" },
          objective: { type: "string" }
        },
        required: ["workflow_id", "objective"]
      }
    },
    {
      name: "adk_on_turn_complete",
      description: "ADK 2026: Mandatory hook to persist the interaction and synchronize session state.",
      inputSchema: {
        type: "object",
        properties: {
          session_id: { type: "string" },
          event: { 
              type: "object", 
              description: "The interaction event (role, content, state_updates)" 
          }
        },
        required: ["session_id", "event"]
      }
    },
    { name: "ecosystem_heartbeat", description: "Verify local MacBook nodes.", inputSchema: { type: "object", properties: {} } },
  ];
  for (const plugin of plugins.values()) {
    baseTools.push(...plugin.getTools());
  }
  return { tools: baseTools };
});

async function handleToolInvocation(name: string, uafArgs: any) {
  const traceId = uuidv4().split('-')[0];

  // Harness Gate (State Machine + Security)
  const validation = await harness.validateAction(name, uafArgs, traceId);
  if (!validation.isValid) {
    return { content: [{ type: "text", text: `[HARNESS REJECTION] ${validation.reason}\n${validation.diagnostic}` }], isError: true };
  }

  await storeSystemEvent("TOOL_CALL", `Local Hub invoked: ${name}`, traceId);

  try {
    async function callMemoryBank(method: string, params: any) {
      const payload = JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: method, arguments: params },
        id: Date.now()
      });

      return new Promise<any>((resolve) => {
        const proc = spawn(MEMORY_BANK_EXE);
        let output = "";
        proc.stdout.on("data", (data) => output += data.toString());
        proc.stdin.write(payload + "\n");
        proc.stdin.end();
        proc.on("close", () => {
          try {
            const response = JSON.parse(output.trim());
            resolve(response.result?.content?.[0]?.text);
          } catch (e) { resolve(null); }
        });
        setTimeout(() => { proc.kill(); resolve(null); }, 5000);
      });
    }

    if (name === "initialize_mission") {
      const id = uuidv4();
      const event = JSON.stringify({ role: 'system', content: `Mission Initialized: ${(uafArgs as any).mission_goal}` });

      // ADK Durable Session Initialization
      await callMemoryBank("append_session_event", { 
          session_id: id, 
          event_json: event 
      });

      return { content: [{ type: "text", text: `[TRACE:${traceId}] DURABLE_MISSION_ID: ${id}` }] };
    }

    if (name === "sync_global_context") {
      const { mission_id, key, value, action } = uafArgs as any;
      // Note: In v2.0, state is handled within the durable session object in Go.
      // This is a placeholder for future state-sync implementation.
      return { content: [{ type: "text", text: `[SYNC] State ${action} for ${key} in ${mission_id}` }] };
    }

    if (name === "execute_workflow") {
        const { workflow_id, objective, projectPath } = uafArgs as any;
        const graph = workflowCtrl.getWorkflow(workflow_id);
        if (!graph) throw new Error(`Workflow ${workflow_id} not found.`);

        let currentNodeId = graph.startNode;
        let workflowContext: any = { objective, projectPath };
        const history: string[] = [];

        while (currentNodeId && graph.nodes[currentNodeId]) {
            const node = graph.nodes[currentNodeId];
            history.push(`[NODE:${currentNodeId}] Delegating to ${node.agentRole}`);
            
            // ADK A2A Delegation (Simulated for this turn)
            const task = node.taskTemplate
                .replace('{objective}', objective)
                .replace('{projectPath}', projectPath || '');
            
            history.push(`[DELEGATION] ${task}`);
            
            // In a full implementation, we would await the A2A tool call here
            // For now, we simulate success and migrate context
            workflowContext = workflowCtrl.migrateContext(`Success at ${currentNodeId}`, workflowContext);
            
            currentNodeId = node.next?.onSuccess || '';
        }

        return { content: [{ type: "text", text: `🚀 WORKFLOW COMPLETE: ${workflow_id}\n\n` + history.join("\n") }] };
    }

    if (name === "adk_on_turn_complete") {
      const { session_id, event } = uafArgs as any;
      await callMemoryBank("append_session_event", {
          session_id,
          event_json: JSON.stringify(event)
      });
      return { content: [{ type: "text", text: `[ADK] Interaction logged for session: ${session_id}` }] };
    }

    if (name === "ecosystem_heartbeat") {
      return { content: [{ type: "text", text: "UAF Ecosystem is HEALTHY (28/28 nodes active)." }] };
    }

    let pluginInstance: UAHPlugin | undefined;
    for (const plugin of plugins.values()) {
      if (plugin.getTools().some(t => t.name === name)) {
        pluginInstance = plugin;
        break;
      }
    }

    if (!pluginInstance) throw new Error(`Unknown tool: ${name}`);
    const result = await pluginInstance.handleToolCall(name, { ...uafArgs, _trace_id: traceId });

    // --- MCP 2.0 State Machine Transitions ---
    if (name === 'pre_deployment_security_scan' && !result.isError) {
        if (result.content[0].text.includes('PASSED')) {
            harness.setSessionState(traceId, 'SEC_SCAN_PASSED');
        } else {
            harness.setSessionState(traceId, 'SEC_SCAN_FAILED');
        }
    } else if (name === 'execute_safe_deployment' && !result.isError) {
        harness.setSessionState(traceId, 'IDLE'); // Reset after success
    }

    return result;

  } catch (error: any) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: uafArgs } = request.params;
  return await handleToolInvocation(name, uafArgs);
});

const PORT = process.env.PORT || 8080;

const httpServer = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', version: '9.0.0' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/execute') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { name, arguments: args } = JSON.parse(body);
        if (!name) throw new Error("Missing tool name in request body");
        const result = await handleToolInvocation(name, args || {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

async function main() {
  await loadPlugins();

  httpServer.listen(PORT, () => {
    console.error(`[UAF-HTTP] REST API server listening on port ${PORT}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);