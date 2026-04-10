import { jest } from '@jest/globals';
import { EnhancedRuntimeDetector } from './dist/runtime/detector-advanced.js';
import { RuntimeDetector } from './dist/runtime/detector.js';

// Mock fs and path
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true)
}));

jest.mock('path', () => ({
  join: (...args) => args.join('/')
}));

// Mock RuntimeDetector
RuntimeDetector.detect = jest.fn().mockReturnValue('docker');

async function test() {
  console.log('Testing runLegacyDetector...');
  
  // Call the private method
  const result = await EnhancedRuntimeDetector.runLegacyDetector('/test/path');
  
  console.log('Result:', result);
  console.log('Runtime:', result.runtime);
  console.log('Confidence:', result.confidence);
  console.log('Source:', result.source);
  
  if (result.runtime === 'docker' && result.confidence === 0.8) {
    console.log('✓ Test passed!');
  } else {
    console.log('✗ Test failed!');
    console.log('Expected: runtime=docker, confidence=0.8');
    console.log(`Got: runtime=${result.runtime}, confidence=${result.confidence}`);
  }
}

test().catch(console.error);
