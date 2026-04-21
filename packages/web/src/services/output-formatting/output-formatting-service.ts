/**
 * Output Formatting Service
 * 
 * Main service for formatting execution results with intelligent formatter selection
 */

import type {
  FormattingResult,
  FormatContext,
  OutputFormatter,
  FormatterSelection,
  VisualRenderingMetadata
} from './types';
import { DataType, RenderingType } from './types';
import { FormatterRegistry } from './formatter-registry';

export class OutputFormattingService {
  private registry: FormatterRegistry;
  private isInitialized: boolean = false;
  private defaultFormattersRegistered: boolean = false;

  constructor(registry?: FormatterRegistry) {
    this.registry = registry || new FormatterRegistry();
  }

  /**
   * Initialize the service with default formatters
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Register default formatters
      await this.registerDefaultFormatters();
      
      this.isInitialized = true;
      
      if (this.registry.getConfig().debug) {
        console.log('[OutputFormattingService] Initialized with', 
                   this.registry.getAllFormatters().length, 'formatters');
      }
    } catch (error) {
      console.error('[OutputFormattingService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Format data using the best matching formatter
   */
  format(data: any, context?: FormatContext): FormattingResult {
    const startTime = performance.now();
    
    // Ensure service is initialized
    if (!this.isInitialized) {
      console.warn('[OutputFormattingService] Service not initialized, initializing synchronously');
      this.initialize().catch(console.error);
    }

    // Detect data type
    const dataType = this.registry.detectDataType(data);
    
    // Find best formatter
    const selection = this.registry.findBestFormatter(data, context);
    
    // Check if formatter is valid
    if (!selection.formatter || typeof selection.formatter.format !== 'function') {
      console.error('[OutputFormattingService] Invalid formatter selected:', selection);
      return this.fallbackResult(data, context);
    }
    
    // Format the data
    let formattedOutput: string;
    let visualRendering: VisualRenderingMetadata | undefined;
    
    try {
      formattedOutput = selection.formatter.format(data, context);
      
      // Check if formatter provides visual rendering metadata
      // This would require formatters to return both text and metadata
      // For now, we'll handle it in a separate method
    } catch (formatError) {
      console.error(`[OutputFormattingService] Formatter ${selection.formatter.id} failed:`, formatError);
      
      // Fallback to generic formatting
      formattedOutput = this.fallbackFormat(data, context);
      selection.confidence = 0.1;
      selection.reason = `Formatter failed: ${formatError instanceof Error ? formatError.message : 'Unknown error'}`;
    }
    
    const endTime = performance.now();
    
    // Build result
    const result: FormattingResult = {
      output: formattedOutput,
      formatterId: selection.formatter.id,
      dataType,
      confidence: selection.confidence,
      metrics: {
        formattingTime: endTime - startTime,
        cacheHit: selection.reason?.includes('Cached selection') || false
      },
      originalData: data,
      context
    };
    
    // Add visual rendering metadata for complex JSON data
    if (dataType === DataType.JSON && this.shouldUseVisualRendering(data, context)) {
      result.visualRendering = this.createVisualRenderingMetadata(data, context);
    }
    
    // Log debug info if enabled
    if (this.registry.getConfig().debug) {
      console.log(`[OutputFormattingService] Formatted ${dataType} data with ${selection.formatter.id} ` +
                 `(confidence: ${selection.confidence.toFixed(2)}, time: ${result.metrics.formattingTime.toFixed(2)}ms)`);
    }
    
    return result;
  }

  /**
   * Format execution result (convenience method)
   */
  formatExecutionResult(executionResult: any, userQuery?: string): FormattingResult {
    const context: FormatContext = {
      userQuery,
      toolName: executionResult.toolName,
      serverName: executionResult.serverName,
      executionResult,
      userPreferences: {
        detailLevel: 'standard',
        language: 'en',
        format: 'markdown'
      }
    };
    
    // Extract the actual output data from execution result
    const data = executionResult.output || executionResult.data || executionResult;
    
    return this.format(data, context);
  }

  /**
   * Batch format multiple data items
   */
  batchFormat(
    items: Array<{ data: any; context?: FormatContext }>,
    parallel: boolean = true
  ): FormattingResult[] {
    if (parallel) {
      return items.map(item => this.format(item.data, item.context));
    } else {
      const results: FormattingResult[] = [];
      for (const item of items) {
        results.push(this.format(item.data, item.context));
      }
      return results;
    }
  }

  /**
   * Get formatter registry (for advanced usage)
   */
  getRegistry(): FormatterRegistry {
    return this.registry;
  }

  /**
   * Register a custom formatter
   */
  registerFormatter(formatter: OutputFormatter, priority?: number): void {
    this.registry.register(formatter, { priority });
  }

  /**
   * Unregister a formatter
   */
  unregisterFormatter(formatterId: string): boolean {
    return this.registry.unregister(formatterId);
  }

  /**
   * Get all registered formatters
   */
  getFormatters(): OutputFormatter[] {
    return this.registry.getAllFormatters();
  }

