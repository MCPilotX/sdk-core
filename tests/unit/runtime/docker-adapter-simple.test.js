/**
 * Simple tests for DockerAdapter
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DockerAdapter } from '../../../src/runtime/docker-adapter';
// Mock child_process module
jest.mock('child_process', () => ({
    spawn: jest.fn(),
    execSync: jest.fn(),
}));
// Mock fs module
jest.mock('fs');
jest.mock('path');
describe('DockerAdapter Simple Tests', () => {
    let dockerAdapter;
    beforeEach(() => {
        jest.clearAllMocks();
        // Get the mock functions
        const childProcess = require('child_process');
        const mockSpawn = childProcess.spawn;
        const mockExecSync = childProcess.execSync;
        // Mock execSync to simulate Docker is installed
        mockExecSync.mockImplementation((command) => {
            if (command.includes('--version')) {
                return; // Docker is installed
            }
            if (command.includes('image inspect')) {
                throw new Error('Image not found'); // Simulate image doesn't exist
            }
            return; // Other commands succeed
        });
        // Mock spawn to simulate Docker is installed
        mockSpawn.mockImplementation((command, args) => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                stdin: { write: jest.fn() },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        setTimeout(() => callback(0), 10);
                    }
                    return mockProcess;
                }),
                kill: jest.fn(),
                pid: 12345,
            };
            return mockProcess;
        });
        // Create DockerAdapter instance
        dockerAdapter = new DockerAdapter();
    });
    describe('getSpawnArgs', () => {
        it('should generate Docker run arguments with basic config', () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.command).toBe('docker');
            expect(result.args).toContain('run');
            expect(result.args).toContain('-d');
            expect(result.args).toContain('--rm');
            expect(result.args).toContain('--name');
            expect(result.args[result.args.indexOf('--name') + 1]).toMatch(/^mcp-test-service-/);
        });
        it('should include environment variables in args', () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
                env: {
                    NODE_ENV: 'production',
                    API_KEY: 'test-key',
                },
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.args).toContain('-e');
            expect(result.args).toContain('NODE_ENV=production');
            expect(result.args).toContain('-e');
            expect(result.args).toContain('API_KEY=test-key');
        });
        it('should include port mappings in args', () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
                ports: [3000, 8080],
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.args).toContain('-p');
            expect(result.args).toContain('3000:3000');
            expect(result.args).toContain('-p');
            expect(result.args).toContain('8080:8080');
        });
        it('should include volume mappings in args', () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
                volumes: ['/host:/container', '/data:/app/data'],
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.args).toContain('-v');
            expect(result.args).toContain('/host:/container');
            expect(result.args).toContain('-v');
            expect(result.args).toContain('/data:/app/data');
        });
        it('should include working directory in args', () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
                workdir: '/app',
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.args).toContain('-w');
            expect(result.args).toContain('/app');
        });
        it('should include command arguments in args', () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
                args: ['echo', 'Hello World'],
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.args).toContain('echo');
            expect(result.args).toContain('Hello World');
        });
        it('should use image name when provided', () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
                image: 'nginx:latest',
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.args).toContain('nginx:latest');
        });
        it('should use service name as image when image not provided', () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
            };
            const result = dockerAdapter.getSpawnArgs(config);
            // The image should be the service name
            expect(result.args[result.args.length - 1]).toBe('test-service');
        });
    });
    describe('setup', () => {
        it('should setup Docker service', async () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
            };
            // Mock console.log to capture output
            const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => { });
            await expect(dockerAdapter.setup(config)).resolves.not.toThrow();
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('[Docker] Setting up service: test-service'));
            mockConsoleLog.mockRestore();
        });
        it('should handle setup with environment variables', async () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
                env: {
                    NODE_ENV: 'test',
                },
            };
            const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => { });
            await expect(dockerAdapter.setup(config)).resolves.not.toThrow();
            mockConsoleLog.mockRestore();
        });
        it('should handle Docker not installed', async () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
            };
            // Mock execSync to throw error (simulating Docker not installed)
            const childProcess = require('child_process');
            const mockExecSync = childProcess.execSync;
            mockExecSync.mockImplementation((command) => {
                if (command.includes('--version')) {
                    throw new Error('docker: command not found');
                }
                return;
            });
            await expect(dockerAdapter.setup(config)).rejects.toThrow('Docker is not installed or not in PATH');
        });
        it('should pull image when it does not exist', async () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
                image: 'nginx:latest',
            };
            // Mock console.log to capture output
            const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => { });
            // Mock execSync to simulate image doesn't exist, then pull succeeds
            const childProcess = require('child_process');
            const mockExecSync = childProcess.execSync;
            let callCount = 0;
            mockExecSync.mockImplementation((command) => {
                callCount++;
                if (callCount === 1) {
                    // First call: docker --version (succeeds)
                    return;
                }
                else if (callCount === 2) {
                    // Second call: docker image inspect (fails - image doesn't exist)
                    throw new Error('No such image');
                }
                else if (callCount === 3) {
                    // Third call: docker pull (succeeds)
                    return;
                }
                return;
            });
            await expect(dockerAdapter.setup(config)).resolves.not.toThrow();
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('[Docker] Pulling image: nginx:latest'));
            mockConsoleLog.mockRestore();
        });
        it('should handle image pull failure', async () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
                image: 'nonexistent-image:latest',
            };
            // Mock execSync to simulate image doesn't exist and pull fails
            const childProcess = require('child_process');
            const mockExecSync = childProcess.execSync;
            let callCount = 0;
            mockExecSync.mockImplementation((command) => {
                callCount++;
                if (callCount === 1) {
                    // First call: docker --version (succeeds)
                    return;
                }
                else if (callCount === 2) {
                    // Second call: docker image inspect (fails - image doesn't exist)
                    throw new Error('No such image');
                }
                else if (callCount === 3) {
                    // Third call: docker pull (fails)
                    throw new Error('Failed to pull image');
                }
                return;
            });
            await expect(dockerAdapter.setup(config)).rejects.toThrow('Failed to pull Docker image');
        });
        it('should use existing image when it already exists', async () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
                image: 'nginx:latest',
            };
            // Mock console.log to capture output
            const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => { });
            // Mock execSync to simulate image already exists
            const childProcess = require('child_process');
            const mockExecSync = childProcess.execSync;
            let callCount = 0;
            mockExecSync.mockImplementation((command) => {
                callCount++;
                if (callCount === 1) {
                    // First call: docker --version (succeeds)
                    return;
                }
                else if (callCount === 2) {
                    // Second call: docker image inspect (succeeds - image exists)
                    return;
                }
                return;
            });
            await expect(dockerAdapter.setup(config)).resolves.not.toThrow();
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('[Docker] Image nginx:latest already exists'));
            mockConsoleLog.mockRestore();
        });
        it('should build Docker image when dockerfile is specified', async () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
                dockerfile: 'Dockerfile.custom',
            };
            // Mock console.log to capture output
            const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => { });
            // Mock fs.existsSync to return true (Dockerfile exists)
            const fs = require('fs');
            const mockExistsSync = fs.existsSync;
            mockExistsSync.mockReturnValue(true);
            // Mock execSync for Docker build
            const childProcess = require('child_process');
            const mockExecSync = childProcess.execSync;
            let callCount = 0;
            mockExecSync.mockImplementation((command) => {
                callCount++;
                if (callCount === 1) {
                    // First call: docker --version (succeeds)
                    return;
                }
                else if (callCount === 2) {
                    // Second call: docker build (succeeds)
                    return;
                }
                return;
            });
            await expect(dockerAdapter.setup(config)).resolves.not.toThrow();
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('[Docker] Building image from'));
            mockConsoleLog.mockRestore();
        });
        it('should handle Docker build failure', async () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
                dockerfile: 'Dockerfile.custom',
            };
            // Mock fs.existsSync to return true (Dockerfile exists)
            const fs = require('fs');
            const mockExistsSync = fs.existsSync;
            mockExistsSync.mockReturnValue(true);
            // Mock execSync for Docker build failure
            const childProcess = require('child_process');
            const mockExecSync = childProcess.execSync;
            let callCount = 0;
            mockExecSync.mockImplementation((command) => {
                callCount++;
                if (callCount === 1) {
                    // First call: docker --version (succeeds)
                    return;
                }
                else if (callCount === 2) {
                    // Second call: docker build (fails)
                    throw new Error('Build failed');
                }
                return;
            });
            await expect(dockerAdapter.setup(config)).rejects.toThrow('Failed to build Docker image');
        });
        it('should skip build when dockerfile does not exist', async () => {
            const config = {
                name: 'test-service',
                path: '/tmp',
                dockerfile: 'nonexistent.Dockerfile',
            };
            // Mock fs.existsSync to return false (Dockerfile doesn't exist)
            const fs = require('fs');
            const mockExistsSync = fs.existsSync;
            mockExistsSync.mockReturnValue(false);
            // Mock execSync for Docker operations
            const childProcess = require('child_process');
            const mockExecSync = childProcess.execSync;
            let callCount = 0;
            mockExecSync.mockImplementation((command) => {
                callCount++;
                if (callCount === 1) {
                    // First call: docker --version (succeeds)
                    return;
                }
                return;
            });
            // Should not throw - just skip building and use service name as image
            // This matches the behavior in the main test file (docker-adapter.test.ts)
            await expect(dockerAdapter.setup(config)).resolves.not.toThrow();
        });
    });
});
//# sourceMappingURL=docker-adapter-simple.test.js.map