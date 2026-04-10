/**
 * Enhanced tests for RustAdapter to improve test coverage
 */
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { RustAdapter } from '../../src/runtime/rust-adapter';
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
describe('RustAdapter Enhanced Tests', () => {
    let adapter;
    let mockExecSync;
    let mockSpawn;
    let mockExistsSync;
    let mockAccessSync;
    let mockJoin;
    const mockConfig = {
        name: 'test-rust-service',
        path: '/test/path',
        entry: 'src/main.rs',
        args: ['--verbose', '--release'],
        env: { RUST_LOG: 'debug' },
        runtimeConfig: {
            rust: {
                release: true,
                test: true,
                debug: true,
                binary: 'target/release/test-service',
            },
        },
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
        mockExecSync.mockReturnValue(Buffer.from('cargo 1.70.0'));
        mockExistsSync.mockReturnValue(false);
        mockAccessSync.mockImplementation(() => { });
        mockJoin.mockImplementation((...args) => args.join('/'));
        adapter = new RustAdapter();
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('getSpawnArgs', () => {
        it('should return command and args for cargo when no binary found', () => {
            mockExistsSync.mockReturnValue(false);
            const result = adapter.getSpawnArgs(mockConfig);
            expect(result).toBeDefined();
            expect(result.command).toBe('cargo');
            expect(result.args).toEqual(['--verbose', '--release']);
        });
        it('should return binary path when pre-built binary exists', () => {
            mockExistsSync.mockReturnValue(true);
            mockJoin.mockReturnValue('/test/path/target/release/test-service');
            const result = adapter.getSpawnArgs(mockConfig);
            expect(result.command).toBe('/test/path/target/release/test-service');
            expect(result.args).toEqual(['--verbose', '--release']);
        });
        it('should handle single Rust file compilation', () => {
            const singleFileConfig = {
                ...mockConfig,
                entry: 'single.rs',
                runtimeConfig: {
                    rust: {
                        output: 'single-output',
                    },
                },
            };
            mockExistsSync.mockReturnValue(false);
            mockJoin.mockImplementation((...args) => {
                if (args.includes('single.rs')) {
                    return '/test/path/single.rs';
                }
                if (args.includes('single-output')) {
                    return '/test/path/single-output';
                }
                return args.join('/');
            });
            const result = adapter.getSpawnArgs(singleFileConfig);
            expect(result).toBeDefined();
        });
    });
    describe('setup', () => {
        it('should throw error when Rust/Cargo is not installed', async () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('Command failed');
            });
            await expect(adapter.setup(mockConfig)).rejects.toThrow('Rust/Cargo is not installed or not in PATH');
        });
        it('should create Cargo.toml when not found and not a single Rust file', async () => {
            mockExistsSync.mockReturnValue(false); // No Cargo.toml
            await adapter.setup(mockConfig);
            expect(mockExecSync).toHaveBeenCalledWith('cargo --version', { stdio: 'ignore' });
            // Should attempt to create Cargo.toml
        });
        it('should build with release flag when configured', async () => {
            mockExistsSync.mockReturnValue(true); // Cargo.toml exists
            await adapter.setup(mockConfig);
            expect(mockExecSync).toHaveBeenCalledWith('cargo build --release', expect.objectContaining({
                stdio: 'inherit',
                cwd: '/test/path',
            }));
        });
        it('should build without release flag when not configured', async () => {
            const debugConfig = {
                ...mockConfig,
                runtimeConfig: {
                    rust: {
                        release: false,
                    },
                },
            };
            mockExistsSync.mockReturnValue(true);
            await adapter.setup(debugConfig);
            expect(mockExecSync).toHaveBeenCalledWith('cargo build', expect.objectContaining({
                stdio: 'inherit',
                cwd: '/test/path',
            }));
        });
        it('should run tests when test flag is enabled', async () => {
            mockExistsSync.mockReturnValue(true);
            await adapter.setup(mockConfig);
            expect(mockExecSync).toHaveBeenCalledWith('cargo test', expect.objectContaining({
                stdio: 'inherit',
                cwd: '/test/path',
            }));
        });
        it('should skip tests when test flag is disabled', async () => {
            const noTestConfig = {
                ...mockConfig,
                runtimeConfig: {
                    rust: {
                        test: false,
                    },
                },
            };
            mockExistsSync.mockReturnValue(true);
            await adapter.setup(noTestConfig);
            // Should not call cargo test
            const testCalls = mockExecSync.mock.calls.filter((call) => call[0] === 'cargo test');
            expect(testCalls).toHaveLength(0);
        });
    });
    describe('startService', () => {
        it('should start service with cargo run when no binary found', async () => {
            mockExistsSync.mockReturnValue(false);
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
            };
            mockSpawn.mockReturnValue(mockProcess);
            const process = await adapter.startService(mockConfig);
            expect(mockSpawn).toHaveBeenCalledWith('cargo', ['run', '--', '--verbose', '--release'], expect.objectContaining({
                env: expect.objectContaining({
                    RUST_BACKTRACE: 'full',
                    RUST_LOG: 'debug',
                }),
                cwd: '/test/path',
            }));
            expect(process).toBe(mockProcess);
        });
        it('should start service with binary when found', async () => {
            mockExistsSync.mockReturnValue(true);
            mockJoin.mockReturnValue('/test/path/target/release/test-service');
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
            };
            mockSpawn.mockReturnValue(mockProcess);
            const process = await adapter.startService(mockConfig);
            expect(mockSpawn).toHaveBeenCalledWith('/test/path/target/release/test-service', ['--verbose', '--release'], expect.any(Object));
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
        it('should compile successfully with release flag', async () => {
            mockExecSync.mockReturnValue(Buffer.from(''));
            const result = await adapter.compile(mockConfig);
            expect(result).toBe(true);
            expect(mockExecSync).toHaveBeenCalledWith('cargo build --release', expect.objectContaining({
                stdio: 'inherit',
                cwd: '/test/path',
            }));
        });
        it('should compile successfully without release flag', async () => {
            const debugConfig = {
                ...mockConfig,
                runtimeConfig: {
                    rust: {
                        release: false,
                    },
                },
            };
            mockExecSync.mockReturnValue(Buffer.from(''));
            const result = await adapter.compile(debugConfig);
            expect(result).toBe(true);
            expect(mockExecSync).toHaveBeenCalledWith('cargo build', expect.objectContaining({
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
            expect(mockExecSync).toHaveBeenCalledWith('cargo test', expect.objectContaining({
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
    describe('check', () => {
        it('should run cargo check successfully', async () => {
            mockExecSync.mockReturnValue(Buffer.from(''));
            const result = await adapter.check(mockConfig);
            expect(result).toBe(true);
            expect(mockExecSync).toHaveBeenCalledWith('cargo check', expect.objectContaining({
                stdio: 'inherit',
                cwd: '/test/path',
            }));
        });
        it('should return false when cargo check fails', async () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('Check failed');
            });
            const result = await adapter.check(mockConfig);
            expect(result).toBe(false);
        });
    });
    describe('clippy', () => {
        it('should run cargo clippy successfully', async () => {
            mockExecSync.mockReturnValue(Buffer.from(''));
            const result = await adapter.clippy(mockConfig);
            expect(result).toBe(true);
            expect(mockExecSync).toHaveBeenCalledWith('cargo clippy', expect.objectContaining({
                stdio: 'inherit',
                cwd: '/test/path',
            }));
        });
        it('should return false when cargo clippy fails', async () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('Clippy failed');
            });
            const result = await adapter.clippy(mockConfig);
            expect(result).toBe(false);
        });
    });
    describe('edge cases', () => {
        it('should handle minimal config', async () => {
            const minimalConfig = {
                name: 'minimal-service',
                path: '.',
            };
            mockExistsSync.mockReturnValue(false);
            const args = adapter.getSpawnArgs(minimalConfig);
            expect(args).toBeDefined();
            expect(args.command).toBe('cargo');
            expect(args.args).toEqual([]);
        });
        it('should handle config without runtimeConfig', async () => {
            const simpleConfig = {
                name: 'simple-service',
                path: '/simple/path',
            };
            mockExistsSync.mockReturnValue(false);
            const args = adapter.getSpawnArgs(simpleConfig);
            expect(args).toBeDefined();
        });
        it('should handle isExecutable returning false', () => {
            mockAccessSync.mockImplementation(() => {
                throw new Error('Not executable');
            });
            // We can't directly test private method, but we can test through getSpawnArgs
            mockExistsSync.mockImplementation((path) => {
                return path.includes('target');
            });
            const args = adapter.getSpawnArgs(mockConfig);
            expect(args).toBeDefined();
        });
    });
});
//# sourceMappingURL=rust-adapter-enhanced.test.js.map