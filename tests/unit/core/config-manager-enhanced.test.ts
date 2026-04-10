import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../../../src/core/config-manager';
import { ServiceConfig, RuntimeType, DockerConnectionConfig, RuntimeSpecificConfig, DetectionResult } from '../../../src/core/types';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Mock path module
jest.mock('path', () => {
  const actualPath = jest.requireActual('path');
  return {
    join: jest.fn((...args: string[]) => {
      // For test simplicity, join with forward slashes
      return args.join('/');
    }),
    dirname: jest.fn((path: string) => {
      const parts = path.split('/');
      parts.pop();
      return parts.join('/') || '.';
    }),
    basename: jest.fn((path: string, ext?: string) => {
      const parts = path.split('/');
      const basename = parts.pop() || '';
      if (ext && basename.endsWith(ext)) {
        return basename.slice(0, -ext.length);
      }
      return basename;
    }),
    isAbsolute: jest.fn().mockReturnValue(true),
    resolve: jest.fn((...args: string[]) => args.join('/')),
  };
});

// Mock logger to avoid console output during tests
jest.mock('../../../src/core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('ConfigManager - Enhanced Test Suite', () => {
  let mockFs: any;
  let mockPath: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Get mocked modules
    mockFs = require('fs');
    mockPath = require('path');
  });

  afterEach(() => {
    // Clear caches
    (ConfigManager as any).serviceConfigCache.clear();
    (ConfigManager as any).servicesListCache = null;
    (ConfigManager as any).globalConfigCache = null;
    (ConfigManager as any).dockerHostsCache.clear();
    (ConfigManager as any).runtimeProfilesCache.clear();
  });

  describe('初始化方法测试', () => {
    it('应该创建完整的目录结构', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      ConfigManager.init();
      
      // Should create all required directories
      expect(mockFs.mkdirSync).toHaveBeenCalledTimes(5);
      expect(mockFs.existsSync).toHaveBeenCalled();
    });

    it('应该创建默认Docker主机配置', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        // Return false for all files to trigger default creation
        return false;
      });
      
      ConfigManager.init();
      
      // Should write default Docker host configs
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('应该创建默认运行时配置模板', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        // Return false for all files to trigger default creation
        return false;
      });
      
      ConfigManager.init();
      
      // Should write default runtime profiles
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('服务配置管理 - 完整测试', () => {
    it('应该保存服务配置并添加元数据', () => {
      const serviceName = 'test-service';
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/service',
        runtime: 'node' as const,
      };

      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockImplementation(() => {});
      
      ConfigManager.saveServiceConfig(serviceName, config);
      
      // Verify write was called with config that includes metadata
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(serviceName),
        expect.stringContaining('installedAt')
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(serviceName),
        expect.stringContaining('lastDetectedAt')
      );
    });

    it('应该将相对路径转换为绝对路径', () => {
      const serviceName = 'test-service';
      const config: ServiceConfig = {
        name: 'test-service',
        path: 'relative/path',
        runtime: 'node' as const,
      };

      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockImplementation(() => {});
      mockPath.isAbsolute.mockReturnValue(false);
      
      ConfigManager.saveServiceConfig(serviceName, config);
      
      // Should call path.resolve for relative paths
      expect(mockPath.resolve).toHaveBeenCalled();
    });

    it('应该更新服务检测结果并自动更新运行时（高置信度）', () => {
      const serviceName = 'test-service';
      const detection: DetectionResult = {
        runtime: 'node' as const,
        confidence: 0.9,
        source: 'auto',
        evidence: ['package.json found'],
      };

      // Mock getServiceConfig to return existing config
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        name: serviceName,
        path: '/path/to/service',
      }));
      mockFs.existsSync.mockReturnValue(true);
      
      // Mock getGlobalConfig to return config with detectionThreshold
      mockFs.readFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('config.json') && filePath.includes('.mcpilot')) {
          return JSON.stringify({ detectionThreshold: 0.8 });
        }
        return JSON.stringify({ name: serviceName, path: '/path/to/service' });
      });
      
      const updatedConfig = ConfigManager.updateServiceDetection(serviceName, detection);
      
      // Should update runtime when confidence >= threshold
      expect(updatedConfig.runtime).toBe('node');
      expect(updatedConfig.detectionConfidence).toBe(0.9);
      expect(updatedConfig.detectionSource).toBe('auto');
    });

    it('应该更新服务检测结果但不自动更新运行时（低置信度）', () => {
      const serviceName = 'test-service';
      const detection: DetectionResult = {
        runtime: 'node' as const,
        confidence: 0.5,
        source: 'auto',
        evidence: ['package.json found'],
      };

      // Mock getServiceConfig to return existing config
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        name: serviceName,
        path: '/path/to/service',
        runtime: 'python' as const,
      }));
      mockFs.existsSync.mockReturnValue(true);
      
      // Mock getGlobalConfig to return config with detectionThreshold
      mockFs.readFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('global-config.json')) {
          return JSON.stringify({ detectionThreshold: 0.8 });
        }
        return JSON.stringify({ name: serviceName, path: '/path/to/service', runtime: 'python' });
      });
      
      const updatedConfig = ConfigManager.updateServiceDetection(serviceName, detection);
      
      // Should not update runtime when confidence < threshold
      expect(updatedConfig.runtime).toBe('python');
      expect(updatedConfig.detectedRuntime).toBe('node');
    });

    it('应该设置服务运行时并更新检测信息', () => {
      const serviceName = 'test-service';
      const runtime: RuntimeType = 'node';
      const runtimeConfig: RuntimeSpecificConfig = {
        node: {
          npmRegistry: 'https://registry.npmjs.org',
          bun: false,
          nodeVersion: '>=18.0.0',
        },
      };

      // Mock getServiceConfig to return existing config
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        name: serviceName,
        path: '/path/to/service',
      }));
      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {});
      
      const updatedConfig = ConfigManager.setServiceRuntime(serviceName, runtime, runtimeConfig);
      
      expect(updatedConfig.runtime).toBe('node');
      expect(updatedConfig.detectionSource).toBe('explicit');
      expect(updatedConfig.detectionConfidence).toBe(1.0);
      expect(updatedConfig.runtimeConfig).toEqual(runtimeConfig);
    });

    it('应该抛出错误当设置不存在的服务运行时', () => {
      const serviceName = 'non-existent-service';
      const runtime: RuntimeType = 'node';

      mockFs.existsSync.mockReturnValue(false);
      
      expect(() => {
        ConfigManager.setServiceRuntime(serviceName, runtime);
      }).toThrow(`Service ${serviceName} not found`);
    });
  });

  describe('Docker主机配置 - 完整测试', () => {
    it('应该获取Docker主机配置', () => {
      const hostName = 'test-host';
      const config: DockerConnectionConfig = {
        type: 'remote' as const,
        host: 'localhost',
        port: 2375,
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(config));
      
      const result = ConfigManager.getDockerHostConfig(hostName);
      
      expect(result).toEqual(config);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${hostName}.json`),
        'utf-8'
      );
    });

    it('应该返回null当Docker主机配置不存在', () => {
      const hostName = 'non-existent-host';

      mockFs.existsSync.mockReturnValue(false);
      
      const result = ConfigManager.getDockerHostConfig(hostName);
      
      expect(result).toBeNull();
    });

    it('应该处理Docker主机配置JSON解析错误', () => {
      const hostName = 'corrupted-host';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid-json');
      
      const result = ConfigManager.getDockerHostConfig(hostName);
      
      expect(result).toBeNull();
    });

    it('应该保存Docker主机配置', () => {
      const hostName = 'test-host';
      const config: DockerConnectionConfig = {
        type: 'remote' as const,
        host: 'localhost',
        port: 2375,
      };

      mockFs.writeFileSync.mockImplementation(() => {});
      
      ConfigManager.saveDockerHostConfig(hostName, config);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${hostName}.json`),
        JSON.stringify(config, null, 2)
      );
    });

    it('应该抛出错误当保存Docker主机配置失败', () => {
      const hostName = 'test-host';
      const config: DockerConnectionConfig = {
        type: 'remote' as const,
        host: 'localhost',
        port: 2375,
      };

      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });
      
      expect(() => {
        ConfigManager.saveDockerHostConfig(hostName, config);
      }).toThrow('Write error');
    });

    it('应该删除Docker主机配置', () => {
      const hostName = 'test-host';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {});
      
      ConfigManager.deleteDockerHostConfig(hostName);
      
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining(`${hostName}.json`)
      );
    });

    it('应该跳过删除不存在的Docker主机配置', () => {
      const hostName = 'non-existent-host';

      mockFs.existsSync.mockReturnValue(false);
      
      ConfigManager.deleteDockerHostConfig(hostName);
      
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('应该列出所有Docker主机', () => {
      const mockFiles = ['host1.json', 'host2.json', 'not-a-json.txt'];
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(mockFiles);
      
      const hosts = ConfigManager.listDockerHosts();
      
      expect(hosts).toEqual(['host1', 'host2']);
      expect(mockFs.readdirSync).toHaveBeenCalled();
    });

    it('应该返回空数组当Docker主机目录不存在', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const hosts = ConfigManager.listDockerHosts();
      
      expect(hosts).toEqual([]);
    });
  });

  describe('运行时配置模板 - 完整测试', () => {
    it('应该获取运行时配置模板', () => {
      const runtime: RuntimeType = 'node';
      const config: RuntimeSpecificConfig = {
        node: {
          npmRegistry: 'https://registry.npmjs.org',
          bun: false,
          nodeVersion: '>=18.0.0',
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(config));
      
      const result = ConfigManager.getRuntimeProfile(runtime);
      
      expect(result).toEqual(config);
    });

    it('应该返回null当运行时配置模板不存在', () => {
      const runtime: RuntimeType = 'non-existent-runtime';

      mockFs.existsSync.mockReturnValue(false);
      
      const result = ConfigManager.getRuntimeProfile(runtime);
      
      expect(result).toBeNull();
    });

    it('应该处理运行时配置模板JSON解析错误', () => {
      const runtime: RuntimeType = 'node';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid-json');
      
      const result = ConfigManager.getRuntimeProfile(runtime);
      
      expect(result).toBeNull();
    });

    it('应该保存运行时配置模板', () => {
      const runtime: RuntimeType = 'node';
      const config: RuntimeSpecificConfig = {
        node: {
          npmRegistry: 'https://registry.npmjs.org',
          bun: false,
          nodeVersion: '>=18.0.0',
        },
      };

      mockFs.writeFileSync.mockImplementation(() => {});
      
      ConfigManager.saveRuntimeProfile(runtime, config);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${runtime}.json`),
        JSON.stringify(config, null, 2)
      );
    });

    it('应该抛出错误当保存运行时配置模板失败', () => {
      const runtime: RuntimeType = 'node';
      const config: RuntimeSpecificConfig = {
        node: {
          npmRegistry: 'https://registry.npmjs.org',
          bun: false,
          nodeVersion: '>=18.0.0',
        },
      };

      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });
      
      expect(() => {
        ConfigManager.saveRuntimeProfile(runtime, config);
      }).toThrow('Write error');
    });
  });

  describe('全局配置管理 - 完整测试', () => {
    it('应该获取全局配置', () => {
      const config = {
        defaultDockerHost: 'local',
        detectionThreshold: 0.7,
        requireExplicitRuntime: false,
        autoSaveDetection: true,
        interactiveMode: true,
        logLevel: 'info' as const,
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(config));
      
      const result = ConfigManager.getGlobalConfig();
      
      expect(result).toEqual(expect.objectContaining(config));
    });

    it('应该返回默认全局配置当文件不存在', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const result = ConfigManager.getGlobalConfig();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('defaultDockerHost');
      expect(result).toHaveProperty('detectionThreshold');
    });

    it('应该处理全局配置JSON解析错误', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid-json');
      
      const result = ConfigManager.getGlobalConfig();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('defaultDockerHost');
    });

    it('应该保存全局配置', () => {
      const config = {
        detectionThreshold: 0.8,
        logLevel: 'debug' as const,
      };

      mockFs.writeFileSync.mockImplementation(() => {});
      
      ConfigManager.saveGlobalConfig(config);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        JSON.stringify(config, null, 2)
      );
    });

    it('应该抛出错误当保存全局配置失败', () => {
      const config = {
        detectionThreshold: 0.8,
      };

      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });
      
      expect(() => {
        ConfigManager.saveGlobalConfig(config);
      }).toThrow('Write error');
    });
  });

  describe('配置解析和验证 - 完整测试', () => {
    it('应该解析服务配置并应用默认值', () => {
      const userConfig: Partial<ServiceConfig> = {
        name: 'custom-name',
        runtime: 'node' as const,
      };
      const servicePath = '/path/to/service';

      mockPath.basename.mockReturnValue('service');
      mockPath.isAbsolute.mockReturnValue(false);
      
      const result = ConfigManager.resolveServiceConfig(userConfig, servicePath);
      
      expect(result.name).toBe('custom-name');
      expect(result.path).toBe(servicePath);
      expect(result.runtime).toBe('node');
      expect(result.detectionSource).toBe('explicit');
      expect(result.detectionConfidence).toBe(1.0);
    });

    it('should use service path basename when name is not provided', () => {
      const userConfig: Partial<ServiceConfig> = {
        runtime: 'node' as const,
      };
      const servicePath = '/path/to/my-service';

      mockPath.basename.mockReturnValue('my-service');
      mockPath.isAbsolute.mockReturnValue(false);

      const result = ConfigManager.resolveServiceConfig(userConfig, servicePath);

      expect(result.name).toBe('my-service');
      expect(result.path).toBe(servicePath);
      expect(result.runtime).toBe('node');
      expect(result.detectionSource).toBe('explicit');
      expect(result.detectionConfidence).toBe(1.0);
    });
  });
});
     