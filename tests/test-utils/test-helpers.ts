/**
 * 测试辅助工具
 */
export function createMockTool(name: string, description: string) {
  return {
    name,
    description,
    inputSchema: {
      type: 'object' as const,
      properties: {
        param: { type: 'string' as const },
      },
      required: ['param'],
    },
  };
}

export function createMockExecutor(result: any) {
  return async (args: any) => ({
    content: [{ type: 'text' as const, text: result }],
    isError: false,
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建模拟的MCP工具调用
 */
export function createMockToolCall(name: string, args: Record<string, any> = {}) {
  return {
    name,
    arguments: args,
  };
}

/**
 * 创建模拟的工具结果
 */
export function createMockToolResult(text: string, isError: boolean = false) {
  return {
    content: [{ type: 'text' as const, text }],
    isError,
  };
}

/**
 * 验证对象是否包含特定属性
 */
export function expectToHaveProperties(obj: any, properties: string[]) {
  properties.forEach(prop => {
    expect(obj).toHaveProperty(prop);
  });
}

/**
 * 异步重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 100
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await sleep(delay * attempt);
      }
    }
  }
  
  throw lastError!;
}