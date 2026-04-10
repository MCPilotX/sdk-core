// Test the compromise solution for parameter mapping
import { ParameterMapper, ValidationLevel } from './dist/mcp/parameter-mapper.js';

console.log('=== Testing Compromise Solution for Parameter Mapping ===\n');

// Test 1: Default behavior (COMPATIBLE mode)
console.log('1. Testing default COMPATIBLE mode:');
ParameterMapper.resetConfig(); // Ensure default config
console.log(`   Default config: ${JSON.stringify(ParameterMapper.getConfig())}`);

const strictSchema = {
  type: 'object',
  properties: {
    path: { type: 'string' }
  },
  required: ['path'],
  additionalProperties: false
};

const testCases = [
  {
    name: 'User provides "path" parameter',
    input: { path: '.' },
    expectedWarnings: 0
  },
  {
    name: 'User provides "name" parameter (compatibility)',
    input: { name: '.' },
    expectedWarnings: 1 // Should log compatibility warning
  },
  {
    name: 'User provides "filename" parameter (compatibility)',
    input: { filename: '.' },
    expectedWarnings: 1 // Should log compatibility warning
  },
  {
    name: 'User provides "unknown" parameter',
    input: { path: '.', unknown: 'value' },
    expectedWarnings: 1 // Should reject unknown parameter
  }
];

for (const testCase of testCases) {
  console.log(`\n   Test: ${testCase.name}`);
  try {
    const { normalized, warnings } = ParameterMapper.validateAndNormalize(
      'list_directory',
      strictSchema,
      testCase.input
    );
    
    console.log(`     Input: ${JSON.stringify(testCase.input)}`);
    console.log(`     Normalized: ${JSON.stringify(normalized)}`);
    console.log(`     Warnings: ${warnings.length} (${warnings.join(', ')})`);
    
    const hasPath = 'path' in normalized;
    const success = warnings.length === testCase.expectedWarnings && hasPath;
    console.log(`     ${success ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.log(`     ❌ ERROR: ${error.message}`);
  }
}

// Test 2: STRICT mode
console.log('\n\n2. Testing STRICT mode:');
ParameterMapper.configure({ validationLevel: ValidationLevel.STRICT, logWarnings: true });

for (const testCase of testCases) {
  console.log(`\n   Test: ${testCase.name}`);
  try {
    const { normalized, warnings } = ParameterMapper.validateAndNormalize(
      'list_directory',
      strictSchema,
      testCase.input
    );
    
    console.log(`     Input: ${JSON.stringify(testCase.input)}`);
    console.log(`     Normalized: ${JSON.stringify(normalized)}`);
    console.log(`     Warnings: ${warnings.length} (${warnings.join(', ')})`);
    
    // In strict mode, any non-schema parameter should generate warning
    const hasUnknown = Object.keys(testCase.input).some(key => key !== 'path');
    const expectedWarnings = hasUnknown ? 1 : 0;
    const success = warnings.length === expectedWarnings;
    console.log(`     ${success ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.log(`     ❌ ERROR: ${error.message}`);
  }
}

// Test 3: LENIENT mode
console.log('\n\n3. Testing LENIENT mode:');
ParameterMapper.configure({ validationLevel: ValidationLevel.LENIENT, logWarnings: true });

for (const testCase of testCases) {
  console.log(`\n   Test: ${testCase.name}`);
  try {
    const { normalized, warnings } = ParameterMapper.validateAndNormalize(
      'list_directory',
      strictSchema,
      testCase.input
    );
    
    console.log(`     Input: ${JSON.stringify(testCase.input)}`);
    console.log(`     Normalized: ${JSON.stringify(normalized)}`);
    console.log(`     Warnings: ${warnings.length} (${warnings.join(', ')})`);
    
    // In lenient mode, only non-compatibility parameters should generate warnings
    const hasUnknown = Object.keys(testCase.input).some(key => 
      key !== 'path' && key !== 'name' && key !== 'filename'
    );
    const expectedWarnings = hasUnknown ? 1 : 0;
    const success = warnings.length === expectedWarnings;
    console.log(`     ${success ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.log(`     ❌ ERROR: ${error.message}`);
  }
}

// Test 4: Test with logWarnings disabled
console.log('\n\n4. Testing with logWarnings disabled:');
ParameterMapper.configure({ 
  validationLevel: ValidationLevel.COMPATIBLE, 
  logWarnings: false 
});

const testCase = {
  name: 'User provides "name" parameter',
  input: { name: '.' }
};

console.log(`\n   Test: ${testCase.name}`);
try {
  const { normalized, warnings } = ParameterMapper.validateAndNormalize(
    'list_directory',
    strictSchema,
    testCase.input
  );
  
  console.log(`     Input: ${JSON.stringify(testCase.input)}`);
  console.log(`     Normalized: ${JSON.stringify(normalized)}`);
  console.log(`     Warnings: ${warnings.length} (should be 0 when logWarnings is false)`);
  
  const hasPath = 'path' in normalized;
  const success = warnings.length === 0 && hasPath;
  console.log(`     ${success ? '✅ PASS' : '❌ FAIL'}`);
  
} catch (error) {
  console.log(`     ❌ ERROR: ${error.message}`);
}

// Test 5: Test enforceRequired disabled
console.log('\n\n5. Testing with enforceRequired disabled:');
ParameterMapper.configure({ 
  validationLevel: ValidationLevel.COMPATIBLE,
  logWarnings: true,
  enforceRequired: false
});

const requiredSchema = {
  type: 'object',
  properties: {
    requiredParam: { type: 'string' }
  },
  required: ['requiredParam'],
  additionalProperties: false
};

console.log(`\n   Test: Missing required parameter should not throw error`);
try {
  const { normalized, warnings } = ParameterMapper.validateAndNormalize(
    'test_tool',
    requiredSchema,
    {} // Empty input
  );
  
  console.log(`     Input: {}`);
  console.log(`     Normalized: ${JSON.stringify(normalized)}`);
  console.log(`     Warnings: ${warnings.length}`);
  
  // Should not have thrown error
  console.log(`     ✅ PASS - No error thrown when enforceRequired is false`);
  
} catch (error) {
  console.log(`     ❌ ERROR: ${error.message} (should not throw when enforceRequired is false)`);
}

// Reset to defaults
ParameterMapper.resetConfig();

console.log('\n\n=== Test Summary ===');
console.log('The compromise solution provides:');
console.log('1. ✅ Default COMPATIBLE mode for intelligent parameter handling');
console.log('2. ✅ STRICT mode for strict schema validation');
console.log('3. ✅ LENIENT mode for maximum compatibility with buggy servers');
console.log('4. ✅ Configurable warning logging');
console.log('5. ✅ Configurable required parameter enforcement');
console.log('\nThis addresses the original issue:');
console.log('- MCP server bug: schema says "path" but validates "name"');
console.log('- SDK now handles this intelligently in COMPATIBLE mode');
console.log('- Users can choose different validation levels as needed');