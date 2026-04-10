// Extended test for CloudIntentEngine
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
describe('CloudIntentEngine - Extended Test', () => {
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
    });
    describe('constructor and basic setup', () => {
        it('should create CloudIntentEngine instance', () => {
            expect(engine).toBeInstanceOf(CloudIntentEngine);
            // Verify AI was created
            const { AI } = require('../src/ai/ai');
            expect(AI).toHaveBeenCalled();
        });
        it('should initialize with empty tool lists', () => {
            const availableTools = engine.availableTools;
            const toolCache = engine.toolCache;
            expect(availableTools).toEqual([]);
            expect(toolCache.size).toBe(0);
        });
    });
    describe('tool management', () => {
        it('should set available tools', () => {
            const tools = [
                { name: 'search_tool', description: 'Search tool', inputSchema: { type: 'object', properties: {} } },
                { name: 'process_tool', description: 'Process tool', inputSchema: { type: 'object', properties: {} } }
            ];
            engine.setAvailableTools(tools);
            // Verify tools were set
            const availableTools = engine.availableTools;
            expect(availableTools).toHaveLength(2);
            expect(availableTools[0].name).toBe('search_tool');
            expect(availableTools[1].name).toBe('process_tool');
            // Verify tool cache was built
            const toolCache = engine.toolCache;
            expect(toolCache.size).toBe(2);
            expect(toolCache.get('search_tool')).toBe(tools[0]);
            expect(toolCache.get('process_tool')).toBe(tools[1]);
        });
        it('should clear tool cache when setting new tools', () => {
            const tools1 = [
                { name: 'tool1', description: 'Tool 1', inputSchema: { type: 'object', properties: {} } }
            ];
            const tools2 = [
                { name: 'tool2', description: 'Tool 2', inputSchema: { type: 'object', properties: {} } }
            ];
            engine.setAvailableTools(tools1);
            const cache1 = engine.toolCache;
            expect(cache1.size).toBe(1);
            engine.setAvailableTools(tools2);
            const cache2 = engine.toolCache;
            expect(cache2.size).toBe(1); // Should be cleared and rebuilt
            expect(cache2.get('tool2')).toBe(tools2[0]);
            expect(cache2.get('tool1')).toBeUndefined(); // Old tool should not be in cache
        });
        it('should get available tools', () => {
            const tools = [
                { name: 'search_tool', description: 'Search tool', inputSchema: { type: 'object', properties: {} } }
            ];
            engine.setAvailableTools(tools);
            const availableTools = engine.getAvailableTools();
            expect(availableTools).toHaveLength(1);
            expect(availableTools[0].name).toBe('search_tool');
        });
        it('should return empty array when no tools set', () => {
            const availableTools = engine.getAvailableTools();
            expect(availableTools).toHaveLength(0);
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
                                    { id: 'A1', type: 'search', description: 'Search', parameters: { query: 'test' } }
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
            expect(result.intents[0].type).toBe('search');
            expect(result.intents[0].parameters).toEqual({ query: 'test' });
            expect(result.edges).toHaveLength(0);
        });
        it('should parse intent with dependencies', async () => {
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                intents: [
                                    { id: 'A1', type: 'search', description: 'Search first', parameters: { query: 'first' } },
                                    { id: 'A2', type: 'process', description: 'Process results', parameters: { data: 'results' } }
                                ],
                                edges: [{ from: 'A1', to: 'A2' }]
                            })
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            const result = await engine.parseIntent('Search and process');
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
                                    { id: 'A1', type: 'search', description: 'Search', parameters: {} }
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
        it('should select tools for intents', async () => {
            // Set available tools first
            const tools = [
                { name: 'search_tool', description: 'Search tool', inputSchema: { type: 'object', properties: {} } }
            ];
            engine.setAvailableTools(tools);
            // Mock tool selection response
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                tool_name: 'search_tool',
                                arguments: {},
                                confidence: 0.9
                            })
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            const intents = [
                { id: 'A1', type: 'search', description: 'Search', parameters: {} }
            ];
            const result = await engine.selectTools(intents);
            expect(result).toHaveLength(1);
            expect(result[0].intentId).toBe('A1');
            expect(result[0].toolName).toBe('search_tool');
        });
        it('should handle empty tool selection', async () => {
            // When no tools are available, it should return unknown tool
            // Initialize engine to enable AI
            await engine.initialize();
            const intents = [
                { id: 'A1', type: 'search', description: 'Search', parameters: {} }
            ];
            const result = await engine.selectTools(intents);
            expect(result).toHaveLength(1);
            expect(result[0].toolName).toBe('unknown');
        });
        it('should handle tool selection errors', async () => {
            mockCallRawAPI.mockRejectedValueOnce(new Error('Tool selection failed'));
            // Initialize engine to enable AI
            await engine.initialize();
            const intents = [
                { id: 'A1', type: 'search', description: 'Search', parameters: {} }
            ];
            // Should fall back to unknown tool when AI fails
            const result = await engine.selectTools(intents);
            expect(result).toHaveLength(1);
            expect(result[0].toolName).toBe('unknown');
        });
    });
    describe('workflow execution', () => {
        it('should parse and plan workflow', async () => {
            // Mock parseIntent response
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                intents: [
                                    { id: 'A1', type: 'search', description: 'Search', parameters: { query: 'test' } }
                                ],
                                edges: []
                            })
                        }
                    }]
            });
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
            // Set available tools
            const tools = [
                { name: 'search_tool', description: 'Search tool', inputSchema: { type: 'object', properties: {} } }
            ];
            engine.setAvailableTools(tools);
            // Initialize engine to enable AI
            await engine.initialize();
            const plan = await engine.parseAndPlan('Search for test');
            expect(plan.query).toBe('Search for test');
            expect(plan.parsedIntents).toHaveLength(1);
            expect(plan.parsedIntents[0].type).toBe('search');
            expect(plan.toolSelections).toHaveLength(1);
            expect(plan.toolSelections[0].toolName).toBe('search_tool');
        });
        it('should execute workflow with tool executor', async () => {
            const intents = [
                { id: 'A1', type: 'search', description: 'Search', parameters: { query: 'test' } }
            ];
            const toolSelections = [
                {
                    intentId: 'A1',
                    toolName: 'search_tool',
                    toolDescription: 'Search tool',
                    mappedParameters: { query: 'test' },
                    confidence: 0.9
                }
            ];
            const edges = [];
            const mockToolExecutor = jest.fn().mockResolvedValue({ result: 'success' });
            const result = await engine.executeWorkflow(intents, toolSelections, edges, mockToolExecutor);
            expect(result.success).toBe(true);
            expect(result.stepResults).toHaveLength(1);
            expect(result.stepResults[0].intentId).toBe('A1');
            expect(result.stepResults[0].toolName).toBe('search_tool');
            expect(result.stepResults[0].success).toBe(true);
            expect(mockToolExecutor).toHaveBeenCalledWith('search_tool', { query: 'test' });
        });
    });
});
//# sourceMappingURL=cloud-intent-engine-extended.test.js.map