/**
 * Simple test for PythonAdapter to debug the issue
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
// First, mock all dependencies before importing PythonAdapter
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
// Now import PythonAdapter after mocks are set up
import { PythonAdapter } from '../../src/runtime/python-adapter';
describe('PythonAdapter Simple Test', () => {
    let adapter;
    let mockExec;
    let mockExistsSync;
    const mockConfig = {
        name: 'test-python-service',
        path: '/test/path',
        entry: 'main.py',
    };
    beforeEach(() => {
        jest.clearAllMocks();
        // Get mocked functions
        const childProcess = require('child_process');
        const fs = require('fs');
        const path = require('path');
        mockExec = childProcess.exec;
        mockExistsSync = fs.existsSync;
        // Default mock implementations
        mockExec.mockImplementation(() => {
            console.log('mockExec called');
            return Promise.resolve({ stdout: '', stderr: '' });
        });
        mockExistsSync.mockReturnValue(true);
        // Mock path functions
        path.join.mockImplementation((...args) => args.join('/'));
        path.isAbsolute.mockImplementation((p) => p.startsWith('/'));
        adapter = new PythonAdapter(mockExec);
    });
    it('should get spawn args correctly', () => {
        const result = adapter.getSpawnArgs(mockConfig);
        expect(result).toBeDefined();
        expect(result.command).toBe('/test/venvs/test-python-service/bin/python');
        expect(result.args).toEqual(['main.py']);
    });
    it('should setup without dependencies', async () => {
        // Mock that virtual environment already exists
        mockExistsSync.mockImplementation((path) => {
            console.log('existsSync called with:', path);
            if (path === '/test/venvs')
                return true;
            if (path === '/test/venvs/test-python-service')
                return true;
            if (path === '/test/venvs/test-python-service/bin/python')
                return true;
            return false;
        });
        // Mock exec to log when called
        mockExec.mockImplementation((command) => {
            console.log('exec called with:', command);
            return Promise.resolve({ stdout: '', stderr: '' });
        });
        await adapter.setup(mockConfig);
        // Should not create virtual environment since it already exists
        const venvCreationCalls = mockExec.mock.calls.filter((call) => call[0]?.includes('python3 -m venv'));
        expect(venvCreationCalls).toHaveLength(0);
    }, 10000);
});
//# sourceMappingURL=python-adapter-simple.test.js.map