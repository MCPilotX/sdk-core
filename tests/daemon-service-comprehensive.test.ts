import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ServiceManager, ServiceInfo } from '../src/daemon/service';
import { ChildProcess } from 'child_process';

// Mock constants
jest.mock('../src/core/constants', () => ({
  CONFIG_PATH: '/mock/config.json',
  SERVERS_DIR: '/mock/servers',
  LOGS_DIR: '/mock/logs',
  MCPILOT_HOME: '/mock/.mcpilot',
  MCPILOT_DIR: '/mock/.mcpilot',
  SOCKET_PATH: '/mock/run/mcp.sock',
  VENVS_DIR: '/mock/venvs',
  DEFAULT_CONFIG: {
    ai: {
      enabled: true,
      provider: 'deepseek',
      model: 'deepseek-v3',
      apiKey: '',
      timeout: 30000,
      maxTokens: 2048,
      temperature: 0.7,
      embeddingProvider: '',
      embeddingApiKey: '',
      embeddingModel: '',
      embeddingEndpoint: '',
      useLocalEmbeddings: false,
      useVectorSearch: true,
      transformersTimeout: 5000,
      fallbackMode: 'lightweight',
    },
    registry: {
      preferred: 'gitee-mcp',
    },
    services: {
      autoStart: ['filesystem'],
      defaultTimeout: 60000,
    },
  },
}));

// Mock logger
jest.mock('../src/core/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(() => JSON.stringify({ services: { instances: [] } })),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  openSync: jest.fn(() => 123),
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn(),
    pipe: jest.fn(),
  })),
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/')),
  basename: jest.fn((filePath: string) => 'service'),
}));

