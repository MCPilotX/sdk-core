/**
 * Tests for transport.ts improvements
 */

import { BaseTransport, StdioTransport, HTTPTransport, SSETransport, TransportFactory } from '../src/mcp/transport';
import { TransportConfig } from '../src/mcp/types';

// Mock BaseTransport for testing private methods
class TestableTransport extends BaseTransport {
  // Expose private methods for testing
  public testLooksLikeJsonChunk(text: string): boolean {
    return (this as any).looksLikeJsonChunk(text);
  }
  
  public testLooksLikeJsonMessage(message: string): boolean {
    return (this as any).looksLikeJsonMessage(message);
  }
  
  public testIsLogMessage(message: string): boolean {
    return (this as any).isLogMessage(message);
  }
  
  public testProcessLine(line: string): Array<{type: 'json' | 'log', data?: any, content?: string}> {
    return (this as any).processLine(line);
  }
  
  public testClearBuffer(): void {
    (this as any).clearBuffer();
  }
  
  public testTryParseBuffer(): any | null {
    return (this as any).tryParseBuffer();
  }
  
  // Implement abstract methods
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async send(): Promise<void> {}
}

describe('Transport Improvements', () => {
  let transport: TestableTransport;
  
  beforeEach(() => {
    const config: TransportConfig = {
      type: 'stdio',
      command: 'echo',
      logFilter: {
        ignorePatterns: ['^DEBUG:'],
        keepPatterns: ['^IMPORTANT:'],
        timeout: 1000,
        bufferSize: 1024,
        verbose: true
      }
    };
    transport = new TestableTransport(config);
  });
  
  afterEach(() => {
    // Clean up any timers
    transport.testClearBuffer();
  });
  
  describe('JSON Detection', () => {
    test('should detect complete JSON objects', () => {
      const jsonMessages = [
        '{"jsonrpc": "2.0", "id": 1, "method": "test"}',
        '{ "jsonrpc": "2.0", "id": 2, "method": "test2" }',
        '{"id": 1, "name": "test"}',
        '{}',
        '[]',
        '[1, 2, 3]'
      ];
      
      jsonMessages.forEach((msg, i) => {
        const result = transport.testLooksLikeJsonMessage(msg);
        expect(result).toBe(true);
      });
    });
    
    test('should detect JSON chunks', () => {
      const jsonChunks = [
        '{',
        '  "jsonrpc": "2.0",',
        '  "id": 1,',
        '"method":',
        '123,',
        '"test",',
        'true',
        'null',
        '}'
      ];
      
      jsonChunks.forEach((chunk, i) => {
        const result = transport.testLooksLikeJsonChunk(chunk);
        expect(result).toBe(true);
      });
    });
    
    test('should reject non-JSON messages', () => {
      const nonJsonMessages = [
        'Hello world',
        'DEBUG: Starting server',
        '[INFO] Server started',
        'Error: Something went wrong',
        'Server running on port 3000'
      ];
      
      nonJsonMessages.forEach((msg, i) => {
        const result = transport.testLooksLikeJsonMessage(msg);
        expect(result).toBe(false);
      });
    });
  });
  
  describe('Log Message Detection', () => {
    test('should detect common log patterns', () => {
      const logMessages = [
        'INFO: Server started',
        'ERROR: Something went wrong',
        '[2024-01-01 10:00:00] INFO: Starting server',
        'Server running on port 3000',
        'Listening on http://localhost:3000',
        'Secure MCP server initialized',
        'Allowed directories: /tmp, /home'
      ];
      
      logMessages.forEach((msg, i) => {
        const result = transport.testIsLogMessage(msg);
        expect(result).toBe(true);
      });
    });
    
    test('should respect ignorePatterns configuration', () => {
      // DEBUG: messages should be ignored based on config
      const debugMessage = 'DEBUG: This should be ignored';
      const result = transport.testIsLogMessage(debugMessage);
      expect(result).toBe(false);
    });
    
    test('should respect keepPatterns configuration', () => {
      // IMPORTANT: messages should be kept even if they look like logs
      const importantMessage = 'IMPORTANT: Critical issue';
      const result = transport.testIsLogMessage(importantMessage);
      expect(result).toBe(true);
    });
    
    test('should reject JSON messages as logs', () => {
      const jsonMessages = [
        '{"jsonrpc": "2.0", "id": 1}',
        '[1, 2, 3]',
        '123',
        '"string"',
        'true'
      ];
      
      jsonMessages.forEach((msg, i) => {
        const result = transport.testIsLogMessage(msg);
        expect(result).toBe(false);
      });
    });
  });
  
  describe('Multi-line JSON Processing', () => {
    test('should process single-line JSON', () => {
      const json = '{"jsonrpc": "2.0", "id": 1, "method": "test"}';
      const results = transport.testProcessLine(json);
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('json');
      expect(results[0].data).toEqual({
        jsonrpc: '2.0',
        id: 1,
        method: 'test'
      });
    });
    
    test('should buffer multi-line JSON', () => {
      const lines = [
        '{',
        '"jsonrpc": "2.0",',
        '"id": 123,',
        '"method": "test"',
        '}'
      ];
      
      // Process first few lines - should buffer but not return results
      for (let i = 0; i < lines.length - 1; i++) {
        const results = transport.testProcessLine(lines[i]);
        expect(results).toHaveLength(0);
      }
      
      // Process last line - should return parsed JSON
      const finalResults = transport.testProcessLine(lines[lines.length - 1]);
      expect(finalResults).toHaveLength(1);
      expect(finalResults[0].type).toBe('json');
      expect(finalResults[0].data).toEqual({
        jsonrpc: '2.0',
        id: 123,
        method: 'test'
      });
    });
    
    test('should clear buffer on non-JSON input', () => {
      // Start with JSON chunk
      transport.testProcessLine('{');
      transport.testProcessLine('  "test": "value"');
      
      // Add non-JSON line - should clear buffer
      const results = transport.testProcessLine('This is a log message');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('log');
      expect(results[0].content).toBe('This is a log message');
    });
  });
  
  describe('Transport Factory', () => {
    test('should create StdioTransport', () => {
      const config: TransportConfig = {
        type: 'stdio',
        command: 'echo'
      };
      
      const transport = TransportFactory.create(config);
      expect(transport).toBeInstanceOf(StdioTransport);
    });
    
    test('should create HTTPTransport', () => {
      const config: TransportConfig = {
        type: 'http',
        url: 'http://localhost:3000'
      };
      
      const transport = TransportFactory.create(config);
      expect(transport).toBeInstanceOf(HTTPTransport);
    });
    
    test('should create SSETransport', () => {
      const config: TransportConfig = {
        type: 'sse',
        url: 'http://localhost:3000/sse'
      };
      
      const transport = TransportFactory.create(config);
      expect(transport).toBeInstanceOf(SSETransport);
    });
    
    test('should throw error for unsupported transport type', () => {
      const config: TransportConfig = {
        type: 'invalid' as any
      };
      
      expect(() => {
        TransportFactory.create(config);
      }).toThrow('Unsupported transport type: invalid');
    });
  });
  
  describe('Configuration Validation', () => {
    test('should validate stdio transport requires command', () => {
      const config: TransportConfig = {
        type: 'stdio'
        // Missing command
      };
      
      expect(() => {
        new StdioTransport(config);
      }).toThrow('Stdio transport requires a command');
    });
    
    test('should validate HTTP transport requires URL', () => {
      const config: TransportConfig = {
        type: 'http'
        // Missing URL
      };
      
      expect(() => {
        new HTTPTransport(config);
      }).toThrow('HTTP transport requires a URL');
    });
    
    test('should validate SSE transport requires URL', () => {
      const config: TransportConfig = {
        type: 'sse'
        // Missing URL
      };
      
      expect(() => {
        new SSETransport(config);
      }).toThrow('SSE transport requires a URL');
    });
  });
  
  describe('Buffer Management', () => {
    test('should clear buffer correctly', () => {
      // Add some data to buffer
      (transport as any).jsonBuffer = 'test data';
      (transport as any).bufferTimeout = setTimeout(() => {}, 1000);
      (transport as any).lastBufferUpdate = Date.now();
      
      transport.testClearBuffer();
      
      expect((transport as any).jsonBuffer).toBe('');
      expect((transport as any).bufferTimeout).toBeNull();
      expect((transport as any).lastBufferUpdate).toBe(0);
    });
    
    test('should try parse buffer', () => {
      // Test with valid JSON
      (transport as any).jsonBuffer = '{"jsonrpc": "2.0", "id": 1}';
      const result1 = transport.testTryParseBuffer();
      expect(result1).toEqual({ jsonrpc: '2.0', id: 1 });
      
      // Test with invalid JSON
      (transport as any).jsonBuffer = '{ invalid json }';
      const result2 = transport.testTryParseBuffer();
      expect(result2).toBeNull();
      
      // Test with empty buffer
      (transport as any).jsonBuffer = '';
      const result3 = transport.testTryParseBuffer();
      expect(result3).toBeNull();
    });
  });
});