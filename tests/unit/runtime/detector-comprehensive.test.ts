/**
 * Comprehensive tests for RuntimeDetector
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { RuntimeDetector } from '../../../src/runtime/detector';

// Mock fs module
jest.mock('fs');
jest.mock('path');

describe('RuntimeDetector Comprehensive Tests', () => {
  let mockFs: any;
  let mockPath: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs = fs as any;
    mockPath = path as any;
    
    // Mock path.join to return predictable paths
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'));
    
    // Default mock implementations
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readdirSync.mockReturnValue([]);
    mockFs.statSync.mockImplementation((filePath: string) => ({
      isFile: () => true,
      isDirectory: () => false,
    }));
  });

  describe('detect method', () => {
    it('should detect Docker runtime when Dockerfile exists', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath === 'test-service/Dockerfile';
      });
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('docker');
    });

    it('should detect Node.js runtime when package.json exists', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath === 'test-service/package.json';
      });
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('node');
    });

    it('should detect Python runtime when requirements.txt exists', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath === 'test-service/requirements.txt';
      });
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('python');
    });

    it('should detect Python runtime when setup.py exists', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath === 'test-service/setup.py';
      });
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('python');
    });

    it('should detect Python runtime when pyproject.toml exists', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath === 'test-service/pyproject.toml';
      });
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('python');
    });

    it('should detect Go runtime when go.mod exists', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath === 'test-service/go.mod';
      });
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('go');
    });

    it('should detect Rust runtime when Cargo.toml exists', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath === 'test-service/Cargo.toml';
      });
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('rust');
    });

    it('should detect Java runtime when pom.xml exists', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath === 'test-service/pom.xml';
      });
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('java');
    });

    it('should return binary as default when no runtime detected', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('binary');
    });

    it('should prioritize Docker over other runtimes', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath === 'test-service/Dockerfile' || 
               filePath === 'test-service/package.json' ||
               filePath === 'test-service/requirements.txt';
      });
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('docker'); // Docker should be detected first
    });

    it('should prioritize Node.js over Python when both exist', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath === 'test-service/package.json' ||
               filePath === 'test-service/requirements.txt';
      });
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('node'); // Node.js should be detected before Python
    });
  });

  describe('edge cases', () => {
    it('should handle empty service path', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const result = RuntimeDetector.detect('');
      expect(result).toBe('binary');
    });

    it('should handle non-existent service path', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const result = RuntimeDetector.detect('non-existent-path');
      expect(result).toBe('binary');
    });

    it('should handle multiple Python indicators', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath === 'test-service/requirements.txt' ||
               filePath === 'test-service/setup.py' ||
               filePath === 'test-service/pyproject.toml';
      });
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('python');
    });
  });

  describe('file extension detection', () => {
    it('should detect Go runtime from .go file extension', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue(['main.go', 'utils.go']);
      mockFs.statSync.mockImplementation((filePath: string) => ({
        isFile: () => true,
        isDirectory: () => false,
      }));
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('go');
    });

    it('should detect Rust runtime from .rs file extension', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue(['main.rs', 'lib.rs']);
      mockFs.statSync.mockImplementation((filePath: string) => ({
        isFile: () => true,
        isDirectory: () => false,
      }));
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('rust');
    });

    it('should detect Python runtime from .py file extension', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue(['main.py', 'utils.py']);
      mockFs.statSync.mockImplementation((filePath: string) => ({
        isFile: () => true,
        isDirectory: () => false,
      }));
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('python');
    });

    it('should detect Node.js runtime from .js file extension', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue(['index.js', 'app.js']);
      mockFs.statSync.mockImplementation((filePath: string) => ({
        isFile: () => true,
        isDirectory: () => false,
      }));
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('node');
    });

    it('should detect Node.js runtime from .ts file extension', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue(['index.ts', 'app.ts']);
      mockFs.statSync.mockImplementation((filePath: string) => ({
        isFile: () => true,
        isDirectory: () => false,
      }));
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('node');
    });

    it('should prioritize standard config files over file extensions', () => {
      // Both package.json and .js files exist, but package.json should take precedence
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath === 'test-service/package.json';
      });
      mockFs.readdirSync.mockReturnValue(['index.js', 'package.json']);
      mockFs.statSync.mockImplementation((filePath: string) => ({
        isFile: () => true,
        isDirectory: () => false,
      }));
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('node'); // From package.json, not from .js extension
    });

    it('should handle directories in file list', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue(['src', 'main.go', 'README.md']);
      mockFs.statSync.mockImplementation((filePath: string) => {
        if (filePath.includes('src')) {
          return { isFile: () => false, isDirectory: () => true };
        }
        return { isFile: () => true, isDirectory: () => false };
      });
      
      const result = RuntimeDetector.detect('test-service');
      expect(result).toBe('go'); // Should detect from .go file, ignore directory
    });
  });
});