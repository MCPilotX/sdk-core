/**
 * AI Test Utilities
 * Shared utilities for AI testing to reduce code duplication
 */

import { AIError } from '../src/ai/ai';

/**
 * Creates a mock AI class for testing
 * This mock avoids network calls and provides predictable responses
 */
export function createMockAI() {
  const originalModule = jest.requireActual('../src/ai/ai');
  
  return {
    ...originalModule,
    AI: class MockAI extends originalModule.AI {
      constructor() {
        super();
        // Override methods to avoid network calls
        this.generateText = jest.fn().mockImplementation(async (query: string) => {
          // Check if AI is not configured or disabled
          if (!(this as any).config || (this as any).config?.provider === 'none') {
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
              confidence: 0.9,
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
              confidence: 0.9,
            };
          }
          if (query.includes('Ping')) {
            return {
              action: 'ping',
              target: 'network',
              params: { host: 'google.com' },
              confidence: 0.8,
            };
          }
          if (query.includes('Start')) {
            return {
              action: 'start',
              target: 'process',
              params: {},
              confidence: 0.8,
            };
          }
          if (query.includes('Stop')) {
            return {
              action: 'stop',
              target: 'process',
              params: {},
              confidence: 0.8,
            };
          }
          // Default intent for unknown queries
          return {
            action: 'unknown',
            target: 'unknown',
            params: {},
            confidence: 0.1,
          };
        });
      }
    },
  };
}

/**
 * Common mock configurations for AI testing
 */
export const mockAIConfigs = {
  openai: {
    provider: 'openai' as const,
    apiKey: 'test-api-key',
    model: 'gpt-3.5-turbo',
  },
  anthropic: {
    provider: 'anthropic' as const,
    apiKey: 'test-anthropic-key',
    model: 'claude-3-sonnet',
  },
  google: {
    provider: 'google' as const,
    apiKey: 'test-google-key',
    model: 'gemini-pro',
  },
  azure: {
    provider: 'azure' as const,
    apiKey: 'test-azure-key',
    endpoint: 'https://test.openai.azure.com/',
    apiVersion: '2023-12-01-preview',
    region: 'eastus',
  },
  deepseek: {
    provider: 'deepseek' as const,
    apiKey: 'test-deepseek-key',
    model: 'deepseek-chat',
  },
  ollama: {
    provider: 'ollama' as const,
    endpoint: 'http://localhost:11434',
    model: 'llama2',
  },
  none: {
    provider: 'none' as const,
  },
};

/**
 * Common mock responses for AI testing
 */
export const mockAIResponses = {
  emptyQuery: {
    type: 'text' as const,
    message: 'Please provide a query',
    text: 'Please provide a query',
  },
  shortQuery: {
    type: 'text' as const,
    message: 'Please provide more details',
    text: 'Please provide more details',
  },
  filesystemRead: {
    type: 'tool_call' as const,
    tool: {
      name: 'read_file',
      parameters: { path: '/test/file.txt' },
    },
    confidence: 0.9,
  },
  defaultText: (query: string) => ({
    type: 'text' as const,
    message: `Response to: ${query}`,
    text: `Response to: ${query}`,
  }),
};

/**
 * Common mock intents for AI testing
 */
export const mockIntents = {
  filesystemRead: {
    action: 'read' as const,
    target: 'filesystem' as const,
    params: { path: '/test.txt' },
    confidence: 0.9,
  },
  filesystemWrite: {
    action: 'write' as const,
    target: 'filesystem' as const,
    params: { 
      content: 'hello',
      path: '/tmp/test.txt'
    },
    confidence: 0.9,
  },
  networkPing: {
    action: 'ping' as const,
    target: 'network' as const,
    params: { host: 'google.com' },
    confidence: 0.8,
  },
  processStart: {
    action: 'start' as const,
    target: 'process' as const,
    params: {},
    confidence: 0.8,
  },
  processStop: {
    action: 'stop' as const,
    target: 'process' as const,
    params: {},
    confidence: 0.8,
  },
  unknown: {
    action: 'unknown' as const,
    target: 'unknown' as const,
    params: {},
    confidence: 0.1,
  },
};

/**
 * Sets up common mocks for AI testing
 */
export function setupCommonAIMocks() {
  // Mock chalk
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

  // Mock tool-mappings
  jest.mock('../src/ai/tool-mappings', () => ({
    toolMappingManager: {
      findMapping: jest.fn(),
      getToolForIntent: jest.fn(),
      getMappedTools: jest.fn(),
      mapParameters: jest.fn().mockImplementation((mapping, params) => params),
    },
  }));

  // Mock rule-based-parser
  jest.mock('../src/ai/rule-based-parser', () => ({
    RuleBasedParser: jest.fn().mockImplementation(() => ({
      parse: jest.fn(),
    })),
  }));

  // Global fetch mock
  (global.fetch as any) = jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ models: [{ id: 'gpt-3.5-turbo' }] }),
      status: 200,
    })
  );
}

/**
 * Resets all mocks after each test
 */
export function resetAIMocks() {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockClear();
}