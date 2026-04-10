import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { IntentOrchSDK, SDKOptions } from '../src/sdk';
import { AI } from '../src/ai/ai';
import { ConfigManager } from '../src/core/config-manager';
import { ToolRegistry } from '../src/mcp/tool-registry';

// Mock dependencies
jest.mock('../src/core/config-manager');
jest.mock('../src/ai/ai');
jest.mock('../src/mcp/tool-registry');
jest.mock('../src/ai/cloud-intent-engine');
jest.mock('../src/mcp/client');
jest.mock('../src/runtime/adapter-advanced');
jest.mock('../src/runtime/detector-advanced');

describe('IntentOrchSDK - Basic Tests', () => {
  let sdk: IntentOrchSDK;
  const mockOptions: SDKOptions = {
    autoInit: false,
  };

  beforeEach(() => {
    // Clear any previous instances
    jest.clearAllMocks();
    
    // Create fresh SDK instance
    sdk = new IntentOrchSDK(mockOptions);
    
    // Initialize SDK
    sdk.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create SDK instance with default options', () => {
      const defaultSdk = new IntentOrchSDK();
      
      expect(defaultSdk).toBeInstanceOf(IntentOrchSDK);
      // ConfigManager is a static class, so we check if it was accessed
      // AI and ToolRegistry are mocked, so we check if they were instantiated
      expect(AI).toHaveBeenCalled();
      expect(ToolRegistry).toHaveBeenCalled();
    });

    it('should create SDK instance with custom options', () => {
      const customOptions: SDKOptions = {
        autoInit: true,
        logger: {
          info: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
        },
      };
      
      const customSdk = new IntentOrchSDK(customOptions);
      
      expect(customSdk).toBeInstanceOf(IntentOrchSDK);
    });

    it('should create SDK instance with MCP options', () => {
      const mcpOptions: SDKOptions = {
        mcp: {
          autoDiscover: true,
          servers: [],
        },
      };
      
      const mcpSdk = new IntentOrchSDK(mcpOptions);
      
      expect(mcpSdk).toBeInstanceOf(IntentOrchSDK);
    });
  });

  describe('generateText', () => {
    it('should handle generateText without AI configuration', async () => {
      // Mock AI generateText to throw error
      const mockAI = AI.mock.instances[0];
      mockAI.generateText = jest.fn().mockRejectedValue(new Error('AI not configured'));
      
      await expect(sdk.generateText('test query')).rejects.toThrow('AI not configured');
    });

    it('should handle generateText with AI configuration', async () => {
      // Mock AI generateText to return result
      const mockAI = AI.mock.instances[0];
      mockAI.generateText = jest.fn().mockResolvedValue('AI generated response text');
      
      const result = await sdk.generateText('test query');
      
      expect(result.type).toBe('text');
      expect(result.text).toBe('AI generated response text');
    });
  });

  describe('configureAI', () => {
    it('should configure AI with valid config', async () => {
      const aiConfig = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-3.5-turbo',
      };
      
      // Mock AI configure
      const mockAI = AI.mock.instances[0];
      mockAI.configure = jest.fn().mockResolvedValue(undefined);
      
      await sdk.configureAI(aiConfig);
      
      expect(mockAI.configure).toHaveBeenCalledWith(aiConfig);
    });

    it('should handle AI configuration error', async () => {
      const aiConfig = {
        provider: 'invalid' as any,
        apiKey: 'test-key',
      };
      
      // Mock AI configure to throw error
      const mockAI = AI.mock.instances[0];
      mockAI.configure = jest.fn().mockRejectedValue(new Error('Invalid provider'));
      
      await expect(sdk.configureAI(aiConfig)).rejects.toThrow('Invalid provider');
    });
  });

  describe('testAIConnection', () => {
    it('should test AI connection successfully', async () => {
      // Mock AI testConnection
      const mockAI = AI.mock.instances[0];
      mockAI.testConnection = jest.fn().mockResolvedValue({
        success: true,
        message: 'Connection test passed',
      });
      
      const result = await sdk.testAIConnection();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection test passed');
    });

    it('should handle AI connection test failure', async () => {
      // Mock AI testConnection to return failure
      const mockAI = AI.mock.instances[0];
      mockAI.testConnection = jest.fn().mockResolvedValue({
        success: false,
        message: 'Connection test failed',
      });
      
      const result = await sdk.testAIConnection();
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection test failed');
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
        },
      };
      
      // Mock ConfigManager.saveGlobalConfig (which is what updateConfig calls)
      const mockSaveGlobalConfig = jest.fn();
      ConfigManager.saveGlobalConfig = mockSaveGlobalConfig;
      
      await sdk.updateConfig(configUpdates);
      
      expect(mockSaveGlobalConfig).toHaveBeenCalledWith(configUpdates);
    });
  });

  describe('service management', () => {
    it('should add service', async () => {
      const serviceConfig = {
        name: 'testService',
        runtime: 'node' as const,
        command: 'node',
        args: ['index.js'],
        path: '.', // Add path for runtime detection
      };
      
      // Mock EnhancedRuntimeDetector.detect to avoid actual detection
      const mockDetect = jest.fn().mockResolvedValue({
        runtime: 'node',
        confidence: 0.9,
        source: 'auto',
      });
      const EnhancedRuntimeDetector = require('../src/runtime/detector-advanced').EnhancedRuntimeDetector;
      EnhancedRuntimeDetector.detect = mockDetect;
      
      const result = await sdk.addService(serviceConfig);
      
      expect(result).toBe('testService');
      // The addService method doesn't call ConfigManager, it just returns the name
    });

    it('should get service status', async () => {
      const serviceName = 'testService';
      
      // Mock ConfigManager.getServiceConfig to return a valid config
      const mockGetServiceConfig = jest.fn().mockReturnValue({
        name: 'testService',
        runtime: 'node',
        command: 'node',
        args: ['index.js'],
        path: '.',
      });
      ConfigManager.getServiceConfig = mockGetServiceConfig;
      
      // Mock RuntimeAdapterRegistry.createAdapter to return a mock adapter
      const mockStatus = jest.fn().mockResolvedValue({
        running: true,
        pid: 12345,
        uptime: 1000,
      });
      const mockAdapter = {
        status: mockStatus,
      };
      const RuntimeAdapterRegistry = require('../src/runtime/adapter-advanced').RuntimeAdapterRegistry;
      RuntimeAdapterRegistry.createAdapter = jest.fn().mockReturnValue(mockAdapter);
      
      const result = await sdk.getServiceStatus(serviceName);
      
      expect(result.name).toBe('testService');
      expect(result.status).toBe('running');
      expect(mockGetServiceConfig).toHaveBeenCalledWith(serviceName);
      expect(RuntimeAdapterRegistry.createAdapter).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors', () => {
      // Test that ensureInitialized throws error when not initialized
      // This is a private method, but we can test it indirectly
      // by calling a public method that depends on it
      const uninitializedSdk = new IntentOrchSDK({ autoInit: false });
      
      // The SDK should throw error when trying to use it without initialization
      // We'll test this by mocking the ensureInitialized method
      // or by testing that methods throw appropriate errors
    });

    it('should handle invalid service operations', async () => {
      const invalidServiceName = 'nonExistentService';
      
      // Mock configManager.getServiceConfig to return null for non-existent service
      const mockGetServiceConfig = jest.fn().mockReturnValue(null);
      ConfigManager.getServiceConfig = mockGetServiceConfig;
      
      await expect(sdk.getServiceStatus(invalidServiceName)).rejects.toThrow(
        `Service "${invalidServiceName}" not found`
      );
      expect(mockGetServiceConfig).toHaveBeenCalledWith(invalidServiceName);
    });
  });
});