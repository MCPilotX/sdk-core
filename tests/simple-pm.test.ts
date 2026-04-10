/**
 * Simple Process Manager Tests
 * Basic tests for src/daemon/pm.ts to improve coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProcessManager } from '../src/daemon/pm';

// Simple mock to avoid complex type issues
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn(),
}));

jest.mock('../src/runtime/node', () => ({
  NodeAdapter: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined as any),
    call: jest.fn().mockResolvedValue({ result: { tools: [] } } as any),
    stop: jest.fn(),
  })),
}));

jest.mock('../src/core/constants', () => ({
  CONFIG_PATH: '/test/config.json',
}));

describe('Simple ProcessManager Tests', () => {
  let processManager: ProcessManager;

  beforeEach(() => {
    jest.clearAllMocks();
    processManager = new ProcessManager();
  });

  it('should initialize with no services when config file does not exist', () => {
    const statuses = processManager.getStatuses();
    expect(statuses).toEqual([]);
  });

  it('should get empty running services initially', () => {
    const runningServices = processManager.getRunningServices();
    expect(runningServices).toEqual([]);
  });

  it('should get empty tools for non-existent service', () => {
    const tools = processManager.getServiceTools('non-existent');
    expect(tools).toEqual([]);
  });

  it('should handle stopping non-existent service without error', () => {
    expect(() => processManager.stopService('non-existent')).not.toThrow();
  });

  it('should handle stopping non-running service without error', () => {
    // This test doesn't require any setup since services are empty
    expect(() => processManager.stopService('test-service')).not.toThrow();
  });
});