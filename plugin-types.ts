export interface UAHPlugin {
  name: string;
  getTools(): Array<{
    name: string;
    description: string;
    inputSchema: { type: string; properties: Record<string, any>; required?: string[] };
  }>;
  handleToolCall(name: string, args: any): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}
export interface PluginModule {
  default: new () => UAHPlugin;
}