  /**
   * Get service statistics
   */
  getStats(): {
    formatterCount: number;
    cacheStats: { hits: number; misses: number; hitRate: number; size: number };
    dataTypeDistribution: Record<DataType, number>;
  } {
    const cacheStats = this.registry.getCacheStats();
    
    // Calculate data type distribution (placeholder - would need tracking)
    const dataTypeDistribution: Record<DataType, number> = {
      [DataType.PLAIN_TEXT]: 0,
      [DataType.JSON]: 0,
      [DataType.TABLE]: 0,
      [DataType.TICKET_DATA]: 0,
      [DataType.ERROR]: 0,
      [DataType.SUCCESS]: 0,
      [DataType.LOADING]: 0,
      [DataType.EMPTY]: 0,
      [DataType.COMPOSITE]: 0,
      [DataType.UNKNOWN]: 0
    };
    
    return {
      formatterCount: this.registry.getAllFormatters().length,
      cacheStats,
      dataTypeDistribution
    };
  }

  /**
   * Clear cache and reset statistics
   */
  clearCache(): void {
    this.registry.clearCache();
  }

  /**
   * Check if data should use visual rendering
   */
  private shouldUseVisualRendering(data: any, context?: FormatContext): boolean {
    // Check if data is complex enough for visual rendering
    if (!data || typeof data !== 'object') {
      return false;
    }
    
    const jsonString = JSON.stringify(data);
    
    // Size threshold
    if (jsonString.length < 100) {
      return false; // Too small, text is fine
    }
    
    if (jsonString.length > 5000) {
      return true; // Too large, visual rendering is better
    }
    
    // Check user preferences
    const userPreferences = context?.userPreferences;
    if (userPreferences?.format === 'html') {
      return true;
    }
    
    if (userPreferences?.detailLevel === 'minimal') {
      return false; // Minimal detail prefers text
    }
    
    // Check if data has nested structures that benefit from visual rendering
    const hasNestedObjects = this.hasNestedStructures(data);
    if (hasNestedObjects) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if data has nested structures
   */
  private hasNestedStructures(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }
    
    if (Array.isArray(data)) {
      if (data.length > 10) {
        return true;
      }
      return data.some(item => typeof item === 'object');
    } else {
      const values = Object.values(data);
      if (values.length > 10) {
        return true;
      }
      return values.some(value => typeof value === 'object');
    }
  }

  /**
   * Create visual rendering metadata
   */
  private createVisualRenderingMetadata(data: any, context?: FormatContext): VisualRenderingMetadata {
    // Parse data if it's a string
    let parsedData = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = { _raw: data };
      }
    }
    
    return {
      renderingType: RenderingType.JSON_VISUAL,
      rawData: parsedData,
      options: {
        showControls: true,
        maxHeight: '400px',
        title: this.getVisualRenderingTitle(context)
      },
      componentName: 'JsonRenderer'
    };
  }

  /**
   * Get title for visual rendering
   */
  private getVisualRenderingTitle(context?: FormatContext): string | undefined {
    const toolName = context?.toolName;
    const userQuery = context?.userQuery;
    
    if (toolName) {
      return `Results from ${toolName}`;
    }
    
    if (userQuery) {
      return `Results for: ${userQuery.substring(0, 50)}${userQuery.length > 50 ? '...' : ''}`;
    }
    
    return 'JSON Data';
  }

  /**
   * Fallback formatting when no formatter works
   */
  private fallbackFormat(data: any, context?: FormatContext): string {
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

  /**
   * Create a fallback formatting result
   */
  private fallbackResult(data: any, context?: FormatContext): FormattingResult {
    const output = this.fallbackFormat(data, context);
    
    return {
      output,
      formatterId: 'fallback-formatter',
      dataType: DataType.UNKNOWN,
      confidence: 0.1,
      metrics: {
        formattingTime: 0,
        cacheHit: false
      },
      originalData: data,
      context
    };
  }

  /**
   * Register default formatters
   */
  private async registerDefaultFormatters(): Promise<void> {
    if (this.defaultFormattersRegistered) {
      return;
    }

    // Import formatters dynamically to avoid circular dependencies
    const formatterModules = [
      import('./formatters/generic-text-formatter'),
      import('./formatters/json-formatter'),
      import('./formatters/json-visual-formatter'),
      import('./formatters/table-formatter'),
      import('./formatters/ticket-data-formatter'),
      import('./formatters/error-formatter'),
      import('./formatters/success-formatter')
    ];

    try {
      const modules = await Promise.all(formatterModules);
      
      for (const module of modules) {
        if (module.default) {
          const formatter = new module.default();
          this.registry.register(formatter);
        }
      }
      
      this.defaultFormattersRegistered = true;
      
      if (this.registry.getConfig().debug) {
        console.log('[OutputFormattingService] Registered default formatters');
      }
    } catch (error) {
      console.warn('[OutputFormattingService] Failed to load some formatters:', error);
      // Continue with available formatters
    }
  }

  /**
   * Create a singleton instance (optional)
   */
  private static instance: OutputFormattingService;
  
  static getInstance(): OutputFormattingService {
    if (!OutputFormattingService.instance) {
      OutputFormattingService.instance = new OutputFormattingService();
      // Initialize asynchronously
      OutputFormattingService.instance.initialize().catch(console.error);
    }
    return OutputFormattingService.instance;
  }
  
  static async getInitializedInstance(): Promise<OutputFormattingService> {
    const instance = OutputFormattingService.getInstance();
    await instance.initialize();
    return instance;
  }
}