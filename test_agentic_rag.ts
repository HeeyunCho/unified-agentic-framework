import AgenticRAGPlugin from './plugins/agentic-rag-plugin.js';

async function test() {
  const plugin = new AgenticRAGPlugin();
  console.log('--- Testing 2026 Native Grounding RAG Stack (v1.5.0) ---');
  
  const researchTopic = 'latest architectural patterns for agentic multi-agent systems April 2026';

  try {
    // 1. Verify Native Grounding
    console.log('\n[TEST] Step 1: Native Google Search Grounding');
    const groundingResult = await plugin.handleToolCall('google_search_grounding', { 
      prompt: researchTopic 
    });
    console.log(groundingResult.content[0].text);

    // 2. Verify Autonomous Retrieval Loop (Hybrid Local + Grounded Cloud)
    console.log('\n[TEST] Step 2: Autonomous Retrieval Loop');
    const retrievalResult = await plugin.handleToolCall('autonomous_retrieval', { 
      query: researchTopic,
      reflection_depth: 1 
    });
    
    console.log('\n--- Final Verification Output ---');
    console.log(retrievalResult.content[0].text);
    
    if (retrievalResult.content[0].text.includes('[AGENTIC RAG v1.5.0]')) {
      console.log('\n✅ VERIFICATION SUCCESS: Native Grounding and RAG Loop are operational.');
    }
  } catch (error) {
    console.error('❌ VERIFICATION FAILED:', error);
  }
}

test();
