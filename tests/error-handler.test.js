import { describe, it, expect } from '@jest/globals';
import { ErrorCode, ErrorSeverity, IntentOrchError, MCPilotError, createError, wrapError, isMCPilotError, shouldRetry } from '../src/core/error-handler';
describe('Error Handler', () => {
    describe('ErrorCode enum', () => {
        it('should contain configuration error codes', () => {
            expect(ErrorCode.CONFIG_INVALID).toBe('CONFIG_001');
            expect(ErrorCode.CONFIG_MISSING).toBe('CONFIG_002');
            expect(ErrorCode.CONFIG_VALIDATION_FAILED).toBe('CONFIG_003');
        });
        it('should contain service error codes', () => {
            expect(ErrorCode.SERVICE_NOT_FOUND).toBe('SERVICE_001');
            expect(ErrorCode.SERVICE_ALREADY_EXISTS).toBe('SERVICE_002');
            expect(ErrorCode.SERVICE_START_FAILED).toBe('SERVICE_003');
        });
        it('should contain runtime error codes', () => {
            expect(ErrorCode.RUNTIME_DETECTION_FAILED).toBe('RUNTIME_001');
            expect(ErrorCode.RUNTIME_NOT_SUPPORTED).toBe('RUNTIME_002');
            expect(ErrorCode.RUNTIME_NOT_INSTALLED).toBe('RUNTIME_003');
        });
        it('should contain process error codes', () => {
            expect(ErrorCode.PROCESS_NOT_FOUND).toBe('PROCESS_001');
            expect(ErrorCode.PROCESS_START_FAILED).toBe('PROCESS_002');
            expect(ErrorCode.PROCESS_TIMEOUT).toBe('PROCESS_004');
        });
    });
    describe('ErrorSeverity enum', () => {
        it('should contain all severity levels', () => {
            expect(ErrorSeverity.LOW).toBe('low');
            expect(ErrorSeverity.MEDIUM).toBe('medium');
            expect(ErrorSeverity.HIGH).toBe('high');
            expect(ErrorSeverity.CRITICAL).toBe('critical');
        });
    });
    describe('IntentOrchError', () => {
        it('should create error with basic properties', () => {
            const error = new IntentOrchError(ErrorCode.CONFIG_INVALID, 'Invalid configuration', ErrorSeverity.MEDIUM, { configFile: 'test.json' }, [{ title: 'Fix config', description: 'Check file format', steps: ['Step 1', 'Step 2'] }]);
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(IntentOrchError);
            expect(error.code).toBe(ErrorCode.CONFIG_INVALID);
            expect(error.message).toBe('Invalid configuration');
            expect(error.severity).toBe(ErrorSeverity.MEDIUM);
            expect(error.context.configFile).toBe('test.json');
            expect(error.context.timestamp).toBeInstanceOf(Date);
            expect(error.suggestions).toHaveLength(1);
            expect(error.suggestions[0].title).toBe('Fix config');
            expect(error.suggestions[0].description).toBe('Check file format');
            expect(error.name).toBe('IntentOrchError');
        });
        it('should create error with default severity', () => {
            const error = new IntentOrchError(ErrorCode.CONFIG_INVALID, 'Invalid configuration');
            expect(error.severity).toBe(ErrorSeverity.MEDIUM);
            expect(error.context.timestamp).toBeInstanceOf(Date);
            expect(error.suggestions).toEqual([]);
        });
        it('should include stack trace', () => {
            const error = new IntentOrchError(ErrorCode.CONFIG_INVALID, 'Invalid configuration');
            expect(error.stack).toBeDefined();
            expect(error.stack).toContain('IntentOrchError: Invalid configuration');
        });
    });
    describe('MCPilotError', () => {
        it('should extend IntentOrchError', () => {
            const error = new MCPilotError(ErrorCode.CONFIG_INVALID, 'Invalid configuration', ErrorSeverity.MEDIUM, { configFile: 'test.json' }, [{ title: 'Fix config', description: 'Check file format', steps: ['Step 1'] }], new Error('Original error'));
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(IntentOrchError);
            expect(error).toBeInstanceOf(MCPilotError);
            expect(error.code).toBe(ErrorCode.CONFIG_INVALID);
            expect(error.message).toBe('Invalid configuration');
            expect(error.name).toBe('MCPilotError');
            expect(error.cause).toBeInstanceOf(Error);
            expect(error.cause.message).toBe('Original error');
        });
        it('should create error without cause', () => {
            const error = new MCPilotError(ErrorCode.CONFIG_INVALID, 'Invalid configuration');
            expect(error.cause).toBeUndefined();
        });
    });
    describe('createError', () => {
        it('should create MCPilotError with correct properties', () => {
            const error = createError(ErrorCode.CONFIG_INVALID, 'Invalid configuration', ErrorSeverity.HIGH, { configFile: 'test.json' });
            expect(error).toBeInstanceOf(MCPilotError);
            expect(error.code).toBe(ErrorCode.CONFIG_INVALID);
            expect(error.message).toBe('Invalid configuration');
            expect(error.severity).toBe(ErrorSeverity.HIGH);
            expect(error.context.configFile).toBe('test.json');
            expect(error.context.timestamp).toBeInstanceOf(Date);
        });
        it('should create error with default severity', () => {
            const error = createError(ErrorCode.CONFIG_INVALID, 'Invalid configuration');
            expect(error.severity).toBe(ErrorSeverity.MEDIUM);
        });
    });
    describe('wrapError', () => {
        it('should wrap generic Error into MCPilotError', () => {
            const originalError = new Error('Original error message');
            const wrappedError = wrapError(originalError, ErrorCode.UNEXPECTED_ERROR, { operation: 'test' });
            expect(wrappedError).toBeInstanceOf(MCPilotError);
            expect(wrappedError.code).toBe(ErrorCode.UNEXPECTED_ERROR);
            expect(wrappedError.message).toBe('Original error message');
            expect(wrappedError.severity).toBe(ErrorSeverity.HIGH);
            expect(wrappedError.context.operation).toBe('test');
            expect(wrappedError.context.timestamp).toBeInstanceOf(Date);
            expect(wrappedError.cause).toBe(originalError);
        });
        it('should wrap with default error code', () => {
            const originalError = new Error('Original error');
            const wrappedError = wrapError(originalError);
            expect(wrappedError.code).toBe(ErrorCode.UNEXPECTED_ERROR);
        });
    });
    describe('isMCPilotError', () => {
        it('should return true for MCPilotError instances', () => {
            const error = new MCPilotError(ErrorCode.CONFIG_INVALID, 'Invalid configuration');
            expect(isMCPilotError(error)).toBe(true);
        });
        it('should return false for IntentOrchError instances', () => {
            const error = new IntentOrchError(ErrorCode.CONFIG_INVALID, 'Invalid configuration');
            expect(isMCPilotError(error)).toBe(false);
        });
        it('should return false for generic Error instances', () => {
            const error = new Error('Generic error');
            expect(isMCPilotError(error)).toBe(false);
        });
        it('should return false for non-error values', () => {
            expect(isMCPilotError(null)).toBe(false);
            expect(isMCPilotError(undefined)).toBe(false);
            expect(isMCPilotError('string')).toBe(false);
            expect(isMCPilotError(123)).toBe(false);
            expect(isMCPilotError({})).toBe(false);
        });
    });
    describe('shouldRetry', () => {
        it('should return true for retryable errors', () => {
            const error = new MCPilotError(ErrorCode.NETWORK_ERROR, 'Network error', ErrorSeverity.MEDIUM);
            expect(shouldRetry(error)).toBe(true);
        });
        it('should return false for non-retryable errors', () => {
            const error = new MCPilotError(ErrorCode.CONFIG_INVALID, 'Invalid configuration', ErrorSeverity.HIGH);
            expect(shouldRetry(error)).toBe(false);
        });
        it('should return false for generic errors', () => {
            const error = new Error('Generic error');
            expect(shouldRetry(error)).toBe(false);
        });
    });
    describe('ErrorContext interface', () => {
        it('should allow any key-value pairs', () => {
            const context = {
                configFile: 'test.json',
                lineNumber: 42,
                operation: 'parse',
                nested: {
                    key: 'value'
                }
            };
            expect(context.configFile).toBe('test.json');
            expect(context.lineNumber).toBe(42);
            expect(context.operation).toBe('parse');
            expect(context.nested).toEqual({ key: 'value' });
        });
    });
    describe('ErrorSuggestion interface', () => {
        it('should have correct structure', () => {
            const suggestion = {
                title: 'Fix configuration',
                description: 'Check the config file format',
                steps: ['Step 1: Open config file', 'Step 2: Validate JSON'],
                codeExample: '{"provider": "openai"}',
                documentationUrl: 'https://docs.example.com'
            };
            expect(suggestion.title).toBe('Fix configuration');
            expect(suggestion.description).toBe('Check the config file format');
            expect(suggestion.steps).toEqual(['Step 1: Open config file', 'Step 2: Validate JSON']);
            expect(suggestion.codeExample).toBe('{"provider": "openai"}');
            expect(suggestion.documentationUrl).toBe('https://docs.example.com');
        });
        it('should allow optional properties', () => {
            const suggestion = {
                title: 'Fix configuration',
                description: 'Check the config file format',
                steps: ['Step 1']
            };
            expect(suggestion.codeExample).toBeUndefined();
            expect(suggestion.documentationUrl).toBeUndefined();
        });
    });
});
//# sourceMappingURL=error-handler.test.js.map