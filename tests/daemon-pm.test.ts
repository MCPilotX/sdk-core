/**
 * Daemon Process Manager Tests
 * Tests for src/daemon/pm.ts
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { ProcessManager, ServiceInstance } from '../src/daemon/pm';
import { NodeAdapter } from '../src/runtime/node';
import { PythonAdapter } from '../src/runtime/python';
import { DockerAdapter } from '../src/runtime/docker';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../src/runtime/node');
jest.mock('../src/runtime/python');
jest.mock('../src/runtime/docker');
jest.mock('../src/core/constants', () => ({
  CONFIG_PATH: '/mock/config/path.json',
}));

describe('ProcessManager', () => {
  let processManager: ProcessManager;
  let mockFs: any;
  let mockPath: any;
  let mockNodeAdapter: any;
  let mockPythonAdapter: any;
  let mockDockerAdapter: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    mockFs = fs as any;
    mockPath = path as any;
    mockNodeAdapter = NodeAdapter as any;
    mockPythonAdapter = PythonAdapter as any;
    mockDockerAdapter = DockerAdapter as any;
    
    // Mock fs.existsSync to return true (config exists)
    mockFs.existsSync.mockReturnValue(true);
    
    // Mock fs.readFileSync to return mock config
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      services: {
        instances: [
          {
            name: 'test-service-node',
            runtime: 'node',
            path: '/path/to/node/service',
          },
          {
            name: 'test-service-python',
            runtime: 'python',
            path: '/path/to/python/service',
          },
          {
            name: 'test-service-docker',
            runtime: 'docker',
            image: 'test-image:latest',
          },
        ],
      },
    }));
    
    // Create process manager
    processManager = new ProcessManager();
  });

  afterEach(() => {
    // Clean up if needed
  });

  describe('constructor and initialization', () => {
    it('should load services from configuration file', () => {
      expect(mockFs.existsSync).toHaveBeenCalledWith('/mock/config/path.json');
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/mock/config/path.json', 'utf-8');
      
      // Verify services were loaded
      const statuses = processManager.getStatuses();
      expect(statuses).toHaveLength(3);
      expect(statuses[0].name).toBe('test-service-node');
      expect(statuses[0].runtime).toBe('node');
      expect(statuses[0].status).toBe('stopped');
    });

    it('should handle missing configuration file', () => {
      // Mock fs.existsSync to return false
      mockFs.existsSync.mockReturnValue(false);
      
      // Recreate process manager
      processManager = new ProcessManager();
      
      const statuses = processManager.getStatuses();
      expect(statuses).toHaveLength(0); // No services loaded
    });
  });

  describe('service management', () => {
    it('should start a Node.js service', async () => {
      // Mock adapter with proper typing
      const mockAdapterInstance = {
        start: jest.fn().mockResolvedValue(undefined as any),
        call: jest.fn().mockResolvedValue({ result: { tools: [] } } as any),
        stop: jest.fn(),
      };
      mockNodeAdapter.mockImplementation(() => mockAdapterInstance);
      
      await processManager.startService('test-service-node');
      
      // Verify adapter was created and started
      expect(mockNodeAdapter).toHaveBeenCalledWith({
        name: 'test-service-node',
        cwd: '/path/to/node/service',
      });
      expect(mockAdapterInstance.start).toHaveBeenCalled();
      
      // Verify service status updated
      const statuses = processManager.getStatuses();
      const nodeService = statuses.find(s => s.name === 'test-service-node');
      expect(nodeService?.status).toBe('running');
    });

    it('should start a Python service', async () => {
      const mockAdapterInstance = {
        start: jest.fn().mockResolvedValue(undefined as any),
        call: jest.fn().mockResolvedValue({ result: { tools: [] } } as any),
        stop: jest.fn(),
      };
      mockPythonAdapter.mockImplementation(() => mockAdapterInstance);
      
      await processManager.startService('test-service-python');
      
      expect(mockPythonAdapter).toHaveBeenCalledWith({
        name: 'test-service-python',
        cwd: '/path/to/python/service',
      });
      expect(mockAdapterInstance.start).toHaveBeenCalled();
    });

    it('should start a Docker service', async () => {
      const mockAdapterInstance: any = {
        start: jest.fn().mockResolvedValue(undefined),
        call: jest.fn().mockResolvedValue({ result: { tools: [] } }),
        stop: jest.fn(),
      };
      mockDockerAdapter.mockImplementation(() => mockAdapterInstance);
      
      await processManager.startService('test-service-docker');
      
      expect(mockDockerAdapter).toHaveBeenCalledWith({
        name: 'test-service-docker',
        image: 'test-image:latest',
      });
      expect(mockAdapterInstance.start).toHaveBeenCalled();
    });

    it('should throw error for unknown runtime', async () => {
      // Add a service with unknown runtime
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        services: {
          instances: [
            {
              name: 'test-service-unknown',
              runtime: 'unknown',
              path: '/path/to/service',
            },
          ],
        },
      }));
      
      // Recreate process manager
      processManager = new ProcessManager();
      
      await expect(processManager.startService('test-service-unknown'))
        .rejects.toThrow('Runtime unknown not supported yet.');
    });

    it('should not start already running service', async () => {
      const mockAdapterInstance: any = {
        start: jest.fn().mockResolvedValue(undefined),
        call: jest.fn().mockResolvedValue({ result: { tools: [] } }),
        stop: jest.fn(),
      };
      mockNodeAdapter.mockImplementation(() => mockAdapterInstance);
      
      // Start service first time
      await processManager.startService('test-service-node');
      
      // Reset mock to track second call
      mockAdapterInstance.start.mockClear();
      
      // Try to start again
      await processManager.startService('test-service-node');
      
      // Should not call start again
      expect(mockAdapterInstance.start).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent service', async () => {
      await expect(processManager.startService('non-existent-service'))
        .rejects.toThrow('Service non-existent-service not found');
    });
  });

  describe('tool discovery', () => {
    it('should discover tools from running service', async () => {
      const mockTools = [
        { name: 'tool1', description: 'First tool' },
        { name: 'tool2', description: 'Second tool' },
      ];
      
      const mockAdapterInstance: any = {
        start: jest.fn().mockResolvedValue(undefined),
        call: jest.fn().mockResolvedValue({ result: { tools: mockTools } }),
        stop: jest.fn(),
      };
      mockNodeAdapter.mockImplementation(() => mockAdapterInstance);
      
      // Mock console.log to capture output
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await processManager.startService('test-service-node');
      
      // Verify tool discovery was called
      expect(mockAdapterInstance.call).toHaveBeenCalledWith('tools/list', {});
      
      // Verify tools were stored
      const tools = processManager.getServiceTools('test-service-node');
      expect(tools).toEqual(mockTools);
      
      // Verify console output
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Discovered 2 tools from test-service-node')
      );
      
      // Clean up
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle tool discovery failure', async () => {
      const mockAdapterInstance: any = {
        start: jest.fn().mockResolvedValue(undefined),
        call: jest.fn().mockRejectedValue(new Error('Discovery failed')),
        stop: jest.fn(),
      };
      mockNodeAdapter.mockImplementation(() => mockAdapterInstance);
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await processManager.startService('test-service-node');
      
      // Should not throw error, just log it
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to discover tools for test-service-node')
      );
      
      // Tools should be empty
      const tools = processManager.getServiceTools('test-service-node');
      expect(tools).toEqual([]);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('service calling', () => {
    it('should call service method', async () => {
      const mockResult = { success: true, data: 'test result' };
      const mockAdapterInstance: any = {
        start: jest.fn().mockResolvedValue(undefined),
        call: jest.fn()
          .mockResolvedValueOnce({ result: { tools: [] } }) // First call for discovery
          .mockResolvedValueOnce(mockResult), // Second call for actual method
        stop: jest.fn(),
      };
      mockNodeAdapter.mockImplementation(() => mockAdapterInstance);
      
      const result = await processManager.callService(
        'test-service-node',
        'testMethod',
        { param1: 'value1' }
      );
      
      expect(result).toBe(mockResult);
      expect(mockAdapterInstance.call).toHaveBeenCalledWith('tools/call', {
        name: 'testMethod',
        arguments: { param1: 'value1' },
      });
    });

    it('should start service if not running when calling', async () => {
      const mockResult = { success: true };
      const mockAdapterInstance: any = {
        start: jest.fn().mockResolvedValue(undefined),
        call: jest.fn()
          .mockResolvedValueOnce({ result: { tools: [] } })
          .mockResolvedValueOnce(mockResult),
        stop: jest.fn(),
      };
      mockNodeAdapter.mockImplementation(() => mockAdapterInstance);
      
      // Service is initially stopped
      const result = await processManager.callService(
        'test-service-node',
        'testMethod',
        {}
      );
      
      // Should have started the service
      expect(mockAdapterInstance.start).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it('should throw error for non-existent service when calling', async () => {
      await expect(processManager.callService('non-existent', 'method', {}))
        .rejects.toThrow('Service non-existent not found');
    });
  });

  describe('status and information', () => {
    it('should get running services', async () => {
      const mockAdapterInstance: any = {
        start: jest.fn().mockResolvedValue(undefined),
        call: jest.fn().mockResolvedValue({ result: { tools: [] } }),
        stop: jest.fn(),
      };
      mockNodeAdapter.mockImplementation(() => mockAdapterInstance);
      
      // Start one service
      await processManager.startService('test-service-node');
      
      const runningServices = processManager.getRunningServices();
      expect(runningServices).toEqual(['test-service-node']);
    });

    it('should get service tools', async () => {
      const mockTools = [{ name: 'testTool' }];
      const mockAdapterInstance: any = {
        start: jest.fn().mockResolvedValue(undefined),
        call: jest.fn().mockResolvedValue({ result: { tools: mockTools } }),
        stop: jest.fn(),
      };
      mockNodeAdapter.mockImplementation(() => mockAdapterInstance);
      
      await processManager.startService('test-service-node');
      
      const tools = processManager.getServiceTools('test-service-node');
      expect(tools).toEqual(mockTools);
      
      // Non-existent service should return empty array
      const nonExistentTools = processManager.getServiceTools('non-existent');
      expect(nonExistentTools).toEqual([]);
    });

    it('should get all service statuses', () => {
      const statuses = processManager.getStatuses();
      
      expect(statuses).toHaveLength(3);
      expect(statuses[0]).toEqual({
        name: 'test-service-node',
        runtime: 'node',
        status: 'stopped',
        error: undefined,
        toolsCount: 0,
      });
    });
  });

  describe('service stopping', () => {
    it('should stop a running service', async () => {
      const mockAdapterInstance: any = {
        start: jest.fn().mockResolvedValue(undefined),
        call: jest.fn().mockResolvedValue({ result: { tools: [] } }),
        stop: jest.fn(),
      };
      mockNodeAdapter.mockImplementation(() => mockAdapterInstance);
      
      // Mock console.log
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Start then stop
      await processManager.startService('test-service-node');
      processManager.stopService('test-service-node');
      
      // Verify stop was called
      expect(mockAdapterInstance.stop).toHaveBeenCalled();
      
      // Verify status updated
      const statuses = processManager.getStatuses();
      const nodeService = statuses.find(s => s.name === 'test-service-node');
      expect(nodeService?.status).toBe('stopped');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Service test-service-node stopped')
      );
      
      consoleLogSpy.mockRestore();
    });

    it('should handle stopping non-running service', () => {
      // Should not throw error
      expect(() => processManager.stopService('test-service-node')).not.toThrow();
    });

    it('should handle stopping non-existent service', () => {
      // Should not throw error
      expect(() => processManager.stopService('non-existent')).not.toThrow();
    });
  });
});