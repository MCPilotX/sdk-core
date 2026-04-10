import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ServiceManager } from '../src/daemon/service';

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

describe('ServiceManager - Simple Tests', () => {
  let manager: ServiceManager;
  let mockFs: any;
  let mockPath: any;
  let mockChildProcess: any;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new ServiceManager();
    mockFs = require('fs');
    mockPath = require('path');
    mockChildProcess = require('child_process');
  });

  describe('loadServices', () => {
    it('should load services from config file when it exists', () => {
      (mockFs.existsSync as jest.Mock).mockReturnValue(true);
      (mockFs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        services: {
          instances: [
            {
              name: 'existing-service',
              path: '/path/to/existing',
              runtime: 'node',
              status: 'installed',
              installedAt: '2024-01-01T00:00:00.000Z',
              config: { name: 'existing-service', path: '/path/to/existing', runtime: 'node', entry: 'index.js' }
            }
          ]
        }
      }));

      const newManager = new ServiceManager();
      const service = newManager.getService('existing-service');
      expect(service).toBeDefined();
      expect(service?.name).toBe('existing-service');
    });

    it('should not load services when config file does not exist', () => {
      (mockFs.existsSync as jest.Mock).mockReturnValue(false);
      const newManager = new ServiceManager();
      const services = newManager.getAllServices();
      expect(services).toEqual([]);
    });
  });

  describe('basic operations', () => {
    beforeEach(() => {
      (mockFs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path === '/path/to/service';
      });
    });

    it('should install service', async () => {
      const serviceInfo = await manager.installService('/path/to/service', 'test-service');
      expect(serviceInfo.name).toBe('test-service');
      expect(serviceInfo.status).toBe('installed');
    });

    it('should start service', async () => {
      await manager.installService('/path/to/service', 'test-service');
      const serviceInfo = await manager.startService('test-service');
      expect(serviceInfo.status).toBe('running');
      expect(serviceInfo.pid).toBe(12345);
    });

    it('should handle service already running when starting', async () => {
      await manager.installService('/path/to/service', 'test-service');
      await manager.startService('test-service');
      
      // Try to start again - should just return the service
      const serviceInfo = await manager.startService('test-service');
      expect(serviceInfo.status).toBe('running');
    });

    it('should stop service', async () => {
      await manager.installService('/path/to/service', 'test-service');
      await manager.startService('test-service');
      const serviceInfo = await manager.stopService('test-service');
      expect(serviceInfo.status).toBe('stopped');
    });

    it('should handle service not running when stopping', async () => {
      await manager.installService('/path/to/service', 'test-service');
      // Don't start the service, just try to stop it
      const serviceInfo = await manager.stopService('test-service');
      expect(serviceInfo.status).toBe('installed');
    });

    it('should get service', () => {
      const service = manager.getService('nonexistent');
      expect(service).toBeUndefined();
    });

    it('should get all services', () => {
      const services = manager.getAllServices();
      expect(services).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should throw error when installing non-existent service', async () => {
      (mockFs.existsSync as jest.Mock).mockReturnValue(false);
      await expect(manager.installService('/nonexistent/path')).rejects.toThrow(
        'Service path not found: /nonexistent/path'
      );
    });

    it('should throw error when installing already installed service', async () => {
      (mockFs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path === '/path/to/service';
      });

      await manager.installService('/path/to/service', 'test-service');
      await expect(manager.installService('/path/to/service', 'test-service')).rejects.toThrow(
        'Service test-service is already installed'
      );
    });

    it('should throw error when starting non-installed service', async () => {
      await expect(manager.startService('nonexistent')).rejects.toThrow(
        'Service nonexistent is not installed'
      );
    });

    it('should handle error when starting service fails', async () => {
      (mockFs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path === '/path/to/service';
      });

      // Mock spawn to throw an error
      (mockChildProcess.spawn as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to spawn process');
      });

      await manager.installService('/path/to/service', 'test-service');
      
      await expect(manager.startService('test-service')).rejects.toThrow(
        'Failed to start service test-service: Failed to spawn process'
      );
    });

    it('should throw error when stopping non-installed service', async () => {
      await expect(manager.stopService('nonexistent')).rejects.toThrow(
        'Service nonexistent is not installed'
      );
    });
  });

  describe('service logs', () => {
    it('should get service logs', async () => {
      (mockFs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path === '/mock/logs/test-service/stdout.log';
      });
      (mockFs.readFileSync as jest.Mock).mockReturnValue('log line 1\nlog line 2');

      const logs = await manager.getServiceLogs('test-service');
      expect(logs).toBe('log line 1\nlog line 2');
    });

    it('should handle missing log file', async () => {
      (mockFs.existsSync as jest.Mock).mockReturnValue(false);
      const logs = await manager.getServiceLogs('test-service');
      expect(logs).toBe('No logs found for service test-service');
    });

    it('should handle error when reading log file fails', async () => {
      (mockFs.existsSync as jest.Mock).mockReturnValue(true);
      (mockFs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const logs = await manager.getServiceLogs('test-service');
      expect(logs).toBe('Failed to read logs: Permission denied');
    });
  });
});