/**
 * Server Error Handling Tests
 * Tests for error handling in src/daemon/server.ts
 */

import { describe, it, expect, jest } from '@jest/globals';
import { DaemonServer } from '../src/daemon/server';

// Mock logger to avoid console output
jest.mock('../src/core/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DaemonServer.testAIConnection - Error Handling', () => {
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
      const mockOrchestrator = {
        getConfig: () => ({
          ai: {
            provider: 'ollama',
            endpoint: '',
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
});