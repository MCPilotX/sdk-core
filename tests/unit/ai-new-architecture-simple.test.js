/**
 * Simple tests for the new intent parser architecture
 * Focus on core functionality without complex mocks
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { RuleBasedParser } from '../../src/ai/rule-based-parser';
import { IntentParserFactory } from '../../src/ai/intent-parser-factory';
import { IntentParserSelector } from '../../src/ai/intent-parser-selector';
import { EnhancedIntentEngineAdapter } from '../../src/ai/legacy-adapters';
describe('New Intent Parser Architecture - Core Tests', () => {
    describe('RuleBasedParser', () => {
        let parser;
        beforeEach(() => {
            parser = new RuleBasedParser();
        });
        it('should parse basic queries correctly', async () => {
            const testCases = [
                { query: 'Read the file /home/user/test.txt', expectedService: 'filesystem', expectedMethod: 'read' },
                { query: 'Ping google.com', expectedService: 'network', expectedMethod: 'ping' },
                { query: 'Calculate 2 + 2', expectedService: 'calculator', expectedMethod: 'calculate' },
                { query: 'List files in directory', expectedService: 'filesystem', expectedMethod: 'list' },
            ];
            for (const testCase of testCases) {
                const result = await parser.parse(testCase.query);
                expect(result.service).toBe(testCase.expectedService);
                expect(result.method).toBe(testCase.expectedMethod);
                expect(result.confidence).toBeGreaterThan(0.5);
            }
        });
        it('should handle unknown queries', async () => {
            const result = await parser.parse('Unknown query that should fail');
            expect(result.service).toBe('unknown');
            expect(result.confidence).toBeLessThan(0.5);
        });
        it('should respect configuration', () => {
            const configuredParser = new RuleBasedParser({ confidenceThreshold: 0.8 });
            expect(configuredParser).toBeDefined();
        });
    });
    describe('IntentParserFactory', () => {
        let factory;
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
        it('should handle custom configurations', () => {
            const customFactory = new IntentParserFactory({
                parserConfigs: {
                    rule: { confidenceThreshold: 0.8 }
                }
            });
            const parser = customFactory.getParser('rule');
            expect(parser).toBeDefined();
        });
    });
    describe('IntentParserSelector', () => {
        it('should create selector with different strategies', () => {
            const fastestSelector = new IntentParserSelector({ strategy: 'fastest' });
            const hybridSelector = new IntentParserSelector({ strategy: 'hybrid' });
            const accurateSelector = new IntentParserSelector({ strategy: 'most_accurate' });
            expect(fastestSelector).toBeDefined();
            expect(hybridSelector).toBeDefined();
            expect(accurateSelector).toBeDefined();
        });
        it('should parse queries with selector', async () => {
            const selector = new IntentParserSelector({ strategy: 'fastest' });
            const { result, selection } = await selector.parseWithBestFit('Calculate 2 + 2');
            expect(selection.parserType).toBeDefined();
            expect(result.service).toBe('calculator');
            expect(result.method).toBe('calculate');
        });
        it('should handle context in parsing', async () => {
            const selector = new IntentParserSelector({ strategy: 'fastest' });
            const { result } = await selector.parseWithBestFit('Read file test.txt', {
                availableTools: ['filesystem:read', 'filesystem:write']
            });
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read');
        });
    });
    describe('EnhancedIntentEngineAdapter', () => {
        it('should parse queries with legacy adapter', async () => {
            const adapter = new EnhancedIntentEngineAdapter();
            const result = await adapter.parse('Read file test.txt', ['filesystem:read']);
            expect(result).toBeDefined();
            if (result) {
                expect(result.service).toBe('filesystem');
                expect(result.method).toBe('read');
            }
        });
        it('should handle configuration', () => {
            const configuredAdapter = new EnhancedIntentEngineAdapter({
                strategy: 'hybrid',
                maxResponseTime: 500
            });
            expect(configuredAdapter).toBeDefined();
        });
    });
    describe('Integration Tests', () => {
        it('should work with factory and selector together', async () => {
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
            // Query with special characters
            const specialResult = await parser.parse('Read file test@#$%.txt');
            expect(specialResult).toBeDefined();
        });
    });
});
//# sourceMappingURL=ai-new-architecture-simple.test.js.map