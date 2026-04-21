/**
 * Comprehensive tests for IntentService
 * Tests all major functionality including intent parsing, error handling, and edge cases
 */

import { IntentService, createIntentService, getIntentService, IntentParseRequest } from '../../src/ai/intent-service';
import { getToolRegistry } from '../../src/tool-registry/registry';
import { createCloudIntentEngine } from '../../src/utils/cloud-intent-engine-factory';

// Mock dependencies
jest.mock('../../src/tool-registry/registry');
jest.mock('../../src/utils/cloud-intent-engine-factory');
jest.mock('@mcpilotx/core', () => ({
  CloudIntentEngine: jest.fn().mockImplementation(() => ({
    setAvailableTools: jest.fn(),
    parseIntent: jest.fn(),
  })),
  intentorch: {
    configureAI: jest.fn(),
  },
}));

describe('IntentService', () => {
  let intentService: IntentService;
  let mockToolRegistry: any;
  let mockCloudIntentEngine: any;
  
  const mockAIConfig = {
    provider: 'openai' as const,
    apiKey: 'test-api-key',
    model: 'gpt-3.5-turbo',
  };
  
  const mockTools = [
    {
      name: 'github.search_repositories',
      description: 'Search GitHub repositories',
      parameters: {
        query: { type: 'string', required: true, description: 'Search query' },
        limit: { type: 'number', required: false, description: 'Result limit' },
      },
    },
    {
      name: 'notion.create_page',
      description: 'Create a new page in Notion',
      parameters: {
        title: { type: 'string', required: true, description: 'Page title' },
        content: { type: 'string', required: false, description: 'Page content' },
      },
    },
    {
      name: 'weather.get_forecast',
      description: 'Get weather forecast for a location',
      parameters: {
        location: { type: 'string', required: true, description: 'City name' },
        days: { type: 'number', required: false, description: 'Number of days' },
      },
    },
  ];
  
  const mockParseResult = {
    intents: [
      {
        id: 'intent-1',
        type: 'search',
        parameters: {
          query: 'react framework',
        },
      },
      {
        id: 'intent-2',
        type: 'create',
        parameters: {
          title: 'React Repositories',
        },
      },
    ],
    toolSelections: [
      {
        intentId: 'intent-1',
        tool: {
          name: 'github.search_repositories',
          description: 'Search GitHub repositories',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              limit: { type: 'number', description: 'Result limit' },
            },
            required: ['query'],
          },
        },
      },
      {
        intentId: 'intent-2',
        tool: {
          name: 'notion.create_page',
          description: 'Create a new page in Notion',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Page title' },
              content: { type: 'string', description: 'Page content' },
            },
            required: ['title'],
          },
        },
      },
    ],
  };
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock tool registry
    mockToolRegistry = {
      load: jest.fn().mockResolvedValue(undefined),
      getAllTools: jest.fn().mockResolvedValue(mockTools),
    };
    (getToolRegistry as jest.Mock).mockReturnValue(mockToolRegistry);
    
    // Setup mock cloud intent engine
    mockCloudIntentEngine = {
      setAvailableTools: jest.fn(),
      parseIntent: jest.fn().mockResolvedValue(mockParseResult),
    };
    (createCloudIntentEngine as jest.Mock).mockResolvedValue(mockCloudIntentEngine);
    
    // Create service instance
    intentService = new IntentService(mockAIConfig);
  });
  
  describe('constructor', () => {
    it('should initialize with provided AI config', () => {
      const service = new IntentService(mockAIConfig);
      expect(service).toBeInstanceOf(IntentService);
    });
    
    it('should load config from environment when no config provided', () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        LLM_PROVIDER: 'anthropic',
        LLM_API_KEY: 'env-api-key',
        LLM_MODEL: 'claude-3-sonnet',
      };
      
      const service = new IntentService();
      expect(service).toBeInstanceOf(IntentService);
      
      // Restore environment
      process.env = originalEnv;
    });
    
    it('should get tool registry instance', () => {
      expect(getToolRegistry).toHaveBeenCalled();
    });
  });
  
  describe('parseIntent', () => {
    const baseRequest: IntentParseRequest = {
      intent: 'Search for React repositories on GitHub and save results to Notion',
      context: {
        previousSteps: [],
        availableServers: ['github-mcp', 'notion-mcp'],
        userPreferences: { format: 'markdown' },
      },
    };
    
    it('should successfully parse intent with tools available', async () => {
      const response = await intentService.parseIntent(baseRequest);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.steps).toHaveLength(2);
      expect(response.data?.status).toBe('success');
      expect(response.data?.confidence).toBeGreaterThan(0);
      expect(response.data?.explanation).toContain('Parsed');
      
      // Verify tool registry was loaded
      expect(mockToolRegistry.load).toHaveBeenCalled();
      expect(mockToolRegistry.getAllTools).toHaveBeenCalled();
      
      // Verify cloud intent engine was used
      expect(mockCloudIntentEngine.setAvailableTools).toHaveBeenCalled();
      expect(mockCloudIntentEngine.parseIntent).toHaveBeenCalledWith(baseRequest.intent);
    });
    
    it('should handle empty tools list', async () => {
      mockToolRegistry.getAllTools.mockResolvedValueOnce([]);
      
      const response = await intentService.parseIntent(baseRequest);
      
      expect(response.success).toBe(true);
      expect(response.data?.steps).toHaveLength(0);
      expect(response.data?.status).toBe('capability_missing');
      expect(response.data?.explanation).toContain('No MCP tools available');
    });
    
    it('should handle parse errors and return error response', async () => {
      const error = new Error('LLM service unavailable');
      mockCloudIntentEngine.parseIntent.mockRejectedValueOnce(error);
      
      const response = await intentService.parseIntent(baseRequest);
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error).toContain('Failed to parse intent');
    });
    
    it('should reuse initialization promise for subsequent calls', async () => {
      // First call
      await intentService.parseIntent(baseRequest);
      
      // Second call - should reuse the same init promise
      await intentService.parseIntent({
        ...baseRequest,
        intent: 'Another intent',
      });
      
      // Tool registry load should only be called once
      expect(mockToolRegistry.load).toHaveBeenCalledTimes(1);
    });
    
    it('should handle intent with no context', async () => {
      const request: IntentParseRequest = {
        intent: 'Get weather forecast for Tokyo',
      };
      
      const response = await intentService.parseIntent(request);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });
    
    it('should handle complex intent with multiple steps', async () => {
      const complexRequest: IntentParseRequest = {
        intent: 'First search for AI projects on GitHub, then create a summary in Notion, and finally send an email with the results',
        context: {
          availableServers: ['github-mcp', 'notion-mcp', 'email-mcp'],
        },
      };
      
      const response = await intentService.parseIntent(complexRequest);
      
      expect(response.success).toBe(true);
      expect(response.data?.steps.length).toBeGreaterThan(0);
    });
  });
  
  describe('convertToWorkflowSteps', () => {
    it('should convert parse result to workflow steps', () => {
      // Access private method via any type
      const service = intentService as any;
      const steps = service.convertToWorkflowSteps(mockParseResult, {
        availableServers: ['github-mcp', 'notion-mcp'],
      });
      
      expect(steps).toHaveLength(2);
      expect(steps[0]).toMatchObject({
        serverId: expect.any(String),
        toolName: 'github.search_repositories',
        parameters: { query: 'react framework' },
      });
      expect(steps[1]).toMatchObject({
        serverId: expect.any(String),
        toolName: 'notion.create_page',
        parameters: { title: 'React Repositories' },
      });
    });
    
    it('should handle empty parse result', () => {
      const service = intentService as any;
      const steps = service.convertToWorkflowSteps(null, {});
      
      expect(steps).toHaveLength(0);
    });
    
    it('should handle parse result with no intents', () => {
      const service = intentService as any;
      const steps = service.convertToWorkflowSteps({ intents: [] }, {});
      
      expect(steps).toHaveLength(0);
    });
    
    it('should handle intents without tool selections', () => {
      const service = intentService as any;
      const parseResult = {
        intents: [{ id: 'intent-1', type: 'search', parameters: {} }],
        toolSelections: [], // No tool selections
      };
      
      const steps = service.convertToWorkflowSteps(parseResult, {});
      
      expect(steps).toHaveLength(0);
    });
  });
  
  describe('extractServerId', () => {
    it('should extract server ID from context when available', () => {
      const service = intentService as any;
      const context = {
        availableServers: ['github-mcp', 'notion-mcp', 'weather-mcp'],
      };
      
      // Tool name that matches server
      const serverId1 = service.extractServerId('github.search_repositories', context);
      expect(serverId1).toBe('github-mcp');
      
      // Tool name that doesn't directly match
      const serverId2 = service.extractServerId('some.other_tool', context);
      expect(serverId2).toBe('github-mcp'); // Should return first available
    });
    
    it('should return generic-service when no context available', () => {
      const service = intentService as any;
      const serverId = service.extractServerId('github.search_repositories', undefined);
      
      expect(serverId).toBe('generic-service');
    });
    
    it('should return generic-service when context has no availableServers', () => {
      const service = intentService as any;
      const serverId = service.extractServerId('github.search_repositories', {});
      
      expect(serverId).toBe('generic-service');
    });
  });
  
  describe('adaptParameters', () => {
    it('should adapt parameters based on tool schema', () => {
      const service = intentService as any;
      const intentParams = {
        query: 'react',
        limit: 10,
      };
      
      const tool = {
        name: 'github.search_repositories',
        inputSchema: {
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Result limit' },
          },
        },
      };
      
      const adapted = service.adaptParameters(intentParams, tool);
      
      expect(adapted).toEqual(intentParams);
    });
    
    it('should map common parameter names', () => {
      const service = intentService as any;
      const intentParams = {
        from_station: 'Beijing',
        to_station: 'Shanghai',
        train_date: '2024-12-25',
      };
      
      const tool = {
        name: 'train.search_tickets',
        inputSchema: {
          properties: {
            from: { type: 'string', description: 'Departure station' },
            to: { type: 'string', description: 'Arrival station' },
            date: { type: 'string', description: 'Travel date' },
          },
        },
      };
      
      const adapted = service.adaptParameters(intentParams, tool);
      
      expect(adapted.from).toBe('Beijing');
      expect(adapted.to).toBe('Shanghai');
      expect(adapted.date).toBe('2024-12-25');
    });
    
    it('should handle empty parameters', () => {
      const service = intentService as any;
      const adapted = service.adaptParameters({}, { inputSchema: { properties: {} } });
      
      expect(adapted).toEqual({});
    });
  });
  
  describe('calculateConfidence', () => {
    it('should calculate confidence based on parse result', () => {
      const service = intentService as any;
      
      // Test with valid parse result
      const confidence1 = service.calculateConfidence(mockParseResult);
      expect(confidence1).toBeGreaterThan(0);
      expect(confidence1).toBeLessThanOrEqual(0.95);
      
      // Test with empty parse result
      const confidence2 = service.calculateConfidence(null);
      expect(confidence2).toBe(0);
      
      // Test with no intents
      const confidence3 = service.calculateConfidence({ intents: [] });
      expect(confidence3).toBe(0);
    });
    
    it('should increase confidence with more intents and tool selections', () => {
      const service = intentService as any;
      
      const simpleResult = {
        intents: [{ id: 'intent-1', type: 'search', parameters: {} }],
        toolSelections: [],
      };
      
      const complexResult = {
        intents: [
          { id: 'intent-1', type: 'search', parameters: {} },
          { id: 'intent-2', type: 'create', parameters: {} },
          { id: 'intent-3', type: 'update', parameters: {} },
        ],
        toolSelections: [
          { intentId: 'intent-1', tool: { name: 'tool1' } },
          { intentId: 'intent-2', tool: { name: 'tool2' } },
        ],
      };
      
      const simpleConfidence = service.calculateConfidence(simpleResult);
      const complexConfidence = service.calculateConfidence(complexResult);
      
      expect(complexConfidence).toBeGreaterThan(simpleConfidence);
    });
  });
  
  describe('generateExplanation', () => {
    it('should generate explanation based on parse result', () => {
      const service = intentService as any;
      
      const explanation = service.generateExplanation(mockParseResult, 3);
      
      expect(explanation).toContain('Parsed');
      expect(explanation).toContain('intent');
      expect(explanation).toContain('available tool');
      expect(explanation).toContain('Selected');
    });
    
    it('should handle empty parse result', () => {
      const service = intentService as any;
      
      const explanation = service.generateExplanation(null, 5);
      
      expect(explanation).toBe('Unable to parse intent. Please try rephrasing your request.');
    });
    
    it('should handle no tool selections', () => {
      const service = intentService as any;
      
      const result = {
        intents: [{ id: 'intent-1', type: 'search', parameters: {} }],
        toolSelections: [],
      };
      
      const explanation = service.generateExplanation(result, 2);
      
      expect(explanation).toContain('No specific tools selected');
    });
  });
  
  // Note: fallbackToSimpleParsing method was removed from IntentService
  // as it's now handled by returning error response directly in parseIntent
  
  describe('singleton functions', () => {
    beforeEach(() => {
      // Clear singleton instance between tests
      jest.resetModules();
    });
    
    it('getIntentService should return singleton instance', () => {
      const service1 = getIntentService(mockAIConfig);
      const service2 = getIntentService(mockAIConfig);
      
      expect(service1).toBe(service2);
    });
    
    it('getIntentService should create new instance when config changes', () => {
      const service1 = getIntentService(mockAIConfig);
      
      const newConfig = { ...mockAIConfig, model: 'gpt-4' };
      const service2 = getIntentService(newConfig);
      
      expect(service2).not.toBe(service1);
    });
    
    it('createIntentService should always return new instance', () => {
      const service1 = createIntentService(mockAIConfig);
      const service2 = createIntentService(mockAIConfig);
      
      expect(service1).not.toBe(service2);
    });
  });
  
  describe('integration tests with real AI configuration', () => {
    // These tests use the actual DeepSeek API key provided by the user
    // They are skipped by default to avoid making real API calls during normal test runs
    // To run these tests, use: npm test -- --testNamePattern="integration tests"
    
    const realAIConfig = {
      provider: 'deepseek' as const,
      apiKey: 'sk-3f84be7f0dfb4c00ad480815602f09be',
      model: 'deepseek-chat',
    };
    
    it.skip('should parse intent with real DeepSeek API (integration test)', async () => {
      // This test requires real API access and is skipped by default
      const service = createIntentService(realAIConfig);
      
      const request: IntentParseRequest = {
        intent: 'Search for React repositories on GitHub',
        context: {
          availableServers: ['github-mcp'],
        },
      };
      
      const response = await service.parseIntent(request);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      // Real API might return different results, but should at least have a response
      expect(response.data?.steps).toBeDefined();
    }, 30000); // Longer timeout for real API call
    
    it.skip('should handle complex intent with real API (integration test)', async () => {
      const service = createIntentService(realAIConfig);
      
      const request: IntentParseRequest = {
        intent: 'Find weather in Tokyo and create a note about it',
        context: {
          availableServers: ['weather-mcp', 'notion-mcp'],
        },
      };
      
      const response = await service.parseIntent(request);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    }, 30000);
  });
  
  describe('error handling and edge cases', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network error
      mockCloudIntentEngine.parseIntent.mockRejectedValueOnce(
        new Error('Network request failed')
      );
      
      const request: IntentParseRequest = {
        intent: 'Test intent',
      };
      
      const response = await intentService.parseIntent(request);
      
      expect(response.success).toBe(false); // Should return error response
      expect(response.error).toBeDefined();
      expect(response.error).toContain('Failed to parse intent');
    });
    
    it('should handle malformed tool registry data', async () => {
      mockToolRegistry.getAllTools.mockResolvedValueOnce([
        { name: 'tool1', description: 'Tool 1' },
        // Missing parameters field
      ]);
      
      const request: IntentParseRequest = {
        intent: 'Test intent',
      };
      
      const response = await intentService.parseIntent(request);
      
      expect(response.success).toBe(true);
      // Should handle missing parameters gracefully
    });
    
    it('should handle empty intent string', async () => {
      const request: IntentParseRequest = {
        intent: '',
      };
      
      // Mock empty parse result for empty intent
      mockCloudIntentEngine.parseIntent.mockResolvedValueOnce({
        intents: [],
        toolSelections: []
      });
      
      const response = await intentService.parseIntent(request);
      
      expect(response.success).toBe(true);
      expect(response.data?.steps).toHaveLength(0);
    });
    
    it('should handle very long intent strings', async () => {
      const longIntent = 'Search for '.repeat(100) + 'React repositories';
      const request: IntentParseRequest = {
        intent: longIntent,
      };
      
      const response = await intentService.parseIntent(request);
      
      expect(response.success).toBe(true);
      // Should handle long strings without crashing
    });
    
    it('should handle special characters in intent', async () => {
      const request: IntentParseRequest = {
        intent: 'Search for @react/#framework & save to "Notion"',
      };
      
      const response = await intentService.parseIntent(request);
      
      expect(response.success).toBe(true);
    });
  });
  
  describe('performance tests', () => {
    it('should parse intent within reasonable time', async () => {
      const request: IntentParseRequest = {
        intent: 'Search for React repositories',
      };
      
      const startTime = Date.now();
      const response = await intentService.parseIntent(request);
      const endTime = Date.now();
      
      expect(response.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
    
    it('should handle multiple concurrent requests', async () => {
      const requests = [
        { intent: 'Search for React' },
        { intent: 'Create a note' },
        { intent: 'Get weather' },
      ];
      
      const promises = requests.map(req => 
        intentService.parseIntent({ intent: req.intent })
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach((response: any) => {
        expect(response.success).toBe(true);
      });
    });
  });
});
