/**
 * Daemon Process Manager Correct Tests
 * Correct tests for src/daemon/pm.ts
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as fs from 'fs';
import { ProcessManager } from '../src/daemon/pm';
// Mock dependencies
jest.mock('fs');
jest.mock('../src/core/constants', () => ({
    CONFIG_PATH: '/mock/config/path.json',
}));
describe('ProcessManager Correct Tests', () => {
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
                        name: 'test-service-node',
                        runtime: 'node',
                        path: '/path/to/node/service',
                        status: 'stopped'
                    }
                ]
            }
        }));
        processManager = new ProcessManager();
    });
    describe('Basic functionality', () => {
        it('should get statuses', () => {
            const statuses = processManager.getStatuses();
            expect(statuses).toHaveLength(1);
            expect(statuses[0].name).toBe('test-service-node');
            expect(statuses[0].runtime).toBe('node');
            expect(statuses[0].status).toBe('stopped');
        });
        it('should get running services', () => {
            const runningServices = processManager.getRunningServices();
            expect(runningServices).toEqual([]); // No services are running
        });
        it('should get service tools', () => {
            const tools = processManager.getServiceTools('test-service-node');
            expect(tools).toEqual([]); // No tools by default
        });
    });
});
//# sourceMappingURL=daemon-pm-correct.test.js.map