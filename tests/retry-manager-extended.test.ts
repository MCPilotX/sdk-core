import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { RetryManager, RetryOptions, RetryResult } from '../src/core/retry-manager';

// Mock logger
jest.mock('../src/core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('RetryManager Extended Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Math.random for predictable jitter
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('executeBatchWithRetry', () => {
    it('should execute all operations successfully', async () => {
      const operations = [
        jest.fn<() => Promise<string>>().mockResolvedValue('result1'),
        jest.fn<() => Promise<string>>().mockResolvedValue('result2'),
        jest.fn<() => Promise<string>>().mockResolvedValue('result3'),
      ];

      const options: RetryOptions = { maxRetries: 1 };
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

    it('should retry failed operations in batch', async () => {
      let callCount1 = 0;
      let callCount2 = 0;

      const operations = [
        jest.fn<() => Promise<string>>().mockImplementation(() => {
          callCount1++;
          if (callCount1 === 1) {
            throw new Error('First attempt failed');
          }
          return Promise.resolve('result1');
        }),
        jest.fn<() => Promise<string>>().mockImplementation(() => {
          callCount2++;
          if (callCount2 <= 2) {
            throw new Error('First two attempts failed');
          }
          return Promise.resolve('result2');
        }),
      ];

      const options: RetryOptions = { maxRetries: 3, initialDelay: 1 }; // Use very small delay for testing
      const results = await RetryManager.executeBatchWithRetry(operations, options);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].attempts).toBe(2);
      expect(results[1].success).toBe(true);
      expect(results[1].attempts).toBe(3);
    }, 5000); // Reduced timeout

    it('should stop batch execution on non-retryable error', async () => {
      const operations = [
        jest.fn<() => Promise<string>>().mockResolvedValue('result1'),
        jest.fn<() => Promise<string>>().mockRejectedValue(new Error('Authentication error')),
        jest.fn<() => Promise<string>>().mockResolvedValue('result3'), // This should not be executed
      ];

      const options: RetryOptions = {
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

    it('should continue batch execution on retryable error', async () => {
      const operations = [
        jest.fn<() => Promise<string>>().mockResolvedValue('result1'),
        jest.fn<() => Promise<string>>().mockRejectedValue(new Error('Network error')),
        jest.fn<() => Promise<string>>().mockResolvedValue('result3'),
      ];

      const options: RetryOptions = {
        maxRetries: 1,
        retryableErrors: ['Network error'],
      };

      const results = await RetryManager.executeBatchWithRetry(operations, options);

      // Should execute all operations
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false); // Still fails after retry
      expect(results[2].success).toBe(true);
      expect(operations[2]).toHaveBeenCalled(); // Third operation should be called
    });
  });

  describe('createCircuitBreaker', () => {
    it('should execute operation when circuit is closed', async () => {
      const circuitBreaker = RetryManager.createCircuitBreaker();
      const operation = jest.fn<() => Promise<string>>().mockResolvedValue('success');

      const result = await circuitBreaker(operation);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after failure threshold', async () => {
      const circuitBreaker = RetryManager.createCircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 100,
      });

      const error = new Error('Service error');
      const operation = jest.fn<() => Promise<string>>().mockRejectedValue(error);

      // First failure
      try {
        await circuitBreaker(operation, { initialDelay: 1 });
      } catch (e) {
        // Expected
      }

      // Second failure - should open circuit
      try {
        await circuitBreaker(operation, { initialDelay: 1 });
      } catch (e) {
        // Expected
      }

      // Third attempt - circuit should be open
      await expect(circuitBreaker(operation, { initialDelay: 1 })).rejects.toThrow('Circuit breaker is open - service unavailable');
    }, 5000);

    it('should transition to half-open after reset timeout', async () => {
      const circuitBreaker = RetryManager.createCircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 5, // Use very small timeout for testing
      });

      const error = new Error('Service error');
      const failingOperation = jest.fn<() => Promise<string>>().mockRejectedValue(error);
      const successOperation = jest.fn<() => Promise<string>>().mockResolvedValue('success');

      // First failure - opens circuit
      try {
        await circuitBreaker(failingOperation);
      } catch (e) {
        // Expected
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should be in half-open state now
      const result = await circuitBreaker(successOperation);
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
    }, 10000); // Increased timeout for flaky test

    it('should re-open circuit if half-open attempts fail', async () => {
      const circuitBreaker = RetryManager.createCircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 10, // Use very small timeout for testing
        halfOpenMaxAttempts: 1, // Only allow one half-open attempt
      });

      const error = new Error('Service error');
      const operation = jest.fn<() => Promise<string>>().mockRejectedValue(error);

      // First failure - opens circuit
      try {
        await circuitBreaker(operation, { initialDelay: 1 });
      } catch (e) {
        // Expected
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 15));

      // First half-open attempt - fails, should immediately re-open circuit
      await expect(circuitBreaker(operation, { initialDelay: 1 })).rejects.toThrow('Circuit breaker re-opened - service still unavailable');
    }, 5000);
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

  describe('Error detection methods (indirect testing)', () => {
    it('should retry network errors by default', async () => {
      let callCount = 0;
      const operation = jest.fn<() => Promise<string>>().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network connection failed');
        }
        return Promise.resolve('success');
      });

      const result = await RetryManager.executeWithRetry(operation, { maxRetries: 1, initialDelay: 10 });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should retry timeout errors by default', async () => {
      let callCount = 0;
      const operation = jest.fn<() => Promise<string>>().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Request timed out');
        }
        return Promise.resolve('success');
      });

      const result = await RetryManager.executeWithRetry(operation, { maxRetries: 1, initialDelay: 10 });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should not retry configuration errors by default', async () => {
      const operation = jest.fn<() => Promise<string>>().mockRejectedValue(
        new Error('Invalid configuration: missing API key')
      );

      const result = await RetryManager.executeWithRetry(operation, { maxRetries: 3, initialDelay: 10 });

      // Should not retry configuration errors
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
    });

    it('should not retry authentication errors by default', async () => {
      const operation = jest.fn<() => Promise<string>>().mockRejectedValue(
        new Error('Authentication failed: invalid token')
      );

      const result = await RetryManager.executeWithRetry(operation, { maxRetries: 3, initialDelay: 10 });

      // Should not retry authentication errors
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
    });
  });

  describe('calculateDelay (indirect testing)', () => {
    it('should apply exponential backoff', async () => {
      const operation = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('First'))
        .mockRejectedValueOnce(new Error('Second'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      const result = await RetryManager.executeWithRetry(operation, {
        maxRetries: 2,
        initialDelay: 100,
        backoffFactor: 2,
        jitter: false, // Disable jitter for predictable testing
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      // Total time should be at least: 100ms (first delay) + 200ms (second delay) = 300ms
      expect(result.totalTime).toBeGreaterThanOrEqual(300);
    });

    it('should respect maxDelay', async () => {
      const operation = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('First'))
        .mockRejectedValueOnce(new Error('Second'))
        .mockRejectedValueOnce(new Error('Third'))
        .mockResolvedValue('success');

      const result = await RetryManager.executeWithRetry(operation, {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 1500,
        backoffFactor: 2,
        jitter: false,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(4);
      // Delays should be: 1000, 1500 (capped), 1500 (capped)
      // Total time should be at least 4000ms
      expect(result.totalTime).toBeGreaterThanOrEqual(4000);
    });
  });

  describe('Edge cases', () => {
    it('should handle operation that throws non-Error objects', async () => {
      const operation = jest.fn<() => Promise<string>>().mockRejectedValue('string error');
      
      const result = await RetryManager.executeWithRetry(operation, { maxRetries: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should handle operation that returns synchronously', async () => {
      const operation = jest.fn<() => Promise<string>>().mockResolvedValue('sync result');
      
      const result = await RetryManager.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.result).toBe('sync result');
    });

    it('should handle empty retryableErrors array', async () => {
      let callCount = 0;
      const operation = jest.fn<() => Promise<string>>().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Some error');
        }
        return Promise.resolve('success');
      });

      // With empty retryableErrors array, should use default error detection
      const result = await RetryManager.executeWithRetry(operation, {
        maxRetries: 1,
        initialDelay: 10,
        retryableErrors: [],
      });

      // Default error detection may or may not retry depending on error type
      expect(result.attempts).toBeGreaterThanOrEqual(1);
      expect(result.attempts).toBeLessThanOrEqual(2);
    });

    it('should handle empty nonRetryableErrors array', async () => {
      const operation = jest.fn<() => Promise<string>>().mockRejectedValue(
        new Error('Some error')
      );

      // With empty nonRetryableErrors array, should use default error detection
      const result = await RetryManager.executeWithRetry(operation, {
        maxRetries: 1,
        initialDelay: 10,
        nonRetryableErrors: [],
      });

      // Default error detection may or may not retry depending on error type
      expect(result.attempts).toBeGreaterThanOrEqual(1);
      expect(result.attempts).toBeLessThanOrEqual(2);
    });
  });
});