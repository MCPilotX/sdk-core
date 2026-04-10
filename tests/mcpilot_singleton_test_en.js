import { mcpilot } from '@mcpilotx/intentorch';

async function singletonTest() {
  console.log('=== Testing mcpilot singleton object ===\n');
  
  try {
    // Use singleton object, no need to create SDK instance
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
    
    // List tools
    console.log('3. Listing available tools...');
    const tools = mcpilot.listTools();
    console.log(`📦 Available tools count: ${tools.length}`);
    
    if (tools.length > 0) {
      console.log('First 5 tools:');
      tools.slice(0, 5).forEach((tool, i) => {
        // Fix: tool is an object, not a string
        console.log(`  ${i + 1}. ${tool.name} - ${tool.description.substring(0, 80)}...`);
      });
    }
    
    console.log('\n4. Testing tool execution...');
    
    // Try to execute a tool - based on previous analysis, we need to use correct parameter names
    try {
      console.log('  Trying to execute list_directory tool...');
      // From diagnostic tests, we know list_directory might need 'path' parameter
      const result = await mcpilot.executeTool('list_directory', {
        path: '.'
      });
      console.log('  ✅ list_directory execution successful');
      if (result.content && result.content[0]) {
        console.log('  Result:', JSON.stringify(result.content[0]).substring(0, 200));
      }
    } catch (error) {
      console.log('  ❌ list_directory execution failed:', error.message);
      
      // Try read_text_file as alternative
      try {
        console.log('  Trying to execute read_text_file tool...');
        const result2 = await mcpilot.executeTool('read_text_file', {
          path: 'package.json'  // Based on error messages, this tool requires 'path' parameter
        });
        console.log('  ✅ read_text_file execution successful');
        if (result2.content && result2.content[0]) {
          const content = result2.content[0].text;
          console.log('  File content (first 200 chars):', content.substring(0, 200));
        }
      } catch (error2) {
        console.log('  ❌ read_text_file execution failed:', error2.message);
      }
    }
    
    console.log('\n5. Testing tool search functionality...');
    
    try {
      const searchResults = mcpilot.searchTools('file');
      console.log(`  Found ${searchResults.length} tools matching "file":`);
      searchResults.slice(0, 5).forEach((tool, i) => {
        console.log(`    ${i + 1}. ${tool.name}`);
      });
    } catch (error) {
      console.log('  ❌ Tool search failed:', error.message);
    }
    
    console.log('\n6. Testing server status...');
    
    try {
      const servers = mcpilot.listMCPServers();
      console.log(`  Connected servers: ${servers.length}`);
      servers.forEach((server, i) => {
        const status = mcpilot.getMCPServerStatus(server);
        console.log(`  Server ${i + 1}: ${server}, status: ${status?.connected ? 'connected' : 'disconnected'}`);
      });
    } catch (error) {
      console.log('  ❌ Server status check failed:', error.message);
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