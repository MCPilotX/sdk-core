const jest = require('@jest/globals');
const { RuntimeDetector } = require('./src/runtime/detector');

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readdirSync: jest.fn().mockReturnValue([]),
  statSync: jest.fn().mockReturnValue({ isFile: () => false })
}));

// Mock path module  
jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
  extname: jest.fn().mockReturnValue('')
}));

// Mock the detector module
jest.mock('./src/runtime/detector', () => ({
  RuntimeDetector: {
    detect: jest.fn().mockReturnValue('node')
  }
}));

console.log('RuntimeDetector.detect is a function?', typeof RuntimeDetector.detect);
console.log('RuntimeDetector.detect mock?', RuntimeDetector.detect.mock);
console.log('RuntimeDetector.detect() returns:', RuntimeDetector.detect('/test/path'));
