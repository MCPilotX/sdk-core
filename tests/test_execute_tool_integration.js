// Test if executeTool method correctly integrates ParameterMapper
import { ToolRegistry } from '../dist/mcp/tool-registry.js';

async function testExecuteToolIntegration() {
  console.log('=== Testing executeTool method integration with ParameterMapper ===\n');
  
  const toolRegistry = new ToolRegistry();
  
  // Mock a tool definition (similar to list_directory)
  const mockTool = {
    name: 'list_directory',
    description: 'List directory contents',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      required: ['name'],
      additionalProperties: false
    }
  };
  
  // Mock tool executor
  const mockExecutor = async (args) => {
    console.log('   Tool executor called with args:', args);
    return {
      content: [{ type: 'text', text: `Directory listing for: ${args.name}` }],
      isError: false
    };
  };
  
  // Register mock tool
  toolRegistry.registerTool(mockTool, mockExecutor, {
    serverId: 'test-server',
    serverName: 'Test Server'
  });
  
  console.log('1. Testing tool call with path parameter:');
  console.log('   Call: executeTool("list_directory", { path: "." })');
  
  try {
    const result = await toolRegistry.executeTool({
      name: 'list_directory',
      arguments: { path: '.' }
    });
    
    console.log(`   Result: ${result.isError ? '❌ Failed' : '✅ Success'}`);
    if (result.isError) {
      console.log(`   Error: ${result.content[0].text}`);
    } else {
      console.log(`   Success: ${result.content[0].text}`);
    }
  } catch (error) {
    console.log(`   ❌ Execution exception: ${error.message}`);
  }
  
  console.log('\n2. Testing tool call with name parameter:');
  console.log('   Call: executeTool("list_directory", { name: "." })');
  
  try {
    const result = await toolRegistry.executeTool({
      name: 'list_directory',
      arguments: { name: '.' }
    });
    
    console.log(`   Result: ${result.isError ? '❌ Failed' : '✅ Success'}`);
    if (result.isError) {
      console.log(`   Error: ${result.content[0].text}`);
    } else {
      console.log(`   Success: ${result.content[0].text}`);
    }
  } catch (error) {
    console.log(`   ❌ Execution exception: ${error.message}`);
  }
  
  console.log('\n3. Testing tool call with invalid parameter:');
  console.log('   Call: executeTool("list_directory", { invalid: "." })');
  
  try {
    const result = await toolRegistry.executeTool({
      name: 'list_directory',
      arguments: { invalid: '.' }
    });
    
    console.log(`   Result: ${result.isError ? '❌ Failed' : '✅ Success'}`);
    if (result.isError) {
      console.log(`   Error: ${result.content[0].text}`);
    } else {
      console.log(`   Success: ${result.content[0].text}`);
    }
  } catch (error) {
    console.log(`   ❌ Execution exception: ${error.message}`);
  }
  
  console.log('\n=== Test Conclusion ===');
  console.log('If test 1 succeeds, ParameterMapper is correctly integrated into executeTool method.');
  console.log('ParameterMapper should map { path: "." } to { name: "." }.');
}

testExecuteToolIntegration();
