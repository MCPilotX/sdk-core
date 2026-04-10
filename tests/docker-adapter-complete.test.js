/**
 * Complete test suite for DockerAdapter
 */
// @ts-nocheck
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { DockerAdapter } from '../src/runtime/docker-adapter';
import * as fs from 'fs';
import * as path from 'path';
// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('child_process', () => ({
    spawn: jest.fn(),
    execSync: jest.fn(),
}));
// Mock console to avoid output during tests
global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};
describe('DockerAdapter', () => {
    let dockerAdapter;
    let mockProcess;
    let mockExecSync;
    beforeEach(() => {
        jest.clearAllMocks();
        dockerAdapter = new DockerAdapter();
        mockProcess = {
            stdout: { on: jest.fn() },
            stderr: { on: jest.fn() },
            on: jest.fn(),
            kill: jest.fn(),
        };
        mockExecSync = require('child_process').execSync;
        require('child_process').spawn.mockReturnValue(mockProcess);
        // Mock path functions to return proper paths
        path.join.mockImplementation((...args) => args.join('/'));
        path.dirname.mockImplementation((filePath) => {
            // Simple dirname implementation for testing
            const parts = filePath.split('/');
            parts.pop();
            return parts.join('/') || '.';
        });
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('constructor', () => {
        it('should create instance with empty container name', () => {
            expect(dockerAdapter).toBeInstanceOf(DockerAdapter);
            expect(dockerAdapter.containerName).toBe('');
            expect(dockerAdapter.process).toBeNull();
        });
    });
    describe('getSpawnArgs', () => {
        it('should generate basic docker run command', () => {
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.command).toBe('docker');
            expect(result.args[0]).toBe('run');
            expect(result.args[1]).toBe('-d');
            expect(result.args[2]).toBe('--rm');
            expect(result.args[3]).toBe('--name');
            expect(result.args[4]).toMatch(/^mcp-test-service-\d+$/);
            expect(result.args[5]).toBe('nginx:latest');
        });
        it('should include environment variables', () => {
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
                env: {
                    NODE_ENV: 'production',
                    PORT: '3000',
                },
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.args).toContain('-e');
            expect(result.args).toContain('NODE_ENV=production');
            expect(result.args).toContain('-e');
            expect(result.args).toContain('PORT=3000');
        });
        it('should include port mappings', () => {
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
                ports: [80, 443, 3000],
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.args).toContain('-p');
            expect(result.args).toContain('80:80');
            expect(result.args).toContain('-p');
            expect(result.args).toContain('443:443');
            expect(result.args).toContain('-p');
            expect(result.args).toContain('3000:3000');
        });
        it('should include volume mappings', () => {
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
                volumes: ['/host/path:/container/path', '/data:/data'],
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.args).toContain('-v');
            expect(result.args).toContain('/host/path:/container/path');
            expect(result.args).toContain('-v');
            expect(result.args).toContain('/data:/data');
        });
        it('should include working directory', () => {
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
                workdir: '/app',
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.args).toContain('-w');
            expect(result.args).toContain('/app');
        });
        it('should include command arguments', () => {
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
                args: ['nginx', '-g', 'daemon off;'],
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.args).toContain('nginx:latest');
            expect(result.args).toContain('nginx');
            expect(result.args).toContain('-g');
            expect(result.args).toContain('daemon off;');
        });
        it('should use service name as image when image not specified', () => {
            const config = {
                name: 'my-custom-image',
            };
            const result = dockerAdapter.getSpawnArgs(config);
            expect(result.args[result.args.length - 1]).toBe('my-custom-image');
        });
    });
    describe('setup', () => {
        it('should check Docker installation', async () => {
            mockExecSync.mockReturnValue(true);
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
            };
            await expect(dockerAdapter.setup(config)).resolves.not.toThrow();
            expect(mockExecSync).toHaveBeenCalledWith('docker --version', { stdio: 'ignore' });
        });
        it('should throw error when Docker is not installed', async () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('Command failed');
            });
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
            };
            await expect(dockerAdapter.setup(config)).rejects.toThrow('Docker is not installed or not in PATH');
        });
        it('should check if image exists and skip pulling if it does', async () => {
            mockExecSync.mockReturnValue(true); // Docker is installed
            mockExecSync.mockReturnValueOnce(true); // docker --version
            mockExecSync.mockReturnValueOnce(true); // docker image inspect
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
            };
            await dockerAdapter.setup(config);
            expect(mockExecSync).toHaveBeenCalledWith('docker image inspect nginx:latest', { stdio: 'ignore' });
            expect(mockExecSync).not.toHaveBeenCalledWith('docker pull nginx:latest', expect.anything());
        });
        it('should pull image if it does not exist', async () => {
            mockExecSync.mockReturnValue(true); // Docker is installed
            mockExecSync.mockImplementation((command) => {
                if (command === 'docker image inspect nginx:latest') {
                    throw new Error('Image not found');
                }
                return true;
            });
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
            };
            await dockerAdapter.setup(config);
            expect(mockExecSync).toHaveBeenCalledWith('docker pull nginx:latest', { stdio: 'inherit' });
        });
        it('should handle image pull failure', async () => {
            mockExecSync.mockReturnValue(true); // Docker is installed
            mockExecSync.mockImplementation((command) => {
                if (command === 'docker image inspect nginx:latest') {
                    throw new Error('Image not found');
                }
                if (command === 'docker pull nginx:latest') {
                    throw new Error('Network error');
                }
                return true;
            });
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
            };
            await expect(dockerAdapter.setup(config)).rejects.toThrow('Failed to pull Docker image nginx:latest');
        });
        it('should build image from Dockerfile if specified', async () => {
            mockExecSync.mockReturnValue(true); // Docker is installed
            fs.existsSync.mockReturnValue(true);
            const config = {
                name: 'test-service',
                dockerfile: 'Dockerfile',
                path: '/project/path',
            };
            await dockerAdapter.setup(config);
            expect(fs.existsSync).toHaveBeenCalledWith('/project/path/Dockerfile');
            expect(mockExecSync).toHaveBeenCalledWith('docker build -t test-service -f /project/path/Dockerfile /project/path', { stdio: 'inherit', cwd: '/project/path' });
        });
        it('should use custom build context if specified', async () => {
            mockExecSync.mockReturnValue(true);
            fs.existsSync.mockReturnValue(true);
            const config = {
                name: 'test-service',
                dockerfile: 'Dockerfile',
                path: '/project/path',
                buildContext: '/build/context',
            };
            await dockerAdapter.setup(config);
            expect(mockExecSync).toHaveBeenCalledWith('docker build -t test-service -f /project/path/Dockerfile /build/context', { stdio: 'inherit', cwd: '/project/path' });
        });
        it('should handle Dockerfile build failure', async () => {
            mockExecSync.mockReturnValue(true);
            fs.existsSync.mockReturnValue(true);
            mockExecSync.mockImplementation((command) => {
                if (command.includes('docker build')) {
                    throw new Error('Build failed');
                }
                return true;
            });
            const config = {
                name: 'test-service',
                dockerfile: 'Dockerfile',
                path: '/project/path',
            };
            await expect(dockerAdapter.setup(config)).rejects.toThrow('Failed to build Docker image');
        });
        it('should skip Dockerfile build if file does not exist', async () => {
            mockExecSync.mockReturnValue(true);
            fs.existsSync.mockReturnValue(false);
            const config = {
                name: 'test-service',
                dockerfile: 'Dockerfile',
                path: '/project/path',
            };
            await dockerAdapter.setup(config);
            expect(mockExecSync).not.toHaveBeenCalledWith(expect.stringContaining('docker build'), expect.anything());
        });
    });
    describe('startContainer', () => {
        it('should start container with correct arguments', async () => {
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
            };
            const process = await dockerAdapter.startContainer(config);
            expect(require('child_process').spawn).toHaveBeenCalledWith('docker', expect.arrayContaining(['run', '-d', '--rm', '--name', expect.any(String), 'nginx:latest']), {
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false,
            });
            expect(process).toBe(mockProcess);
            expect(dockerAdapter.process).toBe(mockProcess);
        });
        it('should set up stdout event handler', async () => {
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
            };
            await dockerAdapter.startContainer(config);
            expect(mockProcess.stdout?.on).toHaveBeenCalledWith('data', expect.any(Function));
        });
        it('should set up stderr event handler', async () => {
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
            };
            await dockerAdapter.startContainer(config);
            expect(mockProcess.stderr?.on).toHaveBeenCalledWith('data', expect.any(Function));
        });
        it('should set up error event handler', async () => {
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
            };
            await dockerAdapter.startContainer(config);
            expect(mockProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
        });
        it('should set up exit event handler', async () => {
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
            };
            await dockerAdapter.startContainer(config);
            expect(mockProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
        });
    });
    describe('stopContainer', () => {
        it('should stop container when process exists', async () => {
            dockerAdapter.process = mockProcess;
            dockerAdapter.containerName = 'test-container-123';
            await dockerAdapter.stopContainer();
            expect(mockExecSync).toHaveBeenCalledWith('docker stop test-container-123', { stdio: 'ignore' });
            expect(mockProcess.kill).toHaveBeenCalled();
            expect(dockerAdapter.process).toBeNull();
        });
        it('should handle stop command failure gracefully', async () => {
            dockerAdapter.process = mockProcess;
            dockerAdapter.containerName = 'test-container-123';
            mockExecSync.mockImplementation(() => {
                throw new Error('Container not found');
            });
            await expect(dockerAdapter.stopContainer()).resolves.not.toThrow();
            expect(mockProcess.kill).toHaveBeenCalled();
        });
        it('should do nothing when no process exists', async () => {
            dockerAdapter.process = null;
            await dockerAdapter.stopContainer();
            expect(mockExecSync).not.toHaveBeenCalled();
            expect(mockProcess.kill).not.toHaveBeenCalled();
        });
    });
    describe('getContainerStatus', () => {
        it('should return "not_created" when container name is empty', async () => {
            dockerAdapter.containerName = '';
            const status = await dockerAdapter.getContainerStatus();
            expect(status).toBe('not_created');
        });
        it('should return "running" when container is up', async () => {
            dockerAdapter.containerName = 'test-container-123';
            mockExecSync.mockReturnValue('Up 5 minutes');
            const status = await dockerAdapter.getContainerStatus();
            expect(status).toBe('running');
            expect(mockExecSync).toHaveBeenCalledWith('docker ps -a --filter "name=test-container-123" --format "{{.Status}}"', { encoding: 'utf-8' });
        });
        it('should return "stopped" when container is exited', async () => {
            dockerAdapter.containerName = 'test-container-123';
            mockExecSync.mockReturnValue('Exited (0) 2 minutes ago');
            const status = await dockerAdapter.getContainerStatus();
            expect(status).toBe('stopped');
        });
        it('should return "not_found" when container does not exist', async () => {
            dockerAdapter.containerName = 'test-container-123';
            mockExecSync.mockReturnValue('');
            const status = await dockerAdapter.getContainerStatus();
            expect(status).toBe('not_found');
        });
        it('should return "error" when command fails', async () => {
            dockerAdapter.containerName = 'test-container-123';
            mockExecSync.mockImplementation(() => {
                throw new Error('Command failed');
            });
            const status = await dockerAdapter.getContainerStatus();
            expect(status).toBe('error');
        });
    });
    describe('getContainerLogs', () => {
        it('should return message when container not created', async () => {
            dockerAdapter.containerName = '';
            const logs = await dockerAdapter.getContainerLogs();
            expect(logs).toBe('Container not created');
        });
        it('should return container logs', async () => {
            dockerAdapter.containerName = 'test-container-123';
            mockExecSync.mockReturnValue('Log line 1\nLog line 2\nLog line 3');
            const logs = await dockerAdapter.getContainerLogs(100);
            expect(logs).toBe('Log line 1\nLog line 2\nLog line 3');
            expect(mockExecSync).toHaveBeenCalledWith('docker logs --tail 100 test-container-123', { encoding: 'utf-8' });
        });
        it('should use default tail value', async () => {
            dockerAdapter.containerName = 'test-container-123';
            mockExecSync.mockReturnValue('Logs');
            await dockerAdapter.getContainerLogs();
            expect(mockExecSync).toHaveBeenCalledWith('docker logs --tail 50 test-container-123', { encoding: 'utf-8' });
        });
        it('should handle log command failure', async () => {
            dockerAdapter.containerName = 'test-container-123';
            mockExecSync.mockImplementation(() => {
                throw new Error('Container not running');
            });
            const logs = await dockerAdapter.getContainerLogs();
            expect(logs).toContain('Failed to get logs');
        });
    });
    describe('integration scenarios', () => {
        it('should handle complete container lifecycle', async () => {
            // Setup
            mockExecSync.mockReturnValue(true);
            fs.existsSync.mockReturnValue(false);
            const config = {
                name: 'test-service',
                image: 'nginx:latest',
                env: { NODE_ENV: 'production' },
                ports: [80],
            };
            await dockerAdapter.setup(config);
            // Start container
            const process = await dockerAdapter.startContainer(config);
            expect(process).toBeDefined();
            // Check});
        });
    });
});
//# sourceMappingURL=docker-adapter-complete.test.js.map