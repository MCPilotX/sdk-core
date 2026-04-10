#!/usr/bin/env node

/**
 * Test Chinese query parsing with @intentorch directive
 */

import { intentorchDirectiveProcessor } from './dist/ai/intentorch-directive-processor.js';

console.log('=== Testing Chinese Query Parsing ===\n');

// Test queries
const testQueries = [
  '@intentorch分析这些变更的内容并生成总结报告',
  '分析这些变更的内容并@intentorch生成总结报告',
  '获取最新的PR数据@intentorch分析并生成报告',
  '简单的查询没有指令',
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
        console.log(`      Position: ${directive.position}`);
        console.log(`      Intent ID: ${directive.intentId}`);
      });
    }
    
    console.log('');
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    console.log('');
  }
}

console.log('=== Testing Workflow Enhancement ===\n');

// Test with a mock workflow
const mockWorkflow = {
  intents: [
    { id: 'A1', type: 'analyze_changes', description: '分析变更内容', parameters: { changes: '变更数据' } },
  ],
  edges: []
};

const directives = [
  { position: 0, intentId: 'AI1' }
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
  
  // Show all intents
  enhancedWorkflow.intents.forEach(intent => {
    console.log(`\n  Intent ${intent.id}:`);
    console.log(`    Type: ${intent.type}`);
    console.log(`    Description: ${intent.description}`);
    console.log(`    Parameters: ${JSON.stringify(intent.parameters)}`);
  });
  
  // Show dependencies
  if (enhancedWorkflow.edges.length > 0) {
    console.log('\n  Dependencies:');
    enhancedWorkflow.edges.forEach(edge => {
      console.log(`    ${edge.from} -> ${edge.to}`);
    });
  }
  
  // Count AI intents
  const aiIntents = enhancedWorkflow.intents.filter(intent => 
    intent.type.includes('intentorch_ai') || 
    intent.id.startsWith('AI')
  );
  
  console.log(`\n  AI summary intents added: ${aiIntents.length}`);
} catch (error) {
  console.log(`  ❌ Error enhancing workflow: ${error.message}`);
}

console.log('\n=== Analysis of Query ===\n');
console.log('Query: "@intentorch分析这些变更的内容并生成总结报告"');
console.log('\nThis query would typically be parsed as:');
console.log('1. Main intent: "分析这些变更的内容并生成总结报告" (Analyze changes and generate summary report)');
console.log('2. @intentorch directive: Indicates AI processing should be applied');
console.log('\nWith our implementation:');
console.log('1. Directive processor extracts @intentorch');
console.log('2. Cleaned query: "分析这些变更的内容并生成总结报告"');
console.log('3. Workflow is enhanced with AI summary intent');
console.log('4. Final workflow has 2 intents:');
console.log('   - A1: Analyze changes (original intent)');
console.log('   - AI1: Generate AI summary (added by @intentorch)');
console.log('5. Dependency: AI1 depends on A1 (AI summary needs analysis results)');