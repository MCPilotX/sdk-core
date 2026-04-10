/**
 * Server Test AI Connection Tests
 * Tests for the testAIConnection static method in src/daemon/server.ts
 */
// @ts-nocheck
import { describe, it, expect, jest } from '@jest/globals';
import { DaemonServer } from '../src/daemon/server';
// Mock logger to avoid console output
jest.mock('../src/core/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
// Mock fetch to avoid network calls
global.fetch = jest.fn();
describe('DaemonServer.testAIConnection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('with valid configuration', () => {
        it('should test AI connection with OpenAI provider', async () => {
            // Mock successful fetch response
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'openai',
                        apiKey: 'test-key',
                    },
                }),
            };
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.status).toBe('connected');
        });
        it('should test AI connection with DeepSeek provider', async () => {
            // Mock successful fetch response
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'deepseek',
                        apiKey: 'test-key',
                    },
                }),
            };
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.status).toBe('connected');
        });
        it('should test AI connection with Anthropic provider', async () => {
            // Mock successful fetch response
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'anthropic',
                        apiKey: 'test-key',
                    },
                }),
            };
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.status).toBe('connected');
        });
        it('should test AI connection with Cohere provider', async () => {
            // Mock successful fetch response
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'cohere',
                        apiKey: 'test-key',
                    },
                }),
            };
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.status).toBe('connected');
        });
        it('should test AI connection with Ollama provider', async () => {
            // Mock successful fetch response for Ollama
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'ollama',
                        ollamaHost: 'http://localhost:11434',
                    },
                }),
            };
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.status).toBe('connected');
        });
    });
    describe('with invalid configuration', () => {
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
        it('should handle missing endpoint for Ollama', async () => {
            // Mock fetch to fail since we're testing with empty endpoint
            global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));
            const mockOrchestrator = {
                getConfig: () => ({
                    ai: {
                        provider: 'ollama',
                        ollamaHost: '',
                    },
                }),
            };
            const result = await DaemonServer.testAIConnection(mockOrchestrator);
            // When ollamaHost is empty, it uses default 'http://localhost:11434'
            // and tries to connect. Since we mocked fetch to fail, it should return success: false
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
    });
});
//# sourceMappingURL=server-test-ai-connection.test.js.map