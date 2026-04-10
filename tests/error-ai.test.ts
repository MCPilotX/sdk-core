import { describe, it, expect, jest } from '@jest/globals';
import { AIErrorHandler, AIError } from '../src/core/error-ai';

// Mock console.log to capture output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('AIErrorHandler', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe('handleError', () => {
    it('should handle config error with provider-specific suggestions', () => {
      // Arrange
      const error: AIError = {
        type: 'config',
        message: 'Configuration error',
        provider: 'openai'
      };

      // Act
      AIErrorHandler.handleError(error);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalled();
      // Should print error message
      expect(mockConsoleLog.mock.calls.some(call => 
        call[0].includes('❌ Configuration error')
      )).toBe(true);
    });

    it('should handle connection error with network suggestions', () => {
      // Arrange
      const error: AIError = {
        type: 'connection',
        message: 'Connection failed',
        provider: 'openai'
      };

      // Act
      AIErrorHandler.handleError(error);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalled();
      // Should print repair suggestions
      expect(mockConsoleLog.mock.calls.some(call => 
        call[0].includes('🔧 Repair suggestions:')
      )).toBe(true);
    });

    it('should handle validation error', () => {
      // Arrange
      const error: AIError = {
        type: 'validation',
        message: 'Validation failed',
        details: { field: 'apiKey' }
      };

      // Act
      AIErrorHandler.handleError(error);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle authentication error', () => {
      // Arrange
      const error: AIError = {
        type: 'authentication',
        message: 'Invalid API key',
        provider: 'openai'
      };

      // Act
      AIErrorHandler.handleError(error);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle unknown error', () => {
      // Arrange
      const error: AIError = {
        type: 'unknown',
        message: 'Unknown error occurred'
      };

      // Act
      AIErrorHandler.handleError(error);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should provide Ollama-specific suggestions for connection errors', () => {
      // Arrange
      const error: AIError = {
        type: 'connection',
        message: 'Cannot connect to Ollama',
        provider: 'ollama'
      };

      // Act
      AIErrorHandler.handleError(error);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalled();
      // Should include Ollama-specific suggestion
      expect(mockConsoleLog.mock.calls.some(call => 
        typeof call[0] === 'string' && call[0].includes('Ollama service')
      )).toBe(true);
    });
  });

  describe('getSuggestions', () => {
    it('should return config suggestions for config errors', () => {
      // This is a private method, but we can test it indirectly through handleError
      const error: AIError = {
        type: 'config',
        message: 'Config error',
        provider: 'openai'
      };

      // Act
      AIErrorHandler.handleError(error);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalled();
      // Should include config suggestions
      expect(mockConsoleLog.mock.calls.some(call => 
        typeof call[0] === 'string' && call[0].includes('Check configuration file')
      )).toBe(true);
    });

    it('should return connection suggestions for connection errors', () => {
      const error: AIError = {
        type: 'connection',
        message: 'Connection error',
        provider: 'openai'
      };

      // Act
      AIErrorHandler.handleError(error);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalled();
      // Should include connection suggestions
      expect(mockConsoleLog.mock.calls.some(call => 
        typeof call[0] === 'string' && call[0].includes('Check network connection')
      )).toBe(true);
    });
  });
});