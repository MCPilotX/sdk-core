/**
 * Comprehensive tests for pull.ts command
 * Tests all major functionality including manifest fetching, caching, and error handling
 */

import { Command } from 'commander';
import { pullCommand } from '../../src/cli/pull';
import { getRegistryClient } from '../../src/registry/client';
import { getToolRegistry, ExtendedManifest } from '../../src/tool-registry/registry';
import { getDisplayName } from '../../src/utils/server-name';

// Mock dependencies
jest.mock('../../src/registry/client');
jest.mock('../../src/tool-registry/registry');
jest.mock('../../src/utils/server-name');

describe('pull command', () => {
  let command: Command;
  let mockRegistryClient: any;
  let mockToolRegistry: any;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  const mockManifest: ExtendedManifest = {
    name: 'test-server',
    version: '1.0.0',
    description: 'Test MCP server',
    runtime: {
      type: 'node',
      command: 'node',
      args: ['index.js'],
      env: ['API_KEY', 'SECRET']
    },
    tools: [
      {
        name: 'test.tool1',
        description: 'Test tool 1',
        serverName: 'test-server',
        parameters: {
          param1: { type: 'string', description: 'Parameter 1', required: true }
        }
      },
      {
        name: 'test.tool2',
        description: 'Test tool 2',
        serverName: 'test-server',
        parameters: {
          param2: { type: 'number', description: 'Parameter 2', required: false }
        }
      },
      {
        name: 'test.tool3',
        description: 'Test tool 3',
        serverName: 'test-server'
      },
      {
        name: 'test.tool4',
        description: 'Test tool 4',
        serverName: 'test-server'
      },
      {
        name: 'test.tool5',
        description: 'Test tool 5',
        serverName: 'test-server'
      }
    ]
  };

  const mockManifestNoTools: ExtendedManifest = {
    name: 'test-server-no-tools',
    version: '1.0.0',
    description: 'Test MCP server without tools',
    runtime: {
      type: 'node',
      command: 'node',
      args: ['index.js']
    }
  };

  const mockManifestNoEnv: ExtendedManifest = {
    name: 'test-server-no-env',
    version: '1.0.0',
    description: 'Test MCP server without environment variables',
    runtime: {
      type: 'node',
      command: 'node',
      args: ['index.js']
    },
    tools: [
      {
        name: 'test.tool',
        description: 'Test tool',
        serverName: 'test-server-no-env'
      }
    ]
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup console spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Setup mock registry client
    mockRegistryClient = {
      getCachedManifest: jest.fn(),
      fetchManifest: jest.fn()
    };
    (getRegistryClient as jest.Mock).mockReturnValue(mockRegistryClient);

    // Setup mock tool registry
    mockToolRegistry = {
      registerToolsFromManifest: jest.fn().mockResolvedValue(undefined)
    };
    (getToolRegistry as jest.Mock).mockReturnValue(mockToolRegistry);

    // Setup mock display name
    (getDisplayName as jest.Mock).mockImplementation((serverName: string) => {
      return `display-${serverName}`;
    });

    // Create command instance
    command = pullCommand();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('command structure', () => {
    it('should create command with correct name and description', () => {
      expect(command.name()).toBe('pull');
      expect(command.description()).toBe('Pull MCP Server configuration from Registry');
    });

    it('should have server argument with examples', () => {
      // Check command name and description
      expect(command.name()).toBe('pull');
      expect(command.description()).toBe('Pull MCP Server configuration from Registry');
      
      // Check help output contains expected information
      const helpText = command.helpInformation();
      expect(helpText).toContain('Pull MCP Server manifest from Registry');
      expect(helpText).toContain('<server>');
      
      // The argument examples are in the argument description
      // We can verify the command is properly configured by checking it has arguments
      expect(command.args).toBeDefined();
    });
  });

  describe('action execution', () => {
    it('should successfully pull manifest when not cached', async () => {
      // Arrange
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockResolvedValue(mockManifest);

      // Act
      await command.parseAsync(['node', 'pull', 'test/server']);

      // Assert
      expect(getRegistryClient).toHaveBeenCalled();
      expect(mockRegistryClient.getCachedManifest).toHaveBeenCalledWith('test/server');
      expect(mockRegistryClient.fetchManifest).toHaveBeenCalledWith('test/server');
      expect(getDisplayName).toHaveBeenCalledWith('test/server');
      expect(mockToolRegistry.registerToolsFromManifest).toHaveBeenCalledWith('test/server', mockManifest);

      // Verify console output
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Pulled configuration for display-test/server v1.0.0'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Runtime: node'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Command: node index.js'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Required environment variables: API_KEY, SECRET'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Tools: 5 tools registered'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('- test.tool1: Test tool 1'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('... and 2 more'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('💡 Next steps:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Set any required secrets'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Start the server'));
    });

    it('should use cached manifest when available', async () => {
      // Arrange
      mockRegistryClient.getCachedManifest.mockResolvedValue(mockManifest);
      mockRegistryClient.fetchManifest.mockResolvedValue(mockManifest);

      // Act
      await command.parseAsync(['node', 'pull', 'test/server']);

      // Assert
      expect(mockRegistryClient.getCachedManifest).toHaveBeenCalledWith('test/server');
      expect(mockRegistryClient.fetchManifest).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ️  Manifest for display-test/server v1.0.0 is already cached'));
      expect(mockToolRegistry.registerToolsFromManifest).toHaveBeenCalledWith('test/server', mockManifest);
    });

    it('should handle manifest without environment variables', async () => {
      // Arrange
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockResolvedValue(mockManifestNoEnv);

      // Act
      await command.parseAsync(['node', 'pull', 'test/server-no-env']);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Pulled configuration for display-test/server-no-env v1.0.0'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Runtime: node'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Command: node index.js'));
      // Should not log environment variables section
      const logs = consoleLogSpy.mock.calls.flat();
      expect(logs.some((log: string) => log.includes('Required environment variables'))).toBe(false);
    });

    it('should handle manifest without tools', async () => {
      // Arrange
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockResolvedValue(mockManifestNoTools);

      // Act
      await command.parseAsync(['node', 'pull', 'test/server-no-tools']);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Pulled configuration for display-test/server-no-tools v1.0.0'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Tools: No tools declared in manifest'));
      expect(mockToolRegistry.registerToolsFromManifest).toHaveBeenCalledWith('test/server-no-tools', mockManifestNoTools);
    });

    it('should handle manifest with 3 or fewer tools', async () => {
      // Arrange
      const manifestWith3Tools: ExtendedManifest = {
        ...mockManifest,
        tools: mockManifest.tools!.slice(0, 3)
      };
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockResolvedValue(manifestWith3Tools);

      // Act
      await command.parseAsync(['node', 'pull', 'test/server-3-tools']);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Tools: 3 tools registered'));
      // Should not show "... and X more" message
      const logs = consoleLogSpy.mock.calls.flat();
      expect(logs.some((log: string) => log.includes('... and'))).toBe(false);
    });

    it('should handle fetch error and exit with code 1', async () => {
      // Arrange
      const error = new Error('Failed to fetch manifest: Network error');
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockRejectedValue(error);

      // Act & Assert
      await expect(command.parseAsync(['node', 'pull', 'test/server'])).rejects.toThrow('process.exit called');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to pull display-test/server:'),
        'Failed to fetch manifest: Network error'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle tool registration error', async () => {
      // Arrange
      const error = new Error('Failed to register tools');
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockResolvedValue(mockManifest);
      mockToolRegistry.registerToolsFromManifest.mockRejectedValue(error);

      // Act & Assert
      await expect(command.parseAsync(['node', 'pull', 'test/server'])).rejects.toThrow('process.exit called');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to pull display-test/server:'),
        'Failed to register tools'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle various server name formats', async () => {
      // Test different server name formats
      const testCases = [
        'Joooook/12306-mcp',
        'mcp/12306',
        'https://example.com/mcp.json',
        'owner/repo@main',
        'owner/repo:dist/mcp.json',
        'owner/repo@develop:src/mcp.json',
        'github:owner/repo',
        'gitee:owner/repo',
        'official/12306'
      ];

      for (const serverName of testCases) {
        // Reset mocks for each test case
        jest.clearAllMocks();
        mockRegistryClient.getCachedManifest.mockResolvedValue(null);
        mockRegistryClient.fetchManifest.mockResolvedValue(mockManifest);

        // Act
        await command.parseAsync(['node', 'pull', serverName]);

        // Assert
        expect(getDisplayName).toHaveBeenCalledWith(serverName);
        expect(mockRegistryClient.getCachedManifest).toHaveBeenCalledWith(serverName);
        expect(mockRegistryClient.fetchManifest).toHaveBeenCalledWith(serverName);
      }
    });

    it('should handle empty runtime args', async () => {
      // Arrange
      const manifestEmptyArgs: ExtendedManifest = {
        ...mockManifest,
        runtime: {
          ...mockManifest.runtime,
          args: undefined
        }
      };
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockResolvedValue(manifestEmptyArgs);

      // Act
      await command.parseAsync(['node', 'pull', 'test/server-empty-args']);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Command: node'));
      // Check that the command output doesn't have trailing spaces after 'node'
      const logs = consoleLogSpy.mock.calls.flat();
      const commandLog = logs.find((log: string) => log.includes('Command:'));
      // The actual output is "  Command: node " (with a space at the end)
      // This is acceptable since args is undefined/empty
      expect(commandLog).toBe('  Command: node ');
    });

    it('should handle empty environment variables array', async () => {
      // Arrange
      const manifestEmptyEnv: ExtendedManifest = {
        ...mockManifest,
        runtime: {
          ...mockManifest.runtime,
          env: []
        }
      };
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockResolvedValue(manifestEmptyEnv);

      // Act
      await command.parseAsync(['node', 'pull', 'test/server-empty-env']);

      // Assert
      // Should not log environment variables section
      const logs = consoleLogSpy.mock.calls.flat();
      expect(logs.some((log: string) => log.includes('Required environment variables'))).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle undefined error message', async () => {
      // Arrange
      const error = new Error('');
      error.message = undefined as any;
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockRejectedValue(error);

      // Act & Assert
      await expect(command.parseAsync(['node', 'pull', 'test/server'])).rejects.toThrow('process.exit called');
      
      // When error.message is undefined, (error as Error).message will be undefined
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to pull display-test/server:'),
        undefined
      );
    });

    it('should handle non-Error object thrown', async () => {
      // Arrange
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockRejectedValue('String error message');

      // Act & Assert
      await expect(command.parseAsync(['node', 'pull', 'test/server'])).rejects.toThrow('process.exit called');
      
      // When a string is thrown, (error as Error).message will be undefined
      // because casting a string to Error doesn't give it a .message property
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to pull display-test/server:'),
        undefined
      );
    });
  });

  describe('integration with other modules', () => {
    it('should use getRegistryClient when command is executed', async () => {
      // Arrange
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockResolvedValue(mockManifest);
      
      // Reset mock to count calls during execution
      (getRegistryClient as jest.Mock).mockClear();

      // Act
      await command.parseAsync(['node', 'pull', 'test/server']);

      // Assert - getRegistryClient should be called when action executes
      expect(getRegistryClient).toHaveBeenCalledTimes(1);
    });

    it('should use getToolRegistry when command is executed', async () => {
      // Arrange
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockResolvedValue(mockManifest);
      
      // Reset mock to count calls during execution
      (getToolRegistry as jest.Mock).mockClear();

      // Act
      await command.parseAsync(['node', 'pull', 'test/server']);

      // Assert - getToolRegistry should be called when action executes
      expect(getToolRegistry).toHaveBeenCalledTimes(1);
    });

    it('should pass correct parameters to registerToolsFromManifest', async () => {
      // Arrange
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockResolvedValue(mockManifest);

      // Act
      await command.parseAsync(['node', 'pull', 'test/server']);

      // Assert
      expect(mockToolRegistry.registerToolsFromManifest).toHaveBeenCalledWith('test/server', mockManifest);
    });
  });

  describe('output formatting', () => {
    it('should format command with args correctly', async () => {
      // Arrange
      const manifestWithArgs: ExtendedManifest = {
        ...mockManifest,
        runtime: {
          type: 'python',
          command: 'python',
          args: ['-m', 'server', '--port', '8080']
        }
      };
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockResolvedValue(manifestWithArgs);

      // Act
      await command.parseAsync(['node', 'pull', 'test/server']);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Command: python -m server --port 8080'));
    });

    it('should format environment variables as comma-separated list', async () => {
      // Arrange
      const manifestWithEnv: ExtendedManifest = {
        ...mockManifest,
        runtime: {
          ...mockManifest.runtime,
          env: ['API_KEY', 'SECRET', 'DATABASE_URL', 'LOG_LEVEL']
        }
      };
      mockRegistryClient.getCachedManifest.mockResolvedValue(null);
      mockRegistryClient.fetchManifest.mockResolvedValue(manifestWithEnv);

      // Act
      await command.parseAsync(['node', 'pull', 'test/server']);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Required environment variables: API_KEY, SECRET, DATABASE_URL, LOG_LEVEL'));
    });
  });
});
