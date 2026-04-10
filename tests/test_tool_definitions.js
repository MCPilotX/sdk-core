import { mcpilot } from '@mcpilotx/intentorch';

async function testToolDefinitions() {
  console.log('=== Testing Tool Definitions ===\n');
  
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
    
    // Get tools from SDK
    console.log('3. Getting tools from SDK...');
    const tools = mcpilot.listTools();
    console.log(`📦 SDK reports ${tools.length} tools`);
    
    if (tools.length > 0) {
      const readTextFileTool = tools.find(t => t.name === 'read_text_file');
      if (readTextFileTool) {
        console.log('\nFound read_text_file tool in SDK:');
        console.log('  Name:', readTextFileTool.name);
        console.log('  Description:', readTextFileTool.description.substring(0, 100) + '...');
        console.log('  Server:', readTextFileTool.serverName);
        
        // Try to get the raw tool definition
        console.log('\n4. Trying to access tool schema...');
        if (readTextFileTool.inputSchema) {
          console.log('  ✅ Tool schema available in SDK');
          console.log('  Schema type:', readTextFileTool.inputSchema.type);
          console.log('  Properties:', Object.keys(readTextFileTool.inputSchema.properties || {}));
          console.log('  Required:', readTextFileTool.inputSchema.required || []);
        } else {
          console.log('  ❌ Tool schema not available in SDK');
        }
      }
    }
    
    // Try to manually refresh tools
    console.log('\n5. Trying to manually refresh tools...');
    try {
      // This would require accessing internal MCP client
      console.log('  Need to access internal MCP client to refresh tools');
    } catch (error) {
      console.log('  Error:', error.message);
    }
    
    // Test if the issue is that tools are not loaded in MCP client
    console.log('\n6. Testing direct tool execution with different approaches...');
    
    // Approach 1: Try with 'name' parameter
    console.log('\n  Approach 1: Using "name" parameter');
    try {
      const result = await mcpilot.executeTool('read_text_file', {
        name: 'package.json'
      });
      console.log('  ✅ Success with "name" parameter');
    } catch (error) {
      console.log('  ❌ Failed with "name" parameter:', error.message.split('\n')[0]);
    }
    
    // Approach 2: Try with 'path' parameter
    console.log('\n  Approach 2: Using "path" parameter');
    try {
      const result = await mcpilot.executeTool('read_text_file', {
        path: 'package.json'
      });
      console.log('  ✅ Success with "path" parameter');
    } catch (error) {
      console.log('  ❌ Failed with "path" parameter:', error.message.split('\n')[0]);
    }
    
    // Approach 3: Try with both parameters
    console.log('\n  Approach 3: Using both "name" and "path" parameters');
    try {
      const result = await mcpilot.executeTool('read_text_file', {
        name: 'package.json',
        path: 'package.json'
      });
      console.log('  ✅ Success with both parameters');
    } catch (error) {
      console.log('  ❌ Failed with both parameters:', error.message.split('\n')[0]);
    }
    
    console.log('\n✅ Tool definitions test completed');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n')[0]);
    }
  }
}

// Run test
testToolDefinitions();