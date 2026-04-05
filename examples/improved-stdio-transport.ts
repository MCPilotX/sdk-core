/**
 * 改进的 stdio 传输处理方案
 * 处理不规范的 MCP 服务器输出（该输出的不输出，不该输出的却输出了）
 */

import { MCPilotSDK } from '../src/index';

/**
 * 方案 1：使用智能缓冲和消息边界检测
 * 
 * 问题：某些 MCP 服务器输出不规范：
 * 1. 在 stdout 输出非 JSON 日志
 * 2. JSON 消息可能被分割成多个 chunk
 * 3. 消息边界不清晰
 * 
 * 解决方案：实现智能的消息解析器
 */
class ImprovedStdioHandler {
  private buffer: string = '';
  private inJsonMessage: boolean = false;
  private jsonDepth: number = 0;
  
  /**
   * 处理原始输出数据
   */
  handleData(data: string): string[] {
    const messages: string[] = [];
    this.buffer += data;
    
    let i = 0;
    while (i < this.buffer.length) {
      const char = this.buffer[i];
      
      // 检测 JSON 开始
      if (char === '{' && !this.inJsonMessage) {
        this.inJsonMessage = true;
        this.jsonDepth = 1;
      } 
      // 跟踪 JSON 嵌套深度
      else if (this.inJsonMessage) {
        if (char === '{') this.jsonDepth++;
        else if (char === '}') this.jsonDepth--;
        
        // JSON 消息结束
        if (this.jsonDepth === 0) {
          const message = this.buffer.substring(0, i + 1);
          if (this.isValidJson(message)) {
            messages.push(message);
          }
          this.buffer = this.buffer.substring(i + 1);
          this.inJsonMessage = false;
          i = -1; // 重置索引，重新处理剩余 buffer
        }
      }
      i++;
    }
    
    // 处理 buffer 中的非 JSON 内容（日志）
    if (!this.inJsonMessage && this.buffer.trim()) {
      this.handleLogOutput(this.buffer);
      this.buffer = '';
    }
    
    return messages;
  }
  
  private isValidJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
  
  private handleLogOutput(log: string): void {
    const trimmed = log.trim();
    if (trimmed) {
      console.log(`[MCP Server Log] ${trimmed}`);
    }
  }
}

/**
 * 方案 2：使用配置化的日志过滤器
 */
interface LogFilterConfig {
  // 要忽略的日志模式（正则表达式）
  ignorePatterns: RegExp[];
  // 要保留的日志模式（即使匹配了 ignorePatterns）
  keepPatterns: RegExp[];
  // 是否启用详细日志
  verbose: boolean;
}

class ConfigurableStdioHandler {
  private config: LogFilterConfig;
  private buffer: string = '';
  
  constructor(config: Partial<LogFilterConfig> = {}) {
    this.config = {
      ignorePatterns: [
        /^Server (running|started|listening)/i,
        /^Secure MCP/,
        /^Allowed directories:/,
        /^\[\d{4}-\d{2}-\d{2}/, // 时间戳日志
        /^\[INFO\]/,
        /^\[DEBUG\]/,
        /^\[WARN\]/,
        /^\[ERROR\]/,
      ],
      keepPatterns: [
        /FATAL/i,
        /CRITICAL/i,
      ],
      verbose: false,
      ...config
    };
  }
  
  handleData(data: string): string[] {
    const messages: string[] = [];
    const lines = data.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // 检查是否是 JSON 消息
      if (this.isJsonMessage(trimmed)) {
        messages.push(trimmed);
        continue;
      }
      
      // 检查是否应该忽略此日志
      const shouldIgnore = this.config.ignorePatterns.some(pattern => 
        pattern.test(trimmed)
      );
      
      // 检查是否应该保留此日志（即使匹配了忽略模式）
      const shouldKeep = this.config.keepPatterns.some(pattern =>
        pattern.test(trimmed)
      );
      
      if (!shouldIgnore || shouldKeep) {
        this.handleLog(trimmed, shouldIgnore);
      }
    }
    
    return messages;
  }
  
