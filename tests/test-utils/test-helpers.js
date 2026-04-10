/**
 * 测试辅助工具
 */
export function createMockTool(name, description) {
    return {
        name,
        description,
        inputSchema: {
            type: 'object',
            properties: {
                param: { type: 'string' },
            },
            required: ['param'],
        },
    };
}
export function createMockExecutor(result) {
    return async (args) => ({
        content: [{ type: 'text', text: result }],
        isError: false,
    });
}
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * 创建模拟的MCP工具调用
 */
export function createMockToolCall(name, args = {}) {
    return {
        name,
        arguments: args,
    };
}
/**
 * 创建模拟的工具结果
 */
export function createMockToolResult(text, isError = false) {
    return {
        content: [{ type: 'text', text }],
        isError,
    };
}
/**
 * 验证对象是否包含特定属性
 */
export function expectToHaveProperties(obj, properties) {
    properties.forEach(prop => {
        expect(obj).toHaveProperty(prop);
    });
}
/**
 * 异步重试函数
 */
export async function retry(fn, maxAttempts = 3, delay = 100) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                await sleep(delay * attempt);
            }
        }
    }
    throw lastError;
}
//# sourceMappingURL=test-helpers.js.map