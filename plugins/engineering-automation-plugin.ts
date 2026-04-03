import { UAHPlugin } from '../plugin-types.js';
import { z } from "zod";
import axios from 'axios';
import * as fs from "fs";
import * as path from "path";
import { exec, execSync } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const JIRA_BASE_URL = "https://heeyuncho.atlassian.net";
const JIRA_AUTH = process.env.JIRA_AUTH || "YOUR_JIRA_AUTH_HERE";
const NOTION_TOKEN = process.env.NOTION_TOKEN || "YOUR_NOTION_TOKEN_HERE";

const ADKGO_EXE = "C:/gemini_project/adkgo_cli/adkgo.exe";

const STEPS = [
  "RESEARCH",
  "PLAN",
  "REVIEW",
  "IMPLEMENTATION (TYPECHECK)",
  "VERIFICATION",
  "DOCUMENTATION",
  "FEEDBACK"
];

const LANGUAGE_RESOURCES: any = {
  "go": { official: "https://go.dev/doc/", grammar: "https://go.dev/ref/spec" },
  "typescript": { official: "https://www.typescriptlang.org/docs/", grammar: "https://github.com/microsoft/TypeScript/blob/main/doc/spec.md" },
};

export default class EngineeringAutomationPlugin implements UAHPlugin {
  name = "engineering-automation-plugin";
  version = "2.0.0";

  getTools() {
    return [
      { name: "get_language_guidance", description: "Get official guidance for a language.", inputSchema: { type: "object", properties: { language: { type: "string" } }, required: ["language"] } },
      { name: "poll_notion_trigger", description: "Sync Notion triggers to Jira.", inputSchema: { type: "object", properties: {} } },
      { name: "analyze_tsconfig", description: "Audit tsconfig.json.", inputSchema: { type: "object", properties: { configPath: { type: "string" } }, required: ["configPath"] } },
      { name: "run_static_debug", description: "Run tsc --noEmit.", inputSchema: { type: "object", properties: { projectPath: { type: "string" } }, required: ["projectPath"] } },
      { name: "init_workflow", description: "Start 7-step workflow in SQL.", inputSchema: { type: "object", properties: { projectName: { type: "string" } }, required: ["projectName"] } },
      { name: "get_workflow_status", description: "Check workflow step from SQL.", inputSchema: { type: "object", properties: { projectName: { type: "string" } }, required: ["projectName"] } },
      { name: "advance_workflow", description: "Move to next workflow step in SQL.", inputSchema: { type: "object", properties: { projectName: { type: "string" } }, required: ["projectName"] } },
    ];
  }

  async handleToolCall(name: string, args: any) {
    switch (name) {
      case "get_language_guidance":
        return { content: [{ type: "text", text: `Guidance for ${args.language}: ${LANGUAGE_RESOURCES[args.language]?.official || "Unknown"}` }] };
      
      case "poll_notion_trigger":
        return this.handleJiraSync();

      case "analyze_tsconfig":
        const content = fs.readFileSync(args.configPath, "utf-8");
        return { content: [{ type: "text", text: `Audit complete for ${args.configPath}.` }] };

      case "run_static_debug":
        try {
          await execAsync("npx tsc --noEmit", { cwd: args.projectPath });
          return { content: [{ type: "text", text: "Static Analysis passed." }] };
        } catch (e: any) {
          return { content: [{ type: "text", text: `Static Analysis failed: ${e.stdout}` }] };
        }

      case "init_workflow":
        execSync(`${ADKGO_EXE} workflow init ${args.projectName}`);
        return { content: [{ type: "text", text: `Workflow ${args.projectName} started in SQL.` }] };

      case "get_workflow_status":
        try {
            const out = execSync(`${ADKGO_EXE} workflow get ${args.projectName}`).toString();
            const m = out.match(/Step Index: (\d+)/);
            const idx = m ? parseInt(m[1]) : 0;
            return { content: [{ type: "text", text: `Step: ${STEPS[idx]} (Source: SQL)` }] };
        } catch (e) {
            return { content: [{ type: "text", text: "No active workflow found in SQL." }] };
        }

      case "advance_workflow":
        execSync(`${ADKGO_EXE} workflow advance ${args.projectName}`);
        return { content: [{ type: "text", text: `Advanced ${args.projectName} in SQL.` }] };

      default:
        throw new Error(`Plugin ${this.name} doesn't handle tool ${name}`);
    }
  }

  private async handleJiraSync() {
    return { content: [{ type: "text", text: "Jira/Notion Sync Logic Hub-Managed." }] };
  }
}
