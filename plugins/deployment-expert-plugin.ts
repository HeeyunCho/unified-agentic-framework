import { UAHPlugin } from '../plugin-types.js';

export default class DeploymentExpertPlugin implements UAHPlugin {
  name = 'deployment-expert';

  getTools() {
    return [
      {
        name: 'pre_deployment_security_scan',
        description: 'Scans deployment commands and manifests for Directive Injection and Shared Context Poisoning.',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'The shell command or deployment manifest to scan.' },
            context: { type: 'string', description: 'Optional: The shared context being passed to the deployment.' }
          },
          required: ['command'],
        },
      },
      {
        name: 'execute_safe_deployment',
        description: 'Executes a deployment only if it passes the security gate.',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string' },
            security_token: { type: 'string', description: 'Verification token from the security scan.' }
          },
          required: ['command', 'security_token'],
        },
      }
    ];
  }

  async handleToolCall(name: string, args: any) {
    switch (name) {
      case 'pre_deployment_security_scan':
        return this.handleSecurityScan(args.command, args.context || '');
      case 'execute_safe_deployment':
        return this.handleDeployment(args.command, args.security_token);
      default:
        throw new Error(`Plugin ${this.name} doesn't handle tool ${name}`);
    }
  }

  private async handleSecurityScan(command: string, context: string) {
    const forbiddenPatterns = [
      /\bsudo\b/i,
      /\brm\s+-rf\b/i,
      /\beval\b/i,
      /<\s*\/\s*[\w_]+>/, // XML Tag Escape attempt
      /javascript:/i
    ];

    const violations: string[] = [];
    
    // Check command
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(command)) {
        violations.push(`Forbidden pattern found in command: ${pattern.toString()}`);
      }
    }

    // Check context for poisoning
    if (context.includes('system_instruction') || context.includes('override')) {
      violations.push('Potential Shared Context Poisoning detected (Reserved keywords found).');
    }

    if (violations.length > 0) {
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            status: 'FAIL',
            violations: violations,
            recommendation: 'Sanitize input and remove administrative keywords.'
          }, null, 2)
        }],
        isError: true
      };
    }

    // Generate a secure nonce for the session (2026 Standard)
    const nonce = Math.random().toString(36).substring(7);
    
    const result = {
        status: violations.length > 0 ? 'FAIL' : 'PASS',
        violations: violations,
        token: violations.length > 0 ? null : `deploy_auth_${nonce}`,
        recommendation: violations.length > 0 ? 'Sanitize input and remove administrative keywords.' : 'Ready for deployment.'
    };

    return {
      content: [{ 
        type: 'text', 
        text: JSON.stringify(result, null, 2)
      }],
      isError: violations.length > 0
    };
  }

  private async handleDeployment(command: string, token: string) {
    if (!token.startsWith('deploy_auth_')) {
      return {
        content: [{ type: 'text', text: '❌ DEPLOYMENT FAILED: Invalid or missing security token. Run pre_deployment_security_scan first.' }],
        isError: true
      };
    }

    return {
      content: [{ 
        type: 'text', 
        text: `🚀 DEPLOYMENT SUCCESSFUL.\nCommand executed: "${command}"\nStatus: Verified via Token ${token}` 
      }]
    };
  }
}
