/**
 * Simple AI Test
 * Basic tests for AI module
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AIError } from '../src/ai/ai';

describe('Simple AI Tests', () => {
  describe('AIError', () => {
    it('should create AIError with all parameters', () => {
      const error = new AIError('CONFIG_ERROR', 'Test error message', 'config', ['Check configuration']);
      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.category).toBe('config');
      expect(error.suggestions).toEqual(['Check configuration']);
      expect(error.name).toBe('AIError');
    });

    it('should create AIError with default suggestions', () => {
      const error = new AIError('CONNECTION_ERROR', 'Connection failed', 'connection');
      expect(error.code).toBe('CONNECTION_ERROR');
      expect(error.message).toBe('Connection failed');
      expect(error.category).toBe('connection');
      expect(error.suggestions).toEqual([]);
    });
  });
});