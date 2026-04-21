/**
 * Generic Text Formatter
 * 
 * Formats plain text and generic data
 */

import { BaseFormatter } from './base-formatter';
import type { FormatContext } from '../types';

export class GenericTextFormatter extends BaseFormatter {
  id = 'generic-text-formatter';
  name = 'Generic Text Formatter';
  description = 'Formats plain text and generic data with basic formatting';
  priority = 100; // Low priority - fallback formatter
  
  supportedTypes = ['text/plain', 'text/html', 'text/markdown'];
  supportedTools?: RegExp[] = [];

  canFormat(data: any, context?: FormatContext): boolean {
    // This formatter can handle anything as a fallback
    return true;
  }

  getConfidence(data: any, context?: FormatContext): number {
    // Low confidence for generic formatter
    return 0.1;
  }

  format(data: any, context?: FormatContext): string {
    this.logActivity('Formatting generic data', { dataType: typeof data });
    
    if (data === null || data === undefined) {
      return 'No data available';
    }
    
    if (typeof data === 'string') {
      return this.formatString(data, context);
    }
    
    if (typeof data === 'object') {
      return this.formatObject(data, context);
    }
    
    if (typeof data === 'number' || typeof data === 'boolean') {
      return String(data);
    }
    
    return 'Unknown data type';
  }

  private formatString(text: string, context?: FormatContext): string {
    const maxLength = 500;
    
    if (text.length <= maxLength) {
      return text;
    }
    
    const truncated = text.substring(0, maxLength);
    return `${truncated}...\n\n*(Content truncated, ${text.length - maxLength} characters omitted)*`;
  }

  private formatObject(obj: any, context?: FormatContext): string {
    try {
      const jsonStr = JSON.stringify(obj, null, 2);
      
      if (jsonStr.length > 1000) {
        const summary = this.createObjectSummary(obj);
        return `${summary}\n\n**Full data (${jsonStr.length} characters):**\n\`\`\`json\n${jsonStr.substring(0, 500)}...\n\`\`\``;
      }
      
      return `\`\`\`json\n${jsonStr}\n\`\`\``;
    } catch {
      return String(obj);
    }
  }

  private createObjectSummary(obj: any): string {
    if (!obj || typeof obj !== 'object') {
      return 'Empty object';
    }
    
    const isArray = Array.isArray(obj);
    const keys = Object.keys(obj);
    
    let summary = `**${isArray ? 'Array' : 'Object'} Summary**\n\n`;
    
    if (isArray) {
      summary += `• Length: ${obj.length} items\n`;
      
      if (obj.length > 0) {
        const sample = obj.slice(0, 3);
        summary += `• Sample items: ${sample.map(item => 
          typeof item === 'object' ? '{...}' : String(item)
        ).join(', ')}`;
        
        if (obj.length > 3) {
          summary += `, ...`;
        }
        summary += '\n';
      }
    } else {
      summary += `• Properties: ${keys.length}\n`;
      
      if (keys.length > 0) {
        const sampleKeys = keys.slice(0, 5);
        summary += `• Key sample: ${sampleKeys.join(', ')}`;
        
        if (keys.length > 5) {
          summary += `, ...`;
        }
        summary += '\n';
      }
    }
    
    return summary;
  }
}

export default GenericTextFormatter;