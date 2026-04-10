import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
// Create mocks with correct types based on actual AI interface
const mockConfigure = jest.fn();
const mockCallRawAPI = jest.fn();
// Mock AI module - CloudIntentEngine actually calls callRawAPI, not ask
jest.mock('../src/ai/ai', () => {
    return {
        AI: jest.fn(() => ({
            configure: mockConfigure,
            callRawAPI: mockCallRawAPI,
            // Also mock other methods that might be called
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
describe('CloudIntentEngine', () => {
    let engine;
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mocks with proper responses
        mockConfigure.mockResolvedValue(undefined);
        // Mock callRawAPI to return a valid OpenAI-style response
        mockCallRawAPI.mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            intents: [
                                { id: 'A1', type: 'search', description: 'Search', parameters: {} }
                            ],
                            edges: []
                        })
                    }
                }
            ]
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
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('should create CloudIntentEngine instance', () => {
        expect(engine).toBeInstanceOf(CloudIntentEngine);
        // Verify AI was created
        const { AI } = require('../src/ai/ai');
        expect(AI).toHaveBeenCalled();
    });
    it('should parse intent with valid JSON response', async () => {
        // Mock a valid OpenAI-style response for callRawAPI
        mockCallRawAPI.mockResolvedValueOnce({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            intents: [
                                { id: 'A1', type: 'search', description: 'Search', parameters: {} }
                            ],
                            edges: []
                        })
                    }
                }
            ]
        });
        // Need to initialize the engine first
        await engine.initialize();
        const result = await engine.parseIntent('test query');
        expect(result.intents).toHaveLength(1);
        expect(result.intents[0].id).toBe('A1');
        expect(result.intents[0].type).toBe('search');
        expect(mockCallRawAPI).toHaveBeenCalled();
    });
    it('should handle parse errors by falling back to rule-based parsing', async () => {
        // Mock callRawAPI to throw an error
        mockCallRawAPI.mockRejectedValueOnce(new Error('AI error'));
        await engine.initialize();
        // parseIntent should not throw - it should fall back to rule-based parsing
        const result = await engine.parseIntent('test');
        // Should still return a valid result from fallback parsing
        expect(result.intents).toHaveLength(1);
        expect(result.intents[0].type).toBe('process'); // fallback creates a generic 'process' intent
        expect(mockCallRawAPI).toHaveBeenCalled();
    });
    it('should select tools for intents', async () => {
        // Mock tool selection response for callRawAPI
        mockCallRawAPI.mockResolvedValueOnce({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            tool_name: 'test_tool',
                            arguments: {},
                            confidence: 0.9
                        })
                    }
                }
            ]
        });
        // Set up available tools
        engine.setAvailableTools([
            {
                name: 'test_tool',
                description: 'A test tool',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        ]);
        await engine.initialize();
        const intents = [
            { id: 'A1', type: 'search', description: 'Search', parameters: {} }
        ];
        const result = await engine.selectTools(intents);
        expect(result).toHaveLength(1);
        expect(result[0].intentId).toBe('A1');
        expect(result[0].toolName).toBe('test_tool');
        expect(mockCallRawAPI).toHaveBeenCalled();
    });
    it('should handle tool selection errors with fallback', async () => {
        // Mock callRawAPI to throw an error
        mockCallRawAPI.mockRejectedValueOnce(new Error('Tool selection error'));
        // Set up available tools
        engine.setAvailableTools([
            {
                name: 'fallback_tool',
                description: 'A fallback tool',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        ]);
        await engine.initialize();
        const intents = [
            { id: 'A1', type: 'search', description: 'Search', parameters: {} }
        ];
        const result = await engine.selectTools(intents);
        // Should return a result with low confidence from fallback
        expect(result).toHaveLength(1);
        expect(result[0].intentId).toBe('A1');
        expect(result[0].confidence).toBeLessThan(0.5); // Fallback has low confidence
    });
    it('should set and get available tools', () => {
        const tools = [
            {
                name: 'tool1',
                description: 'Tool 1',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'tool2',
                description: 'Tool 2',
                inputSchema: { type: 'object', properties: {} }
            }
        ];
        engine.setAvailableTools(tools);
        const availableTools = engine.getAvailableTools();
        expect(availableTools).toHaveLength(2);
        expect(availableTools[0].name).toBe('tool1');
        expect(availableTools[1].name).toBe('tool2');
    });
    it('should get engine status', async () => {
        await engine.initialize();
        const status = engine.getStatus();
        expect(status.initialized).toBe(true);
        expect(status.llmProvider).toBe('openai');
        expect(status.llmConfigured).toBe(true);
    });
    it('should handle empty tool list in tool selection', async () => {
        // Don't set any tools
        await engine.initialize();
        const intents = [
            { id: 'A1', type: 'search', description: 'Search', parameters: {} }
        ];
        const result = await engine.selectTools(intents);
        expect(result).toHaveLength(1);
        expect(result[0].toolName).toBe('unknown');
        expect(result[0].confidence).toBe(0);
    });
});
//# sourceMappingURL=cloud-intent-engine-final.test.js.map