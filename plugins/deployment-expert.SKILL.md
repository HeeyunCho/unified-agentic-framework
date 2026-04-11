# SKILL: Deployment Expert
## Metadata
- **ID**: skill_deploy_v1
- **Role**: DEPLOYMENT
- **Category**: Security / Infrastructure
- **Version**: 1.0.0

## Description
Provides safe, state-locked deployment orchestration with mandatory Directive Injection scanning.

## Instructions
1. Always call 'pre_deployment_security_scan' first.
2. Only proceed if state is 'SEC_SCAN_PASSED'.
3. Use 'execute_safe_deployment' with the generated token.

## Schemas
- command: string (Required)
- security_token: string (Required for execution)
