// Test to check if mock is working
import { jest } from '@jest/globals';

// First, let's see what happens when we mock a module
const mockDetect = jest.fn().mockReturnValue('docker');

// Mock the detector module
jest.mock('./src/runtime/detector', () => ({
  RuntimeDetector: {
    detect: mockDetect,
  },
}));

// Now import the module
import { RuntimeDetector } from './src/runtime/detector';

console.log('RuntimeDetector.detect is mock:', RuntimeDetector.detect._isMockFunction);
console.log('RuntimeDetector.detect():', RuntimeDetector.detect('/test'));
console.log('mockDetect called:', mockDetect.mock.calls.length);
