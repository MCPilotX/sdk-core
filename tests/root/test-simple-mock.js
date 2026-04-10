// Simple test to check if mock works
import { jest } from '@jest/globals';

// Clear any existing mocks
jest.clearAllMocks();

// Mock the detector module
jest.mock('../src/runtime/detector', () => {
  console.log('Mocking detector module');
  return {
    RuntimeDetector: {
      detect: jest.fn().mockReturnValue('docker'),
    },
  };
});

// Now import EnhancedRuntimeDetector
import { EnhancedRuntimeDetector } from '../src/runtime/detector-advanced';
import { RuntimeDetector } from '../src/runtime/detector';

console.log('RuntimeDetector.detect is mock:', RuntimeDetector.detect._isMockFunction);
console.log('RuntimeDetector.detect():', RuntimeDetector.detect('/test'));

// Try to call runLegacyDetector
try {
  const result = await EnhancedRuntimeDetector.runLegacyDetector('/test/path');
  console.log('Result:', result);
} catch (error) {
  console.log('Error:', error.message);
}
