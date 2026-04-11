import GovernedDataPlugin from './plugins/governed-data-plugin.js';
import TelemetryPlugin from './plugins/telemetry-plugin.js';

async function runMission() {
    const dataPlugin = new GovernedDataPlugin();
    const telemetryPlugin = new TelemetryPlugin();
    const missionId = 'toolbox_verification_alpha';

    console.log(`--- STARTING GOVERNED DATA MISSION [${missionId}] ---`);

    // Step 1: Discovery (JIT Context)
    console.log('\nSTEP 1: Discovering Data Models...');
    const discoveryResult = await dataPlugin.handleToolCall('get_explores', {});
    console.log(discoveryResult.content[0].text);

    // Step 2: Governed Query
    console.log('\nSTEP 2: Executing Governed Query (sales_performance)...');
    const queryResult = await dataPlugin.handleToolCall('run_governed_query', {
        explore: 'sales_performance',
        dimensions: ['region', 'revenue']
    });
    console.log(queryResult.content[0].text);

    // Step 3: OTLP Audit Trail
    console.log('\nSTEP 3: Retrieving OTLP Trace...');
    const traceResult = await telemetryPlugin.handleToolCall('get_system_traces', { missionId });
    console.log(traceResult.content[0].text);

    console.log('\n🚀 MISSION COMPLETE: Toolbox Architecture Verified.');
}

runMission().catch(console.error);
