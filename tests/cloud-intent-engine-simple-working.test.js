// Simple test that bypasses TypeScript strict checking
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
describe('CloudIntentEngine - Working Test', () => {
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
    it('should create CloudIntentEngine instance', () => {
        expect(engine).toBeInstanceOf(CloudIntentEngine);
        // Verify AI was created
        const { AI } = require('../src/ai/ai');
        expect(AI).toHaveBeenCalled();
    });
    it('should parse intent with valid JSON response', async () => {
        // Mock a valid response
        mockCallRawAPI.mockResolvedValueOnce({
            choices: [{
                    message: {
                        content: JSON.stringify({
                            intents: [
                                { id: 'A1', type: 'search', description: 'Search', parameters: {} }
                            ],
                            edges: []
                        })
                    }
                }]
        });
        const result = await engine.parseIntent('test query');
        expect(result.intents).toHaveLength(1);
        expect(result.intents[0].id).toBe('A1');
        expect(result.intents[0].type).toBe('search');
    });
    it('should handle parse errors', async () => {
        mockCallRawAPI.mockRejectedValueOnce(new Error('AI error'));
        // When AI fails, it should fallback to rule-based parsing
        const result = await engine.parseIntent('test');
        // Should return a fallback intent
        expect(result.intents).toHaveLength(1);
        expect(result.intents[0].type).toBe('process');
    });
    it('should select tools for intents', async () => {
        // Mock tool selection response - note: parseToolSelectionResponse expects a single object
        // not an array. The selectTools method calls selectToolForIntent for each intent.
        mockCallRawAPI.mockResolvedValueOnce({
            choices: [{
                    message: {
                        content: JSON.stringify({
                            tool_name: 'test_tool',
                            arguments: {},
                            confidence: 0.8
                        })
                    }
                }]
        });
        // Set available tools
        engine.setAvailableTools([
            {
                name: 'test_tool',
                description: 'Test tool',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' }
                    }
                }
            }
        ]);
        const intents = [
            { id: 'A1', type: 'search', description: 'Search', parameters: {} }
        ];
        const result = await engine.selectTools(intents);
        expect(result).toHaveLength(1);
        expect(result[0].intentId).toBe('A1');
        expect(result[0].toolName).toBe('test_tool');
    });
});
//# sourceMappingURL=cloud-intent-engine-simple-working.test.js.map