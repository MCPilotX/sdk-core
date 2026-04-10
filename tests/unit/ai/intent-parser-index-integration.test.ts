/**
 * Integration tests for IntentParserUtils in intent-parser-index.ts
 * These tests focus on actual code execution without mocks to improve coverage
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { IntentParserUtils, IntentParserExamples } from '../../../src/ai/intent-parser-index';
import { IntentParserSelector } from '../../../src/ai/intent-parser-selector';
import { RuleBasedParser } from '../../../src/ai/rule-based-parser';
import { HybridAIParser } from '../../../src/ai/hybrid-ai-parser';

describe('IntentParserUtils - Integration Tests (No Mocks)', () => {
  describe('createDefaultSelector', () => {
    it('should create a real selector instance with correct configuration', () => {
      const selector = IntentParserUtils.createDefaultSelector();
      
      // Verify it's a real instance
      expect(selector).toBeInstanceOf(IntentParserSelector);
      
      // Verify configuration (we can't directly access private config, but we can test behavior)
      expect(selector).toBeDefined();
      expect(typeof selector.parseWithBestFit).toBe('function');
    });

    it('should create selector with hybrid strategy by default', () => {
      const selector = IntentParserUtils.createDefaultSelector();
      
      // The selector should be functional
      expect(selector).toBeDefined();
      
      // We can test that it doesn't throw when used
      expect(() => {
        // Just accessing methods shouldn't throw
        selector.parseWithBestFit;
        selector.getFactory;
      }).not.toThrow();
    });
  });

  describe('createSimpleParser', () => {
    it('should create a real rule-based parser instance', () => {
      const parser = IntentParserUtils.createSimpleParser();
      
      // Verify it's a real instance
      expect(parser).toBeInstanceOf(RuleBasedParser);
      
      // Verify it has expected methods
      expect(typeof parser.parse).toBe('function');
      expect(typeof parser.getParserType).toBe('function');
      
      // Verify parser type
      expect(parser.getParserType()).toBe('rule');
    });

    it('should create parser with default confidence threshold', async () => {
      const parser = IntentParserUtils.createSimpleParser();
      
      // The parser should be functional
      expect(parser).toBeDefined();
      
      // Test basic functionality
      const testQuery = 'list files';
      const result = await parser.parse(testQuery);
      
      // Even if it returns unknown, it should return a valid structure
      expect(result).toBeDefined();
      expect(result.service).toBeDefined();
      expect(result.method).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('createAIParser', () => {
    it('should create a real hybrid AI parser instance without config', () => {
      const parser = IntentParserUtils.createAIParser();
      
      // Verify it's a real instance
      expect(parser).toBeInstanceOf(HybridAIParser);
      
      // Verify it has expected methods
      expect(typeof parser.parse).toBe('function');
      expect(typeof parser.getParserType).toBe('function');
      
      // Verify parser type
      expect(parser.getParserType()).toBe('hybrid');
    });

    it('should create AI parser with custom AI config', () => {
      const aiConfig = { 
        provider: 'openai', 
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo'
      };
      const parser = IntentParserUtils.createAIParser(aiConfig);
      
      expect(parser).toBeInstanceOf(HybridAIParser);
      expect(parser.getParserType()).toBe('hybrid');
    });

    it('should handle null AI config gracefully', () => {
      const parser = IntentParserUtils.createAIParser(null as any);
      
      expect(parser).toBeInstanceOf(HybridAIParser);
      expect(parser.getParserType()).toBe('hybrid');
    });

    it('should handle undefined AI config gracefully', () => {
      const parser = IntentParserUtils.createAIParser(undefined);
      
      expect(parser).toBeInstanceOf(HybridAIParser);
      expect(parser.getParserType()).toBe('hybrid');
    });
  });

  describe('parseQuery', () => {
    it('should parse a simple query with real selector', async () => {
      // This test uses real implementations
      const result = await IntentParserUtils.parseQuery('list files');
      
      // Verify result structure
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.parserType).toBeDefined();
      expect(result.confidence).toBeDefined();
      
      // Verify types
      expect(typeof result.parserType).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should parse query with available tools context', async () => {
      const availableTools = ['filesystem', 'calculator', 'network'];
      const result = await IntentParserUtils.parseQuery('read file test.txt', availableTools);
      
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.parserType).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle empty query', async () => {
      const result = await IntentParserUtils.parseQuery('');
      
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.confidence).toBeDefined();
      // Empty query might have low confidence
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle long complex query', async () => {
      const longQuery = 'Please analyze the current directory structure and find all TypeScript files that contain the word "parser" in their content, then create a summary report';
      const result = await IntentParserUtils.parseQuery(longQuery);
      
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.parserType).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle special characters in query', async () => {
      const specialQuery = 'Check file /home/user/test-file_123@special.com';
      const result = await IntentParserUtils.parseQuery(specialQuery);
      
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.parserType).toBeDefined();
    });

    it('should handle query with numbers and symbols', async () => {
      const numericQuery = 'Calculate 123 + 456 * 789 / (2 + 3)';
      const result = await IntentParserUtils.parseQuery(numericQuery);
      
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.parserType).toBeDefined();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle queries with only whitespace', async () => {
      const result = await IntentParserUtils.parseQuery('   ');
      
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      // Whitespace-only query should still return a result
      expect(result.confidence).toBeDefined();
    });

    it('should handle very short queries', async () => {
      const result = await IntentParserUtils.parseQuery('a');
      
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle queries with newlines', async () => {
      const multilineQuery = `First line
Second line
Third line`;
      const result = await IntentParserUtils.parseQuery(multilineQuery);
      
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.parserType).toBeDefined();
    });

    it('should handle queries with mixed case', async () => {
      const mixedCaseQuery = 'LiSt FiLeS In CuRrEnT DiReCtOrY';
      const result = await IntentParserUtils.parseQuery(mixedCaseQuery);
      
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.parserType).toBeDefined();
    });
  });

  describe('method consistency', () => {
    it('should have all static methods defined', () => {
      expect(typeof IntentParserUtils.createDefaultSelector).toBe('function');
      expect(typeof IntentParserUtils.createSimpleParser).toBe('function');
      expect(typeof IntentParserUtils.createAIParser).toBe('function');
      expect(typeof IntentParserUtils.parseQuery).toBe('function');
    });

    it('should maintain consistent return types', () => {
      const selector = IntentParserUtils.createDefaultSelector();
      const simpleParser = IntentParserUtils.createSimpleParser();
      const aiParser = IntentParserUtils.createAIParser();
      
      expect(selector).toBeInstanceOf(IntentParserSelector);
      expect(simpleParser).toBeInstanceOf(RuleBasedParser);
      expect(aiParser).toBeInstanceOf(HybridAIParser);
    });

    it('should allow chaining of operations', async () => {
      // Create a parser using the utility
      const parser = IntentParserUtils.createSimpleParser();
      
      // Use it to parse a query
      const parseResult = await parser.parse('test query');
      
      expect(parseResult).toBeDefined();
      expect(parseResult.service).toBeDefined();
      expect(parseResult.method).toBeDefined();
      expect(parseResult.confidence).toBeDefined();
      expect(typeof parseResult.confidence).toBe('number');
      
      // Also test the parseQuery method
      const utilityResult = await IntentParserUtils.parseQuery('another query');
      
      expect(utilityResult).toBeDefined();
      expect(utilityResult.result).toBeDefined();
      expect(utilityResult.parserType).toBeDefined();
      expect(utilityResult.confidence).toBeDefined();
    });
  });
});

describe('IntentParserExamples - Integration Tests', () => {
  it('should contain real example queries array', () => {
    expect(IntentParserExamples).toBeDefined();
    expect(Array.isArray(IntentParserExamples)).toBe(true);
    expect(IntentParserExamples.length).toBeGreaterThan(0);
    
    // Verify all examples are strings
    IntentParserExamples.forEach(example => {
      expect(typeof example).toBe('string');
      expect(example.length).toBeGreaterThan(0);
    });
  });

  it('should have diverse and realistic examples', () => {
    // Check for different types of intents
    const examples = IntentParserExamples.map(q => q.toLowerCase());
    
    // File operations
    expect(examples.some(q => q.includes('file') || q.includes('directory'))).toBe(true);
    
    // System operations
    expect(examples.some(q => q.includes('start') || q.includes('stop') || q.includes('service'))).toBe(true);
    
    // Network operations
    expect(examples.some(q => q.includes('ping'))).toBe(true);
    
    // Status/check operations
    expect(examples.some(q => q.includes('status') || q.includes('check'))).toBe(true);
  });

  it('should be usable with parseQuery method', async () => {
    // Test that examples can actually be parsed
    for (const example of IntentParserExamples.slice(0, 3)) { // Test first 3 to avoid too many requests
      const result = await IntentParserUtils.parseQuery(example);
      
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.parserType).toBeDefined();
      expect(result.confidence).toBeDefined();
      
      // Confidence should be within valid range
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('should have examples with varying complexity', () => {
    const lengths = IntentParserExamples.map(q => q.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    
    // Should have both short and long examples
    expect(Math.min(...lengths)).toBeLessThan(30); // At least one short example
    expect(Math.max(...lengths)).toBeGreaterThan(20); // At least one longer example
    
    // Average length should be reasonable
    expect(avgLength).toBeGreaterThan(10);
    expect(avgLength).toBeLessThan(100);
  });
});

describe('Type exports verification', () => {
  it('should verify that all expected exports are available', () => {
    // This is a compile-time check, but we can verify the module exports
    expect(IntentParserUtils).toBeDefined();
    expect(IntentParserExamples).toBeDefined();
    
    // Check class structure
    expect(typeof IntentParserUtils).toBe('function');
    expect(IntentParserUtils.createDefaultSelector).toBeDefined();
    expect(IntentParserUtils.createSimpleParser).toBeDefined();
    expect(IntentParserUtils.createAIParser).toBeDefined();
    expect(IntentParserUtils.parseQuery).toBeDefined();
    
    // Check examples array
    expect(Array.isArray(IntentParserExamples)).toBe(true);
  });
});