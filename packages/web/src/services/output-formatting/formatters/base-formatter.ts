/**
 * Base Formatter Abstract Class
 * 
 * Provides common functionality for all formatters
 */

import type { OutputFormatter, FormatContext } from '../types';

export abstract class BaseFormatter implements OutputFormatter {
  abstract id: string;
  abstract name: string;
  abstract description?: string;
  abstract priority?: number;
  abstract supportedTypes?: string[];
  abstract supportedTools?: RegExp[];

  /**
   * Check if this formatter can handle the given data
   */
  abstract canFormat(data: any, context?: FormatContext): boolean;

  /**
   * Format the data into a user-friendly string
   */
  abstract format(data: any, context?: FormatContext): string;

  /**
   * Get confidence score for the match (0-1)
   * Override in subclasses for better matching
   */
  getConfidence(data: any, context?: FormatContext): number {
    // Base implementation returns 0.5
    // Subclasses should override with more specific logic
    return 0.5;
  }

  /**
   * Check if tool name matches supported patterns
   */
  protected matchesToolPattern(toolName?: string): boolean {
    if (!toolName || !this.supportedTools || this.supportedTools.length === 0) {
      return false;
    }

    return this.supportedTools.some(pattern => pattern.test(toolName));
  }

  /**
   * Check if data type matches supported types
   */
  protected matchesDataType(data: any, context?: FormatContext): boolean {
    if (!this.supportedTypes || this.supportedTypes.length === 0) {
      return true; // No type restriction
    }

    // Simple type detection
    const type = typeof data;
    if (type === 'string' && this.supportedTypes.includes('text/plain')) {
      return true;
    }
    
    if (type === 'object' && this.supportedTypes.includes('application/json')) {
      return true;
    }

    return false;
  }

  /**
   * Extract tool name from context
   */
  protected getToolName(context?: FormatContext): string | undefined {
    return context?.toolName || context?.executionResult?.toolName;
  }

  /**
   * Extract server name from context
   */
  protected getServerName(context?: FormatContext): string | undefined {
    return context?.serverName || context?.executionResult?.serverName;
  }

  /**
   * Extract user query from context
   */
  protected getUserQuery(context?: FormatContext): string | undefined {
    return context?.userQuery;
  }

  /**
   * Safe string truncation
   */
  protected truncate(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format timestamp to readable string
   */
  protected formatTimestamp(timestamp?: string | number | Date): string {
    if (!timestamp) {
      return 'Unknown time';
    }

    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(timestamp);
    }
  }

  /**
   * Format duration in milliseconds to readable string
   */
  protected formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Escape markdown special characters
   */
  protected escapeMarkdown(text: string): string {
    return text.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
  }

  /**
   * Create a markdown table from array of objects
   */
  protected createMarkdownTable(
    data: Record<string, any>[],
    columns?: string[]
  ): string {
    if (!data || data.length === 0) {
      return 'No data available';
    }

    // Determine columns if not provided
    const actualColumns = columns || Object.keys(data[0]);
    
    // Create header
    let table = `| ${actualColumns.join(' | ')} |\n`;
    table += `| ${actualColumns.map(() => '---').join(' | ')} |\n`;
    
    // Create rows
    for (const row of data) {
      const cells = actualColumns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) {
          return '';
        }
        return String(value).replace(/\n/g, ' ').substring(0, 50);
      });
      table += `| ${cells.join(' | ')} |\n`;
    }
    
    return table;
  }

  /**
   * Create a bullet list from array
   */
  protected createBulletList(items: any[], maxItems: number = 10): string {
    if (!items || items.length === 0) {
      return '• No items';
    }

    const displayItems = items.slice(0, maxItems);
    let list = '';
    
    for (const item of displayItems) {
      list += `• ${String(item).substring(0, 100)}\n`;
    }
    
    if (items.length > maxItems) {
      list += `• ... and ${items.length - maxItems} more items\n`;
    }
    
    return list;
  }

  /**
   * Log formatting activity (for debugging)
   */
  protected logActivity(message: string, data?: any): void {
    // Only log in debug mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.id}] ${message}`, data || '');
    }
  }
}