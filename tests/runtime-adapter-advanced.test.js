import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RuntimeAdapterError, RuntimeErrorCode, RuntimeAdapterRegistry, BaseRuntimeAdapter, } from '../src/runtime/adapter-advanced';
// Mock logger
jest.mock('../src/core/logger', () => ({
    logger: {
        error: jest.fn(),
    },
}));
describe('RuntimeAdapterError', () => {
    it('should create error with code and message', () => {
        const error = new RuntimeAdapterError(RuntimeErrorCode.CONFIG_INVALID, 'Invalid configuration', { field: 'name' }, new Error('Original error'));
        expect(error.code).toBe(RuntimeErrorCode.CONFIG_INVALID);
        expect(error.message).toBe('Invalid configuration');
        expect(error.context).toEqual({ field: 'name' });
        expect(error.cause).toBeInstanceOf(Error);
        expect(error.name).toBe('RuntimeAdapterError');
    });
    it('should create error without optional parameters', () => {
        const error = new RuntimeAdapterError(RuntimeErrorCode.UNKNOWN, 'Unknown error');
        expect(error.code).toBe(RuntimeErrorCode.UNKNOWN);
        expect(error.message).toBe('Unknown error');
        expect(error.context).toBeUndefined();
        expect(error.cause).toBeUndefined();
    });
});
describe('RuntimeAdapterRegistry', () => {
    beforeEach(() => {
        // Clear registry before each test
        const factories = RuntimeAdapterRegistry.factories;
        if (factories) {
            factories.clear();
        }
    });
    it('should register and get factory', () => {
        // Create a simple mock adapter
        const mockAdapter = {
            start: async () => ({ id: 'test', status: 'running', config: {} }),
            stop: async () => { },
            status: async () => ({ running: true }),
        };
        const mockFactory = {
            create: () => mockAdapter,
            supports: () => true,
        };
        RuntimeAdapterRegistry.register('test-runtime', mockFactory);
        const factory = RuntimeAdapterRegistry.getFactory('test-runtime');
        expect(factory).toBe(mockFactory);
    });
    it('should return undefined for unregistered runtime', () => {
        const factory = RuntimeAdapterRegistry.getFactory('nonexistent');
        expect(factory).toBeUndefined();
    });
    it('should create adapter instance', () => {
        const mockAdapter = {
            start: async () => ({ id: 'test', status: 'running', config: {} }),
            stop: async () => { },
            status: async () => ({ running: true }),
        };
        const mockFactory = {
            create: () => mockAdapter,
            supports: () => true,
        };
        RuntimeAdapterRegistry.register('test-runtime', mockFactory);
        const config = { name: 'test', path: '/test' };
        const adapter = RuntimeAdapterRegistry.createAdapter('test-runtime', config);
        expect(adapter).toBe(mockAdapter);
    });
    it('should throw error when creating adapter for unsupported runtime', () => {
        const config = { name: 'test', path: '/test' };
        expect(() => {
            RuntimeAdapterRegistry.createAdapter('unsupported-runtime', config);
        }).toThrow(RuntimeAdapterError);
    });
    it('should get all supported runtime types', () => {
        const mockAdapter = {
            start: async () => ({ id: 'test', status: 'running', config: {} }),
            stop: async () => { },
            status: async () => ({ running: true }),
        };
        const factory1 = {
            create: () => mockAdapter,
            supports: () => true
        };
        const factory2 = {
            create: () => mockAdapter,
            supports: () => true
        };
        RuntimeAdapterRegistry.register('runtime1', factory1);
        RuntimeAdapterRegistry.register('runtime2', factory2);
        const runtimes = RuntimeAdapterRegistry.getSupportedRuntimes();
        expect(runtimes).toContain('runtime1');
        expect(runtimes).toContain('runtime2');
        expect(runtimes).toHaveLength(2);
    });
});
describe('BaseRuntimeAdapter', () => {
    class TestAdapter extends BaseRuntimeAdapter {
        testProcesses = new Map();
        async start(config) {
            this.validateConfig(config);
            await this.onStart?.(config);
            const processId = this.generateProcessId(config);
            const processInfo = {
                id: processId,
                status: 'running',
                startedAt: new Date(),
                config,
            };
            this.testProcesses.set(processId, processInfo);
            this.processMap.set(processId, processInfo);
            await this.onStarted?.(processInfo);
            return processInfo;
        }
        async stop(processId) {
            await this.onStop?.(processId);
            if (!this.testProcesses.has(processId)) {
                throw new RuntimeAdapterError(RuntimeErrorCode.PROCESS_NOT_FOUND, `Process ${processId} not found`);
            }
            this.testProcesses.delete(processId);
            this.processMap.delete(processId);
            await this.onStopped?.(processId);
        }
        async status(processId) {
            const processInfo = this.testProcesses.get(processId);
            if (!processInfo) {
                throw new RuntimeAdapterError(RuntimeErrorCode.PROCESS_NOT_FOUND, `Process ${processId} not found`);
            }
            return {
                running: processInfo.status === 'running',
                pid: 12345,
                uptime: Date.now() - (processInfo.startedAt?.getTime() || Date.now()),
            };
        }
    }
    let adapter;
    beforeEach(() => {
        adapter = new TestAdapter();
    });
    describe('healthCheck', () => {
        it('should return unhealthy when no processes found', async () => {
            const config = { name: 'test', path: '/test' };
            const health = await adapter.healthCheck(config);
            expect(health.healthy).toBe(false);
            expect(health.checks).toHaveLength(1);
            expect(health.checks[0].status).toBe('fail');
            expect(health.score).toBe(0);
        });
        it('should return healthy when running process found', async () => {
            const config = { name: 'test', path: '/test' };
            const processInfo = await adapter.start(config);
            const health = await adapter.healthCheck(config);
            expect(health.healthy).toBe(true);
            expect(health.checks).toHaveLength(1);
            expect(health.checks[0].status).toBe('pass');
            expect(health.score).toBe(100);
            // Cleanup
            await adapter.stop(processInfo.id);
        });
    });
    describe('logs', () => {
        it('should return default log message', async () => {
            const logs = adapter.logs('test-process-id');
            const logsArray = [];
            for await (const log of logs) {
                logsArray.push(log);
            }
            expect(logsArray).toHaveLength(1);
            expect(logsArray[0]).toBe('Logs not available for process test-process-id');
        });
    });
    describe('restart', () => {
        it('should restart process successfully', async () => {
            const config = { name: 'test', path: '/test' };
            const processInfo = await adapter.start(config);
            const newProcessInfo = await adapter.restart(processInfo.id);
            expect(newProcessInfo.id).not.toBe(processInfo.id);
            expect(newProcessInfo.config).toEqual(config);
            // Cleanup
            await adapter.stop(newProcessInfo.id);
        });
        it('should throw error when restarting non-existent process', async () => {
            await expect(adapter.restart('nonexistent-id')).rejects.toThrow(RuntimeAdapterError);
        });
    });
    describe('generateProcessId', () => {
        it('should generate unique process IDs', () => {
            const config = { name: 'test', path: '/test' };
            const id1 = adapter.generateProcessId(config);
            const id2 = adapter.generateProcessId(config);
            expect(id1).not.toBe(id2);
            expect(id1).toContain('test-');
        });
    });
    describe('validateConfig', () => {
        it('should throw error when name is missing', () => {
            const config = { path: '/test' };
            expect(() => {
                adapter.validateConfig(config);
            }).toThrow(RuntimeAdapterError);
        });
        it('should throw error when name is empty', () => {
            const config = { name: '', path: '/test' };
            expect(() => {
                adapter.validateConfig(config);
            }).toThrow(RuntimeAdapterError);
        });
        it('should throw error when path is missing', () => {
            const config = { name: 'test' };
            expect(() => {
                adapter.validateConfig(config);
            }).toThrow(RuntimeAdapterError);
        });
        it('should throw error when path is empty', () => {
            const config = { name: 'test', path: '' };
            expect(() => {
                adapter.validateConfig(config);
            }).toThrow(RuntimeAdapterError);
        });
        it('should not throw error for valid config', () => {
            const config = { name: 'test', path: '/test' };
            expect(() => {
                adapter.validateConfig(config);
            }).not.toThrow();
        });
    });
});
describe('EnhancedRuntimeAdapter interface', () => {
    it('should define required methods', () => {
        const adapter = {
            start: async () => ({ id: 'test', status: 'running', config: {} }),
            stop: async () => { },
            status: async () => ({ running: true }),
        };
        expect(adapter.start).toBeDefined();
        expect(adapter.stop).toBeDefined();
        expect(adapter.status).toBeDefined();
    });
    it('should support optional methods', () => {
        const adapter = {
            start: async () => ({ id: 'test', status: 'running', config: {} }),
            stop: async () => { },
            status: async () => ({ running: true }),
            healthCheck: async () => ({ healthy: true, checks: [], score: 100 }),
            logs: async function* () { yield 'test'; },
            restart: async () => ({ id: 'test', status: 'running', config: {} }),
            onStart: async () => { },
            onStarted: async () => { },
            onStop: async () => { },
            onStopped: async () => { },
            onError: async () => { },
        };
        expect(adapter.healthCheck).toBeDefined();
        expect(adapter.logs).toBeDefined();
        expect(adapter.restart).toBeDefined();
        expect(adapter.onStart).toBeDefined();
        expect(adapter.onStarted).toBeDefined();
        expect(adapter.onStop).toBeDefined();
        expect(adapter.onStopped).toBeDefined();
        expect(adapter.onError).toBeDefined();
    });
});
//# sourceMappingURL=runtime-adapter-advanced.test.js.map