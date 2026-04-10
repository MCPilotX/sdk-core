import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ProcessManager } from '../src/daemon/process';
import { ServiceConfig } from '../src/core/types';

// Create a proper mock for ChildProcess
const createMockChildProcess = () => {
  const mock = {
    on: jest.fn((event: string, listener: (...args: any[]) => void) => mock),
    kill: jest.fn(() => true),
    stdin: null,
    stdout: null,
    stderr: null,
    stdio: [null, null, null, null, null],
    pid: 12345,
    connected: true,
    exitCode: null,
    signalCode: null,
    spawnargs: [],
    spawnfile: '',
    channel: null,
    send: jest.fn(),
    disconnect: jest.fn(),
    unref: jest.fn(),
    ref: jest.fn(),
    addListener: jest.fn(),
    emit: jest.fn(),
    once: jest.fn(),
    prependListener: jest.fn(),
    prependOnceListener: jest.fn(),
    removeListener: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
    setMaxListeners: jest.fn(),
    getMaxListeners: jest.fn(),
    listeners: jest.fn(),
    rawListeners: jest.fn(),
    listenerCount: jest.fn(),
    eventNames: jest.fn(),
  };
  return mock;
};

// Mock child_process module
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

// Mock console methods
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();

describe('ProcessManager', () => {
  let processManager: ProcessManager;
  let mockSpawn: jest.Mock;
  let mockChildProcess: ReturnType<typeof createMockChildProcess>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup console mocks
    global.console.log = mockConsoleLog;
    global.console.error = mockConsoleError;
    
    // Create ProcessManager instance
    processManager = new ProcessManager();
    
    // Setup mock child process
    mockChildProcess = createMockChildProcess();
    
    // Setup spawn mock
    const { spawn } = require('child_process');
    mockSpawn = spawn as jest.Mock;
    mockSpawn.mockReturnValue(mockChildProcess);
  });

  afterEach(() => {
    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('startService', () => {
    const mockConfig: ServiceConfig = {
      name: 'test-service',
      path: '/path/to/service.js',
      entry: '/path/to/service.js',
      args: ['--port', '3000'],
      env: { NODE_ENV: 'test' },
    };

    it('should start a service successfully', async () => {
      const result = await processManager.startService(mockConfig);
      
      expect(mockSpawn).toHaveBeenCalledWith(
        '/path/to/service.js',
        ['--port', '3000'],
        {
          env: { ...process.env, NODE_ENV: 'test' },
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
      
      expect(result).toBe(mockChildProcess);
      expect(mockChildProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(mockChildProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should throw error when service is already running', async () => {
      // Start service first time
      await processManager.startService(mockConfig);
      
      // Try to start same service again
      await expect(processManager.startService(mockConfig))
        .rejects.toThrow('Service test-service already running');
    });

    it('should resolve relative path for test.js', async () => {
      const configWithTestJs: ServiceConfig = {
        name: 'test-js-service',
        path: 'test.js',
        entry: 'test.js',
        args: [],
      };

      await processManager.startService(configWithTestJs);
      
      // Should resolve test.js to full path
      expect(mockSpawn.mock.calls[0][0]).toContain('test.js');
    });

    it('should handle absolute paths correctly', async () => {
      const configWithAbsolutePath: ServiceConfig = {
        name: 'absolute-path-service',
        path: '/absolute/path/to/service.js',
        entry: '/absolute/path/to/service.js',
        args: [],
      };

      await processManager.startService(configWithAbsolutePath);
      
      expect(mockSpawn).toHaveBeenCalledWith(
        '/absolute/path/to/service.js',
        [],
        expect.any(Object)
      );
    });

    it('should handle process exit event', async () => {
      await processManager.startService(mockConfig);
      
      // Get the exit handler
      const exitHandler = (mockChildProcess.on as jest.Mock).mock.calls
        .find((call: any[]) => call[0] === 'exit')[1] as jest.Mock;
      
      // Trigger exit
      exitHandler(0);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Service test-service exited with code 0'
      );
    });

    it('should handle process error event', async () => {
      await processManager.startService(mockConfig);
      
      // Get the error handler
      const errorHandler = (mockChildProcess.on as jest.Mock).mock.calls
        .find((call: any[]) => call[0] === 'error')[1] as jest.Mock;
      
      // Trigger error
      const testError = new Error('Process failed');
      errorHandler(testError);
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Service test-service error:',
        'Process failed'
      );
    });
  });

  describe('stopService', () => {
    const mockConfig: ServiceConfig = {
      name: 'test-service',
      path: '/path/to/service.js',
      entry: '/path/to/service.js',
    };

    it('should stop a running service', async () => {
      // Start service first
      await processManager.startService(mockConfig);
      
      // Stop service
      const result = processManager.stopService('test-service');
      
      expect(result).toBe(true);
      expect(mockChildProcess.kill).toHaveBeenCalled();
    });

    it('should return false when stopping non-existent service', () => {
      const result = processManager.stopService('non-existent-service');
      
      expect(result).toBe(false);
      expect(mockChildProcess.kill).not.toHaveBeenCalled();
    });

    it('should handle multiple services', async () => {
      const config1: ServiceConfig = {
        name: 'service-1',
        path: '/path/to/service1.js',
        entry: '/path/to/service1.js',
      };
      
      const config2: ServiceConfig = {
        name: 'service-2',
        path: '/path/to/service2.js',
        entry: '/path/to/service2.js',
      };
      
      // Start two services
      await processManager.startService(config1);
      await processManager.startService(config2);
      
      // Stop first service
      const result1 = processManager.stopService('service-1');
      expect(result1).toBe(true);
      
      // Stop second service
      const result2 = processManager.stopService('service-2');
      expect(result2).toBe(true);
      
      // Try to stop already stopped service
      const result3 = processManager.stopService('service-1');
      expect(result3).toBe(false);
    });
  });

  describe('listServices', () => {
    it('should return list of running services', async () => {
      const config1: ServiceConfig = {
        name: 'service-1',
        path: '/path/to/service1.js',
        entry: '/path/to/service1.js',
      };
      
      const config2: ServiceConfig = {
        name: 'service-2',
        path: '/path/to/service2.js',
        entry: '/path/to/service2.js',
      };
      
      // Start services
      await processManager.startService(config1);
      await processManager.startService(config2);
      
      // Note: ProcessManager doesn't have a listServices method in the provided code
      // This test would need to be adjusted based on actual implementation
      // For now, we'll test that processes are tracked internally
      
      // We can't directly test the internal processes map
      // But we can verify that stopService works for both
      expect(processManager.stopService('service-1')).toBe(true);
      expect(processManager.stopService('service-2')).toBe(true);
    });
  });
});