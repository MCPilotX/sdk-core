/**
 * Basic tests for PythonAdapter to improve test coverage
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { PythonAdapter } from '../../src/runtime/python-adapter';
import { ServiceConfig } from '../../src/core/types';

// Mock dependencies
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
  isAbsolute: jest.fn((path: string) => path.startsWith('/')),
}));

jest.mock('../../src/core/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../src/core/constants', () => ({
  VENVS_DIR: '/test/venvs',
}));

// Mock util.promisify to return a simple function
jest.mock('util', () => ({
  promisify: jest.fn(() => {
    return jest.fn((command: string) => {
      return Promise.resolve({ stdout: '', stderr: '' });
    });
  }),
}));

describe('PythonAdapter Basic Tests', () => {
  let adapter: PythonAdapter;
  let mockExistsSync: jest.Mock;
  let mockMkdirSync: jest.Mock;
  let mockJoin: jest.Mock;
  let mockLogger: any;

  const mockConfig: ServiceConfig = {
    name: 'test-python-service',
    path: '/test/path',
    entry: 'main.py',
    args: ['--verbose', '--port', '8080'],
    env: { PYTHONPATH: '/test/path' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked functions
    const fs = require('fs');
    const path = require('path');
    const logger = require('../../src/core/logger');
    
    mockExistsSync = fs.existsSync as jest.Mock;
    mockMkdirSync = fs.mkdirSync as jest.Mock;
    mockJoin = path.join as jest.Mock;
    mockLogger = logger.logger;
    
    // Default mock implementations
    mockExistsSync.mockReturnValue(false);
    mockMkdirSync.mockImplementation(() => {});
    mockJoin.mockImplementation((...args: string[]) => args.join('/'));
    
    adapter = new PythonAdapter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getSpawnArgs', () => {
    it('should return python path from virtual environment', () => {
      const result = adapter.getSpawnArgs(mockConfig);
      
      expect(result).toBeDefined();
      expect(result.command).toBe('/test/venvs/test-python-service/bin/python');
      expect(result.args).toEqual(['main.py', '--verbose', '--port', '8080']);
    });

    it('should handle config without args', () => {
      const configWithoutArgs: ServiceConfig = {
        ...mockConfig,
        args: undefined,
      };
      
      const result = adapter.getSpawnArgs(configWithoutArgs);
      
      expect(result.args).toEqual(['main.py']);
    });
  });

  describe('setup', () => {
    it('should create virtual environments directory when it does not exist', async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path === '/test/venvs') return false;
        return false;
      });
      
      await adapter.setup(mockConfig);
      
      expect(mockMkdirSync).toHaveBeenCalledWith('/test/venvs', { recursive: true });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Created virtual environments directory')
      );
    });

    it('should use existing virtual environment when it exists', async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path === '/test/venvs') return true;
        if (path === '/test/venvs/test-python-service') return true;
        if (path === '/test/venvs/test-python-service/bin/python') return true;
        return false;
      });
      
      await adapter.setup(mockConfig);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Using existing virtual environment')
      );
    });

    it('should handle minimal config', async () => {
      const minimalConfig: ServiceConfig = {
        name: 'minimal-service',
        path: '.',
        entry: 'app.py',
      };
      
      mockExistsSync.mockImplementation((path: string) => {
        if (path === '/test/venvs') return true;
        if (path === '/test/venvs/minimal-service') return true;
        if (path === '/test/venvs/minimal-service/bin/python') return true;
        return false;
      });
      
      await adapter.setup(minimalConfig);
      
      const args = adapter.getSpawnArgs(minimalConfig);
      expect(args.command).toBe('/test/venvs/minimal-service/bin/python');
      expect(args.args).toEqual(['app.py']);
    });
  });

  describe('edge cases', () => {
    it('should handle config without runtimeConfig', async () => {
      const configWithoutRuntimeConfig: ServiceConfig = {
        name: 'simple-service',
        path: '/simple/path',
        entry: 'script.py',
      };
      
      mockExistsSync.mockImplementation((path: string) => {
        if (path === '/test/venvs') return true;
        if (path === '/test/venvs/simple-service') return true;
        if (path === '/test/venvs/simple-service/bin/python') return true;
        return false;
      });
      
      await adapter.setup(configWithoutRuntimeConfig);
      
      const args = adapter.getSpawnArgs(configWithoutRuntimeConfig);
      expect(args).toBeDefined();
    });
  });
});