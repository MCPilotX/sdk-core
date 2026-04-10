/**
 * Comprehensive tests for HybridAIParser
 * This test suite aims to improve test coverage for the HybridAIParser class
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { HybridAIParser } from '../../../src/ai/hybrid-ai-parser';
import { RuleBasedParser } from '../../../src/ai/rule-based-parser';

// Mock dependencies
jest.mock('../../../src/ai/rule-based-parser');
jest.mock('../../../src/ai/ai');

describe('HybridAIParser Comprehensive Tests', () => {
  let parser: HybridAIParser;
  let mockRuleBasedParser: jest.Mocked<RuleBasedParser>;
  let mockAI: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instance for RuleBasedParser
    mockRuleBasedParser = {
      parse: jest.fn(),
      getParserType: jest.fn().mockReturnValue('rule'),
      addPattern: jest.fn(),
      clearToolCache: jest.fn(),
    } as any;
    
    // Create mock instance for AI
    mockAI = {
      configure: jest.fn().mockReturnValue(Promise.resolve()),
      parse: jest.fn(),
    };
    
    // Mock the constructors to return our mocks
    (RuleBasedParser as jest.MockedClass<typeof RuleBasedParser>).mockImplementation(() => mockRuleBasedParser);
    
    // Mock AI constructor
    const AIMock = require('../../../src/ai/ai').AI;
    AIMock.mockImplementation(() => mockAI);
    
    parser = new HybridAIParser();
  });

  describe('Basic functionality', () => {
    it('should have correct parser type', () => {
      expect(parser.getParserType()).toBe('hybrid');
    });

    it('should initialize with rule-based parser', () => {
      expect(RuleBasedParser).toHaveBeenCalled();
      expect(parser).toBeDefined();
    });
  });

  describe('Parse method', () => {
    it('should parse query using rule-based parser', async () => {
      const mockResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test.txt' },
        confidence: 0.8,
        metadata: { matchType: 'rule_pattern' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse('Read file test.txt');
      
      expect(mockRuleBasedParser.parse).toHaveBeenCalledWith('Read file test.txt', undefined);
      expect(result.service).toBe('filesystem');
      expect(result.method).toBe('read');
      expect(result.parameters.path).toBe('/test.txt');
      expect(result.confidence).toBe(0.8);
      expect(result.metadata.matchType).toBe('rule_pattern');
      expect(result.metadata.aiUsed).toBe(false);
    });

    it('should parse query with available tools', async () => {
      const mockResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test.txt' },
        confidence: 0.9,
        metadata: { matchType: 'tool_name' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const availableTools = ['filesystem:read', 'filesystem:write'];
      const result = await parser.parse('read', { availableTools });
      
      expect(mockRuleBasedParser.parse).toHaveBeenCalledWith('read', { availableTools });
      expect(result.service).toBe('filesystem');
      expect(result.method).toBe('read');
      expect(result.parameters.path).toBe('/test.txt');
      expect(result.confidence).toBe(0.9);
      expect(result.metadata.matchType).toBe('tool_name');
      expect(result.metadata.aiUsed).toBe(false);
    });

    it('should handle low confidence results', async () => {
      const mockResult = {
        service: 'unknown',
        method: 'unknown',
        parameters: {},
        confidence: 0.3,
        metadata: { matchType: 'keyword' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse('Some unknown query');
      
      expect(result.service).toBe('unknown');
      expect(result.method).toBe('unknown');
      expect(result.parameters).toEqual({});
      expect(result.confidence).toBe(0.3);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.metadata.matchType).toBe('keyword');
      expect(result.metadata.aiUsed).toBe(false);
    });

    it('should handle empty query', async () => {
      const mockResult = {
        service: 'unknown',
        method: 'unknown',
        parameters: {},
        confidence: 0.1,
        metadata: { matchType: 'unknown' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse('');
      
      expect(result.service).toBe('unknown');
      expect(result.method).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle whitespace-only query', async () => {
      const mockResult = {
        service: 'unknown',
        method: 'unknown',
        parameters: {},
        confidence: 0.1,
        metadata: { matchType: 'unknown' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse('   ');
      
      expect(result.service).toBe('unknown');
      expect(result.method).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Error handling', () => {
    it('should handle rule-based parser throwing error', async () => {
      mockRuleBasedParser.parse.mockRejectedValue(new Error('Parser error'));
      
      await expect(parser.parse('test query')).rejects.toThrow('Parser error');
    });

    it('should handle rule-based parser returning unknown result', async () => {
      const mockResult = {
        service: 'unknown',
        method: 'unknown',
        parameters: {},
        confidence: 0.1,
        metadata: { matchType: 'unknown' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse('test query');
      
      expect(result.service).toBe('unknown');
      expect(result.method).toBe('unknown');
      expect(result.confidence).toBe(0.1);
      expect(result.metadata.aiUsed).toBe(false);
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle long queries', async () => {
      const longQuery = 'Please read the file at /very/long/path/to/some/important/document.txt and show me its contents';
      const mockResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/very/long/path/to/some/important/document.txt' },
        confidence: 0.8,
        metadata: { matchType: 'rule_pattern' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse(longQuery);
      
      expect(result.service).toBe('filesystem');
      expect(result.method).toBe('read');
      expect(result.parameters.path).toContain('/very/long/path');
    });

    it('should handle queries with special characters', async () => {
      const query = 'Read file: /path/to/file (important).txt';
      const mockResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/path/to/file (important).txt' },
        confidence: 0.7,
        metadata: { matchType: 'rule_pattern' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse(query);
      
      expect(result.service).toBe('filesystem');
      expect(result.method).toBe('read');
      expect(result.parameters.path).toBeDefined();
    });

    it('should handle case-insensitive queries', async () => {
      const mockResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: 'test.txt' },
        confidence: 0.8,
        metadata: { matchType: 'rule_pattern' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result1 = await parser.parse('READ FILE test.txt');
      const result2 = await parser.parse('read file test.txt');
      const result3 = await parser.parse('Read File test.txt');
      
      expect(result1.service).toBe('filesystem');
      expect(result1.method).toBe('read');
      expect(result2.service).toBe('filesystem');
      expect(result2.method).toBe('read');
      expect(result3.service).toBe('filesystem');
      expect(result3.method).toBe('read');
    });
  });

  describe('Integration with rule-based parser', () => {
    it('should pass through available tools to rule-based parser', async () => {
      const availableTools = ['filesystem:read', 'network:ping', 'process:start'];
      const mockResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test.txt' },
        confidence: 0.9,
        metadata: { matchType: 'tool_name' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse('read', { availableTools });
      
      expect(mockRuleBasedParser.parse).toHaveBeenCalledWith('read', { availableTools });
      expect(result.confidence).toBe(0.9);
    });

    it('should pass through metadata to rule-based parser', async () => {
      const metadata = { userId: 'test-user', sessionId: 'test-session' };
      const mockResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test.txt' },
        confidence: 0.8,
        metadata: { matchType: 'rule_pattern' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse('Read file test.txt', { metadata });
      
      expect(mockRuleBasedParser.parse).toHaveBeenCalledWith('Read file test.txt', { metadata });
      expect(result.service).toBe('filesystem');
      expect(result.method).toBe('read');
      expect(result.parameters.path).toBe('/test.txt');
      expect(result.confidence).toBe(0.8);
      expect(result.metadata.matchType).toBe('rule_pattern');
      expect(result.metadata.aiUsed).toBe(false);
    });
  });

  describe('Metadata propagation', () => {
    it('should propagate metadata from rule-based parser', async () => {
      const mockResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test.txt' },
        confidence: 0.85,
        metadata: {
          matchType: 'rule_pattern',
          matchedPattern: 'read.*file',
          timestamp: Date.now()
        }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse('Read file test.txt');
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.matchType).toBe('rule_pattern');
      expect(result.metadata.matchedPattern).toBe('read.*file');
    });

    it('should handle metadata with tool name matches', async () => {
      const mockResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test.txt' },
        confidence: 0.95,
        metadata: {
          matchType: 'tool_name',
          matchedTool: 'filesystem:read',
          exactMatch: true
        }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse('read');
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.matchType).toBe('tool_name');
      expect(result.metadata.matchedTool).toBe('filesystem:read');
    });
  });

  describe('Configuration and initialization', () => {
    it('should initialize with custom configuration', () => {
      const config = {
        aiConfig: { provider: 'openai', apiKey: 'test-key' },
        alwaysUseAI: true,
        aiConfidenceThreshold: 0.6
      };
      
      const customParser = new HybridAIParser(config);
      
      expect(customParser).toBeDefined();
      expect(customParser.getParserType()).toBe('hybrid');
    });

    it('should handle empty configuration', () => {
      const emptyConfigParser = new HybridAIParser({});
      
      expect(emptyConfigParser).toBeDefined();
      expect(emptyConfigParser.getParserType()).toBe('hybrid');
    });

    it('should handle null configuration', () => {
      const nullConfigParser = new HybridAIParser();
      
      expect(nullConfigParser).toBeDefined();
      expect(nullConfigParser.getParserType()).toBe('hybrid');
    });

    it('should handle AI configuration without errors', () => {
      // This test verifies that the parser can be created with AI config
      // without throwing errors (even if AI service initialization fails internally)
      const config = {
        aiConfig: { provider: 'openai', apiKey: 'test-key' }
      };
      
      const parser = new HybridAIParser(config);
      
      expect(parser).toBeDefined();
      expect(parser.getParserType()).toBe('hybrid');
    });

    it('should handle alwaysUseAI configuration', () => {
      const config = {
        alwaysUseAI: true,
        aiConfig: { provider: 'openai', apiKey: 'test-key' }
      };
      
      const parser = new HybridAIParser(config);
      
      expect(parser).toBeDefined();
      expect(parser.getParserType()).toBe('hybrid');
    });

    it('should handle aiConfidenceThreshold configuration', () => {
      const config = {
        aiConfidenceThreshold: 0.7,
        aiConfig: { provider: 'openai', apiKey: 'test-key' }
      };
      
      const parser = new HybridAIParser(config);
      
      expect(parser).toBeDefined();
      expect(parser.getParserType()).toBe('hybrid');
    });

    // Note: Testing AI service initialization failure requires complex mocking
    // that is beyond the scope of this test suite. The AI service initialization
    // is tested in other integration tests.
  });

  describe('Parser type and capabilities', () => {
    it('should return correct parser type', () => {
      expect(parser.getParserType()).toBe('hybrid');
    });

    it('should have parser type constant', () => {
      // This is a simple test to ensure the parser type is consistent
      const parserType = parser.getParserType();
      expect(typeof parserType).toBe('string');
      expect(parserType).toMatch(/hybrid/i);
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle null query', async () => {
      // TypeScript won't allow null, but we can test with empty string
      const mockResult = {
        service: 'unknown',
        method: 'unknown',
        parameters: {},
        confidence: 0.1,
        metadata: { matchType: 'unknown' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse('');
      
      expect(result.service).toBe('unknown');
      expect(result.method).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle undefined context', async () => {
      const mockResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test.txt' },
        confidence: 0.8,
        metadata: { matchType: 'rule_pattern' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse('read file', undefined);
      
      expect(result.service).toBe('filesystem');
      expect(result.method).toBe('read');
      expect(result.parameters.path).toBe('/test.txt');
    });

    it('should handle context with empty availableTools', async () => {
      const mockResult = {
        service: 'unknown',
        method: 'unknown',
        parameters: {},
        confidence: 0.1,
        metadata: { matchType: 'unknown' }
      };
      
      mockRuleBasedParser.parse.mockResolvedValue(mockResult);
      
      const result = await parser.parse('test query', { availableTools: [] });
      
      expect(result.service).toBe('unknown');
      expect(result.method).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });
});
