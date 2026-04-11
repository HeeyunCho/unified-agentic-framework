import { UAHPlugin } from '../plugin-types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export default class MacBookSystemPlugin implements UAHPlugin {
  name = 'macbook-system';
  getTools() {
    return [
      { name: "set_volume", description: "Set the system volume level (0-100)", inputSchema: { type: "object", properties: { level: { type: "number" } }, required: ["level"] } },
      { name: "get_battery_status", description: "Get current MacBook battery percentage", inputSchema: { type: "object", properties: {} } }
    ];
  }
  async handleToolCall(name: string, args: any) {
    try {
      if (name === "set_volume") {
        await execAsync(`osascript -e "set volume output volume ${args.level}"`);
        return { content: [{ type: "text", text: `Volume set to ${args.level}%` }] };
      } else if (name === "get_battery_status") {
        const { stdout } = await execAsync(`pmset -g batt`);
        return { content: [{ type: "text", text: stdout.trim() }] };
      }
      throw new Error(`Unknown tool: ${name}`);
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  }
}