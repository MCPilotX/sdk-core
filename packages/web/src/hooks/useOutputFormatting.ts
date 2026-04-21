/**
 * Output Formatting Hook
 * 
 * React hook for using the output formatting system
 */

import { useCallback, useEffect, useState } from 'react';
import { 
  outputFormattingService, 
  formatExecutionResult
} from '../services/output-formatting';
import type { FormattingResult } from '../services/output-formatting/types';
import { DataType } from '../services/output-formatting/types';

interface UseOutputFormattingOptions {
  /** Enable debug logging */
  debug?: boolean;
  
  /** Auto-initialize the service */
  autoInitialize?: boolean;
  
  /** Default formatting options */
  defaultOptions?: {
    detailLevel?: 'minimal' | 'standard' | 'detailed';
    language?: string;
  };
}

interface UseOutputFormattingReturn {
  /** Format execution result */
  formatExecutionResult: (executionResult: any, userQuery?: string) => string;
  
  /** Format raw data */
  formatData: (data: any, context?: any) => string;
  
  /** Format with full metadata */
  formatWithMetadata: (data: any, context?: any) => FormattingResult;
  
  /** Service initialization status */
  isInitialized: boolean;
  
  /** Service instance */
  service: typeof outputFormattingService;
  
  /** Clear formatting cache */
  clearCache: () => void;
  
  /** Get service statistics */
  getStats: () => any;
}

/**
 * Hook for using the output formatting system
 */
export function useOutputFormatting(
  options: UseOutputFormattingOptions = {}
): UseOutputFormattingReturn {
  const {
    debug = false,
    autoInitialize = true,
    defaultOptions = {
      detailLevel: 'standard',
      language: 'en'
    }
  } = options;
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  
  // Initialize service
  useEffect(() => {
    if (!autoInitialize || isInitialized) {
      return;
    }
    
    const init = async () => {
      try {
        if (debug) {
          console.log('[useOutputFormatting] Initializing output formatting service...');
        }
        
        await outputFormattingService.initialize();
        setIsInitialized(true);
        
        if (debug) {
          console.log('[useOutputFormatting] Service initialized successfully');
        }
      } catch (error) {
        console.error('[useOutputFormatting] Failed to initialize service:', error);
        setInitializationError(error as Error);
      }
    };
    
    init();
  }, [autoInitialize, debug, isInitialized]);
  
  // Format execution result (convenience method)
  const formatExecutionResultCallback = useCallback((
    executionResult: any,
    userQuery?: string
  ): string => {
    if (!isInitialized && initializationError) {
      console.warn('[useOutputFormatting] Service not initialized, using fallback formatting');
      return fallbackFormatExecutionResult(executionResult);
    }
    
    try {
      return formatExecutionResult(executionResult, userQuery);
    } catch (error) {
      console.error('[useOutputFormatting] Formatting failed:', error);
      return fallbackFormatExecutionResult(executionResult);
    }
  }, [isInitialized, initializationError]);
  
  // Format raw data
  const formatData = useCallback((
    data: any,
    context?: any
  ): string => {
    if (!isInitialized && initializationError) {
      console.warn('[useOutputFormatting] Service not initialized, using fallback formatting');
      return fallbackFormatData(data);
    }
    
    try {
      const formattingResult = outputFormattingService.format(data, {
        ...context,
        userPreferences: {
          ...defaultOptions,
          ...context?.userPreferences
        }
      });
      return formattingResult.output;
    } catch (error) {
      console.error('[useOutputFormatting] Formatting failed:', error);
      return fallbackFormatData(data);
    }
  }, [isInitialized, initializationError, defaultOptions]);
  
  // Format with full metadata
  const formatWithMetadata = useCallback((
    data: any,
    context?: any
  ): FormattingResult => {
    if (!isInitialized && initializationError) {
      console.warn('[useOutputFormatting] Service not initialized, using fallback formatting');
      return {
        output: fallbackFormatData(data),
        formatterId: 'fallback-formatter',
        dataType: DataType.UNKNOWN,
        confidence: 0,
        metrics: {
          formattingTime: 0,
          cacheHit: false
        },
        originalData: data,
        context
      };
    }
    
    try {
      return outputFormattingService.format(data, {
        ...context,
        userPreferences: {
          ...defaultOptions,
          ...context?.userPreferences
        }
      });
    } catch (error) {
      console.error('[useOutputFormatting] Formatting failed:', error);
      return {
        output: fallbackFormatData(data),
        formatterId: 'error-formatter',
        dataType: DataType.ERROR,
        confidence: 0,
        metrics: {
          formattingTime: 0,
          cacheHit: false
        },
        originalData: data,
        context
      };
    }
  }, [isInitialized, initializationError, defaultOptions]);
  
  // Clear cache
  const clearCache = useCallback(() => {
    outputFormattingService.clearCache();
    
    if (debug) {
      console.log('[useOutputFormatting] Cache cleared');
    }
  }, [debug]);
  
  // Get service statistics
  const getStats = useCallback(() => {
    return outputFormattingService.getStats();
  }, []);
  
  return {
    formatExecutionResult: formatExecutionResultCallback,
    formatData,
    formatWithMetadata,
    isInitialized,
    service: outputFormattingService,
    clearCache,
    getStats
  };
}

/**
 * Fallback formatting when service is not available
 */
function fallbackFormatExecutionResult(executionResult: any): string {
  if (!executionResult) {
    return 'Execution completed.';
  }
  
  const { workflowName, name, totalSteps, successfulSteps, failedSteps, results } = executionResult;
  const displayName = workflowName || name || 'Workflow';
  
  let formatted = `**${displayName} Execution Complete**\n\n`;
  
  if (totalSteps !== undefined) {
    formatted += `Steps: ${successfulSteps || 0}/${totalSteps} successful`;
    if (failedSteps) {
      formatted += `, ${failedSteps} failed`;
    }
    formatted += '\n\n';
  }
  
  if (results && Array.isArray(results)) {
    formatted += `**Step Results:**\n\n`;
    
    results.forEach((result: any, index: number) => {
      const stepName = result.toolName || result.stepId || `Step ${index + 1}`;
      const status = result.status || 'unknown';
      
      formatted += `${index + 1}. ${stepName} - ${status}\n`;
      
      if (result.message) {
        formatted += `   ${result.message}\n`;
      }
    });
  }
  
  return formatted;
}

/**
 * Fallback formatting for raw data
 */
function fallbackFormatData(data: any): string {
  if (data === null || data === undefined) {
    return 'No data available';
  }
  
  if (typeof data === 'string') {
    return data;
  }
  
  if (typeof data === 'object') {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
  
  return String(data);
}

export default useOutputFormatting;