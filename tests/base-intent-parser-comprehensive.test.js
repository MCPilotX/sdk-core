import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BaseIntentParser } from '../src/ai/base-intent-parser';
import { logger } from '../src/core/logger';
// Mock logger
jest.mock('../src/core/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
    },
}));
// Create a concrete implementation for testing
class TestIntentParser extends BaseIntentParser {
    getParserType() {
        return 'rule';
    }
    async parse(query, context) {
        // Simple implementation for testing
        return {
            service: 'test',
            method: 'execute',
            parameters: { query },
            confidence: 0.8,
            parserType: 'rule',
        };
    }
}
describe('BaseIntentParser - Comprehensive Tests', () => {
    let parser;
    beforeEach(() => {
        jest.clearAllMocks();
        parser = new TestIntentParser({
            confidenceThreshold: 0.5,
            useAI: true,
        });
    });
    describe('updateConfig', () => {
        it('should update parser configuration', () => {
            const initialConfig = { ...parser['config'] };
            parser.updateConfig({
                confidenceThreshold: 0.8,
                useAI: false,
            });
            expect(parser['config'].confidenceThreshold).toBe(0.8);
            expect(parser['config'].useAI).toBe(false);
            // Verify logger was called
            expect(logger.debug).toHaveBeenCalledWith('[TestIntentParser] Configuration updated');
        });
        it('should merge configuration partially', () => {
            parser.updateConfig({
                confidenceThreshold: 0.9,
            });
            expect(parser['config'].confidenceThreshold).toBe(0.9);
            expect(parser['config'].useAI).toBe(true); // Should remain unchanged
        });
    });
    describe('validateResult', () => {
        it('should validate result with sufficient confidence', () => {
            const result = { confidence: 0.8 };
            const isValid = parser['validateResult'](result);
            expect(isValid).toBe(true);
        });
        it('should reject result with insufficient confidence', () => {
            // Set threshold to 0.9
            parser.updateConfig({ confidenceThreshold: 0.9 });
            const result = { confidence: 0.8 };
            const isValid = parser['validateResult'](result);
            expect(isValid).toBe(false);
        });
        it('should handle exact threshold', () => {
            parser.updateConfig({ confidenceThreshold: 0.5 });
            const result = { confidence: 0.5 };
            const isValid = parser['validateResult'](result);
            expect(isValid).toBe(true);
        });
    });
    describe('getConfidenceThreshold', () => {
        it('should return configured threshold', () => {
            parser.updateConfig({ confidenceThreshold: 0.7 });
            const threshold = parser['getConfidenceThreshold']();
            expect(threshold).toBe(0.7);
        });
        it('should return default threshold when not configured', () => {
            const threshold = parser['getConfidenceThreshold']();
            expect(threshold).toBe(0.5); // Default from constructor
        });
    });
    describe('isWithinTimeLimit', () => {
        it('should return true when no time limit in context', () => {
            const isWithin = parser['isWithinTimeLimit'](100);
            expect(isWithin).toBe(true);
        });
        it('should return true when within time limit', () => {
            const context = { maxResponseTime: 200 };
            const isWithin = parser['isWithinTimeLimit'](100, context);
            expect(isWithin).toBe(true);
        });
        it('should return false when exceeding time limit', () => {
            const context = { maxResponseTime: 50 };
            const isWithin = parser['isWithinTimeLimit'](100, context);
            expect(isWithin).toBe(false);
        });
        it('should handle exact time limit', () => {
            const context = { maxResponseTime: 100 };
            const isWithin = parser['isWithinTimeLimit'](100, context);
            expect(isWithin).toBe(true);
        });
    });
    describe('getAvailableTools', () => {
        it('should return empty array when no context', () => {
            const tools = parser['getAvailableTools']();
            expect(tools).toEqual([]);
        });
        it('should return empty array when context has no availableTools', () => {
            const context = { maxResponseTime: 100 };
            const tools = parser['getAvailableTools'](context);
            expect(tools).toEqual([]);
        });
        it('should return available tools from context', () => {
            const context = { availableTools: ['tool1', 'tool2'] };
            const tools = parser['getAvailableTools'](context);
            expect(tools).toEqual(['tool1', 'tool2']);
        });
    });
    describe('shouldUseAI', () => {
        it('should return true when no context provided', () => {
            const shouldUse = parser['shouldUseAI']();
            expect(shouldUse).toBe(true);
        });
        it('should return true when context.useAI is true', () => {
            const context = { useAI: true };
            const shouldUse = parser['shouldUseAI'](context);
            expect(shouldUse).toBe(true);
        });
        it('should return false when context.useAI is false', () => {
            const context = { useAI: false };
            const shouldUse = parser['shouldUseAI'](context);
            expect(shouldUse).toBe(false);
        });
        it('should return true when context has no useAI property', () => {
            const context = { maxResponseTime: 100 };
            const shouldUse = parser['shouldUseAI'](context);
            expect(shouldUse).toBe(true);
        });
    });
    describe('createFallbackResult', () => {
        it('should create fallback result with low confidence', () => {
            const query = 'test query';
            const result = parser['createFallbackResult'](query);
            expect(result).toEqual({
                service: 'unknown',
                method: 'unknown',
                parameters: { query: 'test query' },
                confidence: 0.1,
                parserType: 'rule',
                error: 'No matching intent found'
            });
        });
    });
    describe('parse method', () => {
        it('should parse query successfully', async () => {
            const result = await parser.parse('test query');
            expect(result).toEqual({
                service: 'test',
                method: 'execute',
                parameters: { query: 'test query' },
                confidence: 0.8,
                parserType: 'rule',
            });
        });
        it('should handle errors in parse method', async () => {
            // Create a parser that returns error result
            class ErrorParser extends BaseIntentParser {
                getParserType() {
                    return 'rule';
                }
                async parse(query, context) {
                    return {
                        service: 'unknown',
                        method: 'unknown',
                        parameters: { query },
                        confidence: 0.1,
                        parserType: 'rule',
                        error: 'Parse error'
                    };
                }
            }
            const errorParser = new ErrorParser();
            const result = await errorParser.parse('test query');
            // Should return error result
            expect(result.service).toBe('unknown');
            expect(result.method).toBe('unknown');
            expect(result.confidence).toBe(0.1);
            expect(result.error).toBe('Parse error');
        });
    });
});
//# sourceMappingURL=base-intent-parser-comprehensive.test.js.map