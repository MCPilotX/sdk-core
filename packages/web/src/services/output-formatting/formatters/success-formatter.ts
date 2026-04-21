/**
 * Success Formatter
 * 
 * Formats success messages and success objects
 */

import { BaseFormatter } from './base-formatter';
import type { FormatContext } from '../types';

export class SuccessFormatter extends BaseFormatter {
  id = 'success-formatter';
  name = 'Success Formatter';
  description = 'Formats success messages and success objects';
  priority = 80; // High priority for success messages
  
  supportedTypes = ['text/plain'];
  supportedTools = [/success/i, /complete/i, /done/i, /created/i, /updated/i];

  canFormat(data: any, context?: FormatContext): boolean {
    if (!data) {
      return false;
    }
    
    // Check if data has success properties
    if (typeof data === 'object' && (data.success || data.status === 'success')) {
      return true;
    }
    
    // Check if string contains success keywords
    if (typeof data === 'string') {
      return this.containsSuccessKeywords(data);
    }
    
    return false;
  }

  getConfidence(data: any, context?: FormatContext): number {
    let confidence = 0.4;
    
    // Boost confidence for success objects
    if (typeof data === 'object' && (data.success || data.status === 'success')) {
      confidence += 0.4;
    }
    
    // Boost confidence for success strings
    if (typeof data === 'string' && this.containsSuccessKeywords(data)) {
      confidence += 0.3;
    }
    
    // Boost confidence if tool name suggests success
    const toolName = this.getToolName(context);
    if (toolName && this.matchesToolPattern(toolName)) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  format(data: any, context?: FormatContext): string {
    this.logActivity('Formatting success data', { dataType: typeof data });
    
    if (typeof data === 'object') {
      return this.formatSuccessObject(data, context);
    }
    
    if (typeof data === 'string') {
      return this.formatSuccessString(data, context);
    }
    
    // Fallback
    return `✅ **Success**\n\n${JSON.stringify(data, null, 2)}`;
  }

  /**
   * Check if string contains success keywords
   */
  private containsSuccessKeywords(text: string): boolean {
    const lowerText = text.toLowerCase();
    const successKeywords = [
      'success', 'successful', 'completed', 'finished', 'done',
      'created', 'updated', 'saved', 'deleted', 'executed',
      'ok', 'ready', 'available', 'working', 'operational'
    ];
    
    return successKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Format success object
   */
  private formatSuccessObject(successObj: any, context?: FormatContext): string {
    let formatted = `✅ **Success**\n\n`;
    
    // Success message
    const successMessage = successObj.message || successObj.success || 'Operation completed successfully';
    formatted += `**Message:** ${successMessage}\n\n`;
    
    // Status if available
    if (successObj.status) {
      formatted += `**Status:** ${successObj.status}\n\n`;
    }
    
    // Result data if available
    if (successObj.data) {
      formatted += this.formatResultData(successObj.data, context);
    }
    
    // Timestamp if available
    if (successObj.timestamp) {
      formatted += `**Time:** ${this.formatTimestamp(successObj.timestamp)}\n\n`;
    }
    
    // Duration if available
    if (successObj.duration) {
      formatted += `**Duration:** ${this.formatDuration(successObj.duration)}\n\n`;
    }
    
    // Add next steps if applicable
    formatted += this.getNextSteps(successObj, context);
    
    return formatted;
  }

  /**
   * Format success string
   */
  private formatSuccessString(successText: string, context?: FormatContext): string {
    let formatted = `✅ **Success**\n\n`;
    
    // Extract the main message (first line)
    const lines = successText.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      formatted += `**Message:** ${lines[0]}\n\n`;
    }
    
    // Show additional details if available
    if (lines.length > 1) {
      const additionalLines = lines.slice(1, 4).join('\n');
      if (additionalLines.trim()) {
        formatted += `**Details:**\n\`\`\`\n${additionalLines}\n\`\`\`\n\n`;
      }
    }
    
    return formatted;
  }

  /**
   * Format result data from success object
   */
  private formatResultData(data: any, context?: FormatContext): string {
    if (!data) {
      return '';
    }
    
    let formatted = '';
    
    if (typeof data === 'string') {
      formatted += `**Result:** ${data}\n\n`;
    } else if (typeof data === 'object') {
      // Check for common result patterns
      
      // Count of items created/updated
      if (data.count !== undefined) {
        formatted += `**Count:** ${data.count} items\n\n`;
      }
      
      // ID of created resource
      if (data.id) {
        formatted += `**ID:** ${data.id}\n\n`;
      }
      
      // URL or location
      if (data.url || data.location) {
        const location = data.url || data.location;
        formatted += `**Location:** ${location}\n\n`;
      }
      
      // Show summary of data if it's an object
      if (Object.keys(data).length > 0) {
        const dataSummary = this.createDataSummary(data);
        if (dataSummary) {
          formatted += `**Data Summary:**\n${dataSummary}\n\n`;
        }
      }
    }
    
    return formatted;
  }

  /**
   * Create summary of data object
   */
  private createDataSummary(data: any): string {
    if (!data || typeof data !== 'object') {
      return '';
    }
    
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return 'Empty array';
      }
      
      const firstItem = data[0];
      const itemType = typeof firstItem;
      
      let summary = `Array with ${data.length} items\n`;
      summary += `• First item type: ${itemType}\n`;
      
      if (itemType === 'object' && firstItem !== null) {
        const keys = Object.keys(firstItem);
        summary += `• First item keys: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}\n`;
      }
      
      return summary;
    } else {
      const keys = Object.keys(data);
      if (keys.length === 0) {
        return 'Empty object';
      }
      
      let summary = `Object with ${keys.length} properties\n`;
      summary += `• Properties: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}\n`;
      
      // Show sample values
      const sampleKeys = keys.slice(0, 3);
      sampleKeys.forEach(key => {
        const value = data[key];
        if (value !== null && value !== undefined) {
          const valueStr = String(value);
          summary += `• ${key}: ${valueStr.substring(0, 30)}${valueStr.length > 30 ? '...' : ''}\n`;
        }
      });
      
      return summary;
    }
  }

  /**
   * Get next steps based on success type
   */
  private getNextSteps(successObj: any, context?: FormatContext): string {
    const successMessage = successObj.message || '';
    const lowerMessage = successMessage.toLowerCase();
    
    let nextSteps = `📋 **Next Steps:**\n\n`;
    
    // Creation operations
    if (lowerMessage.includes('created') || lowerMessage.includes('added')) {
      nextSteps += `• Review the newly created item\n`;
      nextSteps += `• Test its functionality if applicable\n`;
      nextSteps += `• Share with team members if needed\n`;
      nextSteps += `• Document any important details\n`;
      return nextSteps;
    }
    
    // Update operations
    if (lowerMessage.includes('updated') || lowerMessage.includes('modified')) {
      nextSteps += `• Verify the changes are correct\n`;
      nextSteps += `• Test the updated functionality\n`;
      nextSteps += `• Update any related documentation\n`;
      nextSteps += `• Notify affected users if necessary\n`;
      return nextSteps;
    }
    
    // Deletion operations
    if (lowerMessage.includes('deleted') || lowerMessage.includes('removed')) {
      nextSteps += `• Confirm the item is no longer needed\n`;
      nextSteps += `• Check for any dependencies\n`;
      nextSteps += `• Update any references to the deleted item\n`;
      nextSteps += `• Consider creating a backup if not already done\n`;
      return nextSteps;
    }
    
    // Execution operations
    if (lowerMessage.includes('executed') || lowerMessage.includes('ran')) {
      nextSteps += `• Review the execution results\n`;
      nextSteps += `• Check for any warnings or issues\n`;
      nextSteps += `• Schedule regular execution if needed\n`;
      nextSteps += `• Monitor for any follow-up actions\n`;
      return nextSteps;
    }
    
    // Generic next steps
    nextSteps += `• Review the results for accuracy\n`;
    nextSteps += `• Document any important outcomes\n`;
    nextSteps += `• Consider next actions in your workflow\n`;
    nextSteps += `• Share results with relevant stakeholders\n`;
    
    return nextSteps;
  }
}

export default SuccessFormatter;