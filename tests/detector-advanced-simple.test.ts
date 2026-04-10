/**
 * Simplified test suite for EnhancedRuntimeDetector
 * Focus on improving coverage with simpler mocks
 */
// @ts-nocheck

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EnhancedRuntimeDetector } from '../src/runtime/detector-advanced';
import { ExecutableAnalyzer } from '../src/runtime/executable-analyzer';
import { RuntimeDetector } from '../src/runtime/detector';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../src/runtime/executable-analyzer');
// Note: We're NOT mocking RuntimeDetector here, we'll mock it directly in tests
jest.mock('../src/core/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('EnhancedRuntimeDetector - Simplified Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
  });

  describe('detect method', () => {
    it('should throw error for non-existent service path', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(EnhancedRuntimeDetector.detect('/nonexistent/path'))
        .rejects.toThrow('Service path does not exist');
    });

    it('should select enhanced result when confidence >= 0.7', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      // Mock private methods directly
      const mockLegacyResult = {
        runtime: 'python',
        confidence: 0.6,
        evidence: {},
        source: 'legacy'
      };
      
      const mockEnhancedResult = {
        runtime: 'node',
        confidence: 0.75,
        evidence: {},
        source: 'enhanced'
      };

      jest.spyOn(EnhancedRuntimeDetector as any, 'runLegacyDetector')
        .mockResolvedValue(mockLegacyResult);
      jest.spyOn(EnhancedRuntimeDetector as any, 'runEnhancedDetection')
        .mockResolvedValue(mockEnhancedResult);

      const result = await EnhancedRuntimeDetector.detect('/test/path');
      expect(result.runtime).toBe('node');
      expect(result.source).toBe('enhanced');
    });

    it('should select legacy result when enhanced confidence < 0.7 and legacy >= 0.5', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      const mockLegacyResult = {
        runtime: 'docker',
        confidence: 0.6,
        evidence: {},
        source: 'legacy'
      };
      
      const mockEnhancedResult = {
        runtime: 'binary',
        confidence: 0.4,
        evidence: {},
        source: 'enhanced'
      };

      jest.spyOn(EnhancedRuntimeDetector as any, 'runLegacyDetector')
        .mockResolvedValue(mockLegacyResult);
      jest.spyOn(EnhancedRuntimeDetector as any, 'runEnhancedDetection')
        .mockResolvedValue(mockEnhancedResult);

      const result = await EnhancedRuntimeDetector.detect('/test/path');
      expect(result.runtime).toBe('docker');
      expect(result.source).toBe('legacy');
      expect(result.warning).toContain('Using traditional detector');
    });
  });

  describe('quickDetect method', () => {
    it('should detect Docker runtime with high confidence', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.endsWith('Dockerfile') || filePath.includes('/Dockerfile');
      });

      const result = EnhancedRuntimeDetector.quickDetect('/test/path');
      expect(result.runtime).toBe('docker');
      expect(result.confidence).toBe(0.9);
    });

    it('should detect Node.js runtime with high confidence', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.endsWith('package.json') || filePath.includes('/package.json');
      });

      const result = EnhancedRuntimeDetector.quickDetect('/test/path');
      expect(result.runtime).toBe('node');
      expect(result.confidence).toBe(0.8);
    });

    it('should use executable analysis when available', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const mockAnalysis = {
        type: 'python',
        confidence: 0.7,
        details: {}
      };
      
      (ExecutableAnalyzer.getPrimaryExecutable as jest.Mock).mockReturnValue('/test/executable');
      (ExecutableAnalyzer.analyze as jest.Mock).mockReturnValue(mockAnalysis);

      const result = EnhancedRuntimeDetector.quickDetect('/test/path');
      expect(result.runtime).toBe('python');
      expect(result.confidence).toBe(0.7);
    });

    it('should handle errors gracefully', () => {
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('File system error');
      });

      const result = EnhancedRuntimeDetector.quickDetect('/test/path');
      expect(result.runtime).toBe('binary');
      expect(result.confidence).toBe(0.1);
    });
  });

  describe('private method tests with direct spying', () => {
    describe('runLegacyDetector', () => {
      beforeEach(() => {
        // Clear any existing mocks before each test
        jest.restoreAllMocks();
      });

      it('should detect docker runtime with high confidence', async () => {
        // Mock RuntimeDetector.detect to return 'docker'
        const mockDetect = jest.spyOn(RuntimeDetector, 'detect').mockReturnValue('docker');
        
        const result = await (EnhancedRuntimeDetector as any).runLegacyDetector('/test/path');
        expect(result.runtime).toBe('docker');
        expect(result.confidence).toBe(0.8); // Docker should have 0.8 confidence
        expect(result.source).toBe('legacy');
        expect(result.evidence.projectFiles).toEqual({
          files: ['Dockerfile'],
          confidence: 0.8,
        });
        
        mockDetect.mockRestore();
      });

      it('should detect node runtime with high confidence', async () => {
        // Mock RuntimeDetector.detect to return 'node'
        const mockDetect = jest.spyOn(RuntimeDetector, 'detect').mockReturnValue('node');
        
        const result = await (EnhancedRuntimeDetector as any).runLegacyDetector('/test/path');
        expect(result.runtime).toBe('node');
        expect(result.confidence).toBe(0.7); // Node should have 0.7 confidence
        expect(result.source).toBe('legacy');
        expect(result.evidence.projectFiles).toEqual({
          files: ['package.json'],
          confidence: 0.7,
        });
        
        mockDetect.mockRestore();
      });

      it('should handle binary detection with low confidence', async () => {
        // Mock RuntimeDetector.detect to return 'binary'
        const mockDetect = jest.spyOn(RuntimeDetector, 'detect').mockReturnValue('binary');
        
        const result = await (EnhancedRuntimeDetector as any).runLegacyDetector('/test/path');
        expect(result.runtime).toBe('binary');
        expect(result.confidence).toBe(0.4); // Binary should have 0.4 confidence
        expect(result.source).toBe('legacy');
        
        mockDetect.mockRestore();
      });

      it('should handle detection errors gracefully', async () => {
        // Mock RuntimeDetector.detect to throw an error
        const mockDetect = jest.spyOn(RuntimeDetector, 'detect').mockImplementation(() => {
          throw new Error('Detection failed');
        });
        
        const result = await (EnhancedRuntimeDetector as any).runLegacyDetector('/test/path');
        expect(result.runtime).toBe('binary');
        expect(result.confidence).toBe(0.1); // Error case should have 0.1 confidence
        expect(result.source).toBe('legacy');
        expect(result.warning).toContain('Traditional detector failed: Detection failed');
        
        mockDetect.mockRestore();
      });
    });

    describe('analyzeProjectFiles', () => {
      it('should detect Dockerfile with high confidence', () => {
        (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
          return filePath.includes('Dockerfile');
        });

        const result = (EnhancedRuntimeDetector as any).analyzeProjectFiles('/test/path');
        expect(result.files).toContain('Dockerfile');
        expect(result.confidence).toBe(0.9);
      });

      it('should return null when no configuration files found', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        const result = (EnhancedRuntimeDetector as any).analyzeProjectFiles('/test/path');
        expect(result).toBeNull();
      });
    });

    describe('determineRuntimeFromEvidence', () => {
      it('should prioritize executable analysis with high confidence', () => {
        const evidence = {
          executableAnalysis: {
            type: 'python',
            confidence: 0.8
          }
        };

        const result = (EnhancedRuntimeDetector as any).determineRuntimeFromEvidence(evidence, 0.8);
        expect(result).toBe('python');
      });

      it('should use project files when executable analysis not available', () => {
        const evidence = {
          projectFiles: {
            files: ['Dockerfile'],
            confidence: 0.9
          }
        };

        const result = (EnhancedRuntimeDetector as any).determineRuntimeFromEvidence(evidence, 0.9);
        expect(result).toBe('docker');
      });

      it('should return binary as default', () => {
        const evidence = {};
        const result = (EnhancedRuntimeDetector as any).determineRuntimeFromEvidence(evidence, 0.1);
        expect(result).toBe('binary');
      });
    });

    describe('generateRuntimeSuggestions', () => {
      it('should suggest Node.js for JavaScript files', () => {
        (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
          return filePath && (filePath.includes('index.js') || filePath.includes('app.js'));
        });
        
        // Mock ExecutableAnalyzer.findExecutables to return empty array
        (ExecutableAnalyzer.findExecutables as jest.Mock).mockReturnValue([]);

        const result = (EnhancedRuntimeDetector as any).generateRuntimeSuggestions('/test/path');
        expect(result).toContain('Detected JavaScript file, may be Node.js service');
      });

      it('should suggest binary for executable files', () => {
        (ExecutableAnalyzer.findExecutables as jest.Mock).mockReturnValue(['/test/executable1', '/test/executable2']);
        
        const result = (EnhancedRuntimeDetector as any).generateRuntimeSuggestions('/test/path');
        expect(result).toContain('Found 2 executable files, may be binary service');
      });
    });

    describe('findPythonConfigFiles', () => {
      it('should find Python configuration files', () => {
        (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
          return filePath.includes('requirements.txt') || filePath.includes('pyproject.toml');
        });
        
        const result = (EnhancedRuntimeDetector as any).findPythonConfigFiles('/test/path');
        expect(result).toContain('requirements.txt');
        expect(result).toContain('pyproject.toml');
      });

      it('should return empty array when no Python config files found', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        
        const result = (EnhancedRuntimeDetector as any).findPythonConfigFiles('/test/path');
        expect(result).toEqual([]);
      });
    });

    describe('findJavaConfigFiles', () => {
      it('should find Java configuration files', () => {
        (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
          return filePath.includes('pom.xml') || filePath.includes('build.gradle');
        });
        
        const result = (EnhancedRuntimeDetector as any).findJavaConfigFiles('/test/path');
        expect(result).toContain('pom.xml');
        expect(result).toContain('build.gradle');
      });

      it('should return empty array when no Java config files found', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        
        const result = (EnhancedRuntimeDetector as any).findJavaConfigFiles('/test/path');
        expect(result).toEqual([]);
      });
    });

    describe('generateLowConfidenceWarning', () => {
      it('should generate warning with both detector results', () => {
        const legacyResult = {
          runtime: 'binary',
          confidence: 0.3
        };
        
        const enhancedResult = {
          runtime: 'binary',
          confidence: 0.2
        };
        
        const result = (EnhancedRuntimeDetector as any).generateLowConfidenceWarning(legacyResult, enhancedResult);
        
        expect(result).toContain('Cannot reliably determine runtime type');
        expect(result).toContain('Traditional detector result: binary (confidence: 0.30)');
        expect(result).toContain('Enhanced detector result: binary (confidence: 0.20)');
        expect(result).toContain('Please use --runtime parameter');
      });
    });
  });
});