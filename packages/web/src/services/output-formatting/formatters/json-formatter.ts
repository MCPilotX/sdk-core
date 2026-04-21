/**
 * JSON Formatter
 * 
 * Formats JSON data with pretty printing and syntax highlighting
 */

import { BaseFormatter } from './base-formatter';
import type { FormatContext } from '../types';

export class JSONFormatter extends BaseFormatter {
  id = 'json-formatter';
  name = 'JSON Formatter';
  description = 'Formats JSON data with pretty printing and syntax highlighting';
  priority = 50; // Medium priority
  
  supportedTypes = ['application/json'];
  supportedTools?: RegExp[] = [];

  canFormat(data: any, context?: FormatContext): boolean {
    if (!data) {
      return false;
    }
    
    // Check if data is already a string that looks like JSON
    if (typeof data === 'string') {
      try {
        JSON.parse(data);
        return true;
      } catch {
        return false;
      }
    }
    
    // Check if data is an object (including arrays)
    if (typeof data === 'object') {
      return true;
    }
    
    return false;
  }

  getConfidence(data: any, context?: FormatContext): number {
    let confidence = 0.3;
    
    // Boost confidence for valid JSON strings
    if (typeof data === 'string') {
      try {
        JSON.parse(data);
        confidence += 0.4;
      } catch {
        // Not valid JSON
      }
    }
    
    // Boost confidence for objects
    if (typeof data === 'object' && data !== null) {
      confidence += 0.3;
    }
    
    // Boost confidence if tool output is likely JSON
    const toolName = this.getToolName(context);
    if (toolName && /(api|json|data|result)/i.test(toolName)) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  format(data: any, context?: FormatContext): string {
    this.logActivity('Formatting JSON data', { dataType: typeof data });
    
    let parsedData: any;
    
    // Parse if data is a string
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch (error) {
        return `**Invalid JSON Data**\n\n\`\`\`\n${data.substring(0, 500)}${data.length > 500 ? '...' : ''}\n\`\`\``;
      }
    } else {
      parsedData = data;
    }
    
    // Format based on data size and complexity
    return this.formatJsonData(parsedData, context);
  }

  private formatJsonData(data: any, context?: FormatContext): string {
    const jsonString = JSON.stringify(data, null, 2);
    const dataSize = jsonString.length;
    
    // For small JSON (under 2000 chars), show full pretty JSON
    if (dataSize < 2000) {
      return `\`\`\`json\n${jsonString}\n\`\`\``;
    }
    
    // For medium JSON (2000-10000 chars), show summary and truncated JSON
    if (dataSize < 10000) {
      const summary = this.createJsonSummary(data);
      const truncatedJson = jsonString.substring(0, 1000);
      
      return `${summary}\n\n**Full JSON (${dataSize} characters):**\n\`\`\`json\n${truncatedJson}...\n\`\`\``;
    }
    
    // For large JSON (10000+ chars), show detailed summary only
    const summary = this.createJsonSummary(data);
    return `${summary}\n\n**JSON data is too large to display (${dataSize} characters).**`;
  }

  private createJsonSummary(data: any): string {
    if (!data || typeof data !== 'object') {
      return 'Empty data';
    }
    
    const isArray = Array.isArray(data);
    const size = isArray ? data.length : Object.keys(data).length;
    
    let summary = `**JSON ${isArray ? 'Array' : 'Object'} Summary**\n\n`;
    summary += `• **Type:** ${isArray ? 'Array' : 'Object'}\n`;
    summary += `• **Size:** ${size} ${isArray ? 'items' : 'properties'}\n`;
    
    if (isArray) {
      if (data.length > 0) {
        const firstItem = data[0];
        const firstItemType = typeof firstItem;
        
        summary += `• **First item type:** ${firstItemType}\n`;
        
        if (firstItemType === 'object') {
          const keys = Object.keys(firstItem);
          summary += `• **First item keys:** ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? `... (${keys.length} total)` : ''}\n`;
        }
        
        // Show sample if array is small
        if (data.length <= 5) {
          summary += `\n**Sample items:**\n`;
          data.forEach((item, index) => {
            summary += `${index + 1}. ${this.formatValuePreview(item)}\n`;
          });
        } else {
          summary += `\n**Sample (first 3 items):**\n`;
          data.slice(0, 3).forEach((item, index) => {
            summary += `${index + 1}. ${this.formatValuePreview(item)}\n`;
          });
          summary += `... and ${data.length - 3} more items\n`;
        }
      }
    } else {
      // Object summary
      const keys = Object.keys(data);
      
      if (keys.length > 0) {
        summary += `• **Properties:** ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? `... (${keys.length} total)` : ''}\n`;
        
        // Show sample values for first few keys
        summary += `\n**Sample values:**\n`;
        keys.slice(0, 5).forEach(key => {
          const value = data[key];
          summary += `• **${key}:** ${this.formatValuePreview(value)}\n`;
        });
        
        if (keys.length > 5) {
          summary += `... and ${keys.length - 5} more properties\n`;
        }
      }
    }
    
    return summary;
  }

  private formatValuePreview(value: any): string {
    if (value === null) {
      return 'null';
    }
    
    if (value === undefined) {
      return 'undefined';
    }
    
    const type = typeof value;
    
    switch (type) {
      case 'string':
        const strValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
        return `"${strValue}"`;
        
      case 'number':
      case 'boolean':
        return String(value);
        
      case 'object':
        if (Array.isArray(value)) {
          return `[Array: ${value.length} items]`;
        }
        return `{Object: ${Object.keys(value).length} properties}`;
        
      default:
        return `[${type}]`;
    }
  }
}

export default JSONFormatter;