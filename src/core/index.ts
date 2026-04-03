/**
 * Core Module Exports
 * Provides unified interface for core functionality
 */

// Export configuration management
export { ConfigManager } from './config-manager';

// Export types
export type {
  RuntimeType,
  ServiceConfig,
  Config,
  AIConfig,
  DetectionResult,
  DockerConnectionConfig,
  RuntimeSpecificConfig
} from './types';

// Export constants
export {
  MCPILOT_HOME,
  CONFIG_PATH
} from './constants';

// Export error handling
export {
  MCPilotError,
  ErrorCode,
  ErrorSeverity,
  ErrorFactory,
  ErrorHandler,
  ConsoleErrorHandler,
  RetryErrorHandler,
  createError,
  wrapError,
  isMCPilotError,
  shouldRetry
} from './error-handler';

// Export AI error handling
export { AIError } from './error-ai';

// Export logger
export { logger } from './logger';

// Export performance monitor
export { PerformanceMonitor } from './performance-monitor';

// Export retry manager
export { RetryManager } from './retry-manager';
