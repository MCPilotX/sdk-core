/**
 * MCPilot SDK HTTP Transport Configuration Example
 * Demonstrates how to use HTTP transport as an alternative to stdio transport,
 * solving the issue where stdio cannot properly handle standard output
 */

import { MCPilotSDK } from '../src/index';

async function runHTTPTransportDemo() {
  console.log('🚀 MCPilot SDK HTTP Transport Configuration Example\n');
  console.log('Problem Background:');
  console.log('  stdio transport, when handling certain MCP servers, treats normal output as JSON, causing errors');
  console.log('  This is because some servers output log information during startup, which is not in JSONRPC format');
  console.log('  Using HTTP transport avoids this problem because HTTP transport only processes HTTP responses\n');

  // ==================== Example 1: Basic HTTP Transport Configuration ====================
  
  console.log('📦 Example 1: Basic HTTP Transport Configuration');
  console.log('----------------------------------------');
  
  try {
    const sdk = new MCPilotSDK({
      logger: {
        info: (msg) => console.log(`[INFO] ${msg}`),
        error: (msg) => console.error(`[ERROR] ${msg}`),
        debug: (msg) => console.debug(`[DEBUG] ${msg}`),
      },
      mcp: {
        autoConnect: true,
        servers: [
          {
            // Use HTTP transport instead of stdio
            transport: {
              type: 'http' as const,  // Specify transport type as HTTP
              url: 'http://localhost:3000/mcp',  // MCP server HTTP endpoint
              // Optional: Add custom headers
              headers: {
                'Authorization': 'Bearer your-token-here',
                'X-Custom-Header': 'custom-value'
              }
            },
            autoConnect: true,
            timeout: 30000,
          },
        ],
      },
    });

    console.log('✅ SDK instance created successfully, using HTTP transport configuration');
    console.log('   Transport type: http');
    console.log('   Server address: http://localhost:3000/mcp');
    console.log('   Timeout: 30000ms\n');
  } catch (error) {
    console.log('❌ SDK creation failed:', error.message, '\n');
  }

  // ==================== Example 2: Multiple MCP Server Configuration ====================
  
  console.log('🔌 Example 2: Multiple MCP Server Configuration');
  console.log('----------------------------------------');
  
  try {
    const sdk = new MCPilotSDK({
      logger: {
        info: (msg) => console.log(`[INFO] ${msg}`),
        error: (msg) => console.error(`[ERROR] ${msg}`),
        debug: (msg) => console.debug(`[DEBUG] ${msg}`),
      },
      mcp: {
        autoConnect: true,
        servers: [
          {
            // First server: HTTP transport
            transport: {
              type: 'http' as const,
              url: 'http://localhost:3001/mcp',
              headers: {
                'Authorization': 'Bearer token-1'
              }
            },
            autoConnect: true,
            timeout: 30000,
          },
          {
            // Second server: HTTP transport, different port
            transport: {
              type: 'http' as const,
              url: 'http://localhost:3002/mcp',
              headers: {
                'Authorization': 'Bearer token-2'
              }
            },
            autoConnect: true,
            timeout: 30000,
          },
          {
            // Third server: SSE transport (if server push is needed)
            transport: {
              type: 'sse' as const,
              url: 'http://localhost:3003/mcp/sse',
            },
            autoConnect: true,
            timeout: 30000,
          }
        ],
      },
    });

    console.log('✅ Multiple server configuration successful');
    console.log('   Server 1: HTTP - http://localhost:3001/mcp');
    console.log('   Server 2: HTTP - http://localhost:3002/mcp');
    console.log('   Server 3: SSE  - http://localhost:3003/mcp/sse\n');
  } catch (error) {
    console.log('❌ Multiple server configuration failed:', error.message, '\n');
  }

  // ==================== 示例 3: 与 stdio 传输对比 ====================
  
  console.log('⚖️  示例 3: HTTP 与 stdio 传输对比');
  console.log('----------------------------------------');
  
  console.log('stdio 传输配置（有问题）:');
  console.log(`
    transport: {
      type: 'stdio',
      command: 'npx',
      args: [
        '@agent-infra/mcp-server-filesystem',
        '--allowed-directories',
        __dirname,
      ],
    }
  `);
  
  console.log('\n问题分析:');
  console.log('  1. stdio 传输会启动子进程并读取其 stdout/stderr');
  console.log('  2. 某些 MCP 服务器会在启动时输出日志信息（如 "Server started on port XXXX"）');
  console.log('  3. 这些非 JSON 格式的输出会被错误地尝试解析为 JSONRPC 消息');
  console.log('  4. 导致解析错误和连接失败\n');
  
  console.log('HTTP 传输配置（解决方案）:');
  console.log(`
    transport: {
      type: 'http',
      url: 'http://localhost:3000/mcp',
      headers: {
        'Authorization': 'Bearer your-token'
      }
    }
  `);
  
  console.log('\n优势:');
  console.log('  1. 只处理 HTTP 响应，不会误解析日志输出');
  console.log('  2. 支持标准的 HTTP 认证和头部');
  console.log('  3. 更容易调试（可以使用 curl 等工具测试）');
  console.log('  4. 支持跨网络连接');
  console.log('  5. 更好的错误处理和重试机制\n');

  // ==================== 示例 4: 实际使用示例 ====================
  
  console.log('🚀 示例 4: 实际使用示例');
  console.log('----------------------------------------');
  
  try {
    // 假设我们有一个运行在 localhost:8080 的 MCP 服务器
    const sdk = new MCPilotSDK({
      logger: {
        info: (msg) => console.log(`[INFO] ${msg}`),
        error: (msg) => console.error(`[ERROR] ${msg}`),
        debug: (msg) => console.debug(`[DEBUG] ${msg}`),
      },
      mcp: {
        autoConnect: true,
        servers: [
          {
            transport: {
              type: 'http' as const,
              url: 'http://localhost:8080/mcp',
              // 如果服务器需要认证
              headers: {
                'Authorization': 'Bearer your-api-key',
                'Content-Type': 'application/json'
              }
            },
            autoConnect: true,
            timeout: 30000,
            maxRetries: 3,  // 添加重试机制
          },
        ],
      },
    });

    console.log('✅ 实际使用配置示例:');
    console.log('   1. 创建 SDK 实例，配置 HTTP 传输');
    console.log('   2. 设置认证头部（如果需要）');
    console.log('   3. 配置超时和重试机制');
    console.log('   4. 自动连接服务器\n');
    
    console.log('使用步骤:');
    console.log('   1. 确保 MCP 服务器在 http://localhost:8080/mcp 运行');
    console.log('   2. 调用 sdk.initMCP() 初始化 MCP 功能');
    console.log('   3. 使用 sdk.listTools() 查看可用工具');
    console.log('   4. 使用 sdk.executeTool() 执行工具\n');
  } catch (error) {
    console.log('❌ 示例配置失败:', error.message, '\n');
  }

  // ==================== 示例 5: 错误处理和调试 ====================
  
  console.log('🐛 示例 5: 错误处理和调试');
  console.log('----------------------------------------');
  
  console.log('常见问题及解决方案:');
  console.log('  1. 连接失败: 检查服务器是否运行，URL 是否正确');
  console.log('  2. 认证失败: 检查 Authorization 头部是否正确');
  console.log('  3. 超时错误: 增加 timeout 值或检查网络连接');
  console.log('  4. CORS 问题: 确保服务器配置了正确的 CORS 头部\n');
  
  console.log('调试命令:');
  console.log('  # 测试服务器是否响应');
  console.log('  curl -X POST http://localhost:8080/mcp \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d \'{"jsonrpc":"2.0","id":1,"method":"tools/list"}\'');
  console.log('');
  console.log('  # 查看服务器日志');
  console.log('  tail -f /path/to/server.log');
  console.log('');

  console.log('🎉 HTTP 传输配置示例完成！');
  console.log('\n📋 总结:');
  console.log('  - HTTP 传输解决了 stdio 传输误解析日志的问题');
  console.log('  - 配置更灵活，支持认证、头部等 HTTP 特性');
  console.log('  - 更容易调试和维护');
  console.log('  - 支持跨网络连接，适合分布式部署');
  console.log('\n🚀 下一步:');
  console.log('  1. 修改你的代码，将 stdio 传输改为 http 传输');
  console.log('  2. 确保 MCP 服务器提供 HTTP 端点');
  console.log('  3. 测试连接和工具调用');
}

// 运行示例
runHTTPTransportDemo().catch(console.error);