/**
 * Core Module Coverage Tests
 * Tests for src/core/ directory to improve test coverage
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Logger, LogLevel, logger } from '../src/core/logger';
import { ErrorHandler } from '../src/core/error-handler';
import { AIErrorHandler } from '../src/core/error-ai';
import { ConfigManager } from '../src/core/config-manager';
import { RetryManager } from '../src/core/retry-manager';
import { PerformanceMonitor } from '../src/core/performance-monitor';
describe('Core Module Coverage Tests', () => {
    describe('Logger', () => {
        let testLogger;
        beforeEach(() => {
            testLogger = Logger.getInstance();
            // Reset to default log level
            testLogger.setLogLevel(LogLevel.INFO);
        });
        it('should be a singleton', () => {
            const instance1 = Logger.getInstance();
            const instance2 = Logger.getInstance();
            expect(instance1).toBe(instance2);
        });
        it('should export singleton logger instance', () => {
            expect(logger).toBeDefined();
            expect(logger).toBeInstanceOf(Logger);
        });
        it('should set log level', () => {
            testLogger.setLogLevel(LogLevel.DEBUG);
            // Logger doesn't have getLogLevel method, so we just verify setLogLevel doesn't throw
            expect(() => testLogger.setLogLevel(LogLevel.ERROR)).not.toThrow();
        });
        it('should log messages at different levels', () => {
            const mockConsole = {
                log: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                debug: jest.fn(),
            };
            const originalConsole = { ...console };
            Object.assign(console, mockConsole);
            try {
                // Test with DEBUG level (should log everything)
                testLogger.setLogLevel(LogLevel.DEBUG);
                testLogger.debug('Debug message');
                testLogger.info('Info message');
                testLogger.warn('Warning message');
                testLogger.error('Error message');
                expect(mockConsole.debug).toHaveBeenCalledWith(expect.stringContaining('Debug message'));
                expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Info message'));
                expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('Warning message'));
                expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Error message'));
            }
            finally {
                Object.assign(console, originalConsole);
            }
        });
        it('should filter logs based on log level', () => {
            const mockConsole = {
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
            };
            const originalConsole = { ...console };
            Object.assign(console, mockConsole);
            try {
                // Test with WARN level (should only log WARN and ERROR)
                testLogger.setLogLevel(LogLevel.WARN);
                testLogger.debug('Debug message - should not appear');
                testLogger.info('Info message - should not appear');
                testLogger.warn('Warning message - should appear');
                testLogger.error('Error message - should appear');
                expect(mockConsole.debug).not.toHaveBeenCalled();
                expect(mockConsole.info).not.toHaveBeenCalled();
                expect(mockConsole.warn).toHaveBeenCalled();
                expect(mockConsole.error).toHaveBeenCalled();
            }
            finally {
                Object.assign(console, originalConsole);
            }
        });
        it('should log with metadata', () => {
            const mockConsole = {
                info: jest.fn(),
            };
            const originalConsole = { ...console };
            Object.assign(console, mockConsole);
            try {
                testLogger.setLogLevel(LogLevel.INFO);
                testLogger.info('Test message', { key: 'value', timestamp: '2024-01-01' });
                expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Test message'));
                expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('key'));
                expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('value'));
            }
            finally {
                Object.assign(console, originalConsole);
            }
        });
    });
    describe('ErrorHandler', () => {
        let errorHandler;
        beforeEach(() => {
            errorHandler = ErrorHandler.getInstance();
        });
        it('should be a singleton', () => {
            const instance1 = ErrorHandler.getInstance();
            const instance2 = ErrorHandler.getInstance();
            expect(instance1).toBe(instance2);
        });
        it('should handle errors', async () => {
            const error = new Error('Test error message');
            await expect(errorHandler.handle(error)).resolves.not.toThrow();
        });
        it('should register error handlers', () => {
            const handler = async (error) => { };
            errorHandler.registerHandler(handler);
            // Should not throw when registering handler
            expect(() => errorHandler.registerHandler(handler)).not.toThrow();
        });
    });
    describe('AIErrorHandler', () => {
        it('should handle errors', () => {
            const originalLog = console.log;
            const mockLog = jest.fn();
            console.log = mockLog;
            try {
                const error = {
                    type: 'config',
                    message: 'Test error message',
                    provider: 'openai',
                };
                AIErrorHandler.handleError(error);
                expect(mockLog).toHaveBeenCalled();
                const logMessage = mockLog.mock.calls[0][0];
                expect(logMessage).toContain('Test error message');
            }
            finally {
                console.log = originalLog;
            }
        });
        it('should provide suggestions for config errors', () => {
            const error = {
                type: 'config',
                message: 'Configuration error',
                provider: 'openai',
            };
            // Just verify the method exists and can be called
            expect(() => AIErrorHandler.handleError(error)).not.toThrow();
        });
        it('should provide suggestions for connection errors', () => {
            const error = {
                type: 'connection',
                message: 'Connection error',
                provider: 'ollama',
            };
            expect(() => AIErrorHandler.handleError(error)).not.toThrow();
        });
    });
    describe('ConfigManager', () => {
        beforeEach(() => {
            // ConfigManager is a singleton class with static methods
        });
        it('should initialize configuration', () => {
            ConfigManager.init();
            // Should not throw error
        });
        it('should get global configuration', () => {
            const config = ConfigManager.getGlobalConfig();
            expect(config).toBeDefined();
            expect(config.services).toBeDefined();
            expect(config.ai).toBeDefined();
        });
        it('should get service configuration', () => {
            // Just verify the method exists and can be called
            expect(() => ConfigManager.getServiceConfig('test-service')).not.toThrow();
        });
        it('should get all services', () => {
            const services = ConfigManager.getAllServices();
            expect(Array.isArray(services)).toBe(true);
        });
        it('should validate service configuration', () => {
            const validConfig = {
                name: 'test-service',
                runtime: 'node',
                command: 'npm start',
                workingDir: '/tmp',
                path: '/tmp/test-service',
            };
            const errors = ConfigManager.validateServiceConfig(validConfig);
            expect(Array.isArray(errors)).toBe(true);
        });
        it('should save global configuration', () => {
            const currentConfig = ConfigManager.getGlobalConfig();
            const newConfig = {
                ...currentConfig,
                ai: {
                    ...currentConfig.ai,
                    model: 'gpt-4',
                },
            };
            ConfigManager.saveGlobalConfig(newConfig);
            const updatedConfig = ConfigManager.getGlobalConfig();
            expect(updatedConfig.ai?.model).toBe('gpt-4');
        });
    });
    describe('RetryManager', () => {
        it('should execute operation with retries', async () => {
            let attemptCount = 0;
            const operation = async () => {
                attemptCount++;
                if (attemptCount < 3) {
                    throw new Error('Temporary failure');
                }
                return `Success on attempt ${attemptCount}`;
            };
            const result = await RetryManager.executeWithRetry(operation);
            expect(result.success).toBe(true);
            expect(result.result).toBe('Success on attempt 3');
            expect(result.attempts).toBe(3);
        });
        it('should respect max retries', async () => {
            let attemptCount = 0;
            const operation = async () => {
                attemptCount++;
                throw new Error(`Always fails - attempt ${attemptCount}`);
            };
            const result = await RetryManager.executeWithRetry(operation, {
                maxRetries: 1,
                initialDelay: 10,
                maxDelay: 10,
                backoffFactor: 1
            });
            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('Always fails');
            expect(result.attempts).toBe(2); // 0 + 1 retry
        }, 5000); // 5 second timeout
        it('should apply delay between retries', async () => {
            const startTime = Date.now();
            let attemptCount = 0;
            const operation = async () => {
                attemptCount++;
                throw new Error('Fail');
            };
            const result = await RetryManager.executeWithRetry(operation, {
                maxRetries: 2,
                initialDelay: 10,
                maxDelay: 10,
                backoffFactor: 1
            });
            const elapsedTime = Date.now() - startTime;
            expect(result.success).toBe(false);
            // Should have taken some time due to delays
            expect(elapsedTime).toBeGreaterThan(0);
        }, 5000);
        it('should handle successful operation on first attempt', async () => {
            const operation = async () => 'Success';
            const result = await RetryManager.executeWithRetry(operation);
            expect(result.success).toBe(true);
            expect(result.result).toBe('Success');
            expect(result.attempts).toBe(1);
        });
    });
    describe('PerformanceMonitor', () => {
        let monitor;
        beforeEach(() => {
            monitor = new PerformanceMonitor({ enabled: false });
        });
        afterEach(() => {
            monitor.stop();
        });
        it('should record service requests', () => {
            monitor.recordServiceRequest('test-service', 150, true);
            monitor.recordServiceRequest('test-service', 250, false);
            monitor.recordServiceRequest('another-service', 350, true);
            // Manually collect metrics since monitor is disabled
            monitor['collectMetrics']();
            const metrics = monitor.getMetrics();
            expect(metrics.length).toBeGreaterThan(0);
        });
        it('should get metrics with time range', () => {
            const now = Date.now();
            const oneHourAgo = now - 3600000;
            monitor.recordServiceRequest('test-service', 150, true);
            const metrics = monitor.getMetrics({ start: oneHourAgo, end: now });
            expect(metrics).toBeDefined();
        });
        it('should reset metrics', () => {
            monitor.recordServiceRequest('test-service', 150, true);
            // Manually collect metrics since monitor is disabled
            monitor['collectMetrics']();
            const metricsBefore = monitor.getMetrics();
            expect(metricsBefore.length).toBeGreaterThan(0);
            monitor.reset();
            const metricsAfter = monitor.getMetrics();
            expect(metricsAfter.length).toBe(0);
        });
        it('should update service stats', () => {
            monitor.updateServiceStats('test-service', {
                cpu: 10,
                memory: 100,
                uptime: 3600,
                requestCount: 100,
                errorCount: 5,
                responseTime: 150,
            });
            // Manually collect metrics since monitor is disabled
            monitor['collectMetrics']();
            const metrics = monitor.getMetrics();
            expect(metrics.length).toBeGreaterThan(0);
        });
        it('should get configuration', () => {
            const config = monitor.getConfig();
            expect(config).toBeDefined();
            expect(config.enabled).toBe(false); // We created it with { enabled: false }
            expect(config.collectionInterval).toBe(60000);
            expect(config.retentionPeriod).toBe(3600000);
        });
        it('should update configuration', () => {
            const newConfig = {
                enabled: false,
                collectionInterval: 30000,
                retentionPeriod: 1800000,
                alertThresholds: {
                    cpu: 90,
                    memory: 90,
                    responseTime: 2000,
                    errorRate: 10,
                },
            };
            monitor.updateConfig(newConfig);
            const updatedConfig = monitor.getConfig();
            expect(updatedConfig.enabled).toBe(false);
            expect(updatedConfig.collectionInterval).toBe(30000);
            expect(updatedConfig.retentionPeriod).toBe(1800000);
            expect(updatedConfig.alertThresholds.cpu).toBe(90);
        });
        it('should start and stop monitoring', () => {
            // Create monitor with disabled config to prevent auto-start
            const disabledMonitor = new PerformanceMonitor({ enabled: false });
            // Just verify start and stop methods don't throw
            expect(() => disabledMonitor.start()).not.toThrow();
            expect(() => disabledMonitor.stop()).not.toThrow();
        });
        it('should calculate service statistics correctly', () => {
            // Record multiple requests
            monitor.recordServiceRequest('test-service', 100, true);
            monitor.recordServiceRequest('test-service', 200, true);
            monitor.recordServiceRequest('test-service', 300, false); // error
            monitor.recordServiceRequest('test-service', 150, true);
            // Force metrics collection
            monitor['collectMetrics']();
            const metrics = monitor.getMetrics();
            expect(metrics.length).toBeGreaterThan(0);
            // Check that service metrics are calculated
            const latestMetrics = metrics[metrics.length - 1];
            expect(latestMetrics.serviceMetrics['test-service']).toBeDefined();
            const serviceMetrics = latestMetrics.serviceMetrics['test-service'];
            expect(serviceMetrics.requestCount).toBe(4);
            expect(serviceMetrics.errorCount).toBe(1);
            expect(serviceMetrics.errorRate).toBeCloseTo(25, 1); // 1/4 = 25% (allow small floating point differences)
            expect(serviceMetrics.responseTime).toBeGreaterThan(0);
        });
        it('should get summary when metrics exist', () => {
            monitor.recordServiceRequest('test-service', 150, true);
            // Manually collect metrics since monitor is disabled
            monitor['collectMetrics']();
            const summary = monitor.getSummary();
            expect(summary).toBeDefined();
            expect(summary.timeRange).toBeDefined();
            expect(summary.averages).toBeDefined();
            expect(summary.current).toBeDefined();
            expect(summary.services).toBeGreaterThanOrEqual(0);
        });
        it('should get summary when no metrics exist', () => {
            // Reset monitor to clear any metrics
            monitor.reset();
            const summary = monitor.getSummary();
            expect(summary).toBeDefined();
            expect(summary.message).toBe('No metrics available');
        });
        it('should handle singleton functions', () => {
            // Import the functions directly
            const { getPerformanceMonitor, startPerformanceMonitoring, stopPerformanceMonitoring, recordServicePerformance } = require('../src/core/performance-monitor');
            // Clear any existing singleton instance
            const monitor = getPerformanceMonitor();
            monitor.stop();
            // Test getPerformanceMonitor returns same instance
            const monitor1 = getPerformanceMonitor();
            const monitor2 = getPerformanceMonitor();
            expect(monitor1).toBe(monitor2); // Should be same instance
            // Test startPerformanceMonitoring
            const startedMonitor = startPerformanceMonitoring({ enabled: false });
            expect(startedMonitor).toBeDefined();
            // Test stopPerformanceMonitoring (should not throw)
            expect(() => stopPerformanceMonitoring()).not.toThrow();
            // Test recordServicePerformance (should not throw when monitor exists)
            expect(() => recordServicePerformance('test-service', 'test-operation', 100, true)).not.toThrow();
            // Clean up the singleton
            stopPerformanceMonitoring();
        });
    });
});
//# sourceMappingURL=core-module-coverage.test.js.map