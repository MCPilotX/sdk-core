const { RuntimeDetector } = require('./src/runtime/detector');
console.log('Original RuntimeDetector.detect:', RuntimeDetector.detect.toString());

// Now test with jest mock
jest.mock('./src/runtime/detector', () => ({
  RuntimeDetector: {
    detect: jest.fn().mockReturnValue('docker'),
  },
}));

const { RuntimeDetector: MockedRuntimeDetector } = require('./src/runtime/detector');
console.log('Mocked RuntimeDetector.detect is function:', typeof MockedRuntimeDetector.detect);
console.log('Mocked RuntimeDetector.detect is jest mock:', MockedRuntimeDetector.detect._isMockFunction);
console.log('Mocked RuntimeDetector.detect():', MockedRuntimeDetector.detect('/test'));
