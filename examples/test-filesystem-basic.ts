/**
 * 测试 @agent-infra/mcp-server-filesystem 基本功能
 */

import { MCPilotSDK } from '../src/index';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testBasicFilesystemIntegration() {
  console.log('🧪 测试文件系统 MCP 服务器基本集成\n');

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
              command: 'npx',
              args: [
                '@agent-infra/mcp-server-filesystem',
                '--allowed-directories', __dirname
              ]
            },
            autoConnect: true,
            timeout: 30000
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
    
    // 测试工具搜索
    const fileTools = sdk.searchTools('file');
    console.log(`5. 🔍 搜索 "file" 相关工具: ${fileTools.length} 个结果`);
    
    // 获取工具统计
    const stats = sdk.getToolStatistics();
    console.log(`6. 📈 工具统计:`);
    console.log(`   总工具数: ${stats.totalTools}`);
    console.log(`   按服务器分布:`, stats.toolsByServer || {});
    
    console.log('\n🎉 基本集成测试通过！');
    
    // 清理
    if (servers.length > 0) {
      await sdk.disconnectMCPServer(servers[0]);
      console.log('🔌 已断开服务器连接');
    }
    
  } catch (error: any) {
    console.log(`\n❌ 测试失败: ${error.message}`);
    console.log('错误堆栈:', error.stack);
  }
}

// 运行测试
testBasicFilesystemIntegration().catch(console.error);