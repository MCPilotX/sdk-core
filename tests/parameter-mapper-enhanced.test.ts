/**
 * Enhanced ParameterMapper tests for new functionality
 * Tests for custom mapping rules, configuration, and generic parameter mapping
 */

import { ParameterMapper, ParameterMappingRule, ValidationLevel } from '../src/mcp/parameter-mapper';

describe('ParameterMapper Enhanced Functionality', () => {
  // Reset configuration before each test
  beforeEach(() => {
    ParameterMapper.resetConfig();
    ParameterMapper.clearCustomMappingRules();
  });

  describe('Custom Mapping Rules', () => {
    test('should add custom mapping rules', () => {
      const customRule: ParameterMappingRule = {
        pattern: /custom_tool/i,
        mappings: [
          { sourceName: 'custom_param', targetName: 'tool_param' },
          { sourceName: 'another_param', targetName: 'different_param' },
        ],
        priority: 20,
      };

      // Get initial count
      const initialRules = ParameterMapper.getAllMappingRules();
      const initialCount = initialRules.length;

      // Add custom rule
      ParameterMapper.addMappingRules([customRule]);

      // Verify rule was added
      const updatedRules = ParameterMapper.getAllMappingRules();
      expect(updatedRules.length).toBe(initialCount + 1);

      // Verify custom rule is present
      const addedRule = updatedRules.find(rule => rule.priority === 20);
      expect(addedRule).toBeDefined();
      expect(addedRule?.pattern.test('custom_tool')).toBe(true);
      expect(addedRule?.mappings).toHaveLength(2);
    });

    test('should apply custom mapping rules with higher priority', () => {
      // Add custom rule with high priority
      ParameterMapper.addMappingRules([
        {
          pattern: /test_tool/i,
          mappings: [
            { sourceName: 'input', targetName: 'data' },
          ],
          priority: 25, // Higher than default rules
        },
      ]);

      const toolSchema = {
        type: 'object',
        properties: {
          data: { type: 'string' },
        },
        required: ['data'],
      };

      const sourceParams = { input: 'test value' };
      const mapped = ParameterMapper.mapParameters('test_tool', toolSchema, sourceParams);

      // Custom rule should map 'input' to 'data'
      expect(mapped.data).toBe('test value');
      expect(mapped.input).toBeUndefined();
    });

    test('should clear custom mapping rules', () => {
      // Add a custom rule
      ParameterMapper.addMappingRules([
        {
          pattern: /temp_tool/i,
          mappings: [{ sourceName: 'temp', targetName: 'temperature' }],
          priority: 20,
        },
      ]);

      // Verify rule was added
      const rulesWithCustom = ParameterMapper.getAllMappingRules();
      const hasCustomRule = rulesWithCustom.some(rule => rule.priority === 20);
      expect(hasCustomRule).toBe(true);

      // Clear custom rules
      ParameterMapper.clearCustomMappingRules();

      // Verify only default rules remain (priority <= 10)
      const rulesAfterClear = ParameterMapper.getAllMappingRules();
      const hasHighPriorityRule = rulesAfterClear.some(rule => rule.priority > 10);
      expect(hasHighPriorityRule).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    test('should configure validation level', () => {
      // Default should be COMPATIBLE
      const defaultConfig = ParameterMapper.getConfig();
      expect(defaultConfig.validationLevel).toBe(ValidationLevel.COMPATIBLE);

      // Change to STRICT
      ParameterMapper.configure({ validationLevel: ValidationLevel.STRICT });
      const updatedConfig = ParameterMapper.getConfig();
      expect(updatedConfig.validationLevel).toBe(ValidationLevel.STRICT);

      // Change to LENIENT
      ParameterMapper.configure({ validationLevel: ValidationLevel.LENIENT });
      const lenientConfig = ParameterMapper.getConfig();
      expect(lenientConfig.validationLevel).toBe(ValidationLevel.LENIENT);
    });

    test('should configure log warnings', () => {
      // Default should be true
      const defaultConfig = ParameterMapper.getConfig();
      expect(defaultConfig.logWarnings).toBe(true);

      // Disable warnings
      ParameterMapper.configure({ logWarnings: false });
      const updatedConfig = ParameterMapper.getConfig();
      expect(updatedConfig.logWarnings).toBe(false);
    });

    test('should configure enforce required', () => {
      // Default should be true
      const defaultConfig = ParameterMapper.getConfig();
      expect(defaultConfig.enforceRequired).toBe(true);

      // Disable enforcement
      ParameterMapper.configure({ enforceRequired: false });
      const updatedConfig = ParameterMapper.getConfig();
      expect(updatedConfig.enforceRequired).toBe(false);
    });

    test('should reset configuration to defaults', () => {
      // Change configuration
      ParameterMapper.configure({
        validationLevel: ValidationLevel.STRICT,
        logWarnings: false,
        enforceRequired: false,
      });

      // Verify changes
      const changedConfig = ParameterMapper.getConfig();
      expect(changedConfig.validationLevel).toBe(ValidationLevel.STRICT);
      expect(changedConfig.logWarnings).toBe(false);
      expect(changedConfig.enforceRequired).toBe(false);

      // Reset to defaults
      ParameterMapper.resetConfig();

      // Verify defaults restored
      const defaultConfig = ParameterMapper.getConfig();
      expect(defaultConfig.validationLevel).toBe(ValidationLevel.COMPATIBLE);
      expect(defaultConfig.logWarnings).toBe(true);
      expect(defaultConfig.enforceRequired).toBe(true);
    });
  });

  describe('Generic Parameter Mapping', () => {
    test('should map generic path parameters', () => {
      const toolSchema = {
        type: 'object',
        properties: {
          path: { type: 'string' },
        },
        required: ['path'],
      };

      // Test various path parameter names
      // Note: ParameterMapper may map filename to both path and name for compatibility
      const testCases = [
        { source: { filename: '/tmp/test.txt' }, expectedPath: '/tmp/test.txt' },
        { source: { file: 'document.pdf' }, expectedPath: 'document.pdf' },
        { source: { directory: '/home/user' }, expectedPath: '/home/user' },
        { source: { folder: 'docs' }, expectedPath: 'docs' },
        { source: { filepath: '/var/log/app.log' }, expectedPath: '/var/log/app.log' },
        { source: { location: 'remote://server/file' }, expectedPath: 'remote://server/file' },
      ];

      testCases.forEach(({ source, expectedPath }) => {
        const mapped = ParameterMapper.mapParameters('any_tool', toolSchema, source);
        // Should have path parameter mapped
        expect(mapped.path).toBe(expectedPath);
        // May also have name parameter for compatibility
        if (mapped.name) {
          expect(mapped.name).toBe(expectedPath);
        }
      });
    });

    test('should map generic search parameters', () => {
      const toolSchema = {
        type: 'object',
        properties: {
          search: { type: 'string' },
        },
        required: ['search'],
      };

      const testCases = [
        { source: { query: 'test query' }, expected: { search: 'test query' } },
        { source: { filter: 'status:active' }, expected: { search: 'status:active' } },
        { source: { term: 'keyword' }, expected: { search: 'keyword' } },
        { source: { keyword: 'search term' }, expected: { search: 'search term' } },
        { source: { q: 'quick search' }, expected: { search: 'quick search' } },
      ];

      testCases.forEach(({ source, expected }) => {
        const mapped = ParameterMapper.mapParameters('search_tool', toolSchema, source);
        expect(mapped).toEqual(expected);
      });
    });

    test('should map generic data/content parameters', () => {
      const toolSchema = {
        type: 'object',
        properties: {
          data: { type: 'string' },
        },
        required: ['data'],
      };

      const testCases = [
        { source: { content: 'Hello World' }, expected: { data: 'Hello World' } },
        { source: { text: 'Sample text' }, expected: { data: 'Sample text' } },
        { source: { body: 'Request body' }, expected: { data: 'Request body' } },
        { source: { message: 'Notification message' }, expected: { data: 'Notification message' } },
      ];

      testCases.forEach(({ source, expected }) => {
        const mapped = ParameterMapper.mapParameters('data_tool', toolSchema, source);
        expect(mapped).toEqual(expected);
      });
    });

    test('should handle parameter transformations', () => {
      const toolSchema = {
        type: 'object',
        properties: {
          active: { type: 'boolean' },
        },
        required: ['active'],
      };

      const testCases = [
        { source: { enabled: true }, expected: { active: true } },
        { source: { disabled: true }, expected: { active: false } }, // Transformation: !true = false
        { source: { on: true }, expected: { active: true } },
        { source: { off: true }, expected: { active: false } }, // Transformation: !true = false
      ];

      testCases.forEach(({ source, expected }) => {
        const mapped = ParameterMapper.mapParameters('toggle_tool', toolSchema, source);
        expect(mapped).toEqual(expected);
      });
    });
  });

  describe('Validation and Normalization', () => {
    test('should validate with STRICT level', () => {
      ParameterMapper.configure({ validationLevel: ValidationLevel.STRICT });

      const toolSchema = {
        type: 'object',
        properties: {
          path: { type: 'string' },
        },
        required: ['path'],
        additionalProperties: false,
      };

      const params = { path: '/tmp/test.txt', extra: 'should be rejected' };
      const result = ParameterMapper.validateAndNormalize('strict_tool', toolSchema, params);

      // Should have warning about extra parameter
      expect(result.warnings).toContain('Unknown parameter "extra" for tool "strict_tool"');
      // Extra parameter should not be in normalized result
      expect(result.normalized.extra).toBeUndefined();
      expect(result.normalized.path).toBe('/tmp/test.txt');
    });

    test('should validate with COMPATIBLE level (default)', () => {
      ParameterMapper.configure({ validationLevel: ValidationLevel.COMPATIBLE });

      const toolSchema = {
        type: 'object',
        properties: {
          path: { type: 'string' },
        },
        required: ['path'],
        additionalProperties: false,
      };

      // 'filename' is a compatibility parameter for 'path'
      const params = { filename: '/tmp/test.txt' };
      const result = ParameterMapper.validateAndNormalize('compatible_tool', toolSchema, params);

      // Should map filename to path
      expect(result.normalized.path).toBe('/tmp/test.txt');
      // Should have warning about compatibility parameter
      expect(result.warnings).toContain('Added compatibility parameter "filename" for tool "compatible_tool"');
    });

    test('should validate with LENIENT level', () => {
      ParameterMapper.configure({ 
        validationLevel: ValidationLevel.LENIENT,
        logWarnings: true,
      });

      const toolSchema = {
        type: 'object',
        properties: {
          path: { type: 'string' },
        },
        required: ['path'],
        additionalProperties: false,
      };

      const params = { path: '/tmp/test.txt', unknown: 'extra param' };
      const result = ParameterMapper.validateAndNormalize('lenient_tool', toolSchema, params);

      // Should allow unknown parameter
      expect(result.normalized.unknown).toBe('extra param');
      expect(result.normalized.path).toBe('/tmp/test.txt');
      // Should log warning
      expect(result.warnings).toContain('Allowed unknown parameter "unknown" for tool "lenient_tool" in lenient mode');
    });

    test('should enforce required parameters', () => {
      ParameterMapper.configure({ enforceRequired: true });

      const toolSchema = {
        type: 'object',
        properties: {
          required_param: { type: 'string' },
          optional_param: { type: 'string' },
        },
        required: ['required_param'],
      };

      const params = { optional_param: 'value' }; // Missing required_param

      expect(() => {
        ParameterMapper.validateAndNormalize('required_tool', toolSchema, params);
      }).toThrow('Missing required parameter: "required_param"');
    });

    test('should not enforce required parameters when disabled', () => {
      ParameterMapper.configure({ enforceRequired: false });

      const toolSchema = {
        type: 'object',
        properties: {
          required_param: { type: 'string' },
          optional_param: { type: 'string' },
        },
        required: ['required_param'],
      };

      const params = { optional_param: 'value' }; // Missing required_param

      // Should not throw when enforceRequired is false
      const result = ParameterMapper.validateAndNormalize('required_tool', toolSchema, params);
      expect(result.normalized.required_param).toBeUndefined();
      expect(result.normalized.optional_param).toBe('value');
    });
  });

  describe('Mapping Suggestions', () => {
    test('should get mapping suggestions for tool', () => {
      const toolSchema = {
        type: 'object',
        properties: {
          path: { type: 'string' },
          search: { type: 'string' },
          data: { type: 'string' },
        },
      };

      const suggestions = ParameterMapper.getMappingSuggestions('file_tool', toolSchema);

      // Should include mappings for path, search, and data
      expect(suggestions.length).toBeGreaterThan(0);

      // Check for specific mappings
      const pathMappings = suggestions.filter(m => m.targetName === 'path');
      expect(pathMappings.length).toBeGreaterThan(0);
      expect(pathMappings.some(m => m.sourceName === 'filename')).toBe(true);
      expect(pathMappings.some(m => m.sourceName === 'file')).toBe(true);

      const searchMappings = suggestions.filter(m => m.targetName === 'search');
      expect(searchMappings.length).toBeGreaterThan(0);
      expect(searchMappings.some(m => m.sourceName === 'query')).toBe(true);

      const dataMappings = suggestions.filter(m => m.targetName === 'data');
      expect(dataMappings.length).toBeGreaterThan(0);
      expect(dataMappings.some(m => m.sourceName === 'content')).toBe(true);
    });

    test('should get domain-specific mapping suggestions', () => {
      const toolSchema = {
        type: 'object',
        properties: {
          url: { type: 'string' },
          method: { type: 'string' },
        },
      };

      const suggestions = ParameterMapper.getMappingSuggestions('http_api_tool', toolSchema);

      // Should include web API specific mappings
      const urlMappings = suggestions.filter(m => m.targetName === 'url');
      expect(urlMappings.some(m => m.sourceName === 'endpoint')).toBe(true);
      expect(urlMappings.some(m => m.sourceName === 'path')).toBe(true);

      const methodMappings = suggestions.filter(m => m.targetName === 'method');
      expect(methodMappings.some(m => m.sourceName === 'verb')).toBe(true);
    });
  });
});