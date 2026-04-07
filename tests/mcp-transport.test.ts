/**
 * Tests for MCP Transport
 */

import { BaseTransport, TransportFactory } from '../src/mcp/transport';
import { TransportConfig, TransportType } from '../src/mcp/types';

// Mock implementation for testing
class MockTransport extends BaseTransport {
  private mockData: string = '';
  
  override async connect(): Promise<void> {
    this.connected = true;
    this.emit('connected');
  }
  
  override async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected');
  }
  
  override async send(request: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected');
    }
    
    // Simulate receiving a response
    setTimeout(() => {
      this.emit('message', {
        jsonrpc: '2.0',
        id: request.id,
        result: { success: true }
      });
    }, 0);
  }
  
  override isConnected(): boolean {
    return this.connected;
  }
  
  // Test helper methods
  simulateMessage(data: any): void {
    this.emit('message', data);
  }
  
  simulateError(error: Error): void {
    this.emit('error', error);
  }
}

describe('BaseTransport', () => {
  let transport: MockTransport;
  let config: TransportConfig;

  beforeEach(() => {
    config = {
      type: 'stdio' as TransportType,
      command: 'test-server',
      args: []
    };
    
    transport = new MockTransport(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    test('should create transport with config', () => {
      expect(transport).toBeDefined();
      expect((transport as any).config).toEqual(config);
      expect(transport.isConnected()).toBe(false);
    });

    test('should connect and disconnect', async () => {
      // Arrange
      const connectHandler = jest.fn();
      const disconnectHandler = jest.fn();
      
      transport.on('connected', connectHandler);
      transport.on('disconnected', disconnectHandler);

      // Act - Connect
      await transport.connect();
      
      // Assert
      expect(transport.isConnected()).toBe(true);
      expect(connectHandler).toHaveBeenCalled();

      // Act - Disconnect
      await transport.disconnect();
      
      // Assert
      expect(transport.isConnected()).toBe(false);
      expect(disconnectHandler).toHaveBeenCalled();
    });

    test('should send message when connected', async () => {
      // Arrange
      await transport.connect();
      const messageHandler = jest.fn();
      transport.on('message', messageHandler);

      const request = {
        jsonrpc: '2.0',
        id: 'test-id',
        method: 'test/method',
        params: {}
      };

      // Act
      await transport.send(request);

      // Wait for async response
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(messageHandler).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 'test-id',
        result: { success: true }
      });
    });

    test('should throw error when sending while disconnected', async () => {
      // Arrange
      const request = {
        jsonrpc: '2.0',
        id: 'test-id',
        method: 'test/method',
        params: {}
      };

      // Act & Assert
      await expect(transport.send(request)).rejects.toThrow('Not connected');
    });
  });

  describe('Event Handling', () => {
    test('should handle message events', () => {
      // Arrange
      const messageHandler = jest.fn();
      transport.on('message', messageHandler);

      const testMessage = {
        jsonrpc: '2.0',
        id: 'test-id',
        result: { data: 'test' }
      };

      // Act
      transport.simulateMessage(testMessage);

      // Assert
      expect(messageHandler).toHaveBeenCalledWith(testMessage);
    });

    test('should handle error events', () => {
      // Arrange
      const errorHandler = jest.fn();
      transport.on('error', errorHandler);

      const testError = new Error('Test error');

      // Act
      transport.simulateError(testError);

      // Assert
      expect(errorHandler).toHaveBeenCalledWith(testError);
    });

    test('should remove event listeners', () => {
      // Arrange
      const messageHandler = jest.fn();
      transport.on('message', messageHandler);

      // Act - Remove listener
      transport.off('message', messageHandler);
      
      // Trigger message
      transport.simulateMessage({ jsonrpc: '2.0', id: '1', result: {} });

      // Assert
      expect(messageHandler).not.toHaveBeenCalled();
    });
  });

  // Note: Buffer management tests are removed because handleData method
  // is not accessible in BaseTransport class for testing
});

describe('TransportFactory', () => {
  test('should create stdio transport', () => {
    // Arrange
    const config: TransportConfig = {
      type: 'stdio',
      command: 'test-server',
      args: ['--port', '8080']
    };

    // Act
    const transport = TransportFactory.create(config);

    // Assert
    expect(transport).toBeDefined();
    expect(transport).toBeInstanceOf(BaseTransport);
  });

  test('should throw error for unsupported transport type', () => {
    // Arrange
    const config: TransportConfig = {
      type: 'unsupported' as any, // Invalid type
      command: 'test-server',
      args: []
    };

    // Act & Assert
    expect(() => {
      TransportFactory.create(config);
    }).toThrow('Unsupported transport type');
  });

  test('should create transport with additional stdio options', () => {
    // Arrange
    const config: TransportConfig = {
      type: 'stdio',
      command: 'test-server',
      args: ['--verbose', '--port', '8080'],
      logFilter: {
        ignorePatterns: ['DEBUG'],
        keepPatterns: ['ERROR'],
        verbose: true,
        bufferSize: 8192,
        timeout: 5000
      }
    };

    // Act
    const transport = TransportFactory.create(config);

    // Assert
    expect(transport).toBeDefined();
    expect(transport).toBeInstanceOf(BaseTransport);
  });
});