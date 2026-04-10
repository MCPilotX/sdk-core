// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ToolRegistry } from '../../../src/mcp/tool-registry';
// Helper function to create a valid ToolResult
const createSuccessResult = (text) => ({
    content: [{ type: 'text', text }],
    isError: false,
});
describe('ToolRegistry', () => {
    let toolRegistry;
    beforeEach(() => {
        toolRegistry = new ToolRegistry();
    });
    afterEach(() => {
        // Clean up
        toolRegistry.clear();
    });
    describe('工具注册', () => {
        it('应该注册单个工具', () => {
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
            const executor = async (args) => createSuccessResult('Success');
            toolRegistry.registerTool(tool, executor, 'test-server', 'Test Server');
            const registeredTool = toolRegistry.getTool('test.tool');
            expect(registeredTool).toBeDefined();
            expect(registeredTool?.tool.name).toBe('test.tool');
            expect(registeredTool?.metadata.serverId).toBe('test-server');
            expect(registeredTool?.metadata.serverName).toBe('Test Server');
            expect(registeredTool?.metadata.discoveredAt).toBeDefined();
        });
        it('应该批量注册工具', () => {
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
            const executorFactory = (toolName) => async (args) => ({
                content: [{ type: 'text', text: `Executed ${toolName}` }],
                isError: false,
            });
            toolRegistry.registerTools(tools, executorFactory, 'batch-server', 'Batch Server');
            const allTools = toolRegistry.getAllTools();
            expect(allTools).toHaveLength(2);
            expect(toolRegistry.getTool('tool1')).toBeDefined();
            expect(toolRegistry.getTool('tool2')).toBeDefined();
        });
        it('应该更新工具使用统计', async () => {
            const tool = {
                name: 'stats.tool',
                description: 'Stats tool',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            };
            const executor = async (args) => ({
                content: [{ type: 'text', text: 'Success' }],
                isError: false,
            });
            toolRegistry.registerTool(tool, executor, 'stats-server');
            // Execute tool multiple times
            const toolCall = {
                name: 'stats.tool',
                arguments: {},
            };
            await toolRegistry.executeToolDirect(toolCall);
            await toolRegistry.executeToolDirect(toolCall);
            await toolRegistry.executeToolDirect(toolCall);
            const registeredTool = toolRegistry.getTool('stats.tool');
            expect(registeredTool?.metadata.usageCount).toBe(3);
            expect(registeredTool?.metadata.lastUsed).toBeDefined();
        });
    });
    describe('工具注销', () => {
        it('应该注销单个工具', () => {
            const tool = {
                name: 'to.unregister',
                description: 'To unregister',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            };
            const executor = async (args) => ({
                content: [{ type: 'text', text: 'Success' }],
                isError: false,
            });
            toolRegistry.registerTool(tool, executor, 'test-server');
            expect(toolRegistry.getTool('to.unregister')).toBeDefined();
            const unregistered = toolRegistry.unregisterTool('to.unregister');
            expect(unregistered).toBe(true);
            expect(toolRegistry.getTool('to.unregister')).toBeUndefined();
        });
        it('应该注销不存在的工具时返回false', () => {
            const unregistered = toolRegistry.unregisterTool('nonexistent.tool');
            expect(unregistered).toBe(false);
        });
        it('应该注销服务器的所有工具', () => {
            // Register tools for two different servers
            const tool1 = {
                name: 'server1.tool1',
                description: 'Server 1 Tool 1',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            };
            const tool2 = {
                name: 'server1.tool2',
                description: 'Server 1 Tool 2',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            };
            const tool3 = {
                name: 'server2.tool1',
                description: 'Server 2 Tool 1',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            };
            const executor = async (args) => ({
                content: [{ type: 'text', text: 'Success' }],
                isError: false,
            });
            toolRegistry.registerTool(tool1, executor, 'server1');
            toolRegistry.registerTool(tool2, executor, 'server1');
            toolRegistry.registerTool(tool3, executor, 'server2');
            expect(toolRegistry.getAllTools()).toHaveLength(3);
            // Unregister server1 tools
            const unregistered = toolRegistry.unregisterServerTools('server1');
            expect(unregistered).toBe(true);
            expect(toolRegistry.getAllTools()).toHaveLength(1);
            expect(toolRegistry.getTool('server1.tool1')).toBeUndefined();
            expect(toolRegistry.getTool('server1.tool2')).toBeUndefined();
            expect(toolRegistry.getTool('server2.tool1')).toBeDefined();
        });
        it('应该注销不存在的服务器的工具时返回false', () => {
            const unregistered = toolRegistry.unregisterServerTools('nonexistent-server');
            expect(unregistered).toBe(false);
        });
    });
    describe('工具查询', () => {
        beforeEach(() => {
            // Setup test data
            const tools = [
                {
                    name: 'filesystem.list',
                    description: 'List files in directory',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: { type: 'string' },
                        },
                        required: ['path'],
                    },
                },
                {
                    name: 'filesystem.read',
                    description: 'Read file content',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: { type: 'string' },
                            encoding: { type: 'string' },
                        },
                        required: ['path'],
                    },
                },
                {
                    name: 'network.ping',
                    description: 'Ping network host',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            host: { type: 'string' },
                        },
                        required: ['host'],
                    },
                },
                {
                    name: 'database.query',
                    description: 'Execute database query',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: { type: 'string' },
                        },
                        required: ['query'],
                    },
                },
            ];
            const executor = async (args) => ({
                content: [{ type: 'text', text: 'Success' }],
                isError: false,
            });
            tools.forEach((tool, index) => {
                const serverId = index < 2 ? 'filesystem-server' : 'other-server';
                toolRegistry.registerTool(tool, executor, serverId, `${serverId}-name`);
            });
        });
        it('应该获取所有工具', () => {
            const allTools = toolRegistry.getAllTools();
            expect(allTools).toHaveLength(4);
            expect(allTools[0].tool.name).toBe('filesystem.list');
            expect(allTools[3].tool.name).toBe('database.query');
        });
        it('应该按服务器获取工具', () => {
            const filesystemTools = toolRegistry.getToolsByServer('filesystem-server');
            const otherTools = toolRegistry.getToolsByServer('other-server');
            const noTools = toolRegistry.getToolsByServer('nonexistent-server');
            expect(filesystemTools).toHaveLength(2);
            expect(otherTools).toHaveLength(2);
            expect(noTools).toHaveLength(0);
            expect(filesystemTools[0].tool.name).toBe('filesystem.list');
            expect(filesystemTools[1].tool.name).toBe('filesystem.read');
        });
        it('应该获取所有服务器ID', () => {
            const serverIds = toolRegistry.getServerIds();
            expect(serverIds).toHaveLength(2);
            expect(serverIds).toContain('filesystem-server');
            expect(serverIds).toContain('other-server');
        });
        it('应该获取连接的服务器名称', () => {
            const connectedServers = toolRegistry.getConnectedServers();
            expect(connectedServers).toHaveLength(2);
            expect(connectedServers).toContain('filesystem-server-name');
            expect(connectedServers).toContain('other-server-name');
        });
        it('应该搜索工具', () => {
            const filesystemResults = toolRegistry.searchTools('filesystem');
            const networkResults = toolRegistry.searchTools('network');
            const readResults = toolRegistry.searchTools('read');
            const noResults = toolRegistry.searchTools('nonexistent');
            expect(filesystemResults).toHaveLength(2);
            expect(networkResults).toHaveLength(1);
            expect(readResults).toHaveLength(1);
            expect(noResults).toHaveLength(0);
            expect(filesystemResults[0].tool.name).toBe('filesystem.list');
            expect(networkResults[0].tool.name).toBe('network.ping');
            expect(readResults[0].tool.name).toBe('filesystem.read');
        });
        it('应该搜索工具描述', () => {
            const queryResults = toolRegistry.searchTools('database query');
            const pingResults = toolRegistry.searchTools('ping network');
            expect(queryResults).toHaveLength(1);
            expect(pingResults).toHaveLength(1);
            expect(queryResults[0].tool.name).toBe('database.query');
            expect(pingResults[0].tool.name).toBe('network.ping');
        });
        it('应该不区分大小写搜索', () => {
            const upperResults = toolRegistry.searchTools('FILESYSTEM');
            const lowerResults = toolRegistry.searchTools('filesystem');
            expect(upperResults).toHaveLength(2);
            expect(lowerResults).toHaveLength(2);
        });
    });
    describe('工具执行', () => {
        it('应该直接执行工具', async () => {
            const tool = {
                name: 'echo.tool',
                description: 'Echo input',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                    },
                    required: ['message'],
                },
            };
            const executor = async (args) => ({
                content: [{ type: 'text', text: `Echo: ${args.message}` }],
                isError: false,
            });
            toolRegistry.registerTool(tool, executor, 'echo-server');
            const toolCall = {
                name: 'echo.tool',
                arguments: { message: 'Hello World' },
            };
            const result = await toolRegistry.executeToolDirect(toolCall);
            expect(result.isError).toBe(false);
            expect(result.content[0].text).toBe('Echo: Hello World');
        });
        it('应该通过回退机制执行工具', async () => {
            const tool = {
                name: 'simple.tool',
                description: 'Simple tool',
                inputSchema: {
                    type: 'object',
                    properties: {
                        input: { type: 'string' },
                    },
                    required: ['input'],
                },
            };
            const executor = async (args) => ({
                content: [{ type: 'text', text: `Processed: ${args.input}` }],
                isError: false,
            });
            toolRegistry.registerTool(tool, executor, 'simple-server');
            const toolCall = {
                name: 'simple.tool',
                arguments: { input: 'test data' },
            };
            const result = await toolRegistry.executeTool(toolCall);
            expect(result.isError).toBe(false);
            expect(result.content[0].text).toBe('Processed: test data');
        });
        it('应该处理工具执行错误', async () => {
            const tool = {
                name: 'error.tool',
                description: 'Error tool',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            };
            const executor = async (args) => {
                throw new Error('Intentional execution error');
            };
            toolRegistry.registerTool(tool, executor, 'error-server');
            const toolCall = {
                name: 'error.tool',
                arguments: {},
            };
            const result = await toolRegistry.executeToolDirect(toolCall);
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Tool execution failed');
            expect(result.content[0].text).toContain('Intentional execution error');
        });
        it('应该处理不存在的工具', async () => {
            const toolCall = {
                name: 'nonexistent.tool',
                arguments: { param: 'value' },
            };
            const result = await toolRegistry.executeTool(toolCall);
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('not found');
            // Note: The actual error message might not contain "Connected servers"
            // depending on the implementation
        });
        it('应该验证工具参数', async () => {
            const tool = {
                name: 'validated.tool',
                description: 'Validated tool',
                inputSchema: {
                    type: 'object',
                    properties: {
                        requiredParam: { type: 'string' },
                        optionalParam: { type: 'number' },
                    },
                    required: ['requiredParam'],
                },
            };
            const executor = async (args) => ({
                content: [{ type: 'text', text: 'Success' }],
                isError: false,
            });
            toolRegistry.registerTool(tool, executor, 'validation-server');
            // Test with missing required parameter
            const invalidCall = {
                name: 'validated.tool',
                arguments: { optionalParam: 123 },
            };
            const invalidResult = await toolRegistry.executeToolDirect(invalidCall);
            expect(invalidResult.isError).toBe(true);
            expect(invalidResult.content[0].text).toContain('validation failed');
            expect(invalidResult.content[0].text).toContain('requiredParam');
            // Test with valid parameters
            const validCall = {
                name: 'validated.tool',
                arguments: { requiredParam: 'test', optionalParam: 123 },
            };
            const validResult = await toolRegistry.executeToolDirect(validCall);
            expect(validResult.isError).toBe(false);
            expect(validResult.content[0].text).toBe('Success');
        });
    });
    describe('工具统计', () => {
        it('应该获取工具统计信息', async () => {
            // Register multiple tools with different usage patterns
            const tools = [
                {
                    name: 'frequently.used',
                    description: 'Frequently used tool',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: [],
                    },
                },
                {
                    name: 'rarely.used',
                    description: 'Rarely used tool',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: [],
                    },
                },
                {
                    name: 'never.used',
                    description: 'Never used tool',
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
                const serverId = index < 2 ? 'server1' : 'server2';
                toolRegistry.registerTool(tool, executor, serverId, `Server ${index + 1}`);
            });
            // Use some tools
            await toolRegistry.executeToolDirect({ name: 'frequently.used', arguments: {} });
            await toolRegistry.executeToolDirect({ name: 'frequently.used', arguments: {} });
            await toolRegistry.executeToolDirect({ name: 'frequently.used', arguments: {} });
            await toolRegistry.executeToolDirect({ name: 'rarely.used', arguments: {} });
            const stats = toolRegistry.getToolStatistics();
            expect(stats.totalTools).toBe(3);
            expect(stats.byServer.server1).toBe(2);
            expect(stats.byServer.server2).toBe(1);
            expect(stats.mostUsed).toHaveLength(2); // Only tools with usage count > 0
            expect(stats.mostUsed[0].name).toBe('frequently.used');
            expect(stats.mostUsed[0].usageCount).toBe(3);
            expect(stats.mostUsed[1].name).toBe('rarely.used');
            expect(stats.mostUsed[1].usageCount).toBe(1);
        });
        it('应该处理空注册表的统计', () => {
            const stats = toolRegistry.getToolStatistics();
            expect(stats.totalTools).toBe(0);
            expect(Object.keys(stats.byServer)).toHaveLength(0);
            expect(stats.mostUsed).toHaveLength(0);
        });
    });
    describe('清理操作', () => {
        it('应该清除所有工具', () => {
            // Register some tools first
            const tool = {
                name: 'cleanup.tool',
                description: 'Cleanup tool',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            };
            const executor = async (args) => ({
                content: [{ type: 'text', text: 'Success' }],
                isError: false,
            });
            toolRegistry.registerTool(tool, executor, 'cleanup-server');
            expect(toolRegistry.getAllTools()).toHaveLength(1);
            // Clear all tools
            toolRegistry.clear();
            expect(toolRegistry.getAllTools()).toHaveLength(0);
            expect(toolRegistry.getTool('cleanup.tool')).toBeUndefined();
        });
    });
});
//# sourceMappingURL=tool-registry.test.js.map