/**
 * Daemon Process Manager Extended Coverage Tests
 * Additional tests to improve coverage for src/daemon/pm.ts
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as fs from 'fs';
import { ProcessManager } from '../src/daemon/pm';
// Mock dependencies
jest.mock('fs');
jest.mock('../src/core/constants', () => ({
    CONFIG_PATH: '/mock/config/path.json',
}));
describe('ProcessManager Extended Coverage Tests', () => {
    let processManager;
    let mockFs;
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        mockFs = fs;
        // Mock fs.existsSync to return true (config exists)
        mockFs.existsSync.mockReturnValue(true);
        // Mock fs.readFileSync to return mock config
        mockFs.readFileSync.mockReturnValue(JSON.stringify({
            services: {
                instances: [
                    {
                        name: 'test-service',
                        runtime: 'node',
                        path: '/path/to/service',
                        status: 'stopped'
                    }
                ]
            }
        }));
        processManager = new ProcessManager();
    });
    describe('Error handling in constructor', () => {
        it('should handle JSON parse error in config', () => {
            mockFs.readFileSync.mockReturnValue('invalid json');
            // Should not throw
            expect(() => {
                new ProcessManager();
            }).not.toThrow();
        });
        it('should handle missing services property in config', () => {
            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                // No services property
                other: 'data'
            }));
            const pm = new ProcessManager();
            expect(pm.instances.size).toBe(0);
        });
        it('should handle empty instances array in config', () => {
            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                services: {
                    instances: []
                }
            }));
            const pm = new ProcessManager();
            expect(pm.instances.size).toBe(0);
        });
    });
    describe('startService method', () => {
        it('should handle service not found', async () => {
            await expect(processManager.startService('non-existent-service')).rejects.toThrow('Service non-existent-service not found');
        });
        it('should handle service already running', async () => {
            // First, get the instance and set it to running
            const instance = processManager.instances.get('test-service');
            if (instance) {
                instance.status = 'running';
            }
            await expect(processManager.startService('test-service')).resolves.not.toThrow();
        });
    });
    describe('stopService method', () => {
        it('should handle service not found', () => {
            expect(() => {
                processManager.stopService('non-existent-service');
            }).not.toThrow();
        });
        it('should handle service already stopped', () => {
            // Service is already stopped by default
            expect(() => {
                processManager.stopService('test-service');
            }).not.toThrow();
        });
    });
    describe('discoverTools method', () => {
        it('should handle service not found', async () => {
            await expect(processManager.discoverTools('non-existent-service')).rejects.toThrow('Service non-existent-service not found');
        });
    });
    describe('callService method', () => {
        it('should handle service not found', async () => {
            await expect(processManager.callService('non-existent-service', 'test-method', {}))
                .rejects.toThrow();
        });
        it('should throw error when service fails to start', async () => {
            // callService will try to start the service when it's not running
            // Since adapters are not mocked, startService will fail
            await expect(processManager.callService('test-service', 'test-method', {}))
                .rejects.toThrow();
        });
    });
});
//# sourceMappingURL=daemon-pm-extended-coverage.test.js.map