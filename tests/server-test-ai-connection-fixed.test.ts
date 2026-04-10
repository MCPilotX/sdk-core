/**
 * Fixed Server Test AI Connection Tests
 * Updated to match actual implementation behavior
 */
// @ts-nocheck

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DaemonServer } from '../src/daemon/server';

// Mock logger to avoid console output
jest.mock('../src/core/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fetch to avoid network calls
global.fetch = jest.fn();

describe('DaemonServer.testAIConnection - Fixed Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with valid configuration', () => {
    it('should test AI connection with OpenAI provider', async () => {
      // Mock successful fetch response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'openai',
            apiKey: 'test-key',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.provider).toBe('openai');
      expect(result.data.status).toBe('connected');
    });

    it('should test AI connection with DeepSeek provider', async () => {
      // Mock successful fetch response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'deepseek',
            apiKey: 'test-key',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(true);
      expect(result.data.provider).toBe('deepseek');
      expect(result.data.status).toBe('connected');
    });

    it('should test AI connection with Anthropic provider', async () => {
      // Mock successful fetch response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'anthropic',
            apiKey: 'test-key',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(true);
      expect(result.data.provider).toBe('anthropic');
      expect(result.data.status).toBe('connected');
    });

    it('should test AI connection with Cohere provider', async () => {
      // Mock successful fetch response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'cohere',
            apiKey: 'test-key',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(true);
      expect(result.data.provider).toBe('cohere');
      expect(result.data.status).toBe('connected');
    });

    it('should test AI connection with Ollama provider', async () => {
      // Mock successful fetch response for Ollama
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'ollama',
            endpoint: 'http://localhost:11434',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(true);
      expect(result.data.provider).toBe('ollama');
      expect(result.data.status).toBe('connected');
      expect(result.data.host).toBe('http://localhost:11434');
    });
  });

  describe('with invalid configuration', () => {
    it('should handle missing AI configuration', async () => {
      const mockOrchestrator = {
        getConfig: () => ({
          ai: null,
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('AI configuration not set');
    });

    it('should handle missing provider', async () => {
      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: '',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('AI configuration not set');
    });

    it('should handle missing API key for OpenAI', async () => {
      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'openai',
            apiKey: '',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing API key for openai');
    });

    it('should handle missing API key for DeepSeek', async () => {
      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'deepseek',
            apiKey: '',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing API key for deepseek');
    });

    it('should handle missing API key for Anthropic', async () => {
      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'anthropic',
            apiKey: '',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing API key for anthropic');
    });

    it('should handle missing API key for Cohere', async () => {
      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'cohere',
            apiKey: '',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing API key for cohere');
    });

    it('should handle missing endpoint for Ollama', async () => {
      // Mock fetch to fail for Ollama connection
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection failed'));
      
      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'ollama',
            ollamaHost: '',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot connect to Ollama service');
    });

    it('should handle unknown provider', async () => {
      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'unknown-provider',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported provider');
    });
  });

  describe('integration tests', () => {
    it('should handle complete workflow with mocked network', async () => {
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'openai',
            apiKey: 'test-key-123',
            model: 'gpt-4',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(true);
      expect(result.data.provider).toBe('openai');
      expect(result.data.model).toBe('gpt-4');
      expect(result.data.status).toBe('connected');
      
      // Verify fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle HTTP error responses gracefully', async () => {
      // Mock HTTP error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'openai',
            apiKey: 'invalid-key',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('API returned 401');
    });

    it('should handle network timeout', async () => {
      // Mock timeout
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          reject(error);
        })
      );

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'openai',
            apiKey: 'test-key',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Request timeout');
    });

    it('should handle JSON parsing errors in response', async () => {
      // Mock response with invalid JSON
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'openai',
            apiKey: 'test-key',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });
  });

  describe('performance and stress tests', () => {
    it('should handle rapid successive connection tests', async () => {
      // Mock successful responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'openai',
            apiKey: 'test-key',
          },
        }),
      };
      
      // Run multiple tests in parallel
      const promises = Array(5).fill(0).map(() => 
        DaemonServer.testAIConnection(mockOrchestrator as any)
      );
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Should have been called 5 times
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Mock alternating responses
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          // Even calls succeed
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          });
        } else {
          // Odd calls fail
          return Promise.resolve({
            ok: false,
            status: 429,
            text: () => Promise.resolve('Rate limit exceeded'),
          });
        }
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'openai',
            apiKey: 'test-key',
          },
        }),
      };
      
      const results = await Promise.all([
        DaemonServer.testAIConnection(mockOrchestrator as any),
        DaemonServer.testAIConnection(mockOrchestrator as any),
        DaemonServer.testAIConnection(mockOrchestrator as any),
      ]);
      
      // Verify mixed results
      expect(results[0].success).toBe(false); // First fails
      expect(results[1].success).toBe(true);  // Second succeeds
      expect(results[2].success).toBe(false); // Third fails
      
      expect(results[0].error).toContain('API returned 429');
    });
  });
});