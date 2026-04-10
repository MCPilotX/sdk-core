/**
 * Test utilities for MCPilot SDK Core tests
 */
const { IntentOrchSDK } = require('../src/sdk');
/**
 * Creates a mock SDK instance for testing
 */
function createMockSDK(options = {}) {
    const sdk = new IntentOrchSDK({ autoInit: false });
    // Mock internal components
    const mockToolRegistry = {
        executeTool: jest.fn(),
        registerTool: jest.fn(),
        getAllTools: jest.fn().mockReturnValue(options.hasTools ? [
            {
                tool: { name: 'test-tool-1', description: 'Test tool 1', inputSchema: {} },
                metadata: { serverName: 'test-server', toolId: 'test-tool-1' },
                executor: jest.fn()
            },
            {
                tool: { name: 'test-tool-2', description: 'Test tool 2', inputSchema: {} },
                metadata: { serverName: 'test-server', toolId: 'test-tool-2' },
                executor: jest.fn()
            }
        ] : []),
        searchTools: jest.fn().mockReturnValue(options.hasTools ? [
            {
                tool: { name: 'test-tool-1', description: 'Test tool 1', inputSchema: {} },
                metadata: { serverName: 'test-server', serverId: 'test-server', toolId: 'test-tool-1' },
                executor: jest.fn()
            }
        ] : []),
        getTool: jest.fn()
    };
    sdk.toolRegistry = mockToolRegistry;
    // Mock AI configuration
    if (options.hasAI) {
        sdk.ai = {
            isConfigured: true,
            provider: 'deepseek',
            model: 'deepseek-chat'
        };
    }
    if (options.autoInit !== false) {
        sdk.init();
    }
    return sdk;
}
/**
 * Creates a mock ToolResult for testing
 */
function createMockToolResult(options = {}) {
    return {
        content: options.content || [{ type: 'text', text: 'Test result' }],
        isError: options.isError || false
    };
}
/**
 * Creates a mock runtime detection result
 */
function createMockDetectionResult(options = {}) {
    return {
        runtime: options.runtime || 'node',
        confidence: options.confidence || 0.9,
        source: options.source || 'enhanced',
        evidence: options.evidence || {}
    };
}
/**
 * Creates a mock service status
 */
function createMockServiceStatus(options = {}) {
    return {
        name: options.name || 'test-service',
        status: options.status || 'running',
        pid: options.pid || 12345,
        uptime: options.uptime || 3600
    };
}
/**
 * Creates a mock AI configuration
 */
function createMockAIConfig(options = {}) {
    return {
        provider: options.provider || 'deepseek',
        apiKey: options.apiKey || 'test-api-key',
        model: options.model || 'deepseek-chat',
        enabled: options.enabled !== false
    };
}
/**
 * Creates a mock logger
 */
function createMockLogger() {
    return {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        log: jest.fn()
    };
}
/**
 * Waits for a specified time (useful for async tests)
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Creates a mock performance monitor
 */
function createMockPerformanceMonitor() {
    return {
        start: jest.fn(),
        stop: jest.fn(),
        recordServiceRequest: jest.fn(),
        getMetrics: jest.fn().mockReturnValue([]),
        clear: jest.fn()
    };
}

module.exports = {
    createMockSDK,
    createMockToolResult,
    createMockDetectionResult,
    createMockServiceStatus,
    createMockAIConfig,
    createMockLogger,
    wait,
    createMockPerformanceMonitor
};
//# sourceMappingURL=test-utils.js.map
