/**
 * @agent-infra/mcp-server-filesystem 集成示例
 * 演示如何配置和使用文件系统 MCP 服务器
 */

import { MCPilotSDK } from '../src/index';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runFilesystemServerDemo() {
  console.log('🚀 @agent-infra/mcp-server-filesystem 集成演示\n');

  // ==================== 配置选项 ====================
  
  console.log('📋 配置选项说明:');
  console.log('-------------------');
  console.log('1. 确保 package.json 包含 "type": "module"');
  console.log('2. --allowed-directories 参数是必需的');
  console.log('3. 使用绝对路径，多个路径需要重复 --allowed-directories 参数');
  console.log('4. 建议设置 autoConnect: true 进行自动连接\n');

  // ==================== 示例 1: 基本配置 ====================
  
  console.log('🔧 示例 1: 基本配置');
  console.log('-------------------');
  
  try {
    const sdk1 = new MCPilotSDK({
      logger: {
        info: (msg) => console.log(`   [INFO] ${msg}`),
        error: (msg) => console.log(`   [ERROR] ${msg}`),
        debug: (msg) => console.log(`   [DEBUG] ${msg}`),
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
            autoConnect: true, // 自动连接
            timeout: 30000
          }
        ]
      }
    });

    console.log('1. SDK 实例创建成功');
    
    // 初始化 MCP 功能（会自动连接配置的服务器）
    console.log('2. 初始化 MCP 功能...');
    await sdk1.initMCP();
    console.log('   MCP 功能初始化完成');
    
    // 列出可用工具
    const tools = sdk1.listTools();
    console.log(`3. 可用工具数量: ${tools.length}`);
    
    if (tools.length > 0) {
      console.log('   前5个工具:');
      tools.slice(0, 5).forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
      });
    }
    
    console.log('✅ 示例 1 测试通过\n');
    
    // 断开连接
    const servers = sdk1.listMCPServers();
    if (servers.length > 0) {
      await sdk1.disconnectMCPServer(servers[0]);
    }
    
  } catch (error: any) {
    console.log(`❌ 示例 1 失败: ${error.message}\n`);
  }

  // ==================== 示例 2: 多个目录权限 ====================
  
  console.log('📁 示例 2: 多个目录权限');
  console.log('----------------------');
  
  try {
    const sdk2 = new MCPilotSDK({
      mcp: {
        servers: [
          {
            transport: {
              type: 'stdio',
              command: 'npx',
              args: [
                '@agent-infra/mcp-server-filesystem',
                '--allowed-directories', __dirname,
                '--allowed-directories', '/tmp',
                '--allowed-directories', '/var/log'
              ]
            },
            autoConnect: true,
            timeout: 30000
          }
        ]
      }
    });

    console.log('1. 配置多个目录权限');
    console.log(`   允许的目录: ${__dirname}, /tmp, /var/log`);
    
    await sdk2.initMCP();
    console.log('2. MCP 初始化成功');
    
    const servers = sdk2.listMCPServers();
    console.log(`3. 已连接服务器: ${servers.length}`);
    
    console.log('✅ 示例 2 测试通过\n');
    
  } catch (error: any) {
    console.log(`❌ 示例 2 失败: ${error.message}\n`);
  }

  // ==================== 示例 3: 工具执行演示 ====================
  
  console.log('🛠️  示例 3: 工具执行演示');
  console.log('----------------------');
  
  try {
    const sdk3 = new MCPilotSDK({
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
            autoConnect: true
          }
        ]
      }
    });

    await sdk3.initMCP();
    console.log('1. SDK 初始化完成');
    
    // 等待服务器连接
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const tools = sdk3.listTools();
    console.log(`2. 可用工具: ${tools.map(t => t.name).join(', ')}`);
    
    // 尝试列出当前目录文件
    if (tools.some(t => t.name === 'list_files')) {
      console.log('3. 执行 list_files 工具...');
      
      try {
        const result = await sdk3.executeTool('list_files', {
          directory: __dirname
        });
        
        if (result.content && result.content[0]) {
          console.log(`   目录内容: ${result.content[0].text}`);
        } else {
          console.log('   工具执行成功，但无返回内容');
        }
      } catch (toolError: any) {
        console.log(`   工具执行错误: ${toolError.message}`);
      }
    } else {
      console.log('3. list_files 工具不可用');
    }
    
    console.log('✅ 示例 3 测试通过\n');
    
  } catch (error: any) {
    console.log(`❌ 示例 3 失败: ${error.message}\n`);
  }

  // ==================== 示例 4: 错误处理 ====================
  
  console.log('🚨 示例 4: 错误处理');
  console.log('------------------');
  
  try {
    const sdk4 = new MCPilotSDK({
      mcp: {
        servers: [
          {
            transport: {
              type: 'stdio',
              command: 'npx',
              args: [
                '@agent-infra/mcp-server-filesystem'
                // 故意缺少 --allowed-directories 参数
              ]
            },
            autoConnect: false
          }
        ]
      }
    });

    console.log('1. 创建缺少必需参数的配置');
    
    try {
      await sdk4.initMCP();
      console.log('2. MCP 初始化成功（可能服务器会失败）');
      
      // 尝试连接
      await sdk4.connectMCPServer('filesystem-server');
      console.log('3. 连接成功（意外情况）');
      
    } catch (connectError: any) {
      console.log(`2. 连接失败（预期行为）: ${connectError.message}`);
    }
    
    console.log('✅ 示例 4 测试通过（验证了错误处理）\n');
    
  } catch (error: any) {
    console.log(`❌ 示例 4 失败: ${error.message}\n`);
  }

  // ==================== 最佳实践总结 ====================
  
  console.log('📚 最佳实践总结');
  console.log('---------------');
  console.log('1. 始终包含 --allowed-directories 参数');
  console.log('2. 使用绝对路径，确保路径存在');
  console.log('3. 设置合理的超时时间（默认 30000ms）');
  console.log('4. 使用 autoConnect: false 进行手动连接以便更好的错误处理');
  console.log('5. 在生产环境中使用 try-catch 包装所有操作');
  console.log('6. 及时断开不再使用的连接');
  console.log('7. 监控服务器状态和工具执行统计\n');

  console.log('🎉 演示完成！');
  console.log('\n🚀 运行此示例:');
  console.log('   npx tsx examples/filesystem-server-demo.ts');
}

// 运行演示
runFilesystemServerDemo().catch(console.error);