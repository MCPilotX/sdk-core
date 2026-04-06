/**
 * Cloud Intent Engine Demo
 * Demonstrates the Cloud LLM Intent Engine for natural language workflow processing
 */

import { MCPilotSDK } from '../src/sdk';
import { CloudIntentEngine, type CloudIntentEngineConfig } from '../src/ai/cloud-intent-engine';

async function demoBasicUsage() {
  console.log('=== Cloud Intent Engine Demo ===\n');

  // Initialize SDK
  const sdk = new MCPilotSDK({
    logger: {
      info: (msg) => console.log(`[INFO] ${msg}`),
      error: (msg) => console.error(`[ERROR] ${msg}`),
      debug: (msg) => console.debug(`[DEBUG] ${msg}`),
    },
  });

  try {
    // Configure AI (you need to provide your own API key)
    console.log('1. Configuring AI...');
    await sdk.configureAI({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
      model: 'gpt-3.5-turbo',
    });

    console.log('✅ AI configured successfully\n');

    // Initialize Cloud Intent Engine
    console.log('2. Initializing Cloud Intent Engine...');
    await sdk.initCloudIntentEngine();
    
    const engineStatus = sdk.getCloudIntentEngineStatus();
    console.log(`✅ Cloud Intent Engine initialized:`);
    console.log(`   - Initialized: ${engineStatus.initialized}`);
    console.log(`   - LLM Provider: ${engineStatus.llmProvider}`);
    console.log(`   - LLM Configured: ${engineStatus.llmConfigured}`);
    console.log(`   - Available Tools: ${engineStatus.toolsCount}\n`);

    // Example 1: Simple intent parsing
    console.log('3. Example 1: Simple Intent Parsing');
    console.log('   Query: "Open a webpage and search for MCP services"');
    
    // Note: In a real scenario, you would have MCP servers connected
    // and tools available. For this demo, we'll show the structure.
    
    console.log('   This would parse the query into atomic intents and dependencies.\n');

    // Example 2: Workflow processing (simulated)
    console.log('4. Example 2: Workflow Processing');
    console.log('   Query: "Search for weather in New York and save the results"');
    
    // In a real implementation with connected MCP servers:
    // 1. The engine would parse the query into intents
    // 2. Select appropriate tools from available MCP tools
    // 3. Execute the workflow in dependency order
    
    console.log('   Steps the engine would perform:');
    console.log('   1. Parse query into atomic intents');
    console.log('   2. Select tools for each intent');
    console.log('   3. Map parameters to tool inputs');
    console.log('   4. Execute workflow with dependency resolution\n');

    // Example 3: Using the CloudIntentEngine directly
    console.log('5. Example 3: Direct CloudIntentEngine Usage');
    
    const engineConfig: CloudIntentEngineConfig = {
      llm: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        maxTokens: 2048,
      },
      execution: {
        maxConcurrentTools: 3,
        timeout: 60000,
        retryAttempts: 2,
      },
      fallback: {
        enableKeywordMatching: true,
        askUserOnFailure: false,
      },
    };

    const engine = new CloudIntentEngine(engineConfig);
    await engine.initialize();
    
    console.log('✅ Direct engine initialization successful\n');

    // Show engine capabilities
    console.log('6. Engine Capabilities:');
    console.log('   - Natural language to atomic intent decomposition');
    console.log('   - Dependency inference between intents (DAG generation)');
    console.log('   - Automatic tool selection from MCP tool registry');
    console.log('   - Parameter mapping from intent to tool schema');
    console.log('   - Workflow execution with topological sorting');
    console.log('   - Fallback mechanisms for robustness');
    console.log('   - Support for multiple LLM providers (OpenAI, Anthropic, Google, etc.)\n');

    // Enhanced tracking capabilities
    console.log('7. Enhanced Tracking & User Visibility:');
    console.log('   Users can now access detailed information about:');
    console.log('   - Parsed intents with descriptions and parameters');
    console.log('   - Tool selections with confidence scores');
    console.log('   - Parameter mapping from intent to tool');
    console.log('   - Dependency relationships between intents');
    console.log('   - Execution order based on dependencies');
    console.log('   - Real-time step tracking with callbacks');
    console.log('   - Execution statistics and timing information');
    console.log('   - Plan preview before execution');
    console.log('   - User confirmation workflow\n');

    // Integration with MCP
    console.log('8. Integration with MCP:');
    console.log('   The Cloud Intent Engine works seamlessly with MCPilot SDK:');
    console.log('   - Automatically discovers tools from connected MCP servers');
    console.log('   - Uses ToolRegistry for tool execution');
    console.log('   - Supports variable substitution between steps');
    console.log('   - Handles tool execution errors and retries\n');

    // New API methods
    console.log('9. New Enhanced API Methods:');
    console.log('   - parseAndPlanWorkflow(): Get detailed plan without execution');
    console.log('   - previewWorkflowPlan(): Preview plan for user review');
    console.log('   - executeWorkflowWithTracking(): Real-time tracking with callbacks');
    console.log('   - confirmAndExecuteWorkflow(): User confirmation workflow');
    console.log('   See enhanced-intent-tracking-demo.ts for detailed examples\n');

    console.log('=== Demo Complete ===');
    console.log('\nTo use in production:');
    console.log('1. Connect MCP servers using sdk.connectMCPServer()');
    console.log('2. Initialize Cloud Intent Engine with sdk.initCloudIntentEngine()');
    console.log('3. Process workflows with sdk.processWorkflow(query)');
    console.log('4. For detailed tracking, use sdk.executeWorkflowWithTracking()');
    console.log('5. For user review, use sdk.previewWorkflowPlan()');
    console.log('6. Monitor execution with sdk.getCloudIntentEngineStatus()');
    console.log('\nCheck enhanced-intent-tracking-demo.ts for examples of the new enhanced interfaces.');

  } catch (error: any) {
    console.error(`❌ Demo failed: ${error.message}`);
    console.error('\nNote: You need to provide a valid OpenAI API key.');
    console.error('Set OPENAI_API_KEY environment variable or update the code.');
  }
}

// Run the demo
if (require.main === module) {
  demoBasicUsage().catch(console.error);
}

export { demoBasicUsage };