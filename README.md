# Unified Agentic Framework (UAF)

The **Meta-Orchestrator** for the Gemini CLI ecosystem. This MCP server unifies 27 isolated specialized agents into a cohesive, cognitive framework through Global Context, Atomic Safety, and Autonomous Self-Healing.

## 🚀 Purpose
Specialized agents often operate in "Siloed Intelligence," losing project context during handoffs. The UAF provides the **Control Plane** that ensures "Cognitive Continuity," allowing the system to reason, implementation, and audit as a single unified entity.

## 🛠 Features
- **Mission Management**: Track a project's lifecycle across multiple agents using a unique `mission_id`.
- **Global Context Layer**: A universal "Shared Memory" that persists context across server boundaries.
- **Atomic Safety Mesh**: Execute scripts via a mandatory `Syntax -> Security -> Safe Execution` pipeline.
- **Autonomous Self-Healing**: Automatically route audit failures back to refinement agents without human intervention.
- **Ecosystem Heartbeat**: Real-time readiness monitoring for all registered MCP capabilities.

## 📦 Installation
```bash
npm install
npm run build
```

## 🤖 Usage in MCP
Register the server in your `settings.json`:
```json
"unified-agentic-framework": {
  "command": "node",
  "args": ["C:/gemini_project/unified-agentic-framework/dist/index.js"]
}
```

## 📜 Strategic Mandates
1. **Unification**: No agent is an island; context must be shared.
2. **Safety by Design**: Execution must pass through the atomic safety mesh.
3. **Self-Correction**: The framework prioritizes autonomous feedback loops over user prompting.
