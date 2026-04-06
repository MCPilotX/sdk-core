/**
 * Enhanced Intent Tracking Demo
 * Demonstrates the enhanced interfaces for tracking intent and tool mapping process
 */

import { MCPilotSDK } from '../src/sdk';

async function demoEnhancedIntentTracking() {
  console.log('=== Enhanced Intent Tracking Demo ===\n');

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

    // Example 1: Parse and plan workflow (without execution)
    console.log('3. Example 1: Parse and Plan Workflow');
    console.log('   Query: "Search for weather in New York and save the results"');
    
    const planResult = await sdk.parseAndPlanWorkflow('Search for weather in New York and save the results');
    
    if (planResult.success && planResult.plan) {
      console.log(`   ✅ Plan created successfully with ${planResult.plan.estimatedSteps} steps`);
      console.log(`   Parsed Intents:`);
      planResult.plan.parsedIntents.forEach((intent, index) => {
        console.log(`     ${index + 1}. ${intent.description} (${intent.type})`);
        console.log(`        Parameters: ${JSON.stringify(intent.parameters)}`);
      });
      
      console.log(`\n   Tool Selections:`);
      planResult.plan.toolSelections.forEach((selection, index) => {
        const intent = planResult.plan!.parsedIntents.find(i => i.id === selection.intentId);
        console.log(`     ${index + 1}. Intent: ${intent?.description || selection.intentId}`);
        console.log(`        Selected Tool: ${selection.toolName}`);
        console.log(`        Confidence: ${(selection.confidence * 100).toFixed(1)}%`);
        console.log(`        Mapped Parameters: ${JSON.stringify(selection.mappedParameters)}`);
      });
      
      console.log(`\n   Dependencies:`);
      planResult.plan.dependencies.forEach((dep, index) => {
        const fromIntent = planResult.plan!.parsedIntents.find(i => i.id === dep.from);
        const toIntent = planResult.plan!.parsedIntents.find(i => i.id === dep.to);
        console.log(`     ${index + 1}. ${fromIntent?.description || dep.from} → ${toIntent?.description || dep.to}`);
      });
      
      console.log(`\n   Execution Order: ${planResult.plan.executionOrder.join(' → ')}`);
    } else {
      console.log(`   ❌ Plan creation failed: ${planResult.error}`);
    }
    console.log();

    // Example 2: Preview workflow plan
    console.log('4. Example 2: Preview Workflow Plan');
    console.log('   Query: "Open a webpage and take a screenshot"');
    
    const previewResult = await sdk.previewWorkflowPlan('Open a webpage and take a screenshot');
    
    if (previewResult.success && previewResult.plan) {
      console.log(`   ✅ Preview created successfully`);
      console.log(`   This allows users to review the plan before execution.`);
      console.log(`   Users can see exactly what tools will be used and how parameters are mapped.`);
    } else {
      console.log(`   ❌ Preview failed: ${previewResult.error}`);
    }
    console.log();

    // Example 3: Execute workflow with enhanced tracking
    console.log('5. Example 3: Execute Workflow with Enhanced Tracking');
    console.log('   Query: "Search for MCP services and list results"');
    
    // Note: In a real scenario, you would have MCP servers connected
    // For this demo, we'll show the structure without actual execution
    
    console.log('   With enhanced tracking, users can:');
    console.log('   1. See each step as it starts and completes');
    console.log('   2. View detailed information about intent-to-tool mapping');
    console.log('   3. Get timing information for each step');
    console.log('   4. Receive callbacks for step events');
    console.log();

    // Example 4: Confirm and execute a plan
    console.log('6. Example 4: Confirm and Execute Workflow Plan');
    console.log('   This demonstrates the user confirmation workflow:');
    console.log('   1. User creates a plan with parseAndPlanWorkflow()');
    console.log('   2. User reviews the plan (intents, tools, parameters)');
    console.log('   3. User can modify the plan if needed');
    console.log('   4. User confirms and executes with confirmAndExecuteWorkflow()');
    console.log('   5. User gets detailed execution results with statistics');
    console.log();

    // Example 5: Using callbacks for real-time tracking
    console.log('7. Example 5: Real-time Tracking with Callbacks');
    console.log('   Code example:');
    console.log(`
    await sdk.executeWorkflowWithTracking(
      "Search web and save results",
      {
        onStepStarted: (step) => {
          console.log(\`Starting step: \${step.intentDescription} with tool \${step.toolName}\`);
        },
        onStepCompleted: (step) => {
          console.log(\`Step completed: \${step.intentDescription} in \${step.duration}ms\`);
          console.log(\`Result: \${JSON.stringify(step.result)}\`);
        },
        onStepFailed: (step) => {
          console.error(\`Step failed: \${step.intentDescription} - \${step.error}\`);
        }
      }
    );
    `);
    console.log();

    // Summary of new capabilities
    console.log('=== Summary of Enhanced Capabilities ===');
    console.log('✅ Users can now access detailed information about:');
    console.log('   1. Parsed intents with descriptions and parameters');
    console.log('   2. Tool selections with confidence scores');
    console.log('   3. Parameter mapping from intent to tool');
    console.log('   4. Dependency relationships between intents');
    console.log('   5. Execution order based on dependencies');
    console.log('   6. Real-time step tracking with callbacks');
    console.log('   7. Execution statistics and timing information');
    console.log('   8. Plan preview before execution');
    console.log('   9. User confirmation workflow');
    console.log();

    console.log('=== Usage Recommendations ===');
    console.log('For different user scenarios:');
    console.log('1. **Debugging/Development**: Use parseAndPlanWorkflow() to see how queries are parsed');
    console.log('2. **User Review**: Use previewWorkflowPlan() to show users what will happen');
    console.log('3. **Production Monitoring**: Use executeWorkflowWithTracking() with callbacks');
    console.log('4. **Interactive Applications**: Use confirmAndExecuteWorkflow() for user confirmation');
    console.log('5. **Batch Processing**: Use processWorkflow() for simple automated workflows');
    console.log();

    console.log('=== Demo Complete ===');
    console.log('\nThe enhanced interfaces now provide full visibility into the intent parsing');
    console.log('and tool mapping process, allowing users to understand and verify each step.');

  } catch (error: any) {
    console.error(`❌ Demo failed: ${error.message}`);
    console.error('\nNote: You need to provide a valid OpenAI API key.');
    console.error('Set OPENAI_API_KEY environment variable or update the code.');
  }
}

// Run the demo
if (require.main === module) {
  demoEnhancedIntentTracking().catch(console.error);
}

export { demoEnhancedIntentTracking };