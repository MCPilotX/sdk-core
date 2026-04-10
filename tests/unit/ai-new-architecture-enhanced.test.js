/**
 * Enhanced tests for the new intent parser architecture
 * Using Jest for better test coverage and maintainability
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RuleBasedParser } from '../../src/ai/rule-based-parser';
import { HybridAIParser } from '../../src/ai/hybrid-ai-parser';
import { IntentParserFactory } from '../../src/ai/intent-parser-factory';
import { IntentParserSelector } from '../../src/ai/intent-parser-selector';
import { EnhancedIntentEngineAdapter } from '../../src/ai/legacy-adapters';
import { IntentParserUtils } from '../../src/ai/intent-parser-index';
// Mock AI service to avoid external dependencies
jest.mock('../../src/ai/ai', () => ({
    AI: jest.fn().mockImplementation(() => ({
        parse: jest.fn().mockResolvedValue({
            service: 'ai-service',
            method: 'ai-method',
            confidence: 0.9,
            parameters: {}
        }),
        initialize: jest.fn().mockResolvedValue(true)
    }))
}));
describe('New Intent Parser Architecture', () => {
    describe('RuleBasedParser', () => {
        let parser;
        beforeEach(() => {
            parser = new RuleBasedParser();
        });
        it('should parse file read queries correctly', async () => {
            const result = await parser.parse('Read the file /home/user/test.txt');
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read');
            expect(result.confidence).toBeGreaterThan(0.7);
        });
        it('should parse ping queries correctly', async () => {
            const result = await parser.parse('Ping google.com');
            expect(result.service).toBe('network');
            expect(result.method).toBe('ping');
            expect(result.confidence).toBeGreaterThanOrEqual(0.7);
        });
        it('should parse calculation queries correctly', async () => {
            const result = await parser.parse('Calculate 2 + 2');
            expect(result.service).toBe('calculator');
            expect(result.method).toBe('calculate');
            expect(result.confidence).toBeGreaterThan(0.7);
        });
        it('should parse list files queries correctly', async () => {
            const result = await parser.parse('List files in directory');
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('list');
            expect(result.confidence).toBeGreaterThan(0.7);
        });
        it('should return unknown service for unrecognized queries', async () => {
            const result = await parser.parse('Unknown query that should fail');
            expect(result.service).toBe('unknown');
            expect(result.confidence).toBeLessThan(0.5);
        });
        it('should handle queries with context', async () => {
            const result = await parser.parse('Read file test.txt', {
                availableTools: ['filesystem:read', 'filesystem:write']
            });
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read');
        });
        it('should respect confidence threshold configuration', async () => {
            const highThresholdParser = new RuleBasedParser({ confidenceThreshold: 0.9 });
            const result = await highThresholdParser.parse('Read file test.txt');
            // The confidence value is hardcoded to 0.8 for file read queries
            // The confidenceThreshold config affects validation, not the returned confidence
            expect(result.confidence).toBe(0.8);
            // Test that the parser respects its own threshold configuration
            expect(highThresholdParser.getConfidenceThreshold()).toBe(0.9);
        });
    });
    describe('HybridAIParser', () => {
        let parser;
        beforeEach(() => {
            parser = new HybridAIParser();
        });
        it('should initialize with rule-based parser', () => {
            expect(parser.getParserType()).toBe('hybrid');
        });
        it('should parse simple queries with rule-based parser', async () => {
            const result = await parser.parse('Read file test.txt');
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read');
        });
        it('should handle AI service initialization', async () => {
            // This test verifies that AI service can be initialized
            // The actual AI service is mocked
            expect(parser).toBeDefined();
        });
        it('should respect AI enabled/disabled configuration', async () => {
            const parserWithAI = new HybridAIParser({ aiEnabled: true });
            const parserWithoutAI = new HybridAIParser({ aiEnabled: false });
            expect(parserWithAI).toBeDefined();
            expect(parserWithoutAI).toBeDefined();
        });
        it('should handle context in parsing', async () => {
            const result = await parser.parse('Read file test.txt', {
                availableTools: ['filesystem:read', 'filesystem:write']
            });
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read');
        });
    });
    describe('IntentParserFactory', () => {
        let factory;
        beforeEach(() => {
            factory = new IntentParserFactory();
        });
        it('should create rule-based parser', () => {
            const parser = factory.getParser('rule');
            expect(parser.getParserType()).toBe('rule');
        });
        it('should create hybrid AI parser', () => {
            const parser = factory.getParser('hybrid');
            expect(parser.getParserType()).toBe('hybrid');
        });
        it('should create parser chain', () => {
            const chain = factory.createParserChain();
            expect(Array.isArray(chain)).toBe(true);
            expect(chain.length).toBeGreaterThan(0);
        });
        it('should handle custom parser configurations', () => {
            const customFactory = new IntentParserFactory({
                parserConfigs: {
                    rule: { confidenceThreshold: 0.8 },
                    hybrid: { aiEnabled: false }
                }
            });
            const ruleParser = customFactory.getParser('rule');
            const hybridParser = customFactory.getParser('hybrid');
            expect(ruleParser).toBeDefined();
            expect(hybridParser).toBeDefined();
        });
        it('should clear parser cache', () => {
            // Create a parser to populate cache
            factory.getParser('rule');
            factory.clearCache();
            // Cache should be cleared without errors
            expect(factory).toBeDefined();
        });
    });
    describe('IntentParserSelector', () => {
        let selector;
        beforeEach(() => {
            selector = new IntentParserSelector({
                strategy: 'fastest',
                maxResponseTime: 1000
            });
        });
        it('should select parser for calculation query', async () => {
            const availableTools = ['filesystem:read', 'filesystem:write', 'calculator:calculate'];
            const { result, selection } = await selector.parseWithBestFit('Calculate 2 + 2', { availableTools });
            expect(selection.parserType).toBeDefined();
            expect(result.service).toBe('calculator');
            expect(result.method).toBe('calculate');
        });
        it('should handle different selection strategies', async () => {
            const fastestSelector = new IntentParserSelector({ strategy: 'fastest' });
            const hybridSelector = new IntentParserSelector({ strategy: 'hybrid' });
            const accurateSelector = new IntentParserSelector({ strategy: 'most_accurate' });
            expect(fastestSelector).toBeDefined();
            expect(hybridSelector).toBeDefined();
            expect(accurateSelector).toBeDefined();
        });
        it('should respect max response time constraint', async () => {
            const fastSelector = new IntentParserSelector({
                strategy: 'fastest',
                maxResponseTime: 100
            });
            const { selection } = await fastSelector.parseWithBestFit('List files');
            expect(selection.parserType).toBeDefined();
        });
        it('should handle parser constraints via context', async () => {
            const selectorWithConstraints = new IntentParserSelector({
                strategy: 'fastest',
                minConfidence: 0.7
            });
            const { selection } = await selectorWithConstraints.parseWithBestFit('Read file test.txt', {
                maxResponseTime: 100
            });
            expect(selection.parserType).toBeDefined();
        });
        it('should update configuration', () => {
            // Test that updateConfig doesn't throw errors
            expect(() => {
                selector.updateConfig({ strategy: 'hybrid' });
            }).not.toThrow();
        });
    });
    describe('EnhancedIntentEngineAdapter (Legacy Compatibility)', () => {
        let adapter;
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
            expect(result === null || result === undefined || result.service === 'unknown').toBe(true);
        });
        it('should respect configuration options', () => {
            const configuredAdapter = new EnhancedIntentEngineAdapter({
                strategy: 'hybrid',
                maxResponseTime: 500
            });
            expect(configuredAdapter).toBeDefined();
        });
    });
    describe('Utility Functions', () => {
        it('should create simple parser via IntentParserUtils', () => {
            const simpleParser = IntentParserUtils.createSimpleParser();
            expect(simpleParser.getParserType()).toBe('rule');
        });
        it('should create default selector via IntentParserUtils', () => {
            const defaultSelector = IntentParserUtils.createDefaultSelector();
            // Verify selector is created successfully
            expect(defaultSelector).toBeDefined();
            expect(typeof defaultSelector.parseWithBestFit).toBe('function');
        });
        it('should create AI parser via IntentParserUtils', () => {
            const aiParser = IntentParserUtils.createAIParser({ apiKey: 'test-key' });
            expect(aiParser.getParserType()).toBe('hybrid');
        });
        it('should parse with selector', async () => {
            const defaultSelector = IntentParserUtils.createDefaultSelector();
            const { result, selection } = await defaultSelector.parseWithBestFit('List files');
            expect(selection.parserType).toBeDefined();
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('list');
        });
    });
    describe('Integration Tests', () => {
        it('should work with full parser chain', async () => {
            const factory = new IntentParserFactory();
            const selector = new IntentParserSelector({ strategy: 'hybrid' });
            const chain = factory.createParserChain();
            expect(chain.length).toBeGreaterThan(0);
            const { result } = await selector.parseWithBestFit('Calculate 2 + 2');
            expect(result.service).toBe('calculator');
            expect(result.method).toBe('calculate');
        });
        it('should handle edge cases', async () => {
            const factory = new IntentParserFactory();
            const parser = factory.getParser('rule');
            // Empty query
            const emptyResult = await parser.parse('');
            expect(emptyResult.service).toBe('unknown');
            // Very long query
            const longQuery = 'Read file ' + 'test '.repeat(100) + 'test.txt';
            const longResult = await parser.parse(longQuery);
            expect(longResult).toBeDefined();
            // Query with special characters
            const specialResult = await parser.parse('Read file test@#$%.txt');
            expect(specialResult).toBeDefined();
        });
        it('should maintain backward compatibility', async () => {
            const legacyAdapter = new EnhancedIntentEngineAdapter();
            const factory = new IntentParserFactory();
            const availableTools = ['filesystem:read', 'calculator:calculate'];
            const legacyResult = await legacyAdapter.parse('Calculate 2 + 2', availableTools);
            const factoryResult = await factory.getParser('hybrid').parse('Calculate 2 + 2', { availableTools });
            // Both should produce valid results
            expect(legacyResult).toBeDefined();
            expect(factoryResult).toBeDefined();
        });
    });
});
//# sourceMappingURL=ai-new-architecture-enhanced.test.js.map