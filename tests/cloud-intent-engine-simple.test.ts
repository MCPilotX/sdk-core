import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CloudIntentEngine } from '../src/ai/cloud-intent-engine';

// Mock AI module
const mockConfigure = jest.fn<any>().mockResolvedValue(undefined);
const mockAsk = jest.fn<any>().mockResolvedValue({ answer: 'Test answer' });

jest.mock('../src/ai/ai', () => {
  return {
    AI: jest.fn().mockImplementation(() => ({
      configure: mockConfigure,
      ask: mockAsk,
    })),
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

  describe('parseIntent', () => {
    it('should parse simple intent', async () => {
      // Mock AI response for intent parsing
      mockAsk.mockResolvedValue({
        answer: JSON.stringify({
          intents: [
            { id: 'A1', type: 'search', description: 'Search for information', parameters: { query: 'test' } }
          ],
          edges: []
        })
      });

      const result = await engine.parseIntent('Search for test information');
      
      expect(result.intents).toHaveLength(1);
      expect(result.intents[0].id).toBeDefined();
      expect(result.intents[0].type).toBe('search');
      expect(result.edges).toHaveLength(0);
    });

    it('should handle parse errors', async () => {
      mockAsk.mockRejectedValue(new Error('Parse failed'));

      // The method might handle errors internally, so we just verify it doesn't crash
      const result = await engine.parseIntent('test');
      expect(result).toBeDefined();
      expect(result.intents).toBeDefined();
      expect(result.edges).toBeDefined();
    });
  });

  describe('selectTools', () => {
    it('should select tools for intents', async () => {
      const intents = [
        { id: 'A1', type: 'search', description: 'Search', parameters: { query: 'test' } }
      ];
      
      // Set available tools first
      engine.setAvailableTools([
        { 
          name: 'search_tool', 
          description: 'Search tool', 
          inputSchema: { 
            type: 'object' as const, 
            properties: {} 
          } 
        }
      ]);
      
      mockAsk.mockResolvedValue({
        answer: JSON.stringify([
          { intentId: 'A1', toolName: 'search_tool' }
        ])
      });

      const result = await engine.selectTools(intents);
      
      expect(result).toHaveLength(1);
      expect(result[0].intentId).toBe('A1');
      expect(result[0].toolName).toBe('search_tool');
    });
  });

  describe('setAvailableTools', () => {
    it('should set available tools', () => {
      const tools = [
        { 
          name: 'search_tool', 
          description: 'Search tool', 
          inputSchema: { 
            type: 'object' as const, 
            properties: {} 
          } 
        }
      ];

      engine.setAvailableTools(tools);
      
      // Verify tools were set
      const availableTools = (engine as any).availableTools;
      expect(availableTools).toHaveLength(1);
      expect(availableTools[0].name).toBe('search_tool');
    });
  });
});