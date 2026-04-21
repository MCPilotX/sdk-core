/**
 * Output Formatting System - Main Entry Point
 * 
 * A plugin-based, extensible output formatting architecture
 */

export * from './types';
export * from './formatter-registry';
export * from './output-formatting-service';

// Export default singleton instance
import { OutputFormattingService } from './output-formatting-service';
export const outputFormattingService = OutputFormattingService.getInstance();

// Re-export formatters for convenience
export { default as TicketDataFormatter } from './formatters/ticket-data-formatter';
export { BaseFormatter } from './formatters/base-formatter';

/**
 * Initialize the output formatting system
 * Call this early in your application startup
 */
export async function initializeOutputFormatting(): Promise<void> {
  try {
    await outputFormattingService.initialize();
    console.log('[OutputFormatting] System initialized successfully');
  } catch (error) {
    console.error('[OutputFormatting] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Format execution result using the new system
 * This is the main function to use for formatting
 */
export function formatExecutionResult(
  executionResult: any,
  userQuery?: string
): string {
  const formattingResult = outputFormattingService.formatExecutionResult(
    executionResult,
    userQuery
  );
  return formattingResult.output;
}

/**
 * Legacy compatibility function
 * Maintains the same API as the old formatExecutionResult
 */
export function legacyCompatibleFormatExecutionResult(
  executionResult: any
): string {
  // Extract user query from execution result if available
  const userQuery = executionResult.userQuery || 
                   executionResult.context?.userQuery;
  
  return formatExecutionResult(executionResult, userQuery);
}