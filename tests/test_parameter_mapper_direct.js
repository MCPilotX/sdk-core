// Direct test of ParameterMapper
import { ParameterMapper } from '../dist/mcp/parameter-mapper.js';

function testParameterMapper() {
  console.log('=== Direct ParameterMapper Test ===\n');
  
  // Test 1: Test with read_text_file tool schema
  console.log('1. Testing read_text_file parameter mapping...');
  
  const readTextFileSchema = {
    type: 'object',
    properties: {
      path: { type: 'string' },
      tail: { type: 'number', optional: true },
      head: { type: 'number', optional: true }
    },
    required: ['path'],
    additionalProperties: false
  };
  
  // Test cases
  const testCases = [
    {
      name: 'Using "name" parameter (should map to "path")',
      input: { name: 'package.json' },
      expected: { path: 'package.json' }
    },
    {
      name: 'Using "filename" parameter (should map to "path")',
      input: { filename: 'package.json' },
      expected: { path: 'package.json' }
    },
    {
      name: 'Using "file" parameter (should map to "path")',
      input: { file: 'package.json' },
      expected: { path: 'package.json' }
    },
    {
      name: 'Using "path" parameter (no mapping needed)',
      input: { path: 'package.json' },
      expected: { path: 'package.json' }
    },
    {
      name: 'Using "path" with additional parameters',
      input: { path: 'package.json', tail: 10 },
      expected: { path: 'package.json', tail: 10 }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n  ${testCase.name}:`);
    try {
      const result = ParameterMapper.mapParameters(
        'read_text_file',
        readTextFileSchema,
        testCase.input
      );
      
      console.log(`    Input: ${JSON.stringify(testCase.input)}`);
      console.log(`    Output: ${JSON.stringify(result)}`);
      console.log(`    Expected: ${JSON.stringify(testCase.expected)}`);
      
      // Check if result matches expected
      const success = JSON.stringify(result) === JSON.stringify(testCase.expected);
      console.log(`    ${success ? '✅ PASS' : '❌ FAIL'}`);
      
    } catch (error) {
      console.log(`    ❌ ERROR: ${error.message}`);
    }
  }
  
  // Test 2: Test validateAndNormalize method
  console.log('\n2. Testing validateAndNormalize method...');
  
  try {
    const { normalized, warnings } = ParameterMapper.validateAndNormalize(
      'read_text_file',
      readTextFileSchema,
      { name: 'package.json' }
    );
    
    console.log(`  Input: { name: 'package.json' }`);
    console.log(`  Normalized: ${JSON.stringify(normalized)}`);
    console.log(`  Warnings: ${warnings.length > 0 ? warnings.join(', ') : 'none'}`);
    console.log(`  ${normalized.path === 'package.json' ? '✅ PASS' : '❌ FAIL'}`);
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
  }
  
  // Test 3: Test getMappingSuggestions
  console.log('\n3. Testing getMappingSuggestions...');
  
  try {
    const suggestions = ParameterMapper.getMappingSuggestions(
      'read_text_file',
      readTextFileSchema
    );
    
    console.log(`  Suggestions for read_text_file:`);
    suggestions.forEach(suggestion => {
      console.log(`    - Use "${suggestion.sourceName}" for "${suggestion.targetName}"`);
    });
    console.log(`  ${suggestions.length > 0 ? '✅ PASS' : '❌ FAIL'}`);
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
  }
  
  // Test 4: Test with list_directory tool
  console.log('\n4. Testing list_directory parameter mapping...');
  
  const listDirectorySchema = {
    type: 'object',
    properties: {
      path: { type: 'string' }
    },
    required: ['path'],
    additionalProperties: false
  };
  
  const listDirTestCases = [
    { input: { name: '.' }, expected: { path: '.' } },
    { input: { directory: '.' }, expected: { path: '.' } },
    { input: { folder: '.' }, expected: { path: '.' } },
    { input: { path: '.' }, expected: { path: '.' } }
  ];
  
  for (const testCase of listDirTestCases) {
    const paramName = Object.keys(testCase.input)[0];
    console.log(`\n  Using "${paramName}" parameter:`);
    
    try {
      const result = ParameterMapper.mapParameters(
        'list_directory',
        listDirectorySchema,
        testCase.input
      );
      
      console.log(`    Input: ${JSON.stringify(testCase.input)}`);
      console.log(`    Output: ${JSON.stringify(result)}`);
      console.log(`    ${JSON.stringify(result) === JSON.stringify(testCase.expected) ? '✅ PASS' : '❌ FAIL'}`);
    } catch (error) {
      console.log(`    ❌ ERROR: ${error.message}`);
    }
  }
  
  console.log('\n✅ ParameterMapper direct test completed');
}

// Run test
testParameterMapper();