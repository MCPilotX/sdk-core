/**
 * Check tool schema for get-tickets tool
 */

async function checkToolSchema() {
  try {
    console.log('=== 检查工具参数schema ===\n');
    
    // 加载工具注册表
    const corePath = '/Users/liuyaping/workspace/mcpilotx/IntentOrch/packages/core';
    const registryModule = require(corePath + '/dist/tool-registry/registry.js');
    const registry = registryModule.getToolRegistry();
    
    await registry.load();
    const allTools = await registry.getAllTools();
    
    console.log(`总工具数: ${allTools.length}`);
    
    // 查找get-tickets工具
    const getTicketsTool = allTools.find(tool => tool.name === 'get-tickets');
    
    if (getTicketsTool) {
      console.log('\n✅ 找到get-tickets工具:');
      console.log('工具名称:', getTicketsTool.name);
      console.log('服务器名称:', getTicketsTool.serverName);
      console.log('描述:', getTicketsTool.description);
      console.log('\n参数schema:');
      
      if (getTicketsTool.parameters) {
        console.log(JSON.stringify(getTicketsTool.parameters, null, 2));
        
        // 检查参数名
        console.log('\n参数名列表:');
        Object.keys(getTicketsTool.parameters).forEach(key => {
          const param = getTicketsTool.parameters[key];
          console.log(`  - ${key}: ${param.type || 'unknown'} ${param.required ? '(required)' : ''}`);
          if (param.description) console.log(`    描述: ${param.description}`);
        });
      } else {
        console.log('  无参数信息');
      }
      
      // 检查inputSchema
      console.log('\ninputSchema:');
      if (getTicketsTool.inputSchema) {
        console.log(JSON.stringify(getTicketsTool.inputSchema, null, 2));
      } else {
        console.log('  无inputSchema信息');
      }
    } else {
      console.log('\n❌ 未找到get-tickets工具');
      console.log('可用工具:');
      allTools.slice(0, 10).forEach((tool, i) => {
        console.log(`  ${i+1}. ${tool.name} (${tool.serverName})`);
      });
    }
    
  } catch (error) {
    console.error('错误:', error);
  }
}

checkToolSchema();