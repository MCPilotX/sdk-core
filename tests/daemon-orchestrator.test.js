/**
 * Daemon Orchestrator Tests
 * Tests for src/daemon/orchestrator.ts
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as fs from 'fs';
import { Orchestrator } from '../src/daemon/orchestrator';
import { ProcessManager } from '../src/daemon/pm';
import { HybridAIParser } from '../src/ai';
import { ConfigValidator } from '../src/core/config-validator';
// Mock dependencies
jest.mock('fs');
jest.mock('../src/daemon/pm');
jest.mock('../src/ai', () => ({
    HybridAIParser: jest.fn(),
}));
jest.mock('../src/core/config-validator');
jest.mock('../src/core/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));
jest.mock('../src/core/constants', () => ({
    CONFIG_PATH: '/mock/config/path.json',
}));
describe('Orchestrator', () => {
    let orchestrator;
    let mockFs;
    let mockProcessManager;
    let mockHybridAIParser;
    let mockConfigValidator;
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        mockFs = fs;
        mockProcessManager = ProcessManager;
        mockHybridAIParser = HybridAIParser;
        mockConfigValidator = ConfigValidator;
        // Mock ProcessManager instance
        const mockPmInstance = {
            getRunningServices: jest.fn().mockReturnValue(['test-service']),
            getServiceTools: jest.fn().mockReturnValue([
                { name: 'list_files', description: 'List files in directory' },
                { name: 'read_file', description: 'Read file contents' },
            ]),
            callService: jest.fn().mockResolvedValue({ success: true, data: 'test result' }),
        };
        mockProcessManager.mockImplementation(() => mockPmInstance);
        // Mock ConfigValidator methods
        mockConfigValidator.mergeWithDefaults.mockReturnValue({
            ai: {
                enabled: true,
                provider: 'openai',
                apiKey: 'test-key',
                model: 'gpt-3.5-turbo',
            },
            services: {
                instances: [],
            },
        });
        mockConfigValidator.getDefaultConfig.mockReturnValue({
            ai: {
                enabled: false,
                provider: 'none',
            },
            services: {
                instances: [],
            },
        });
        mockConfigValidator.validate.mockImplementation((config) => config);
        // Mock HybridAIParser instance
        const mockIntentEngineInstance = {
            parse: jest.fn().mockResolvedValue({
                service: 'test-service',
                method: 'list_files',
                parameters: { path: '/tmp' },
            }),
            updateConfig: jest.fn(),
        };
        mockHybridAIParser.mockImplementation(() => mockIntentEngineInstance);
        // Mock fs.existsSync to return true (config exists)
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify({
            ai: {
                enabled: true,
                provider: 'openai',
                apiKey: 'test-key',
            },
        }));
        mockFs.writeFileSync.mockImplementation(() => { });
    });
    describe('constructor and initialization', () => {
        it('should load configuration from file when it exists', () => {
            orchestrator = new Orchestrator(new mockProcessManager());
            expect(mockFs.existsSync).toHaveBeenCalledWith('/mock/config/path.json');
            expect(mockFs.readFileSync).toHaveBeenCalledWith('/mock/config/path.json', 'utf-8');
            expect(mockConfigValidator.mergeWithDefaults).toHaveBeenCalled();
            // Should create intent engine since AI is enabled
            expect(mockHybridAIParser).toHaveBeenCalled();
        });
        it('should use default config when file does not exist', () => {
            mockFs.existsSync.mockReturnValue(false);
            orchestrator = new Orchestrator(new mockProcessManager());
            expect(mockConfigValidator.getDefaultConfig).toHaveBeenCalled();
            // Should not create intent engine since AI is disabled by default
            expect(mockHybridAIParser).not.toHaveBeenCalled();
        });
        it('should not create intent engine when AI is disabled', () => {
            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                ai: {
                    enabled: false,
                },
            }));
            // Update ConfigValidator to return AI disabled config
            mockConfigValidator.mergeWithDefaults.mockReturnValue({
                ai: {
                    enabled: false,
                    provider: 'none',
                },
                services: {
                    instances: [],
                },
            });
            orchestrator = new Orchestrator(new mockProcessManager());
            expect(mockHybridAIParser).not.toHaveBeenCalled();
            const config = orchestrator.getConfig();
            expect(config.ai.enabled).toBe(false);
        });
    });
    describe('executeQuery', () => {
        beforeEach(() => {
            // Create orchestrator with AI enabled
            orchestrator = new Orchestrator(new mockProcessManager());
        });
        it('should execute query successfully', async () => {
            const result = await orchestrator.executeQuery('list files in /tmp');
            expect(result).toEqual({
                success: true,
                service: 'test-service',
                method: 'list_files',
                result: { success: true, data: 'test result' },
            });
            // Verify process manager was called correctly
            const mockPmInstance = mockProcessManager.mock.results[0].value;
            expect(mockPmInstance.getRunningServices).toHaveBeenCalled();
            expect(mockPmInstance.getServiceTools).toHaveBeenCalledWith('test-service');
            expect(mockPmInstance.callService).toHaveBeenCalledWith('test-service', 'list_files', { path: '/tmp' });
            // Verify intent engine was called
            const mockIntentInstance = mockHybridAIParser.mock.results[0].value;
            expect(mockIntentInstance.parse).toHaveBeenCalledWith('list files in /tmp', { availableTools: ['test-service:list_files', 'test-service:read_file'] });
        });
        it('should throw error when AI is disabled', async () => {
            // Recreate orchestrator with AI disabled
            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                ai: {
                    enabled: false,
                },
            }));
            // Update ConfigValidator to return AI disabled config
            mockConfigValidator.mergeWithDefaults.mockReturnValue({
                ai: {
                    enabled: false,
                    provider: 'none',
                },
                services: {
                    instances: [],
                },
            });
            orchestrator = new Orchestrator(new mockProcessManager());
            await expect(orchestrator.executeQuery('test query'))
                .rejects.toThrow('AI features are disabled. Enable AI in configuration to use natural language queries.');
        });
        it('should throw error when intent engine cannot parse query', async () => {
            const mockIntentInstance = mockHybridAIParser.mock.results[0].value;
            mockIntentInstance.parse.mockResolvedValue(null);
            await expect(orchestrator.executeQuery('invalid query'))
                .rejects.toThrow('Unable to determine which service to use for your request.');
        });
        it('should handle service call errors', async () => {
            const mockPmInstance = mockProcessManager.mock.results[0].value;
            mockPmInstance.callService.mockRejectedValue(new Error('Service call failed'));
            await expect(orchestrator.executeQuery('list files'))
                .rejects.toThrow('Query failed: Service call failed');
        });
        it('should handle empty available tools', async () => {
            const mockPmInstance = mockProcessManager.mock.results[0].value;
            mockPmInstance.getRunningServices.mockReturnValue(['test-service']);
            mockPmInstance.getServiceTools.mockReturnValue([]);
            const mockIntentInstance = mockHybridAIParser.mock.results[0].value;
            mockIntentInstance.parse.mockResolvedValue({
                service: 'test-service',
                method: 'list_files',
                parameters: {},
            });
            const result = await orchestrator.executeQuery('list files');
            expect(result.success).toBe(true);
        });
        it('should handle no running services', async () => {
            const mockPmInstance = mockProcessManager.mock.results[0].value;
            mockPmInstance.getRunningServices.mockReturnValue([]);
            const mockIntentInstance = mockHybridAIParser.mock.results[0].value;
            mockIntentInstance.parse.mockResolvedValue({
                service: 'test-service',
                method: 'list_files',
                parameters: {},
            });
            // Should still work if intent engine returns a service
            const result = await orchestrator.executeQuery('list files');
            expect(result.success).toBe(true);
        });
    });
    describe('getConfig', () => {
        it('should return current configuration', () => {
            orchestrator = new Orchestrator(new mockProcessManager());
            const config = orchestrator.getConfig();
            expect(config).toBeDefined();
            expect(config.ai).toBeDefined();
            expect(config.ai.enabled).toBe(true);
            expect(config.ai.provider).toBe('openai');
        });
    });
    describe('updateAIConfig', () => {
        beforeEach(() => {
            orchestrator = new Orchestrator(new mockProcessManager());
        });
        it('should update AI configuration successfully', () => {
            const newAIConfig = {
                enabled: true,
                provider: 'ollama',
                model: 'llama2',
                endpoint: 'http://localhost:11434',
            };
            const result = orchestrator.updateAIConfig(newAIConfig);
            expect(result).toEqual({
                success: true,
                config: newAIConfig,
            });
            // Verify config was validated
            expect(mockConfigValidator.validate).toHaveBeenCalledWith({ ai: newAIConfig });
            // Verify intent engine was updated
            const mockIntentInstance = mockHybridAIParser.mock.results[0].value;
            expect(mockIntentInstance.updateConfig).toHaveBeenCalledWith({ aiConfig: newAIConfig });
            // Verify config was saved to file
            expect(mockFs.readFileSync).toHaveBeenCalledWith('/mock/config/path.json', 'utf-8');
            expect(mockFs.writeFileSync).toHaveBeenCalled();
            // Verify config was updated in memory
            const config = orchestrator.getConfig();
            expect(config.ai.provider).toBe('ollama');
            expect(config.ai.model).toBe('llama2');
        });
        it('should update AI configuration when intent engine does not exist', () => {
            // Reset mocks for this specific test
            jest.clearAllMocks();
            // Recreate orchestrator with AI disabled (no intent engine)
            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                ai: {
                    enabled: false,
                },
            }));
            // Update ConfigValidator to return AI disabled config
            mockConfigValidator.mergeWithDefaults.mockReturnValue({
                ai: {
                    enabled: false,
                    provider: 'none',
                },
                services: {
                    instances: [],
                },
            });
            orchestrator = new Orchestrator(new mockProcessManager());
            const newAIConfig = {
                enabled: true,
                provider: 'openai',
                apiKey: 'new-key',
            };
            const result = orchestrator.updateAIConfig(newAIConfig);
            expect(result.success).toBe(true);
            // Should not call updateConfig on intent engine since it doesn't exist
            expect(mockHybridAIParser).not.toHaveBeenCalled();
        });
        it('should handle configuration validation errors', () => {
            mockConfigValidator.validate.mockImplementation(() => {
                throw new Error('Invalid configuration');
            });
            const result = orchestrator.updateAIConfig({ provider: 'invalid' });
            expect(result).toEqual({
                success: false,
                error: 'Invalid configuration',
            });
            // Should not save to file on error
            expect(mockFs.writeFileSync).not.toHaveBeenCalled();
        });
        it('should handle file system errors when saving', () => {
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('File read error');
            });
            const newAIConfig = {
                enabled: true,
                provider: 'openai',
                apiKey: 'test-key',
            };
            const result = orchestrator.updateAIConfig(newAIConfig);
            expect(result.success).toBe(false);
            expect(result.error).toBe('File read error');
        });
        it('should handle missing config file when updating', () => {
            // Reset mocks for this specific test
            jest.clearAllMocks();
            // Mock fs.existsSync to return false (config does not exist)
            mockFs.existsSync.mockReturnValue(false);
            // Recreate orchestrator with config file not existing
            orchestrator = new Orchestrator(new mockProcessManager());
            const newAIConfig = {
                enabled: true,
                provider: 'openai',
                apiKey: 'test-key',
            };
            const result = orchestrator.updateAIConfig(newAIConfig);
            expect(result.success).toBe(true);
            // Should not try to read/write non-existent file
            expect(mockFs.readFileSync).not.toHaveBeenCalled();
            expect(mockFs.writeFileSync).not.toHaveBeenCalled();
        });
    });
    describe('error handling', () => {
        it('should handle configuration file parse errors', () => {
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('Invalid JSON');
            });
            // Should throw error when config file has invalid JSON
            expect(() => {
                orchestrator = new Orchestrator(new mockProcessManager());
            }).toThrow('Invalid JSON');
        });
        it('should handle intent engine creation errors', () => {
            mockHybridAIParser.mockImplementation(() => {
                throw new Error('Intent engine creation failed');
            });
            // Should throw error when intent engine creation fails
            expect(() => {
                orchestrator = new Orchestrator(new mockProcessManager());
            }).toThrow('Intent engine creation failed');
        });
    });
});
//# sourceMappingURL=daemon-orchestrator.test.js.map