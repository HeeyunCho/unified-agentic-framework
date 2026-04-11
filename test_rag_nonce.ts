import AgenticRAGPlugin from './plugins/agentic-rag-plugin.js';

async function runFortressTest() {
    const plugin = new AgenticRAGPlugin();
    const query = "What is the core architecture of the gemini-uaf ecosystem?";
    
    console.log("--- STARTING FORTRESS TEST (RAG v2.5.0) ---");
    console.log(`User Query: "${query}"\n`);

    const result = await plugin.handleToolCall('autonomous_retrieval', { 
        query: query,
        reflection_depth: 1 
    });

    console.log("--- RAG OUTPUT (SANDBOXED) ---");
    console.log(result.content[0].text);
}

runFortressTest().catch(console.error);
