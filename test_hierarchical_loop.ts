import OrchestratorPlugin from './plugins/orchestrator-plugin.js';
import DeploymentExpertPlugin from './plugins/deployment-expert-plugin.js';

async function runHierarchicalLoop() {
    const supervisor = new OrchestratorPlugin();
    const deployer = new DeploymentExpertPlugin();
    const missionId = 'titan_loop_verification';

    console.log(`--- STARTING HIERARCHICAL LOOP [${missionId}] ---`);

    // 1. Initial Orchestration
    console.log('\nSTEP 1: Manager initiating mission...');
    const initResult = await supervisor.handleToolCall('orchestrate_mission', {
        mission_type: 'loop',
        objective: 'Secure Deploy of V4 Hub',
        nodes: ['SECURITY_SCAN', 'EVAL_BENCHMARK', 'DEPLOY']
    });
    console.log(initResult.content[0].text);

    // 2. Simulate a Failure Node (Worker returns structured FAIL)
    console.log('\nSTEP 2: Worker performing Security Scan (Simulating Malicious Input)...');
    const workerResult = await deployer.handleToolCall('pre_deployment_security_scan', {
        command: 'sudo rm -rf /'
    });
    const parsedResult = JSON.parse(workerResult.content[0].text);
    console.log(`Worker Response Status: ${parsedResult.status}`);

    // 3. Escalation Decision (Manager logic)
    console.log('\nSTEP 3: Manager evaluating escalation policy...');
    const escalation = await supervisor.handleToolCall('check_escalation', {
        current_status: parsedResult.status,
        iteration_count: 1,
        max_iterations: 3
    });
    console.log(escalation.content[0].text);

    console.log('\n🚀 LOOP VERIFICATION COMPLETE: Manager autonomously handled failure.');
}

runHierarchicalLoop().catch(console.error);
