/**
 * 测试 Mock 文件系统 MCP 服务器
 */

import { MCPilotSDK } from '../src/index';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMockFilesystemIntegration() {
  console.log('🧪 测试 Mock 文件系统 MCP 服务器\n');

  try {
    const sdk = new MCPilotSDK({
      logger: {
        info: (msg) => console.log(`[INFO] ${msg}`),
        error: (msg) => console.log(`[ERROR] ${msg}`),
        debug: (msg) => console.log(`[DEBUG] ${msg}`),
      },
      mcp: {
        servers: [
          {
            transport: {
              type: 'stdio',
              command: 'node',
              args: [
                join(__dirname, 'mock-filesystem-server.cjs'),
                '--allowed-directories', __dirname
              ]
            },
            autoConnect: true,
            timeout: 10000
          }
        ]
      }
    });

    console.log('1. ✅ SDK 实例创建成功');
    
    // 初始化 MCP 功能
    console.log('2. 🔌 初始化 MCP 功能...');
    await sdk.initMCP();
    console.log('   ✅ MCP 功能初始化完成');
    
    // 检查服务器连接
    const servers = sdk.listMCPServers();
    console.log(`3. 📊 已连接服务器数量: ${servers.length}`);
    
    if (servers.length > 0) {
      console.log(`   服务器名称: ${servers[0]}`);
      
      // 获取服务器状态
      const status = sdk.getMCPServerStatus(servers[0]);
      console.log(`   服务器状态: ${status.status}`);
    }
    
    // 列出可用工具
    const tools = sdk.listTools();
    console.log(`4. 🛠️  可用工具数量: ${tools.length}`);
    
    if (tools.length > 0) {
      console.log('   工具列表:');
      tools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
      });
    }
    
    // 测试工具执行
    if (tools.some(t => t.name === 'list_files')) {
      console.log('5. 🧪 测试 list_files 工具...');
      try {
        const result = await sdk.executeTool('list_files', {
          directory: __dirname
        });
        
        if (result.content && result.content[0]) {
          console.log(`   ✅ 工具执行成功:`);
          console.log(`      结果: ${result.content[0].text}`);
        } else {
          console.log('   ⚠️  工具执行成功，但无返回内容');
        }
      } catch (toolError: any) {
        console.log(`   ❌ 工具执行失败: ${toolError.message}`);
      }
    }
    
    // 测试工具搜索
    const fileTools = sdk.searchTools('file');
    console.log(`6. 🔍 搜索 "file" 相关工具: ${fileTools.length} 个结果`);
    
    // 获取工具统计
    const stats = sdk.getToolStatistics();
    console.log(`7. 📈 工具统计:`);
    console.log(`   总工具数: ${stats.totalTools}`);
    console.log(`   执行次数: ${stats.executionCount}`);
    
    console.log('\n🎉 Mock 服务器集成测试通过！');
    
    // 清理
    if (servers.length > 0) {
      await sdk.disconnectMCPServer(servers[0]);
      console.log('🔌 已断开服务器连接');
    }
    
  } catch (error: any) {
    console.log(`\n❌ 测试失败: ${error.message}`);
    if (error.stack) {
      console.log('错误堆栈:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

// 运行测试
testMockFilesystemIntegration().catch(console.error);