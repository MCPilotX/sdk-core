// @ts-nocheck
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock AI module before importing CloudIntentEngine
jest.mock('../src/ai/ai', () => {
  const mockAI = {
    configure: jest.fn().mockResolvedValue(undefined),
    callRawAPI: jest.fn().mockResolvedValue({
      choices: [{ message: { content: '{}' } }]
    }),
    getStatus: jest.fn(() => ({ enabled: true })),
  };
  
  return {
    AI: jest.fn(() => mockAI),
    AIError: class AIError extends Error {},
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
  let engine: CloudIntentEngine;

  beforeEach(() => {
    jest.clearAllMocks();
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
    it('should create CloudIntentEngine instance', () => {
      expect(engine).toBeInstanceOf(CloudIntentEngine);
      
      // Verify AI was created
      const { AI } = require('../src/ai/ai');
      expect(AI).toHaveBeenCalled();
    });
  });

  describe('basic functionality', () => {
    it('should set and get tools', () => {
      const tools = [
        { name: 'search_tool', description: 'Search tool', inputSchema: { type: 'object' as const, properties: {} } }
      ];

      engine.setAvailableTools(tools);
      const availableTools = engine.getAvailableTools();
      
      expect(availableTools).toHaveLength(1);
      expect(availableTools[0].name).toBe('search_tool');
    });

    it('should clear tools by setting empty array', () => {
      const tools = [
        { name: 'search_tool', description: 'Search tool', inputSchema: { type: 'object' as const, properties: {} } }
      ];

      engine.setAvailableTools(tools);
      expect(engine.getAvailableTools()).toHaveLength(1);
      
      engine.setAvailableTools([]);
      expect(engine.getAvailableTools()).toHaveLength(0);
    });
  });

  describe('parseIntent', () => {
    it('should parse intent with mocked AI response', async () => {
      // Get the mocked AI instance
      const { AI } = require('../src/ai/ai');
      const aiInstance = AI.mock.results[0].value;
      
      // Mock the callRawAPI method to return a valid response
      aiInstance.callRawAPI.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          intents: [
            { id: 'A1', type: 'search', description: 'Search for information', parameters: { query: 'test' } }
          ],
          edges: []
        }) } }]
      });

      const result = await engine.parseIntent('Search for test information');
      
      expect(result.intents).toHaveLength(1);
      expect(result.intents[0].id).toBe('A1');
      expect(result.intents[0].type).toBe('search');
      expect(result.edges).toHaveLength(0);
    });

    it('should handle parse errors', async () => {
      const { AI } = require('../src/ai/ai');
      const aiInstance = AI.mock.results[0].value;
      
      aiInstance.callRawAPI.mockRejectedValueOnce(new Error('Parse failed'));

      // CloudIntentEngine uses fallback parsing when AI fails
      const result = await engine.parseIntent('test');
      expect(result.intents).toHaveLength(1);
      expect(result.intents[0].type).toBe('process');
    });
  });

  describe('selectTools', () => {
    it('should select tools for intents', async () => {
      // First set up tools
      const tools = [
        { name: 'search_tool', description: 'Search tool', inputSchema: { type: 'object' as const, properties: {} } }
      ];
      engine.setAvailableTools(tools);

      // Get the mocked AI instance
      const { AI } = require('../src/ai/ai');
      const aiInstance = AI.mock.results[0].value;
      
      aiInstance.callRawAPI.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          tool_name: 'search_tool',
          arguments: {},
          confidence: 0.9
        }) } }]
      });

      const intents = [
        { id: 'A1', type: 'search', description: 'Search', parameters: { query: 'test' } }
      ];
      
      const result = await engine.selectTools(intents);
      
      expect(result).toHaveLength(1);
      expect(result[0].intentId).toBe('A1');
      expect(result[0].toolName).toBe('search_tool');
    });
  });
});