// Mock child_process module
jest.mock('child_process', () => ({
  spawn: jest.fn(() => {
    const mockProcess = {
      pid: 12345,
      stdout: { pipe: jest.fn() },
      stderr: { pipe: jest.fn() },
      kill: jest.fn(),
      exitCode: null,
      on: jest.fn(),
    };
    return mockProcess;
  }),
}));

  describe('ServiceManager - Comprehensive Coverage Tests', () => {
    let manager: ServiceManager;
    let mockFs: any;
    let mockPath: any;
    let mockChildProcess: any;

    beforeEach(() => {
      jest.clearAllMocks();
      manager = new ServiceManager();
      
      // Get mock instances
      mockFs = require('fs');
      mockPath = require('path');
      mockChildProcess = require('child_process');
      
      // Reset default mocks
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.includes('/path/to/') || path === '/mock/config.json';
      });
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ services: { instances: [] } }));
      mockFs.readdirSync.mockReturnValue([]);
      mockPath.basename.mockImplementation((filePath: string) => {
        if (filePath.includes('service1')) return 'service1';
        if (filePath.includes('service2')) return 'service2';
        if (filePath.includes('service3')) return 'service3';
        if (filePath.includes('node-service')) return 'node-service';
        if (filePath.includes('python-service')) return 'python-service';
        if (filePath.includes('docker-service')) return 'docker-service';
        if (filePath.includes('custom-service')) return 'custom-service';
        if (filePath.includes('env-service')) return 'env-service';
        if (filePath.includes('web-service')) return 'web-service';
        if (filePath.includes('custom')) return 'custom';
        return 'service';
      });
    });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('restartService', () => {
    it('should restart a running service', async () => {
      // Install and start a service
      await manager.installService('/path/to/service', 'test-service');
      await manager.startService('test-service');
      
      // Mock the stop and start process
      const stopSpy = jest.spyOn(manager as any, 'stopService');
      const startSpy = jest.spyOn(manager as any, 'startService');
      
      // Restart the service
      const result = await manager.restartService('test-service');
      
      expect(stopSpy).toHaveBeenCalledWith('test-service');
      expect(startSpy).toHaveBeenCalledWith('test-service');
      expect(result.status).toBe('running');
    });

    it('should handle restart of stopped service', async () => {
      // Install but don't start the service
      await manager.installService('/path/to/service', 'test-service');
      
      // Restart should start the service
      const result = await manager.restartService('test-service');
      expect(result.status).toBe('running');
    });

    it('should throw error when restarting non-existent service', async () => {
      await expect(manager.restartService('nonexistent')).rejects.toThrow(
        'Service nonexistent is not installed'
      );
    });
  });

  describe('uninstallService', () => {
    it('should uninstall a stopped service', async () => {
      await manager.installService('/path/to/service', 'test-service');
      
      // Service should exist before uninstall
      expect(manager.getService('test-service')).toBeDefined();
      
      await manager.uninstallService('test-service');
      
      // Service should not exist after uninstall
      expect(manager.getService('test-service')).toBeUndefined();
    });

    it('should stop and uninstall a running service', async () => {
      await manager.installService('/path/to/service', 'test-service');
      await manager.startService('test-service');
      
      // Service should be running
      expect(manager.getService('test-service')?.status).toBe('running');
      
      await manager.uninstallService('test-service');
      
      // Service should be removed
      expect(manager.getService('test-service')).toBeUndefined();
      expect(mockChildProcess.spawn.mock.results[0].value.kill).toHaveBeenCalled();
    });

    it('should throw error when uninstalling non-existent service', async () => {
      await expect(manager.uninstallService('nonexistent')).rejects.toThrow(
        'Service nonexistent is not installed'
      );
    });
  });

  describe('getRunningServices', () => {
    it('should return empty array when no services are running', () => {
      const runningServices = manager.getRunningServices();
      expect(runningServices).toEqual([]);
    });

    it('should return only running services', async () => {
      // Install two services
      await manager.installService('/path/to/service1', 'service1');
      await manager.installService('/path/to/service2', 'service2');
      
      // Start only one service
      await manager.startService('service1');
      
      const runningServices = manager.getRunningServices();
      
      expect(runningServices).toHaveLength(1);
      expect(runningServices[0].name).toBe('service1');
      expect(runningServices[0].status).toBe('running');
    });

    it('should return multiple running services', async () => {
      // Install and start multiple services
      await manager.installService('/path/to/service1', 'service1');
      await manager.installService('/path/to/service2', 'service2');
      
      await manager.startService('service1');
      await manager.startService('service2');
      
      const runningServices = manager.getRunningServices();
      
      expect(runningServices).toHaveLength(2);
      expect(runningServices.map(s => s.name)).toEqual(['service1', 'service2']);
      expect(runningServices.every(s => s.status === 'running')).toBe(true);
    });
  });

  describe('getServiceStats', () => {
    it('should return service stats for installed service', async () => {
      await manager.installService('/path/to/service', 'test-service');
      
      const stats = await manager.getServiceStats('test-service');
      
      expect(stats).toMatchObject({
        name: 'test-service',
        status: 'installed',
        runtime: 'node',
        isProcessAlive: false,
        uptime: 0,
      });
      expect(stats.installedAt).toBeDefined();
      expect(stats.pid).toBeUndefined();
      expect(stats.startedAt).toBeUndefined();
      expect(stats.stoppedAt).toBeUndefined();
    });

    it('should return service stats for running service', async () => {
      await manager.installService('/path/to/service', 'test-service');
      await manager.startService('test-service');
      
      const stats = await manager.getServiceStats('test-service');
      
      expect(stats).toMatchObject({
        name: 'test-service',
        status: 'running',
        pid: 12345,
        runtime: 'node',
        isProcessAlive: true,
      });
      expect(stats.installedAt).toBeDefined();
      expect(stats.startedAt).toBeDefined();
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when getting stats for non-existent service', async () => {
      await expect(manager.getServiceStats('nonexistent')).rejects.toThrow(
        'Service nonexistent not found'
      );
    });
  });

  describe('spawnService - runtime coverage', () => {
    beforeEach(() => {
      // Reset spawn mock
      mockChildProcess.spawn.mockClear();
    });

    it('should spawn node service correctly', async () => {
      await manager.installService('/path/to/node-service', 'node-service');
      const service = manager.getService('node-service')!;
      
      // Mock service with node runtime
      service.runtime = 'node';
      service.config.entry = 'index.js';
      service.config.args = ['--port', '3000'];
      
      const process = (manager as any).spawnService(service);
      
      expect(mockChildProcess.spawn).toHaveBeenCalledWith(
        'node',
        ['index.js', '--port', '3000'],
        expect.objectContaining({
          cwd: '/path/to/node-service',
          stdio: ['pipe', 'pipe', 'pipe'],
        })
      );
      expect(process.pid).toBe(12345);
    });

    it('should spawn python service correctly', async () => {
      await manager.installService('/path/to/python-service', 'python-service');
      const service = manager.getService('python-service')!;
      
      // Mock service with python runtime
      service.runtime = 'python';
      service.config.entry = 'main.py';
      
      (manager as any).spawnService(service);
      
      expect(mockChildProcess.spawn).toHaveBeenCalledWith(
        'python3',
        ['main.py'],
        expect.any(Object)
      );
    });

    it('should spawn docker service correctly', async () => {
      await manager.installService('/path/to/docker-service', 'docker-service');
      const service = manager.getService('docker-service')!;
      
      // Mock service with docker runtime
      service.runtime = 'docker';
      service.config.image = 'my-image:latest';
      service.config.args = ['-p', '8080:80'];
      
      (manager as any).spawnService(service);
      
      expect(mockChildProcess.spawn).toHaveBeenCalledWith(
        'docker',
        ['run', '-d', '--rm', '--name', 'mcp-docker-service', 'my-image:latest', '-p', '8080:80'],
        expect.any(Object)
      );
    });

    it('should spawn service with default runtime', async () => {
      await manager.installService('/path/to/custom-service', 'custom-service');
      const service = manager.getService('custom-service')!;
      
      // Mock service with unknown runtime
      service.runtime = 'custom';
      service.config.entry = './custom-binary';
      service.config.args = ['--config', 'config.yaml'];
      
      (manager as any).spawnService(service);
      
      expect(mockChildProcess.spawn).toHaveBeenCalledWith(
        './custom-binary',
        ['--config', 'config.yaml'],
        expect.any(Object)
      );
    });

    it('should include environment variables when spawning', async () => {
      await manager.installService('/path/to/service', 'env-service');
      const service = manager.getService('env-service')!;
      
      service.config.env = { NODE_ENV: 'test', API_KEY: 'secret' };
      
      (manager as any).spawnService(service);
      
      const spawnCall = mockChildProcess.spawn.mock.calls[0];
      const options = spawnCall[2];
      
      expect(options.env).toMatchObject({
        NODE_ENV: 'test',
        API_KEY: 'secret',
      });
    });
  });

  describe('detectEntryPoint', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReset();
      mockFs.readdirSync.mockReset();
    });

    it('should detect index.js as entry point', () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.includes('index.js');
      });
      
      const entryPoint = (manager as any).detectEntryPoint('/path/to/service');
      
      expect(entryPoint).toBe('index.js');
      expect(mockFs.existsSync).toHaveBeenCalledWith('/path/to/service/index.js');
    });

    it('should detect main.py as entry point', () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.includes('main.py');
      });
      
      const entryPoint = (manager as any).detectEntryPoint('/path/to/service');
      
      expect(entryPoint).toBe('main.py');
    });

    it('should return first found file when no standard entry points exist', () => {
      // No standard entry points exist
      mockFs.existsSync.mockReturnValue(false);
      
      // Mock readdir to return some files
      mockFs.readdirSync.mockReturnValue(['config.json', 'app.js', 'utils.ts']);
      
      const entryPoint = (manager as any).detectEntryPoint('/path/to/service');
      
      expect(entryPoint).toBe('app.js');
    });

    it('should return index.js as fallback when no suitable files found', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue(['README.md', 'LICENSE', '.gitignore']);
      
      const entryPoint = (manager as any).detectEntryPoint('/path/to/service');
      
      expect(entryPoint).toBe('index.js');
    });

    it('should check all possible entry points in order', () => {
      const existsCalls: string[] = [];
      mockFs.existsSync.mockImplementation((path: string) => {
        existsCalls.push(path);
        return false;
      });
      
      // Set readdirSync to return an empty array to avoid undefined error
      mockFs.readdirSync.mockReturnValue([]);
      
      (manager as any).detectEntryPoint('/path/to/service');
      
      // Should check all standard entry points
      expect(existsCalls).toContain('/path/to/service/index.js');
      expect(existsCalls).toContain('/path/to/service/main.js');
      expect(existsCalls).toContain('/path/to/service/app.js');
      expect(existsCalls).toContain('/path/to/service/server.js');
      expect(existsCalls).toContain('/path/to/service/index.ts');
      expect(existsCalls).toContain('/path/to/service/main.ts');
      expect(existsCalls).toContain('/path/to/service/app.ts');
      expect(existsCalls).toContain('/path/to/service/server.ts');
      expect(existsCalls).toContain('/path/to/service/main.py');
      expect(existsCalls).toContain('/path/to/service/app.py');
      expect(existsCalls).toContain('/path/to/service/server.py');
      expect(existsCalls).toContain('/path/to/service/main.go');
      expect(existsCalls).toContain('/path/to/service/server.go');
      expect(existsCalls).toContain('/path/to/service/main.rs');
      expect(existsCalls).toContain('/path/to/service/lib.rs');
    });
  });

  describe('getProcessMemoryUsage', () => {
    it('should return undefined when process is undefined', () => {
      const memoryUsage = (manager as any).getProcessMemoryUsage(undefined);
      expect(memoryUsage).toBeUndefined();
    });

    it('should return undefined when process has no pid', () => {
      const mockProcess = { exitCode: null };
      const memoryUsage = (manager as any).getProcessMemoryUsage(mockProcess);
      expect(memoryUsage).toBeUndefined();
    });

    it('should return 0 for valid process (simplified implementation)', () => {
      const mockProcess = { pid: 12345, exitCode: null };
      const memoryUsage = (manager as any).getProcessMemoryUsage(mockProcess);
      expect(memoryUsage).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return false for non-existent service', async () => {
      const isHealthy = await manager.healthCheck('nonexistent');
      expect(isHealthy).toBe(false);
    });

    it('should return false for installed but not running service', async () => {
      await manager.installService('/path/to/service', 'test-service');
      
      const isHealthy = await manager.healthCheck('test-service');
      expect(isHealthy).toBe(false);
    });

    it('should return false for service with dead process', async () => {
      await manager.installService('/path/to/service', 'test-service');
      await manager.startService('test-service');
      
      // Mock process with exit code (dead process)
      const mockProcess = mockChildProcess.spawn.mock.results[0].value;
      mockProcess.exitCode = 1;
      
      const isHealthy = await manager.healthCheck('test-service');
      expect(isHealthy).toBe(false);
    });

    it('should return true for running service with alive process', async () => {
      await manager.installService('/path/to/service', 'test-service');
      await manager.startService('test-service');
      
      // Mock process with no exit code (alive process)
      const mockProcess = mockChildProcess.spawn.mock.results[0].value;
      mockProcess.exitCode = null;
      
      const isHealthy = await manager.healthCheck('test-service');
      expect(isHealthy).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should stop all running services', async () => {
      // Install and start multiple services
      await manager.installService('/path/to/service1', 'service1');
      await manager.installService('/path/to/service2', 'service2');
      await manager.installService('/path/to/service3', 'service3');
      
      // Start two services
      await manager.startService('service1');
      await manager.startService('service2');
      // service3 remains stopped
      
      // Verify services are running before cleanup
      expect(manager.getService('service1')?.status).toBe('running');
      expect(manager.getService('service2')?.status).toBe('running');
      expect(manager.getService('service3')?.status).toBe('installed');
      
      // Run cleanup
      await manager.cleanup();
      
      // Verify all services are stopped after cleanup
      expect(manager.getService('service1')?.status).toBe('stopped');
      expect(manager.getService('service2')?.status).toBe('stopped');
      expect(manager.getService('service3')?.status).toBe('installed'); // Should remain installed
      
      // Verify kill was called for running processes
      expect(mockChildProcess.spawn.mock.results[0].value.kill).toHaveBeenCalled();
      expect(mockChildProcess.spawn.mock.results[1].value.kill).toHaveBeenCalled();
    });

    it('should handle cleanup when no services are running', async () => {
      // Install services but don't start them
      await manager.installService('/path/to/service1', 'service1');
      await manager.installService('/path/to/service2', 'service2');
      
      // Verify services are installed but not running
      expect(manager.getService('service1')?.status).toBe('installed');
      expect(manager.getService('service2')?.status).toBe('installed');
      
      // Run cleanup - should not throw errors
      await expect(manager.cleanup()).resolves.not.toThrow();
      
      // Services should still be installed
      expect(manager.getService('service1')?.status).toBe('installed');
      expect(manager.getService('service2')?.status).toBe('installed');
    });

    it('should handle cleanup when no services exist', async () => {
      // No services installed
      expect(manager.getAllServices()).toEqual([]);
      
      // Run cleanup - should not throw errors
      await expect(manager.cleanup()).resolves.not.toThrow();
    });
  });

  describe('edge cases and integration', () => {
    it('should handle service with port information', async () => {
      await manager.installService('/path/to/service', 'web-service');
      const service = manager.getService('web-service')!;
      
      // Add port information
      service.port = 8080;
      
      const stats = await manager.getServiceStats('web-service');
      expect(stats).toMatchObject({
        name: 'web-service',
        port: 8080,
      });
    });

    it('should handle service with custom runtime detection', async () => {
      // Mock detectEntryPoint to return custom entry
      const detectSpy = jest.spyOn(manager as any, 'detectEntryPoint');
      detectSpy.mockReturnValue('custom-entry.js');
      
      const serviceInfo = await manager.installService('/path/to/custom', 'custom-service');
      
      expect(serviceInfo.config.entry).toBe('custom-entry.js');
      expect(detectSpy).toHaveBeenCalledWith('/path/to/custom');
    });

    it('should handle concurrent service operations', async () => {
      // Test that multiple operations can happen concurrently
      const installPromises = [
        manager.installService('/path/to/service1', 'service1'),
        manager.installService('/path/to/service2', 'service2'),
        manager.installService('/path/to/service3', 'service3'),
      ];
      
      await Promise.all(installPromises);
      
      expect(manager.getAllServices()).toHaveLength(3);
      expect(manager.getService('service1')).toBeDefined();
      expect(manager.getService('service2')).toBeDefined();
      expect(manager.getService('service3')).toBeDefined();
    });

    it('should preserve service state across operations', async () => {
      // Install and start a service
      await manager.installService('/path/to/service', 'test-service');
      await manager.startService('test-service');
      
      // Get initial state
      const initialService = manager.getService('test-service')!;
      const initialStats = await manager.getServiceStats('test-service');
      
      // Perform some operations
      await manager.stopService('test-service');
      await manager.restartService('test-service');
      
      // Get updated state
      const updatedService = manager.getService('test-service')!;
      const updatedStats = await manager.getServiceStats('test-service');
      
      // Verify state consistency
      expect(updatedService.name).toBe(initialService.name);
      expect(updatedService.path).toBe(initialService.path);
      expect(updatedService.runtime).toBe(initialService.runtime);
      expect(updatedStats.name).toBe(initialStats.name);
      expect(updatedStats.runtime).toBe(initialStats.runtime);
      
      // Status should be running after restart
      expect(updatedService.status).toBe('running');
      expect(updatedStats.status).toBe('running');
    });
  });
});
