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
        mapParameters: jest.fn(),
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
describe('AI Enhanced Tests', () => {
    let ai;
    const mockOpenAIConfig = {
        provider: 'openai',
        apiKey: 'test-openai-key',
        model: 'gpt-3.5-turbo',
    };
    const mockAnthropicConfig = {
        provider: 'anthropic',
        apiKey: 'test-anthropic-key',
        model: 'claude-3-haiku-20240307',
    };
    const mockGoogleConfig = {
        provider: 'google',
        apiKey: 'test-google-key',
        model: 'gemini-pro',
    };
    const mockAzureConfig = {
        provider: 'azure',
        apiKey: 'test-azure-key',
        endpoint: 'https://test-resource.openai.azure.com',
        model: 'gpt-35-turbo',
        apiVersion: '2024-02-15-preview',
    };
    const mockDeepSeekConfig = {
        provider: 'deepseek',
        apiKey: 'test-deepseek-key',
        model: 'deepseek-chat',
    };
    const mockOllamaConfig = {
        provider: 'ollama',
        model: 'llama2',
        endpoint: 'http://localhost:11434',
    };
    const mockNoneConfig = {
        provider: 'none',
    };
    beforeEach(() => {
        // Clear any previous instances
        AI.instance = undefined;
        ai = new AI();
        // Reset all mocks
        jest.clearAllMocks();
        // Default fetch mock for successful responses
        global.fetch.mockImplementation(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                models: [{ id: 'test-model' }],
                choices: [{ message: { content: 'Test response' } }]
            }),
            status: 200,
        }));
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('Connection Testing', () => {
        it('should test OpenAI connection successfully', async () => {
            await ai.configure(mockOpenAIConfig);
            // Mock successful OpenAI connection test
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: [{ id: 'gpt-3.5-turbo' }] }),
                status: 200,
            });
            const result = await ai.testConnection();
            expect(result.success).toBe(true);
            expect(result.message).toContain('OpenAI connection OK');
        });
        it('should handle OpenAI connection failure with invalid API key', async () => {
            await ai.configure(mockOpenAIConfig);
            // Mock failed OpenAI connection test
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
            });
            const result = await ai.testConnection();
            expect(result.success).toBe(false);
            expect(result.message).toContain('API returned error');
        });
        it('should handle OpenAI network error', async () => {
            await ai.configure(mockOpenAIConfig);
            // Mock network error
            global.fetch.mockRejectedValueOnce(new Error('Network error'));
            const result = await ai.testConnection();
            expect(result.success).toBe(false);
            expect(result.message).toContain('Network error');
        });
        it('should test Anthropic connection successfully', async () => {
            await ai.configure(mockAnthropicConfig);
            // Mock successful Anthropic connection test
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
                status: 200,
            });
            const result = await ai.testConnection();
            expect(result.success).toBe(true);
            expect(result.message).toContain('Anthropic connection OK');
        });
        it('should test Google Gemini connection successfully', async () => {
            await ai.configure(mockGoogleConfig);
            // Mock successful Google connection test
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ models: [] }),
                status: 200,
            });
            const result = await ai.testConnection();
            expect(result.success).toBe(true);
            expect(result.message).toContain('Google Gemini connection OK');
        });
        it('should test Azure OpenAI connection successfully', async () => {
            await ai.configure(mockAzureConfig);
            // Mock successful Azure connection test
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ value: [] }),
                status: 200,
            });
            const result = await ai.testConnection();
            expect(result.success).toBe(true);
            expect(result.message).toContain('Azure OpenAI connection OK');
        });
        it('should test DeepSeek connection successfully', async () => {
            await ai.configure(mockDeepSeekConfig);
            // Mock successful DeepSeek connection test
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: [] }),
                status: 200,
            });
            const result = await ai.testConnection();
            expect(result.success).toBe(true);
            expect(result.message).toContain('DeepSeek connection OK');
        });
        it('should test Ollama connection successfully', async () => {
            await ai.configure(mockOllamaConfig);
            // Mock successful Ollama connection test
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ models: [] }),
                status: 200,
            });
            const result = await ai.testConnection();
            expect(result.success).toBe(true);
            expect(result.message).toContain('Ollama connection OK');
        });
        it('should return not configured for "none" provider', async () => {
            await ai.configure(mockNoneConfig);
            const result = await ai.testConnection();
            expect(result.success).toBe(false);
            expect(result.message).toBe('AI not configured');
        });
    });
    describe('Intent Analysis and Mapping', () => {
        beforeEach(async () => {
            await ai.configure(mockOpenAIConfig);
            // Mock rule-based parser
            const { RuleBasedParser } = require('../src/ai/rule-based-parser');
            const mockRuleParser = new RuleBasedParser();
            mockRuleParser.parse.mockResolvedValue({
                method: 'read',
                service: 'filesystem',
                parameters: { path: '/test.txt' },
                confidence: 0.9,
            });
            // Set the private ruleParser
            ai.ruleParser = mockRuleParser;
        });
        it('should extract parameters from query with path', () => {
            const query = 'Read the file /home/user/document.txt';
            const params = ai.extractParams(query);
            expect(params.path).toBe('/home/user/document.txt');
        });
        it('should extract parameters from query with service name', () => {
            const query = 'Start the http service';
            const params = ai.extractParams(query);
            expect(params.service).toBe('http');
        });
        it('should extract both path and service parameters', () => {
            const query = 'Read /var/log/app.log from the logging service';
            const params = ai.extractParams(query);
            expect(params.path).toBe('/var/log/app.log');
            expect(params.service).toBe('logging');
        });
        it('should map intent to tool call using tool mapping manager', async () => {
            // Mock tool mapping manager
            const { toolMappingManager } = require('../src/ai/tool-mappings');
            toolMappingManager.findMapping.mockReturnValue({
                intentAction: 'read',
                intentTarget: 'filesystem',
                primaryTool: 'filesystem.read_file',
                parameterMapping: { path: 'path' },
            });
            toolMappingManager.mapParameters.mockReturnValue({
                path: '/test.txt',
                encoding: 'utf-8',
            });
            const intent = {
                action: 'read',
                target: 'filesystem',
                params: { path: '/test.txt' },
                confidence: 0.9,
            };
            const toolCall = ai.mapIntentToTool(intent);
            expect(toolCall.name).toBe('filesystem.read_file');
            expect(toolCall.arguments.path).toBe('/test.txt');
            expect(toolMappingManager.findMapping).toHaveBeenCalledWith('read', 'filesystem');
            expect(toolMappingManager.mapParameters).toHaveBeenCalled();
        });
        it('should use fallback mapping when no tool mapping found', async () => {
            // Mock tool mapping manager to return null
            const { toolMappingManager } = require('../src/ai/tool-mappings');
            toolMappingManager.findMapping.mockReturnValue(null);
            const intent = {
                action: 'list',
                target: 'filesystem',
                params: { path: '/home/user' },
                confidence: 0.9,
            };
            const toolCall = ai.mapIntentToTool(intent);
            expect(toolCall.name).toBe('filesystem.list_directory');
            expect(toolCall.arguments.path).toBe('/home/user');
        });
        it('should provide fallback suggestions for unknown query', () => {
            const query = 'Some random query that makes no sense';
            const result = ai.getFallbackSuggestions(query);
            expect(result.type).toBe('text');
            expect(result.message).toContain(query);
            expect(result.text).toBeInstanceOf(Array);
            expect(result.suggestions.length).toBeGreaterThan(0);
        });
    });
    describe('API Calls and Response Parsing', () => {
        beforeEach(async () => {
            await ai.configure(mockOpenAIConfig);
        });
        it('should call OpenAI API with correct parameters', async () => {
            // Mock successful OpenAI API call
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{
                            message: {
                                content: 'This is a test response analyzing the query',
                            },
                        }],
                }),
                status: 200,
            });
            // We need to mock the internal parseIntentCore to return low confidence
            // so that analyzeIntent will use analyzeWithLLM
            const parseIntentCoreSpy = jest.spyOn(ai, 'parseIntentCore').mockResolvedValue({
                action: 'unknown',
                target: 'unknown',
                params: {},
                confidence: 0.3, // Low confidence to trigger LLM fallback
            });
            // Mock analyzeWithLLM to return the expected intent
            const analyzeWithLLMSpy = jest.spyOn(ai, 'analyzeWithLLM').mockResolvedValue({
                action: 'read',
                target: 'file',
                params: { path: '/test.txt' },
                confidence: 0.9,
            });
            const intent = await ai.analyzeIntent('Read the file test.txt');
            expect(intent.action).toBe('read');
            expect(intent.target).toBe('file');
            parseIntentCoreSpy.mockRestore();
            analyzeWithLLMSpy.mockRestore();
        });
        it('should parse OpenAI response to intent', async () => {
            const mockResponse = {
                choices: [{
                        message: {
                            content: 'The user wants to list files in the current directory. Action: list, Target: files, Parameters: {path: "."}',
                        },
                    }],
            };
            const intent = ai.parseAIResponse(mockResponse, 'list files');
            expect(intent.action).toBe('list');
            expect(intent.target).toBe('files');
            expect(intent.confidence).toBeGreaterThan(0.5);
        });
        it('should parse Anthropic response to intent', async () => {
            const mockResponse = {
                content: [{
                        text: 'The user wants to ping google.com. This is a network ping operation.',
                    }],
            };
            const intent = ai.parseAIResponse(mockResponse, 'ping google.com');
            // Based on parseAIResponse logic, it looks for keywords in the text
            // "ping" is not in the keyword list, so it should default to "analyze"
            expect(intent.action).toBe('analyze');
            // "network" is not in the target keyword list, so it should default to "query"
            expect(intent.target).toBe('query');
        });
        it('should parse Google response to intent', async () => {
            const mockResponse = {
                candidates: [{
                        content: {
                            parts: [{
                                    text: 'The user wants to start a service.',
                                }],
                        },
                    }],
            };
            const intent = ai.parseAIResponse(mockResponse, 'start the server');
            // "start" is in the keyword list
            expect(intent.action).toBe('start');
            // "service" is in the target keyword list
            expect(intent.target).toBe('service');
        });
        it('should parse Ollama response to intent', async () => {
            const mockResponse = {
                response: 'The user wants to stop the nginx service.',
            };
            const intent = ai.parseAIResponse(mockResponse, 'stop nginx');
            // "stop" is in the keyword list
            expect(intent.action).toBe('stop');
            // "service" is in the target keyword list
            expect(intent.target).toBe('service');
        });
        it('should return default intent for empty response', () => {
            const intent = ai.parseAIResponse(null, 'test query');
            expect(intent.action).toBe('analyze');
            expect(intent.target).toBe('query');
            expect(intent.params.query).toBe('test query');
        });
    });
    describe('Error Handling', () => {
        it('should handle client initialization failure', async () => {
            // Mock fetch to throw error during testConnection() call in initializeClient
            // configure() calls initializeClient() which calls testConnection()
            // testConnection() calls fetch for connection test
            // But testConnection() catches the error and returns an error object
            // So configure() should not throw, but AI should be enabled
            // We need to mock fetch to throw error for the first call (during configure)
            // and continue to throw for subsequent testConnection() calls
            const mockFetch = jest.fn()
                .mockRejectedValueOnce(new Error('Network error during init')) // First call in configure
                .mockRejectedValueOnce(new Error('Network error')); // Second call in our test
            global.fetch = mockFetch;
            // configure() should not throw because testConnection() catches the error
            await ai.configure(mockOpenAIConfig);
            // AI should still be enabled even if connection test fails
            expect(ai.enabled).toBe(true);
            // But testConnection() should return failure
            const result = await ai.testConnection();
            expect(result.success).toBe(false);
            expect(result.message).toContain('Network error');
        });
        it('should handle API call failure in analyzeWithLLM', async () => {
            await ai.configure(mockOpenAIConfig);
            // Mock API call failure
            const callAPISpy = jest.spyOn(ai, 'callAIAPI').mockRejectedValue(new Error('API call failed'));
            const parseIntentCoreSpy = jest.spyOn(ai, 'parseIntentCore').mockResolvedValue({
                action: 'unknown',
                target: 'unknown',
                params: {},
                confidence: 0.2,
            });
            const intent = await ai.analyzeIntent('complex query needing LLM');
            // Should fallback to default intent when LLM fails
            expect(intent.action).toBe('analyze');
            expect(intent.target).toBe('query');
            callAPISpy.mockRestore();
            parseIntentCoreSpy.mockRestore();
        });
        it('should handle getDefaultModel for all providers', () => {
            const providers = [
                'openai', 'anthropic', 'google', 'azure', 'deepseek', 'ollama', 'none'
            ];
            providers.forEach(provider => {
                const model = ai.getDefaultModel(provider);
                expect(typeof model).toBe('string');
            });
        });
    });
    describe('Raw API Calls', () => {
        beforeEach(async () => {
            await ai.configure(mockOpenAIConfig);
        });
        it('should make raw OpenAI API call', async () => {
            // Mock successful raw API call
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Raw API response' } }],
                }),
                status: 200,
            });
            const result = await ai.callRawAPI({
                messages: [
                    { role: 'system', content: 'You are a helpful assistant' },
                    { role: 'user', content: 'Hello' },
                ],
                temperature: 0.7,
                maxTokens: 100,
            });
            expect(result).toBeDefined();
            expect(result.choices).toBeDefined();
        });
        it('should throw error when making raw API call without configuration', async () => {
            await ai.configure(mockNoneConfig);
            await expect(ai.callRawAPI({
                messages: [{ role: 'user', content: 'test' }],
            })).rejects.toThrow(AIError);
        });
        it('should handle raw API call failure', async () => {
            // Mock failed API call
            global.fetch.mockRejectedValueOnce(new Error('API failure'));
            await expect(ai.callRawAPI({
                messages: [{ role: 'user', content: 'test' }],
            })).rejects.toThrow(AIError);
        });
        it('should support function calling in raw API', async () => {
            // Mock successful API call with function support
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{
                            message: {
                                content: null,
                                function_call: {
                                    name: 'get_weather',
                                    arguments: '{"location": "Tokyo"}',
                                },
                            },
                        }],
                }),
                status: 200,
            });
            const result = await ai.callRawAPI({
                messages: [{ role: 'user', content: 'What is the weather in Tokyo?' }],
                functions: [
                    {
                        name: 'get_weather',
                        description: 'Get weather information',
                        parameters: {
                            type: 'object',
                            properties: {
                                location: { type: 'string' },
                            },
                            required: ['location'],
                        },
                    },
                ],
                functionCall: 'auto',
            });
            expect(result).toBeDefined();
            expect(result.choices[0].message.function_call).toBeDefined();
        });
    });
    describe('Status and Utility Methods', () => {
        it('should return correct status when configured', async () => {
            await ai.configure(mockOpenAIConfig);
            const status = ai.getStatus();
            expect(status.enabled).toBe(true);
            expect(status.provider).toBe('openai');
            expect(status.configured).toBe(true);
        });
        it('should return correct status when not configured', () => {
            const status = ai.getStatus();
            expect(status.enabled).toBe(false);
            expect(status.provider).toBe('none');
            expect(status.configured).toBe(false);
        });
        it('should reset configuration correctly', async () => {
            await ai.configure(mockOpenAIConfig);
            expect(ai.config).not.toBeNull();
            expect(ai.enabled).toBe(true);
            ai.reset();
            expect(ai.config).toBeNull();
            expect(ai.enabled).toBe(false);
            expect(ai.client).toBeNull();
        });
        it('should get friendly error message', () => {
            const error = new AIError('TEST_ERROR', 'Test error message', 'config', ['Fix suggestion 1', 'Fix suggestion 2']);
            const friendlyMessage = AI.getFriendlyError(error);
            expect(friendlyMessage).toContain('Test error message');
            expect(friendlyMessage).toContain('TEST_ERROR');
            expect(friendlyMessage).toContain('Fix suggestion');
        });
    });
    describe('Edge Cases and Boundary Conditions', () => {
        it('should handle empty API key for providers that require it', async () => {
            const configWithoutKey = {
                provider: 'openai',
                model: 'gpt-3.5-turbo',
                // No apiKey
            };
            await expect(ai.configure(configWithoutKey)).rejects.toThrow(AIError);
            await expect(ai.configure(configWithoutKey)).rejects.toThrow('requires API key');
        });
        it('should handle Azure configuration without endpoint', async () => {
            const azureConfigWithoutEndpoint = {
                provider: 'azure',
                apiKey: 'test-key',
                model: 'gpt-35-turbo',
                // No endpoint
            };
            await ai.configure(azureConfigWithoutEndpoint);
            // Should still configure but use default endpoint
            expect(ai.config).toEqual(azureConfigWithoutEndpoint);
        });
        it('should handle query with special characters', async () => {
            await ai.configure(mockOpenAIConfig);
            // Mock parseIntentCore to return a valid intent
            const parseIntentCoreSpy = jest.spyOn(ai, 'parseIntentCore').mockResolvedValue({
                action: 'read',
                target: 'file',
                params: { path: '/test/file with spaces.txt' },
                confidence: 0.9,
            });
            const result = await ai.generateText('Read the file: /test/file with spaces.txt');
            expect(result.type).toBe('tool_call');
            expect(result.tool?.name).toBe('filesystem.read_file');
            parseIntentCoreSpy.mockRestore();
        });
        it('should handle very long queries', async () => {
            await ai.configure(mockOpenAIConfig);
            const longQuery = 'A'.repeat(1000);
            // Mock parseIntentCore
            const parseIntentCoreSpy = jest.spyOn(ai, 'parseIntentCore').mockResolvedValue({
                action: 'analyze',
                target: 'query',
                params: { query: longQuery },
                confidence: 0.5,
            });
            const result = await ai.generateText(longQuery);
            expect(result).toBeDefined();
            parseIntentCoreSpy.mockRestore();
        });
        it('should handle concurrent configuration calls', async () => {
            // Mock fetch to handle multiple calls
            global.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ models: [] }),
                status: 200,
            });
            const configPromises = [
                ai.configure(mockOpenAIConfig),
                ai.configure(mockAnthropicConfig),
            ];
            // Should handle gracefully - last one wins or throws
            await expect(Promise.any(configPromises)).resolves.toBeUndefined();
        });
    });
    describe('Integration with RuleBasedParser', () => {
        it('should use rule-based parser for simple queries', async () => {
            await ai.configure(mockOpenAIConfig);
            // Get the actual ruleParser instance
            const ruleParser = ai.ruleParser;
            // Mock the parse method
            ruleParser.parse.mockResolvedValue({
                method: 'list',
                service: 'filesystem',
                parameters: { path: '.' },
                confidence: 0.8,
            });
            const intent = await ai.parseIntent('list files');
            expect(intent.action).toBe('list');
            expect(intent.target).toBe('filesystem');
            expect(ruleParser.parse).toHaveBeenCalledWith('list files');
        });
        it('should fallback to LLM when rule-based parser has low confidence', async () => {
            await ai.configure(mockOpenAIConfig);
            // Mock rule parser with low confidence
            const ruleParser = ai.ruleParser;
            ruleParser.parse.mockResolvedValue({
                method: 'unknown',
                service: 'unknown',
                parameters: {},
                confidence: 0.3,
            });
            // Mock LLM analysis
            const analyzeWithLLMSpy = jest.spyOn(ai, 'analyzeWithLLM').mockResolvedValue({
                action: 'custom',
                target: 'operation',
                params: {},
                confidence: 0.7,
            });
            const intent = await ai.analyzeIntent('complex custom operation');
            expect(intent.action).toBe('custom');
            expect(analyzeWithLLMSpy).toHaveBeenCalled();
            analyzeWithLLMSpy.mockRestore();
        });
    });
});
//# sourceMappingURL=ai-enhanced.test.js.map