import { describe, it, expect } from '@jest/globals';
import * as os from 'os';
import * as path from 'path';
import {
  MCPILOT_HOME,
  MCPILOT_DIR,
  SOCKET_PATH,
  LOGS_DIR,
  SERVERS_DIR,
  VENVS_DIR,
  CONFIG_PATH,
  DEFAULT_CONFIG
} from '../src/core/constants';

describe('Constants', () => {
  describe('Path constants', () => {
    it('should define MCPILOT_HOME as ~/.mcpilot', () => {
      const expectedPath = path.join(os.homedir(), '.mcpilot');
      expect(MCPILOT_HOME).toBe(expectedPath);
    });

    it('should define MCPILOT_DIR as alias for MCPILOT_HOME', () => {
      expect(MCPILOT_DIR).toBe(MCPILOT_HOME);
    });

    it('should define SOCKET_PATH correctly', () => {
      const expectedPath = path.join(MCPILOT_HOME, 'run', 'mcp.sock');
      expect(SOCKET_PATH).toBe(expectedPath);
    });

    it('should define LOGS_DIR correctly', () => {
      const expectedPath = path.join(MCPILOT_HOME, 'logs');
      expect(LOGS_DIR).toBe(expectedPath);
    });

    it('should define SERVERS_DIR correctly', () => {
      const expectedPath = path.join(MCPILOT_HOME, 'servers');
      expect(SERVERS_DIR).toBe(expectedPath);
    });

    it('should define VENVS_DIR correctly', () => {
      const expectedPath = path.join(MCPILOT_HOME, 'venvs');
      expect(VENVS_DIR).toBe(expectedPath);
    });

    it('should define CONFIG_PATH correctly', () => {
      const expectedPath = path.join(MCPILOT_HOME, 'config.json');
      expect(CONFIG_PATH).toBe(expectedPath);
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have correct AI configuration', () => {
      expect(DEFAULT_CONFIG.ai).toBeDefined();
      expect(DEFAULT_CONFIG.ai.enabled).toBe(true);
      expect(DEFAULT_CONFIG.ai.provider).toBe('deepseek');
      expect(DEFAULT_CONFIG.ai.model).toBe('deepseek-v3');
      expect(DEFAULT_CONFIG.ai.apiKey).toBe('');
      expect(DEFAULT_CONFIG.ai.timeout).toBe(30000);
      expect(DEFAULT_CONFIG.ai.maxTokens).toBe(2048);
      expect(DEFAULT_CONFIG.ai.temperature).toBe(0.7);
      expect(DEFAULT_CONFIG.ai.embeddingProvider).toBe('');
      expect(DEFAULT_CONFIG.ai.embeddingApiKey).toBe('');
      expect(DEFAULT_CONFIG.ai.embeddingModel).toBe('');
      expect(DEFAULT_CONFIG.ai.embeddingEndpoint).toBe('');
      expect(DEFAULT_CONFIG.ai.useLocalEmbeddings).toBe(false);
      expect(DEFAULT_CONFIG.ai.useVectorSearch).toBe(true);
      expect(DEFAULT_CONFIG.ai.transformersTimeout).toBe(5000);
      expect(DEFAULT_CONFIG.ai.fallbackMode).toBe('lightweight');
    });

    it('should have correct registry configuration', () => {
      expect(DEFAULT_CONFIG.registry).toBeDefined();
      expect(DEFAULT_CONFIG.registry.preferred).toBe('gitee-mcp');
    });

    it('should have correct services configuration', () => {
      expect(DEFAULT_CONFIG.services).toBeDefined();
      expect(DEFAULT_CONFIG.services.autoStart).toEqual(['filesystem']);
      expect(DEFAULT_CONFIG.services.defaultTimeout).toBe(60000);
    });
  });
});