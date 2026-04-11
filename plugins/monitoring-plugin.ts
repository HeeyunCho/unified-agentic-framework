import { UAHPlugin } from '../plugin-types.js';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

interface SessionStats {
  model_usage: Record<string, number>;
  reset_time: string;
  ingested_at: number;
}

export default class MonitoringPlugin implements UAHPlugin {
  name = 'ecosystem-monitor';
  private requestLog: number[] = [];
  private last429: number = 0;
  private wasCoolingDown: boolean = false;
  private sessionStats: SessionStats | null = null;
  private readonly TELEMETRY_PATH = '/Users/heeyun.cho/.gemini/telemetry.log';

  getTools() {
    return [
      {
        name: "get_ecosystem_health_v2",
        description: "Get real-time health including request velocity, 429 status, and quota risk.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "log_api_event",
        description: "Log an API event for monitoring (internal use).",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "number" },
            endpoint: { type: "string" }
          },
          required: ["status"]
        }
      },
      {
        name: "sync_gemini_session_stats",
        description: "Ingest output from /stats session to manage rate-limits proactively.",
        inputSchema: {
          type: "object",
          properties: {
            model_usage: { type: "object" },
            reset_time: { type: "string" }
          },
          required: ["model_usage", "reset_time"]
        }
      },
      {
        name: "parse_local_telemetry",
        description: "Analyze the local telemetry log for performance patterns and high-latency tools.",
        inputSchema: { type: "object", properties: {} }
      }
    ];
  }

  private sendToast(title: string, message: string) {
    const osascript = `display notification "${message}" with title "${title}" sound name "Glass"`;
    try {
      spawn('osascript', ['-e', osascript]);
    } catch (e) {}
  }

  private cleanLog() {
    const now = Date.now();
    this.requestLog = this.requestLog.filter(t => now - t < 60000);
  }

  async handleToolCall(name: string, args: any) {
    this.cleanLog();

    if (name === "parse_local_telemetry") {
      if (!fs.existsSync(this.TELEMETRY_PATH)) {
        return { content: [{ type: "text", text: "[TELEMETRY] Log file not found. Ensure you have performed actions after enabling telemetry." }] };
      }
      
      const raw = fs.readFileSync(this.TELEMETRY_PATH, 'utf8');
      const lines = raw.trim().split('\n').slice(-20); // Last 20 entries
      
      return { 
        content: [{ 
          type: "text", 
          text: `[TELEMETRY ANALYSIS]\nAnalyzing last ${lines.length} events from ${this.TELEMETRY_PATH}...\n\n` + 
                lines.join('\n') 
        }] 
      };
    }

    if (name === "sync_gemini_session_stats") {
      this.sessionStats = {
        model_usage: args.model_usage,
        reset_time: args.reset_time,
        ingested_at: Date.now()
      };
      return { content: [{ type: "text", text: "[MONITOR] Session stats synchronized." }] };
    }

    if (name === "log_api_event") {
      const now = Date.now();
      this.requestLog.push(now);
      if (args.status === 429) {
        this.last429 = now;
        this.sendToast("🚨 Gemini Rate Limit", "HTTP 429 detected. Entering 5-minute cool-down.");
      }
      return { content: [{ type: "text", text: "Event logged." }] };
    }

    if (name === "get_ecosystem_health_v2") {
      const now = Date.now();
      const requestsPerMin = this.requestLog.length;
      const isCurrentlyCooling = now - this.last429 < 300000;
      
      if (this.wasCoolingDown && !isCurrentlyCooling) {
          this.sendToast("✅ Cooldown Complete", "System has returned to HEALTHY status.");
      }
      this.wasCoolingDown = isCurrentlyCooling;

      let quotaRisk = "LOW";
      if (this.sessionStats) {
          const totalUsage = Object.values(this.sessionStats.model_usage).reduce((a, b) => a + b, 0);
          if (totalUsage > 40) quotaRisk = "MEDIUM";
          if (totalUsage > 45) quotaRisk = "HIGH";
      }

      const healthReport = {
        status: isCurrentlyCooling ? "COOLING_DOWN" : (quotaRisk === "HIGH" ? "PREEMPTIVE_THROTTLE" : "HEALTHY"),
        requests_per_minute: requestsPerMin,
        quota_risk: quotaRisk,
        telemetry_target: this.TELEMETRY_PATH,
        recommendation: isCurrentlyCooling || quotaRisk === "HIGH" ? "Switch to transactional calls only." : "Healthy."
      };

      return { content: [{ type: "text", text: JSON.stringify(healthReport, null, 2) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  }
}