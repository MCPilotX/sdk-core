/**
 * Test script for the new intent parser architecture
 * Validates that the new architecture works correctly
 * Converted to proper Jest test structure
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RuleBasedParser } from '../../src/ai/rule-based-parser';
import { HybridAIParser } from '../../src/ai/hybrid-ai-parser';
import { IntentParserFactory } from '../../src/ai/intent-parser-factory';
import { IntentParserSelector } from '../../src/ai/intent-parser-selector';
import { EnhancedIntentEngineAdapter } from '../../src/ai/legacy-adapters';

// Mock console methods to avoid cluttering test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  jest.clearAllMocks();
});

describe('New Intent Parser Architecture Tests', () => {
  describe('RuleBasedParser', () => {
    let parser: RuleBasedParser;

    beforeEach(() => {
      parser = new RuleBasedParser();
    });

    it('should parse basic queries correctly', async () => {
      const testQueries = [
        { query: 'Read the file /home/user/test.txt', expectedService: 'filesystem', expectedMethod: 'read' },
        { query: 'Ping google.com', expectedService: 'network', expectedMethod: 'ping' },
        { query: 'Calculate 2 + 2', expectedService: 'calculator', expectedMethod: 'calculate' },
        { query: 'List files in directory', expectedService: 'filesystem', expectedMethod: 'list' },
      ];

      for (const testCase of testQueries) {
        const result = await parser.parse(testCase.query);
        expect(result.service).toBe(testCase.expectedService);
        expect(result.method).toBe(testCase.expectedMethod);
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should return unknown for unknown queries', async () => {
      const result = await parser.parse('Unknown query that should fail');
      expect(result.service).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('IntentParserFactory', () => {
    let factory: IntentParserFactory;

    beforeEach(() => {
      factory = new IntentParserFactory();
    });

    it('should create parsers of different types', () => {
      const ruleParser = factory.getParser('rule');
      const hybridParser = factory.getParser('hybrid');
      
      expect(ruleParser.getParserType()).toBe('rule');
      expect(hybridParser.getParserType()).toBe('hybrid');
    });

    it('should create parser chain', () => {
      const chain = factory.createParserChain();
      expect(Array.isArray(chain)).toBe(true);
      expect(chain.length).toBeGreaterThan(0);
    });
  });

  describe('IntentParserSelector', () => {
    it('should parse queries with selector', async () => {
      const selector = new IntentParserSelector({
        strategy: 'fastest',
        maxResponseTime: 1000
      });
      
      const availableTools = ['filesystem:read', 'filesystem:write', 'calculator:calculate'];
      
      const { result, selection } = await selector.parseWithBestFit(
        'Calculate 2 + 2',
        { availableTools }
      );
      
      expect(selection.parserType).toBeDefined();
      expect(selection.selectionReason).toBeDefined();
      expect(result.service).toBe('calculator');
      expect(result.method).toBe('calculate');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle different selection strategies', () => {
      const fastestSelector = new IntentParserSelector({ strategy: 'fastest' });
      const hybridSelector = new IntentParserSelector({ strategy: 'hybrid' });
      
      expect(fastestSelector).toBeDefined();
      expect(hybridSelector).toBeDefined();
    });
  });

  describe('EnhancedIntentEngineAdapter (Legacy Compatibility)', () => {
    let adapter: EnhancedIntentEngineAdapter;

    beforeEach(() => {
      adapter = new EnhancedIntentEngineAdapter();
    });

    it('should parse file read queries', async () => {
      const availableTools = ['filesystem:read', 'network:ping'];
      const result = await adapter.parse('Read file test.txt', availableTools);
      
      expect(result).toBeDefined();
      if (result) {
        expect(result.service).toBe('filesystem');
        expect(result.method).toBe('read');
      }
    });

    it('should handle null results for unrecognized queries', async () => {
      const availableTools = ['filesystem:read', 'network:ping'];
      const result = await adapter.parse('Unknown query that should fail', availableTools);
      
      // Adapter might return null for unrecognized queries
      expect(result === null || result === undefined || result?.service === 'unknown').toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should create simple parser with custom configuration', () => {
      const createSimpleParser = () => new RuleBasedParser({ confidenceThreshold: 0.7 });
      const simpleParser = createSimpleParser();
      
      expect(simpleParser.getParserType()).toBe('rule');
    });

    it('should create default selector and parse queries', async () => {
      const createDefaultSelector = () => new IntentParserSelector({ strategy: 'hybrid' });
      const defaultSelector = createDefaultSelector();
      
      expect(defaultSelector).toBeDefined();
      
      const { result, selection } = await defaultSelector.parseWithBestFit('List files');
      expect(selection.parserType).toBeDefined();
      expect(result.service).toBe('filesystem');
      expect(result.method).toBe('list');
    });
  });

  describe('Integration Tests', () => {
    it('should demonstrate architecture improvements', () => {
      // This test validates the key improvements mentioned in the original test
      const factory = new IntentParserFactory();
      const selector = new IntentParserSelector({ strategy: 'hybrid' });
      
      expect(factory).toBeDefined();
      expect(selector).toBeDefined();
      
      // Verify we can create all necessary components
      const ruleParser = factory.getParser('rule');
      const hybridParser = factory.getParser('hybrid');
      const chain = factory.createParserChain();
      
      expect(ruleParser.getParserType()).toBe('rule');
      expect(hybridParser.getParserType()).toBe('hybrid');
      expect(chain.length).toBeGreaterThanOrEqual(2);
    });
  });
});
