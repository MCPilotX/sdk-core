/**
 * Tests for MCP Client
 */

import { MCPClient } from '../src/mcp/client';
import { MCPClientConfig } from '../src/mcp/types';

// Mock Transport with event simulation
const createMockTransport = () => {
  const eventListeners: Record<string, Function[]> = {
    message: [],
    error: [],
    connected: [],
    disconnected: []
  };

  const transport = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    send: jest.fn(),
    on: (event: string, callback: Function) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(callback);
    },
    off: (event: string, callback: Function) => {
      if (eventListeners[event]) {
        const index = eventListeners[event].indexOf(callback);
        if (index > -1) {
          eventListeners[event].splice(index, 1);
        }
      }
    },
    isConnected: jest.fn().mockReturnValue(true),
    // Helper to emit events
    _emit: (event: string, data: any) => {
      if (eventListeners[event]) {
        eventListeners[event].forEach(callback => callback(data));
      }
    }
  };

  return transport;
};

describe('MCPClient', () => {
  let client: MCPClient;
  let config: MCPClientConfig;
  let mockTransport: ReturnType<typeof createMockTransport>;
  let originalTransportFactory: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock transport
    mockTransport = createMockTransport();
    
    // Mock TransportFactory.create to return our mock transport
    const { TransportFactory } = require('../src/mcp/transport');
    originalTransportFactory = TransportFactory.create;
    TransportFactory.create = jest.fn().mockReturnValue(mockTransport);
    
    // Create config
    config = {
      transport: {
        type: 'stdio',
        command: 'mock-server',
        args: []
      },
      autoConnect: false,
      timeout: 5000
    };

    // Create client - it will use our mock transport
    client = new MCPClient(config);
  });

  afterEach(() => {
    // Restore original TransportFactory
    if (originalTransportFactory) {
      const { TransportFactory } = require('../src/mcp/transport');
      TransportFactory.create = originalTransportFactory;
    }
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should create client with config', () => {
      // Assert
      expect(client).toBeDefined();
      // The constructor adds default values, so we need to check for expected properties
      const clientConfig = (client as any).config;
      expect(clientConfig.transport).toEqual(config.transport);
      expect(clientConfig.autoConnect).toBe(false); // Default value
      // The timeout should be from config (5000), not the default (30000)
      // because config.timeout is provided
      expect(clientConfig.timeout).toBe(5000); // From config
      expect(clientConfig.maxRetries).toBe(3); // Default value added by constructor
      expect((client as any).connected).toBe(false);
    });

    test('should have empty initial state', () => {
      // Assert
      expect((client as any).tools).toHaveLength(0);
      expect((client as any).resources).toHaveLength(0);
      expect((client as any).prompts).toHaveLength(0);
    });
  });

  describe('Connection', () => {
    test('should connect successfully', async () => {
      // Arrange
      mockTransport.connect.mockResolvedValue(undefined);

      // Act
      await client.connect();

      // Assert
      expect(mockTransport.connect).toHaveBeenCalled();
      expect((client as any).connected).toBe(true);
    });

    test('should disconnect successfully', async () => {
      // Arrange
      mockTransport.disconnect.mockResolvedValue(undefined);
      (client as any).connected = true;

      // Act
      await client.disconnect();

      // Assert
      expect(mockTransport.disconnect).toHaveBeenCalled();
      expect((client as any).connected).toBe(false);
    });

    test('should handle connection errors', async () => {
      // Arrange
      const error = new Error('Connection failed');
      mockTransport.connect.mockRejectedValue(error);

      // Act & Assert
      await expect(client.connect()).rejects.toThrow('Connection failed');
      expect((client as any).connected).toBe(false);
    });
  });

  describe('Tool Management', () => {
    beforeEach(async () => {
      // Connect before each tool management test
      mockTransport.connect.mockResolvedValue(undefined);
      await client.connect();
      // Ensure both client and transport report as connected
      (client as any).connected = true;
      mockTransport.isConnected.mockReturnValue(true);
    });

    test('should list tools', async () => {
      // Arrange
      const mockTools = [
        {
          name: 'test-tool-1',
          description: 'Test tool 1',
          inputSchema: {
            type: 'object',
            properties: {
              param1: { type: 'string' }
            }
          }
        },
        {
          name: 'test-tool-2',
          description: 'Test tool 2',
          inputSchema: {
            type: 'object',
            properties: {
              param2: { type: 'number' }
            }
          }
        }
      ];

      // Mock the send method to trigger message event with response
      mockTransport.send.mockImplementation((request: any) => {
        // Trigger message event with response synchronously
        mockTransport._emit('message', {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: mockTools
          }
        });
        
        return Promise.resolve();
      });

      // Act
      const tools = await client.listTools();

      // Assert
      expect(tools).toEqual(mockTools);
      expect(mockTransport.send).toHaveBeenCalled();
      const callArgs = mockTransport.send.mock.calls[0][0];
      expect(callArgs.jsonrpc).toBe('2.0');
      expect(callArgs.method).toBe('tools/list');
      expect(callArgs.id).toBeDefined();
    }, 10000); // Increase timeout for this test

    test('should call tool', async () => {
      // Arrange
      const toolName = 'test-tool';
      const arguments_ = { param: 'value' };
      const mockResult = {
        content: [{ type: 'text', text: 'Tool executed successfully' }],
        isError: false
      };

      mockTransport.send.mockImplementation((request: any) => {
        // Trigger message event with response asynchronously (like debug test)
        setTimeout(() => {
          mockTransport._emit('message', {
            jsonrpc: '2.0',
            id: request.id,
            result: mockResult
          });
        }, 0);
        
        return Promise.resolve();
      });

      // Act
      const result = await client.callTool(toolName, arguments_);

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          call: {
            name: toolName,
            arguments: arguments_
          }
        },
        id: expect.any(String)
      });
    });

    test('should handle tool call errors', async () => {
      // Arrange
      const toolName = 'test-tool';
      const arguments_ = { param: 'value' };
      const mockResult = {
        content: [{ type: 'text', text: 'Tool execution failed: Internal error' }],
        isError: true
      };

      mockTransport.send.mockImplementation((request: any) => {
        // Trigger message event with response (tool execution error, not JSON-RPC error)
        setTimeout(() => {
          mockTransport._emit('message', {
            jsonrpc: '2.0',
            id: request.id,
            result: mockResult
          });
        }, 0);
        
        return Promise.resolve();
      });

      // Act & Assert
      // callTool should throw an error when tool execution fails (isError: true)
      await expect(client.callTool(toolName, arguments_)).rejects.toThrow(
        `Tool "${toolName}" execution failed: Tool execution failed: Internal error`
      );
    });
  });

  describe('Resource Management', () => {
    beforeEach(async () => {
      // Connect before each resource management test
      mockTransport.connect.mockResolvedValue(undefined);
      await client.connect();
      // Ensure both client and transport report as connected
      (client as any).connected = true;
      mockTransport.isConnected.mockReturnValue(true);
    });

    test('should list resources', async () => {
      // Arrange
      const mockResources = [
        {
          uri: 'file:///test.txt',
          mimeType: 'text/plain',
          name: 'Test File',
          description: 'A test file'
        }
      ];

      mockTransport.send.mockImplementation((request: any) => {
        // Trigger message event with response
        mockTransport._emit('message', {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            resources: mockResources
          }
        });
        
        return Promise.resolve();
      });

      // Act
      const resources = await client.listResources();

      // Assert
      expect(resources).toEqual(mockResources);
      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'resources/list',
        id: expect.any(String)
      });
    });

    test('should read resource', async () => {
      // Arrange
      const uri = 'file:///test.txt';
      const mockResource = {
        uri,
        mimeType: 'text/plain',
        text: 'File content'
      };

      mockTransport.send.mockImplementation((request: any) => {
        // Trigger message event with response
        mockTransport._emit('message', {
          jsonrpc: '2.0',
          id: request.id,
          result: mockResource
        });
        
        return Promise.resolve();
      });

      // Act
      const resource = await client.readResource(uri);

      // Assert
      expect(resource).toEqual(mockResource);
      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'resources/read',
        params: { uri },
        id: expect.any(String)
      });
    });
  });

  describe('Prompt Management', () => {
    beforeEach(async () => {
      // Connect before each prompt management test
      mockTransport.connect.mockResolvedValue(undefined);
      await client.connect();
      // Ensure both client and transport report as connected
      (client as any).connected = true;
      mockTransport.isConnected.mockReturnValue(true);
    });

    test('should list prompts', async () => {
      // Arrange
      const mockPrompts = [
        {
          name: 'test-prompt',
          description: 'A test prompt',
          arguments: [
            {
              name: 'topic',
              description: 'Topic to discuss',
              required: true
            }
          ]
        }
      ];

      mockTransport.send.mockImplementation((request: any) => {
        // Trigger message event with response
        mockTransport._emit('message', {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            prompts: mockPrompts
          }
        });
        
        return Promise.resolve();
      });

      // Act
      const prompts = await client.listPrompts();

      // Assert
      expect(prompts).toEqual(mockPrompts);
      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'prompts/list',
        id: expect.any(String)
      });
    });

    test('should get prompt', async () => {
      // Arrange
      const promptName = 'test-prompt';
      const arguments_ = { topic: 'testing' };
      const mockResult = {
        messages: [
          { role: 'user', content: { type: 'text', text: 'Test prompt' } }
        ]
      };

      mockTransport.send.mockImplementation((request: any) => {
        // Trigger message event with response
        mockTransport._emit('message', {
          jsonrpc: '2.0',
          id: request.id,
          result: mockResult
        });
        
        return Promise.resolve();
      });

      // Act
      const result = await client.getPrompt(promptName, arguments_);

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockTransport.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'prompts/get',
        params: {
          name: promptName,
          arguments: arguments_
        },
        id: expect.any(String)
      });
    });
  });

  describe('Event Handling', () => {
    test('should emit connection events', () => {
      // Arrange
      const connectHandler = jest.fn();
      const disconnectHandler = jest.fn();
      
      client.on('connect', connectHandler);
      client.on('disconnect', disconnectHandler);

      // Act - Simulate connection events
      (client as any).emit('connect');
      (client as any).emit('disconnect');

      // Assert
      expect(connectHandler).toHaveBeenCalled();
      expect(disconnectHandler).toHaveBeenCalled();
    });

    test('should emit tool update events', () => {
      // Arrange
      const toolUpdateHandler = jest.fn();
      const mockTools = [
        {
          name: 'test-tool',
          description: 'Test tool',
          inputSchema: { type: 'object', properties: {} }
        }
      ];

      client.on('toolsUpdated', toolUpdateHandler);

      // Act - Simulate tools update
      (client as any).tools = mockTools;
      (client as any).emit('toolsUpdated', mockTools);

      // Assert
      expect(toolUpdateHandler).toHaveBeenCalledWith(mockTools);
    });
  });

  describe('Error Handling', () => {
    test('should handle transport errors', async () => {
      // Arrange
      const error = new Error('Transport error');
      mockTransport.send.mockRejectedValue(error);
      
      // Connect client first
      mockTransport.connect.mockResolvedValue(undefined);
      await client.connect();
      (client as any).connected = true;
      mockTransport.isConnected.mockReturnValue(true);

      // Act & Assert
      await expect(client.listTools()).rejects.toThrow('Transport error');
    });

    test('should handle timeout errors', async () => {
      // Arrange
      mockTransport.send.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ result: { tools: [] } }), 10000);
        });
      });

      // Create client with short timeout
      const shortTimeoutConfig = {
        ...config,
        timeout: 100
      };
      const shortTimeoutClient = new MCPClient(shortTimeoutConfig);
      (shortTimeoutClient as any).transport = mockTransport;
      
      // Connect client
      mockTransport.connect.mockResolvedValue(undefined);
      await shortTimeoutClient.connect();
      (shortTimeoutClient as any).connected = true;
      mockTransport.isConnected.mockReturnValue(true);

      // Act & Assert
      await expect(shortTimeoutClient.listTools()).rejects.toThrow();
    });
  });
});