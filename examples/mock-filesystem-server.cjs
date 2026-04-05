#!/usr/bin/env node

/**
 * Mock MCP Filesystem Server for testing
 * Simulates the behavior of @agent-infra/mcp-server-filesystem
 */

const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const allowedDirectories = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--allowed-directories') {
    if (i + 1 < args.length) {
      allowedDirectories.push(args[i + 1]);
      i++;
    }
  } else if (args[i].startsWith('--allowed-directories=')) {
    allowedDirectories.push(args[i].split('=')[1]);
  }
}

console.error(`Secure MCP Filesystem Server running on stdio`);
console.error(`Allowed directories: ${JSON.stringify(allowedDirectories)}`);

// Set up stdin/stdout for JSON-RPC communication
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Store tools
const tools = [
  {
    name: 'list_files',
    description: 'List files in a directory',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Directory path' }
      },
      required: ['directory']
    }
  },
  {
    name: 'read_file',
    description: 'Read file contents',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write to a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        content: { type: 'string', description: 'File content' }
      },
      required: ['path', 'content']
    }
  }
];

// Handle JSON-RPC requests
rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    
    switch (request.method) {
      case 'tools/list':
        const toolsResponse = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: tools
          }
        };
        console.log(JSON.stringify(toolsResponse));
        break;
        
      case 'resources/list':
        const resourcesResponse = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            resources: []
          }
        };
        console.log(JSON.stringify(resourcesResponse));
        break;
        
      case 'prompts/list':
        const promptsResponse = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            prompts: []
          }
        };
        console.log(JSON.stringify(promptsResponse));
        break;
        
      case 'tools/call':
        const toolCall = request.params.call;
        let result;
        
        switch (toolCall.name) {
          case 'list_files':
            result = {
              content: [{
                type: 'text',
                text: JSON.stringify(['file1.txt', 'file2.txt', 'subdirectory'])
              }],
              isError: false
            };
            break;
            
          case 'read_file':
            result = {
              content: [{
                type: 'text',
                text: 'Mock file content'
              }],
              isError: false
            };
            break;
            
          default:
            result = {
              content: [{
                type: 'text',
                text: `Tool ${toolCall.name} executed successfully`
              }],
              isError: false
            };
        }
        
        const callResponse = {
          jsonrpc: '2.0',
          id: request.id,
          result: result
        };
        console.log(JSON.stringify(callResponse));
        break;
        
      default:
        const errorResponse = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: 'Method not found'
          }
        };
        console.log(JSON.stringify(errorResponse));
    }
  } catch (error) {
    console.error('Error processing request:', error);
  }
});

// Handle process exit
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});