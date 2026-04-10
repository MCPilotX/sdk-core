/**
 * Enhanced tests for PythonAdapter to improve test coverage
 */
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { PythonAdapter } from '../../src/runtime/python-adapter';
import { VENVS_DIR } from '../../src/core/constants';
// Mock dependencies
jest.mock('child_process', () => ({
    exec: jest.fn(),
}));
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
}));
jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/')),
    isAbsolute: jest.fn((path) => path.startsWith('/')),
}));
jest.mock('../../src/core/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
jest.mock('../../src/core/constants', () => ({
    VENVS_DIR: '/test/venvs',
}));
// Mock the execAsync function directly
jest.mock('../../src/runtime/python-adapter', () => {
    const originalModule = jest.requireActual('../../src/runtime/python-adapter');
    return {
        ...originalModule,
        // We'll mock execAsync through the exec mock
    };
});
describe('PythonAdapter Enhanced Tests', () => {
    let adapter;
    let mockExec;
    let mockExistsSync;
    let mockMkdirSync;
    let mockJoin;
    let mockIsAbsolute;
    let mockLogger;
    const mockConfig = {
        name: 'test-python-service',
        path: '/test/path',
        entry: 'main.py',
        args: ['--verbose', '--port', '8080'],
        env: { PYTHONPATH: '/test/path' },
        runtimeConfig: {
            python: {
                dependencies: ['flask', 'requests', 'numpy'],
            },
        },
    };
    beforeEach(() => {
        jest.clearAllMocks();
        // Get mocked functions
        const childProcess = require('child_process');
        const fs = require('fs');
        const path = require('path');
        const logger = require('../../src/core/logger');
        mockExec = childProcess.exec;
        mockExistsSync = fs.existsSync;
        mockMkdirSync = fs.mkdirSync;
        mockJoin = path.join;
        mockIsAbsolute = path.isAbsolute;
        mockLogger = logger.logger;
        // Default mock implementations
        mockExec.mockImplementation(() => Promise.resolve({ stdout: '', stderr: '' }));
        mockExistsSync.mockReturnValue(false);
        mockMkdirSync.mockImplementation(() => { });
        mockJoin.mockImplementation((...args) => args.join('/'));
        mockIsAbsolute.mockImplementation((path) => path.startsWith('/'));
        adapter = new PythonAdapter(mockExec);
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('getSpawnArgs', () => {
        it('should return python path from virtual environment', () => {
            const result = adapter.getSpawnArgs(mockConfig);
            expect(result).toBeDefined();
            expect(result.command).toBe('/test/venvs/test-python-service/bin/python');
            expect(result.args).toEqual(['main.py', '--verbose', '--port', '8080']);
        });
        it('should handle config without args', () => {
            const configWithoutArgs = {
                ...mockConfig,
                args: undefined,
            };
            const result = adapter.getSpawnArgs(configWithoutArgs);
            expect(result.args).toEqual(['main.py']);
        });
    });
    describe('setup', () => {
        it('should create virtual environments directory when it does not exist', async () => {
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return false;
                return false;
            });
            await adapter.setup(mockConfig);
            expect(mockMkdirSync).toHaveBeenCalledWith(VENVS_DIR, { recursive: true });
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Created virtual environments directory'));
        }, 10000);
        it('should use existing virtual environment when it exists', async () => {
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return true;
                if (path === '/test/venvs/test-python-service/bin/python')
                    return true;
                return false;
            });
            await adapter.setup(mockConfig);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Using existing virtual environment'));
            // Should not create new virtual environment
            const venvCreationCalls = mockExec.mock.calls.filter((call) => call[0]?.includes('python3 -m venv'));
            expect(venvCreationCalls).toHaveLength(0);
        });
        it('should create virtual environment when it does not exist', async () => {
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return false;
                return false;
            });
            await adapter.setup(mockConfig);
            expect(mockExec).toHaveBeenCalledWith('python3 -m venv "/test/venvs/test-python-service"');
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Creating Python virtual environment'));
        });
        it('should handle virtual environment creation warnings', async () => {
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return false;
                return false;
            });
            mockExec.mockResolvedValue({
                stdout: '',
                stderr: 'Some warning message',
            });
            await adapter.setup(mockConfig);
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Virtual environment creation warnings'));
        });
        it('should install dependencies from array', async () => {
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return true;
                if (path === '/test/venvs/test-python-service/bin/python')
                    return true;
                return false;
            });
            // Mock pip version check
            mockExec.mockImplementation((command) => {
                if (command.includes('pip --version')) {
                    return Promise.resolve({ stdout: 'pip 23.0.0', stderr: '' });
                }
                if (command.includes('pip install')) {
                    return Promise.resolve({ stdout: '', stderr: '' });
                }
                return Promise.resolve({ stdout: '', stderr: '' });
            });
            await adapter.setup(mockConfig);
            // Should install each dependency
            expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('pip install "flask"'));
            expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('pip install "requests"'));
            expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('pip install "numpy"'));
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Installing Python dependencies'));
        });
        it('should install dependencies from requirements.txt file', async () => {
            const configWithRequirements = {
                ...mockConfig,
                runtimeConfig: {
                    python: {
                        dependencies: 'requirements.txt', // Type assertion to bypass TypeScript error
                    },
                },
            };
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return true;
                if (path === '/test/venvs/test-python-service/bin/python')
                    return true;
                if (path === '/test/path/requirements.txt')
                    return true;
                return false;
            });
            // Mock process.cwd() to return /test/path
            const originalCwd = process.cwd;
            process.cwd = jest.fn(() => '/test/path');
            mockExec.mockImplementation((command) => {
                if (command.includes('pip --version')) {
                    return Promise.resolve({ stdout: 'pip 23.0.0', stderr: '' });
                }
                if (command.includes('pip install -r')) {
                    return Promise.resolve({ stdout: '', stderr: '' });
                }
                return Promise.resolve({ stdout: '', stderr: '' });
            });
            try {
                await adapter.setup(configWithRequirements);
                expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('pip install -r "/test/path/requirements.txt"'));
                expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Installing dependencies from requirements file'));
            }
            finally {
                // Restore original cwd
                process.cwd = originalCwd;
            }
        });
        it('should handle absolute path for requirements.txt', async () => {
            const configWithAbsolutePath = {
                ...mockConfig,
                runtimeConfig: {
                    python: {
                        dependencies: '/absolute/path/requirements.txt', // Type assertion
                    },
                },
            };
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return true;
                if (path === '/test/venvs/test-python-service/bin/python')
                    return true;
                if (path === '/absolute/path/requirements.txt')
                    return true;
                return false;
            });
            mockExec.mockImplementation((command) => {
                if (command.includes('pip --version')) {
                    return Promise.resolve({ stdout: 'pip 23.0.0', stderr: '' });
                }
                if (command.includes('pip install -r')) {
                    return Promise.resolve({ stdout: '', stderr: '' });
                }
                return Promise.resolve({ stdout: '', stderr: '' });
            });
            await adapter.setup(configWithAbsolutePath);
            expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('pip install -r "/absolute/path/requirements.txt"'));
        });
        it('should warn when requirements.txt file not found', async () => {
            const configWithMissingRequirements = {
                ...mockConfig,
                runtimeConfig: {
                    python: {
                        dependencies: 'missing-requirements.txt',
                    },
                },
            };
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return true;
                if (path === '/test/venvs/test-python-service/bin/python')
                    return true;
                return false;
            });
            mockExec.mockImplementation((command) => {
                if (command.includes('pip --version')) {
                    return Promise.resolve({ stdout: 'pip 23.0.0', stderr: '' });
                }
                return Promise.resolve({ stdout: '', stderr: '' });
            });
            await adapter.setup(configWithMissingRequirements);
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Requirements file not found'));
        });
        it('should handle dependency installation warnings', async () => {
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return true;
                if (path === '/test/venvs/test-python-service/bin/python')
                    return true;
                return false;
            });
            mockExec.mockImplementation((command) => {
                if (command.includes('pip --version')) {
                    return Promise.resolve({ stdout: 'pip 23.0.0', stderr: '' });
                }
                if (command.includes('pip install')) {
                    return Promise.resolve({ stdout: '', stderr: 'WARNING: Some warning' });
                }
                return Promise.resolve({ stdout: '', stderr: '' });
            });
            await adapter.setup(mockConfig);
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Installation warnings'));
        });
        it('should handle individual dependency installation failure', async () => {
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return true;
                if (path === '/test/venvs/test-python-service/bin/python')
                    return true;
                return false;
            });
            let callCount = 0;
            mockExec.mockImplementation((command) => {
                callCount++;
                if (command.includes('pip --version')) {
                    return Promise.resolve({ stdout: 'pip 23.0.0', stderr: '' });
                }
                if (command.includes('pip install "flask"')) {
                    return Promise.reject(new Error('Failed to install flask'));
                }
                return Promise.resolve({ stdout: '', stderr: '' });
            });
            await adapter.setup(mockConfig);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to install dependency flask'));
            // Should continue installing other dependencies
            expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('pip install "requests"'));
            expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('pip install "numpy"'));
        });
        it('should throw error when pip is not available', async () => {
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return true;
                if (path === '/test/venvs/test-python-service/bin/python')
                    return true;
                return false;
            });
            mockExec.mockImplementation((command) => {
                if (command.includes('pip --version')) {
                    return Promise.reject(new Error('pip not found'));
                }
                return Promise.resolve({ stdout: '', stderr: '' });
            });
            await expect(adapter.setup(mockConfig)).rejects.toThrow('Dependency installation failed: pip not found');
        }, 10000);
        it('should skip dependency installation when no dependencies configured', async () => {
            const configWithoutDeps = {
                ...mockConfig,
                runtimeConfig: {
                    python: {},
                },
            };
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return true;
                if (path === '/test/venvs/test-python-service/bin/python')
                    return true;
                return false;
            });
            await adapter.setup(configWithoutDeps);
            // Should not call pip install
            const pipInstallCalls = mockExec.mock.calls.filter((call) => call[0]?.includes('pip install'));
            expect(pipInstallCalls).toHaveLength(0);
        });
        it('should handle empty dependencies array', async () => {
            const configWithEmptyDeps = {
                ...mockConfig,
                runtimeConfig: {
                    python: {
                        dependencies: [],
                    },
                },
            };
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return true;
                if (path === '/test/venvs/test-python-service/bin/python')
                    return true;
                return false;
            });
            await adapter.setup(configWithEmptyDeps);
            // Should not call pip install
            const pipInstallCalls = mockExec.mock.calls.filter((call) => call[0]?.includes('pip install'));
            expect(pipInstallCalls).toHaveLength(0);
        });
        it('should handle virtual environment creation failure', async () => {
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return false;
                return false;
            });
            mockExec.mockImplementation((command) => {
                if (command.includes('python3 -m venv')) {
                    return Promise.reject(new Error('Virtual environment creation failed'));
                }
                return Promise.resolve({ stdout: '', stderr: '' });
            });
            await expect(adapter.setup(mockConfig)).rejects.toThrow('Python environment setup failed: Virtual environment creation failed');
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to setup Python environment for test-python-service'), expect.any(Object) // Second parameter is the error object with stack
            );
        }, 10000);
    });
    describe('edge cases', () => {
        it('should handle minimal config', async () => {
            const minimalConfig = {
                name: 'minimal-service',
                path: '.',
                entry: 'app.py',
            };
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/minimal-service')
                    return true;
                if (path === '/test/venvs/minimal-service/bin/python')
                    return true;
                return false;
            });
            await adapter.setup(minimalConfig);
            const args = adapter.getSpawnArgs(minimalConfig);
            expect(args.command).toBe('/test/venvs/minimal-service/bin/python');
            expect(args.args).toEqual(['app.py']);
        });
        it('should handle config without runtimeConfig', async () => {
            const configWithoutRuntimeConfig = {
                name: 'simple-service',
                path: '/simple/path',
                entry: 'script.py',
            };
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/simple-service')
                    return true;
                if (path === '/test/venvs/simple-service/bin/python')
                    return true;
                return false;
            });
            await adapter.setup(configWithoutRuntimeConfig);
            const args = adapter.getSpawnArgs(configWithoutRuntimeConfig);
            expect(args).toBeDefined();
        });
        it('should handle config with empty python config', async () => {
            const configWithEmptyPythonConfig = {
                name: 'empty-python-config-service',
                path: '/test/path',
                entry: 'app.py',
                runtimeConfig: {
                    python: {},
                },
            };
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/empty-python-config-service')
                    return true;
                if (path === '/test/venvs/empty-python-config-service/bin/python')
                    return true;
                return false;
            });
            await adapter.setup(configWithEmptyPythonConfig);
            const args = adapter.getSpawnArgs(configWithEmptyPythonConfig);
            expect(args).toBeDefined();
        });
        it('should handle config without python config in runtimeConfig', async () => {
            const configWithoutPythonConfig = {
                name: 'no-python-config-service',
                path: '/test/path',
                entry: 'app.py',
                runtimeConfig: {
                // No python config
                },
            };
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/no-python-config-service')
                    return true;
                if (path === '/test/venvs/no-python-config-service/bin/python')
                    return true;
                return false;
            });
            await adapter.setup(configWithoutPythonConfig);
            const args = adapter.getSpawnArgs(configWithoutPythonConfig);
            expect(args).toBeDefined();
        });
        it('should handle partial virtual environment existence', async () => {
            // Virtual environment directory exists but python binary doesn't
            mockExistsSync.mockImplementation((path) => {
                if (path === VENVS_DIR)
                    return true;
                if (path === '/test/venvs/test-python-service')
                    return true;
                if (path === '/test/venvs/test-python-service/bin/python')
                    return false;
                return false;
            });
            mockExec.mockImplementation((command) => {
                return Promise.resolve({ stdout: '', stderr: '' });
            });
            await adapter.setup(mockConfig);
            // Should create virtual environment
            expect(mockExec).toHaveBeenCalledWith('python3 -m venv "/test/venvs/test-python-service"');
        }, 10000);
    });
});
//# sourceMappingURL=python-adapter-enhanced.test.js.map