/**
 * Tests for exports in intent-parser-index.ts
 * This test focuses on verifying all exports are correctly available
 */
import { describe, it, expect } from '@jest/globals';
import * as IntentParserIndex from '../../../src/ai/intent-parser-index';
describe('IntentParserIndex Exports', () => {
    it('should export IntentParserUtils class', () => {
        expect(IntentParserIndex.IntentParserUtils).toBeDefined();
        expect(typeof IntentParserIndex.IntentParserUtils).toBe('function');
        expect(IntentParserIndex.IntentParserUtils.createDefaultSelector).toBeDefined();
        expect(IntentParserIndex.IntentParserUtils.createSimpleParser).toBeDefined();
        expect(IntentParserIndex.IntentParserUtils.createAIParser).toBeDefined();
        expect(IntentParserIndex.IntentParserUtils.parseQuery).toBeDefined();
    });
    it('should export IntentParserExamples array', () => {
        expect(IntentParserIndex.IntentParserExamples).toBeDefined();
        expect(Array.isArray(IntentParserIndex.IntentParserExamples)).toBe(true);
        expect(IntentParserIndex.IntentParserExamples.length).toBeGreaterThan(0);
    });
    it('should export BaseIntentParser', () => {
        expect(IntentParserIndex.BaseIntentParser).toBeDefined();
        expect(typeof IntentParserIndex.BaseIntentParser).toBe('function');
    });
    it('should export RuleBasedParser', () => {
        expect(IntentParserIndex.RuleBasedParser).toBeDefined();
        expect(typeof IntentParserIndex.RuleBasedParser).toBe('function');
    });
    it('should export HybridAIParser', () => {
        expect(IntentParserIndex.HybridAIParser).toBeDefined();
        expect(typeof IntentParserIndex.HybridAIParser).toBe('function');
    });
    it('should export IntentParserFactory', () => {
        expect(IntentParserIndex.IntentParserFactory).toBeDefined();
        expect(typeof IntentParserIndex.IntentParserFactory).toBe('function');
    });
    it('should export IntentParserSelector', () => {
        expect(IntentParserIndex.IntentParserSelector).toBeDefined();
        expect(typeof IntentParserIndex.IntentParserSelector).toBe('function');
    });
    it('should have all expected type exports', () => {
        // Type exports are compile-time only, but we can verify the module structure
        const exports = Object.keys(IntentParserIndex);
        // Check for key exports
        expect(exports).toContain('IntentParserUtils');
        expect(exports).toContain('IntentParserExamples');
        expect(exports).toContain('BaseIntentParser');
        expect(exports).toContain('RuleBasedParser');
        expect(exports).toContain('HybridAIParser');
        expect(exports).toContain('IntentParserFactory');
        expect(exports).toContain('IntentParserSelector');
        // Should have a reasonable number of exports (at least the 7 we checked)
        expect(exports.length).toBeGreaterThanOrEqual(7);
    });
    it('should allow instantiation of exported classes', () => {
        // Test that we can create instances
        const selector = new IntentParserIndex.IntentParserSelector();
        expect(selector).toBeDefined();
        expect(typeof selector.parseWithBestFit).toBe('function');
        const ruleParser = new IntentParserIndex.RuleBasedParser();
        expect(ruleParser).toBeDefined();
        expect(typeof ruleParser.parse).toBe('function');
        const hybridParser = new IntentParserIndex.HybridAIParser();
        expect(hybridParser).toBeDefined();
        expect(typeof hybridParser.parse).toBe('function');
    });
    it('should use IntentParserUtils static methods', () => {
        const selector = IntentParserIndex.IntentParserUtils.createDefaultSelector();
        expect(selector).toBeDefined();
        expect(selector).toBeInstanceOf(IntentParserIndex.IntentParserSelector);
        const simpleParser = IntentParserIndex.IntentParserUtils.createSimpleParser();
        expect(simpleParser).toBeDefined();
        expect(simpleParser).toBeInstanceOf(IntentParserIndex.RuleBasedParser);
        const aiParser = IntentParserIndex.IntentParserUtils.createAIParser();
        expect(aiParser).toBeDefined();
        expect(aiParser).toBeInstanceOf(IntentParserIndex.HybridAIParser);
    });
    it('should have working examples array', () => {
        const examples = IntentParserIndex.IntentParserExamples;
        // Verify structure
        expect(Array.isArray(examples)).toBe(true);
        expect(examples.length).toBeGreaterThan(0);
        // Verify content
        examples.forEach(example => {
            expect(typeof example).toBe('string');
            expect(example.length).toBeGreaterThan(0);
        });
        // Check for specific examples
        const exampleStrings = examples.map(e => e.toLowerCase());
        expect(exampleStrings.some(e => e.includes('file'))).toBe(true);
        expect(exampleStrings.some(e => e.includes('list'))).toBe(true);
        expect(exampleStrings.some(e => e.includes('ping'))).toBe(true);
    });
});
describe('Re-exported types verification', () => {
    // These tests verify that types are properly re-exported
    // Since types are compile-time only, we test that the modules can be imported
    it('should allow importing of re-exported types', async () => {
        // This is a compile-time test, but we can verify the imports work
        // by checking that the modules can be loaded without errors
        expect(() => {
            // Try to use some of the re-exported constructs
            const testSelector = new IntentParserIndex.IntentParserSelector();
            const testResult = testSelector.parseWithBestFit;
            expect(typeof testResult).toBe('function');
        }).not.toThrow();
    });
    it('should maintain backward compatibility for imports', () => {
        // Verify that all key classes are exported
        const exports = Object.keys(IntentParserIndex);
        // Core classes
        expect(exports).toContain('BaseIntentParser');
        expect(exports).toContain('RuleBasedParser');
        expect(exports).toContain('HybridAIParser');
        expect(exports).toContain('IntentParserFactory');
        expect(exports).toContain('IntentParserSelector');
        // Utilities
        expect(exports).toContain('IntentParserUtils');
        expect(exports).toContain('IntentParserExamples');
    });
});
//# sourceMappingURL=intent-parser-index-exports.test.js.map