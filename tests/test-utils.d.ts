/**
 * Test utilities for MCPilot SDK Core tests
 */
import { IntentOrchSDK } from '../src/sdk';
import { ToolResult } from '../src/mcp/types';
import { RuntimeType } from '../src/core/types';
/**
 * Creates a mock SDK instance for testing
 */
export declare function createMockSDK(options?: {
    autoInit?: boolean;
    hasTools?: boolean;
    hasAI?: boolean;
}): IntentOrchSDK;
/**
 * Creates a mock ToolResult for testing
 */
export declare function createMockToolResult(options?: {
    content?: Array<{
        type: 'text' | 'image' | 'resource';
        text?: string;
        data?: any;
    }>;
    isError?: boolean;
}): ToolResult;
/**
 * Creates a mock runtime detection result
 */
export declare function createMockDetectionResult(options?: {
    runtime?: RuntimeType;
    confidence?: number;
    source?: string;
    evidence?: Record<string, any>;
}): {
    runtime: RuntimeType;
    confidence: number;
    source: string;
    evidence: Record<string, any>;
};
/**
 * Creates a mock service status
 */
export declare function createMockServiceStatus(options?: {
    name?: string;
    status?: 'running' | 'stopped' | 'error' | 'unknown';
    pid?: number;
    uptime?: number;
}): {
    name: string;
    status: "running" | "stopped" | "error" | "unknown";
    pid: number;
    uptime: number;
};
/**
 * Creates a mock AI configuration
 */
export declare function createMockAIConfig(options?: {
    provider?: string;
    apiKey?: string;
    model?: string;
    enabled?: boolean;
}): {
    provider: string;
    apiKey: string;
    model: string;
    enabled: boolean;
};
/**
 * Creates a mock logger
 */
export declare function createMockLogger(): {
    info: jest.Mock<any, any, any>;
    error: jest.Mock<any, any, any>;
    debug: jest.Mock<any, any, any>;
    warn: jest.Mock<any, any, any>;
    log: jest.Mock<any, any, any>;
};
/**
 * Waits for a specified time (useful for async tests)
 */
export declare function wait(ms: number): Promise<void>;
/**
 * Creates a mock performance monitor
 */
export declare function createMockPerformanceMonitor(): {
    start: jest.Mock<any, any, any>;
    stop: jest.Mock<any, any, any>;
    recordServiceRequest: jest.Mock<any, any, any>;
    getMetrics: jest.Mock<any, any, any>;
    clear: jest.Mock<any, any, any>;
};
//# sourceMappingURL=test-utils.d.ts.map