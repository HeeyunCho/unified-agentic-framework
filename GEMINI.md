# Unified Agentic Framework (GEMINI.md)

## Purpose
The `unified-agentic-framework` (UAF) is the **Meta-Orchestrator** for the Gemini CLI ecosystem. It transitions the system from a collection of isolated tools into a unified, cognitive entity by managing the lifecycle, safety, and memory shared between all other agents.

## Usage for Agents
- **`initialize_mission`**: Sets a global mission goal and allocates a `missionId` that tracks state across multiple agents.
- **`global_context_layer`**: A centralized, persistent key-value store. Allows `react-programmer-agent` to pass "learned context" directly to `iterative-refinement-agent`.
- **`secure_execute_pipeline`**: An atomic tool that wraps `command-guardrail`, `check-security`, and `smart-powershell` into a single, safe execution flow.
- **`trigger_self_healing`**: Monitors output from `js-ts-debugger-agent` and automatically initiates an `iterative-refinement` loop if errors are detected.
- **`ecosystem_status`**: Provides a "Readiness Report" for all registered MCP servers.

## Strategic Hierarchy
1. **Control Plane**: `unified-agentic-framework`
2. **Reasoning Layer**: `react-programmer`, `iterative-refinement`, `smart-agentic-ai`
3. **Audit Layer**: `coding-standards`, `js-ts-debugger`, `check-security`
4. **Execution Layer**: `smart-powershell`, `command-guardrail`
