/**
 * Tests for StdioTransport
 */

import { StdioTransport } from '../src/mcp/transport';
import { TransportConfig } from '../src/mcp/types';

// Mock child_process
jest.mock('child_process', () => {
  const mockChildProcess = {
    stdin: {
      write: jest.fn().mockImplementation((data, callback) => {
        // Call the callback to simulate successful write
        if (callback) {
          callback();
        }
        return true;
      }),
      end: jest.fn(),
      on: jest.fn()
    },
    stdout: {
      on: jest.fn(),
      pipe: jest.fn()
    },
    stderr: {
      on: jest.fn(),
      pipe: jest.fn()
    },
    on: jest.fn(),
    kill: jest.fn(),
    pid: 12345
  };

  return {
    spawn: jest.fn().mockReturnValue(mockChildProcess)
  };
});

describe('StdioTransport', () => {
  let transport: StdioTransport;
  let config: TransportConfig;
  let mockChildProcess: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const childProcess = require('child_process');
    mockChildProcess = childProcess.spawn();
    
    config = {
      type: 'stdio',
      command: 'test-server',
      args: ['--verbose', '--port', '8080']
    };

    transport = new StdioTransport(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    test('should create stdio transport with config', () => {
      expect(transport).toBeDefined();
      expect((transport as any).config).toEqual(config);
      expect((transport as any).connected).toBe(false);
    });

    test('should spawn child process with correct arguments when connecting', async () => {
      const childProcess = require('child_process');
      
      // Act - connect the transport
      await transport.connect();
      
      // Assert - spawn should be called with correct arguments
      expect(childProcess.spawn).toHaveBeenCalledWith(
        'test-server',
        ['--verbose', '--port', '8080'],
        expect.any(Object)
      );
    });

    test('should set up event listeners on child process when connecting', async () => {
      // Act - connect the transport
      await transport.connect();
      
      // Assert - event listeners should be set up
      // Note: In the actual implementation, event listeners are set on:
      // - this.process.stdout?.on('data', ...)
      // - this.process.stderr?.on('data', ...)  
      // - this.process.on('close', ...)
      // - this.process.on('error', ...)
      // The mock should have these called
      expect(mockChildProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockChildProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockChildProcess.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockChildProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('Connection Management', () => {
    test('should connect successfully', async () => {
      // Arrange
      const connectPromise = transport.connect();
      
      // Simulate child process ready
      const readyCallback = mockChildProcess.on.mock.calls.find(
        (call: any[]) => call[0] === 'spawn'
      )?.[1];
      
      if (readyCallback) {
        readyCallback();
      }

      // Act
      await connectPromise;

      // Assert
      expect((transport as any).connected).toBe(true);
    });

    test('should disconnect successfully', async () => {
      // Arrange
      (transport as any).connected = true;
      (transport as any).process = mockChildProcess;

      // Act
      await transport.disconnect();

      // Assert
      expect(mockChildProcess.kill).toHaveBeenCalled();
      expect((transport as any).connected).toBe(false);
      expect((transport as any).process).toBeUndefined();
    });

    test('should handle connection errors', async () => {
      // Arrange
      const errorHandler = jest.fn();
      transport.on('error', errorHandler);
      
      // Act - connect the transport
      await transport.connect();
      
      // Simulate child process error after connection
      const errorCallback = mockChildProcess.on.mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )?.[1];
      
      const testError = new Error('Process error occurred');
      if (errorCallback) {
        errorCallback(testError);
      }

      // Assert - error should be emitted
      expect(errorHandler).toHaveBeenCalledWith(testError);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      // Set up connected state by actually calling connect
      // This ensures event listeners are properly set up
      await transport.connect();
    });

    test('should send JSON-RPC request', async () => {
      // Arrange
      const request = {
        jsonrpc: '2.0' as const,
        id: 'test-id',
        method: 'test/method',
        params: { param: 'value' }
      };

      // Act
      await transport.send(request);

      // Assert
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        JSON.stringify(request) + '\n',
        expect.any(Function)
      );
    });

    test('should handle stdout data', () => {
      // Arrange
      const messageHandler = jest.fn();
      transport.on('message', messageHandler);

      const stdoutCallback = mockChildProcess.stdout.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      const testResponse = {
        jsonrpc: '2.0',
        id: 'test-id',
        result: { success: true }
      };

      // Act
      if (stdoutCallback) {
        stdoutCallback(JSON.stringify(testResponse) + '\n');
      }

      // Assert
      expect(messageHandler).toHaveBeenCalledWith(testResponse);
    });

    test('should handle partial JSON data', () => {
      // Arrange
      const messageHandler = jest.fn();
      transport.on('message', messageHandler);

      const stdoutCallback = mockChildProcess.stdout.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      const partialJson1 = '{"jsonrpc":"2.0","id":"test-id",';
      const partialJson2 = '"result":{"success":true}}';

      // Act - Send partial JSON
      if (stdoutCallback) {
        stdoutCallback(partialJson1);
        stdoutCallback(partialJson2 + '\n');
      }

      // Assert
      expect(messageHandler).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        id: 'test-id',
        result: { success: true }
      });
    });

    test('should handle malformed JSON gracefully', () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const stdoutCallback = mockChildProcess.stdout.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      const malformedJson = '{"jsonrpc":"2.0","id":"test-id",invalid}\n';

      // Act
      if (stdoutCallback) {
        stdoutCallback(malformedJson);
      }

      // Assert
      // The malformed JSON should be logged as a warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MCP Transport] JSON-like message but cannot parse')
      );
      
      // Cleanup
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      // Set up connected state by actually calling connect
      // This ensures event listeners are properly set up
      await transport.connect();
    });

    test('should handle stderr output', () => {
      // Arrange
      const errorHandler = jest.fn();
      transport.on('error', errorHandler);

      const stderrCallback = mockChildProcess.stderr.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      const errorOutput = 'ERROR: Something went wrong\n';

      // Act
      if (stderrCallback) {
        stderrCallback(errorOutput);
      }

      // Assert
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('ERROR: Something went wrong')
        })
      );
    });

    test('should handle child process exit', () => {
      // Arrange
      const disconnectHandler = jest.fn();
      transport.on('disconnected', disconnectHandler);

      const closeCallback = mockChildProcess.on.mock.calls.find(
        (call: any[]) => call[0] === 'close'
      )?.[1];

      // Act
      if (closeCallback) {
        closeCallback(0);
      }

      // Assert
      expect(disconnectHandler).toHaveBeenCalled();
      expect((transport as any).connected).toBe(false);
    });

    test('should throw error when sending while disconnected', async () => {
      // Arrange
      (transport as any).connected = false;
      const request = {
        jsonrpc: '2.0' as const,
        id: 'test-id',
        method: 'test/method',
        params: {}
      };

      // Act & Assert
      await expect(transport.send(request)).rejects.toThrow('Not connected');
    });
  });

  describe('Configuration Options', () => {
    test('should create transport with environment variables', async () => {
      // Arrange
      const envConfig: TransportConfig = {
        type: 'stdio',
        command: 'test-server',
        args: [],
        env: {
          TEST_VAR: 'test-value',
          ANOTHER_VAR: 'another-value'
        }
      };

      // Act
      const envTransport = new StdioTransport(envConfig);
      await envTransport.connect();

      // Assert
      const childProcess = require('child_process');
      const spawnCall = childProcess.spawn.mock.calls[1]; // Second call
      expect(spawnCall[2].env).toEqual(
        expect.objectContaining({
          TEST_VAR: 'test-value',
          ANOTHER_VAR: 'another-value'
        })
      );
    });

    test('should create transport with working directory', async () => {
      // Arrange
      const cwdConfig: TransportConfig = {
        type: 'stdio',
        command: 'test-server',
        args: [],
        cwd: '/tmp/test-dir'
      };

      // Act
      const cwdTransport = new StdioTransport(cwdConfig);
      await cwdTransport.connect();

      // Assert
      const childProcess = require('child_process');
      // Find the spawn call for this specific transport
      const spawnCalls = childProcess.spawn.mock.calls;
      const cwdSpawnCall = spawnCalls.find((call: any[]) => 
        call[0] === 'test-server' && call[2]?.cwd === '/tmp/test-dir'
      );
      expect(cwdSpawnCall).toBeDefined();
      expect(cwdSpawnCall[2].cwd).toBe('/tmp/test-dir');
    });

    test('should create transport with log filter configuration', () => {
      // Arrange
      const logFilterConfig: TransportConfig = {
        type: 'stdio',
        command: 'test-server',
        args: [],
        logFilter: {
          ignorePatterns: ['DEBUG'],
          keepPatterns: ['ERROR'],
          verbose: true,
          bufferSize: 8192,
          timeout: 5000
        }
      };

      // Act
      const logFilterTransport = new StdioTransport(logFilterConfig);

      // Assert
      expect(logFilterTransport).toBeDefined();
      // The log filter should be set up internally
      expect((logFilterTransport as any).config.logFilter).toEqual(
        logFilterConfig.logFilter
      );
    });
  });
});