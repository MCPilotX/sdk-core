// Direct test of MCP server without SDK
// This test directly calls the MCP server to see what it actually expects

import { spawn } from 'child_process';
import { createInterface } from 'readline';

async function directMCPTest() {
  console.log('=== Direct MCP Server Test ===\n');
  console.log('Testing what parameters the MCP server actually expects\n');
  
  // Start MCP server directly
  console.log('1. Starting MCP server...');
  const mcpProcess = spawn('npx', ['@modelcontextprotocol/server-filesystem', '.'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let mcpReady = false;
  const messages = [];
  
  // Read stderr for server status
  const stderrReader = createInterface({
    input: mcpProcess.stderr,
    crlfDelay: Infinity
  });
  
  stderrReader.on('line', (line) => {
    console.log(`[MCP stderr] ${line}`);
    if (line.includes('Secure MCP Filesystem Server running on stdio')) {
      mcpReady = true;
      console.log('✅ MCP server ready\n');
      testServer();
    }
  });
  
  // Read stdout for responses
  const stdoutReader = createInterface({
    input: mcpProcess.stdout,
    crlfDelay: Infinity
  });
  
  stdoutReader.on('line', (line) => {
    try {
      const response = JSON.parse(line);
      messages.push(response);
      console.log(`[MCP response] ${JSON.stringify(response, null, 2).substring(0, 500)}`);
      
      // Check if this is a tools/list response
      if (response.result && response.result.tools) {
        console.log('\n2. Analyzing tool definitions from MCP server...');
        const tools = response.result.tools;
        console.log(`📦 Server reports ${tools.length} tools`);
        
        const readTextFileTool = tools.find(t => t.name === 'read_text_file');
        if (readTextFileTool) {
          console.log('\nFound read_text_file tool definition:');
          console.log('Name:', readTextFileTool.name);
          console.log('Description:', readTextFileTool.description.substring(0, 100) + '...');
          console.log('Input schema:', JSON.stringify(readTextFileTool.inputSchema, null, 2));
          
          // Check what parameters the tool says it needs
          if (readTextFileTool.inputSchema && readTextFileTool.inputSchema.properties) {
            const params = Object.keys(readTextFileTool.inputSchema.properties);
            console.log(`\nAccording to tool definition, read_text_file expects:`);
            console.log(`  Parameters: ${params.join(', ')}`);
            console.log(`  Required: ${readTextFileTool.inputSchema.required?.join(', ') || 'none'}`);
          }
        }
        
        const listDirTool = tools.find(t => t.name === 'list_directory');
        if (listDirTool) {
          console.log('\nFound list_directory tool definition:');
          console.log('Name:', listDirTool.name);
          console.log('Description:', listDirTool.description.substring(0, 100) + '...');
          if (listDirTool.inputSchema && listDirTool.inputSchema.properties) {
            const params = Object.keys(listDirTool.inputSchema.properties);
            console.log(`\nAccording to tool definition, list_directory expects:`);
            console.log(`  Parameters: ${params.join(', ')}`);
            console.log(`  Required: ${listDirTool.inputSchema.required?.join(', ') || 'none'}`);
          }
        }
        
        // Now test actual execution
        console.log('\n3. Testing actual tool execution...');
        testToolExecution();
      }
      
      // Check if this is a tools/call response
      if (response.result && response.result.content) {
        console.log('\nTool execution result:');
        console.log('Success:', !response.result.isError);
        if (response.result.isError) {
          console.log('Error:', JSON.stringify(response.result.content, null, 2));
        } else {
          console.log('Content length:', response.result.content[0]?.text?.length || 0);
        }
      }
      
      // Check for error responses
      if (response.error) {
        console.log('\nMCP server error:');
        console.log('Code:', response.error.code);
        console.log('Message:', response.error.message);
        console.log('Data:', JSON.stringify(response.error.data, null, 2));
      }
      
    } catch (e) {
      // Not JSON, just log it
      console.log(`[MCP output] ${line}`);
    }
  });
  
  // Send initial request to list tools
  function testServer() {
    if (!mcpReady) return;
    
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };
    
    console.log('\nSending tools/list request to MCP server...');
    console.log('Request:', JSON.stringify(listToolsRequest, null, 2));
    mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  }
  
  // Test tool execution with different parameters
  function testToolExecution() {
    console.log('\n4. Testing read_text_file with different parameters...');
    
    // Test with 'path' parameter (what tool definition says)
    const testWithPath = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        call: {
          name: 'read_text_file',
          arguments: {
            path: 'package.json'
          }
        }
      }
    };
    
    console.log('\nTest 1: Using "path" parameter (as per tool definition)');
    console.log('Request:', JSON.stringify(testWithPath, null, 2));
    setTimeout(() => {
      mcpProcess.stdin.write(JSON.stringify(testWithPath) + '\n');
    }, 1000);
    
    // Test with 'name' parameter (what error says)
    const testWithName = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        call: {
          name: 'read_text_file',
          arguments: {
            name: 'package.json'
          }
        }
      }
    };
    
    setTimeout(() => {
      console.log('\nTest 2: Using "name" parameter (what error message suggests)');
      console.log('Request:', JSON.stringify(testWithName, null, 2));
      mcpProcess.stdin.write(JSON.stringify(testWithName) + '\n');
    }, 2000);
    
    // Test list_directory
    const testListDir = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        call: {
          name: 'list_directory',
          arguments: {
            path: '.'
          }
        }
      }
    };
    
    setTimeout(() => {
      console.log('\nTest 3: Testing list_directory with "path" parameter');
      console.log('Request:', JSON.stringify(testListDir, null, 2));
      mcpProcess.stdin.write(JSON.stringify(testListDir) + '\n');
      
      // Cleanup after tests
      setTimeout(() => {
        console.log('\n✅ Tests completed. Cleaning up...');
        mcpProcess.kill();
        process.exit(0);
      }, 1000);
    }, 3000);
  }
  
  // Handle process exit
  mcpProcess.on('exit', (code) => {
    console.log(`\nMCP server exited with code ${code}`);
  });
  
  // Set timeout for test
  setTimeout(() => {
    console.log('\n⏰ Test timeout reached');
    mcpProcess.kill();
    process.exit(0);
  }, 10000);
}

// Run test
directMCPTest();