import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CloudIntentEngine } from '../src/ai/cloud-intent-engine';
// Mock AI module with proper typing
const mockAI = {
    configure: jest.fn().mockResolvedValue(undefined),
    callRawAPI: jest.fn().mockResolvedValue({ choices: [{ message: { content: '{}' } }] }),
};
jest.mock('../src/ai/ai', () => ({
    AI: jest.fn(() => mockAI),
    AIError: class AIError extends Error {
    },
}));
// Mock logger
jest.mock('../src/core/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
    },
}));
describe('CloudIntentEngine', () => {
    let engine;
    beforeEach(() => {
        jest.clearAllMocks();
        engine = new CloudIntentEngine({
            llm: {
                provider: 'openai',
                apiKey: 'test-key',
            },
            execution: {},
            fallback: {},
        });
    });
    describe('constructor', () => {
        it('should create CloudIntentEngine instance', () => {
            expect(engine).toBeInstanceOf(CloudIntentEngine);
            // Verify AI was created
            const { AI } = require('../src/ai/ai');
            expect(AI).toHaveBeenCalled();
        });
    });
    describe('parseIntent', () => {
        it('should parse simple intent', async () => {
            // Mock AI response for intent parsing
            const aiInstance = engine.ai;
            aiInstance.callRawAPI.mockResolvedValue({
                choices: [{ message: { content: JSON.stringify({
                                intents: [
                                    { id: 'A1', type: 'search', description: 'Search for information', parameters: { query: 'test' } }
                                ],
                                edges: []
                            }) } }]
            });
            const result = await engine.parseIntent('Search for test information');
            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].id).toBe('A1');
            expect(result.intents[0].type).toBe('search');
            expect(result.edges).toHaveLength(0);
        });
        it('should parse intent with dependencies', async () => {
            const aiInstance = engine.ai;
            aiInstance.callRawAPI.mockResolvedValue({
                choices: [{ message: { content: JSON.stringify({
                                intents: [
                                    { id: 'A1', type: 'search', description: 'Search first', parameters: { query: 'first' } },
                                    { id: 'A2', type: 'process', description: 'Process results', parameters: { data: 'results' } }
                                ],
                                edges: [{ from: 'A1', to: 'A2' }]
                            }) } }]
            });
            const result = await engine.parseIntent('Search and process');
            expect(result.intents).toHaveLength(2);
            expect(result.edges).toHaveLength(1);
            expect(result.edges[0]).toEqual({ from: 'A1', to: 'A2' });
        });
        it('should handle parse errors with fallback', async () => {
            const aiInstance = engine.ai;
            aiInstance.callRawAPI.mockRejectedValue(new Error('Parse failed'));
            // Should use fallback parsing instead of throwing
            const result = await engine.parseIntent('test');
            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].type).toBe('process');
            expect(result.intents[0].description).toContain('Process query');
        });
        it('should handle invalid JSON response with fallback', async () => {
            const aiInstance = engine.ai;
            aiInstance.callRawAPI.mockResolvedValue({
                choices: [{ message: { content: 'Invalid JSON' } }]
            });
            // Should use fallback parsing instead of throwing
            const result = await engine.parseIntent('test');
            expect(result.intents).toHaveLength(1);
            expect(result.intents[0].type).toBe('process');
            expect(result.intents[0].description).toContain('Process query');
        });
    });
    describe('selectTools', () => {
        it('should select tools for intents', async () => {
            const intents = [
                { id: 'A1', type: 'search', description: 'Search', parameters: { query: 'test' } }
            ];
            // Set available tools first
            const tools = [
                {
                    name: 'search_tool',
                    description: 'Search tool',
                    inputSchema: { type: 'object', properties: { query: { type: 'string' } } }
                }
            ];
            engine.setAvailableTools(tools);
            const aiInstance = engine.ai;
            aiInstance.callRawAPI.mockResolvedValue({
                choices: [{ message: { content: JSON.stringify({
                                tool_name: 'search_tool',
                                arguments: { query: 'test' },
                                confidence: 0.9
                            }) } }]
            });
            const result = await engine.selectTools(intents);
            expect(result).toHaveLength(1);
            expect(result[0].intentId).toBe('A1');
            expect(result[0].toolName).toBe('search_tool');
            expect(result[0].mappedParameters).toEqual({ query: 'test' });
        });
        it('should handle no matching tools', async () => {
            const intents = [
                { id: 'A1', type: 'unknown', description: 'Unknown intent', parameters: {} }
            ];
            // Set empty tools list
            engine.setAvailableTools([]);
            const result = await engine.selectTools(intents);
            expect(result).toHaveLength(1);
            expect(result[0].toolName).toBe('unknown');
            expect(result[0].confidence).toBe(0);
        });
    });
    describe('executeWorkflow', () => {
        it('should execute workflow in dependency order', async () => {
            const intents = [
                { id: 'A1', type: 'search', description: 'Search', parameters: { query: 'test' } },
                { id: 'A2', type: 'process', description: 'Process', parameters: { data: 'result' } }
            ];
            const edges = [{ from: 'A1', to: 'A2' }];
            const toolSelections = [
                { intentId: 'A1', toolName: 'search_tool', mappedParameters: { query: 'test' }, confidence: 0.9, toolDescription: 'Search tool' },
                { intentId: 'A2', toolName: 'process_tool', mappedParameters: { data: 'result' }, confidence: 0.8, toolDescription: 'Process tool' }
            ];
            const mockToolExecutor = jest.fn()
                .mockResolvedValueOnce({ result: 'search result' })
                .mockResolvedValueOnce({ result: 'process result' });
            const result = await engine.executeWorkflow(intents, toolSelections, edges, mockToolExecutor);
            expect(result.success).toBe(true);
            expect(result.stepResults).toHaveLength(2);
            expect(mockToolExecutor).toHaveBeenCalledTimes(2);
            expect(mockToolExecutor.mock.calls[0][0]).toBe('search_tool');
            expect(mockToolExecutor.mock.calls[1][0]).toBe('process_tool');
        });
        it('should handle execution errors', async () => {
            const intents = [
                { id: 'A1', type: 'search', description: 'Search', parameters: { query: 'test' } }
            ];
            const edges = [];
            const toolSelections = [
                { intentId: 'A1', toolName: 'search_tool', mappedParameters: { query: 'test' }, confidence: 0.9, toolDescription: 'Search tool' }
            ];
            const mockToolExecutor = jest.fn()
                .mockRejectedValue(new Error('Tool failed'));
            const result = await engine.executeWorkflow(intents, toolSelections, edges, mockToolExecutor);
            expect(result.success).toBe(false);
            expect(result.stepResults).toHaveLength(1);
            expect(result.stepResults[0].success).toBe(false);
            expect(result.stepResults[0].error).toBe('Tool failed');
        });
    });
    describe('parseAndPlan', () => {
        it('should parse and plan workflow', async () => {
            // Mock parseIntent
            const parseIntentSpy = jest.spyOn(engine, 'parseIntent').mockResolvedValue({
                intents: [
                    { id: 'A1', type: 'search', description: 'Search', parameters: { query: 'test' } }
                ],
                edges: []
            });
            // Mock selectTools
            const selectToolsSpy = jest.spyOn(engine, 'selectTools').mockResolvedValue([
                { intentId: 'A1', toolName: 'search_tool', mappedParameters: { query: 'test' }, confidence: 0.9, toolDescription: 'Search tool' }
            ]);
            const plan = await engine.parseAndPlan('Search for test');
            expect(plan).toBeDefined();
            expect(plan.query).toBe('Search for test');
            expect(plan.parsedIntents).toHaveLength(1);
            expect(plan.toolSelections).toHaveLength(1);
            expect(parseIntentSpy).toHaveBeenCalledWith('Search for test');
            expect(selectToolsSpy).toHaveBeenCalled();
        });
    });
    describe('utility methods', () => {
        describe('buildDependencyGraph', () => {
            it('should build dependency graph', () => {
                const intents = [
                    { id: 'A1', type: 'search', description: 'Search', parameters: {} },
                    { id: 'A2', type: 'process', description: 'Process', parameters: {} }
                ];
                const edges = [{ from: 'A1', to: 'A2' }];
                const graph = engine.buildDependencyGraph(intents, edges);
                expect(graph).toBeDefined();
                expect(graph.get('A1')).toBeInstanceOf(Set);
                expect(Array.from(graph.get('A1') || [])).toEqual([]); // A1 has no dependencies
                expect(graph.get('A2')).toBeInstanceOf(Set);
                expect(Array.from(graph.get('A2') || [])).toEqual(['A1']); // A2 depends on A1
            });
        });
        describe('topologicalSort', () => {
            it('should sort nodes in dependency order', () => {
                // A2 depends on A1, A3 depends on A2
                const graph = new Map([
                    ['A1', new Set()], // A1 has no dependencies
                    ['A2', new Set(['A1'])], // A2 depends on A1
                    ['A3', new Set(['A2'])] // A3 depends on A2
                ]);
                const sorted = engine.topologicalSort(graph);
                expect(sorted).toEqual(['A1', 'A2', 'A3']);
            });
            it('should handle nodes without dependencies', () => {
                const graph = new Map([
                    ['A1', new Set()],
                    ['A2', new Set()],
                    ['A3', new Set()]
                ]);
                const sorted = engine.topologicalSort(graph);
                expect(sorted?.sort()).toEqual(['A1', 'A2', 'A3'].sort());
            });
            it('should detect cycles', () => {
                // A1 depends on A2, A2 depends on A1 (cycle)
                const graph = new Map([
                    ['A1', new Set(['A2'])],
                    ['A2', new Set(['A1'])] // Cycle
                ]);
                const sorted = engine.topologicalSort(graph);
                expect(sorted).toBeNull();
            });
        });
        describe('resolveParameters', () => {
            it('should resolve parameters with variable substitution', () => {
                const context = {
                    results: new Map([['A1', { output: 'test result' }]]),
                    variables: new Map()
                };
                const params = {
                    input: '{{A1.output}}',
                    static: 'value'
                };
                const resolved = engine.resolveParameters(params, context);
                expect(resolved.input).toBe('test result');
                expect(resolved.static).toBe('value');
            });
            it('should handle missing variables', () => {
                const context = {
                    results: new Map(),
                    variables: new Map()
                };
                const params = {
                    input: '{{A1.output}}'
                };
                const resolved = engine.resolveParameters(params, context);
                expect(resolved.input).toBe('{{A1.output}}');
            });
        });
    });
});
//# sourceMappingURL=cloud-intent-engine.test.js.map