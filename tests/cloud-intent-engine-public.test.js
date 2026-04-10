// Test only public methods of CloudIntentEngine
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
describe('CloudIntentEngine - Public Interface Test', () => {
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
    describe('constructor', () => {
        it('should create instance with configuration', () => {
            expect(engine).toBeInstanceOf(CloudIntentEngine);
            const { AI } = require('../src/ai/ai');
            expect(AI).toHaveBeenCalled();
        });
    });
    describe('setAvailableTools', () => {
        it('should accept tools array', () => {
            const tools = [
                { name: 'test_tool', description: 'Test tool', inputSchema: { type: 'object', properties: {} } }
            ];
            // This should not throw
            engine.setAvailableTools(tools);
            // Verify internal state through any access
            const availableTools = engine.availableTools;
            expect(availableTools).toHaveLength(1);
            expect(availableTools[0].name).toBe('test_tool');
        });
    });
    describe('parseIntent', () => {
        it('should call AI.callRawAPI with query', async () => {
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                intents: [{ id: 'A1', type: 'process', description: 'Test', parameters: {} }],
                                edges: []
                            })
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            const result = await engine.parseIntent('test query');
            expect(mockCallRawAPI).toHaveBeenCalled();
            expect(result.intents).toBeDefined();
            expect(result.edges).toBeDefined();
        });
        it('should handle AI errors with fallback', async () => {
            mockCallRawAPI.mockRejectedValueOnce(new Error('AI failed'));
            // Initialize engine to enable AI
            await engine.initialize();
            const result = await engine.parseIntent('test');
            // Should fall back to rule-based parsing
            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].type).toBe('process');
        });
        it('should handle invalid JSON response with fallback', async () => {
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: 'invalid json'
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            const result = await engine.parseIntent('test');
            // Should fall back to rule-based parsing
            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].type).toBe('process');
        });
    });
    describe('selectTools', () => {
        it('should call AI.callRawAPI with intents', async () => {
            // First set up tools
            const tools = [
                { name: 'test_tool', description: 'Test tool', inputSchema: { type: 'object', properties: {} } }
            ];
            engine.setAvailableTools(tools);
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                tool_name: 'test_tool',
                                arguments: {},
                                confidence: 0.9
                            })
                        }
                    }]
            });
            // Initialize engine to enable AI
            await engine.initialize();
            const intents = [
                { id: 'A1', type: 'process', description: 'Test', parameters: {} }
            ];
            const result = await engine.selectTools(intents);
            expect(mockCallRawAPI).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });
        it('should handle empty intents array', async () => {
            const result = await engine.selectTools([]);
            expect(result).toEqual([]);
        });
        it('should handle AI errors in tool selection', async () => {
            mockCallRawAPI.mockRejectedValueOnce(new Error('Tool selection failed'));
            // Initialize engine to enable AI
            await engine.initialize();
            const intents = [
                { id: 'A1', type: 'process', description: 'Test', parameters: {} }
            ];
            const result = await engine.selectTools(intents);
            // Should handle error gracefully with fallback
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
        });
    });
    describe('integration - basic workflow', () => {
        it('should parse and select tools in sequence', async () => {
            // Mock parseIntent response
            mockCallRawAPI.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: JSON.stringify({
                                intents: [{ id: 'A1', type: 'process', description: 'Test', parameters: { query: 'test' } }],
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
                                tool_name: 'test_tool',
                                arguments: { query: 'test' },
                                confidence: 0.8
                            })
                        }
                    }]
            });
            // Set up tools
            const tools = [
                { name: 'test_tool', description: 'Test tool', inputSchema: { type: 'object', properties: {} } }
            ];
            engine.setAvailableTools(tools);
            // Initialize engine to enable AI
            await engine.initialize();
            // Parse intent
            const parseResult = await engine.parseIntent('test query');
            expect(parseResult.intents).toHaveLength(1);
            // Select tools
            const toolResult = await engine.selectTools(parseResult.intents);
            expect(toolResult).toHaveLength(1);
            // Verify mock was called twice
            expect(mockCallRawAPI).toHaveBeenCalledTimes(2);
        });
    });
});
//# sourceMappingURL=cloud-intent-engine-public.test.js.map