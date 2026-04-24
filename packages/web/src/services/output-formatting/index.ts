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
