import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { IntentOrchSDK, SDKOptions } from '../src/sdk';

// Mock all dependencies minimally
jest.mock('../src/core/config-manager', () => {
  // Create a mock object with static methods
  const mockConfigManager = {
    init: jest.fn(),
    saveGlobalConfig: jest.fn<any>().mockResolvedValue(undefined),
    updateConfig: jest.fn<any>().mockResolvedValue(undefined),
    addService: jest.fn<any>().mockResolvedValue('testService'),
    getServiceStatus: jest.fn<any>().mockResolvedValue({
      name: 'testService',
      status: 'running',
      pid: 12345,
      uptime: 1000,
    }),
    getGlobalConfig: jest.fn<any>().mockReturnValue({
      services: {},
      ai: {},
      mcp: {},
    }),
    getConfig: jest.fn<any>().mockReturnValue({
      services: {},
      ai: {},
      mcp: {},
    }),
    getServiceConfig: jest.fn<any>().mockReturnValue({
      name: 'testService',
      runtime: 'node',
      command: 'node',
      args: ['index.js'],
      path: '/path/to/service',
    }),
    getAllServices: jest.fn<any>().mockReturnValue([]),
  };
  
  return { ConfigManager: mockConfigManager };
});

// Simple AI mock
jest.mock('../src/ai/ai', () => ({
  AI: jest.fn<any>().mockImplementation(() => ({
    configure: jest.fn<any>().mockResolvedValue(undefined),
    ask: jest.fn<any>().mockResolvedValue({
      type: 'suggestions',
      suggestions: ['suggestion1', 'suggestion2'],
      message: 'Test result',
    }),
    testConnection: jest.fn<any>().mockResolvedValue({
      success: true,
      message: 'Connection test passed',
    }),
  })),
}));

// Minimal mocks for other dependencies
jest.mock('../src/mcp/tool-registry', () => ({
  ToolRegistry: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../src/ai/cloud-intent-engine', () => ({
  CloudIntentEngine: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../src/mcp/client', () => ({
  MCPClient: jest.fn().mockImplementation(() => ({})),
  createMCPConfig: jest.fn(),
  discoverLocalMCPServers: jest.fn(),
}));

jest.mock('../src/runtime/adapter-advanced', () => ({
  RuntimeAdapterRegistry: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../src/runtime/detector-advanced', () => ({
  EnhancedRuntimeDetector: jest.fn().mockImplementation(() => ({})),
}));

describe('IntentOrchSDK - Minimal Tests', () => {
  let sdk: IntentOrchSDK;

  beforeEach(async () => {
    // Clear any previous instances
    jest.clearAllMocks();
    
    // Create fresh SDK instance with autoInit to avoid manual init
    sdk = new IntentOrchSDK({ autoInit: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create SDK instance', () => {
      expect(sdk).toBeInstanceOf(IntentOrchSDK);
    });
  });

  describe('testAIConnection', () => {
    it('should test AI connection successfully', async () => {
      const result = await sdk.testAIConnection();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection test passed');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', async () => {
      const configUpdates = {
        services: {
          testService: {
            name: 'testService',
            runtime: 'node' as const,
            command: 'node',
            args: ['index.js'],
          },
          autoStart: [],
        },
      };
      
      await sdk.updateConfig(configUpdates);
      
      // Verify that ConfigManager.saveGlobalConfig was called
      const { ConfigManager } = require('../src/core/config-manager');
      // ConfigManager is a static class, so we check the mock function itself
      expect(ConfigManager.saveGlobalConfig).toHaveBeenCalledWith(configUpdates);
    });
  });
});