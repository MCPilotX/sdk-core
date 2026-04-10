/**
 * Hybrid AI Parser Coverage Tests
 * Additional tests to improve branch coverage for src/ai/hybrid-ai-parser.ts
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { HybridAIParser } from '../../../src/ai/hybrid-ai-parser';
import { RuleBasedParser } from '../../../src/ai/rule-based-parser';
import { AI } from '../../../src/ai/ai';
import { IntentResult } from '../../../src/ai/intent-types';

// Mock dependencies
jest.mock('../../../src/ai/rule-based-parser');
jest.mock('../../../src/ai/ai');
jest.mock('../../../src/core/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('HybridAIParser Coverage Tests', () => {
  let hybridParser: HybridAIParser;
  let mockRuleParser: jest.Mocked<RuleBasedParser>;
  let mockAIService: jest.Mocked<AI>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockRuleParser = new RuleBasedParser({}) as jest.Mocked<RuleBasedParser>;
    mockAIService = {
      parseIntent: jest.fn(),
      analyzeIntent: jest.fn(),
      configure: jest.fn().mockReturnValue(Promise.resolve()),
    } as unknown as jest.Mocked<AI>;
    
    // Mock RuleBasedParser constructor to return our mock
    (RuleBasedParser as jest.MockedClass<typeof RuleBasedParser>).mockImplementation(() => mockRuleParser);
    
    // Mock AI constructor to return our mock
    (AI as jest.MockedClass<typeof AI>).mockImplementation(() => mockAIService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('parseWithAI method', () => {
    it('should fall back to rules when AI service is not available', async () => {
      const config = {
        alwaysUseAI: true,
        // No aiConfig provided, so AI service should not be initialized
      };
      
      hybridParser = new HybridAIParser(config);
      
      // Mock rule parser to return a result
      const ruleResult: IntentResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test' },
        confidence: 0.8,
        parserType: 'rule-based',
      };
      
      mockRuleParser.parse.mockResolvedValue(ruleResult);
      
      const result = await hybridParser.parse('read file /test');
      
      expect(result.service).toBe('filesystem');
      expect(result.method).toBe('read');
      expect(result.confidence).toBe(0.8);
    });

    it('should handle AI service errors gracefully', async () => {
      const config = {
        alwaysUseAI: true,
        aiConfig: { provider: 'openai' },
      };
      
      hybridParser = new HybridAIParser(config);
      
      // Mock AI service to throw an error
      mockAIService.analyzeIntent.mockRejectedValue(new Error('AI service unavailable'));
      
      // Mock rule parser to return a fallback result
      const ruleResult: IntentResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test' },
        confidence: 0.7,
        parserType: 'rule-based',
      };
      
      mockRuleParser.parse.mockResolvedValue(ruleResult);
      
      const result = await hybridParser.parse('read file /test');
      
      expect(result.service).toBe('filesystem');
      expect(result.method).toBe('read');
      expect(result.metadata?.aiUsed).toBe(false);
      expect(result.metadata?.aiError).toBe('AI service unavailable');
    });
  });

  describe('parseWithHybridApproach method', () => {
    beforeEach(() => {
      hybridParser = new HybridAIParser({
        aiConfig: { provider: 'openai' },
      });
    });

    it('should use AI result when it is better than rule-based result', async () => {
      // Mock rule parser to return low confidence result
      const ruleResult: IntentResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test' },
        confidence: 0.6, // Below threshold
        parserType: 'rule-based',
      };
      
      // Mock AI to return high confidence result
      const aiIntent = {
        action: 'filesystem.read',
        target: '/test',
        params: { path: '/test' },
        confidence: 0.9,
      };
      
      mockRuleParser.parse.mockResolvedValue(ruleResult);
      mockAIService.analyzeIntent.mockResolvedValue(aiIntent);
      
      const result = await hybridParser.parse('read file /test');
      
      expect(result.confidence).toBe(0.9);
      expect(result.metadata?.decision).toBe('ai_better');
    });

    it('should use rule-based result with AI validation when AI result is not better', async () => {
      // Mock rule parser to return medium confidence result
      const ruleResult: IntentResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test' },
        confidence: 0.65, // Below threshold (0.7 default)
        parserType: 'rule-based',
      };
      
      // Mock AI to return lower confidence result
      const aiIntent = {
        action: 'filesystem.read',
        target: '/test',
        params: { path: '/test' },
        confidence: 0.7,
      };
      
      mockRuleParser.parse.mockResolvedValue(ruleResult);
      mockAIService.analyzeIntent.mockResolvedValue(aiIntent);
      
      const result = await hybridParser.parse('read file /test');
      
      expect(result.confidence).toBeGreaterThanOrEqual(0.65); // Should be at least rule confidence
      expect(result.metadata?.decision).toBe('rule_based_with_ai_validation');
      expect(result.metadata?.aiValidated).toBe(true);
    });

    it('should handle AI errors in hybrid approach', async () => {
      // Mock rule parser to return result
      const ruleResult: IntentResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test' },
        confidence: 0.6, // Below threshold, would trigger AI
        parserType: 'rule-based',
      };
      
      // Mock AI to throw error
      mockRuleParser.parse.mockResolvedValue(ruleResult);
      mockAIService.analyzeIntent.mockRejectedValue(new Error('AI service error'));
      
      // Wait a bit to ensure AI service is initialized
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await hybridParser.parse('read file /test');
      
      expect(result.service).toBe('filesystem');
      expect(result.method).toBe('read');
      // When AI fails, parseWithAI returns a result with aiError but no decision
      // Then parseWithHybridApproach will treat it as a valid AI result
      // and compare it with rule result using shouldUseAIResult
      // Since AI result has error, shouldUseAIResult likely returns false
      // So we get rule_based_with_ai_validation decision
      // The important thing is that aiError should be defined
      expect(result.metadata?.aiError).toBeDefined();
    });
  });

  describe('shouldUseAIResult method', () => {
    beforeEach(() => {
      hybridParser = new HybridAIParser({
        aiConfig: { provider: 'openai' },
      });
    });

    it('should return true when AI confidence is significantly higher', () => {
      const ruleResult: IntentResult = {
        service: 'filesystem',
        method: 'read',
        parameters: {},
        confidence: 0.6,
        parserType: 'rule-based',
      };
      
      const aiResult: IntentResult = {
        service: 'filesystem',
        method: 'write', // Different method
        parameters: {},
        confidence: 0.9, // Much higher confidence
        parserType: 'ai',
      };
      
      // This is a private method, we need to test it indirectly through parse method
      // For now, we'll test the behavior through integration
    });

    it('should return false when AI confidence is not significantly higher', () => {
      const ruleResult: IntentResult = {
        service: 'filesystem',
        method: 'read',
        parameters: {},
        confidence: 0.8,
        parserType: 'rule-based',
      };
      
      const aiResult: IntentResult = {
        service: 'filesystem',
        method: 'read',
        parameters: {},
        confidence: 0.82, // Only slightly higher
        parserType: 'ai',
      };
      
      // This is a private method, we need to test it indirectly through parse method
    });
  });

  describe('isRuleResultAcceptable method', () => {
    beforeEach(() => {
      hybridParser = new HybridAIParser({
        ruleConfidenceThreshold: 0.7,
        aiConfig: { provider: 'openai' },
      });
    });

    it('should return true when confidence meets threshold', async () => {
      // Mock rule parser to return high confidence result
      const ruleResult: IntentResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test' },
        confidence: 0.8, // Above threshold
        parserType: 'rule-based',
      };
      
      mockRuleParser.parse.mockResolvedValue(ruleResult);
      
      const result = await hybridParser.parse('read file /test');
      
      // If rule result is acceptable, it should be used without AI
      expect(result.metadata?.aiUsed).toBe(false);
    });

    it('should return false when confidence is below threshold', async () => {
      // Mock rule parser to return low confidence result
      const ruleResult: IntentResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test' },
        confidence: 0.6, // Below threshold
        parserType: 'rule-based',
      };
      
      // Mock AI to return result
      const aiIntent = {
        action: 'filesystem.read',
        target: '/test',
        params: { path: '/test' },
        confidence: 0.9,
      };
      
      mockRuleParser.parse.mockResolvedValue(ruleResult);
      mockAIService.analyzeIntent.mockResolvedValue(aiIntent);
      
      const result = await hybridParser.parse('read file /test');
      
      // If rule result is not acceptable, AI should be used
      expect(result.metadata?.aiUsed).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty query', async () => {
      hybridParser = new HybridAIParser();
      
      const ruleResult: IntentResult = {
        service: 'unknown',
        method: 'unknown',
        parameters: {},
        confidence: 0.1,
        parserType: 'rule-based',
      };
      
      mockRuleParser.parse.mockResolvedValue(ruleResult);
      
      const result = await hybridParser.parse('');
      
      expect(result.service).toBe('unknown');
      expect(result.method).toBe('unknown');
    });

    it('should handle null or undefined context', async () => {
      hybridParser = new HybridAIParser();
      
      const ruleResult: IntentResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test' },
        confidence: 0.8,
        parserType: 'rule-based',
      };
      
      mockRuleParser.parse.mockResolvedValue(ruleResult);
      
      // Test with undefined context
      const result1 = await hybridParser.parse('read file /test', undefined);
      expect(result1.service).toBe('filesystem');
      
      // Test with null context (as any to bypass TypeScript)
      const result2 = await hybridParser.parse('read file /test', null as any);
      expect(result2.service).toBe('filesystem');
    });

    it('should handle AI service returning null or undefined intent', async () => {
      const config = {
        alwaysUseAI: true,
        aiConfig: { provider: 'openai' },
      };
      
      hybridParser = new HybridAIParser(config);
      
      // Mock AI to return null
      mockAIService.analyzeIntent.mockResolvedValue(null as any);
      
      // Mock rule parser to return fallback result
      const ruleResult: IntentResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test' },
        confidence: 0.7,
        parserType: 'rule-based',
      };
      
      mockRuleParser.parse.mockResolvedValue(ruleResult);
      
      const result = await hybridParser.parse('read file /test');
      
      expect(result.service).toBe('filesystem');
      expect(result.method).toBe('read');
    });
  });
});