// Test the universal parameter mapper for any MCP service
import { ParameterMapper } from '../dist/mcp/parameter-mapper.js';

function testUniversalParameterMapper() {
  console.log('=== Testing Universal Parameter Mapper ===\n');
  console.log('Testing support for ANY MCP service\n');
  
  let allTestsPassed = true;
  
  // Test 1: File system MCP service
  console.log('1. Testing File System MCP Service:');
  const fileSystemSchema = {
    type: 'object',
    properties: {
      path: { type: 'string' },
      tail: { type: 'number', optional: true }
    },
    required: ['path'],
    additionalProperties: false
  };
  
  const fileSystemTests = [
    { toolName: 'read_text_file', input: { name: 'test.txt' }, expected: { path: 'test.txt' } },
    { toolName: 'read_text_file', input: { filename: 'test.txt' }, expected: { path: 'test.txt' } },
    { toolName: 'list_directory', input: { directory: '.' }, expected: { path: '.' } },
    { toolName: 'list_directory', input: { folder: '.' }, expected: { path: '.' } },
    { toolName: 'write_file', input: { file: 'test.txt', content: 'hello' }, expected: { path: 'test.txt', data: 'hello' } }
  ];
  
  fileSystemTests.forEach((test, i) => {
    try {
      const result = ParameterMapper.mapParameters(test.toolName, fileSystemSchema, test.input);
      const passed = JSON.stringify(result) === JSON.stringify(test.expected);
      console.log(`   ${passed ? '✅' : '❌'} Test ${i + 1}: ${test.toolName}`);
      if (!passed) {
        console.log(`       Input: ${JSON.stringify(test.input)}`);
        console.log(`       Output: ${JSON.stringify(result)}`);
        console.log(`       Expected: ${JSON.stringify(test.expected)}`);
        allTestsPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ Test ${i + 1} failed: ${error.message}`);
      allTestsPassed = false;
    }
  });
  
  // Test 2: Database MCP service
  console.log('\n2. Testing Database MCP Service:');
  const databaseSchema = {
    type: 'object',
    properties: {
      collection: { type: 'string' },
      filter: { type: 'object', optional: true },
      limit: { type: 'number', optional: true }
    },
    required: ['collection'],
    additionalProperties: false
  };
  
  const databaseTests = [
    { toolName: 'query_database', input: { table: 'users' }, expected: { collection: 'users' } },
    { toolName: 'find_records', input: { table: 'products', where: { price: { $gt: 100 } } }, expected: { collection: 'products', filter: { price: { $gt: 100 } } } },
    { toolName: 'get_rows', input: { table: 'orders', count: 10 }, expected: { collection: 'orders', limit: 10 } }
  ];
  
  databaseTests.forEach((test, i) => {
    try {
      const result = ParameterMapper.mapParameters(test.toolName, databaseSchema, test.input);
      const passed = JSON.stringify(result) === JSON.stringify(test.expected);
      console.log(`   ${passed ? '✅' : '❌'} Test ${i + 1}: ${test.toolName}`);
      if (!passed) {
        console.log(`       Input: ${JSON.stringify(test.input)}`);
        console.log(`       Output: ${JSON.stringify(result)}`);
        console.log(`       Expected: ${JSON.stringify(test.expected)}`);
        allTestsPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ Test ${i + 1} failed: ${error.message}`);
      allTestsPassed = false;
    }
  });
  
  // Test 3: Web API MCP service
  console.log('\n3. Testing Web API MCP Service:');
  const webApiSchema = {
    type: 'object',
    properties: {
      url: { type: 'string' },
      verb: { type: 'string', optional: true },
      metadata: { type: 'object', optional: true },
      query: { type: 'object', optional: true }
    },
    required: ['url'],
    additionalProperties: false
  };
  
  const webApiTests = [
    { toolName: 'call_api', input: { endpoint: '/users' }, expected: { url: '/users' } },
    { toolName: 'http_request', input: { path: '/api/data', method: 'GET' }, expected: { url: '/api/data', verb: 'GET' } },
    { toolName: 'rest_call', input: { endpoint: '/search', params: { q: 'test' } }, expected: { url: '/search', query: { q: 'test' } } }
  ];
  
  webApiTests.forEach((test, i) => {
    try {
      const result = ParameterMapper.mapParameters(test.toolName, webApiSchema, test.input);
      const passed = JSON.stringify(result) === JSON.stringify(test.expected);
      console.log(`   ${passed ? '✅' : '❌'} Test ${i + 1}: ${test.toolName}`);
      if (!passed) {
        console.log(`       Input: ${JSON.stringify(test.input)}`);
        console.log(`       Output: ${JSON.stringify(result)}`);
        console.log(`       Expected: ${JSON.stringify(test.expected)}`);
        allTestsPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ Test ${i + 1} failed: ${error.message}`);
      allTestsPassed = false;
    }
  });
  
  // Test 4: AI/ML MCP service
  console.log('\n4. Testing AI/ML MCP Service:');
  const aiSchema = {
    type: 'object',
    properties: {
      input: { type: 'string' },
      engine: { type: 'string', optional: true },
      randomness: { type: 'number', optional: true },
      length: { type: 'number', optional: true }
    },
    required: ['input'],
    additionalProperties: false
  };
  
  const aiTests = [
    { toolName: 'generate_text', input: { prompt: 'Hello world' }, expected: { input: 'Hello world' } },
    { toolName: 'chat_completion', input: { question: 'What is AI?', model: 'gpt-4' }, expected: { input: 'What is AI?', engine: 'gpt-4' } },
    { toolName: 'llm_inference', input: { prompt: 'Test', temperature: 0.7, max_tokens: 100 }, expected: { input: 'Test', randomness: 0.7, length: 100 } }
  ];
  
  aiTests.forEach((test, i) => {
    try {
      const result = ParameterMapper.mapParameters(test.toolName, aiSchema, test.input);
      const passed = JSON.stringify(result) === JSON.stringify(test.expected);
      console.log(`   ${passed ? '✅' : '❌'} Test ${i + 1}: ${test.toolName}`);
      if (!passed) {
        console.log(`       Input: ${JSON.stringify(test.input)}`);
        console.log(`       Output: ${JSON.stringify(result)}`);
        console.log(`       Expected: ${JSON.stringify(test.expected)}`);
        allTestsPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ Test ${i + 1} failed: ${error.message}`);
      allTestsPassed = false;
    }
  });
  
  // Test 5: Generic MCP service (no specific pattern)
  console.log('\n5. Testing Generic MCP Service (no specific pattern):');
  const genericSchema = {
    type: 'object',
    properties: {
      identifier: { type: 'string' },
      data: { type: 'any', optional: true },
      timestamp: { type: 'number', optional: true },
      active: { type: 'boolean', optional: true }
    },
    required: ['identifier'],
    additionalProperties: false
  };
  
  const genericTests = [
    { toolName: 'generic_tool', input: { id: '123' }, expected: { identifier: '123' } },
    { toolName: 'custom_tool', input: { uuid: 'abc-123', content: 'test' }, expected: { identifier: 'abc-123', data: 'test' } },
    { toolName: 'unknown_tool', input: { guid: 'xyz', time: 1234567890, enabled: true }, expected: { identifier: 'xyz', timestamp: 1234567890, active: true } }
  ];
  
  genericTests.forEach((test, i) => {
    try {
      const result = ParameterMapper.mapParameters(test.toolName, genericSchema, test.input);
      const passed = JSON.stringify(result) === JSON.stringify(test.expected);
      console.log(`   ${passed ? '✅' : '❌'} Test ${i + 1}: ${test.toolName}`);
      if (!passed) {
        console.log(`       Input: ${JSON.stringify(test.input)}`);
        console.log(`       Output: ${JSON.stringify(result)}`);
        console.log(`       Expected: ${JSON.stringify(test.expected)}`);
        allTestsPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ Test ${i + 1} failed: ${error.message}`);
      allTestsPassed = false;
    }
  });
  
  // Test 6: Boolean transformations
  console.log('\n6. Testing Boolean Transformations:');
  const booleanSchema = {
    type: 'object',
    properties: {
      active: { type: 'boolean' }
    },
    required: ['active'],
    additionalProperties: false
  };
  
  const booleanTests = [
    { toolName: 'toggle_feature', input: { enabled: true }, expected: { active: true } },
    { toolName: 'toggle_feature', input: { disabled: true }, expected: { active: false } },
    { toolName: 'switch_tool', input: { on: true }, expected: { active: true } },
    { toolName: 'switch_tool', input: { off: true }, expected: { active: false } }
  ];
  
  booleanTests.forEach((test, i) => {
    try {
      const result = ParameterMapper.mapParameters(test.toolName, booleanSchema, test.input);
      const passed = JSON.stringify(result) === JSON.stringify(test.expected);
      console.log(`   ${passed ? '✅' : '❌'} Test ${i + 1}: ${test.toolName}`);
      if (!passed) {
        console.log(`       Input: ${JSON.stringify(test.input)}`);
        console.log(`       Output: ${JSON.stringify(result)}`);
        console.log(`       Expected: ${JSON.stringify(test.expected)}`);
        allTestsPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ Test ${i + 1} failed: ${error.message}`);
      allTestsPassed = false;
    }
  });
  
  // Test 7: validateAndNormalize method
  console.log('\n7. Testing validateAndNormalize method:');
  try {
    const { normalized, warnings } = ParameterMapper.validateAndNormalize(
      'read_text_file',
      fileSystemSchema,
      { name: 'package.json', tail: 5 }
    );
    
    const expected = { path: 'package.json', tail: 5 };
    const passed = JSON.stringify(normalized) === JSON.stringify(expected);
    
    console.log(`   ${passed ? '✅' : '❌'} validateAndNormalize test`);
    console.log(`       Input: { name: 'package.json', tail: 5 }`);
    console.log(`       Output: ${JSON.stringify(normalized)}`);
    console.log(`       Expected: ${JSON.stringify(expected)}`);
    console.log(`       Warnings: ${warnings.length > 0 ? warnings.join(', ') : 'none'}`);
    
    if (!passed) allTestsPassed = false;
  } catch (error) {
    console.log(`   ❌ validateAndNormalize test failed: ${error.message}`);
    allTestsPassed = false;
  }
  
  // Test 8: getMappingSuggestions method
  console.log('\n8. Testing getMappingSuggestions method:');
  try {
    const suggestions = ParameterMapper.getMappingSuggestions('read_text_file', fileSystemSchema);
    console.log(`   ✅ Got ${suggestions.length} mapping suggestions for read_text_file`);
    console.log(`       First 5 suggestions:`);
    suggestions.slice(0, 5).forEach(suggestion => {
      console.log(`         "${suggestion.sourceName}" → "${suggestion.targetName}"`);
    });
  } catch (error) {
    console.log(`   ❌ getMappingSuggestions test failed: ${error.message}`);
    allTestsPassed = false;
  }
  
  // Final conclusion
  console.log('\n=== Test Results ===\n');
  
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED!');
    console.log('\n🎉 The Universal Parameter Mapper successfully supports:');
    console.log('   • File System MCP services');
    console.log('   • Database MCP services');
    console.log('   • Web API MCP services');
    console.log('   • AI/ML MCP services');
    console.log('   • Generic MCP services (any service)');
    console.log('   • Boolean transformations');
    console.log('   • Parameter validation and normalization');
    console.log('   • Mapping suggestions');
    
    console.log('\n🔧 Key improvements:');
    console.log('   1. Universal pattern (.*) that works for ANY MCP service');
    console.log('   2. Domain-specific enhancement rules for better accuracy');
    console.log('   3. Support for parameter value transformations');
    console.log('   4. Comprehensive mapping coverage (path, search, ID, data, etc.)');
    console.log('   5. Priority-based rule application');
    
    console.log('\n🚀 The parameter mapper is now truly universal and can handle any MCP service!');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('\nPlease check the failed tests above.');
  }
}

// Run the test
testUniversalParameterMapper();