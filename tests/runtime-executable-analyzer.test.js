import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { ExecutableAnalyzer } from '../src/runtime/executable-analyzer';
// Mock fs module
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    statSync: jest.fn(),
    readFileSync: jest.fn(),
    readdirSync: jest.fn(),
}));
// Mock path module
jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/')),
    extname: jest.fn((filePath) => {
        const match = filePath.match(/\.([^.]+)$/);
        return match ? `.${match[1]}` : '';
    }),
    relative: jest.fn((from, to) => to.replace(from + '/', '')),
}));
// Mock child_process module
jest.mock('child_process', () => ({
    execSync: jest.fn(),
}));
// Mock logger
jest.mock('../src/core/logger', () => ({
    logger: {
        debug: jest.fn(),
    },
}));
describe('ExecutableAnalyzer', () => {
    let mockExistsSync;
    let mockStatSync;
    let mockReadFileSync;
    let mockReaddirSync;
    let mockExecSync;
    beforeEach(() => {
        jest.clearAllMocks();
        mockExistsSync = fs.existsSync;
        mockStatSync = fs.statSync;
        mockReadFileSync = fs.readFileSync;
        mockReaddirSync = fs.readdirSync;
        mockExecSync = execSync;
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('analyze', () => {
        it('should return null when file does not exist', () => {
            mockExistsSync.mockReturnValue(false);
            const result = ExecutableAnalyzer.analyze('/nonexistent/file');
            expect(result).toBeNull();
        });
        it('should return null when path is not a file', () => {
            mockExistsSync.mockReturnValue(true);
            mockStatSync.mockReturnValue({ isFile: () => false });
            const result = ExecutableAnalyzer.analyze('/path/to/directory');
            expect(result).toBeNull();
        });
        it('should return null when file is not executable', () => {
            mockExistsSync.mockReturnValue(true);
            mockStatSync.mockReturnValue({ isFile: () => true });
            // Mock isExecutable to return false
            jest.spyOn(ExecutableAnalyzer, 'isExecutable').mockReturnValue(false);
            const result = ExecutableAnalyzer.analyze('/path/to/nonexecutable');
            expect(result).toBeNull();
        });
        it('should use file command analysis when available', () => {
            mockExistsSync.mockReturnValue(true);
            mockStatSync.mockReturnValue({ isFile: () => true });
            jest.spyOn(ExecutableAnalyzer, 'isExecutable').mockReturnValue(true);
            // Mock file command to return Node.js
            mockExecSync.mockReturnValue('Node.js script, ASCII text');
            const result = ExecutableAnalyzer.analyze('/path/to/script.js');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('node');
            expect(result?.confidence).toBe(0.95);
            expect(result?.details.method).toBe('fileCommand');
        });
        it('should fallback to magic number analysis when file command fails', () => {
            mockExistsSync.mockReturnValue(true);
            mockStatSync.mockReturnValue({ isFile: () => true });
            jest.spyOn(ExecutableAnalyzer, 'isExecutable').mockReturnValue(true);
            // Mock file command to fail
            mockExecSync.mockImplementation(() => {
                throw new Error('file command not found');
            });
            // Mock magic number detection for ELF file
            mockReadFileSync.mockReturnValue(Buffer.from([0x7f, 0x45, 0x4c, 0x46]));
            const result = ExecutableAnalyzer.analyze('/path/to/binary');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('binary');
            expect(result?.confidence).toBe(0.85);
            expect(result?.details.method).toBe('magicNumber');
        });
        it('should use shebang analysis for script files', () => {
            mockExistsSync.mockReturnValue(true);
            mockStatSync.mockReturnValue({ isFile: () => true });
            jest.spyOn(ExecutableAnalyzer, 'isExecutable').mockReturnValue(true);
            // Mock file command to fail
            mockExecSync.mockImplementation(() => {
                throw new Error('file command not found');
            });
            // Mock magic number detection to return null
            mockReadFileSync.mockImplementation((filePath, options) => {
                if (options?.flag === 'r') {
                    return Buffer.from([]); // Empty buffer for magic number detection
                }
                // For shebang detection
                return '#!/usr/bin/env node\nconsole.log("Hello")';
            });
            const result = ExecutableAnalyzer.analyze('/path/to/script.js');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('node');
            expect(result?.confidence).toBe(0.9);
            expect(result?.details.method).toBe('shebang');
        });
        it('should use extension analysis as last resort', () => {
            mockExistsSync.mockReturnValue(true);
            mockStatSync.mockReturnValue({ isFile: () => true });
            jest.spyOn(ExecutableAnalyzer, 'isExecutable').mockReturnValue(true);
            // Mock all other detection methods to return null
            mockExecSync.mockImplementation(() => {
                throw new Error('file command not found');
            });
            mockReadFileSync.mockReturnValue(Buffer.from([])); // Empty for magic numbers
            const result = ExecutableAnalyzer.analyze('/path/to/script.js');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('node');
            expect(result?.confidence).toBe(0.5);
            expect(result?.details.method).toBe('extension');
        });
        it('should select analysis with highest confidence', () => {
            mockExistsSync.mockReturnValue(true);
            mockStatSync.mockReturnValue({ isFile: () => true });
            jest.spyOn(ExecutableAnalyzer, 'isExecutable').mockReturnValue(true);
            // Mock multiple detection methods
            mockExecSync.mockReturnValue('Node.js script, ASCII text'); // Confidence 0.95
            mockReadFileSync.mockImplementation((filePath, options) => {
                if (options?.flag === 'r') {
                    return Buffer.from([0x7f, 0x45, 0x4c, 0x46]); // ELF, confidence 0.85
                }
                return '#!/usr/bin/env node\nconsole.log("Hello")'; // Shebang, confidence 0.9
            });
            const result = ExecutableAnalyzer.analyze('/path/to/script.js');
            expect(result).not.toBeNull();
            // Should select file command analysis with highest confidence (0.95)
            expect(result?.confidence).toBe(0.95);
            expect(result?.details.method).toBe('fileCommand');
        });
    });
    describe('analyzeWithFileCommand', () => {
        it('should detect ELF binary', () => {
            mockExecSync.mockReturnValue('ELF 64-bit LSB executable, x86-64, version 1 (SYSV), dynamically linked');
            const result = ExecutableAnalyzer.analyzeWithFileCommand('/path/to/binary');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('binary');
            expect(result?.confidence).toBe(0.9);
            expect(result?.details.result).toBe('ELF executable');
        });
        it('should detect Mach-O binary', () => {
            mockExecSync.mockReturnValue('Mach-O 64-bit executable x86_64');
            const result = ExecutableAnalyzer.analyzeWithFileCommand('/path/to/binary');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('binary');
            expect(result?.confidence).toBe(0.9);
            expect(result?.details.result).toBe('Mach-O executable');
        });
        it('should detect Windows PE binary', () => {
            mockExecSync.mockReturnValue('PE32+ executable (console) x86-64, for MS Windows');
            const result = ExecutableAnalyzer.analyzeWithFileCommand('/path/to/binary.exe');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('binary');
            expect(result?.confidence).toBe(0.9);
            expect(result?.details.result).toBe('Windows PE executable');
        });
        it('should detect Node.js script', () => {
            mockExecSync.mockReturnValue('Node.js script, ASCII text');
            const result = ExecutableAnalyzer.analyzeWithFileCommand('/path/to/script.js');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('node');
            expect(result?.confidence).toBe(0.95);
            expect(result?.details.result).toBe('Node.js script');
        });
        it('should detect Python script', () => {
            mockExecSync.mockReturnValue('Python script, ASCII text');
            const result = ExecutableAnalyzer.analyzeWithFileCommand('/path/to/script.py');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('python');
            expect(result?.confidence).toBe(0.95);
            expect(result?.details.result).toBe('Python script');
        });
        it('should detect Bash script', () => {
            mockExecSync.mockReturnValue('Bourne-Again shell script, ASCII text');
            const result = ExecutableAnalyzer.analyzeWithFileCommand('/path/to/script.sh');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('binary');
            expect(result?.confidence).toBe(0.85);
            expect(result?.details.result).toBe('Bash script');
        });
        it('should return null for unrecognized file type', () => {
            mockExecSync.mockReturnValue('data');
            const result = ExecutableAnalyzer.analyzeWithFileCommand('/path/to/data.bin');
            expect(result).toBeNull();
        });
        it('should handle file command errors', () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('file command not found');
            });
            const result = ExecutableAnalyzer.analyzeWithFileCommand('/path/to/file');
            expect(result).toBeNull();
        });
    });
    describe('analyzeWithMagicNumbers', () => {
        it('should detect ELF file', () => {
            mockReadFileSync.mockReturnValue(Buffer.from([0x7f, 0x45, 0x4c, 0x46]));
            const result = ExecutableAnalyzer.analyzeWithMagicNumbers('/path/to/elf');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('binary');
            expect(result?.confidence).toBe(0.85);
            expect(result?.details.result).toBe('ELF executable');
        });
        it('should detect Mach-O file (64-bit)', () => {
            mockReadFileSync.mockReturnValue(Buffer.from([0xcf, 0xfa, 0xed, 0xfe]));
            const result = ExecutableAnalyzer.analyzeWithMagicNumbers('/path/to/macho64');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('binary');
            expect(result?.confidence).toBe(0.85);
            expect(result?.details.result).toBe('Mach-O executable');
        });
        it('should detect Mach-O file (32-bit)', () => {
            mockReadFileSync.mockReturnValue(Buffer.from([0xce, 0xfa, 0xed, 0xfe]));
            const result = ExecutableAnalyzer.analyzeWithMagicNumbers('/path/to/macho32');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('binary');
            expect(result?.confidence).toBe(0.85);
            expect(result?.details.result).toBe('Mach-O executable');
        });
        it('should detect Windows PE file', () => {
            mockReadFileSync.mockReturnValue(Buffer.from([0x4d, 0x5a]));
            const result = ExecutableAnalyzer.analyzeWithMagicNumbers('/path/to/pe.exe');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('binary');
            expect(result?.confidence).toBe(0.85);
            expect(result?.details.result).toBe('Windows PE executable');
        });
        it('should detect Java class file', () => {
            mockReadFileSync.mockReturnValue(Buffer.from([0xca, 0xfe, 0xba, 0xbe]));
            const result = ExecutableAnalyzer.analyzeWithMagicNumbers('/path/to/Test.class');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('java');
            expect(result?.confidence).toBe(0.9);
            expect(result?.details.result).toBe('Java class file');
        });
        it('should return null for unknown magic numbers', () => {
            mockReadFileSync.mockReturnValue(Buffer.from([0x00, 0x01, 0x02, 0x03]));
            const result = ExecutableAnalyzer.analyzeWithMagicNumbers('/path/to/unknown');
            expect(result).toBeNull();
        });
        it('should handle read errors', () => {
            mockReadFileSync.mockImplementation(() => {
                throw new Error('Cannot read file');
            });
            const result = ExecutableAnalyzer.analyzeWithMagicNumbers('/path/to/unreadable');
            expect(result).toBeNull();
        });
    });
    describe('analyzeShebang', () => {
        it('should detect Node.js shebang', () => {
            mockReadFileSync.mockReturnValue('#!/usr/bin/env node\nconsole.log("Hello")');
            const result = ExecutableAnalyzer.analyzeShebang('/path/to/script.js');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('node');
            expect(result?.confidence).toBe(0.9);
            expect(result?.details.result).toContain('node');
        });
        it('should detect Python shebang', () => {
            mockReadFileSync.mockReturnValue('#!/usr/bin/env python3\nprint("Hello")');
            const result = ExecutableAnalyzer.analyzeShebang('/path/to/script.py');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('python');
            expect(result?.confidence).toBe(0.9);
            expect(result?.details.result).toContain('python');
        });
        it('should detect Bash shebang', () => {
            mockReadFileSync.mockReturnValue('#!/bin/bash\necho "Hello"');
            const result = ExecutableAnalyzer.analyzeShebang('/path/to/script.sh');
            expect(result).not.toBeNull();
            expect(result?.type).toBe('binary');
            expect(result?.confidence).toBe(0.85);
            expect(result?.details.result).toContain('bash');
        });
        it('should return null when no shebang', () => {
            mockReadFileSync.mockReturnValue('console.log("Hello")');
            const result = ExecutableAnalyzer.analyzeShebang('/path/to/script.js');
            expect(result).toBeNull();
        });
        it('should handle read errors', () => {
            mockReadFileSync.mockImplementation(() => {
                throw new Error('Cannot read file');
            });
            const result = ExecutableAnalyzer.analyzeShebang('/path/to/unreadable');
            expect(result).toBeNull();
        });
    });
    describe('isExecutable', () => {
        beforeEach(() => {
            // Reset platform to non-Windows for most tests
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                writable: true,
            });
        });
        it('should return true for Unix executable files', () => {
            mockStatSync.mockReturnValue({ mode: 0o755 }); // Executable permissions
            const result = ExecutableAnalyzer.isExecutable('/path/to/script');
            expect(result).toBe(true);
        });
        it('should return false for Unix non-executable files', () => {
            mockStatSync.mockReturnValue({ mode: 0o644 }); // Non-executable permissions
            const result = ExecutableAnalyzer.isExecutable('/path/to/file.txt');
            expect(result).toBe(false);
        });
        it('should return true for Windows executable extensions', () => {
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                writable: true,
            });
            const result = ExecutableAnalyzer.isExecutable('/path/to/program.exe');
            expect(result).toBe(true);
        });
        it('should return true for files with shebang', () => {
            mockStatSync.mockReturnValue({ mode: 0o644 }); // Non-executable permissions
            mockReadFileSync.mockReturnValue('#!/usr/bin/env bash\necho "Hello"');
            const result = ExecutableAnalyzer.isExecutable('/path/to/script.sh');
            expect(result).toBe(true);
        });
        it('should handle stat errors', () => {
            mockStatSync.mockImplementation(() => {
                throw new Error('Cannot stat file');
            });
            const result = ExecutableAnalyzer.isExecutable('/path/to/inaccessible');
            expect(result).toBe(false);
        });
    });
    describe('findExecutables', () => {
        it('should return empty array when directory does not exist', () => {
            mockExistsSync.mockReturnValue(false);
            const result = ExecutableAnalyzer.findExecutables('/nonexistent/dir');
            expect(result).toEqual([]);
        });
        it('should return empty array when readdir fails', () => {
            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockImplementation(() => {
                throw new Error('Cannot read directory');
            });
            const result = ExecutableAnalyzer.findExecutables('/path/to/dir');
            expect(result).toEqual([]);
        });
        it('should find executable files', () => {
            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue(['script.sh', 'data.txt', 'binary']);
            mockStatSync.mockImplementation((filePath) => {
                return { isFile: () => !filePath.includes('data.txt') };
            });
            // Mock isExecutable to return true for script.sh and binary
            jest.spyOn(ExecutableAnalyzer, 'isExecutable').mockImplementation((filePath) => {
                return filePath.includes('script.sh') || filePath.includes('binary');
            });
            const result = ExecutableAnalyzer.findExecutables('/path/to/dir');
            expect(result).toHaveLength(2);
            expect(result).toContain('/path/to/dir/script.sh');
            expect(result).toContain('/path/to/dir/binary');
        });
        it('should skip inaccessible files', () => {
            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue(['script.sh', 'inaccessible']);
            mockStatSync.mockImplementation((filePath) => {
                if (filePath.includes('inaccessible')) {
                    throw new Error('Permission denied');
                }
                return { isFile: () => true };
            });
            jest.spyOn(ExecutableAnalyzer, 'isExecutable').mockReturnValue(true);
            const result = ExecutableAnalyzer.findExecutables('/path/to/dir');
            expect(result).toHaveLength(1);
            expect(result[0]).toBe('/path/to/dir/script.sh');
        });
    });
    describe('getPrimaryExecutable', () => {
        it('should return null when no executables found', () => {
            jest.spyOn(ExecutableAnalyzer, 'findExecutables').mockReturnValue([]);
            const result = ExecutableAnalyzer.getPrimaryExecutable('/path/to/dir');
            expect(result).toBeNull();
        });
        it('should prefer files without extensions', () => {
            jest.spyOn(ExecutableAnalyzer, 'findExecutables').mockReturnValue([
                '/path/to/dir/script.sh',
                '/path/to/dir/binary',
                '/path/to/dir/program.exe',
            ]);
            const result = ExecutableAnalyzer.getPrimaryExecutable('/path/to/dir');
            expect(result).toBe('/path/to/dir/binary');
        });
        it('should prefer common executable extensions', () => {
            jest.spyOn(ExecutableAnalyzer, 'findExecutables').mockReturnValue([
                '/path/to/dir/script.sh',
                '/path/to/dir/program.exe',
                '/path/to/dir/app.bin',
            ]);
            const result = ExecutableAnalyzer.getPrimaryExecutable('/path/to/dir');
            expect(result).toBe('/path/to/dir/program.exe');
        });
        it('should return first executable when no preferences match', () => {
            jest.spyOn(ExecutableAnalyzer, 'findExecutables').mockReturnValue([
                '/path/to/dir/script.sh',
                '/path/to/dir/other.script',
            ]);
            const result = ExecutableAnalyzer.getPrimaryExecutable('/path/to/dir');
            expect(result).toBe('/path/to/dir/script.sh');
        });
    });
    describe('analyzeDirectory', () => {
        it('should analyze all executable files in directory', () => {
            jest.spyOn(ExecutableAnalyzer, 'findExecutables').mockReturnValue([
                '/path/to/dir/script.js',
                '/path/to/dir/binary',
            ]);
            jest.spyOn(ExecutableAnalyzer, 'analyze').mockImplementation((filePath) => {
                if (filePath.includes('script.js')) {
                    return {
                        type: 'node',
                        confidence: 0.95,
                        details: { method: 'fileCommand', result: 'Node.js script' },
                    };
                }
                return {
                    type: 'binary',
                    confidence: 0.9,
                    details: { method: 'fileCommand', result: 'ELF executable' },
                };
            });
            const result = ExecutableAnalyzer.analyzeDirectory('/path/to/dir');
            expect(result).toHaveLength(2);
            expect(result[0].file).toBe('script.js');
            expect(result[0].analysis.type).toBe('node');
            expect(result[1].file).toBe('binary');
            expect(result[1].analysis.type).toBe('binary');
        });
        it('should skip files that cannot be analyzed', () => {
            jest.spyOn(ExecutableAnalyzer, 'findExecutables').mockReturnValue([
                '/path/to/dir/script.js',
                '/path/to/dir/unanalyzable',
            ]);
            jest.spyOn(ExecutableAnalyzer, 'analyze').mockImplementation((filePath) => {
                if (filePath.includes('unanalyzable')) {
                    return null;
                }
                return {
                    type: 'node',
                    confidence: 0.95,
                    details: { method: 'fileCommand', result: 'Node.js script' },
                };
            });
            const result = ExecutableAnalyzer.analyzeDirectory('/path/to/dir');
            expect(result).toHaveLength(1);
            expect(result[0].file).toBe('script.js');
        });
        it('should return empty array when no executables found', () => {
            jest.spyOn(ExecutableAnalyzer, 'findExecutables').mockReturnValue([]);
            const result = ExecutableAnalyzer.analyzeDirectory('/path/to/dir');
            expect(result).toEqual([]);
        });
    });
});
//# sourceMappingURL=runtime-executable-analyzer.test.js.map