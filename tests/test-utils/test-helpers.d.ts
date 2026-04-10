/**
 * 测试辅助工具
 */
export declare function createMockTool(name: string, description: string): {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            param: {
                type: "string";
            };
        };
        required: string[];
    };
};
export declare function createMockExecutor(result: any): (args: any) => Promise<{
    content: {
        type: "text";
        text: any;
    }[];
    isError: boolean;
}>;
export declare function sleep(ms: number): Promise<void>;
/**
 * 创建模拟的MCP工具调用
 */
export declare function createMockToolCall(name: string, args?: Record<string, any>): {
    name: string;
    arguments: Record<string, any>;
};
/**
 * 创建模拟的工具结果
 */
export declare function createMockToolResult(text: string, isError?: boolean): {
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
};
/**
 * 验证对象是否包含特定属性
 */
export declare function expectToHaveProperties(obj: any, properties: string[]): void;
/**
 * 异步重试函数
 */
export declare function retry<T>(fn: () => Promise<T>, maxAttempts?: number, delay?: number): Promise<T>;
//# sourceMappingURL=test-helpers.d.ts.map