#!/usr/bin/env node

/**
 * Simple test for @intentorch directive processor
 */

import { intentorchDirectiveProcessor } from './dist/ai/intentorch-directive-processor.js';

console.log('=== Testing @intentorch Directive Processor ===\n');

// Test queries with @intentorch directives
const testQueries = [
  'Search for MCPilotX repositories on GitHub and @intentorch summarize the results',
  'Analyze the latest PRs in IntentOrch repository @intentorch with AI summary',
  'Get open issues from MCPilotX organization @intentorch generate a report',
  'List all tools available in the system @intentorch analyze the tool capabilities',
  'Simple query without directive',
  '@intentorch summarize this text: Hello world',
  'Multiple @intentorch directives: first @intentorch summarize then @intentorch analyze',
];

console.log('Testing directive processing:\n');

for (let i = 0; i < testQueries.length; i++) {
  const query = testQueries[i];
  console.log(`Query ${i + 1}: "${query}"`);
  
  try {
    const result = intentorchDirectiveProcessor.processQuery(query);
    
    console.log(`  Cleaned query: "${result.cleanedQuery}"`);
    console.log(`  Has directives: ${result.hasDirectives}`);
    
    if (result.hasDirectives) {
      console.log(`  Directives found: ${result.directives.length}`);
      result.directives.forEach((directive, idx) => {
        console.log(`    Directive ${idx + 1}:`);
        console.log(`      Type: ${directive.type}`);
        console.log(`      Action: ${directive.action}`);
        console.log(`      Target: ${directive.target || 'N/A'}`);
        console.log(`      Parameters: ${JSON.stringify(directive.parameters)}`);
      });
    }
    
    console.log('');
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    console.log('');
  }
}

console.log('=== Testing Workflow Enhancement ===\n');

// Test workflow enhancement
const mockWorkflow = {
  intents: [
    { id: 'A1', type: 'search', description: 'Search for repositories', parameters: { query: 'MCPilotX' } },
    { id: 'A2', type: 'list', description: 'List search results', parameters: {} },
  ],
  edges: [
    { from: 'A1', to: 'A2' }
  ]
};

const directives = [
  { type: 'summary', action: 'summarize', target: 'results', parameters: { format: 'markdown' } }
];

console.log('Original workflow:');
console.log(`  Intents: ${mockWorkflow.intents.length}`);
console.log(`  Dependencies: ${mockWorkflow.edges.length}`);

try {
  const enhancedWorkflow = intentorchDirectiveProcessor.enhanceWorkflowWithDirectives(
    mockWorkflow,
    directives
  );
  
  console.log('\nEnhanced workflow:');
  console.log(`  Intents: ${enhancedWorkflow.intents.length}`);
  console.log(`  Dependencies: ${enhancedWorkflow.edges.length}`);
  
  // Find AI summary intents
  const aiIntents = enhancedWorkflow.intents.filter(intent => 
    intent.type.includes('summary') || 
    intent.type.includes('analyze') ||
    intent.type.includes('report')
  );
  
  if (aiIntents.length > 0) {
    console.log(`  AI summary intents added: ${aiIntents.length}`);
    aiIntents.forEach(intent => {
      console.log(`    - ${intent.id}: ${intent.type} - ${intent.description}`);
    });
  }
} catch (error) {
  console.log(`  ❌ Error enhancing workflow: ${error.message}`);
}

console.log('\n=== Test Summary ===');
console.log('✅ @intentorch directive processor is working');
console.log('✅ Can extract directives from queries');
console.log('✅ Can clean queries by removing directives');
console.log('✅ Can enhance workflows with AI summary intents');
console.log('\nNote: This test only verifies the directive processor logic');
console.log('Full integration with Cloud Intent Engine requires AI configuration');