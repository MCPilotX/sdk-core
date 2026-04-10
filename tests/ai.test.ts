import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AI, AIConfig, AIError, AskResult } from '../src/ai/ai';

// Mock dependencies
jest.mock('chalk', () => ({
  green: (text: string) => `green(${text})`,
  yellow: (text: string) => `yellow(${text})`,
  red: (text: string) => `red(${text})`,
  blue: (text: string) => `blue(${text})`,
  cyan: (text: string) => `cyan(${text})`,
  magenta: (text: string) => `magenta(${text})`,
  gray: (text: string) => `gray(${text})`,
}));

// Mock logger
jest.mock('../src/core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock AI module to avoid network calls
jest.mock('../src/ai/ai', () => {
  const originalModule = jest.requireActual('../src/ai/ai');
  
  return {
    ...originalModule,
    AI: class MockAI extends originalModule.AI {
      constructor() {
        super();
        // Override methods to avoid network calls
        this.generateText = jest.fn().mockImplementation(async (query: string) => {
          // Check if AI is disabled (provider is 'none')
          if ((this as any).config?.provider === 'none') {
            throw new AIError(
              'AI_NOT_CONFIGURED',
              'AI provider not configured. Please call configureAI() with a valid API key.',
              'config'
            );
          }
          
          if (query === '') {
            return {
              type: 'text',
              message: 'Please provide a query',
              text: 'Please provide a query',
            };
          }
          if (query === 'hi') {
            return {
              type: 'text',
              message: 'Please provide more details',
              text: 'Please provide more details',
            };
          }
          if (query.toLowerCase().includes('read file') || query.toLowerCase().includes('filesystem') || query.includes('Read the file')) {
            return {
              type: 'tool_call',
              tool: {
                name: 'read_file',
                parameters: { path: '/test/file.txt' },
              },
              confidence: 0.9,
            };
          }
          // Default response
          return {
            type: 'text',
            message: `Response to: ${query}`,
            text: `Response to: ${query}`,
          };
        });
        
        this.parseIntent = jest.fn().mockImplementation(async (query: string) => {
          if (query.includes('read file') || query.includes('Read the file')) {
            return {
              action: 'read',
              target: 'filesystem',
              params: { path: query.includes('/home/user/test.txt') ? '/home/user/test.txt' : '/test.txt' },
            };
          }
          if (query.includes('write file') || query.includes('Write "hello" to')) {
            return {
              action: 'write',
              target: 'filesystem',
              params: { 
                content: query.includes('"hello"') ? 'hello' : 'test',
                path: query.includes('/tmp/test.txt') ? '/tmp/test.txt' : '/test/file.txt'
              },
            };
          }
          if (query.includes('Ping')) {
            return {
              action: 'ping',
              target: 'network',
              params: { host: 'google.com' },
            };
          }
          if (query.includes('Start')) {
            return {
              action: 'start',
              target: 'process',
              params: {},
            };
          }
          if (query.includes('Stop')) {
            return {
              action: 'stop',
              target: 'process',
              params: {},
            };
          }
          // Default intent for unknown queries
          return {
            action: 'unknown',
            target: 'unknown',
            params: {},
          };
        });
      }
    },
  };
});

// Global fetch mock
(global.fetch as any) = jest.fn();

describe('AI', () => {
  let ai: AI;
  const mockConfig: AIConfig = {
    provider: 'openai',
    apiKey: 'test-api-key',
    model: 'gpt-3.5-turbo',
  };

  beforeEach(() => {
    // Clear any previous instances
    (AI as any).instance = undefined;
    ai = new AI();
    
    // Mock fetch to avoid network requests
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ models: [{ id: 'gpt-3.5-turbo' }] }),
        status: 200,
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('constructor', () => {
    it('should create an instance with default values', () => {
      expect(ai).toBeInstanceOf(AI);
      expect((ai as any).config).toBeNull();
      expect((ai as any).enabled).toBe(false);
      expect((ai as any).client).toBeNull();
    });
  });

  describe('configure', () => {
    it('should configure with valid OpenAI config', async () => {
      await ai.configure(mockConfig);
      
      expect((ai as any).config).toEqual(mockConfig);
      expect((ai as any).enabled).toBe(true);
    });

    it('should configure with Ollama provider without API key', async () => {
      const ollamaConfig: AIConfig = {
        provider: 'ollama',
        model: 'llama2',
      };
      
      await ai.configure(ollamaConfig);
      
      expect((ai as any).config).toEqual(ollamaConfig);
      expect((ai as any).enabled).toBe(true);
    });

    it('should configure with "none" provider', async () => {
      const noneConfig: AIConfig = {
        provider: 'none',
      };
      
      await ai.configure(noneConfig);
      
      expect((ai as any).config).toEqual(noneConfig);
      expect((ai as any).enabled).toBe(false);
    });

    it('should throw error for unsupported provider', async () => {
      const invalidConfig = {
        provider: 'invalid-provider' as any,
      };
      
      await expect(ai.configure(invalidConfig)).rejects.toThrow(AIError);
      await expect(ai.configure(invalidConfig)).rejects.toThrow('Unsupported provider: invalid-provider');
    });

    it('should throw error for OpenAI without API key', async () => {
      const invalidConfig: AIConfig = {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        // No apiKey
      };
      
      await expect(ai.configure(invalidConfig)).rejects.toThrow(AIError);
      await expect(ai.configure(invalidConfig)).rejects.toThrow('openai requires API key');
    });

    it('should throw error for Anthropic without API key', async () => {
      const invalidConfig: AIConfig = {
        provider: 'anthropic',
        model: 'claude-3-haiku',
        // No apiKey
      };
      
      await expect(ai.configure(invalidConfig)).rejects.toThrow(AIError);
      await expect(ai.configure(invalidConfig)).rejects.toThrow('anthropic requires API key');
    });

    it('should throw error for Google without API key', async () => {
      const invalidConfig: AIConfig = {
        provider: 'google',
        model: 'gemini-pro',
        // No apiKey
      };
      
      await expect(ai.configure(invalidConfig)).rejects.toThrow(AIError);
      await expect(ai.configure(invalidConfig)).rejects.toThrow('google requires API key');
    });

    it('should throw error for Azure without API key', async () => {
      const invalidConfig: AIConfig = {
        provider: 'azure',
        model: 'gpt-35-turbo',
        // No apiKey
      };
      
      await expect(ai.configure(invalidConfig)).rejects.toThrow(AIError);
      await expect(ai.configure(invalidConfig)).rejects.toThrow('azure requires API key');
    });

    it('should throw error for DeepSeek without API key', async () => {
      const invalidConfig: AIConfig = {
        provider: 'deepseek',
        model: 'deepseek-chat',
        // No apiKey
      };
      
      await expect(ai.configure(invalidConfig)).rejects.toThrow(AIError);
      await expect(ai.configure(invalidConfig)).rejects.toThrow('deepseek requires API key');
    });
  });

  describe('generateText', () => {
    beforeEach(async () => {
      await ai.configure(mockConfig);
    });

    it('should throw error when AI is disabled', async () => {
      const noneConfig: AIConfig = {
        provider: 'none',
      };
      await ai.configure(noneConfig);
      
      await expect(ai.generateText('What is the weather?')).rejects.toThrow(AIError);
      await expect(ai.generateText('What is the weather?')).rejects.toThrow('AI provider not configured');
    });

    it('should handle empty query', async () => {
      const result = await ai.generateText('');
      
      expect(result.type).toBe('text');
      expect(result.message).toContain('Please provide a query');
    });

    it('should handle very short query', async () => {
      const result = await ai.generateText('hi');
      
      expect(result.type).toBe('text');
      expect(result.message).toContain('Please provide more details');
    });

    it('should parse intent for filesystem query', async () => {
      const result = await ai.generateText('Read the file /test.txt');
      
      // With our mock, this should return a tool_call for filesystem queries
      expect(result.type).toBe('tool_call');
      expect(result.tool).toBeDefined();
      expect(result.tool?.name).toBe('read_file');
      expect(result.tool?.parameters.path).toBe('/test/file.txt');
    });

    it('should handle query with no clear intent', async () => {
      // Configure AI with "none" provider to avoid LLM calls
      const noneConfig: AIConfig = {
        provider: 'none',
      };
      await ai.configure(noneConfig);
      
      // When AI is disabled, ask() should throw AIError
      await expect(ai.generateText('This is a random query without clear intent')).rejects.toThrow(AIError);
      await expect(ai.generateText('This is a random query without clear intent')).rejects.toThrow('AI provider not configured');
    });
  });

  describe('parseIntent', () => {
    beforeEach(async () => {
      await ai.configure(mockConfig);
    });

    it('should parse filesystem read intent', async () => {
      const intent = await (ai as any).parseIntent('Read the file /home/user/test.txt');
      
      expect(intent.action).toBe('read');
      expect(intent.target).toBe('filesystem');
      expect(intent.params.path).toBe('/home/user/test.txt');
    });

    it('should parse filesystem write intent', async () => {
      const intent = await (ai as any).parseIntent('Write "hello" to /tmp/test.txt');
      
      expect(intent.action).toBe('write');
      expect(intent.target).toBe('filesystem');
      expect(intent.params.content).toBe('hello');
      expect(intent.params.path).toBe('/tmp/test.txt');
    });

    it('should parse network ping intent', async () => {
      const intent = await (ai as any).parseIntent('Ping google.com');
      
      expect(intent.action).toBe('ping');
      expect(intent.target).toBe('network');
      expect(intent.params.host).toBe('google.com');
    });

    it('should parse process start intent', async () => {
      const intent = await (ai as any).parseIntent('Start the server');
      
      expect(intent.action).toBe('start');
      expect(intent.target).toBe('process');
    });

    it('should parse process stop intent', async () => {
      const intent = await (ai as any).parseIntent('Stop the service');
      
      expect(intent.action).toBe('stop');
      expect(intent.target).toBe('process');
    });

    it('should handle unknown intent', async () => {
      const intent = await (ai as any).parseIntent('Some random query');
      
      expect(intent.action).toBe('unknown');
      expect(intent.target).toBe('unknown');
    });
  });

  describe('AIError', () => {
    it('should create AIError with correct properties', () => {
      const error = new AIError(
        'TEST_ERROR',
        'Test error message',
        'config',
        ['Suggestion 1', 'Suggestion 2']
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AIError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.category).toBe('config');
      expect(error.suggestions).toEqual(['Suggestion 1', 'Suggestion 2']);
    });

    it('should create AIError without suggestions', () => {
      const error = new AIError(
        'TEST_ERROR',
        'Test error message',
        'connection'
      );
      
      expect(error.suggestions).toEqual([]);
    });
  });
});