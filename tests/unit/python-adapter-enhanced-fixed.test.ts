/**
 * Enhanced tests for PythonAdapter to improve test coverage - Fixed version
 * This version correctly mocks dependencies and avoids the promisify issue
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { ServiceConfig } from '../../src/core/types';

// Mock modules BEFORE importing PythonAdapter
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn(),
  isAbsolute: jest.fn(),
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

// Now import PythonAdapter after mocks are set up
import { PythonAdapter } from '../../src/runtime/python-adapter';

describe('PythonAdapter Enhanced Tests - Fixed', () => {
  let adapter: PythonAdapter;
  let mockExecAsync: jest.Mock;
  let mockExistsSync: jest.Mock;
  let mockMkdirSync: jest.Mock;
  let mockJoin: jest.Mock;
  let mockIsAbsolute: jest.Mock;
  let mockLogger: any;

  const mockConfig: ServiceConfig = {
    name: 'test-python-service',
    path: '/test/path',
    entry: 'main.py',
    args: ['--verbose', '--port', '8080'],
    env: { PYTHONPATH: '/test/path' },
    runtimeConfig: {
      python: {
        dependencies: ['flask', 'requests', 'numpy'],
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock execAsync function
    mockExecAsync = jest.fn();
    
    // Get mocked functions from modules
    const fs = require('fs');
    const path = require('path');
    const logger = require('../../src/core/logger');
    
    mockExistsSync = fs.existsSync as jest.Mock;
    mockMkdirSync = fs.mkdirSync as jest.Mock;
    mockJoin = path.join as jest.Mock;
    mockIsAbsolute = path.isAbsolute as jest.Mock;
    mockLogger = logger.logger;
    
    // Default mock implementations
    mockExecAsync.mockImplementation(() => Promise.resolve({ stdout: '', stderr: '' }));
    mockExistsSync.mockReturnValue(false);
    mockMkdirSync.mockImplementation(() => {});
    mockJoin.mockImplementation((...args: string[]) => args.join('/'));
    mockIsAbsolute.mockImplementation((path: string) => path.startsWith('/'));
    
    // Create adapter with mocked execAsync
    adapter = new PythonAdapter(mockExecAsync);
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

  describe('setup - basic tests', () => {
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
      // Should not create new virtual environment
      expect(mockExecAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('python3 -m venv')
      );
    });

    it('should create virtual environment when it does not exist', async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path === '/test/venvs') return true;
        if (path === '/test/venvs/test-python-service') return false;
        return false;
      });
      
      await adapter.setup(mockConfig);
      
      expect(mockExecAsync).toHaveBeenCalledWith(
        'python3 -m venv "/test/venvs/test-python-service"'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Creating Python virtual environment')
      );
    });
  });

  describe('setup - dependency installation', () => {
    beforeEach(() => {
      // Setup common mocks for dependency tests
      mockExistsSync.mockImplementation((path: string) => {
        if (path === '/test/venvs') return true;
        if (path === '/test/venvs/test-python-service') return true;
        if (path === '/test/venvs/test-python-service/bin/python') return true;
        return false;
      });
    });

    it('should install dependencies from array', async () => {
      // Mock pip version check and installation
      mockExecAsync.mockImplementation((command: string) => {
        if (command.includes('pip --version')) {
          return Promise.resolve({ stdout: 'pip 23.0.0', stderr: '' });
        }
        if (command.includes('pip install')) {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });
      
      await adapter.setup(mockConfig);
      
      // Should install each dependency
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('pip install "flask"')
      );
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('pip install "requests"')
      );
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('pip install "numpy"')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Installing Python dependencies')
      );
    });

    it('should skip dependency installation when no dependencies configured', async () => {
      const configWithoutDeps: ServiceConfig = {
        ...mockConfig,
        runtimeConfig: {
          python: {},
        },
      };
      
      await adapter.setup(configWithoutDeps);
      
      // Should not call pip install
      const pipInstallCalls = mockExecAsync.mock.calls.filter((call: any[]) => 
        call[0]?.includes('pip install')
      );
      expect(pipInstallCalls).toHaveLength(0);
    });

    it('should handle empty dependencies array', async () => {
      const configWithEmptyDeps: ServiceConfig = {
        ...mockConfig,
        runtimeConfig: {
          python: {
            dependencies: [],
          },
        },
      };
      
      await adapter.setup(configWithEmptyDeps);
      
      // Should not call pip install
      const pipInstallCalls = mockExecAsync.mock.calls.filter((call: any[]) => 
        call[0]?.includes('pip install')
      );
      expect(pipInstallCalls).toHaveLength(0);
    });
  });

  describe('setup - error handling', () => {
    it('should handle virtual environment creation failure', async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path === '/test/venvs') return true;
        if (path === '/test/venvs/test-python-service') return false;
        return false;
      });
      
      mockExecAsync.mockImplementation((command: string) => {
        if (command.includes('python3 -m venv')) {
          return Promise.reject(new Error('Virtual environment creation failed'));
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });
      
      await expect(adapter.setup(mockConfig)).rejects.toThrow(
        'Python environment setup failed: Virtual environment creation failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to setup Python environment'),
        expect.any(Object)
      );
    });

    it('should throw error when pip is not available', async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path === '/test/venvs') return true;
        if (path === '/test/venvs/test-python-service') return true;
        if (path === '/test/venvs/test-python-service/bin/python') return true;
        return false;
      });
      
      mockExecAsync.mockImplementation((command: string) => {
        if (command.includes('pip --version')) {
          return Promise.reject(new Error('pip not found'));
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });
      
      await expect(adapter.setup(mockConfig)).rejects.toThrow(
        'Dependency installation failed: pip not found'
      );
    });
  });

  describe('edge cases', () => {
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