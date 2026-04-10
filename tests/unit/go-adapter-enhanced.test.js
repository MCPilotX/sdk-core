/**
 * Enhanced tests for GoAdapter to improve test coverage
 */
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { GoAdapter } from '../../src/runtime/go-adapter';
// Mock dependencies
jest.mock('child_process', () => ({
    execSync: jest.fn(),
    spawn: jest.fn(),
}));
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    accessSync: jest.fn(),
    constants: {
        X_OK: 1,
    },
}));
jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/')),
}));
describe('GoAdapter Enhanced Tests', () => {
    let adapter;
    let mockExecSync;
    let mockSpawn;
    let mockExistsSync;
    let mockAccessSync;
    let mockJoin;
    const mockConfig = {
        name: 'test-go-service',
        path: '/test/path',
        entry: 'main.go',
        args: ['--verbose', '--port', '8080'],
        env: { GO_ENV: 'development' },
        build: true,
        output: 'myapp',
        binary: 'myapp',
    };
    beforeEach(() => {
        jest.clearAllMocks();
        // Get mocked functions
        const childProcess = require('child_process');
        const fs = require('fs');
        const path = require('path');
        mockExecSync = childProcess.execSync;
        mockSpawn = childProcess.spawn;
        mockExistsSync = fs.existsSync;
        mockAccessSync = fs.accessSync;
        mockJoin = path.join;
        // Default mock implementations
        mockExecSync.mockReturnValue(Buffer.from('go version go1.21.0'));
        mockExistsSync.mockReturnValue(false);
        mockAccessSync.mockImplementation(() => { });
        mockJoin.mockImplementation((...args) => args.join('/'));
        adapter = new GoAdapter();
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('getSpawnArgs', () => {
        it('should return go run command when no binary found', () => {
            mockExistsSync.mockReturnValue(false);
            const result = adapter.getSpawnArgs(mockConfig);
            expect(result).toBeDefined();
            expect(result.command).toBe('go');
            expect(result.args).toEqual(['run', 'main.go', '--verbose', '--port', '8080']);
        });
        it('should return binary path when pre-built binary exists', () => {
            mockExistsSync.mockReturnValue(true);
            mockJoin.mockReturnValue('/test/path/myapp');
            const result = adapter.getSpawnArgs(mockConfig);
            expect(result.command).toBe('/test/path/myapp');
            expect(result.args).toEqual(['run', 'main.go', '--verbose', '--port', '8080']);
        });
        it('should handle config without binary field', () => {
            const configWithoutBinary = {
                ...mockConfig,
                binary: undefined,
            };
            mockExistsSync.mockReturnValue(false);
            const result = adapter.getSpawnArgs(configWithoutBinary);
            expect(result.command).toBe('go');
            expect(result.args).toEqual(['run', 'main.go', '--verbose', '--port', '8080']);
        });
    });
    describe('setup', () => {
        it('should throw error when Go is not installed', async () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('Command failed');
            });
            await expect(adapter.setup(mockConfig)).rejects.toThrow('Go is not installed or not in PATH');
        });
        it('should create go.mod when not found', async () => {
            mockExistsSync.mockReturnValue(false); // No go.mod
            await adapter.setup(mockConfig);
            expect(mockExecSync).toHaveBeenCalledWith('go version', { stdio: 'ignore' });
            expect(mockExecSync).toHaveBeenCalledWith('go mod init test-go-service', expect.objectContaining({
                stdio: 'inherit',
                cwd: '/test/path',
            }));
        });
        it('should not create go.mod when already exists', async () => {
            mockExistsSync.mockReturnValue(true); // go.mod exists
            await adapter.setup(mockConfig);
            // Should not call go mod init
            const initCalls = mockExecSync.mock.calls.filter((call) => call[0] === 'go mod init test-go-service');
            expect(initCalls).toHaveLength(0);
        });
        it('should download dependencies with go mod tidy', async () => {
            mockExistsSync.mockReturnValue(true);
            await adapter.setup(mockConfig);
            expect(mockExecSync).toHaveBeenCalledWith('go mod tidy', expect.objectContaining({
                stdio: 'inherit',
                cwd: '/test/path',
            }));
        });
        it('should build executable when build flag is true', async () => {
            mockExistsSync.mockReturnValue(true);
            await adapter.setup(mockConfig);
            expect(mockExecSync).toHaveBeenCalledWith('go build -o myapp main.go', expect.objectContaining({
                stdio: 'inherit',
                cwd: '/test/path',
            }));
        });
        it('should not build executable when build flag is false', async () => {
            const noBuildConfig = {
                ...mockConfig,
                build: false,
            };
            mockExistsSync.mockReturnValue(true);
            await adapter.setup(noBuildConfig);
            // Should not call go build
            const buildCalls = mockExecSync.mock.calls.filter((call) => call[0]?.startsWith('go build'));
            expect(buildCalls).toHaveLength(0);
        });
        it('should use service name as output when output not specified', async () => {
            const configWithoutOutput = {
                ...mockConfig,
                output: undefined,
            };
            mockExistsSync.mockReturnValue(true);
            await adapter.setup(configWithoutOutput);
            expect(mockExecSync).toHaveBeenCalledWith('go build -o test-go-service main.go', expect.objectContaining({
                stdio: 'inherit',
                cwd: '/test/path',
            }));
        });
    });
    describe('startService', () => {
        it('should start service with go run when no binary found', async () => {
            mockExistsSync.mockReturnValue(false);
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
            };
            mockSpawn.mockReturnValue(mockProcess);
            const process = await adapter.startService(mockConfig);
            expect(mockSpawn).toHaveBeenCalledWith('go', ['run', 'main.go', '--verbose', '--port', '8080'], expect.objectContaining({
                env: expect.objectContaining({
                    GO_ENV: 'development',
                }),
                cwd: '/test/path',
            }));
            expect(process).toBe(mockProcess);
        });
        it('should start service with binary when found', async () => {
            mockExistsSync.mockReturnValue(true);
            mockJoin.mockReturnValue('/test/path/myapp');
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
            };
            mockSpawn.mockReturnValue(mockProcess);
            const process = await adapter.startService(mockConfig);
            expect(mockSpawn).toHaveBeenCalledWith('/test/path/myapp', ['run', 'main.go', '--verbose', '--port', '8080'], expect.any(Object));
            expect(process).toBe(mockProcess);
        });
    });
    describe('stopService', () => {
        it('should stop running service', async () => {
            const mockProcess = {
                kill: jest.fn(),
            };
            // @ts-ignore - accessing private property for testing
            adapter.process = mockProcess;
            await adapter.stopService();
            expect(mockProcess.kill).toHaveBeenCalled();
            // @ts-ignore - accessing private property for testing
            expect(adapter.process).toBeNull();
        });
        it('should do nothing when no service is running', async () => {
            // @ts-ignore - accessing private property for testing
            adapter.process = null;
            await expect(adapter.stopService()).resolves.not.toThrow();
        });
    });
    describe('getServiceStatus', () => {
        it('should return "stopped" when no process', async () => {
            // @ts-ignore - accessing private property for testing
            adapter.process = null;
            const status = await adapter.getServiceStatus();
            expect(status).toBe('stopped');
        });
        it('should return "exited" when process has exit code', async () => {
            const mockProcess = {
                exitCode: 0,
                kill: jest.fn(),
            };
            // @ts-ignore - accessing private property for testing
            adapter.process = mockProcess;
            const status = await adapter.getServiceStatus();
            expect(status).toBe('exited');
        });
        it('should return "running" when process is alive', async () => {
            const mockProcess = {
                exitCode: null,
                kill: jest.fn(),
            };
            // @ts-ignore - accessing private property for testing
            adapter.process = mockProcess;
            const status = await adapter.getServiceStatus();
            expect(status).toBe('running');
        });
        it('should return "stopped" when kill(0) throws', async () => {
            const mockProcess = {
                exitCode: null,
                kill: jest.fn().mockImplementation(() => {
                    throw new Error('Process not found');
                }),
            };
            // @ts-ignore - accessing private property for testing
            adapter.process = mockProcess;
            const status = await adapter.getServiceStatus();
            expect(status).toBe('stopped');
        });
    });
    describe('compile', () => {
        it('should compile successfully with custom output name', async () => {
            mockExecSync.mockReturnValue(Buffer.from(''));
            const result = await adapter.compile(mockConfig);
            expect(result).toBe(true);
            expect(mockExecSync).toHaveBeenCalledWith('go build -o myapp main.go', expect.objectContaining({
                stdio: 'inherit',
                cwd: '/test/path',
            }));
        });
        it('should compile successfully with default output name', async () => {
            const configWithoutOutput = {
                ...mockConfig,
                output: undefined,
            };
            mockExecSync.mockReturnValue(Buffer.from(''));
            const result = await adapter.compile(configWithoutOutput);
            expect(result).toBe(true);
            expect(mockExecSync).toHaveBeenCalledWith('go build -o test-go-service main.go', expect.objectContaining({
                stdio: 'inherit',
                cwd: '/test/path',
            }));
        });
        it('should return false when compilation fails', async () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('Compilation failed');
            });
            const result = await adapter.compile(mockConfig);
            expect(result).toBe(false);
        });
    });
    describe('test', () => {
        it('should run tests successfully', async () => {
            mockExecSync.mockReturnValue(Buffer.from(''));
            const result = await adapter.test(mockConfig);
            expect(result).toBe(true);
            expect(mockExecSync).toHaveBeenCalledWith('go test ./...', expect.objectContaining({
                stdio: 'inherit',
                cwd: '/test/path',
            }));
        });
        it('should return false when tests fail', async () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('Tests failed');
            });
            const result = await adapter.test(mockConfig);
            expect(result).toBe(false);
        });
    });
    describe('edge cases', () => {
        it('should handle minimal config', async () => {
            const minimalConfig = {
                name: 'minimal-service',
                path: '.',
                entry: 'main.go',
            };
            mockExistsSync.mockReturnValue(false);
            const args = adapter.getSpawnArgs(minimalConfig);
            expect(args).toBeDefined();
            expect(args.command).toBe('go');
            expect(args.args).toEqual(['run', 'main.go']);
        });
        it('should handle config without args', async () => {
            const configWithoutArgs = {
                name: 'simple-service',
                path: '/simple/path',
                entry: 'app.go',
            };
            mockExistsSync.mockReturnValue(false);
            const args = adapter.getSpawnArgs(configWithoutArgs);
            expect(args.args).toEqual(['run', 'app.go']);
        });
        it('should handle isExecutable returning false', () => {
            mockAccessSync.mockImplementation(() => {
                throw new Error('Not executable');
            });
            // We can't directly test private method, but we can test through getSpawnArgs
            mockExistsSync.mockImplementation((path) => {
                return path.includes('myapp');
            });
            const args = adapter.getSpawnArgs(mockConfig);
            expect(args).toBeDefined();
        });
        it('should handle setup with go.mod creation failure', async () => {
            mockExistsSync.mockReturnValue(false);
            mockExecSync.mockImplementation((command) => {
                if (command === 'go mod init test-go-service') {
                    throw new Error('Permission denied');
                }
                return Buffer.from('');
            });
            // Should not throw, just log warning
            await expect(adapter.setup(mockConfig)).resolves.not.toThrow();
        });
        it('should handle setup with dependency download failure', async () => {
            mockExistsSync.mockReturnValue(true);
            mockExecSync.mockImplementation((command) => {
                if (command === 'go mod tidy') {
                    throw new Error('Network error');
                }
                return Buffer.from('');
            });
            // Should not throw, just log warning
            await expect(adapter.setup(mockConfig)).resolves.not.toThrow();
        });
        it('should handle setup with build failure', async () => {
            mockExistsSync.mockReturnValue(true);
            mockExecSync.mockImplementation((command) => {
                if (command.startsWith('go build')) {
                    throw new Error('Build error');
                }
                return Buffer.from('');
            });
            // Should not throw, just log warning
            await expect(adapter.setup(mockConfig)).resolves.not.toThrow();
        });
    });
});
//# sourceMappingURL=go-adapter-enhanced.test.js.map