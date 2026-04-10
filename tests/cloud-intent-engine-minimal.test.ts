import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Create mocks for AI methods
const mockConfigure = jest.fn();
const mockCallRawAPI = jest.fn();
const mockGetStatus = jest.fn();

// Mock AI module with correct implementation
jest.mock('../src/ai/ai', () => {
  return {
    AI: jest.fn(() => ({
      configure: mockConfigure,
      callRawAPI: mockCallRawAPI,
      getStatus: mockGetStatus,
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

describe('CloudIntentEngine - Minimal Test', () => {
  let engine: CloudIntentEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks
    mockConfigure.mockResolvedValue(undefined);
    mockCallRawAPI.mockResolvedValue({
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
    mockGetStatus.mockReturnValue({ enabled: true });
    
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
    // Mock a valid response for callRawAPI
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

    // Initialize engine first
    await engine.initialize();
    
    const result = await engine.parseIntent('test query');
    
    expect(result.intents).toHaveLength(1);
    expect(result.intents[0].id).toBe('A1');
    expect(result.intents[0].type).toBe('search');
  });

  it('should handle parse errors with fallback', async () => {
    mockCallRawAPI.mockRejectedValueOnce(new Error('AI error'));

    // Initialize engine first
    await engine.initialize();
    
    // parseIntent should not throw but return fallback result
    const result = await engine.parseIntent('test');
    
    // Should return fallback result
    expect(result.intents).toHaveLength(1);
    expect(result.intents[0].type).toBe('process'); // Default fallback type
    expect(result.intents[0].description).toBe('Process query');
  });

  it('should select tools for intents', async () => {
    // Mock tool selection response for callRawAPI
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

    const intents = [
      { id: 'A1', type: 'search', description: 'Search', parameters: {} }
    ];
    
    // Initialize engine first
    await engine.initialize();
    
    const result = await engine.selectTools(intents);
    
    expect(result).toHaveLength(1);
    expect(result[0].intentId).toBe('A1');
    expect(result[0].toolName).toBe('unknown'); // Default when no tools available
  });

  it('should initialize engine successfully', async () => {
    await expect(engine.initialize()).resolves.not.toThrow();
    expect(mockConfigure).toHaveBeenCalledWith({
      provider: 'openai',
      apiKey: 'test-key',
    });
  });

  it('should handle initialization failure', async () => {
    mockConfigure.mockRejectedValueOnce(new Error('Configuration failed'));
    
    await expect(engine.initialize()).rejects.toThrow('Configuration failed');
  });

  it('should set available tools', () => {
    const tools = [
      { name: 'test_tool', description: 'Test tool', inputSchema: { properties: {} } }
    ];
    
    engine.setAvailableTools(tools);
    
    expect(engine.getAvailableTools()).toHaveLength(1);
    expect(engine.getAvailableTools()[0].name).toBe('test_tool');
  });

  it('should get engine status', () => {
    const status = engine.getStatus();
    
    expect(status).toHaveProperty('initialized');
    expect(status).toHaveProperty('toolsCount');
    expect(status).toHaveProperty('llmProvider');
    expect(status).toHaveProperty('llmConfigured');
  });
});
