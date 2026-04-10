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
      console.log('所有工具:');
      tools.forEach((tool, i) => {
        console.log(`  ${i + 1}. ${tool.name} - ${tool.description.substring(0, 80)}...`);
      });
    }
    
    console.log('\n4. 测试工具执行...');
    
    // 尝试执行 read_text_file 工具（从工具列表看这是推荐的工具）
    try {
      console.log('  尝试执行 read_text_file 工具...');
      const result = await mcpilot.executeTool('read_text_file', {
        name: 'package.json'  // 注意：参数名是 name，不是 path
      });
      console.log('  ✅ read_text_file 执行成功');
      if (result.content && result.content[0]) {
        const content = result.content[0].text;
        console.log('  文件内容前200字符:', content.substring(0, 200));
        console.log('  文件大小:', content.length, '字符');
      }
    } catch (error) {
      console.log('  ❌ read_text_file 执行失败:', error.message);
    }
    
    // 测试另一个工具：read_multiple_files
    try {
      console.log('\n  尝试执行 read_multiple_files 工具...');
      const result = await mcpilot.executeTool('read_multiple_files', {
        names: ['package.json', 'README.md']
      });
      console.log('  ✅ read_multiple_files 执行成功');
      if (result.content && result.content.length > 0) {
        console.log(`  成功读取了 ${result.content.length} 个文件`);
        result.content.forEach((item, i) => {
          console.log(`  文件 ${i + 1}: ${item.path}, 大小: ${item.text?.length || 0} 字符`);
        });
      }
    } catch (error) {
      console.log('  ❌ read_multiple_files 执行失败:', error.message);
    }
    
    console.log('\n5. 测试工具搜索功能...');
    
    // 测试搜索工具
    try {
      const searchResults = mcpilot.searchTools('file');
      console.log(`  搜索 "file" 找到 ${searchResults.length} 个工具:`);
      searchResults.forEach((tool, i) => {
        console.log(`    ${i + 1}. ${tool.name}`);
      });
    } catch (error) {
      console.log('  ❌ 工具搜索失败:', error.message);
    }
    
    console.log('\n6. 测试服务器状态...');
    
    // 测试获取服务器状态
    try {
      const servers = mcpilot.listMCPServers();
      console.log(`  已连接服务器: ${servers.length}`);
      servers.forEach((server, i) => {
        const status = mcpilot.getMCPServerStatus(server);
        console.log(`  服务器 ${i + 1}: ${server}, 状态: ${status?.connected ? '已连接' : '未连接'}`);
      });
    } catch (error) {
      console.log('  ❌ 获取服务器状态失败:', error.message);
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