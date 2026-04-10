/**
 * Comprehensive tests for ProcessManager (pm.ts)
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { ProcessManager, ServiceInstance } from '../../../src/daemon/pm';
import { NodeAdapter } from '../../../src/runtime/node';
import { PythonAdapter } from '../../../src/runtime/python';
import { DockerAdapter } from '../../../src/runtime/docker';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

// Mock modules
jest.mock('fs');
jest.mock('path');
jest.mock('../../../src/runtime/node');
jest.mock('../../../src/runtime/python');
jest.mock('../../../src/runtime/docker');
jest.mock('../../../src/core/constants', () => ({
  CONFIG_PATH: '/tmp/test-config.json',
}));

describe('ProcessManager Comprehensive Tests', () => {
  let processManager: ProcessManager;
  let mockFs: any;
  let mockPath: any;
  let mockNodeAdapter: any;
  let mockPythonAdapter: any;
  let mockDockerAdapter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFs = fs as any;
    mockPath = path as any;
    
    // Mock path.join
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'));
    
    // Create mock adapters
    mockNodeAdapter = {
      getSpawnArgs: jest.fn().mockReturnValue({ command: 'node', args: ['index.js'] }),
      start: jest.fn().mockReturnValue(Promise.resolve()),
      call: jest.fn().mockImplementation((method: string, params: any) => {
        if (method === 'tools/list') {
          return Promise.resolve({ result: { tools: [] } });
        }
        return Promise.resolve({});
      }),
    };
    
    mockPythonAdapter = {
      getSpawnArgs: jest.fn().mockReturnValue({ command: 'python', args: ['app.py'] }),
      start: jest.fn().mockReturnValue(Promise.resolve()),
      call: jest.fn().mockImplementation((method: string, params: any) => {
        if (method === 'tools/list') {
          return Promise.resolve({ result: { tools: [] } });
        }
        return Promise.resolve({});
      }),
    };
    
    mockDockerAdapter = {
      getSpawnArgs: jest.fn().mockReturnValue({ command: 'docker', args: ['run', 'test-service'] }),
      start: jest.fn().mockReturnValue(Promise.resolve()),
      call: jest.fn().mockImplementation((method: string, params: any) => {
        if (method === 'tools/list') {
          return Promise.resolve({ result: { tools: [] } });
        }
        return Promise.resolve({});
      }),
    };
    
    // Mock adapter constructors to return our mock adapters
    (NodeAdapter as jest.MockedClass<typeof NodeAdapter>).mockImplementation(() => mockNodeAdapter);
    (PythonAdapter as jest.MockedClass<typeof PythonAdapter>).mockImplementation(() => mockPythonAdapter);
    (DockerAdapter as jest.MockedClass<typeof DockerAdapter>).mockImplementation(() => mockDockerAdapter);
    
    // Create ProcessManager instance
    processManager = new ProcessManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor and loadFromConfig', () => {
    it('should initialize with empty instances when config file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const pm = new ProcessManager();
      expect(mockFs.existsSync).toHaveBeenCalledWith('/tmp/test-config.json');
      // Instances should be empty
      expect((pm as any).instances.size).toBe(0);
    });

    it('should load instances from config file when it exists', () => {
      const mockConfig = {
        services: [
          {
            name: 'test-service-1',
            runtime: 'node',
            path: '/path/to/service1',
            status: 'stopped',
          },
          {
            name: 'test-service-2',
            runtime: 'python',
            path: '/path/to/service2',
            status: 'stopped',
          },
        ],
      };
      
      // Use jest.spyOn to mock the methods
      const existsSyncSpy = jest.spyOn(mockFs, 'existsSync').mockReturnValue(true);
      const readFileSyncSpy = jest.spyOn(mockFs, 'readFileSync').mockReturnValue(JSON.stringify(mockConfig));
      
      const pm = new ProcessManager();
      
      expect(readFileSyncSpy).toHaveBeenCalledWith('/tmp/test-config.json', 'utf-8');
      expect((pm as any).instances.size).toBe(2);
      
      const instance1 = (pm as any).instances.get('test-service-1');
      expect(instance1).toBeDefined();
      expect(instance1.name).toBe('test-service-1');
      expect(instance1.runtime).toBe('node');
      expect(instance1.status).toBe('stopped');
      
      const instance2 = (pm as any).instances.get('test-service-2');
      expect(instance2).toBeDefined();
      expect(instance2.name).toBe('test-service-2');
      expect(instance2.runtime).toBe('python');
      expect(instance2.status).toBe('stopped');
      
      // Restore original mocks
      existsSyncSpy.mockRestore();
      readFileSyncSpy.mockRestore();
    });

    it('should handle malformed config file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      // Should not throw, just log error
      expect(() => new ProcessManager()).not.toThrow();
      expect((processManager as any).instances.size).toBe(0);
    });

    it('should handle config file with no services', () => {
      const mockConfig = { services: [] };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
      
      const pm = new ProcessManager();
      expect((pm as any).instances.size).toBe(0);
    });
  });

  describe('startService', () => {
    beforeEach(() => {
      // Mock config file doesn't exist
      mockFs.existsSync.mockReturnValue(false);
      processManager = new ProcessManager();
    });

    it('should throw error when service does not exist', async () => {
      await expect(processManager.startService('non-existent-service')).rejects.toThrow(
        'Service non-existent-service not found'
      );
    });

    it('should start Node.js service successfully', async () => {
      // Add a Node.js service instance
      const instance: ServiceInstance = {
        name: 'node-service',
        runtime: 'node',
        path: '/path/to/node-service',
        adapter: mockNodeAdapter,
        status: 'stopped',
      };
      (processManager as any).instances.set('node-service', instance);
      
      await expect(processManager.startService('node-service')).resolves.not.toThrow();
      
      expect(mockNodeAdapter.start).toHaveBeenCalled();
      
      // Instance status should be updated
      expect(instance.status).toBe('running');
    });

    it('should start Python service successfully', async () => {
      // Add a Python service instance
      const instance: ServiceInstance = {
        name: 'python-service',
        runtime: 'python',
        path: '/path/to/python-service',
        adapter: mockPythonAdapter,
        status: 'stopped',
      };
      (processManager as any).instances.set('python-service', instance);
      
      await expect(processManager.startService('python-service')).resolves.not.toThrow();
      
      expect(mockPythonAdapter.start).toHaveBeenCalled();
      
      expect(instance.status).toBe('running');
    });

    it('should start Docker service successfully', async () => {
      // Add a Docker service instance
      const instance: ServiceInstance = {
        name: 'docker-service',
        runtime: 'docker',
        path: '/path/to/docker-service',
        image: 'nginx:latest',
        adapter: mockDockerAdapter,
        status: 'stopped',
      };
      (processManager as any).instances.set('docker-service', instance);
      
      await expect(processManager.startService('docker-service')).resolves.not.toThrow();
      
      expect(mockDockerAdapter.start).toHaveBeenCalled();
      
      expect(instance.status).toBe('running');
    });

    it('should handle service already running', async () => {
      // Add a running service instance
      const instance: ServiceInstance = {
        name: 'running-service',
        runtime: 'node',
        path: '/path/to/service',
        adapter: mockNodeAdapter,
        status: 'running',
      };
      (processManager as any).instances.set('running-service', instance);
      
      await expect(processManager.startService('running-service')).resolves.not.toThrow();
      
      // Should not call start again
      expect(mockNodeAdapter.start).not.toHaveBeenCalled();
      expect(instance.status).toBe('running'); // Status should remain running
    });

    it('should handle service in error state', async () => {
      // Add a service in error state
      const instance: ServiceInstance = {
        name: 'error-service',
        runtime: 'node',
        path: '/path/to/service',
        adapter: mockNodeAdapter,
        status: 'error',
        error: 'Previous error',
      };
      (processManager as any).instances.set('error-service', instance);
      
      await expect(processManager.startService('error-service')).resolves.not.toThrow();
      
      // Should try to start it again
      expect(mockNodeAdapter.start).toHaveBeenCalled();
      expect(instance.status).toBe('running');
      expect(instance.error).toBeUndefined(); // Error should be cleared
    });

    it('should handle adapter setup failure', async () => {
      // Add a Node.js service instance
      const instance: ServiceInstance = {
        name: 'failing-service',
        runtime: 'node',
        path: '/path/to/service',
        adapter: mockNodeAdapter,
        status: 'stopped',
      };
      (processManager as any).instances.set('failing-service', instance);
      
      // Mock start to fail
      mockNodeAdapter.start.mockRejectedValue(new Error('Start failed'));
      
      await expect(processManager.startService('failing-service')).rejects.toThrow('Start failed');
      
      // Instance should be in error state
      expect(instance.status).toBe('error');
      expect(instance.error).toBe('Start failed');
    });

    it('should handle service without adapter', async () => {
      // Add a service without adapter - startService should create a new adapter
      const instance: ServiceInstance = {
        name: 'no-adapter-service',
        runtime: 'node',
        path: '/path/to/service',
        adapter: null,
        status: 'stopped',
      };
      (processManager as any).instances.set('no-adapter-service', instance);
      
      // startService should create a new adapter when adapter is null
      await expect(processManager.startService('no-adapter-service')).resolves.not.toThrow();
      
      expect(mockNodeAdapter.start).toHaveBeenCalled();
      expect(instance.adapter).toBe(mockNodeAdapter);
      expect(instance.status).toBe('running');
    });
  });

  describe('discoverTools', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(false);
      processManager = new ProcessManager();
    });

    it('should throw error when service does not exist', async () => {
      await expect(processManager.discoverTools('non-existent-service')).rejects.toThrow(
        'Service non-existent-service not found'
      );
    });

    it('should discover tools for running service', async () => {
      // Mock tools data
      const mockTools = [
        { name: 'tool1', description: 'Test tool 1' },
        { name: 'tool2', description: 'Test tool 2' },
      ];
      
      // Add a running service instance
      const instance: ServiceInstance = {
        name: 'running-service',
        runtime: 'node',
        path: '/path/to/service',
        adapter: mockNodeAdapter,
        status: 'running',
      };
      (processManager as any).instances.set('running-service', instance);
      
      // Mock adapter.call to return tools
      mockNodeAdapter.call.mockResolvedValue({
        result: { tools: mockTools }
      });
      
      // discoverTools returns void, not the tools array
      await processManager.discoverTools('running-service');
      
      expect(instance.tools).toEqual(mockTools);
      expect(mockNodeAdapter.call).toHaveBeenCalledWith('tools/list', {});
    });

    it('should handle service not running', async () => {
      // Add a stopped service instance
      const instance: ServiceInstance = {
        name: 'stopped-service',
        runtime: 'node',
        path: '/path/to/service',
        adapter: mockNodeAdapter,
        status: 'stopped',
      };
      (processManager as any).instances.set('stopped-service', instance);
      
      await expect(processManager.discoverTools('stopped-service')).rejects.toThrow(
        'Service stopped-service is not running'
      );
    });

    it('should handle tools file not found', async () => {
      // Add a running service instance
      const instance: ServiceInstance = {
        name: 'running-service',
        runtime: 'node',
        path: '/path/to/service',
        adapter: mockNodeAdapter,
        status: 'running',
      };
      (processManager as any).instances.set('running-service', instance);
      
      // Mock adapter.call to throw error (simulating tools/list failure)
      mockNodeAdapter.call.mockRejectedValue(new Error('File not found'));
      
      await processManager.discoverTools('running-service');
      
      expect(instance.tools).toEqual([]);
    });

    it('should handle malformed tools file', async () => {
      // Add a running service instance
      const instance: ServiceInstance = {
        name: 'running-service',
        runtime: 'node',
        path: '/path/to/service',
        adapter: mockNodeAdapter,
        status: 'running',
      };
      (processManager as any).instances.set('running-service', instance);
      
      // Mock fs.readFileSync to return invalid JSON
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      await processManager.discoverTools('running-service');
      
      expect(instance.tools).toEqual([]);
    });

    it('should handle tools file with no tools array', async () => {
      // Add a running service instance
      const instance: ServiceInstance = {
        name: 'running-service',
        runtime: 'node',
        path: '/path/to/service',
        adapter: mockNodeAdapter,
        status: 'running',
      };
      (processManager as any).instances.set('running-service', instance);
      
      // Mock fs.readFileSync to return JSON without tools
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ other: 'data' }));
      
      await processManager.discoverTools('running-service');
      
      expect(instance.tools).toEqual([]);
    });
  });

    describe('callService', () => {
      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(false);
        processManager = new ProcessManager();
      });

      it('should throw error when service does not exist', async () => {
        await expect(processManager.callService('non-existent-service', 'testMethod')).rejects.toThrow(
          'Service non-existent-service not found'
        );
      });

      it('should start service when not running and call method', async () => {
        // Add a stopped service instance without adapter
        const instance: ServiceInstance = {
          name: 'stopped-service',
          runtime: 'node',
          path: '/path/to/service',
          adapter: null, // No adapter
          status: 'stopped',
        };
        (processManager as any).instances.set('stopped-service', instance);
        
        // Mock adapter.call to return success response for tools/call
        mockNodeAdapter.call.mockImplementation((method: string, params: any) => {
          if (method === 'tools/call') {
            return Promise.resolve({ result: 'success' });
          }
          // For tools/list during startService
          return Promise.resolve({ result: { tools: [] } });
        });
        
        // callService should start the service when it's not running
        const result = await processManager.callService('stopped-service', 'testMethod');
        
        // Service should be started
        expect(instance.status).toBe('running');
        expect(instance.adapter).toBe(mockNodeAdapter);
        // Verify adapter.call was called with correct parameters
        expect(mockNodeAdapter.call).toHaveBeenCalledWith('tools/call', {
          name: 'testMethod',
          arguments: {},
        });
        expect(result).toEqual({ result: 'success' });
      });

      it('should call service method successfully', async () => {
        // Add a running service instance
        const instance: ServiceInstance = {
          name: 'running-service',
          runtime: 'node',
          path: '/path/to/service',
          adapter: mockNodeAdapter,
          status: 'running',
        };
        (processManager as any).instances.set('running-service', instance);
        
        // Mock adapter.call to return success response
        mockNodeAdapter.call.mockResolvedValue({ result: 'success' });
        
        const params = { param1: 'value1', param2: 'value2' };
        const result = await processManager.callService('running-service', 'testTool', params);
        
        expect(result).toEqual({ result: 'success' });
        expect(mockNodeAdapter.call).toHaveBeenCalledWith('tools/call', {
          name: 'testTool',
          arguments: params,
        });
      });

      it('should handle adapter call error', async () => {
        // Add a running service instance
        const instance: ServiceInstance = {
          name: 'running-service',
          runtime: 'node',
          path: '/path/to/service',
          adapter: mockNodeAdapter,
          status: 'running',
        };
        (processManager as any).instances.set('running-service', instance);
        
        // Mock adapter.call to throw error
        mockNodeAdapter.call.mockRejectedValue(new Error('Adapter call failed'));
        
        await expect(processManager.callService('running-service', 'testTool')).rejects.toThrow(
          'Adapter call failed'
        );
      });

      it('should handle service without adapter after start', async () => {
        // Add a stopped service instance
        const instance: ServiceInstance = {
          name: 'stopped-service',
          runtime: 'node',
          path: '/path/to/service',
          adapter: null,
          status: 'stopped',
        };
        (processManager as any).instances.set('stopped-service', instance);
        
        // Mock NodeAdapter constructor to return an adapter with start that throws
        const failingAdapter = {
          start: jest.fn().mockRejectedValue(new Error('Failed to start adapter')),
          call: jest.fn(),
          getSpawnArgs: jest.fn(),
        };
        (NodeAdapter as jest.MockedClass<typeof NodeAdapter>).mockImplementation(() => failingAdapter as any);
        
        await expect(processManager.callService('stopped-service', 'testMethod')).rejects.toThrow(
          'Failed to start adapter'
        );
        
        // Service should be in error state
        expect(instance.status).toBe('error');
        expect(instance.error).toBe('Failed to start adapter');
      });
    });

  describe('EventEmitter functionality', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(false);
      processManager = new ProcessManager();
    });

    it('should emit service-started event when service starts successfully', async () => {
      const mockListener = jest.fn();
      processManager.on('service-started', mockListener);
      
      // Add a Node.js service instance
      const instance: ServiceInstance = {
        name: 'test-service',
        runtime: 'node',
        path: '/path/to/service',
        adapter: mockNodeAdapter,
        status: 'stopped',
      };
      (processManager as any).instances.set('test-service', instance);
      
      await processManager.startService('test-service');
      
      expect(mockListener).toHaveBeenCalledWith('test-service');
    });

    it('should emit service-error event when service fails to start', async () => {
      const mockListener = jest.fn();
      processManager.on('service-error', mockListener);
      
      // Add a Node.js service instance
      const instance: ServiceInstance = {
        name: 'test-service',
        runtime: 'node',
        path: '/path/to/service',
        adapter: mockNodeAdapter,
        status: 'stopped',
      };
      (processManager as any).instances.set('test-service', instance);
      
      // Mock start to fail
      mockNodeAdapter.start.mockRejectedValue(new Error('Start failed'));
      
      try {
        await processManager.startService('test-service');
      } catch (error) {
        // Expected to throw
      }
      
      expect(mockListener).toHaveBeenCalledWith('test-service', 'Start failed');
    });

    it('should emit tools-discovered event when tools are discovered', async () => {
      const mockListener = jest.fn();
      processManager.on('tools_discovered', mockListener);
      
      // Mock tools data
      const mockTools = [
        { name: 'tool1', description: 'Test tool 1' },
      ];
      
      // Add a running service instance
      const instance: ServiceInstance = {
        name: 'running-service',
        runtime: 'node',
        path: '/path/to/service',
        adapter: mockNodeAdapter,
        status: 'running',
      };
      (processManager as any).instances.set('running-service', instance);
      
      // Mock adapter.call to return tools
      mockNodeAdapter.call.mockResolvedValue({
        result: { tools: mockTools }
      });
      
      await processManager.discoverTools('running-service');
      
      expect(mockListener).toHaveBeenCalledWith({ service: 'running-service', tools: mockTools });
    });
  });

  describe('instance management', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(false);
      processManager = new ProcessManager();
    });

    it('should allow adding new service instances', () => {
      // This is an internal test to verify we can manipulate instances map
      const instance: ServiceInstance = {
        name: 'test-service',
        runtime: 'node',
        path: '/path/to/service',
        adapter: mockNodeAdapter,
        status: 'stopped',
      };
      
      (processManager as any).instances.set('test-service', instance);
      
      const retrievedInstance = (processManager as any).instances.get('test-service');
      expect(retrievedInstance).toBe(instance);
    });

    it('should handle multiple instances independently', async () => {
      // Add multiple service instances
      const instance1: ServiceInstance = {
        name: 'service1',
        runtime: 'node',
        path: '/path/to/service1',
        adapter: mockNodeAdapter,
        status: 'stopped',
      };
      
      const instance2: ServiceInstance = {
        name: 'service2',
        runtime: 'python',
        path: '/path/to/service2',
        adapter: mockPythonAdapter,
        status: 'stopped',
      };
      
      (processManager as any).instances.set('service1', instance1);
      (processManager as any).instances.set('service2', instance2);
      
      // Start service1
      await processManager.startService('service1');
      expect(instance1.status).toBe('running');
      expect(instance2.status).toBe('stopped'); // service2 should remain stopped
      
      // Start service2
      await processManager.startService('service2');
      expect(instance2.status).toBe('running');
    });
  });
});
