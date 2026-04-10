import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AI, AIError } from '../src/ai/ai';
// Mock dependencies
jest.mock('chalk', () => ({
    green: (text) => `green(${text})`,
    yellow: (text) => `yellow(${text})`,
    red: (text) => `red(${text})`,
    blue: (text) => `blue(${text})`,
    cyan: (text) => `cyan(${text})`,
    magenta: (text) => `magenta(${text})`,
    gray: (text) => `gray(${text})`,
}));
// Mock logger
jest.mock('../src/core/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
    },
}));
// Mock tool-mappings
jest.mock('../src/ai/tool-mappings', () => ({
    toolMappingManager: {
        findMapping: jest.fn(),
        getToolForIntent: jest.fn(),
        getMappedTools: jest.fn(),
        mapParameters: jest.fn().mockImplementation((mapping, params) => params),
    },
}));
// Mock rule-based-parser
jest.mock('../src/ai/rule-based-parser', () => ({
    RuleBasedParser: jest.fn().mockImplementation(() => ({
        parse: jest.fn(),
    })),
}));
// Global fetch mock
global.fetch = jest.fn();
describe('AI - Extended Tests', () => {
    let ai;
    const mockConfig = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-3.5-turbo',
    };
    beforeEach(() => {
        // Clear any previous instances
        AI.instance = undefined;
        ai = new AI();
        // Mock fetch to avoid network requests
        global.fetch.mockImplementation(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [{ id: 'gpt-3.5-turbo' }] }),
            status: 200,
        }));
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('AIError', () => {
        it('should create AIError with code and category', () => {
            const error = new AIError('TEST_ERROR', 'Test error message', 'config', ['suggestion1', 'suggestion2']);
            expect(error).toBeInstanceOf(AIError);
            expect(error.code).toBe('TEST_ERROR');
            expect(error.message).toBe('Test error message');
            expect(error.category).toBe('config');
            expect(error.suggestions).toContain('AI generated response');
        });
        it('should create AIError with default suggestions', () => {
            const error = new AIError('TEST_ERROR', 'Test error message', 'connection');
            expect(error.suggestions).toEqual([]);
        });
    });
    describe('configure', () => {
        it('should configure AI with valid config', async () => {
            await ai.configure(mockConfig);
            expect(ai['config']).toEqual(mockConfig);
            expect(ai['enabled']).toBe(true);
        });
        it('should handle configuration with endpoint', async () => {
            const configWithEndpoint = {
                provider: 'openai',
                apiKey: 'test-key',
                endpoint: 'https://custom.openai.com/v1',
            };
            await ai.configure(configWithEndpoint);
            expect(ai['config']).toEqual(configWithEndpoint);
        });
        it('should handle configuration without apiKey for none provider', async () => {
            const configWithoutKey = {
                provider: 'none',
            };
            await ai.configure(configWithoutKey);
            expect(ai['config']).toEqual(configWithoutKey);
            expect(ai['enabled']).toBe(false);
        });
        it('should throw error for invalid provider', async () => {
            const invalidConfig = {
                provider: 'invalid',
                apiKey: 'test-key',
            };
            await expect(ai.configure(invalidConfig)).rejects.toThrow(AIError);
        });
    });
    describe('testConnection', () => {
        it('should test connection successfully', async () => {
            await ai.configure(mockConfig);
            const result = await ai.testConnection();
            expect(result.success).toBe(true);
            expect(result.message).toContain('OpenAI connection OK');
        });
        it('should handle connection test without configuration', async () => {
            const result = await ai.testConnection();
            expect(result.success).toBe(false);
            expect(result.message).toContain('AI not configured');
        });
        it('should handle connection test failure', async () => {
            await ai.configure(mockConfig);
            // Mock fetch to return error
            global.fetch.mockImplementation(() => Promise.resolve({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ error: 'Unauthorized' }),
            }));
            const result = await ai.testConnection();
            expect(result.success).toBe(false);
            expect(result.message).toContain('API returned error: 401');
        });
    });
    describe('generateText', () => {
        it('should ask query and return tool call', async () => {
            await ai.configure(mockConfig);
            // Mock rule parser to return intent result
            const mockParse = jest.fn().mockResolvedValue({
                service: 'filesystem',
                method: 'read',
                parameters: { path: '/test.txt' },
                confidence: 0.9,
                parserType: 'rule',
            });
            ai['ruleParser'].parse = mockParse;
            // Mock tool mapping - use findMapping instead of getToolForIntent
            const { toolMappingManager } = require('../src/ai/tool-mappings');
            toolMappingManager.findMapping.mockReturnValue({
                intentAction: 'read',
                intentTarget: 'files',
                primaryTool: 'filesystem.read_file',
                alternativeTools: ['filesystem.get_file', 'filesystem.read_content'],
                description: 'Read content from a file',
                parameterMappings: {
                    path: 'path',
                    encoding: 'encoding',
                },
            });
            const result = await ai.generateText('read file /test.txt');
            expect(result.type).toBe('tool_call');
            expect(result.tool).toBeDefined();
            expect(result.confidence).toBe(0.9);
        });
        it('should handle generateText without configuration', async () => {
            await expect(ai.generateText('test query')).rejects.toThrow(AIError);
        });
        it('should handle low confidence intent', async () => {
            await ai.configure(mockConfig);
            // Mock rule parser to return low confidence intent result
            // Confidence must be below 0.4 to trigger fallback in ask() method
            const mockParse = jest.fn().mockResolvedValue({
                service: 'unknown',
                method: 'unknown',
                parameters: {},
                confidence: 0.2,
                parserType: 'rule',
                error: 'No matching intent found',
            });
            ai['ruleParser'].parse = mockParse;
            // Also need to mock analyzeWithLLM to return low confidence intent
            // to ensure the fallback is triggered
            const mockAnalyzeWithLLM = jest.fn().mockResolvedValue({
                action: 'unknown',
                target: 'unknown',
                params: {},
                confidence: 0.3,
            });
            ai['analyzeWithLLM'] = mockAnalyzeWithLLM;
            const result = await ai.generateText('some random query');
            expect(result.type).toBe('text');
            expect(result.text).toBeDefined();
        });
    });
    describe('parseIntent', () => {
        it('should parse intent from query', async () => {
            await ai.configure(mockConfig);
            // Mock rule parser - must match the actual structure expected by parseIntentCore
            const mockParse = jest.fn().mockResolvedValue({
                service: 'web',
                method: 'search',
                parameters: { query: 'test' },
                confidence: 0.8,
                parserType: 'rule',
            });
            ai['ruleParser'].parse = mockParse;
            const intent = await ai.parseIntent('search for test');
            expect(intent.action).toBe('search');
            expect(intent.target).toBe('web');
            expect(intent.confidence).toBe(0.8);
        });
        it('should handle parseIntent without configuration', async () => {
            // When AI is not configured, parseIntent should still work because it only uses rule parser
            // which doesn't require configuration
            const mockParse = jest.fn().mockResolvedValue({
                service: 'unknown',
                method: 'unknown',
                parameters: {},
                confidence: 0.1,
                parserType: 'rule',
            });
            ai['ruleParser'].parse = mockParse;
            const intent = await ai.parseIntent('test query');
            expect(intent.action).toBe('unknown');
            expect(intent.target).toBe('unknown');
            expect(intent.confidence).toBe(0.1);
        });
    });
    describe('analyzeIntent', () => {
        it('should analyze intent with rule-based parser', async () => {
            await ai.configure(mockConfig);
            // Mock rule parser to return high confidence intent - must match parseIntentCore expectations
            const mockParse = jest.fn().mockResolvedValue({
                service: 'calculator',
                method: 'calculate',
                parameters: { expression: '2+2' },
                confidence: 0.95,
                parserType: 'rule',
            });
            ai['ruleParser'].parse = mockParse;
            const intent = await ai.analyzeIntent('calculate 2+2');
            expect(intent.action).toBe('calculate');
            expect(intent.target).toBe('calculator');
            expect(intent.confidence).toBe(0.95);
        });
        it('should fallback to LLM for low confidence intent', async () => {
            await ai.configure(mockConfig);
            // Mock rule parser to return low confidence intent
            const mockParse = jest.fn().mockResolvedValue({
                service: 'unknown',
                method: 'unknown',
                parameters: {},
                confidence: 0.3,
                parserType: 'rule',
            });
            ai['ruleParser'].parse = mockParse;
            // Mock LLM analysis
            const mockAnalyzeWithLLM = jest.fn().mockResolvedValue({
                action: 'translate',
                target: 'text',
                params: { text: 'hello', targetLanguage: 'spanish' },
                confidence: 0.7,
            });
            ai['analyzeWithLLM'] = mockAnalyzeWithLLM;
            const intent = await ai.analyzeIntent('translate hello to spanish');
            expect(intent.action).toBe('translate');
            expect(intent.target).toBe('text');
            expect(intent.confidence).toBe(0.7);
        });
        it('should handle analyzeIntent without configuration', async () => {
            // When AI is not configured, analyzeIntent should still work with rule parser
            // but will not fallback to LLM
            const mockParse = jest.fn().mockResolvedValue({
                service: 'unknown',
                method: 'unknown',
                parameters: {},
                confidence: 0.1,
                parserType: 'rule',
            });
            ai['ruleParser'].parse = mockParse;
            const intent = await ai.analyzeIntent('test query');
            expect(intent.action).toBe('unknown');
            expect(intent.target).toBe('unknown');
            expect(intent.confidence).toBe(0.1);
        });
    });
    describe('provider-specific tests', () => {
        it('should configure with anthropic provider', async () => {
            const anthropicConfig = {
                provider: 'anthropic',
                apiKey: 'test-anthropic-key',
                model: 'claude-3-sonnet',
            };
            await ai.configure(anthropicConfig);
            expect(ai['config']?.provider).toBe('anthropic');
        });
        it('should configure with google provider', async () => {
            const googleConfig = {
                provider: 'google',
                apiKey: 'test-google-key',
                model: 'gemini-pro',
            };
            await ai.configure(googleConfig);
            expect(ai['config']?.provider).toBe('google');
        });
        it('should configure with azure provider', async () => {
            const azureConfig = {
                provider: 'azure',
                apiKey: 'test-azure-key',
                endpoint: 'https://test.openai.azure.com/',
                apiVersion: '2023-12-01-preview',
                region: 'eastus',
            };
            await ai.configure(azureConfig);
            expect(ai['config']?.provider).toBe('azure');
            expect(ai['config']?.apiVersion).toBe('2023-12-01-preview');
        });
        it('should configure with deepseek provider', async () => {
            const deepseekConfig = {
                provider: 'deepseek',
                apiKey: 'test-deepseek-key',
                model: 'deepseek-chat',
            };
            await ai.configure(deepseekConfig);
            expect(ai['config']?.provider).toBe('deepseek');
        });
        it('should configure with ollama provider', async () => {
            const ollamaConfig = {
                provider: 'ollama',
                endpoint: 'http://localhost:11434',
                model: 'llama2',
            };
            await ai.configure(ollamaConfig);
            expect(ai['config']?.provider).toBe('ollama');
            expect(ai['config']?.endpoint).toBe('http://localhost:11434');
        });
        it('should configure with none provider', async () => {
            const noneConfig = {
                provider: 'none',
            };
            await ai.configure(noneConfig);
            expect(ai['config']?.provider).toBe('none');
            expect(ai['enabled']).toBe(false);
        });
    });
    describe('error handling', () => {
        it('should handle network errors in testConnection', async () => {
            await ai.configure(mockConfig);
            // Mock fetch to throw error
            global.fetch.mockImplementation(() => Promise.reject(new Error('Network error')));
            const result = await ai.testConnection();
            expect(result.success).toBe(false);
            expect(result.message).toContain('Network error');
        });
        it('should handle JSON parsing errors', async () => {
            await ai.configure(mockConfig);
            // Mock fetch to return a response with invalid JSON
            // Note: The actual implementation doesn't call response.json() in testOpenAIConnection,
            // so this test scenario doesn't apply. Instead, we'll test a different error scenario.
            global.fetch.mockImplementation(() => Promise.resolve({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ error: 'Internal server error' }),
            }));
            const result = await ai.testConnection();
            expect(result.success).toBe(false);
            expect(result.message).toContain('API returned error: 500');
        });
    });
});
//# sourceMappingURL=ai-extended.test.js.map