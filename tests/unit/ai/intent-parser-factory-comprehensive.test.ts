/**
 * Comprehensive tests for IntentParserFactory
 * This test suite aims to improve test coverage for the IntentParserFactory class
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { IntentParserFactory } from '../../../src/ai/intent-parser-factory';
import { RuleBasedParser } from '../../../src/ai/rule-based-parser';
import { HybridAIParser } from '../../../src/ai/hybrid-ai-parser';

// Mock dependencies
jest.mock('../../../src/ai/rule-based-parser');
jest.mock('../../../src/ai/hybrid-ai-parser');

describe('IntentParserFactory Comprehensive Tests', () => {
  let factory: IntentParserFactory;
  let mockRuleBasedParser: jest.Mocked<RuleBasedParser>;
  let mockHybridAIParser: jest.Mocked<HybridAIParser>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations to return new instances each time
    let ruleBasedParserCallCount = 0;
    let hybridAIParserCallCount = 0;
    
    (RuleBasedParser as jest.MockedClass<typeof RuleBasedParser>).mockImplementation(() => {
      ruleBasedParserCallCount++;
      return {
        parse: jest.fn(),
        getParserType: jest.fn().mockReturnValue('rule'),
        addPattern: jest.fn(),
        clearToolCache: jest.fn(),
        __callCount: ruleBasedParserCallCount, // For debugging
      } as any;
    });
    
    (HybridAIParser as jest.MockedClass<typeof HybridAIParser>).mockImplementation(() => {
      hybridAIParserCallCount++;
      return {
        parse: jest.fn(),
        getParserType: jest.fn().mockReturnValue('hybrid'),
        __callCount: hybridAIParserCallCount, // For debugging
      } as any;
    });
    
    factory = new IntentParserFactory();
  });

  describe('Basic functionality', () => {
    it('should create rule-based parser', () => {
      const parser = factory.createParser('rule');
      
      expect(RuleBasedParser).toHaveBeenCalled();
      expect(parser).toBeDefined();
      expect(parser.getParserType()).toBe('rule');
    });

    it('should create hybrid AI parser', () => {
      const parser = factory.createParser('hybrid');
      
      expect(HybridAIParser).toHaveBeenCalled();
      expect(parser).toBeDefined();
      expect(parser.getParserType()).toBe('hybrid');
    });

    it('should throw error for unknown parser type', () => {
      expect(() => factory.createParser('unknown' as any)).toThrow('Unknown parser type: unknown');
    });
  });

  describe('Parser caching', () => {
    it('should cache parser instances', () => {
      const parser1 = factory.getParser('rule');
      const parser2 = factory.getParser('rule');
      
      expect(parser1).toBe(parser2); // Should return cached instance
      expect(RuleBasedParser).toHaveBeenCalledTimes(1);
    });

    it('should create new instance on each createParser call', () => {
      const parser1 = factory.createParser('rule');
      const parser2 = factory.createParser('rule');
      
      expect(parser1).not.toBe(parser2); // Should create new instances
      expect(RuleBasedParser).toHaveBeenCalledTimes(2);
    });

    it('should clear cache', () => {
      const parser1 = factory.getParser('rule');
      factory.clearCache();
      const parser2 = factory.getParser('rule');
      
      expect(parser1).not.toBe(parser2); // Should create new instance after cache clear
      expect(RuleBasedParser).toHaveBeenCalledTimes(2);
    });
  });

  describe('Default parser', () => {
    it('should get default parser (hybrid by default)', () => {
      const parser = factory.getDefaultParser();
      
      expect(HybridAIParser).toHaveBeenCalled();
      expect(parser).toBeDefined();
      expect(parser.getParserType()).toBe('hybrid');
    });

    it('should get default parser with custom config', () => {
      const factoryWithConfig = new IntentParserFactory({ defaultParserType: 'rule' });
      const parser = factoryWithConfig.getDefaultParser();
      
      expect(RuleBasedParser).toHaveBeenCalled();
      expect(parser.getParserType()).toBe('rule');
    });
  });

  describe('Parser chain', () => {
    it('should create parser chain with default types', () => {
      const parsers = factory.createParserChain();
      
      expect(parsers).toBeDefined();
      expect(Array.isArray(parsers)).toBe(true);
      expect(parsers.length).toBeGreaterThan(0);
    });

    it('should create parser chain with specified types', () => {
      const parsers = factory.createParserChain(['rule', 'hybrid']);
      
      expect(parsers.length).toBe(2);
      expect(parsers[0].getParserType()).toBe('rule');
      expect(parsers[1].getParserType()).toBe('hybrid');
    });
  });

  describe('Available parser types', () => {
    it('should return available parser types', () => {
      const types = factory.getAvailableParserTypes();
      
      expect(types).toContain('rule');
      expect(types).toContain('hybrid');
      expect(types).toContain('cloud');
      expect(types.length).toBe(3);
    });
  });

  describe('Parser capabilities', () => {
    it('should get rule parser capabilities', () => {
      const capabilities = factory.getParserCapabilities('rule');
      
      expect(capabilities).toBeDefined();
      expect(capabilities.supportsAI).toBe(false);
      expect(capabilities.supportsToolMatching).toBe(true);
      expect(capabilities.supportsParameterExtraction).toBe(true);
    });

    it('should get hybrid parser capabilities', () => {
      const capabilities = factory.getParserCapabilities('hybrid');
      
      expect(capabilities).toBeDefined();
      expect(capabilities.supportsAI).toBe(true);
      expect(capabilities.supportsToolMatching).toBe(true);
      expect(capabilities.supportsParameterExtraction).toBe(true);
    });

    it('should get cloud parser capabilities', () => {
      const capabilities = factory.getParserCapabilities('cloud');
      
      expect(capabilities).toBeDefined();
      expect(capabilities.supportsAI).toBe(true);
      expect(capabilities.supportsToolMatching).toBe(true);
      expect(capabilities.supportsParameterExtraction).toBe(true);
    });

    it('should throw error for unknown parser type capabilities', () => {
      expect(() => factory.getParserCapabilities('unknown' as any)).toThrow('Unknown parser type: unknown');
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      const newConfig = { defaultParserType: 'rule' as const };
      factory.updateConfig(newConfig);
      
      const parser = factory.getDefaultParser();
      expect(parser.getParserType()).toBe('rule');
    });

    it('should clear cache when updating config with parserConfigs', () => {
      // First get a parser to populate cache
      factory.getParser('rule');
      
      // Update config with parserConfigs should clear cache
      factory.updateConfig({ parserConfigs: { rule: {} } });
      
      // Get parser again should create new instance
      factory.getParser('rule');
      
      expect(RuleBasedParser).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should handle constructor errors', () => {
      // Mock constructor to throw error
      (RuleBasedParser as jest.MockedClass<typeof RuleBasedParser>).mockImplementation(() => {
        throw new Error('Constructor error');
      });
      
      expect(() => factory.createParser('rule')).toThrow('Constructor error');
    });

    it('should handle invalid parser type in createParser', () => {
      expect(() => factory.createParser('invalid' as any)).toThrow('Unknown parser type: invalid');
    });

    it('should handle invalid parser type in getParser', () => {
      expect(() => factory.getParser('invalid' as any)).toThrow('Unknown parser type: invalid');
    });

    it('should handle invalid parser type in getParserCapabilities', () => {
      expect(() => factory.getParserCapabilities('invalid' as any)).toThrow('Unknown parser type: invalid');
    });
  });

  describe('Edge cases', () => {
    it('should handle case-insensitive parser type', () => {
      expect(() => factory.createParser('RULE' as any)).toThrow('Unknown parser type: RULE');
    });

    it('should handle whitespace in parser type', () => {
      expect(() => factory.createParser(' rule ' as any)).toThrow('Unknown parser type:  rule ');
    });

    it('should handle empty string parser type', () => {
      expect(() => factory.createParser('' as any)).toThrow('Unknown parser type: ');
    });

    it('should handle null parser type', () => {
      expect(() => factory.createParser(null as any)).toThrow('Unknown parser type: null');
    });

    it('should handle undefined parser type', () => {
      expect(() => factory.createParser(undefined as any)).toThrow('Unknown parser type: undefined');
    });
  });

  describe('Factory instances', () => {
    it('should create multiple factory instances', () => {
      const factory1 = new IntentParserFactory();
      const factory2 = new IntentParserFactory();
      
      expect(factory1).not.toBe(factory2);
      expect(factory1).toBeInstanceOf(IntentParserFactory);
      expect(factory2).toBeInstanceOf(IntentParserFactory);
    });

    it('should have independent caches', () => {
      const factory1 = new IntentParserFactory();
      const factory2 = new IntentParserFactory();
      
      const parser1 = factory1.getParser('rule');
      const parser2 = factory2.getParser('rule');
      
      expect(parser1).not.toBe(parser2);
      expect(RuleBasedParser).toHaveBeenCalledTimes(2);
    });
  });
});