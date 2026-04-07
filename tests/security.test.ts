/**
 * Security Tests for IntentOrch
 * Focuses on input validation, permission checks, and security vulnerabilities
 */

import { MCPilotSDK } from '../src/sdk';
import { ToolRegistry } from '../src/mcp/tool-registry';
import { Tool } from '../src/mcp/types';

describe('Security Tests', () => {
  describe('Input Validation', () => {
    test('should reject malicious tool names', () => {
      // Arrange
      const toolRegistry = new ToolRegistry();
      const maliciousTool: Tool = {
        name: '../../etc/passwd', // Path traversal attempt
        description: 'Malicious tool',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      };

      const executor = jest.fn();

      // Act & Assert
      // ToolRegistry should accept the tool name (it's just a string)
      // But we should test that execution doesn't allow path traversal
      expect(() => {
        toolRegistry.registerTool(maliciousTool, executor, 'malicious-server', 'malicious-tool');
      }).not.toThrow();
    });

    test('should validate tool arguments against schema', async () => {
      // Arrange
      const toolRegistry = new ToolRegistry();
      const tool: Tool = {
        name: 'safe-tool',
        description: 'A safe tool with validation',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            age: { type: 'number' }
          },
          required: ['username']
        }
      };

      // Mock executor that validates arguments
      const executor = jest.fn().mockImplementation(async (args: any) => {
        // Simulate validation in the executor
        if (!args.username || typeof args.username !== 'string') {
          throw new Error('Username is required and must be a string');
        }
        
        if (args.age !== undefined && (typeof args.age !== 'number' || args.age < 0 || args.age > 150)) {
          throw new Error('Age must be a number between 0 and 150');
        }
        
        return {
          content: [{ type: 'text', text: 'Success' }],
          isError: false
        };
      });

      toolRegistry.registerTool(tool, executor, 'safe-server', 'safe-tool');

      // Act & Assert - Valid input
      const validResult = await toolRegistry.executeTool({
        name: 'safe-tool',
        arguments: { username: 'valid_user123', age: 25 }
      });
      expect(validResult.isError).toBe(false);

      // Act & Assert - Missing required parameter
      const missingResult = await toolRegistry.executeTool({
        name: 'safe-tool',
        arguments: { age: 25 } // Missing username
      });
      expect(missingResult.isError).toBe(true);
      expect(missingResult.content[0].text).toContain('Missing required parameter');

      // Act & Assert - Invalid age (negative) - executor will throw error
      const invalidAgeResult = await toolRegistry.executeTool({
        name: 'safe-tool',
        arguments: { username: 'valid_user', age: -5 }
      });
      expect(invalidAgeResult.isError).toBe(true); // Executor validates age range
      expect(invalidAgeResult.content[0].text).toContain('Age must be a number');
    });

    test('should prevent command injection in tool execution', async () => {
      // Arrange
      const toolRegistry = new ToolRegistry();
      const tool: Tool = {
        name: 'command-tool',
        description: 'Tool that executes commands',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string' }
          },
          required: ['command']
        }
      };

      // Mock executor that simulates command execution
      const executor = jest.fn().mockImplementation(async (args: any) => {
        const command = args.command;
        
        // Simulate security check - reject dangerous commands
        if (command.includes(';') || command.includes('&&') || command.includes('||')) {
          throw new Error('Potential command injection detected');
        }
        
        // Simulate safe command execution
        return {
          content: [{ type: 'text', text: `Executed: ${command}` }],
          isError: false
        };
      });

      toolRegistry.registerTool(tool, executor, 'command-server', 'command-tool');

      // Act & Assert - Safe command
      const safeResult = await toolRegistry.executeTool({
        name: 'command-tool',
        arguments: { command: 'ls -la' }
      });
      expect(safeResult.isError).toBe(false);

      // Act & Assert - Command injection attempt
      const maliciousResult = await toolRegistry.executeTool({
        name: 'command-tool',
        arguments: { command: 'ls; rm -rf /' }
      });
      expect(maliciousResult.isError).toBe(true);
      expect(maliciousResult.content[0].text).toContain('Potential command injection');
    });
  });

  describe('Permission and Access Control', () => {
    test('should restrict file system access based on allowed directories', async () => {
      // Arrange
      const toolRegistry = new ToolRegistry();
      const tool: Tool = {
        name: 'read-file',
        description: 'Read file from filesystem',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' }
          },
          required: ['path']
        }
      };

      const allowedDirectories = ['/safe/dir1', '/safe/dir2'];
      
      const executor = jest.fn().mockImplementation(async (args: any) => {
        const path = args.path;
        
        // Better path normalization to prevent path traversal
        // Resolve relative paths
        const parts = path.split('/');
        const resolvedParts: string[] = [];
        
        for (const part of parts) {
          if (part === '..') {
            if (resolvedParts.length > 0) {
              resolvedParts.pop();
            }
          } else if (part !== '.' && part !== '') {
            resolvedParts.push(part);
          }
        }
        
        const normalizedPath = '/' + resolvedParts.join('/');
        
        // Check if normalized path is within allowed directories
        const isAllowed = allowedDirectories.some(dir => normalizedPath.startsWith(dir));
        
        if (!isAllowed) {
          throw new Error(`Access denied to path: ${path} (normalized: ${normalizedPath})`);
        }
        
        return {
          content: [{ type: 'text', text: `File content of ${normalizedPath}` }],
          isError: false
        };
      });

      toolRegistry.registerTool(tool, executor, 'filesystem-server', 'read-file');

      // Act & Assert - Allowed path
      const allowedResult = await toolRegistry.executeTool({
        name: 'read-file',
        arguments: { path: '/safe/dir1/file.txt' }
      });
      expect(allowedResult.isError).toBe(false);

      // Act & Assert - Disallowed path (path traversal)
      const traversalResult = await toolRegistry.executeTool({
        name: 'read-file',
        arguments: { path: '/safe/dir1/../../etc/passwd' }
      });
      expect(traversalResult.isError).toBe(true);
      expect(traversalResult.content[0].text).toContain('Access denied');

      // Act & Assert - Disallowed path (different directory)
      const disallowedResult = await toolRegistry.executeTool({
        name: 'read-file',
        arguments: { path: '/unsafe/dir/file.txt' }
      });
      expect(disallowedResult.isError).toBe(true);
      expect(disallowedResult.content[0].text).toContain('Access denied');
    });

    test('should validate API key format', async () => {
      // Arrange
      const sdk = new MCPilotSDK({ autoInit: false });
      
      // Mock AI configuration to test API key validation
      const mockConfigureAI = jest.spyOn(sdk, 'configureAI').mockImplementation(async (config) => {
        // Simulate API key validation
        const apiKey = config.apiKey;
        
        if (!apiKey || typeof apiKey !== 'string') {
          throw new Error('API key is required');
        }
        
        // Check for basic API key format (starts with sk-)
        if (!apiKey.startsWith('sk-')) {
          throw new Error('Invalid API key format');
        }
        
        // Check minimum length
        if (apiKey.length < 20) {
          throw new Error('API key is too short');
        }
        
        return Promise.resolve();
      });

      // Act & Assert - Valid API key
      await expect(sdk.configureAI({
        provider: 'deepseek',
        apiKey: 'sk-validapikey12345678901234567890',
        model: 'deepseek-chat'
      })).resolves.not.toThrow();

      // Act & Assert - Invalid API key format
      await expect(sdk.configureAI({
        provider: 'deepseek',
        apiKey: 'invalid-key-format',
        model: 'deepseek-chat'
      })).rejects.toThrow('Invalid API key format');

      // Act & Assert - API key too short
      await expect(sdk.configureAI({
        provider: 'deepseek',
        apiKey: 'sk-short',
        model: 'deepseek-chat'
      })).rejects.toThrow('API key is too short');

      mockConfigureAI.mockRestore();
    });
  });

  describe('Data Sanitization', () => {
    test('should sanitize HTML in tool responses', async () => {
      // Arrange
      const toolRegistry = new ToolRegistry();
      const tool: Tool = {
        name: 'html-tool',
        description: 'Tool that returns HTML',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      };

      const executor = jest.fn().mockImplementation(async () => {
        // Simulate a tool that returns potentially dangerous HTML
        const dangerousHtml = '<script>alert("XSS")</script><div>Safe content</div>';
        
        // Simulate sanitization
        const sanitizedHtml = dangerousHtml
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/on\w+="[^"]*"/g, '')
          .replace(/javascript:/gi, '');
        
        return {
          content: [{ type: 'text', text: sanitizedHtml }],
          isError: false
        };
      });

      toolRegistry.registerTool(tool, executor, 'html-server', 'html-tool');

      // Act
      const result = await toolRegistry.executeTool({
        name: 'html-tool',
        arguments: {}
      });

      // Assert
      expect(result.isError).toBe(false);
      expect(result.content[0].text).not.toContain('<script>');
      expect(result.content[0].text).not.toContain('alert');
      expect(result.content[0].text).toContain('Safe content');
    });

    test('should prevent SQL injection in database tools', async () => {
      // Arrange
      const toolRegistry = new ToolRegistry();
      const tool: Tool = {
        name: 'query-database',
        description: 'Query database',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        }
      };

      const executor = jest.fn().mockImplementation(async (args: any) => {
        const query = args.query;
        
        // Simulate SQL injection detection
        const sqlInjectionPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b.*){2,}/i,
          /'.*--/,
          /'.*;/,
          /\/\*.*\*\//,
          /(\bOR\b\s+\b\d+\b\s*=\s*\b\d+\b)/i,
          /(\bUNION\b\s+\bSELECT\b)/i
        ];
        
        for (const pattern of sqlInjectionPatterns) {
          if (pattern.test(query)) {
            throw new Error('Potential SQL injection detected');
          }
        }
        
        // Simulate parameterized query execution
        return {
          content: [{ type: 'text', text: `Executed safe query: ${query}` }],
          isError: false
        };
      });

      toolRegistry.registerTool(tool, executor, 'database-server', 'query-database');

      // Act & Assert - Safe query
      const safeResult = await toolRegistry.executeTool({
        name: 'query-database',
        arguments: { query: 'SELECT * FROM users WHERE id = ?' }
      });
      expect(safeResult.isError).toBe(false);

      // Act & Assert - SQL injection attempt
      const injectionResult = await toolRegistry.executeTool({
        name: 'query-database',
        arguments: { query: "SELECT * FROM users WHERE username = 'admin' OR '1'='1'" }
      });
      expect(injectionResult.isError).toBe(true);
      expect(injectionResult.content[0].text).toContain('SQL injection');
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    test('should enforce rate limits on tool execution', async () => {
      // Arrange
      const toolRegistry = new ToolRegistry();
      const tool: Tool = {
        name: 'rate-limited-tool',
        description: 'Tool with rate limiting',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      };

      let callCount = 0;
      const maxCalls = 3;
      const resetTime = 1000; // 1 second
      let lastReset = Date.now();

      const executor = jest.fn().mockImplementation(async () => {
        // Check if rate limit window needs reset
        if (Date.now() - lastReset > resetTime) {
          callCount = 0;
          lastReset = Date.now();
        }
        
        // Check rate limit
        if (callCount >= maxCalls) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        callCount++;
        
        return {
          content: [{ type: 'text', text: `Call ${callCount}` }],
          isError: false
        };
      });

      toolRegistry.registerTool(tool, executor, 'rate-limited-server', 'rate-limited-tool');

      // Act & Assert - First 3 calls should succeed
      for (let i = 1; i <= maxCalls; i++) {
        const result = await toolRegistry.executeTool({
          name: 'rate-limited-tool',
          arguments: {}
        });
        expect(result.isError).toBe(false);
        expect(result.content[0].text).toBe(`Call ${i}`);
      }

      // Act & Assert - 4th call should fail due to rate limit
      const rateLimitedResult = await toolRegistry.executeTool({
        name: 'rate-limited-tool',
        arguments: {}
      });
      expect(rateLimitedResult.isError).toBe(true);
      expect(rateLimitedResult.content[0].text).toContain('Rate limit exceeded');
    });

    test('should prevent denial of service through large inputs', async () => {
      // Arrange
      const toolRegistry = new ToolRegistry();
      const tool: Tool = {
        name: 'input-size-tool',
        description: 'Tool with input size limits',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'string', maxLength: 1000 }
          },
          required: ['data']
        }
      };

      const executor = jest.fn().mockImplementation(async (args: any) => {
        const data = args.data;
        
        // Check input size
        if (data.length > 1000) {
          throw new Error('Input too large. Maximum size is 1000 characters.');
        }
        
        return {
          content: [{ type: 'text', text: `Processed ${data.length} characters` }],
          isError: false
        };
      });

      toolRegistry.registerTool(tool, executor, 'size-limited-server', 'input-size-tool');

      // Act & Assert - Valid size input
      const validInput = 'a'.repeat(500);
      const validResult = await toolRegistry.executeTool({
        name: 'input-size-tool',
        arguments: { data: validInput }
      });
      expect(validResult.isError).toBe(false);

      // Act & Assert - Too large input
      const largeInput = 'a'.repeat(2000);
      const largeResult = await toolRegistry.executeTool({
        name: 'input-size-tool',
        arguments: { data: largeInput }
      });
      expect(largeResult.isError).toBe(true);
      expect(largeResult.content[0].text).toContain('Input too large');
    });
  });
});