  private isJsonMessage(str: string): boolean {
    return str.startsWith('{') && str.endsWith('}');
  }
  
  private handleLog(log: string, ignored: boolean): void {
    if (this.config.verbose || !ignored) {
      const prefix = ignored ? '[Ignored Log]' : '[MCP Log]';
      console.log(`${prefix} ${log}`);
    }
  }
}

/**
 * 方案 3：使用 SDK 的扩展配置
 */
async function demonstrateImprovedStdioHandling() {
  console.log('🚀 改进的 stdio 传输处理方案\n');
  
  console.log('问题场景：');
  console.log('  MCP 服务器输出不规范：');
  console.log('  1. 在 stdout 输出非 JSON 日志（如 "Starting server..."）');
  console.log('  2. JSON 消息可能被分割');
  console.log('  3. 错误信息输出到 stdout 而不是 stderr');
  console.log('  4. 缺少消息边界标记\n');
  
  console.log('解决方案 1：智能缓冲和消息边界检测');
  console.log('----------------------------------------');
  
  const handler1 = new ImprovedStdioHandler();
  const testData1 = [
    'Starting MCP server on port 3000...\n',
    'Server ready!\n',
    '{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}',
    '\nDebug: Processing request\n',
    '{"jsonrpc":"2.0","id":2,"result":{"status":"ok"}}'
  ].join('');
  
  console.log('测试数据：');
  console.log(testData1);
  console.log('\n处理结果：');
  const messages1 = handler1.handleData(testData1);
  messages1.forEach((msg, i) => {
    console.log(`消息 ${i + 1}: ${msg}`);
  });
  
  console.log('\n解决方案 2：配置化的日志过滤器');
  console.log('----------------------------------------');
  
  const handler2 = new ConfigurableStdioHandler({
    ignorePatterns: [
      /^Starting/,
      /^Server/,
      /^Debug:/,
      /^\[.*\]/,
    ],
    verbose: true
  });
  
  const testData2 = `Starting server...
[INFO] Server started on port 3000
Debug: Initializing tools
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
[ERROR] Something went wrong!
FATAL: Critical error occurred
{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}`;
  
  console.log('测试数据：');
  console.log(testData2);
  console.log('\n处理结果：');
  const messages2 = handler2.handleData(testData2);
  messages2.forEach((msg, i) => {
    console.log(`JSON 消息 ${i + 1}: ${msg}`);
  });
  
  console.log('\n解决方案 3：实际 SDK 集成建议');
  console.log('----------------------------------------');
  
  console.log('要集成到现有 SDK，可以：');
  console.log('1. 扩展 Transport 接口，添加日志过滤配置');
  console.log('2. 在 StdioTransport 中添加智能消息解析');
  console.log('3. 提供配置选项让用户自定义过滤规则\n');
  
  console.log('示例配置：');
  console.log(`
const sdk = new MCPilotSDK({
  mcp: {
    servers: [{
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['@agent-infra/mcp-server-filesystem'],
        // 新增：日志过滤配置
        logFilter: {
          ignorePatterns: [
            /^Server/,
            /^\\[INFO\\]/,
            /^\\[DEBUG\\]/
          ],
          bufferSize: 8192,  // 缓冲区大小
          timeout: 1000,     // 消息超时时间
        }
      }
    }]
  }
});
  `);
  
  console.log('\n🎉 改进方案总结');
  console.log('----------------------------------------');
  console.log('核心思路：');
  console.log('  1. 不要假设所有 stdout 输出都是 JSON');
  console.log('  2. 实现智能的 JSON 检测和提取');
  console.log('  3. 提供可配置的日志过滤规则');
  console.log('  4. 正确处理消息边界和缓冲');
  console.log('');
  console.log('实现建议：');
  console.log('  1. 修改 src/mcp/transport.ts 中的 handleMessage 方法');
  console.log('  2. 添加消息缓冲和边界检测逻辑');
  console.log('  3. 提供配置选项让用户调整过滤行为');
  console.log('  4. 保持向后兼容性');
}

// 运行演示
demonstrateImprovedStdioHandling().catch(console.error);