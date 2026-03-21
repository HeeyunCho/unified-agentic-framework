# IMPLEMENTATION: Unified Agentic Framework (UAF)

## Overview
The `unified-agentic-framework` is the meta-orchestration layer for the Gemini CLI ecosystem. It transitions isolated tools into a unified system via Shared Context, Safety Pipelines, and Self-Healing logic.

## Tool Definitions

### `initialize_mission(mission_goal: string)`
- **Purpose**: Establishes a global project scope.
- **Output**: Returns a `mission_id` used for cross-agent tracking.

### `sync_global_context(mission_id, key, value, action)`
- **Purpose**: The "Shared Memory" layer.
- **Strategic Value**: Prevents context loss during agent handoffs (e.g., from Programmer to Refinement).

### `atomic_safe_execute(mission_id, script)`
- **Purpose**: Encapsulates the safety mesh (Guardrail -> Security -> Execution).
- **Compliance**: Enforces ecosystem safety standards by design.

### `self_healing_handover(mission_id, error_context)`
- **Purpose**: Autonomous feedback loop between Audit and Refinement agents.

### `ecosystem_heartbeat()`
- **Purpose**: Real-time monitoring of all 27 specialized servers.

## Internal Architecture
- **State Storage**: `Map<string, Mission>` with recursive context maps.
- **Validation**: Strict Zod schemas.
- **Protocol**: MCP/Stdio.
