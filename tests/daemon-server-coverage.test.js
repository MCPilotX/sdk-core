/**
 * Daemon Server Coverage Tests
 * Tests for src/daemon/server.ts to improve test coverage
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DaemonServer } from '../src/daemon/server';
import { ProcessManager } from '../src/daemon/pm';
import { Orchestrator } from '../src/daemon/orchestrator';
import { logger } from '../src/core/logger';
// Mock dependencies
jest.mock('../src/daemon/pm', () => {
    return {
        ProcessManager: class MockProcessManager {
            getStatuses() {
                return [
                    { name: 'test-service', status: 'running', pid: 12345 },
                    { name: 'another-service', status: 'stopped', pid: null },
                ];
            }
            startService(name) {
                if (name === 'error-service') {
                    throw new Error('Failed to start service');
                }
                return Promise.resolve();
            }
            stopService(name) {
                if (name === 'error-service') {
                    throw new Error('Failed to stop service');
                }
            }
        },
    };
});
jest.mock('../src/daemon/orchestrator', () => {
    return {
        Orchestrator: class MockOrchestrator {
            mockConfig = {
                ai: {
                    provider: 'openai',
                    apiKey: 'test-key',
                    model: 'gpt-3.5-turbo',
                },
            };
            constructor(pm) {
                // Accept pm parameter but don't use it
            }
            async executeQuery(query) {
                if (query === 'error query') {
                    throw new Error('Query execution failed');
                }
                return {
                    type: 'suggestions',
                    message: 'Mocked response',
                    suggestions: ['Mocked suggestion'],
                };
            }
            getConfig() {
                return this.mockConfig;
            }
            updateAIConfig(config) {
                if (config.provider === 'invalid') {
                    return { success: false, error: 'Invalid provider' };
                }
                this.mockConfig.ai = { ...this.mockConfig.ai, ...config };
                return { success: true, data: this.mockConfig.ai };
            }
        },
    };
});
jest.mock('../src/core/config-validator', () => {
    return {
        ConfigValidator: {
            getDefaultConfig() {
                return {
                    ai: {
                        provider: 'none',
                        apiKey: undefined,
                        model: undefined,
                    },
                };
            },
        },
    };
});
jest.mock('../src/core/logger', () => {
    return {
        logger: {
            logRequest: jest.fn(),
            logServiceEvent: jest.fn(),
            logAIQuery: jest.fn(),
            logConfigUpdate: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        },
    };
});
// Mock Hono and serve
jest.mock('hono', () => {
    return {
        Hono: class MockHono {
            post = jest.fn();
            fetch = jest.fn();
        },
    };
});
jest.mock('@hono/node-server', () => ({
    serve: jest.fn(),
}));
// Mock global fetch
global.fetch = jest.fn();
describe('DaemonServer Coverage Tests', () => {
    let daemonServer;
    let mockServe;
    let mockFetch;
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        // Setup mock serve
        mockServe = require('@hono/node-server').serve;
        mockServe.mockReturnValue({
            close: jest.fn(),
        });
        // Setup mock fetch
        mockFetch = global.fetch;
        daemonServer = new DaemonServer();
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('constructor', () => {
        it('should create an instance', () => {
            expect(daemonServer).toBeInstanceOf(DaemonServer);
        });
        it('should initialize ProcessManager and Orchestrator', () => {
            // Access private properties for testing
            const pm = daemonServer.pm;
            const orchestrator = daemonServer.orchestrator;
            expect(pm).toBeDefined();
            expect(orchestrator).toBeDefined();
            expect(pm).toBeInstanceOf(ProcessManager);
            expect(orchestrator).toBeInstanceOf(Orchestrator);
        });
    });
    describe('setupRoutes', () => {
        it('should setup routes', () => {
            // The routes are setup in constructor
            const app = daemonServer.app;
            expect(app.post).toHaveBeenCalled();
        });
    });
    describe('start', () => {
        it('should start the server', async () => {
            await daemonServer.start();
            expect(mockServe).toHaveBeenCalledWith({
                fetch: expect.any(Function),
                port: 8082,
            });
            expect(logger.info).toHaveBeenCalledWith('Starting MCPilot Daemon on http://localhost:8082...');
            expect(logger.info).toHaveBeenCalledWith('Daemon is now running.');
        });
    });
    describe('testAIConnection static method', () => {
        beforeEach(() => {
            // Reset fetch mock before each test
            mockFetch.mockReset();
        });
        it('should test AI connection with valid configuration', async () => {
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'openai',
                        apiKey: 'test-key',
                    },
                }),
            };
            // Mock successful fetch response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
            });
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.provider).toBe('openai');
            expect(result.data.status).toBe('connected');
        });
        it('should handle missing AI configuration', async () => {
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: null,
                }),
            };
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(false);
            expect(result.error).toContain('AI configuration not set');
        });
        it('should handle missing provider', async () => {
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: '',
                    },
                }),
            };
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(false);
            expect(result.error).toContain('AI configuration not set');
        });
        it('should handle missing API key for OpenAI', async () => {
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'openai',
                        apiKey: '',
                    },
                }),
            };
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing API key for openai');
        });
        it('should handle missing API key for DeepSeek', async () => {
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'deepseek',
                        apiKey: '',
                    },
                }),
            };
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing API key for deepseek');
        });
        it('should handle missing API key for Anthropic', async () => {
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'anthropic',
                        apiKey: '',
                    },
                }),
            };
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing API key for anthropic');
        });
        it('should handle missing API key for Cohere', async () => {
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'cohere',
                        apiKey: '',
                    },
                }),
            };
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing API key for cohere');
        });
        it('should handle Ollama provider', async () => {
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'ollama',
                        endpoint: 'http://localhost:11434',
                    },
                }),
            };
            // Mock successful Ollama response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ models: [{ name: 'llama2' }] }),
            });
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.provider).toBe('ollama');
            expect(result.data.status).toBe('connected');
        });
        it('should handle Ollama provider with empty endpoint', async () => {
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'ollama',
                        endpoint: '',
                    },
                }),
            };
            // Mock fetch to throw error for empty endpoint
            mockFetch.mockRejectedValueOnce(new Error('fetch failed'));
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot connect to Ollama service');
        });
        it('should handle unknown provider', async () => {
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'unknown-provider',
                    },
                }),
            };
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Unsupported provider');
        });
        it('should handle API error response', async () => {
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'openai',
                        apiKey: 'test-key',
                    },
                }),
            };
            // Mock error response
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: async () => JSON.stringify({ error: { message: 'Invalid API key' } }),
            });
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid API key');
        });
        it('should handle network timeout', async () => {
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'openai',
                        apiKey: 'test-key',
                    },
                }),
            };
            // Mock timeout error
            mockFetch.mockImplementationOnce(() => {
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                throw error;
            });
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Request timeout');
        });
    });
    describe('route handlers (simulated)', () => {
        let mockRequestHandler;
        beforeEach(() => {
            // Get the mock request handler
            const app = daemonServer.app;
            const postCall = app.post.mock.calls[0];
            mockRequestHandler = postCall[1]; // The handler function
        });
        it('should handle ping command', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({ command: 'ping' }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith({ status: 'ok', message: 'pong' });
            expect(logger.logRequest).toHaveBeenCalledWith('ping', undefined);
        });
        it('should handle status command', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({ command: 'status' }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'ok',
                data: expect.objectContaining({
                    uptime: expect.any(Number),
                    pid: expect.any(Number),
                    services: expect.any(Array),
                }),
            }));
            expect(logger.logRequest).toHaveBeenCalledWith('status', undefined);
        });
        it('should handle start-service command', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({
                        command: 'start-service',
                        data: { name: 'test-service' }
                    }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith({ status: 'ok', message: 'Service test-service started.' });
            expect(logger.logRequest).toHaveBeenCalledWith('start-service', { name: 'test-service' });
            expect(logger.logServiceEvent).toHaveBeenCalledWith('test-service', 'started');
        });
        it('should handle stop-service command', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({
                        command: 'stop-service',
                        data: { name: 'test-service' }
                    }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith({ status: 'ok', message: 'Service test-service stopped.' });
            expect(logger.logRequest).toHaveBeenCalledWith('stop-service', { name: 'test-service' });
            expect(logger.logServiceEvent).toHaveBeenCalledWith('test-service', 'stopped');
        });
        it('should handle ai-query command', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({
                        command: 'ai-query',
                        data: { query: 'test query' }
                    }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'ok',
                data: expect.objectContaining({
                    type: 'suggestions',
                    message: 'Mocked response',
                }),
            }));
            expect(logger.logRequest).toHaveBeenCalledWith('ai-query', { query: 'test query' });
            expect(logger.logAIQuery).toHaveBeenCalledWith('test query', expect.anything());
        });
        it('should handle get-config command', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({ command: 'get-config' }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'ok',
                data: expect.objectContaining({
                    ai: expect.objectContaining({
                        provider: 'openai',
                    }),
                }),
            }));
            expect(logger.logRequest).toHaveBeenCalledWith('get-config', undefined);
        });
        it('should handle get-ai-config command', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({ command: 'get-ai-config' }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'ok',
                data: expect.objectContaining({
                    provider: 'openai',
                }),
            }));
            expect(logger.logRequest).toHaveBeenCalledWith('get-ai-config', undefined);
        });
        it('should handle update-ai-config command with valid config', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({
                        command: 'update-ai-config',
                        data: { config: { model: 'gpt-4' } }
                    }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'ok',
                data: expect.objectContaining({
                    success: true,
                }),
            }));
            expect(logger.logRequest).toHaveBeenCalledWith('update-ai-config', { config: { model: 'gpt-4' } });
            expect(logger.logConfigUpdate).toHaveBeenCalledWith('ai', { model: 'gpt-4' });
        });
        it('should handle update-ai-config command with invalid config', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({
                        command: 'update-ai-config',
                        data: { config: { provider: 'invalid' } }
                    }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith({ status: 'error', message: 'Invalid provider' }, 400);
            expect(logger.logRequest).toHaveBeenCalledWith('update-ai-config', { config: { provider: 'invalid' } });
        });
        it('should handle test-ai-connection command', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({ command: 'test-ai-connection' }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalled();
            expect(logger.logRequest).toHaveBeenCalledWith('test-ai-connection', undefined);
        });
        it('should handle reset-ai-config command', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({ command: 'reset-ai-config' }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'ok',
                data: expect.objectContaining({
                    success: true,
                }),
            }));
            expect(logger.logRequest).toHaveBeenCalledWith('reset-ai-config', undefined);
            expect(logger.logConfigUpdate).toHaveBeenCalledWith('ai', expect.anything());
        });
        it('should handle unknown command', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({ command: 'unknown-command' }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith({ status: 'error', message: 'Unknown command: unknown-command' }, 404);
            expect(logger.logRequest).toHaveBeenCalledWith('unknown-command', undefined);
            expect(logger.warn).toHaveBeenCalledWith('Unknown command received: unknown-command');
        });
        it('should handle errors in request processing', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockRejectedValue(new Error('JSON parsing error')),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith({ status: 'error', message: 'JSON parsing error' }, 500);
            expect(logger.error).toHaveBeenCalled();
        });
        it('should handle errors in start-service command', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({
                        command: 'start-service',
                        data: { name: 'error-service' }
                    }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to start service' }, 500);
            expect(logger.error).toHaveBeenCalled();
        });
        it('should handle errors in stop-service command', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({
                        command: 'stop-service',
                        data: { name: 'error-service' }
                    }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to stop service' }, 500);
            expect(logger.error).toHaveBeenCalled();
        });
        it('should handle errors in ai-query command', async () => {
            const mockContext = {
                req: {
                    json: jest.fn().mockResolvedValue({
                        command: 'ai-query',
                        data: { query: 'error query' }
                    }),
                },
                json: jest.fn(),
            };
            await mockRequestHandler(mockContext);
            expect(mockContext.json).toHaveBeenCalledWith({ status: 'error', message: 'Query execution failed' }, 500);
            expect(logger.error).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=daemon-server-coverage.test.js.map