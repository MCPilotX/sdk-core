import { mcpilot } from '@mcpilotx/intentorch';

async function debugTest() {
  console.log('=== Debug Test ===\n');
  
  try {
    // Initialize
    console.log('1. Initializing MCP...');
    await mcpilot.initMCP();
    console.log('✅ MCP initialization successful\n');
    
    // Connect to MCP server
    console.log('2. Connecting to MCP server...');
    const client = await mcpilot.connectMCPServer({
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem', '.']
      }
    }, 'filesystem');
    console.log('✅ MCP server connection successful\n');
    
    // Try to execute read_text_file with detailed error handling
    console.log('3. Testing read_text_file with detailed error...');
    try {
      const result = await mcpilot.executeTool('read_text_file', {
        path: 'package.json'
      });
      console.log('✅ SUCCESS!');
      console.log('Result:', JSON.stringify(result, null, 2).substring(0, 500));
    } catch (error) {
      console.log('❌ FAILED with full error:');
      console.log('Error message:', error.message);
      console.log('Full error:', error);
      
      // Try to get more info about the tool
      console.log('\n4. Getting tool info...');
      const tools = mcpilot.listTools();
      const tool = tools.find(t => t.name === 'read_text_file');
      if (tool) {
        console.log('Tool found:', tool.name);
        console.log('Description:', tool.description);
        console.log('Server:', tool.serverName);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

// Run test
debugTest();