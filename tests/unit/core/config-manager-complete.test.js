import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ConfigManager } from '../../../src/core/config-manager';
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
        join: jest.fn((...args) => args.join('/')),
        dirname: jest.fn((p) => {
            const parts = p.split('/');
            parts.pop();
            return parts.join('/') || '.';
        }),
        basename: jest.fn((p, ext) => {
            const parts = p.split('/');
            const basename = parts.pop() || '';
            if (ext && basename.endsWith(ext)) {
                return basename.slice(0, -ext.length);
            }
            return basename;
        }),
        isAbsolute: jest.fn().mockReturnValue(true),
        resolve: jest.fn((...args) => args.join('/')),
    };
});
// Mock logger
jest.mock('../../../src/core/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
    },
}));
describe('ConfigManager Complete Test Suite', () => {
    let mockFs;
    let mockPath;
    beforeEach(() => {
        jest.clearAllMocks();
        mockFs = require('fs');
        mockPath = require('path');
    });
    afterEach(() => {
        ConfigManager.serviceConfigCache.clear();
        ConfigManager.servicesListCache = null;
        ConfigManager.globalConfigCache = null;
        ConfigManager.dockerHostsCache.clear();
        ConfigManager.runtimeProfilesCache.clear();
    });
    describe('Service Configuration Management', () => {
        it('should save service config with metadata', () => {
            const serviceName = 'test-service';
            const config = {
                name: 'test-service',
                path: '/path/to/service',
                runtime: 'node',
            };
            mockFs.existsSync.mockReturnValue(false);
            mockFs.writeFileSync.mockImplementation(() => { });
            ConfigManager.saveServiceConfig(serviceName, config);
            expect(mockFs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining(serviceName), expect.stringContaining('installedAt'));
        });
        it('should convert relative path to absolute', () => {
            const serviceName = 'test-service';
            const config = {
                name: 'test-service',
                path: 'relative/path',
                runtime: 'node',
            };
            mockFs.existsSync.mockReturnValue(false);
            mockFs.writeFileSync.mockImplementation(() => { });
            mockPath.isAbsolute.mockReturnValue(false);
            ConfigManager.saveServiceConfig(serviceName, config);
            expect(mockPath.resolve).toHaveBeenCalled();
        });
        it('should update service detection with high confidence', () => {
            const serviceName = 'test-service';
            const detection = {
                runtime: 'node',
                confidence: 0.9,
                source: 'auto',
                evidence: ['package.json'],
            };
            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                name: serviceName,
                path: '/path/to/service',
            }));
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation((filePath) => {
                if (filePath.includes('config.json') && filePath.includes('.mcpilot')) {
                    return JSON.stringify({ detectionThreshold: 0.8 });
                }
                return JSON.stringify({ name: serviceName, path: '/path/to/service' });
            });
            const result = ConfigManager.updateServiceDetection(serviceName, detection);
            expect(result.runtime).toBe('node');
            expect(result.detectionConfidence).toBe(0.9);
        });
        it('should set service runtime', () => {
            const serviceName = 'test-service';
            const runtime = 'node';
            const runtimeConfig = {
                node: { npmRegistry: 'https://registry.npmjs.org' },
            };
            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                name: serviceName,
                path: '/path/to/service',
            }));
            mockFs.existsSync.mockReturnValue(true);
            mockFs.writeFileSync.mockImplementation(() => { });
            const result = ConfigManager.setServiceRuntime(serviceName, runtime, runtimeConfig);
            expect(result.runtime).toBe('node');
            expect(result.detectionSource).toBe('explicit');
            expect(result.detectionConfidence).toBe(1.0);
            expect(result.runtimeConfig).toEqual(runtimeConfig);
        });
        it('should throw error when setting runtime for non-existent service', () => {
            const serviceName = 'non-existent';
            const runtime = 'node';
            mockFs.existsSync.mockReturnValue(false);
            expect(() => {
                ConfigManager.setServiceRuntime(serviceName, runtime);
            }).toThrow(`Service ${serviceName} not found`);
        });
    });
    describe('Docker Host Configuration', () => {
        it('should get docker host config', () => {
            const hostName = 'test-host';
            const config = {
                type: 'remote',
                host: 'localhost',
                port: 2375,
            };
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify(config));
            const result = ConfigManager.getDockerHostConfig(hostName);
            expect(result).toEqual(config);
        });
        it('should return null for non-existent docker host', () => {
            const hostName = 'non-existent';
            mockFs.existsSync.mockReturnValue(false);
            const result = ConfigManager.getDockerHostConfig(hostName);
            expect(result).toBeNull();
        });
        it('should save docker host config', () => {
            const hostName = 'test-host';
            const config = {
                type: 'remote',
                host: 'localhost',
                port: 2375,
            };
            mockFs.writeFileSync.mockImplementation(() => { });
            ConfigManager.saveDockerHostConfig(hostName, config);
            expect(mockFs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining(`${hostName}.json`), JSON.stringify(config, null, 2));
        });
        it('should delete docker host config', () => {
            const hostName = 'test-host';
            mockFs.existsSync.mockReturnValue(true);
            mockFs.unlinkSync.mockImplementation(() => { });
            ConfigManager.deleteDockerHostConfig(hostName);
            expect(mockFs.unlinkSync).toHaveBeenCalled();
        });
        it('should list docker hosts', () => {
            const mockFiles = ['host1.json', 'host2.json', 'not-a-json.txt'];
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue(mockFiles);
            const hosts = ConfigManager.listDockerHosts();
            expect(hosts).toEqual(['host1', 'host2']);
        });
    });
    describe('Runtime Profile Management', () => {
        it('should get runtime profile', () => {
            const runtime = 'node';
            const config = {
                node: { npmRegistry: 'https://registry.npmjs.org' },
            };
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify(config));
            const result = ConfigManager.getRuntimeProfile(runtime);
            expect(result).toEqual(config);
        });
        it('should save runtime profile', () => {
            const runtime = 'node';
            const config = {
                node: { npmRegistry: 'https://registry.npmjs.org' },
            };
            mockFs.writeFileSync.mockImplementation(() => { });
            ConfigManager.saveRuntimeProfile(runtime, config);
            expect(mockFs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining(`${runtime}.json`), JSON.stringify(config, null, 2));
        });
    });
    describe('Global Configuration', () => {
        it('should get global config', () => {
            const config = {
                defaultDockerHost: 'local',
                detectionThreshold: 0.7,
            };
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify(config));
            const result = ConfigManager.getGlobalConfig();
            expect(result).toEqual(expect.objectContaining(config));
        });
        it('should save global config', () => {
            const config = {
                detectionThreshold: 0.8,
            };
            mockFs.writeFileSync.mockImplementation(() => { });
            ConfigManager.saveGlobalConfig(config);
            expect(mockFs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('config.json'), JSON.stringify(config, null, 2));
        });
    });
    describe('Configuration Resolution and Validation', () => {
        it('should resolve service config', () => {
            const userConfig = {
                name: 'custom-name',
                runtime: 'node',
            };
            const servicePath = '/path/to/service';
            mockPath.basename.mockReturnValue('service');
            mockPath.isAbsolute.mockReturnValue(false);
            const result = ConfigManager.resolveServiceConfig(userConfig, servicePath);
            expect(result.name).toBe('custom-name');
            expect(result.runtime).toBe('node');
            expect(result.detectionSource).toBe('explicit');
            expect(result.detectionConfidence).toBe(1.0);
        });
        it('should validate service config', () => {
            const validConfig = {
                name: 'test-service',
                path: '/path/to/service',
                runtime: 'node',
            };
            mockFs.existsSync.mockReturnValue(true);
            const errors = ConfigManager.validateServiceConfig(validConfig);
            expect(errors).toHaveLength(0);
        });
        it('should validate missing service name', () => {
            const invalidConfig = {
                name: '',
                path: '/path/to/service',
                runtime: 'node',
            };
            const errors = ConfigManager.validateServiceConfig(invalidConfig);
            expect(errors).toContain('Service name is required');
        });
        it('should validate invalid detection confidence', () => {
            const invalidConfig = {
                name: 'test-service',
                path: '/path/to/service',
                runtime: 'node',
                detectionConfidence: 1.5,
            };
            const errors = ConfigManager.validateServiceConfig(invalidConfig);
            expect(errors).toContain('Detection confidence must be between 0 and 1, got 1.5');
        });
    });
    describe('Utility Methods', () => {
        it('should get all services', () => {
            const mockDirs = [
                { name: 'service1', isDirectory: () => true },
                { name: 'service2', isDirectory: () => true },
            ];
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue(mockDirs);
            const services = ConfigManager.getAllServices();
            expect(services).toEqual(['service1', 'service2']);
        });
        it('should get service detection cache', () => {
            const serviceName = 'test-service';
            const detection = {
                runtime: 'node',
                confidence: 0.9,
                source: 'auto',
            };
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(JSON.stringify(detection));
            const result = ConfigManager.getServiceDetectionCache(serviceName);
            expect(result).toEqual(detection);
        });
        it('should save service detection cache', () => {
            const serviceName = 'test-service';
            const detection = {
                runtime: 'node',
                confidence: 0.9,
                source: 'auto',
            };
            mockFs.existsSync.mockReturnValue(false);
            mockFs.mkdirSync.mockImplementation(() => { });
            mockFs.writeFileSync.mockImplementation(() => { });
            ConfigManager.saveServiceDetectionCache(serviceName, detection);
            expect(mockFs.mkdirSync).toHaveBeenCalled();
            expect(mockFs.writeFileSync).toHaveBeenCalled();
        });
    });
    describe('Error Handling', () => {
        it('should handle JSON parse error', () => {
            const serviceName = 'corrupted-service';
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue('invalid-json');
            const config = ConfigManager.getServiceConfig(serviceName);
            expect(config).toBeNull();
        });
        it('should handle file write error', () => {
            const serviceName = 'error-service';
            const config = {
                name: serviceName,
                path: '/path/to/service',
                runtime: 'node'
            };
            mockFs.writeFileSync.mockImplementation(() => {
                throw new Error('Write error');
            });
            expect(() => {
                ConfigManager.saveServiceConfig(serviceName, config);
            }).toThrow('Write error');
        });
    });
});
//# sourceMappingURL=config-manager-complete.test.js.map