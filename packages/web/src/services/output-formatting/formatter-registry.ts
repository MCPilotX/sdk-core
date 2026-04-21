/**
 * Formatter Registry
 * 
 * Central registry for managing output formatters with intelligent selection
 */

import type {
  OutputFormatter,
  FormatterSelection,
  FormatterRegistryConfig,
  FormatterRegistrationOptions,
  FormatContext
} from './types';
import { DataType } from './types';

interface CacheEntry {
  key: string;
  selection: FormatterSelection;
  timestamp: number;
}

export class FormatterRegistry {
  private formatters: Map<string, OutputFormatter> = new Map();
  private config: FormatterRegistryConfig;
  private selectionCache: Map<string, CacheEntry> = new Map();
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor(config?: Partial<FormatterRegistryConfig>) {
    this.config = {
      selectionStrategy: 'hybrid',
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      debug: false,
      defaultFormatterId: 'generic-text-formatter',
      fallbackChain: [
        'ticket-data-formatter',
        'table-data-formatter',
        'json-formatter',
        'generic-text-formatter'
      ],
      ...config
    };
  }

  /**
   * Register a formatter with the registry
   */
  register(formatter: OutputFormatter, options?: FormatterRegistrationOptions): void {
    const formatterId = formatter.id;
    const existingFormatter = this.formatters.get(formatterId);

    if (existingFormatter && !options?.replace) {
      throw new Error(`Formatter with ID "${formatterId}" already registered. Use replace option to override.`);
    }

    // Apply priority override if provided
    const formatterToRegister = {
      ...formatter,
      priority: options?.priority ?? formatter.priority ?? 100
    };

    this.formatters.set(formatterId, formatterToRegister);

    if (this.config.debug) {
      console.log(`[FormatterRegistry] Registered formatter: ${formatterId} (priority: ${formatterToRegister.priority})`);
    }

    // Clear cache when new formatter is registered
    this.clearCache();
  }

  /**
   * Unregister a formatter
   */
  unregister(formatterId: string): boolean {
    const removed = this.formatters.delete(formatterId);
    
    if (removed && this.config.debug) {
      console.log(`[FormatterRegistry] Unregistered formatter: ${formatterId}`);
    }
    
    // Clear cache when formatter is removed
    this.clearCache();
    
    return removed;
  }

  /**
   * Get all registered formatters
   */
  getAllFormatters(): OutputFormatter[] {
    return Array.from(this.formatters.values());
  }

  /**
   * Get formatter by ID
   */
  getFormatter(formatterId: string): OutputFormatter | undefined {
    return this.formatters.get(formatterId);
  }

