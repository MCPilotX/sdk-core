/**
 * Debug tests for MCP Client
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

describe('MCPClient Debug', () => {
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

  test('should send request and receive response', async () => {
    // Arrange
    await client.connect();
    (client as any).connected = true;
    mockTransport.isConnected.mockReturnValue(true);

    let capturedRequestId: string | undefined;
    
    mockTransport.send.mockImplementation((request: any) => {
      capturedRequestId = request.id;
      
      // Trigger message event with response
      setTimeout(() => {
        mockTransport._emit('message', {
          jsonrpc: '2.0',
          id: request.id,
          result: { success: true, data: 'test' }
        });
      }, 0);
      
      return Promise.resolve();
    });

    // Act
    // Use private method for testing
    const sendRequest = (client as any).sendRequest.bind(client);
    const result = await sendRequest('test/method', { param: 'value' });

    // Assert
    expect(result).toEqual({ success: true, data: 'test' });
    expect(mockTransport.send).toHaveBeenCalled();
    
    const callArgs = mockTransport.send.mock.calls[0][0];
    expect(callArgs.jsonrpc).toBe('2.0');
    expect(callArgs.method).toBe('test/method');
    expect(callArgs.params).toEqual({ param: 'value' });
    expect(callArgs.id).toBeDefined();
  });

  test('should handle error response', async () => {
    // Arrange
    await client.connect();
    (client as any).connected = true;
    mockTransport.isConnected.mockReturnValue(true);

    mockTransport.send.mockImplementation((request: any) => {
      // Trigger message event with error response
      setTimeout(() => {
        mockTransport._emit('message', {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32603,
            message: 'Internal error',
            data: 'Error details'
          }
        });
      }, 0);
      
      return Promise.resolve();
    });

    // Act & Assert
    // Use private method for testing
    const sendRequest = (client as any).sendRequest.bind(client);
    await expect(sendRequest('test/method', {})).rejects.toThrow('Internal error');
  });

  test('should handle timeout', async () => {
    // Arrange
    await client.connect();
    (client as any).connected = true;
    mockTransport.isConnected.mockReturnValue(true);

    mockTransport.send.mockImplementation(() => {
      // Don't trigger message event - simulate timeout
      return Promise.resolve();
    });

    // Create client with very short timeout
    const shortTimeoutConfig = {
      ...config,
      timeout: 10 // 10ms timeout
    };
    const shortTimeoutClient = new MCPClient(shortTimeoutConfig);
    (shortTimeoutClient as any).transport = mockTransport;
    await shortTimeoutClient.connect();
    (shortTimeoutClient as any).connected = true;

    // Act & Assert
    const sendRequest = (shortTimeoutClient as any).sendRequest.bind(shortTimeoutClient);
    await expect(sendRequest('test/method', {})).rejects.toThrow('Request timeout after 10ms');
  }, 10000); // Increase timeout for this test
});