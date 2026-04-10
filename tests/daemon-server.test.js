import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { DaemonServer } from '../src/daemon/server';
// Mock dependencies
jest.mock('../src/daemon/pm', () => ({
    ProcessManager: jest.fn().mockImplementation(() => ({
        getStatuses: jest.fn().mockReturnValue([]),
    })),
}));
jest.mock('../src/daemon/orchestrator', () => ({
    Orchestrator: jest.fn().mockImplementation(() => ({
        getConfig: jest.fn().mockReturnValue({ ai: null }),
        executeQuery: jest.fn(),
        updateAIConfig: jest.fn().mockReturnValue({ success: true }),
    })),
}));
jest.mock('../src/core/config-validator', () => ({
    ConfigValidator: {
        getDefaultConfig: jest.fn().mockReturnValue({ ai: {} }),
    },
}));
jest.mock('../src/core/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        logRequest: jest.fn(),
        logServiceEvent: jest.fn(),
        logAIQuery: jest.fn(),
        logConfigUpdate: jest.fn(),
    },
}));
jest.mock('@hono/node-server', () => ({
    serve: jest.fn(() => ({
        stop: jest.fn(),
    })),
}));
describe('DaemonServer', () => {
    let daemonServer;
    beforeEach(() => {
        jest.clearAllMocks();
        daemonServer = new DaemonServer();
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('constructor', () => {
        it('should initialize successfully', () => {
            expect(daemonServer).toBeInstanceOf(DaemonServer);
        });
    });
    describe('static methods', () => {
        describe('getDefaultModel', () => {
            it('should return correct default model for OpenAI', () => {
                const model = DaemonServer.getDefaultModel('openai');
                expect(model).toBe('gpt-3.5-turbo');
            });
            it('should return correct default model for DeepSeek', () => {
                const model = DaemonServer.getDefaultModel('deepseek');
                expect(model).toBe('deepseek-chat');
            });
            it('should return correct default model for Anthropic', () => {
                const model = DaemonServer.getDefaultModel('anthropic');
                expect(model).toBe('claude-3-haiku-20240307');
            });
            it('should return correct default model for Cohere', () => {
                const model = DaemonServer.getDefaultModel('cohere');
                expect(model).toBe('command');
            });
            it('should return "default" for unknown provider', () => {
                const model = DaemonServer.getDefaultModel('unknown');
                expect(model).toBe('default');
            });
        });
        describe('getProviderConfig', () => {
            it('should return correct config for OpenAI', () => {
                const config = DaemonServer.getProviderConfig('openai', 'test-api-key', 'gpt-4');
                expect(config.endpoint).toBe('https://api.openai.com/v1/chat/completions');
                expect(config.headers['Authorization']).toBe('Bearer test-api-key');
                expect(config.headers['Content-Type']).toBe('application/json');
            });
            it('should return correct config for DeepSeek', () => {
                const config = DaemonServer.getProviderConfig('deepseek', 'test-api-key', 'deepseek-chat');
                expect(config.endpoint).toBe('https://api.deepseek.com/v1/chat/completions');
                expect(config.headers['Authorization']).toBe('Bearer test-api-key');
            });
            it('should return correct config for Anthropic', () => {
                const config = DaemonServer.getProviderConfig('anthropic', 'test-api-key', 'claude-3-opus');
                expect(config.endpoint).toBe('https://api.anthropic.com/v1/messages');
                expect(config.headers['x-api-key']).toBe('test-api-key');
                expect(config.headers['anthropic-version']).toBe('2023-06-01');
            });
            it('should return correct config for Cohere', () => {
                const config = DaemonServer.getProviderConfig('cohere', 'test-api-key', 'command');
                expect(config.endpoint).toBe('https://api.cohere.ai/v1/generate');
                expect(config.headers['Authorization']).toBe('Bearer test-api-key');
            });
            it('should throw error for unsupported provider', () => {
                expect(() => {
                    DaemonServer.getProviderConfig('unsupported', 'test-api-key');
                }).toThrow('Unsupported provider for direct API test: unsupported');
            });
        });
        describe('createTestRequest', () => {
            it('should create correct test request for OpenAI', () => {
                const request = DaemonServer.createTestRequest('openai', 'gpt-4');
                expect(request.model).toBe('gpt-4');
                expect(request.messages).toHaveLength(2);
                expect(request.messages[0].role).toBe('system');
                expect(request.messages[1].role).toBe('user');
                expect(request.max_tokens).toBe(10);
                expect(request.temperature).toBe(0.1);
            });
            it('should create correct test request for Anthropic', () => {
                const request = DaemonServer.createTestRequest('anthropic', 'claude-3-opus');
                expect(request.model).toBe('claude-3-opus');
                expect(request.messages).toHaveLength(1);
                expect(request.messages[0].role).toBe('user');
                expect(request.max_tokens).toBe(10);
            });
            it('should create correct test request for Cohere', () => {
                const request = DaemonServer.createTestRequest('cohere', 'command');
                expect(request.model).toBe('command');
                expect(request.prompt).toBe('Test connection - please respond with "OK"');
                expect(request.max_tokens).toBe(10);
                expect(request.temperature).toBe(0.1);
            });
            it('should throw error for unsupported provider', () => {
                expect(() => {
                    DaemonServer.createTestRequest('unsupported');
                }).toThrow('Unsupported provider for test request: unsupported');
            });
        });
    });
});
//# sourceMappingURL=daemon-server.test.js.map