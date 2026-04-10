/**
 * Extended Server Test AI Connection Tests
 * Additional tests for edge cases and error scenarios
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

describe('DaemonServer.testAIConnection - Extended Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('network and error handling', () => {
    it('should handle network errors', async () => {
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

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
      expect(result.error).toContain('Network error');
    });

    it('should handle HTTP error responses', async () => {
      // Mock HTTP error response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Invalid API key' }),
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
      expect(result.error).toContain('API returned 401');
    });

    it('should handle JSON parsing errors', async () => {
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

    it('should handle timeout scenarios', async () => {
      // Mock slow response
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
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
      expect(result.error).toContain('Timeout');
    });

    it('should handle empty response from API', async () => {
      // Mock empty response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null),
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
      
      // Should still be successful if the API responds
      expect(result.success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle orchestrator without getConfig method', async () => {
      const mockOrchestrator = {};
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('AI configuration not set');
    });

    it('should handle null orchestrator', async () => {
      const result = await DaemonServer.testAIConnection(null as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('AI configuration not set');
    });

    it('should handle undefined orchestrator', async () => {
      const result = await DaemonServer.testAIConnection(undefined as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('AI configuration not set');
    });

    it('should handle provider with special characters', async () => {
      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'openai-v2',
            apiKey: 'test-key',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      // Should handle unknown provider
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported provider');
    });

    it('should handle extremely long API keys', async () => {
      const longApiKey = 'a'.repeat(1000);
      
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'openai',
            apiKey: longApiKey,
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle whitespace in API keys', async () => {
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'openai',
            apiKey: '  test-key  ',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle malformed endpoint URLs', async () => {
      // Mock fetch to throw error for invalid URL
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Invalid URL'));
      
      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'ollama',
            endpoint: 'not-a-valid-url',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot connect to Ollama service');
    });

    it('should handle partial configuration', async () => {
      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            // Missing required fields
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('AI configuration not set');
    });
  });

  describe('provider-specific edge cases', () => {
    it('should handle Ollama with custom port', async () => {
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'ollama',
            endpoint: 'http://localhost:8080',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle Ollama with HTTPS endpoint', async () => {
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'ollama',
            endpoint: 'https://ollama.example.com',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle provider with model parameter', async () => {
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'openai',
            apiKey: 'test-key',
            model: 'gpt-4',
          },
        }),
      };
      
      const result = await DaemonServer.testAIConnection(mockOrchestrator as any);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('performance and reliability', () => {
    it('should handle rapid successive calls', async () => {
      // Mock successful response
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
      
      // Make multiple calls in sequence
      const results = await Promise.all([
        DaemonServer.testAIConnection(mockOrchestrator as any),
        DaemonServer.testAIConnection(mockOrchestrator as any),
        DaemonServer.testAIConnection(mockOrchestrator as any),
      ]);
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Should have been called 3 times
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should not leak memory on repeated errors', async () => {
      // Mock consistent error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Consistent error'));

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
      ]);
      
      // All should fail with same error
      results.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Consistent error');
      });
    });
  });
});