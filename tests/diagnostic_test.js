import { mcpilot } from '@mcpilotx/intentorch';

async function diagnosticTest() {
  console.log('=== 诊断测试：工具参数映射问题 ===\n');
  
  try {
    // 初始化
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
    
    // 获取工具列表并检查工具定义
    console.log('3. 检查工具定义...');
    const tools = mcpilot.listTools();
    
    // 查找 read_text_file 工具
    const readTextFileTool = tools.find(t => t.name === 'read_text_file');
    if (readTextFileTool) {
      console.log('找到 read_text_file 工具:');
      console.log('  描述:', readTextFileTool.description);
      console.log('  服务器:', readTextFileTool.serverName);
      
      // 尝试获取原始工具定义
      console.log('\n4. 尝试直接调用工具...');
      
      // 测试1: 使用 path 参数
      console.log('  测试1: 使用 path 参数');
      try {
        const result1 = await mcpilot.executeTool('read_text_file', {
          path: 'package.json'
        });
        console.log('  ✅ 使用 path 参数成功');
      } catch (error1) {
        console.log('  ❌ 使用 path 参数失败:', error1.message);
      }
      
      // 测试2: 使用 name 参数
      console.log('\n  测试2: 使用 name 参数');
      try {
        const result2 = await mcpilot.executeTool('read_text_file', {
          name: 'package.json'
        });
        console.log('  ✅ 使用 name 参数成功');
      } catch (error2) {
        console.log('  ❌ 使用 name 参数失败:', error2.message);
      }
      
      // 测试3: 同时使用 path 和 name 参数
      console.log('\n  测试3: 同时使用 path 和 name 参数');
      try {
        const result3 = await mcpilot.executeTool('read_text_file', {
          path: 'package.json',
          name: 'package.json'
        });
        console.log('  ✅ 同时使用两个参数成功');
      } catch (error3) {
        console.log('  ❌ 同时使用两个参数失败:', error3.message);
      }
    } else {
      console.log('❌ 未找到 read_text_file 工具');
    }
    
    // 检查其他相关工具
    console.log('\n5. 检查其他文件相关工具...');
    const fileTools = tools.filter(t => t.name.includes('file') || t.name.includes('directory'));
    console.log(`  找到 ${fileTools.length} 个文件/目录相关工具:`);
    fileTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description.substring(0, 60)}...`);
    });
    
    // 测试 list_directory 工具
    const listDirTool = tools.find(t => t.name === 'list_directory');
    if (listDirTool) {
      console.log('\n6. 测试 list_directory 工具...');
      
      // 测试不同的参数名
      const testCases = [
        { paramName: 'path', value: '.' },
        { paramName: 'directory', value: '.' },
        { paramName: 'name', value: '.' },
        { paramName: 'folder', value: '.' }
      ];
      
      for (const testCase of testCases) {
        console.log(`  测试参数名: ${testCase.paramName}`);
        try {
          const result = await mcpilot.executeTool('list_directory', {
            [testCase.paramName]: testCase.value
          });
          console.log(`  ✅ 使用 ${testCase.paramName} 参数成功`);
          break; // 如果成功，停止测试
        } catch (error) {
          console.log(`  ❌ 使用 ${testCase.paramName} 参数失败:`, error.message.split('\n')[0]);
        }
      }
    }
    
    console.log('\n✅ 诊断测试完成');
    
  } catch (error) {
    console.error('\n❌ 诊断测试失败:');
    console.error('错误:', error.message);
    if (error.stack) {
      console.error('堆栈:', error.stack.split('\n')[0]);
    }
  }
}

// 运行诊断测试
diagnosticTest();