import { UAHPlugin } from './plugin-types.js';

export interface WorkflowNode {
    id: string;
    agentRole: string;
    taskTemplate: string;
    next?: {
        onSuccess: string;
        onFailure: string;
    };
}

export interface WorkflowGraph {
    id: string;
    startNode: string;
    nodes: Record<string, WorkflowNode>;
}

export class WorkflowController {
    private graphs: Record<string, WorkflowGraph> = {};

    constructor() {
        this.registerDefaultWorkflows();
    }

    private registerDefaultWorkflows() {
        // 1. Security-First Coding Workflow (SCAN -> ANALYZE -> EXECUTE)
        this.graphs['secure_code_sprint'] = {
            id: 'secure_code_sprint',
            startNode: 'scan',
            nodes: {
                'scan': {
                    id: 'scan',
                    agentRole: 'SECURITY',
                    taskTemplate: 'Perform deep security scan on path: {projectPath}',
                    next: { onSuccess: 'analyze', onFailure: 'exit_fail' }
                },
                'analyze': {
                    id: 'analyze',
                    agentRole: 'RAG',
                    taskTemplate: 'Analyze local codebase for: {objective}. Context: {scan_result}',
                    next: { onSuccess: 'execute', onFailure: 'exit_fail' }
                },
                'execute': {
                    id: 'execute',
                    agentRole: 'ENGINEERING',
                    taskTemplate: 'Implement changes based on analysis: {analyze_result}',
                    next: { onSuccess: 'verify', onFailure: 'exit_fail' }
                },
                'verify': {
                    id: 'verify',
                    agentRole: 'DEPLOYMENT',
                    taskTemplate: 'Validate the implementation gate for: {objective}',
                }
            }
        };
    }

    public getWorkflow(id: string): WorkflowGraph | undefined {
        return this.graphs[id];
    }

    /**
     * ADK 2026 Context Compression
     * Mimics official "Data Handling" by migrating only essential keys.
     */
    public migrateContext(sourceResult: string, currentContext: any): any {
        const compressed = {
            ...currentContext,
            last_result_summary: sourceResult.substring(0, 1000), // Compression
            timestamp: new Date().toISOString()
        };
        return compressed;
    }
}
