/**
 * MCP Module Coverage Tests
 * Tests for src/mcp/ directory to improve test coverage
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ParameterMapper, ValidationLevel } from '../src/mcp/parameter-mapper';
import { ToolRegistry } from '../src/mcp/tool-registry';
describe('MCP Module Coverage Tests', () => {
    describe('ParameterMapper', () => {
        beforeEach(() => {
            // Reset to default configuration
            ParameterMapper.resetConfig();
        });
        it('should have default configuration', () => {
            const config = ParameterMapper.getConfig();
            expect(config.validationLevel).toBe(ValidationLevel.COMPATIBLE);
            expect(config.logWarnings).toBe(true);
            expect(config.enforceRequired).toBe(true);
        });
        it('should configure validation level', () => {
            ParameterMapper.configure({
                validationLevel: ValidationLevel.STRICT,
                logWarnings: false,
            });
            const config = ParameterMapper.getConfig();
            expect(config.validationLevel).toBe(ValidationLevel.STRICT);
            expect(config.logWarnings).toBe(false);
        });
        it('should map parameters with direct match', () => {
            const toolName = 'test.tool';
            const toolSchema = {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    name: { type: 'string' },
                },
                required: ['path'],
            };
            const sourceArgs = { path: '/tmp', name: 'file.txt' };
            const result = ParameterMapper.mapParameters(toolName, toolSchema, sourceArgs);
            expect(result.path).toBe('/tmp');
            expect(result.name).toBe('file.txt');
        });
        it('should map parameters with aliases', () => {
            const toolName = 'filesystem.read';
            const toolSchema = {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                },
                required: ['path'],
            };
            // Test various aliases for path
            const testCases = [
                { input: { filename: 'test.txt' }, expected: 'test.txt' },
                { input: { file: 'test.txt' }, expected: 'test.txt' },
                { input: { directory: '/tmp' }, expected: '/tmp' },
                { input: { folder: '/tmp' }, expected: '/tmp' },
            ];
            testCases.forEach(({ input, expected }) => {
                const result = ParameterMapper.mapParameters(toolName, toolSchema, input);
                expect(result.path).toBe(expected);
            });
        });
        it('should validate and normalize parameters', () => {
            const toolName = 'test.tool';
            const toolSchema = {
                type: 'object',
                properties: {
                    requiredParam: { type: 'string' },
                    optionalParam: { type: 'number' },
                },
                required: ['requiredParam'],
                additionalProperties: false,
            };
            const validArgs = { requiredParam: 'test', optionalParam: 123 };
            const result = ParameterMapper.validateAndNormalize(toolName, toolSchema, validArgs);
            expect(result.normalized.requiredParam).toBe('test');
            expect(result.normalized.optionalParam).toBe(123);
            expect(result.warnings).toHaveLength(0);
        });
        it('should throw error for missing required parameters', () => {
            const toolName = 'test.tool';
            const toolSchema = {
                type: 'object',
                properties: {
                    requiredParam: { type: 'string' },
                },
                required: ['requiredParam'],
            };
            const invalidArgs = { optionalParam: 123 };
            expect(() => {
                ParameterMapper.validateAndNormalize(toolName, toolSchema, invalidArgs);
            }).toThrow('Missing required parameter');
        });
        it('should handle additionalProperties false in strict mode', () => {
            ParameterMapper.configure({
                validationLevel: ValidationLevel.STRICT,
            });
            const toolName = 'test.tool';
            const toolSchema = {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                },
                required: ['path'],
                additionalProperties: false,
            };
            const args = { path: '/tmp', extraParam: 'should-warn' };
            const result = ParameterMapper.validateAndNormalize(toolName, toolSchema, args);
            expect(result.warnings).toContainEqual(expect.stringContaining('Unknown parameter'));
        });
        it('should get mapping suggestions', () => {
            const toolName = 'filesystem.read';
            const toolSchema = {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    name: { type: 'string' },
                },
                required: ['path'],
            };
            const suggestions = ParameterMapper.getMappingSuggestions(toolName, toolSchema);
            expect(suggestions.length).toBeGreaterThan(0);
            // Should include path/name mappings
            const pathMappings = suggestions.filter(s => s.targetName === 'path');
            expect(pathMappings.length).toBeGreaterThan(0);
        });
    });
    describe('ToolRegistry', () => {
        let toolRegistry;
        beforeEach(() => {
            toolRegistry = new ToolRegistry();
        });
        afterEach(() => {
            // Clean up
        });
        it('should register and retrieve tools', () => {
            const tool = {
                name: 'test.tool',
                description: 'Test tool',
                inputSchema: {
                    type: 'object',
                    properties: {
                        param: { type: 'string' },
                    },
                    required: ['param'],
                },
            };
            const executor = async (args) => ({
                content: [{ type: 'text', text: 'Success' }],
                isError: false,
            });
            toolRegistry.registerTool(tool, executor, 'test-server', 'Test Server');
            const registeredTool = toolRegistry.getTool('test.tool');
            expect(registeredTool).toBeDefined();
            expect(registeredTool?.tool.name).toBe('test.tool');
            expect(registeredTool?.metadata.serverName).toBe('Test Server');
        });
        it('should unregister tools', () => {
            const tool = {
                name: 'test.tool',
                description: 'Test tool',
                inputSchema: {
                    type: 'object',
                    properties: {
                        param: { type: 'string' },
                    },
                    required: ['param'],
                },
            };
            const executor = async (args) => ({
                content: [{ type: 'text', text: 'Success' }],
                isError: false,
            });
            toolRegistry.registerTool(tool, executor, 'test-server', 'Test Server');
            expect(toolRegistry.getTool('test.tool')).toBeDefined();
            const unregistered = toolRegistry.unregisterTool('test.tool');
            expect(unregistered).toBe(true);
            expect(toolRegistry.getTool('test.tool')).toBeUndefined();
        });
        it('should search tools by name', () => {
            const tools = [
                {
                    name: 'filesystem.list',
                    description: 'List files',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: { type: 'string' },
                        },
                        required: [],
                    },
                },
                {
                    name: 'filesystem.read',
                    description: 'Read file',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: { type: 'string' },
                        },
                        required: ['path'],
                    },
                },
                {
                    name: 'network.ping',
                    description: 'Ping host',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            host: { type: 'string' },
                        },
                        required: ['host'],
                    },
                },
            ];
            const executor = async (args) => ({
                content: [{ type: 'text', text: 'Success' }],
                isError: false,
            });
            tools.forEach(tool => {
                toolRegistry.registerTool(tool, executor, 'test-server', 'Test Server');
            });
            const filesystemTools = toolRegistry.searchTools('filesystem');
            expect(filesystemTools.length).toBe(2);
            const networkTools = toolRegistry.searchTools('network');
            expect(networkTools.length).toBe(1);
            const noTools = toolRegistry.searchTools('nonexistent');
            expect(noTools.length).toBe(0);
        });
        it('should execute tools successfully', async () => {
            const tool = {
                name: 'test.echo',
                description: 'Echo input',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        repeat: { type: 'number' },
                    },
                    required: ['message'],
                },
            };
            const executor = async (args) => {
                const message = args.message || '';
                const repeat = args.repeat || 1;
                const result = message.repeat(repeat);
                return {
                    content: [{ type: 'text', text: result }],
                    isError: false,
                };
            };
            toolRegistry.registerTool(tool, executor, 'test-server', 'Test Server');
            const toolCall = {
                name: 'test.echo',
                arguments: { message: 'Hello', repeat: 3 },
            };
            const result = await toolRegistry.executeTool(toolCall);
            expect(result.isError).toBe(false);
            expect(result.content[0].text).toBe('HelloHelloHello');
        });
        it('should handle tool execution errors', async () => {
            const tool = {
                name: 'test.error',
                description: 'Always errors',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            };
            const executor = async (args) => {
                throw new Error('Intentional error for testing');
            };
            toolRegistry.registerTool(tool, executor, 'test-server', 'Test Server');
            const toolCall = {
                name: 'test.error',
                arguments: {},
            };
            const result = await toolRegistry.executeTool(toolCall);
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('error');
        });
        it('should handle missing tools gracefully', async () => {
            const toolCall = {
                name: 'nonexistent.tool',
                arguments: { param: 'value' },
            };
            const result = await toolRegistry.executeTool(toolCall);
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('not found');
        });
        it('should get tool statistics', () => {
            const tools = [
                {
                    name: 'tool1',
                    description: 'Tool 1',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: [],
                    },
                },
                {
                    name: 'tool2',
                    description: 'Tool 2',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: [],
                    },
                },
            ];
            const executor = async (args) => ({
                content: [{ type: 'text', text: 'Success' }],
                isError: false,
            });
            tools.forEach((tool, index) => {
                toolRegistry.registerTool(tool, executor, `server${index + 1}`, `Server ${index + 1}`);
            });
            const stats = toolRegistry.getToolStatistics();
            expect(stats.totalTools).toBe(2);
            expect(stats.byServer.server1).toBe(1);
            expect(stats.byServer.server2).toBe(1);
        });
        it('should unregister all tools from a server', () => {
            const tools = [
                {
                    name: 'server1.tool1',
                    description: 'Server 1 Tool 1',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: [],
                    },
                },
                {
                    name: 'server1.tool2',
                    description: 'Server 1 Tool 2',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: [],
                    },
                },
                {
                    name: 'server2.tool1',
                    description: 'Server 2 Tool 1',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: [],
                    },
                },
            ];
            const executor = async (args) => ({
                content: [{ type: 'text', text: 'Success' }],
                isError: false,
            });
            tools.forEach(tool => {
                const serverId = tool.name.split('.')[0];
                toolRegistry.registerTool(tool, executor, serverId, `${serverId} Server`);
            });
            expect(toolRegistry.getTool('server1.tool1')).toBeDefined();
            expect(toolRegistry.getTool('server1.tool2')).toBeDefined();
            expect(toolRegistry.getTool('server2.tool1')).toBeDefined();
            toolRegistry.unregisterServerTools('server1');
            expect(toolRegistry.getTool('server1.tool1')).toBeUndefined();
            expect(toolRegistry.getTool('server1.tool2')).toBeUndefined();
            expect(toolRegistry.getTool('server2.tool1')).toBeDefined();
        });
    });
});
//# sourceMappingURL=mcp-module-coverage.test.js.map