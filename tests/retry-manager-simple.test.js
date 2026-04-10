import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RetryManager } from '../src/core/retry-manager';
// Mock logger
jest.mock('../src/core/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
    },
}));
describe('RetryManager Simple Extended Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('executeBatchWithRetry', () => {
        it('should execute all operations successfully', async () => {
            const operations = [
                jest.fn().mockResolvedValue('result1'),
                jest.fn().mockResolvedValue('result2'),
                jest.fn().mockResolvedValue('result3'),
            ];
            const options = { maxRetries: 1 };
            const results = await RetryManager.executeBatchWithRetry(operations, options);
            expect(results).toHaveLength(3);
            expect(results[0].success).toBe(true);
            expect(results[0].result).toBe('result1');
            expect(results[1].success).toBe(true);
            expect(results[1].result).toBe('result2');
            expect(results[2].success).toBe(true);
            expect(results[2].result).toBe('result3');
            operations.forEach(op => {
                expect(op).toHaveBeenCalledTimes(1);
            });
        });
        it('should stop batch execution on non-retryable error', async () => {
            const operations = [
                jest.fn().mockResolvedValue('result1'),
                jest.fn().mockRejectedValue(new Error('Authentication error')),
                jest.fn().mockResolvedValue('result3'), // This should not be executed
            ];
            const options = {
                maxRetries: 1,
                nonRetryableErrors: ['Authentication error'],
            };
            const results = await RetryManager.executeBatchWithRetry(operations, options);
            // Should only execute first two operations
            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(operations[2]).not.toHaveBeenCalled(); // Third operation should not be called
        });
    });
    describe('createCircuitBreaker', () => {
        it('should execute operation when circuit is closed', async () => {
            const circuitBreaker = RetryManager.createCircuitBreaker();
            const operation = jest.fn().mockResolvedValue('success');
            const result = await circuitBreaker(operation);
            expect(result.success).toBe(true);
            expect(result.result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
        });
        it('should return circuit breaker function', () => {
            const circuitBreaker = RetryManager.createCircuitBreaker();
            expect(typeof circuitBreaker).toBe('function');
        });
    });
    describe('getStats', () => {
        it('should return default stats structure', () => {
            const stats = RetryManager.getStats();
            expect(stats).toEqual({
                totalOperations: 0,
                successfulOperations: 0,
                failedOperations: 0,
                averageRetries: 0,
                averageTime: 0,
            });
        });
    });
    describe('Error detection methods', () => {
        it('should detect network errors', () => {
            const error = new Error('Network connection failed');
            // We can't test private methods directly, but we can test through executeWithRetry
            const operation = jest.fn().mockRejectedValue(error);
            // This will test isNetworkError indirectly
            return RetryManager.executeWithRetry(operation, { maxRetries: 1, initialDelay: 1 })
                .then(result => {
                expect(result.success).toBe(false);
            });
        });
        it('should detect timeout errors', () => {
            const error = new Error('Request timed out');
            const operation = jest.fn().mockRejectedValue(error);
            return RetryManager.executeWithRetry(operation, { maxRetries: 1, initialDelay: 1 })
                .then(result => {
                expect(result.success).toBe(false);
            });
        });
        it('should detect configuration errors', () => {
            const error = new Error('Invalid configuration: missing API key');
            const operation = jest.fn().mockRejectedValue(error);
            return RetryManager.executeWithRetry(operation, { maxRetries: 3, initialDelay: 1 })
                .then(result => {
                // Configuration errors should fail
                expect(result.success).toBe(false);
                expect(result.error?.message).toContain('Invalid configuration');
            });
        });
        it('should detect authentication errors', () => {
            const error = new Error('Authentication failed: invalid token');
            const operation = jest.fn().mockRejectedValue(error);
            return RetryManager.executeWithRetry(operation, { maxRetries: 3, initialDelay: 1 })
                .then(result => {
                // Authentication errors should fail
                expect(result.success).toBe(false);
                expect(result.error?.message).toContain('Authentication failed');
            });
        });
    });
    describe('Edge cases', () => {
        it('should handle operation that throws non-Error objects', async () => {
            const operation = jest.fn().mockRejectedValue('string error');
            const result = await RetryManager.executeWithRetry(operation, { maxRetries: 1 });
            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error?.message).toBe('string error');
        });
        it('should handle operation that returns synchronously', async () => {
            const operation = jest.fn().mockResolvedValue('sync result');
            const result = await RetryManager.executeWithRetry(operation);
            expect(result.success).toBe(true);
            expect(result.result).toBe('sync result');
        });
    });
});
//# sourceMappingURL=retry-manager-simple.test.js.map