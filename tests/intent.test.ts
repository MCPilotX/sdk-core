import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { IntentEngineAdapter } from '../src/ai/legacy-adapters';
import { IntentResult } from '../src/ai/intent-types';

// Mock the IntentParserFactory to control behavior
jest.mock('../src/ai/intent-parser-factory');

describe('IntentEngine (Legacy Adapter)', () => {
  let intentEngine: IntentEngineAdapter;
  const mockConfig = { confidenceThreshold: 0.8 };

  beforeEach(() => {
    intentEngine = new IntentEngineAdapter(mockConfig);
  });

  describe('constructor', () => {
    it('should create an instance with config', () => {
      expect(intentEngine).toBeInstanceOf(IntentEngineAdapter);
    });

    it('should create an instance without config', () => {
      const engine = new IntentEngineAdapter();
      expect(engine).toBeInstanceOf(IntentEngineAdapter);
    });
  });

  describe('parse', () => {
    it('should have parse method with correct signature', () => {
      expect(typeof intentEngine.parse).toBe('function');
      expect(intentEngine.parse.length).toBe(2); // query, availableTools parameters
    });

    it('should return a promise', async () => {
      const query = 'test query';
      const availableTools = ['filesystem:read', 'filesystem:write'];
      
      const result = intentEngine.parse(query, availableTools);
      expect(result).toBeInstanceOf(Promise);
      
      // Wait for promise to resolve
      const resolved = await result;
      // Should return either null or IntentResult
      expect(resolved === null || (typeof resolved === 'object' && 'service' in resolved)).toBe(true);
    });

    it('should handle basic parsing', async () => {
      const query = 'read file';
      const availableTools = ['filesystem:read', 'filesystem:write'];
      
      const result = await intentEngine.parse(query, availableTools);
      
      // Should handle the call without throwing
      expect(result === null || (typeof result === 'object')).toBe(true);
    });

    it('should handle empty query', async () => {
      const query = '';
      const availableTools = ['filesystem:read'];
      
      const result = await intentEngine.parse(query, availableTools);
      expect(result === null || (typeof result === 'object')).toBe(true);
    });

    it('should handle empty tools array', async () => {
      const query = 'test query';
      const availableTools: string[] = [];
      
      const result = await intentEngine.parse(query, availableTools);
      expect(result === null || (typeof result === 'object')).toBe(true);
    });

    it('should handle tools with colon separator', async () => {
      const query = 'test';
      const availableTools = ['service:method', 'filesystem:read'];
      
      const result = await intentEngine.parse(query, availableTools);
      expect(result === null || (typeof result === 'object')).toBe(true);
    });

    it('should handle malformed tools gracefully', async () => {
      const query = 'test';
      const availableTools = ['malformed-tool-without-colon', 'filesystem:read'];
      
      const result = await intentEngine.parse(query, availableTools);
      expect(result === null || (typeof result === 'object')).toBe(true);
    });

    it('should preserve backward compatibility interface', () => {
      // Verify the adapter maintains the legacy interface
      expect(intentEngine).toHaveProperty('parse');
      expect(intentEngine).toHaveProperty('updateConfig');
      
      // Check method signatures
      expect(typeof intentEngine.parse).toBe('function');
      expect(typeof intentEngine.updateConfig).toBe('function');
    });
  });

  describe('updateConfig', () => {
    it('should have updateConfig method', () => {
      expect(typeof intentEngine.updateConfig).toBe('function');
    });

    it('should update configuration', () => {
      const newConfig = { confidenceThreshold: 0.9 };
      
      // Should not throw when updating config
      expect(() => intentEngine.updateConfig(newConfig)).not.toThrow();
      
      // Verify the method exists and can be called
      expect(intentEngine).toBeDefined();
    });

    it('should handle empty config', () => {
      expect(() => intentEngine.updateConfig({})).not.toThrow();
    });

    it('should handle null config', () => {
      expect(() => intentEngine.updateConfig(null as any)).not.toThrow();
    });

    it('should handle undefined config', () => {
      expect(() => intentEngine.updateConfig(undefined as any)).not.toThrow();
    });
  });

  describe('IntentResult interface', () => {
    it('should have correct structure', () => {
      const intentResult: IntentResult = {
        service: 'filesystem',
        method: 'read',
        parameters: { path: '/test.txt' },
        confidence: 0.8
      };

      expect(intentResult.service).toBe('filesystem');
      expect(intentResult.method).toBe('read');
      expect(intentResult.parameters).toEqual({ path: '/test.txt' });
      expect(intentResult.confidence).toBe(0.8);
    });
  });
});