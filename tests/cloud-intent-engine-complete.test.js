// Complete test for CloudIntentEngine with proper setup
// @ts-nocheck
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
// Create simple mocks
const mockConfigure = jest.fn();
const mockCallRawAPI = jest.fn();
// Mock AI module
jest.mock('../src/ai/ai', () => {
    return {
        AI: jest.fn(() => ({
            configure: mockConfigure,
            callRawAPI: mockCallRawAPI,
        })),
    };
});
// Mock logger
jest.mock('../src/core/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
    },
}));
// Now import after mocks are set up
import { CloudIntentEngine } from '../src/ai/cloud-intent-engine';
describe('CloudIntentEngine - Complete Test', () => {
    let engine;
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mocks
        mockConfigure.mockResolvedValue(undefined);
        mockCallRawAPI.mockResolvedValue({
            choices: [{
                    message: {
                        content: '{}'
                    }
                }]
        });
        engine = new CloudIntentEngine({
            llm: {
                provider: 'openai',
                apiKey: 'test-key',
            },
            execution: {},
            fallback: {},
        });
        // Set up default tools for all tests
        const tools = [
            {
                name: 'search_tool',
                description: 'Search tool',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' }
                    }
                }
            },
            {
                name: 'process_tool',
                description: 'Process tool',
                inputSchema: {
                    type: 'object',
                    properties: {
                        data: { type: 'string' }
                    }
                }
            }
        ];
        engine.setAvailableTools(tools);
    });
    describe('constructor and basic setup', () => {
        it('should create CloudIntentEngine instance', () => {
            expect(engine).toBeInstanceOf(CloudIntentEngine);
            // Verify AI was created
            const { AI } = require('../src/ai/ai');
            expect(AI).toHaveBeenCalled();
        });
        it('should have tools set up', () => {
            const availableTools = engine.getAvailableTools();
            expect(availableTools).toHaveLength(2);
            expect(availableTools[0].name).toBe('search_tool');
        });
    });
    describe('parseIntent', () => {
        it('should parse intent with valid JSON response', async () => {
            // Mock a valid response
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                intents: [
                                    { id: 'A1', type: 'process', description: 'Process query', parameters: { query: 'test' } }
                                ],
                                edges: []
                            })
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            const result = await engine.parseIntent('test query');
            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].id).toBe('A1');
            expect(result.intents[0].type).toBe('process'); // Default type
            expect(result.intents[0].parameters).toEqual({ query: 'test' });
            expect(result.edges).toHaveLength(0);
        });
        it('should parse intent with dependencies', async () => {
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                intents: [
                                    { id: 'A1', type: 'process', description: 'Process first', parameters: { query: 'first' } },
                                    { id: 'A2', type: 'process', description: 'Process results', parameters: { data: 'results' } }
                                ],
                                edges: [{ from: 'A1', to: 'A2' }]
                            })
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            const result = await engine.parseIntent('Process first then results');
            expect(result.intents).toHaveLength(2);
            expect(result.edges).toHaveLength(1);
            expect(result.edges[0]).toEqual({ from: 'A1', to: 'A2' });
        });
        it('should handle empty intent result', async () => {
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                intents: [],
                                edges: []
                            })
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            const result = await engine.parseIntent('test');
            expect(result.intents).toHaveLength(0);
            expect(result.edges).toHaveLength(0);
        });
        it('should handle missing edges in intent result', async () => {
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                intents: [
                                    { id: 'A1', type: 'process', description: 'Process', parameters: {} }
                                ]
                                // edges is missing
                            })
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            const result = await engine.parseIntent('test');
            expect(result.intents).toHaveLength(1);
            expect(result.edges).toHaveLength(0); // Should default to empty array
        });
        it('should handle invalid JSON response with fallback', async () => {
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: 'Invalid JSON'
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            const result = await engine.parseIntent('test');
            // Should fall back to rule-based parsing
            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].type).toBe('process');
            expect(result.intents[0].parameters.query).toBe('test');
        });
        it('should handle parse errors with fallback', async () => {
            mockCallRawAPI.mockRejectedValueOnce(new Error('AI error'));
            // Initialize engine to enable AI
            await engine.initialize();
            const result = await engine.parseIntent('test');
            // Should fall back to rule-based parsing
            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].type).toBe('process');
            expect(result.intents[0].parameters.query).toBe('test');
        });
    });
    describe('selectTools', () => {
        it('should select tools for intents when tools are available', async () => {
            // Mock tool selection response
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                tool_name: 'search_tool',
                                arguments: { query: 'test' },
                                confidence: 0.9
                            })
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            const intents = [
                { id: 'A1', type: 'process', description: 'Process', parameters: { query: 'test' } }
            ];
            const result = await engine.selectTools(intents);
            expect(result).toHaveLength(1);
            expect(result[0].intentId).toBe('A1');
            expect(result[0].toolName).toBe('search_tool');
        });
        it('should handle empty tool selection response', async () => {
            // When AI returns invalid response, should fall back to keyword matching
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: 'Invalid JSON'
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            const intents = [
                { id: 'A1', type: 'process', description: 'Process', parameters: {} }
            ];
            const result = await engine.selectTools(intents);
            // Should fall back to keyword matching when AI fails
            // Since we have process_tool and intent type is "process", it should match
            expect(result).toHaveLength(1);
            expect(result[0].toolName).toBe('process_tool');
        });
        it('should handle tool selection errors gracefully', async () => {
            mockCallRawAPI.mockRejectedValueOnce(new Error('Tool selection failed'));
            // Initialize engine to enable AI
            await engine.initialize();
            const intents = [
                { id: 'A1', type: 'process', description: 'Process', parameters: {} }
            ];
            // CloudIntentEngine handles errors and falls back to keyword matching
            const result = await engine.selectTools(intents);
            expect(result).toHaveLength(1);
            // Since we have process_tool and intent type is "process", it should match
            expect(result[0].toolName).toBe('process_tool');
        });
        it('should select appropriate tool based on intent type', async () => {
            // Mock AI to return search_tool for search-like intent
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                tool_name: 'search_tool',
                                arguments: { query: 'test query' },
                                confidence: 0.9
                            })
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            const intents = [
                { id: 'A1', type: 'process', description: 'Search for information', parameters: { query: 'test query' } }
            ];
            const result = await engine.selectTools(intents);
            expect(result[0].toolName).toBe('search_tool');
            expect(result[0].confidence).toBe(0.9);
        });
    });
    describe('integration tests', () => {
        it('should handle complete workflow from query to tool selection', async () => {
            // Mock parseIntent response
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                intents: [
                                    { id: 'A1', type: 'process', description: 'Search for test', parameters: { query: 'test' } }
                                ],
                                edges: []
                            })
                        }
                    }]
            });
            // Mock selectTools response
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                tool_name: 'search_tool',
                                arguments: { query: 'test' },
                                confidence: 0.85
                            })
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            // Parse intent
            const parseResult = await engine.parseIntent('Search for test');
            expect(parseResult.intents).toHaveLength(1);
            expect(parseResult.intents[0].parameters.query).toBe('test');
            // Select tools
            const toolResult = await engine.selectTools(parseResult.intents);
            expect(toolResult).toHaveLength(1);
            expect(toolResult[0].toolName).toBe('search_tool');
            expect(toolResult[0].confidence).toBe(0.85);
        });
        it('should handle multiple intents workflow', async () => {
            // Mock parseIntent response for multiple intents
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                intents: [
                                    { id: 'A1', type: 'process', description: 'Search first', parameters: { query: 'first' } },
                                    { id: 'A2', type: 'process', description: 'Process results', parameters: { data: 'results' } }
                                ],
                                edges: [{ from: 'A1', to: 'A2' }]
                            })
                        }
                    }]
            });
            // Mock selectTools response for multiple intents (first intent)
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                tool_name: 'search_tool',
                                arguments: { query: 'first' },
                                confidence: 0.9
                            })
                        }
                    }]
            });
            // Mock selectTools response for multiple intents (second intent)
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                tool_name: 'process_tool',
                                arguments: { data: 'results' },
                                confidence: 0.8
                            })
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            // Parse intent
            const parseResult = await engine.parseIntent('Search then process');
            expect(parseResult.intents).toHaveLength(2);
            expect(parseResult.edges).toHaveLength(1);
            // Select tools
            const toolResult = await engine.selectTools(parseResult.intents);
            expect(toolResult).toHaveLength(2);
            expect(toolResult[0].toolName).toBe('search_tool');
            expect(toolResult[1].toolName).toBe('process_tool');
        });
    });
});
//# sourceMappingURL=cloud-intent-engine-complete.test.js.map