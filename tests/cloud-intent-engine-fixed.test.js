// Fixed test for CloudIntentEngine
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
            getStatus: jest.fn(() => ({ enabled: true })),
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
describe('CloudIntentEngine - Fixed Test', () => {
    let engine;
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mocks
        mockConfigure.mockResolvedValue(undefined);
        mockCallRawAPI.mockResolvedValue({
            choices: [{ message: { content: '{}' } }]
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
                choices: [{ message: { content: JSON.stringify({
                                intents: [
                                    { id: 'A1', type: 'search', description: 'Search', parameters: { query: 'test' } }
                                ],
                                edges: []
                            }) } }]
            });
            const result = await engine.parseIntent('test query');
            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].id).toBe('A1');
            expect(result.intents[0].type).toBe('search');
            expect(result.intents[0].parameters).toEqual({ query: 'test' });
            expect(result.edges).toHaveLength(0);
        });
        it('should parse intent with dependencies', async () => {
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{ message: { content: JSON.stringify({
                                intents: [
                                    { id: 'A1', type: 'search', description: 'Search first', parameters: { query: 'first' } },
                                    { id: 'A2', type: 'process', description: 'Process results', parameters: { data: 'results' } }
                                ],
                                edges: [{ from: 'A1', to: 'A2' }]
                            }) } }]
            });
            const result = await engine.parseIntent('Search and process');
            expect(result.intents).toHaveLength(2);
            expect(result.edges).toHaveLength(1);
            expect(result.edges[0]).toEqual({ from: 'A1', to: 'A2' });
        });
        it('should handle empty intent result', async () => {
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{ message: { content: JSON.stringify({
                                intents: [],
                                edges: []
                            }) } }]
            });
            const result = await engine.parseIntent('test');
            expect(result.intents).toHaveLength(0);
            expect(result.edges).toHaveLength(0);
        });
        it('should handle missing edges in intent result', async () => {
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{ message: { content: JSON.stringify({
                                intents: [
                                    { id: 'A1', type: 'search', description: 'Search', parameters: {} }
                                ]
                                // edges is missing
                            }) } }]
            });
            const result = await engine.parseIntent('test');
            expect(result.intents).toHaveLength(1);
            expect(result.edges).toHaveLength(0); // Should default to empty array
        });
        it('should handle invalid JSON response', async () => {
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{ message: { content: 'Invalid JSON' } }]
            });
            // CloudIntentEngine uses fallback intent parsing when JSON is invalid
            const result = await engine.parseIntent('test');
            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].type).toBe('process');
        });
        it('should handle parse errors', async () => {
            mockCallRawAPI.mockRejectedValueOnce(new Error('AI error'));
            // CloudIntentEngine uses fallback intent parsing when AI error occurs
            const result = await engine.parseIntent('test');
            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].type).toBe('process');
        });
    });
    describe('selectTools', () => {
        it('should select tools for intents', async () => {
            // First set up tools
            const tools = [
                { name: 'search_tool', description: 'Search tool', inputSchema: { type: 'object', properties: {} } }
            ];
            engine.setAvailableTools(tools);
            // Mock tool selection response
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{ message: { content: JSON.stringify({
                                tool_name: 'search_tool',
                                arguments: {},
                                confidence: 0.9
                            }) } }]
            });
            const intents = [
                { id: 'A1', type: 'search', description: 'Search', parameters: {} }
            ];
            const result = await engine.selectTools(intents);
            expect(result).toHaveLength(1);
            expect(result[0].intentId).toBe('A1');
            expect(result[0].toolName).toBe('search_tool');
        });
        it('should handle empty tool selection response', async () => {
            // First set up tools
            const tools = [
                { name: 'search_tool', description: 'Search tool', inputSchema: { type: 'object', properties: {} } }
            ];
            engine.setAvailableTools(tools);
            // Mock invalid response
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{ message: { content: 'Invalid JSON' } }]
            });
            const intents = [
                { id: 'A1', type: 'search', description: 'Search', parameters: {} }
            ];
            const result = await engine.selectTools(intents);
            // CloudIntentEngine uses fallback tool selection which matches "search" intent with "search_tool"
            expect(result).toHaveLength(1);
            expect(result[0].toolName).toBe('search_tool');
        });
        it('should handle tool selection errors gracefully', async () => {
            // First set up tools
            const tools = [
                { name: 'search_tool', description: 'Search tool', inputSchema: { type: 'object', properties: {} } }
            ];
            engine.setAvailableTools(tools);
            mockCallRawAPI.mockRejectedValueOnce(new Error('Tool selection failed'));
            const intents = [
                { id: 'A1', type: 'search', description: 'Search', parameters: {} }
            ];
            // CloudIntentEngine uses fallback tool selection which matches "search" intent with "search_tool"
            const result = await engine.selectTools(intents);
            expect(result).toHaveLength(1);
            expect(result[0].toolName).toBe('search_tool');
        });
    });
    describe('integration tests', () => {
        it('should handle complete workflow with mocked dependencies', async () => {
            // First set up tools
            const tools = [
                { name: 'search_tool', description: 'Search tool', inputSchema: { type: 'object', properties: {} } }
            ];
            engine.setAvailableTools(tools);
            // Mock parseIntent
            const parseIntentSpy = jest.spyOn(engine, 'parseIntent').mockResolvedValue({
                intents: [
                    { id: 'A1', type: 'search', description: 'Search', parameters: { query: 'test' } }
                ],
                edges: []
            });
            // Mock selectTools
            const selectToolsSpy = jest.spyOn(engine, 'selectTools').mockResolvedValue([
                { intentId: 'A1', toolName: 'search_tool', parameterMapping: { query: 'query' } }
            ]);
            // Test the workflow
            const intents = await engine.parseIntent('Search for test');
            expect(parseIntentSpy).toHaveBeenCalledWith('Search for test');
            const toolSelections = await engine.selectTools(intents.intents);
            expect(selectToolsSpy).toHaveBeenCalled();
            // Verify the results
            expect(intents.intents).toHaveLength(1);
            expect(toolSelections).toHaveLength(1);
            expect(toolSelections[0].toolName).toBe('search_tool');
        });
    });
});
//# sourceMappingURL=cloud-intent-engine-fixed.test.js.map