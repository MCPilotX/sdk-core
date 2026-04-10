import { describe, it, expect, beforeEach } from '@jest/globals';
import { IntentEngine } from '../src/daemon/intent-engine';

describe('IntentEngine', () => {
  let intentEngine: IntentEngine;

  beforeEach(() => {
    intentEngine = new IntentEngine();
  });

  describe('constructor', () => {
    it('should initialize with available tools', () => {
      // The constructor initializes with hardcoded tools
      expect(intentEngine).toBeInstanceOf(IntentEngine);
      // We can't directly access private availableTools, but we can test through parse method
    });
  });

  describe('parse', () => {
    it('should parse filesystem queries', async () => {
      const result = await intentEngine.parse('list files in directory');
      
      expect(result).toEqual({
        tool: 'filesystem',
        action: 'list_directory',
        params: { path: '.' },
      });
    });

    it('should parse calculator queries', async () => {
      const result = await intentEngine.parse('calculate 2 + 2');
      
      expect(result).toEqual({
        tool: 'calculator',
        action: 'calculate',
        params: { expression: 'calculate 2 + 2' },
      });
    });

    it('should handle file read queries', async () => {
      const result = await intentEngine.parse('read file example.txt');
      
      // File read queries also match the filesystem pattern
      expect(result).toEqual({
        tool: 'filesystem',
        action: 'list_directory',
        params: { path: '.' },
      });
    });

    it('should handle subtraction queries', async () => {
      const result = await intentEngine.parse('subtract 5 from 10');
      
      expect(result).toEqual({
        tool: 'calculator',
        action: 'calculate',
        params: { expression: 'subtract 5 from 10' },
      });
    });

    it('should handle multiplication queries', async () => {
      const result = await intentEngine.parse('multiply 3 by 4');
      
      // Multiplication doesn't match any pattern, so it falls back to filesystem
      expect(result).toEqual({
        tool: 'filesystem',
        action: 'list_directory',
        params: { path: '.' },
      });
    });

    it('should handle division queries', async () => {
      const result = await intentEngine.parse('divide 20 by 5');
      
      // Division doesn't match any pattern, so it falls back to filesystem
      expect(result).toEqual({
        tool: 'filesystem',
        action: 'list_directory',
        params: { path: '.' },
      });
    });

    it('should return default for unknown queries', async () => {
      const result = await intentEngine.parse('unknown query that doesnt match anything');
      
      // Default fallback is filesystem list_directory
      expect(result).toEqual({
        tool: 'filesystem',
        action: 'list_directory',
        params: { path: '.' },
      });
    });

    it('should be case insensitive', async () => {
      const result1 = await intentEngine.parse('LIST FILES');
      const result2 = await intentEngine.parse('list files');
      
      expect(result1).toEqual(result2);
      expect(result1).toEqual({
        tool: 'filesystem',
        action: 'list_directory',
        params: { path: '.' },
      });
    });

    it('should handle math keyword', async () => {
      const result = await intentEngine.parse('do some math');
      
      expect(result).toEqual({
        tool: 'calculator',
        action: 'calculate',
        params: { expression: 'do some math' },
      });
    });

    it('should handle add keyword', async () => {
      const result = await intentEngine.parse('add numbers');
      
      expect(result).toEqual({
        tool: 'calculator',
        action: 'calculate',
        params: { expression: 'add numbers' },
      });
    });
  });

  describe('addTool', () => {
    it('should add a new tool', () => {
      const newTool = {
        name: 'weather',
        description: 'Get weather information',
        capabilities: ['get_forecast', 'get_current'],
      };
      
      intentEngine.addTool(newTool);
      
      // We can't directly test the internal array, but we can verify the tool was added
      // by checking that getTools returns it
      const tools = intentEngine.getTools();
      expect(tools).toContainEqual(newTool);
    });
  });

  describe('getTools', () => {
    it('should return available tools', () => {
      const tools = intentEngine.getTools();
      
      expect(tools).toHaveLength(2); // Default tools: filesystem and calculator
      expect(tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'filesystem',
            description: 'Read and list files in a directory',
            capabilities: ['list_directory', 'read_file'],
          }),
          expect.objectContaining({
            name: 'calculator',
            description: 'Perform mathematical calculations',
            capabilities: ['add', 'subtract', 'multiply', 'divide'],
          }),
        ])
      );
    });

    it('should return tools after adding new ones', () => {
      const newTool = {
        name: 'time',
        description: 'Get current time',
        capabilities: ['get_time'],
      };
      
      intentEngine.addTool(newTool);
      const tools = intentEngine.getTools();
      
      expect(tools).toHaveLength(3);
      expect(tools).toContainEqual(newTool);
    });

    it('should handle duplicate tool addition', () => {
      const newTool = {
        name: 'time',
        description: 'Get current time',
        capabilities: ['get_time'],
      };
      
      // Add same tool twice
      intentEngine.addTool(newTool);
      intentEngine.addTool(newTool);
      
      const tools = intentEngine.getTools();
      
      // Should have 4 tools (2 default + 2 duplicates)
      expect(tools).toHaveLength(4);
      expect(tools.filter(t => t.name === 'time')).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty query', async () => {
      const result = await intentEngine.parse('');
      
      expect(result).toEqual({
        tool: 'filesystem',
        action: 'list_directory',
        params: { path: '.' },
      });
    });

    it('should handle query with only whitespace', async () => {
      const result = await intentEngine.parse('   ');
      
      expect(result).toEqual({
        tool: 'filesystem',
        action: 'list_directory',
        params: { path: '.' },
      });
    });

    it('should handle very long query', async () => {
      const longQuery = 'list files in directory '.repeat(100);
      const result = await intentEngine.parse(longQuery);
      
      expect(result).toEqual({
        tool: 'filesystem',
        action: 'list_directory',
        params: { path: '.' },
      });
    });

    it('should handle query with special characters', async () => {
      const result = await intentEngine.parse('list files @#$%^&*()');
      
      expect(result).toEqual({
        tool: 'filesystem',
        action: 'list_directory',
        params: { path: '.' },
      });
    });

    it('should handle mixed case queries correctly', async () => {
      const result1 = await intentEngine.parse('LiSt FiLeS In DiReCtOrY');
      const result2 = await intentEngine.parse('CALCULATE 2 + 2');
      
      expect(result1).toEqual({
        tool: 'filesystem',
        action: 'list_directory',
        params: { path: '.' },
      });
      
      expect(result2).toEqual({
        tool: 'calculator',
        action: 'calculate',
        params: { expression: 'CALCULATE 2 + 2' },
      });
    });
  });

  describe('tool capabilities', () => {
    it('should parse query matching specific capability', async () => {
      // Add a tool with specific capability
      const weatherTool = {
        name: 'weather',
        description: 'Get weather information',
        capabilities: ['get_forecast', 'get_current'],
      };
      
      intentEngine.addTool(weatherTool);
      
      // Note: The current implementation doesn't use capabilities for parsing
      // This test verifies the tool was added correctly
      const tools = intentEngine.getTools();
      expect(tools).toContainEqual(weatherTool);
    });

    it('should maintain tool order after multiple additions', () => {
      const tool1 = { name: 'tool1', description: 'Tool 1', capabilities: ['cap1'] };
      const tool2 = { name: 'tool2', description: 'Tool 2', capabilities: ['cap2'] };
      
      intentEngine.addTool(tool1);
      intentEngine.addTool(tool2);
      
      const tools = intentEngine.getTools();
      
      // Default tools come first, then added tools in order
      expect(tools[2]).toEqual(tool1);
      expect(tools[3]).toEqual(tool2);
    });
  });
});
