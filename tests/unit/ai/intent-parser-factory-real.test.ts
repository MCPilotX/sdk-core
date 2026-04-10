/**
 * Real tests for IntentParserFactory without mocking
 * This test suite aims to actually execute the IntentParserFactory code
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { IntentParserFactory } from '../../../src/ai/intent-parser-factory';
import { RuleBasedParser } from '../../../src/ai/rule-based-parser';
import { HybridAIParser } from '../../../src/ai/hybrid-ai-parser';

describe('IntentParserFactory Real Tests (No Mocking)', () => {
  let factory: IntentParserFactory;

  beforeEach(() => {
    factory = new IntentParserFactory();
  });

  describe('createParser', () => {
    it('should create a RuleBasedParser instance', () => {
      const parser = factory.createParser('rule');
      expect(parser).toBeInstanceOf(RuleBasedParser);
    });

    it('should create a HybridAIParser instance', () => {
      const parser = factory.createParser('hybrid');
      expect(parser).toBeInstanceOf(HybridAIParser);
    });

    it('should throw error for unknown parser type', () => {
      expect(() => {
        factory.createParser('unknown' as any);
      }).toThrow('Unknown parser type: unknown');
    });
  });

  describe('getParser', () => {
    it('should return cached parser when available', () => {
      const parser1 = factory.getParser('rule');
      const parser2 = factory.getParser('rule');
      
      expect(parser1).toBe(parser2); // Same instance due to caching
      expect(parser1).toBeInstanceOf(RuleBasedParser);
    });

    it('should create new parser when not cached', () => {
      const parser = factory.getParser('hybrid');
      expect(parser).toBeInstanceOf(HybridAIParser);
    });
  });

  describe('getDefaultParser', () => {
    it('should return default parser', () => {
      const parser = factory.getDefaultParser();
      expect(parser).toBeDefined();
    });

    it('should return hybrid parser by default', () => {
      const parser = factory.getDefaultParser();
      expect(parser).toBeInstanceOf(HybridAIParser);
    });
  });

  describe('createParserChain', () => {
    it('should create parser chain with default types', () => {
      const parsers = factory.createParserChain();
      // Default chain might have more than 2 parsers
      expect(parsers.length).toBeGreaterThan(0);
      expect(parsers[0]).toBeInstanceOf(RuleBasedParser);
      // Check if any parser is HybridAIParser
      const hasHybridParser = parsers.some(parser => parser instanceof HybridAIParser);
      expect(hasHybridParser).toBe(true);
    });

    it('should create parser chain with specified types', () => {
      const parsers = factory.createParserChain(['rule', 'hybrid']);
      expect(parsers).toHaveLength(2);
      expect(parsers[0]).toBeInstanceOf(RuleBasedParser);
      expect(parsers[1]).toBeInstanceOf(HybridAIParser);
    });
  });

  describe('getParserCapabilities', () => {
    it('should return capabilities for rule parser', () => {
      const capabilities = factory.getParserCapabilities('rule');
      expect(capabilities).toEqual({
        supportsAI: false,
        supportsToolMatching: true,
        supportsParameterExtraction: true,
        supportsIntentDecomposition: false,
        averageResponseTime: 10,
        costPerRequest: 0
      });
    });

    it('should return capabilities for hybrid parser', () => {
      const capabilities = factory.getParserCapabilities('hybrid');
      expect(capabilities).toEqual({
        supportsAI: true,
        supportsToolMatching: true,
        supportsParameterExtraction: true,
        supportsIntentDecomposition: false,
        averageResponseTime: 500,
        costPerRequest: 0.001
      });
    });
  });

  describe('factory configuration', () => {
    it('should accept custom configuration', () => {
      const customFactory = new IntentParserFactory({
        defaultParserType: 'rule',
        parserConfigs: {
          rule: { maxComplexity: 'low' },
        },
      });
      
      const parser = customFactory.getDefaultParser();
      expect(parser).toBeInstanceOf(RuleBasedParser);
    });
  });
});