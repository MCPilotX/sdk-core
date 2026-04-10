import { MCPilotSDK } from '../src/sdk';
import { MCPClient, ToolRegistry } from '../src/mcp';
import { AI } from '../src/ai/ai';
import { ConfigManager } from '../src/core/config-manager';
// Mock dependencies
jest.mock('../src/mcp');
jest.mock('../src/ai/ai');
jest.mock('../src/core/config-manager');
describe('IntentOrchSDK MCP Functionality (Simple)', () => {
    let sdk;
    let mockLogger;
    let mockMCPClient;
    let mockToolRegistry;
    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        };
        // Reset all mocks
        jest.clearAllMocks();
        // Mock MCPClient
        mockMCPClient = {
            connect: jest.fn().mockResolvedValue(undefined),
            disconnect: jest.fn().mockResolvedValue(undefined),
            listTools: jest.fn().mockResolvedValue([]),
            getStatus: jest.fn().mockReturnValue({ connected: true, toolsCount: 0 })
        };
        // Mock ToolRegistry
        mockToolRegistry = {
            getAllTools: jest.fn().mockReturnValue([]),
            searchTools: jest.fn().mockReturnValue([]),
            executeTool: jest.fn().mockResolvedValue({ content: [], isError: false }),
            registerTool: jest.fn(),
            unregisterServerTools: jest.fn(),
            getToolStatistics: jest.fn().mockReturnValue({ totalTools: 0, executedTools: 0 })
        };
        // Mock AI
        const mockAI = {
            configure: jest.fn().mockResolvedValue(undefined),
            ask: jest.fn().mockResolvedValue({ type: 'suggestions', message: 'test', confidence: 0.8 })
        };
        // Mock constructors
        MCPClient.mockImplementation(() => mockMCPClient);
        ToolRegistry.mockImplementation(() => mockToolRegistry);
        AI.mockImplementation(() => mockAI);
        // Mock ConfigManager
        ConfigManager.init.mockResolvedValue(undefined);
        ConfigManager.getGlobalConfig.mockReturnValue({
            ai: { provider: 'openai', apiKey: 'test-key' }
        });
        // Create SDK instance
        sdk = new MCPilotSDK({
            logger: mockLogger,
            autoInit: false
        });
        // Initialize SDK
        sdk.init();
    });
    describe('MCP Basic Methods', () => {
        it('should list MCP servers when none connected', () => {
            const servers = sdk.listMCPServers();
            expect(servers).toEqual([]);
        });
        it('should list tools when none registered', () => {
            const tools = sdk.listTools();
            expect(tools).toEqual([]);
        });
        it('should search tools with empty result', () => {
            const tools = sdk.searchTools('test');
            expect(tools).toEqual([]);
        });
        it('should get tool statistics', () => {
            const stats = sdk.getToolStatistics();
            expect(stats).toEqual({ totalTools: 0, executedTools: 0 });
        });
        it('should get MCP server status for non-existent server', () => {
            const status = sdk.getMCPServerStatus('non-existent');
            expect(status).toBeUndefined();
        });
    });
    describe('initMCP()', () => {
        it('should initialize MCP without errors', async () => {
            await sdk.initMCP();
            expect(mockLogger.info).toHaveBeenCalledWith('MCP functionality initialized successfully');
        });
        it('should handle errors during MCP initialization', async () => {
            // Mock discoverLocalMCPServers to throw error
            const mockDiscoverLocalMCPServers = jest.requireMock('../src/mcp').discoverLocalMCPServers;
            mockDiscoverLocalMCPServers.mockRejectedValue(new Error('Discovery failed'));
            // Create SDK with autoDiscover enabled
            const sdkWithAutoDiscover = new MCPilotSDK({
                logger: mockLogger,
                autoInit: true,
                mcp: { autoDiscover: true }
            });
            await expect(sdkWithAutoDiscover.initMCP()).rejects.toThrow('Discovery failed');
        });
    });
    describe('connectMCPServer()', () => {
        it('should connect to MCP server successfully', async () => {
            const config = {
                transport: {
                    type: 'stdio',
                    command: 'npx',
                    args: ['@modelcontextprotocol/server-filesystem', '.']
                }
            };
            const client = await sdk.connectMCPServer(config, 'test-server');
            expect(client).toBe(mockMCPClient);
            expect(mockMCPClient.connect).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Connected to MCP server: test-server'));
        });
        it('should handle connection errors', async () => {
            mockMCPClient.connect.mockRejectedValueOnce(new Error('Connection failed'));
            const config = {
                transport: {
                    type: 'stdio',
                    command: 'npx',
                    args: ['@modelcontextprotocol/server-filesystem', '.']
                }
            };
            await expect(sdk.connectMCPServer(config, 'test-server')).rejects.toThrow('Connection failed');
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to connect to MCP server'));
        });
    });
    describe('disconnectMCPServer()', () => {
        it('should disconnect from MCP server successfully', async () => {
            // First connect a server
            const config = {
                transport: {
                    type: 'stdio',
                    command: 'npx',
                    args: ['@modelcontextprotocol/server-filesystem', '.']
                }
            };
            await sdk.connectMCPServer(config, 'test-server');
            // Now disconnect
            await sdk.disconnectMCPServer('test-server');
            expect(mockMCPClient.disconnect).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Disconnected from MCP server: test-server');
        });
        it('should throw error when server not found', async () => {
            await expect(sdk.disconnectMCPServer('non-existent')).rejects.toThrow("MCP server 'non-existent' not found");
        });
    });
    describe('executeTool()', () => {
        it('should execute tool successfully', async () => {
            const result = await sdk.executeTool('test-tool', { param: 'value' });
            expect(result).toEqual({ content: [], isError: false });
            expect(mockToolRegistry.executeTool).toHaveBeenCalledWith({
                name: 'test-tool',
                arguments: { param: 'value' }
            });
        });
        it('should handle tool execution errors', async () => {
            const errorResult = {
                content: [{ type: 'text', text: 'Tool execution failed' }],
                isError: true
            };
            mockToolRegistry.executeTool.mockResolvedValueOnce(errorResult);
            await expect(sdk.executeTool('test-tool', {})).rejects.toThrow('Tool execution failed');
        });
    });
});
//# sourceMappingURL=sdk-mcp-simple.test.js.map