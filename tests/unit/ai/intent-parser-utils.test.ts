/**
 * Tests for IntentParserUtils in intent-parser-index.ts
 * This test suite aims to improve test coverage for the IntentParserUtils class
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { IntentParserUtils, IntentParserExamples } from '../../../src/ai/intent-parser-index';
import { IntentParserSelector } from '../../../src/ai/intent-parser-selector';
import { RuleBasedParser } from '../../../src/ai/rule-based-parser';
import { HybridAIParser } from '../../../src/ai/hybrid-ai-parser';

// Mock dependencies
jest.mock('../../../src/ai/intent-parser-selector');
jest.mock('../../../src/ai/rule-based-parser');
jest.mock('../../../src/ai/hybrid-ai-parser');

describe('IntentParserUtils', () => {
  let mockSelector: jest.Mocked<IntentParserSelector>;
  let mockRuleBasedParser: jest.Mocked<RuleBasedParser>;
  let mockHybridAIParser: jest.Mocked<HybridAIParser>;
  let mockCloudParser: jest.Mocked<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockSelector = {
      parseWithBestFit: jest.fn(),
      getFactory: jest.fn(),
      updateConfig: jest.fn(),
      analyzeQuery: jest.fn(),
    } as any;
    
    mockRuleBasedParser = {
      parse: jest.fn(),
      getParserType: jest.fn().mockReturnValue('rule'),
      addPattern: jest.fn(),
      clearToolCache: jest.fn(),
    } as any;
    
    mockHybridAIParser = {
      parse: jest.fn(),
      getParserType: jest.fn().mockReturnValue('hybrid'),
    } as any;
    
    mockCloudParser = {
      parse: jest.fn(),
      getParserType: jest.fn().mockReturnValue('cloud'),
    } as any;
    
    // Mock the constructors to return our mocks
    (IntentParserSelector as jest.MockedClass<typeof IntentParserSelector>).mockImplementation(() => mockSelector);
    (RuleBasedParser as jest.MockedClass<typeof RuleBasedParser>).mockImplementation(() => mockRuleBasedParser);
    (HybridAIParser as jest.MockedClass<typeof HybridAIParser>).mockImplementation(() => mockHybridAIParser);
  });

  describe('createDefaultSelector', () => {
    it('should create a default selector with hybrid strategy', () => {
      const selector = IntentParserUtils.createDefaultSelector();
      
      expect(IntentParserSelector).toHaveBeenCalledWith({
        strategy: 'hybrid',
        maxResponseTime: 3000,
        minConfidence: 0.6
      });
      expect(selector).toBe(mockSelector);
    });

    it('should create selector with custom configuration', () => {
      // Test that the method returns a selector instance
      const selector = IntentParserUtils.createDefaultSelector();
      expect(selector).toBeDefined();
      expect(selector).toBe(mockSelector);
    });
  });

  describe('createSimpleParser', () => {
    it('should create a rule-based parser with default config', () => {
      const parser = IntentParserUtils.createSimpleParser();
      
      expect(RuleBasedParser).toHaveBeenCalledWith({
        confidenceThreshold: 0.7
      });
      expect(parser).toBe(mockRuleBasedParser);
    });

    it('should create parser with correct type', () => {
      const parser = IntentParserUtils.createSimpleParser();
      expect(parser.getParserType()).toBe('rule');
    });
  });

  describe('createAIParser', () => {
    it('should create a hybrid AI parser with default config', () => {
      const parser = IntentParserUtils.createAIParser();
      
      expect(HybridAIParser).toHaveBeenCalledWith({
        aiConfig: undefined,
        confidenceThreshold: 0.6,
        ruleConfidenceThreshold: 0.7
      });
      expect(parser).toBe(mockHybridAIParser);
    });

    it('should create AI parser with custom AI config', () => {
      const aiConfig = { provider: 'openai', apiKey: 'test-key' };
      const parser = IntentParserUtils.createAIParser(aiConfig);
      
      expect(HybridAIParser).toHaveBeenCalledWith({
        aiConfig,
        confidenceThreshold: 0.6,
        ruleConfidenceThreshold: 0.7
      });
      expect(parser).toBe(mockHybridAIParser);
    });

    it('should create parser with correct type', () => {
      const parser = IntentParserUtils.createAIParser();
      expect(parser.getParserType()).toBe('hybrid');
    });
  });

  describe('parseQuery', () => {
    it('should parse query with default selector', async () => {
      const mockResult = {
        result: {
          service: 'test-service',
          method: 'test-method',
          parameters: {},
          confidence: 0.8,
          parserType: 'rule'
        },
        selection: {
          parser: mockRuleBasedParser,
          parserType: 'rule',
          selectionReason: 'test reason',
          metrics: {
            responseTime: 100,
            confidence: 0.8,
            cost: 0
          }
        }
      };
      
      mockSelector.parseWithBestFit.mockResolvedValue(mockResult);
      
      const result = await IntentParserUtils.parseQuery('test query');
      
      expect(mockSelector.parseWithBestFit).toHaveBeenCalledWith('test query', {});
      expect(result).toEqual({
        result: mockResult.result,
        parserType: 'rule',
        confidence: 0.8
      });
    });

    it('should parse query with available tools', async () => {
      const mockResult = {
        result: {
          service: 'filesystem',
          method: 'list',
          parameters: { path: '.' },
          confidence: 0.9,
          parserType: 'hybrid'
        },
        selection: {
          parser: mockHybridAIParser,
          parserType: 'hybrid',
          selectionReason: 'test reason',
          metrics: {
            responseTime: 200,
            confidence: 0.9,
            cost: 0.5
          }
        }
      };
      
      mockSelector.parseWithBestFit.mockResolvedValue(mockResult);
      
      const availableTools = ['filesystem', 'calculator'];
      const result = await IntentParserUtils.parseQuery('test query', availableTools);
      
      expect(mockSelector.parseWithBestFit).toHaveBeenCalledWith('test query', { availableTools });
      expect(result).toEqual({
        result: mockResult.result,
        parserType: 'hybrid',
        confidence: 0.9
      });
    });

    it('should handle parse errors gracefully', async () => {
      mockSelector.parseWithBestFit.mockRejectedValue(new Error('Parse error'));
      
      await expect(IntentParserUtils.parseQuery('test query')).rejects.toThrow('Parse error');
    });

    it('should handle empty query', async () => {
      const mockResult = {
        result: {
          service: 'unknown',
          method: 'unknown',
          parameters: {},
          confidence: 0.1,
          parserType: 'rule'
        },
        selection: {
          parser: mockRuleBasedParser,
          parserType: 'rule',
          selectionReason: 'fallback',
          metrics: {
            responseTime: 50,
            confidence: 0.1,
            cost: 0
          }
        }
      };
      
      mockSelector.parseWithBestFit.mockResolvedValue(mockResult);
      
      const result = await IntentParserUtils.parseQuery('');
      
      expect(mockSelector.parseWithBestFit).toHaveBeenCalledWith('', {});
      expect(result.confidence).toBe(0.1);
    });

    it('should handle long query', async () => {
      const longQuery = 'This is a very long query that tests the parser with many words and complex structure';
      const mockResult = {
        result: {
          service: 'complex-service',
          method: 'complex-method',
          parameters: {},
          confidence: 0.7,
          parserType: 'cloud'
        },
        selection: {
          parser: mockCloudParser,
          parserType: 'cloud',
          selectionReason: 'complex query',
          metrics: {
            responseTime: 500,
            confidence: 0.7,
            cost: 1.0
          }
        }
      };
      
      mockSelector.parseWithBestFit.mockResolvedValue(mockResult);
      
      const result = await IntentParserUtils.parseQuery(longQuery);
      
      expect(mockSelector.parseWithBestFit).toHaveBeenCalledWith(longQuery, {});
      expect(result.parserType).toBe('cloud');
    });
  });

  describe('edge cases', () => {
    it('should handle null or undefined AI config', () => {
      // Test with undefined
      const parser1 = IntentParserUtils.createAIParser();
      expect(parser1).toBeDefined();
      
      // Test with null
      const parser2 = IntentParserUtils.createAIParser(null as any);
      expect(parser2).toBeDefined();
    });

    it('should handle selector creation with mocked dependencies', () => {
      // Ensure selector creation doesn't fail with mocked dependencies
      const selector = IntentParserUtils.createDefaultSelector();
      expect(selector).toBeDefined();
      expect(selector).toBe(mockSelector);
    });

    it('should maintain method consistency', () => {
      // Test that all static methods return expected types
      const selector = IntentParserUtils.createDefaultSelector();
      const simpleParser = IntentParserUtils.createSimpleParser();
      const aiParser = IntentParserUtils.createAIParser();
      
      expect(selector).toBeDefined();
      expect(simpleParser).toBeDefined();
      expect(aiParser).toBeDefined();
      
      // Verify they are instances of expected classes (via mocks)
      expect(selector).toBe(mockSelector);
      expect(simpleParser).toBe(mockRuleBasedParser);
      expect(aiParser).toBe(mockHybridAIParser);
    });
  });
});

describe('IntentParserExamples', () => {
  it('should contain example queries', () => {
    expect(IntentParserExamples).toBeDefined();
    expect(Array.isArray(IntentParserExamples)).toBe(true);
    expect(IntentParserExamples.length).toBeGreaterThan(0);
  });

  it('should have valid example queries', () => {
    IntentParserExamples.forEach(query => {
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
    });
  });

  it('should contain common intent examples', () => {
    const examples = IntentParserExamples.map(q => q.toLowerCase());
    
    // Check for common patterns
    expect(examples.some(q => q.includes('file'))).toBe(true);
    expect(examples.some(q => q.includes('list'))).toBe(true);
    expect(examples.some(q => q.includes('start') || q.includes('stop'))).toBe(true);
    expect(examples.some(q => q.includes('status') || q.includes('check'))).toBe(true);
  });

  it('should have diverse example types', () => {
    // Check that we have different types of queries
    const fileQueries = IntentParserExamples.filter(q => 
      q.toLowerCase().includes('file') || q.toLowerCase().includes('directory')
    );
    const systemQueries = IntentParserExamples.filter(q => 
      q.toLowerCase().includes('start') || q.toLowerCase().includes('stop') || q.toLowerCase().includes('service')
    );
    const networkQueries = IntentParserExamples.filter(q => 
      q.toLowerCase().includes('ping')
    );
    
    expect(fileQueries.length).toBeGreaterThan(0);
    expect(systemQueries.length).toBeGreaterThan(0);
    expect(networkQueries.length).toBeGreaterThan(0);
  });
});

describe('Type exports', () => {
  it('should export all necessary types', () => {
    // This is a compile-time check, but we can verify the module exports
    expect(IntentParserUtils).toBeDefined();
    expect(IntentParserExamples).toBeDefined();
    
    // The actual type checking happens at compile time
    // This test just ensures the exports exist
    expect(typeof IntentParserUtils).toBe('function');
    expect(Array.isArray(IntentParserExamples)).toBe(true);
  });
});