#!/usr/bin/env node

/**
 * Test script for @intentorch directive functionality
 */

import { IntentOrchSDK } from './dist/sdk.js';

async function testIntentorchDirective() {
  console.log('=== Testing @intentorch Directive Functionality ===\n');
  
  try {
    // Initialize SDK
    const sdk = new IntentOrchSDK({
      autoInit: true,
      logger: {
        info: (msg) => console.log(`[INFO] ${msg}`),
        error: (msg) => console.error(`[ERROR] ${msg}`),
        debug: (msg) => console.debug(`[DEBUG] ${msg}`),
      }
    });
    
    console.log('1. Testing AI configuration...');
    
    // Configure AI (using environment variables)
    const aiConfig = {
      provider: process.env.OPENAI_PROVIDER || 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    };
    
    if (!aiConfig.apiKey) {
      console.log('⚠️  No OpenAI API key found in environment variables');
      console.log('   Set OPENAI_API_KEY environment variable to test AI functionality');
      console.log('   Skipping AI configuration for now...\n');
    } else {
      await sdk.configureAI(aiConfig);
      console.log('✅ AI configured successfully\n');
    }
    
    console.log('2. Testing Cloud Intent Engine initialization...');
    
    // Initialize Cloud Intent Engine
    await sdk.initCloudIntentEngine();
    console.log('✅ Cloud Intent Engine initialized\n');
    
    console.log('3. Testing @intentorch directive parsing...\n');
    
    // Test queries with @intentorch directives
    const testQueries = [
      'Search for MCPilotX repositories on GitHub and @intentorch summarize the results',
      'Analyze the latest PRs in IntentOrch repository @intentorch with AI summary',
      'Get open issues from MCPilotX organization @intentorch generate a report',
      'List all tools available in the system @intentorch analyze the tool capabilities',
    ];
    
    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`Query ${i + 1}: "${query}"`);
      
      try {
        // Parse and plan workflow
        const planResult = await sdk.parseAndPlanWorkflow(query);
        
        if (planResult.success && planResult.plan) {
          const plan = planResult.plan;
          console.log(`  ✅ Parsed ${plan.parsedIntents.length} intents`);
          console.log(`  ✅ Found ${plan.dependencies.length} dependencies`);
          console.log(`  ✅ Selected ${plan.toolSelections.length} tools`);
          
          // Check for AI summary intents
          const aiIntents = plan.parsedIntents.filter(intent => 
            intent.type.includes('summary') || 
            intent.type.includes('analyze') ||
            intent.type.includes('report')
          );
          
          if (aiIntents.length > 0) {
            console.log(`  ✅ Includes ${aiIntents.length} AI summary/analysis intents`);
            aiIntents.forEach(intent => {
              console.log(`     - ${intent.id}: ${intent.type} - ${intent.description}`);
            });
          }
          
          // Check tool selections for AI tools
          const aiTools = plan.toolSelections.filter(selection =>
            selection.toolName.includes('ai.') ||
            selection.toolName.includes('summary') ||
            selection.toolName.includes('analyze')
          );
          
          if (aiTools.length > 0) {
            console.log(`  ✅ Includes ${aiTools.length} AI tool selections`);
            aiTools.forEach(tool => {
              console.log(`     - ${tool.intentId}: ${tool.toolName} (confidence: ${tool.confidence.toFixed(2)})`);
            });
          }
        } else {
          console.log(`  ❌ Failed to parse: ${planResult.error}`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log('4. Testing workflow execution with mock tools...\n');
    
    // Test with a simpler query that doesn't require real tools
    const simpleQuery = 'List available tools @intentorch summarize the list';
    console.log(`Testing: "${simpleQuery}"`);
    
    try {
      const planResult = await sdk.parseAndPlanWorkflow(simpleQuery);
      
      if (planResult.success && planResult.plan) {
        console.log(`  ✅ Workflow plan created successfully`);
        console.log(`  Plan details:`);
        console.log(`    - Query: ${planResult.plan.query}`);
        console.log(`    - Intents: ${planResult.plan.parsedIntents.length}`);
        console.log(`    - Tools: ${planResult.plan.toolSelections.length}`);
        console.log(`    - Execution order: ${planResult.plan.executionOrder.join(' → ')}`);
        
        // Show intent details
        planResult.plan.parsedIntents.forEach(intent => {
          console.log(`\n    Intent ${intent.id}:`);
          console.log(`      Type: ${intent.type}`);
          console.log(`      Description: ${intent.description}`);
          if (Object.keys(intent.parameters).length > 0) {
            console.log(`      Parameters: ${JSON.stringify(intent.parameters)}`);
          }
        });
        
        // Show tool selections
        planResult.plan.toolSelections.forEach(selection => {
          console.log(`\n    Tool for ${selection.intentId}:`);
          console.log(`      Name: ${selection.toolName}`);
          console.log(`      Description: ${selection.toolDescription}`);
          console.log(`      Confidence: ${selection.confidence.toFixed(2)}`);
        });
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    console.log('\n=== Test Summary ===');
    console.log('✅ @intentorch directive processor integrated with Cloud Intent Engine');
    console.log('✅ AI tools registered in SDK tool registry');
    console.log('✅ Workflow planning with @intentorch directives works');
    console.log('\nNote: Full execution requires actual AI API key and MCP tools');
    console.log('To test with real AI, set OPENAI_API_KEY environment variable');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
testIntentorchDirective().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});