  /**
   * Find the best formatter for given data and context
   */
  findBestFormatter(data: any, context?: FormatContext): FormatterSelection {
    const startTime = performance.now();
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(data, context);
    
    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.selectionCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.config.cacheTTL) {
        this.cacheHits++;
        if (this.config.debug) {
          console.log(`[FormatterRegistry] Cache hit for key: ${cacheKey.substring(0, 50)}...`);
        }
        return {
          ...cached.selection,
          reason: `Cached selection (confidence: ${cached.selection.confidence.toFixed(2)})`
        };
      }
      this.cacheMisses++;
    }

    // Get all formatters that can handle the data
    const candidates = this.getCandidateFormatters(data, context);
    
    if (candidates.length === 0) {
      // No formatter found, use default or fallback
      const defaultFormatter = this.getDefaultFormatter();
      const selection: FormatterSelection = {
        formatter: defaultFormatter,
        confidence: 0.1,
        reason: 'No suitable formatter found, using default'
      };
      
      this.cacheSelection(cacheKey, selection);
      return selection;
    }

    // Select best formatter based on strategy
    const selection = this.selectFormatter(candidates, data, context);
    
    // Cache the selection
    this.cacheSelection(cacheKey, selection);
    
    const endTime = performance.now();
    
    if (this.config.debug) {
      console.log(`[FormatterRegistry] Selected formatter: ${selection.formatter.id} ` +
                 `(confidence: ${selection.confidence.toFixed(2)}, ` +
                 `time: ${(endTime - startTime).toFixed(2)}ms)`);
    }
    
    return selection;
  }

  /**
   * Get candidate formatters that can handle the data
   */
  private getCandidateFormatters(data: any, context?: FormatContext): OutputFormatter[] {
    const candidates: Array<{ formatter: OutputFormatter; confidence: number }> = [];
    
    for (const formatter of this.formatters.values()) {
      try {
        if (formatter.canFormat(data, context)) {
          const confidence = formatter.getConfidence?.(data, context) ?? 0.5;
          candidates.push({ formatter, confidence });
        }
      } catch (error) {
        if (this.config.debug) {
          console.warn(`[FormatterRegistry] Formatter ${formatter.id} threw error in canFormat:`, error);
        }
      }
    }
    
    return candidates
      .sort((a, b) => b.confidence - a.confidence) // Sort by confidence descending
      .map(candidate => candidate.formatter);
  }

  /**
   * Select the best formatter from candidates
   */
  private selectFormatter(
    candidates: OutputFormatter[], 
    data: any, 
    context?: FormatContext
  ): FormatterSelection {
    if (candidates.length === 1) {
      const formatter = candidates[0];
      const confidence = formatter.getConfidence?.(data, context) ?? 0.7;
      return {
        formatter,
        confidence,
        reason: 'Only one candidate formatter'
      };
    }

    switch (this.config.selectionStrategy) {
      case 'priority-based':
        return this.selectByPriority(candidates, data, context);
        
      case 'confidence-based':
        return this.selectByConfidence(candidates, data, context);
        
      case 'hybrid':
      default:
        return this.selectByHybrid(candidates, data, context);
    }
  }

  /**
   * Select formatter by priority (lower number = higher priority)
   */
  private selectByPriority(
    candidates: OutputFormatter[], 
    data: any, 
    context?: FormatContext
  ): FormatterSelection {
    const sorted = candidates.sort((a, b) => {
      const priorityA = a.priority ?? 100;
      const priorityB = b.priority ?? 100;
      return priorityA - priorityB;
    });

    const selected = sorted[0];
    const confidence = selected.getConfidence?.(data, context) ?? 0.8;
    
    return {
      formatter: selected,
      confidence,
      reason: `Selected by priority (priority: ${selected.priority ?? 100})`
    };
  }

  /**
   * Select formatter by confidence score
   */
  private selectByConfidence(
    candidates: OutputFormatter[], 
    data: any, 
    context?: FormatContext
  ): FormatterSelection {
    const scoredCandidates = candidates.map(formatter => ({
      formatter,
      confidence: formatter.getConfidence?.(data, context) ?? 0.5
    }));

    const sorted = scoredCandidates.sort((a, b) => b.confidence - a.confidence);
    const selected = sorted[0];

    return {
      formatter: selected.formatter,
      confidence: selected.confidence,
      reason: `Selected by confidence (confidence: ${selected.confidence.toFixed(2)})`
    };
  }

  /**
   * Hybrid selection: combine priority and confidence
   */
  private selectByHybrid(
    candidates: OutputFormatter[], 
    data: any, 
    context?: FormatContext
  ): FormatterSelection {
    const scoredCandidates = candidates.map(formatter => {
      const priority = formatter.priority ?? 100;
      const confidence = formatter.getConfidence?.(data, context) ?? 0.5;
      
      // Normalize priority to 0-1 scale (lower priority = higher score)
      const priorityScore = 1 - (Math.min(priority, 200) / 200);
      
      // Combine scores (70% confidence, 30% priority)
      const combinedScore = (confidence * 0.7) + (priorityScore * 0.3);
      
      return {
        formatter,
        confidence,
        priority,
        combinedScore
      };
    });

    const sorted = scoredCandidates.sort((a, b) => b.combinedScore - a.combinedScore);
    const selected = sorted[0];

    return {
      formatter: selected.formatter,
      confidence: selected.confidence,
      reason: `Selected by hybrid score (confidence: ${selected.confidence.toFixed(2)}, ` +
             `priority: ${selected.priority}, combined: ${selected.combinedScore.toFixed(2)})`
    };
  }

  /**
   * Get default formatter (from config or generic one)
   */
  private getDefaultFormatter(): OutputFormatter {
    if (this.config.defaultFormatterId) {
      const defaultFormatter = this.formatters.get(this.config.defaultFormatterId);
      if (defaultFormatter) {
        return defaultFormatter;
      }
    }

    // Fallback to first available formatter or throw
    const firstFormatter = Array.from(this.formatters.values())[0];
    if (firstFormatter) {
      return firstFormatter;
    }

    throw new Error('No formatters registered and no default formatter available');
  }

  /**
   * Generate cache key for data and context
   */
  private generateCacheKey(data: any, context?: FormatContext): string {
    const dataPart = typeof data === 'string' 
      ? data.substring(0, 100) 
      : JSON.stringify(data).substring(0, 200);
    
    const contextPart = context 
      ? `${context.toolName || ''}:${context.serverName || ''}:${context.userQuery?.substring(0, 50) || ''}`
      : '';
    
    return `data:${dataPart}:context:${contextPart}`;
  }

  /**
   * Cache formatter selection
   */
  private cacheSelection(key: string, selection: FormatterSelection): void {
    if (!this.config.cacheEnabled) {
      return;
    }

    this.selectionCache.set(key, {
      key,
      selection,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.selectionCache.size > 1000) {
      const oldestKey = Array.from(this.selectionCache.keys())[0];
      this.selectionCache.delete(oldestKey);
    }
  }

  /**
   * Clear the selection cache
   */
  clearCache(): void {
    this.selectionCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    
    if (this.config.debug) {
      console.log('[FormatterRegistry] Cache cleared');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? this.cacheHits / total : 0;
    
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate,
      size: this.selectionCache.size
    };
  }

  /**
   * Detect data type for intelligent formatting
   */
  detectDataType(data: any): DataType {
    if (data === null || data === undefined) {
      return DataType.EMPTY;
    }

    if (typeof data === 'string') {
      // Check for table-like data
      if (data.includes('|') && data.split('\n').length > 3) {
        return DataType.TABLE;
      }
      
      // Check for JSON
      if ((data.trim().startsWith('{') && data.trim().endsWith('}')) ||
          (data.trim().startsWith('[') && data.trim().endsWith(']'))) {
        try {
          JSON.parse(data);
          return DataType.JSON;
        } catch {
          // Not valid JSON
        }
      }
      
      // Check for error messages
      if (data.toLowerCase().includes('error') || 
          data.toLowerCase().includes('failed') ||
          data.toLowerCase().includes('exception')) {
        return DataType.ERROR;
      }
      
      // Check for success messages
      if (data.toLowerCase().includes('success') || 
          data.toLowerCase().includes('completed')) {
        return DataType.SUCCESS;
      }
      
      return DataType.PLAIN_TEXT;
    }

    if (typeof data === 'object') {
      // Check for ticket data pattern
      if (this.isTicketData(data)) {
        return DataType.TICKET_DATA;
      }
      
      // Check for loading state
      if (data.loading || data.status === 'loading') {
        return DataType.LOADING;
      }
      
      // Check for error object
      if (data.error || data.status === 'error') {
        return DataType.ERROR;
      }
      
      // Check for success object
      if (data.success || data.status === 'success') {
        return DataType.SUCCESS;
      }
      
      // Default to JSON for objects
      return DataType.JSON;
    }

    return DataType.UNKNOWN;
  }

  /**
   * Check if data matches ticket data pattern
   */
  private isTicketData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Pattern 1: Has tickets array
    if (Array.isArray(data.tickets) && data.tickets.length > 0) {
      const firstTicket = data.tickets[0];
      return !!(firstTicket.trainNo || firstTicket.trainNumber || firstTicket.from || firstTicket.to);
    }

    // Pattern 2: Has data array with ticket-like objects
    if (Array.isArray(data.data) && data.data.length > 0) {
      const firstItem = data.data[0];
      return !!(firstItem.trainNo || firstItem.trainNumber || firstItem.from || firstItem.to);
    }

    // Pattern 3: Direct ticket object
    return !!(data.trainNo || data.trainNumber || data.from || data.to);
  }

  /**
   * Get registry configuration
   */
  getConfig(): FormatterRegistryConfig {
    return { ...this.config };
  }

  /**
   * Update registry configuration
   */
  updateConfig(newConfig: Partial<FormatterRegistryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.debug) {
      console.log('[FormatterRegistry] Configuration updated:', this.config);
    }
  }
}