import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AIErrorHandler, AIError } from '../src/core/error-ai';
import { PROVIDER_DB } from '../src/core/providers';
import chalk from 'chalk';

// Mock chalk to avoid color codes in test output
jest.mock('chalk', () => ({
  red: jest.fn((text) => `red:${text}`),
  yellow: jest.fn((text) => `yellow:${text}`),
  blue: jest.fn((text) => `blue:${text}`),
  cyan: jest.fn((text) => `cyan:${text}`),
  green: jest.fn((text) => `green:${text}`),
  gray: jest.fn((text) => `gray:${text}`),
}));

// Mock console.log to capture output
const mockConsoleLog = jest.fn();
const mockConsole = {
  log: mockConsoleLog,
};

describe('AIErrorHandler Extended Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleError', () => {
    it('should handle config error with provider', () => {
      const error: AIError = {
        type: 'config',
        message: 'Configuration error',
        provider: 'openai',
      };

      AIErrorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('red:❌ Configuration error'));
      // The emoji and text may be on separate lines, so we check for partial matches
      expect(mockConsoleLog.mock.calls.some((call: any[]) => 
        String(call[0]).includes('yellow:') && String(call[0]).includes('Repair suggestions')
      )).toBe(true);
      expect(mockConsoleLog.mock.calls.some((call: any[]) => 
        String(call[0]).includes('blue:') && String(call[0]).includes('Next steps')
      )).toBe(true);
    });

    it('should handle connection error for Ollama', () => {
      const error: AIError = {
        type: 'connection',
        message: 'Connection failed',
        provider: 'ollama',
      };

      AIErrorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('red:❌ Connection failed'));
      // Should include Ollama-specific suggestions
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Ensure Ollama service is running'));
    });

    it('should handle authentication error', () => {
      const error: AIError = {
        type: 'authentication',
        message: 'Invalid API key',
        provider: 'openai',
      };

      AIErrorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('red:❌ Invalid API key'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Check API key is correct'));
    });

    it('should handle validation error', () => {
      const error: AIError = {
        type: 'validation',
        message: 'Invalid parameters',
        provider: 'anthropic',
      };

      AIErrorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('red:❌ Invalid parameters'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Check input parameters meet requirements'));
    });

    it('should handle unknown error', () => {
      const error: AIError = {
        type: 'unknown',
        message: 'Unknown error occurred',
      };

      AIErrorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('red:❌ Unknown error occurred'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('View detailed error logs'));
    });

    it('should include details in output when provided', () => {
      const error: AIError = {
        type: 'config',
        message: 'Configuration error',
        details: { configFile: 'test.json', line: 42 },
      };

      AIErrorHandler.handleError(error);

      // The output may be split across lines due to \n, so check if any call contains the text
      const hasDetailInfo = mockConsoleLog.mock.calls.some((call: any[]) => 
        String(call[0]).includes('💡 Detailed error information:')
      );
      expect(hasDetailInfo).toBe(true);
    });
  });

  describe('handleProviderError', () => {
    it('should handle unknown provider error', () => {
      AIErrorHandler.handleProviderError('unknown-provider');

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("red:❌ Unknown AI provider: 'unknown-provider'"));
      // The output may be split across lines due to \n, so check if any call contains the text
      const hasSupportedProviders = mockConsoleLog.mock.calls.some((call: any[]) => 
        String(call[0]).includes('📋 Supported providers:')
      );
      expect(hasSupportedProviders).toBe(true);
    });

    it('should show similar providers when available', () => {
      const similarProviders = [
        { provider: 'openai' as const, similarity: 85, distance: 2 },
        { provider: 'deepseek' as const, similarity: 70, distance: 4 },
      ];

      AIErrorHandler.handleProviderError('opena', similarProviders);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("red:❌ Unknown AI provider: 'opena'"));
      // The output may be split across lines due to \n, so check if any call contains the text
      const hasSimilarProviders = mockConsoleLog.mock.calls.some((call: any[]) => 
        String(call[0]).includes('🔍 Similar providers:')
      );
      expect(hasSimilarProviders).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('OpenAI'));
    });
  });

  describe('handleModelError', () => {
    it('should handle unknown model error', () => {
      AIErrorHandler.handleModelError('openai', 'unknown-model');

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("red:❌ OpenAI does not support model: 'unknown-model'"));
    });

    it('should show available models when provided', () => {
      const availableModels = ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'];
      
      AIErrorHandler.handleModelError('openai', 'unknown-model', availableModels);

      // The output may be split across lines due to \n, so check if any call contains the text
      const hasAvailableModels = mockConsoleLog.mock.calls.some((call: any[]) => 
        String(call[0]).includes('📋 Available models:')
      );
      expect(hasAvailableModels).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('gpt-4'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('gpt-3.5-turbo'));
    });

    it('should show common models from provider DB when no available models', () => {
      // Mock PROVIDER_DB to have modelDescriptions
      const originalProviderDB = PROVIDER_DB;
      (PROVIDER_DB as any) = {
        ...originalProviderDB,
        openai: {
          ...originalProviderDB.openai,
          modelDescriptions: {
            'gpt-4': 'Most capable model',
            'gpt-3.5-turbo': 'Fast and cost-effective',
          },
        },
      };

      AIErrorHandler.handleModelError('openai', 'unknown-model');

      // The output may be split across lines due to \n, so check if any call contains the text
      const hasCommonModels = mockConsoleLog.mock.calls.some((call: any[]) => 
        String(call[0]).includes('📋 Common models:')
      );
      expect(hasCommonModels).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('gpt-4 - Most capable model'));

      // Restore original PROVIDER_DB
      (PROVIDER_DB as any) = originalProviderDB;
    });
  });

  describe('handleApiKeyError', () => {
    it('should handle OpenAI API key error', () => {
      AIErrorHandler.handleApiKeyError('openai');

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('red:❌ OpenAI requires API key'));
      // The output may be split across lines due to \n, so check if any call contains the text
      const hasHowToGetKey = mockConsoleLog.mock.calls.some((call: any[]) => 
        String(call[0]).includes('🔑 How to get API key:')
      );
      expect(hasHowToGetKey).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('https://platform.openai.com/api-keys'));
    });

    it('should handle DeepSeek API key error', () => {
      AIErrorHandler.handleApiKeyError('deepseek');

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('red:❌ DeepSeek requires API key'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('https://platform.deepseek.com/api-keys'));
    });

    it('should handle Anthropic API key error', () => {
      AIErrorHandler.handleApiKeyError('anthropic');

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('red:❌ Anthropic requires API key'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('https://console.anthropic.com/keys'));
    });

    it('should handle Cohere API key error', () => {
      AIErrorHandler.handleApiKeyError('cohere');

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('red:❌ Cohere requires API key'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('https://dashboard.cohere.com/api-keys'));
    });

    it('should handle generic provider API key error', () => {
      AIErrorHandler.handleApiKeyError('custom' as any);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('red:❌ Custom requires API key'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Please visit Custom official website'));
    });
  });

  describe('handleTestResult', () => {
    it('should handle successful test result with provider', () => {
      const details = { responseTime: '100ms', model: 'gpt-4' };
      
      AIErrorHandler.handleTestResult(true, 'openai', details);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('green:✅ OpenAI connection test successful!'));
      // The output may be split across lines due to \n, so check if any call contains the text
      const hasTestDetails = mockConsoleLog.mock.calls.some((call: any[]) => 
        String(call[0]).includes('📊 Test details:')
      );
      expect(hasTestDetails).toBe(true);
    });

    it('should handle successful test result without provider', () => {
      AIErrorHandler.handleTestResult(true);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('green:✅ AI connection test successful!'));
    });

    it('should handle failed test result with error details', () => {
      const details = {
        error: {
          type: 'connection' as const,
          message: 'Connection timeout',
          provider: 'openai',
        },
      };

      AIErrorHandler.handleTestResult(false, 'openai', details);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('red:❌ AI connection test failed'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('red:❌ Connection timeout'));
    });

    it('should handle failed test result without error details', () => {
      AIErrorHandler.handleTestResult(false);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('red:❌ AI connection test failed'));
    });
  });

  describe('getProviderWebsite', () => {
    it('should return correct website for OpenAI', () => {
      const website = (AIErrorHandler as any).getProviderWebsite('openai');
      expect(website).toBe('https://platform.openai.com/api-keys');
    });

    it('should return correct website for Anthropic', () => {
      const website = (AIErrorHandler as any).getProviderWebsite('anthropic');
      expect(website).toBe('https://console.anthropic.com/keys');
    });

    it('should return correct website for DeepSeek', () => {
      const website = (AIErrorHandler as any).getProviderWebsite('deepseek');
      expect(website).toBe('https://platform.deepseek.com/api-keys');
    });

    it('should return correct website for Cohere', () => {
      const website = (AIErrorHandler as any).getProviderWebsite('cohere');
      expect(website).toBe('https://dashboard.cohere.com/api-keys');
    });

    it('should return empty string for local provider', () => {
      const website = (AIErrorHandler as any).getProviderWebsite('local');
      expect(website).toBe('');
    });

    it('should return empty string for unknown provider', () => {
      const website = (AIErrorHandler as any).getProviderWebsite('unknown' as any);
      expect(website).toBe('');
    });
  });

  describe('getEnvVarName', () => {
    it('should return correct env var for OpenAI', () => {
      const envVar = (AIErrorHandler as any).getEnvVarName('openai');
      expect(envVar).toBe('OPENAI_API_KEY');
    });

    it('should return correct env var for Anthropic', () => {
      const envVar = (AIErrorHandler as any).getEnvVarName('anthropic');
      expect(envVar).toBe('ANTHROPIC_API_KEY');
    });

    it('should return correct env var for DeepSeek', () => {
      const envVar = (AIErrorHandler as any).getEnvVarName('deepseek');
      expect(envVar).toBe('DEEPSEEK_API_KEY');
    });

    it('should return correct env var for Cohere', () => {
      const envVar = (AIErrorHandler as any).getEnvVarName('cohere');
      expect(envVar).toBe('COHERE_API_KEY');
    });

    it('should return uppercase provider name for unknown provider', () => {
      const envVar = (AIErrorHandler as any).getEnvVarName('custom' as any);
      expect(envVar).toBe('CUSTOM_API_KEY');
    });
  });

  describe('getSuggestions', () => {
    it('should return config error suggestions', () => {
      const error: AIError = {
        type: 'config',
        message: 'Config error',
        provider: 'openai',
      };

      const suggestions = (AIErrorHandler as any).getSuggestions(error);
      
      expect(suggestions).toContain('Check configuration file format is correct');
      expect(suggestions).toContain('Ensure all required fields are filled');
      expect(suggestions).toContain('View OpenAI configuration help: mcp ai help openai');
    });

    it('should return connection error suggestions for Ollama', () => {
      const error: AIError = {
        type: 'connection',
        message: 'Connection error',
        provider: 'ollama',
      };

      const suggestions = (AIErrorHandler as any).getSuggestions(error);
      
      expect(suggestions).toContain('Check network connection is normal');
      expect(suggestions).toContain('Confirm API endpoint is accessible');
      expect(suggestions).toContain('Ensure Ollama service is running: ollama serve');
      expect(suggestions).toContain('Check Ollama host address: http://localhost:11434');
    });

    it('should return authentication error suggestions', () => {
      const error: AIError = {
        type: 'authentication',
        message: 'Auth error',
        provider: 'openai',
      };

      const suggestions = (AIErrorHandler as any).getSuggestions(error);
      
      expect(suggestions).toContain('Check API key is correct');
      expect(suggestions).toContain('Confirm API key has sufficient permissions');
      expect(suggestions).toContain('Try generating a new API key');
      expect(suggestions).toContain('Visit https://platform.openai.com/api-keys to manage API keys');
    });

    it('should return validation error suggestions', () => {
      const error: AIError = {
        type: 'validation',
        message: 'Validation error',
        provider: 'anthropic',
      };

      const suggestions = (AIErrorHandler as any).getSuggestions(error);
      
      expect(suggestions).toContain('Check input parameters meet requirements');
      expect(suggestions).toContain('Confirm model name is correct');
      expect(suggestions).toContain('View provider documentation to understand parameter limits');
    });

    it('should return unknown error suggestions', () => {
      const error: AIError = {
        type: 'unknown',
        message: 'Unknown error',
      };

      const suggestions = (AIErrorHandler as any).getSuggestions(error);
      
      expect(suggestions).toContain('View detailed error logs: mcp logs');
      expect(suggestions).toContain('Try restarting MCPilot services');
      expect(suggestions).toContain('Check system resources are sufficient');
    });
  });
});