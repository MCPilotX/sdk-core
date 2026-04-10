import { mcpilot } from '@mcpilotx/intentorch';

async function singletonTest() {
  console.log('=== 测试 mcpilot 单例对象 ===\n');
  
  try {
    // 使用单例对象，不需要创建SDK实例
    console.log('1. 初始化MCP...');
    await mcpilot.initMCP();
    console.log('✅ MCP初始化成功\n');
    
    // 连接MCP服务器
    console.log('2. 连接MCP服务器...');
    const client = await mcpilot.connectMCPServer({
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem', '.']
      }
    }, 'filesystem');
    console.log('✅ MCP服务器连接成功\n');
    
    // 列出工具
    console.log('3. 列出可用工具...');
    const tools = mcpilot.listTools();
    console.log(`📦 可用工具数量: ${tools.length}`);
    
    if (tools.length > 0) {
      console.log('前5个工具:');
      tools.slice(0, 5).forEach((tool, i) => {
        console.log(`  ${i + 1}. ${tool.name} - ${tool.description}`);
      });
    }
    
    console.log('\n4. 测试工具执行...');
    
    // 尝试执行工具 - 使用正确的工具名和参数
    try {
      console.log('  尝试执行 list_files 工具...');
      const result = await mcpilot.executeTool('list_files', {
        directory: '.'
      });
      console.log('  ✅ list_files 执行成功');
      if (result.content && result.content[0]) {
        console.log('  结果:', result.content[0].text.substring(0, 200));
      } else {
        console.log('  结果:', JSON.stringify(result).substring(0, 200));
      }
    } catch (error) {
      console.log('  ❌ list_files 执行失败:', error.message);
      
      // 尝试另一个可能的工具名
      try {
        console.log('  尝试执行 read_file 工具...');
        const result2 = await mcpilot.executeTool('read_file', {
          path: 'package.json'
        });
        console.log('  ✅ read_file 执行成功');
        if (result2.content && result2.content[0]) {
          console.log('  结果:', result2.content[0].text.substring(0, 200));
        }
      } catch (error2) {
        console.log('  ❌ read_file 执行失败:', error2.message);
      }
    }
    
    console.log('\n✅ 单例对象测试完成');
    
  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error('错误:', error.message);
    if (error.stack) {
      console.error('堆栈:', error.stack.split('\n')[0]);
    }
  }
}

// 运行测试
singletonTest();