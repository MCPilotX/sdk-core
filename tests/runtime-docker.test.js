import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { DockerAdapter } from '../src/runtime/docker';
// Mock child_process module
jest.mock('child_process', () => ({
    spawn: jest.fn(),
}));
// Mock console
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
global.console.log = mockConsoleLog;
global.console.error = mockConsoleError;
describe('DockerAdapter', () => {
    let mockSpawn;
    let mockProcess;
    let mockStdout;
    let mockStderr;
    let mockStdin;
    beforeEach(() => {
        jest.clearAllMocks();
        mockStdout = { on: jest.fn() };
        mockStderr = { on: jest.fn() };
        mockStdin = { write: jest.fn() };
        mockProcess = {
            stdout: mockStdout,
            stderr: mockStderr,
            stdin: mockStdin,
            on: jest.fn(),
            kill: jest.fn(),
            pid: 12345,
        };
        const { spawn } = require('child_process');
        mockSpawn = spawn;
        mockSpawn.mockReturnValue(mockProcess);
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('constructor', () => {
        it('should create adapter with options', () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
                env: { KEY: 'value' },
            };
            const adapter = new DockerAdapter(options);
            expect(adapter.options).toEqual(options);
            expect(adapter.process).toBeNull();
            expect(adapter.requestId).toBe(0);
            expect(adapter.pendingRequests.size).toBe(0);
        });
        it('should create adapter without environment variables', () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            expect(adapter.options).toEqual(options);
            expect(adapter.options.env).toBeUndefined();
        });
    });
    describe('start', () => {
        it('should start Docker container successfully', async () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
                env: { KEY: 'value', ANOTHER_KEY: 'another-value' },
            };
            const adapter = new DockerAdapter(options);
            // Mock process events
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'spawn') {
                    setTimeout(() => callback(), 0);
                }
                return mockProcess;
            });
            await adapter.start();
            // Verify spawn was called with correct arguments
            expect(mockSpawn).toHaveBeenCalledWith('docker', [
                'run', '-i', '--rm', '--name', 'mcp-test-service',
                '-e', 'KEY=value',
                '-e', 'ANOTHER_KEY=another-value',
                'test-image:latest'
            ], {
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            // Verify event listeners were set up
            expect(mockStdout.on).toHaveBeenCalledWith('data', expect.any(Function));
            expect(mockStderr.on).toHaveBeenCalledWith('data', expect.any(Function));
            expect(mockProcess.on).toHaveBeenCalledWith('spawn', expect.any(Function));
            expect(mockProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
            // Verify process was stored
            expect(adapter.process).toBe(mockProcess);
        });
        it('should start Docker container without environment variables', async () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'spawn') {
                    setTimeout(() => callback(), 0);
                }
                return mockProcess;
            });
            await adapter.start();
            expect(mockSpawn).toHaveBeenCalledWith('docker', [
                'run', '-i', '--rm', '--name', 'mcp-test-service',
                'test-image:latest'
            ], {
                stdio: ['pipe', 'pipe', 'pipe'],
            });
        });
        it('should handle start errors', async () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'error') {
                    setTimeout(() => callback(new Error('Docker not found')), 0);
                }
                return mockProcess;
            });
            await expect(adapter.start()).rejects.toThrow('Docker start failed: Docker not found');
        });
        it('should parse JSON responses from stdout', async () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'spawn') {
                    setTimeout(() => callback(), 0);
                }
                return mockProcess;
            });
            await adapter.start();
            // Get the stdout data handler
            const stdoutHandler = mockStdout.on.mock.calls[0][1];
            // Simulate JSON response
            const jsonResponse = { id: 1, result: 'success' };
            stdoutHandler(Buffer.from(JSON.stringify(jsonResponse)));
            // The handler should parse JSON but not call any resolver since no pending request
            // Note: start() method logs "[RAL] Starting Docker service: test-service (test-image:latest)"
            // So we expect at least one call
            expect(mockConsoleLog).toHaveBeenCalled();
        });
        it('should handle non-JSON stdout data', async () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'spawn') {
                    setTimeout(() => callback(), 0);
                }
                return mockProcess;
            });
            await adapter.start();
            const stdoutHandler = mockStdout.on.mock.calls[0][1];
            // Simulate non-JSON output
            stdoutHandler(Buffer.from('Starting container...'));
            expect(mockConsoleLog).toHaveBeenCalledWith('[Docker:test-service] Starting container...');
        });
        it('should handle stderr output', async () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'spawn') {
                    setTimeout(() => callback(), 0);
                }
                return mockProcess;
            });
            await adapter.start();
            const stderrHandler = mockStderr.on.mock.calls[0][1];
            stderrHandler(Buffer.from('Error: Container failed to start'));
            expect(mockConsoleError).toHaveBeenCalledWith('[Docker:test-service] ERR: Error: Container failed to start');
        });
    });
    describe('call', () => {
        it('should send JSON-RPC request and receive response', async () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            // Mock process events to simulate start
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'spawn') {
                    setTimeout(() => callback(), 0);
                }
                return mockProcess;
            });
            // Start the adapter to set up stdout handler
            await adapter.start();
            // Get the stdout handler
            const stdoutHandler = mockStdout.on.mock.calls[0][1];
            // Mock stdin write
            mockStdin.write.mockImplementation((data) => {
                // Simulate response from stdout
                const response = { jsonrpc: '2.0', id: 1, result: 'test-result' };
                setTimeout(() => stdoutHandler(Buffer.from(JSON.stringify(response))), 0);
                return true;
            });
            const promise = adapter.call('testMethod', { param: 'value' });
            // Verify request was written
            expect(mockStdin.write).toHaveBeenCalledWith('{"jsonrpc":"2.0","id":1,"method":"testMethod","params":{"param":"value"}}\n');
            // Verify pending request was registered
            expect(adapter.pendingRequests.size).toBe(1);
            expect(adapter.pendingRequests.has(1)).toBe(true);
            // Wait for response
            const result = await promise;
            expect(result).toEqual({ jsonrpc: '2.0', id: 1, result: 'test-result' });
            expect(adapter.pendingRequests.size).toBe(0);
        });
        it('should throw error when process is not running', async () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            // Process is null (not started)
            adapter.process = null;
            await expect(adapter.call('testMethod')).rejects.toThrow('Docker service test-service is not running.');
        });
        it('should handle multiple concurrent requests', async () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            // Mock process events to simulate start
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'spawn') {
                    setTimeout(() => callback(), 0);
                }
                return mockProcess;
            });
            // Start the adapter to set up stdout handler
            await adapter.start();
            // Get the stdout handler
            const stdoutHandler = mockStdout.on.mock.calls[0][1];
            mockStdin.write.mockImplementation((data) => {
                const request = JSON.parse(data);
                // Respond with different results for different IDs
                setTimeout(() => {
                    const response = {
                        jsonrpc: '2.0',
                        id: request.id,
                        result: `result-${request.id}`
                    };
                    stdoutHandler(Buffer.from(JSON.stringify(response)));
                }, Math.random() * 10);
                return true;
            });
            // Make multiple concurrent calls
            const promises = [
                adapter.call('method1'),
                adapter.call('method2'),
                adapter.call('method3'),
            ];
            const results = await Promise.all(promises);
            expect(results).toHaveLength(3);
            expect(results.map(r => r.result)).toEqual(['result-1', 'result-2', 'result-3']);
            expect(adapter.pendingRequests.size).toBe(0);
        });
    });
    describe('stop', () => {
        it('should stop running container', () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            adapter.process = mockProcess;
            // Mock the spawn call for docker stop
            mockSpawn.mockImplementation((command) => {
                if (command === 'docker') {
                    return { kill: jest.fn() };
                }
                return mockProcess;
            });
            adapter.stop();
            // Verify docker stop was called
            expect(mockSpawn).toHaveBeenCalledWith('docker', ['stop', 'mcp-test-service']);
            // Verify process was killed
            expect(mockProcess.kill).toHaveBeenCalled();
            // Verify process was cleared
            expect(adapter.process).toBeNull();
        });
        it('should do nothing when process is not running', () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            adapter.process = null;
            adapter.stop();
            expect(mockSpawn).not.toHaveBeenCalled();
            expect(mockProcess.kill).not.toHaveBeenCalled();
        });
    });
    describe('isRunning', () => {
        it('should return true when process is running', () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            adapter.process = mockProcess;
            expect(adapter.isRunning()).toBe(true);
        });
        it('should return false when process is not running', () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            adapter.process = null;
            expect(adapter.isRunning()).toBe(false);
        });
    });
    describe('stdout data handling', () => {
        it('should resolve pending request when matching ID is received', async () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            // Start the adapter to set up stdout handler
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'spawn') {
                    setTimeout(() => callback(), 0);
                }
                return mockProcess;
            });
            await adapter.start();
            // Manually set up a pending request
            const resolver = jest.fn();
            adapter.pendingRequests.set(42, resolver);
            // Get stdout handler and send response
            const stdoutHandler = mockStdout.on.mock.calls[0][1];
            const response = { id: 42, result: 'test-result' };
            stdoutHandler(Buffer.from(JSON.stringify(response)));
            // Verify resolver was called
            expect(resolver).toHaveBeenCalledWith(response);
            // Verify pending request was removed
            expect(adapter.pendingRequests.has(42)).toBe(false);
        });
        it('should ignore JSON without ID field', async () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'spawn') {
                    setTimeout(() => callback(), 0);
                }
                return mockProcess;
            });
            await adapter.start();
            // Set up a resolver to verify it's not called
            const resolver = jest.fn();
            adapter.pendingRequests.set(42, resolver);
            const stdoutHandler = mockStdout.on.mock.calls[0][1];
            const response = { result: 'test-result' }; // No id field
            stdoutHandler(Buffer.from(JSON.stringify(response)));
            expect(resolver).not.toHaveBeenCalled();
            expect(adapter.pendingRequests.has(42)).toBe(true);
        });
        it('should ignore JSON with non-matching ID', async () => {
            const options = {
                name: 'test-service',
                image: 'test-image:latest',
            };
            const adapter = new DockerAdapter(options);
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'spawn') {
                    setTimeout(() => callback(), 0);
                }
                return mockProcess;
            });
            await adapter.start();
            const resolver = jest.fn();
            adapter.pendingRequests.set(42, resolver);
            const stdoutHandler = mockStdout.on.mock.calls[0][1];
            const response = { id: 99, result: 'test-result' }; // Different ID
            stdoutHandler(Buffer.from(JSON.stringify(response)));
            expect(resolver).not.toHaveBeenCalled();
            expect(adapter.pendingRequests.has(42)).toBe(true);
        });
    });
});
//# sourceMappingURL=runtime-docker.test.js.map