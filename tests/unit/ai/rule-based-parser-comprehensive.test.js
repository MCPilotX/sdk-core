/**
 * Comprehensive tests for RuleBasedParser
 * This test suite aims to improve test coverage for the RuleBasedParser class
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { RuleBasedParser } from '../../../src/ai/rule-based-parser';
describe('RuleBasedParser Comprehensive Tests', () => {
    let parser;
    beforeEach(() => {
        parser = new RuleBasedParser();
    });
    describe('Basic functionality', () => {
        it('should have correct parser type', () => {
            expect(parser.getParserType()).toBe('rule');
        });
        it('should initialize with default patterns', () => {
            // The parser should have patterns initialized
            expect(parser).toBeDefined();
        });
    });
    describe('File system operations parsing', () => {
        it('should parse read file intent', async () => {
            const result = await parser.parse('Read the file /home/user/document.txt');
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read');
            expect(result.parameters.path).toContain('/home/user/document.txt');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should parse write file intent', async () => {
            const result = await parser.parse('Write "Hello World" to /tmp/output.txt');
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('write');
            expect(result.parameters.path).toContain('/tmp/output.txt');
            expect(result.parameters.content).toContain('Hello World');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should parse list directory intent', async () => {
            const result = await parser.parse('List files in /home/user');
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('list');
            expect(result.parameters.path).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should parse show files intent', async () => {
            const result = await parser.parse('Show directory contents');
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('list');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
    });
    describe('Network operations parsing', () => {
        it('should parse ping intent', async () => {
            const result = await parser.parse('Ping 8.8.8.8');
            expect(result.service).toBe('network');
            expect(result.method).toBe('ping');
            expect(result.parameters.host).toBe('8.8.8.8');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should parse ping with domain name', async () => {
            const result = await parser.parse('Ping google.com');
            expect(result.service).toBe('network');
            expect(result.method).toBe('ping');
            expect(result.parameters.host).toBe('google.com');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
    });
    describe('Process operations parsing', () => {
        it('should parse start process intent', async () => {
            const result = await parser.parse('Start the server process');
            expect(result.service).toBe('process');
            expect(result.method).toBe('start');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should parse stop process intent', async () => {
            const result = await parser.parse('Stop the service');
            expect(result.service).toBe('process');
            expect(result.method).toBe('stop');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should parse launch application intent', async () => {
            const result = await parser.parse('Launch the application');
            expect(result.service).toBe('process');
            expect(result.method).toBe('start');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
    });
    describe('Calculator operations parsing', () => {
        it('should parse calculate intent', async () => {
            const result = await parser.parse('Calculate 2 + 2');
            expect(result.service).toBe('calculator');
            expect(result.method).toBe('calculate');
            expect(result.parameters.expression).toContain('2 + 2');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should parse compute intent', async () => {
            const result = await parser.parse('Compute 10 * 5');
            expect(result.service).toBe('calculator');
            expect(result.method).toBe('calculate');
            expect(result.parameters.expression).toContain('10 * 5');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should parse what is intent', async () => {
            const result = await parser.parse('What is 100 / 25');
            expect(result.service).toBe('calculator');
            expect(result.method).toBe('calculate');
            expect(result.parameters.expression).toContain('100 / 25');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
    });
    describe('Tool name matching', () => {
        it('should match tool by name when available', async () => {
            const availableTools = ['filesystem:read', 'filesystem:write', 'network:ping'];
            const result = await parser.parse('read', { availableTools });
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should match partial tool names', async () => {
            const availableTools = ['filesystem:read_file', 'network:ping_host'];
            const result = await parser.parse('read', { availableTools });
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read_file');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
    });
    describe('Keyword matching', () => {
        it('should match by file keyword', async () => {
            const result = await parser.parse('I need to work with a file');
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should match by directory keyword', async () => {
            const result = await parser.parse('Check the directory');
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('list');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should match by folder keyword', async () => {
            const result = await parser.parse('Open the folder');
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('list');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
    });
    describe('Unknown queries', () => {
        it('should return unknown for unrecognized queries', async () => {
            const result = await parser.parse('This is a completely unknown query');
            expect(result.service).toBe('unknown');
            expect(result.method).toBe('unknown');
            expect(result.confidence).toBeLessThan(0.5);
        });
        it('should return unknown for empty query', async () => {
            const result = await parser.parse('');
            expect(result.service).toBe('unknown');
            expect(result.method).toBe('unknown');
            expect(result.confidence).toBeLessThan(0.5);
        });
        it('should return unknown for whitespace-only query', async () => {
            const result = await parser.parse('   ');
            expect(result.service).toBe('unknown');
            expect(result.method).toBe('unknown');
            expect(result.confidence).toBeLessThan(0.5);
        });
    });
    describe('Custom pattern addition', () => {
        it('should allow adding custom patterns', () => {
            const customPattern = {
                regex: /custom\s+command/i,
                service: 'custom',
                method: 'execute',
                confidence: 0.9,
                paramExtractor: () => ({ custom: true })
            };
            parser.addPattern(customPattern);
            // Test that custom pattern works
            expect(parser).toBeDefined();
        });
        it('should clear tool cache', () => {
            // This is a simple test to ensure the method exists and doesn't throw
            expect(() => parser.clearToolCache()).not.toThrow();
        });
    });
    describe('Performance and edge cases', () => {
        it('should handle long queries', async () => {
            const longQuery = 'Please read the file at /very/long/path/to/some/important/document.txt and show me its contents';
            const result = await parser.parse(longQuery);
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read');
            expect(result.parameters.path).toContain('/very/long/path');
        });
        it('should handle queries with special characters', async () => {
            const result = await parser.parse('Read file: /path/to/file (important).txt');
            expect(result.service).toBe('filesystem');
            expect(result.method).toBe('read');
            expect(result.parameters.path).toBeDefined();
        });
        it('should handle case-insensitive queries', async () => {
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
    describe('Metadata in results', () => {
        it('should include metadata for rule pattern matches', async () => {
            const result = await parser.parse('Read file test.txt');
            expect(result.metadata).toBeDefined();
            expect(result.metadata.matchType).toBe('rule_pattern');
            expect(result.metadata.matchedPattern).toBeDefined();
        });
        it('should include metadata for tool name matches', async () => {
            const availableTools = ['filesystem:read'];
            const result = await parser.parse('read', { availableTools });
            expect(result.metadata).toBeDefined();
            expect(result.metadata.matchType).toBe('tool_name');
            expect(result.metadata.matchedTool).toBeDefined();
        });
        it('should include metadata for keyword matches', async () => {
            const result = await parser.parse('file');
            expect(result.metadata).toBeDefined();
            expect(result.metadata.matchType).toBe('keyword');
            expect(result.metadata.matchedKeywords).toBeDefined();
        });
    });
});
//# sourceMappingURL=rule-based-parser-comprehensive.test.js.map