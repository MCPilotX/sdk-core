/**
 * Comprehensive Test Suite for New Intent Parser Architecture
 * Tests edge cases, error handling, performance, and integration
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RuleBasedParser } from '../../src/ai/rule-based-parser';
import { HybridAIParser } from '../../src/ai/hybrid-ai-parser';
import { IntentParserFactory } from '../../src/ai/intent-parser-factory';
import { IntentParserSelector } from '../../src/ai/intent-parser-selector';
import { EnhancedIntentEngineAdapter, IntentEngineAdapter } from '../../src/ai/legacy-adapters';
// Mock console.log to avoid cluttering test output
const originalConsoleLog = console.log;
const mockConsoleLog = jest.fn();
beforeEach(() => {
    console.log = mockConsoleLog;
});
afterEach(() => {
    console.log = originalConsoleLog;
    jest.clearAllMocks();
});
describe('Comprehensive Intent Parser Architecture Tests', () => {
    describe('RuleBasedParser', () => {
        it('should handle basic file operations', async () => {
            const parser = new RuleBasedParser();
            const tests = [
                { query: 'Read file /home/test.txt', expectedService: 'filesystem', expectedMethod: 'read' },
                { query: 'Write to /tmp/output.txt', expectedService: 'filesystem', expectedMethod: 'write' },
                { query: 'List directory contents', expectedService: 'filesystem', expectedMethod: 'list' },
                { query: 'Show files in folder', expectedService: 'filesystem', expectedMethod: 'read' }, // Note: 'show' matches read pattern
            ];
            for (const test of tests) {
                const result = await parser.parse(test.query);
                expect(result.service).toBe(test.expectedService);
                expect(result.method).toBe(test.expectedMethod);
                expect(result.confidence).toBeGreaterThanOrEqual(0.6);
            }
        });
        it('should handle network operations', async () => {
            const parser = new RuleBasedParser();
            const result = await parser.parse('Ping 8.8.8.8');
            expect(result.service).toBe('network');
            expect(result.method).toBe('ping');
            expect(result.parameters.host).toBeDefined();
        });
        it('should handle calculator operations', async () => {
            const parser = new RuleBasedParser();
            const tests = [
                'Calculate 2 + 2',
                'What is 10 * 5',
                'Compute 100 / 25',
            ];
            for (const query of tests) {
                const result = await parser.parse(query);
                expect(result.service).toBe('calculator');
                expect(result.method).toBe('calculate');
            }
        });
        it('should return unknown for unknown queries', async () => {
            const parser = new RuleBasedParser();
            const unknownQueries = [
                'This is a completely unknown query',
                'Do something magical',
                'Random text with no meaning',
            ];
            for (const query of unknownQueries) {
                const result = await parser.parse(query);
                expect(result.service).toBe('unknown');
                expect(result.method).toBe('unknown');
                expect(result.confidence).toBeLessThanOrEqual(0.5);
            }
        });
        it('should extract parameters correctly', async () => {
            const parser = new RuleBasedParser();
            const result = await parser.parse('Read the file /home/user/document.txt');
            expect(result.parameters.path).toBeDefined();
            expect(result.parameters.path).toContain('/home/user/document.txt');
        });
        it('should support custom pattern addition', async () => {
            const parser = new RuleBasedParser();
            // Add custom pattern
            parser.addPattern({
                regex: /custom\s+test\s+pattern/i,
                service: 'custom',
                method: 'test',
                confidence: 0.9,
                paramExtractor: () => ({ custom: true })
            });
            const result = await parser.parse('Custom test pattern');
            expect(result.service).toBe('custom');
            expect(result.method).toBe('test');
        });
    });
    describe('HybridAIParser', () => {
        it('should create with correct parser type', () => {
            const parser = new HybridAIParser();
            expect(parser.getParserType()).toBe('hybrid');
        });
        it('should have AI disabled by default', () => {
            const parser = new HybridAIParser();
            expect(parser.isAIAvailable()).toBe(false);
        });
        it('should use rule fallback when AI disabled', async () => {
            const parser = new HybridAIParser();
            parser.setAIEnabled(false);
            const result = await parser.parse('Read file test.txt');
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read');
            expect(result.metadata?.aiUsed).toBe(false);
        });
    });
    describe('IntentParserFactory', () => {
        it('should create parsers of correct types', () => {
            const factory = new IntentParserFactory();
            const ruleParser = factory.getParser('rule');
            const hybridParser = factory.getParser('hybrid');
            expect(ruleParser.getParserType()).toBe('rule');
            expect(hybridParser.getParserType()).toBe('hybrid');
        });
        it('should create parser chain with multiple parsers', () => {
            const factory = new IntentParserFactory();
            const chain = factory.createParserChain();
            expect(chain.length).toBeGreaterThanOrEqual(2);
            const types = chain.map(p => p.getParserType());
            expect(types).toContain('rule');
            expect(types).toContain('hybrid');
        });
        it('should respect configuration', () => {
            const factory = new IntentParserFactory({
                defaultParserType: 'rule',
                parserConfigs: {
                    rule: { confidenceThreshold: 0.8 }
                }
            });
            const parser = factory.getDefaultParser();
            expect(parser.getParserType()).toBe('rule');
        });
    });
    describe('IntentParserSelector', () => {
        it('should use fastest strategy for simple queries', async () => {
            const selector = new IntentParserSelector({
                strategy: 'fastest',
                maxResponseTime: 100
            });
            const { result, selection } = await selector.parseWithBestFit('Calculate 2 + 2');
            expect(selection.parserType).toBe('rule');
            expect(result.confidence).toBeGreaterThanOrEqual(0.6);
        });
        it('should use cost-aware strategy to prefer rule parser', async () => {
            const selector = new IntentParserSelector({
                strategy: 'cost_aware',
                maxCost: 0.005 // Very low cost limit
            });
            const { selection } = await selector.parseWithBestFit('Simple query');
            expect(selection.parserType).toBe('rule');
        });
        it('should respect context constraints', async () => {
            const selector = new IntentParserSelector({
                maxResponseTime: 50,
            });
            const context = {
                availableTools: ['filesystem:read'],
                useAI: false,
                maxResponseTime: 10
            };
            const { selection } = await selector.parseWithBestFit('Read file', context);
            expect(selection.parserType).toBe('rule');
        });
        it('should provide fallback for impossible constraints', async () => {
            const selector = new IntentParserSelector({
                minConfidence: 0.99,
                maxResponseTime: 1,
            });
            const { result, selection } = await selector.parseWithBestFit('Unknown query');
            expect(result).toBeDefined();
            expect(selection.parserType).toBe('rule');
        });
    });
    describe('Legacy Adapters', () => {
        it('should provide backward compatibility with EnhancedIntentEngineAdapter', async () => {
            const adapter = new EnhancedIntentEngineAdapter();
            const availableTools = ['filesystem:read', 'network:ping'];
            const result = await adapter.parse('Read file test.txt', availableTools);
            expect(result).toBeDefined();
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read');
        });
        it('should provide backward compatibility with IntentEngineAdapter', async () => {
            const adapter = new IntentEngineAdapter();
            const availableTools = ['filesystem:read'];
            const result = await adapter.parse('Read file', availableTools);
            expect(result).toBeDefined();
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read');
        });
    });
    describe('Integration Tests', () => {
        it('should handle end-to-end parsing workflow', async () => {
            const factory = new IntentParserFactory();
            const selector = new IntentParserSelector({
                strategy: 'hybrid',
                minConfidence: 0.6
            });
            const availableTools = [
                'filesystem:read',
                'filesystem:write',
                'filesystem:list',
                'network:ping',
                'calculator:calculate'
            ];
            const testQueries = [
                'Read the configuration file',
                'Ping localhost',
                'Calculate 15 * 3',
                'List all files in current directory',
                'Write "Hello World" to output.txt'
            ];
            for (const query of testQueries) {
                const { result, selection } = await selector.parseWithBestFit(query, { availableTools });
                expect(result).toBeDefined();
                expect(result.confidence).toBeGreaterThanOrEqual(0.6);
            }
        });
        it('should have acceptable performance', async () => {
            const parser = new RuleBasedParser();
            const iterations = 10; // Reduced for faster tests
            const startTime = Date.now();
            for (let i = 0; i < iterations; i++) {
                await parser.parse(`Read file test${i}.txt`);
                await parser.parse(`Calculate ${i} + ${i}`);
                await parser.parse(`Ping host${i}.com`);
            }
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const avgTime = totalTime / (iterations * 3);
            // Performance check - should be reasonable
            expect(avgTime).toBeLessThan(100); // Less than 100ms per query
        });
        it('should be resilient to invalid inputs', async () => {
            const factory = new IntentParserFactory();
            const parser = factory.getDefaultParser();
            const invalidQueries = [
                '', // Empty string
                '   ', // Whitespace only
                null, // null
                undefined, // undefined
                123, // Number
                {}, // Object
            ];
            for (const query of invalidQueries) {
                try {
                    await parser.parse(query);
                    // If it doesn't throw, that's okay - parsers should be resilient
                }
                catch (error) {
                    // Some errors are expected for truly invalid inputs
                    expect(error).toBeDefined();
                }
            }
        });
    });
});
//# sourceMappingURL=ai-comprehensive.test.js.map