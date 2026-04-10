/**
 * Integration Process Manager Tests
 * Simplified tests for src/daemon/pm.ts using dependency injection
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProcessManager } from '../src/daemon/pm';

// Mock the fs module before importing ProcessManager
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Import the mocked fs module
const mockFs = require('fs');

// Mock constants
jest.mock('../src/core/constants', () => ({
  CONFIG_PATH: '/test/config/path.json',
}));

// Mock runtime adapters with simpler implementations
jest.mock('../src/runtime/node', () => ({
  NodeAdapter: class MockNodeAdapter {
    constructor(options: any) {
      // Store options for verification
      this.options = options;
    }
    options: any;
    start = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    call = jest.fn<() => Promise<any>>().mockResolvedValue({ result: { tools: [] } });
    stop = jest.fn();
  },
}));

jest.mock('../src/runtime/python', () => ({
  PythonAdapter: class MockPythonAdapter {
    constructor(options: any) {
      this.options = options;
    }
    options: any;
    start = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    call = jest.fn<() => Promise<any>>().mockResolvedValue({ result: { tools: [] } });
    stop = jest.fn();
  },
}));

jest.mock('../src/runtime/docker', () => ({
  DockerAdapter: class MockDockerAdapter {
    constructor(options: any) {
      this.options = options;
    }
    options: any;
    start = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    call = jest.fn<() => Promise<any>>().mockResolvedValue({ result: { tools: [] } });
    stop = jest.fn();
  },
}));

describe('ProcessManager Integration Tests', () => {
  let processManager: ProcessManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock behavior
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      services: {
        instances: [
          {
            name: 'test-service-node',
            runtime: 'node',
            path: '/path/to/node/service',
          },
        ],
      },
    }));
    
    processManager = new ProcessManager();
  });

  describe('Basic functionality', () => {
    it('should load services from configuration', () => {
      const statuses = processManager.getStatuses();
      expect(statuses).toHaveLength(1);
      expect(statuses[0].name).toBe('test-service-node');
      expect(statuses[0].runtime).toBe('node');
      expect(statuses[0].status).toBe('stopped');
    });

    it('should return empty array for non-existent service tools', () => {
      const tools = processManager.getServiceTools('non-existent-service');
      expect(tools).toEqual([]);
    });

    it('should get empty running services initially', () => {
      const runningServices = processManager.getRunningServices();
      expect(runningServices).toEqual([]);
    });

    it('should handle stopping non-existent service without error', () => {
      expect(() => processManager.stopService('non-existent')).not.toThrow();
    });
  });

  describe('Configuration handling', () => {
    it('should handle missing configuration file', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      // Recreate process manager with missing config
      processManager = new ProcessManager();
      
      const statuses = processManager.getStatuses();
      expect(statuses).toEqual([]);
    });

    it('should reload configuration on status check', () => {
      // First call
      const statuses1 = processManager.getStatuses();
      expect(statuses1).toHaveLength(1);
      
      // Change mock to return different config
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        services: {
          instances: [
            {
              name: 'new-service',
              runtime: 'python',
              path: '/new/path',
            },
          ],
        },
      }));
      
      // Second call should reload
      const statuses2 = processManager.getStatuses();
      expect(statuses2).toHaveLength(1);
      expect(statuses2[0].name).toBe('new-service');
    });
  });

  describe('Error handling', () => {
    it('should handle JSON parse errors in configuration', () => {
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      // Should not throw error
      expect(() => {
        processManager = new ProcessManager();
      }).not.toThrow();
      
      const statuses = processManager.getStatuses();
      expect(statuses).toEqual([]);
    });

    it('should handle missing services in configuration', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        // No services key
      }));
      
      processManager = new ProcessManager();
      
      const statuses = processManager.getStatuses();
      expect(statuses).toEqual([]);
    });
  });
});