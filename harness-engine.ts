import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  diagnostic?: string;
  roadmap?: string[];
}

export type AgentState = 'IDLE' | 'SEC_SCAN_PENDING' | 'SEC_SCAN_PASSED' | 'SEC_SCAN_FAILED' | 'DEPLOYING';

// 2026 ADK Enterprise Safety Configuration
export const SAFETY_SETTINGS = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
];

export class HarnessEngine {
  private readonly harnessDir: string;
  private readonly stagingDir: string;
  private readonly rootDir: string;
  
  // 2026 Deterministic State Machine Store
  private stateStore = new Map<string, AgentState>();

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.harnessDir = path.join(rootDir, '.harness');
    this.stagingDir = path.join(rootDir, '.harness_staging');
    this.ensureDirectories();
  }

  private ensureDirectories() {
    if (!fs.existsSync(this.harnessDir))
      fs.mkdirSync(this.harnessDir, { recursive: true });
    if (!fs.existsSync(this.stagingDir))
      fs.mkdirSync(this.stagingDir, { recursive: true });
  }

  public getSessionState(traceId: string): AgentState {
      return this.stateStore.get(traceId) || 'IDLE';
  }

  public setSessionState(traceId: string, state: AgentState) {
      this.stateStore.set(traceId, state);
      console.error(`[FSM] Session ${traceId} transitioned to state: ${state}`);
  }

  public async validateAction(
    name: string,
    args: any,
    traceId: string = 'global'
  ): Promise<ValidationResult> {
    const currentState = this.getSessionState(traceId);

    // 1. Mandatory State-Tool Mappings (Late 2026 Standard)
    if (name === 'execute_safe_deployment') {
        if (currentState !== 'SEC_SCAN_PASSED') {
            return {
                isValid: false,
                reason: 'FSM STATE VIOLATION: Deployment unauthorized.',
                diagnostic: `Current State: ${currentState}. Deployment requires state: SEC_SCAN_PASSED.`,
                roadmap: ['Execute pre_deployment_security_scan first.']
            };
        }
    }

    // 2. Sensitive File Guardrails
    const sensitiveFiles = ['.env', 'credentials.json', 'token.json', 'client_secret'];
    const argString = JSON.stringify(args).toLowerCase();
    if (sensitiveFiles.some((f) => argString.includes(f))) {
      return {
        isValid: false,
        reason: 'SECURITY VIOLATION: Exposed Key Risk',
        diagnostic: 'Action attempted to access or reference a protected credential file.',
        roadmap: ['Refer to official security docs.', 'Never include secrets in code.'],
      };
    }

    if (name === 'execute_script_safely') {
      return this.validateScript(args.script);
    }

    return { isValid: true };
  }

  private validateScript(script: string): ValidationResult {
    const tempPath = path.join(this.stagingDir, `verify_${Date.now()}.sh`);
    try {
      fs.writeFileSync(tempPath, script);
      execSync(`sh -n "${tempPath}"`, { stdio: 'pipe' });
      return { isValid: true };
    } catch (e: any) {
      return {
        isValid: false,
        reason: 'Script Syntax Violation',
        diagnostic: e.stderr?.toString() || e.message,
        roadmap: ['Check for unclosed braces or quotes', 'Ensure variables are properly escaped'],
      };
    } finally {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  }
}
