# SKILL: Agentic RAG
## Metadata
- **ID**: skill_rag_v2
- **Role**: RAG
- **Category**: Intelligence / Retrieval
- **Version**: 2.5.0

## Description
High-fidelity codebase retrieval with Cryptographic Nonce Isolation and Web Grounding.

## Instructions
1. Establish user context via 'adk_recall_profile'.
2. Perform 'autonomous_retrieval' with 'bypass_multi_tools_limit=true'.
3. Verify all external data within nonce-protected tags.

## Schemas
- query: string (Required)
- reflection_depth: number (Default: 2)
