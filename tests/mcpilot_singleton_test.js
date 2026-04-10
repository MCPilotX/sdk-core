import { mcpilot } from '@mcpilotx/intentorch';

async function singletonTest() {
  console.log('=== Testing mcpilot singleton object ===\n');
  
  try {
    // Use singleton object, no need to create SDK instance
    console.log('1. Initializing MCP...');
    await mcpilot.initMCP();
    console.log('✅ MCP initialization successful\n');
    
    // Connect MCP server
    console.log('2. Connecting MCP server...');
    const client = await mcpilot.connectMCPServer({
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem', '.']
      }
    }, 'filesystem');
    console.log('✅ MCP server connection successful\n');
    
    // List tools
    console.log('3. Listing available tools...');
    const tools = mcpilot.listTools();
    console.log(`📦 Available tools count: ${tools.length}`);
    
    if (tools.length > 0) {
      console.log('Top 5 tools:');
      tools.slice(0, 5).forEach((tool, i) => {
        console.log(`  ${i + 1}. ${tool.name} - ${tool.description || 'No description'}`);
      });
    }
    
    console.log('\n4. Testing tool execution...');
    
    // Try to execute tool
    try {
      console.log('  Attempting to execute list_directory tool...');
      const result = await mcpilot.executeTool('list_directory', {
        path: '.'
      });
      console.log('  ✅ list_directory execution successful');
      console.log('  Result:', JSON.stringify(result).substring(0, 200));
    } catch (error) {
      console.log('  ❌ list_directory execution failed:', error.message);
    }
    
    console.log('\n✅ Singleton object test completed');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n')[0]);
    }
  }
}

// Run test
singletonTest();
