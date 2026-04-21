/**
 * Error Formatter
 * 
 * Formats error messages and error objects
 */

import { BaseFormatter } from './base-formatter';
import type { FormatContext } from '../types';

export class ErrorFormatter extends BaseFormatter {
  id = 'error-formatter';
  name = 'Error Formatter';
  description = 'Formats error messages and error objects';
  priority = 90; // High priority for errors
  
  supportedTypes = ['text/plain'];
  supportedTools = [/error/i, /fail/i, /exception/i];

  canFormat(data: any, context?: FormatContext): boolean {
    if (!data) {
      return false;
    }
    
    // Check if data is an error object
    if (data instanceof Error) {
      return true;
    }
    
    // Check if data has error properties
    if (typeof data === 'object' && (data.error || data.status === 'error')) {
      return true;
    }
    
    // Check if string contains error keywords
    if (typeof data === 'string') {
      return this.containsErrorKeywords(data);
    }
    
    return false;
  }

  getConfidence(data: any, context?: FormatContext): number {
    let confidence = 0.4;
    
    // Boost confidence for Error instances
    if (data instanceof Error) {
      confidence += 0.4;
    }
    
    // Boost confidence for error objects
    if (typeof data === 'object' && (data.error || data.status === 'error')) {
      confidence += 0.3;
    }
    
    // Boost confidence for error strings
    if (typeof data === 'string' && this.containsErrorKeywords(data)) {
      confidence += 0.2;
    }
    
    // Boost confidence if tool name suggests errors
    const toolName = this.getToolName(context);
    if (toolName && this.matchesToolPattern(toolName)) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  format(data: any, context?: FormatContext): string {
    this.logActivity('Formatting error data', { dataType: typeof data });
    
    if (data instanceof Error) {
      return this.formatErrorInstance(data, context);
    }
    
    if (typeof data === 'object') {
      return this.formatErrorObject(data, context);
    }
    
    if (typeof data === 'string') {
      return this.formatErrorString(data, context);
    }
    
    // Fallback
    return `**Error**\n\n${JSON.stringify(data, null, 2)}`;
  }

  /**
   * Check if string contains error keywords
   */
  private containsErrorKeywords(text: string): boolean {
    const lowerText = text.toLowerCase();
    const errorKeywords = [
      'error', 'failed', 'failure', 'exception', 'unexpected',
      'invalid', 'not found', 'not available', 'cannot', 'could not',
      'permission denied', 'access denied', 'timeout', 'crash'
    ];
    
    return errorKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Format Error instance
   */
  private formatErrorInstance(error: Error, context?: FormatContext): string {
    let formatted = `❌ **Error**\n\n`;
    
    // Error message
    formatted += `**Message:** ${error.message}\n\n`;
    
    // Error type
    formatted += `**Type:** ${error.name}\n\n`;
    
    // Stack trace (truncated)
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      const relevantStack = stackLines.slice(0, 5).join('\n');
      formatted += `**Stack Trace:**\n\`\`\`\n${relevantStack}\n\`\`\`\n\n`;
    }
    
    // Add troubleshooting tips
    formatted += this.getTroubleshootingTips(error, context);
    
    return formatted;
  }

  /**
   * Format error object
   */
  private formatErrorObject(errorObj: any, context?: FormatContext): string {
    let formatted = `❌ **Error**\n\n`;
    
    // Extract error message
    const errorMessage = errorObj.message || errorObj.error || errorObj.details || 'Unknown error';
    formatted += `**Message:** ${errorMessage}\n\n`;
    
    // Error code if available
    if (errorObj.code) {
      formatted += `**Code:** ${errorObj.code}\n\n`;
    }
    
    // Status if available
    if (errorObj.status) {
      formatted += `**Status:** ${errorObj.status}\n\n`;
    }
    
    // Additional details
    if (errorObj.details && typeof errorObj.details === 'string') {
      formatted += `**Details:** ${errorObj.details}\n\n`;
    }
    
    // Timestamp if available
    if (errorObj.timestamp) {
      formatted += `**Time:** ${this.formatTimestamp(errorObj.timestamp)}\n\n`;
    }
    
    // Add troubleshooting tips
    formatted += this.getTroubleshootingTips(errorObj, context);
    
    return formatted;
  }

  /**
   * Format error string
   */
  private formatErrorString(errorText: string, context?: FormatContext): string {
    let formatted = `❌ **Error**\n\n`;
    
    // Extract the main error message (first line)
    const lines = errorText.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      formatted += `**Message:** ${lines[0]}\n\n`;
    }
    
    // Show additional context if available
    if (lines.length > 1) {
      const additionalLines = lines.slice(1, 4).join('\n');
      if (additionalLines.trim()) {
        formatted += `**Context:**\n\`\`\`\n${additionalLines}\n\`\`\`\n\n`;
      }
    }
    
    // Add troubleshooting tips
    formatted += this.getTroubleshootingTips({ message: lines[0] }, context);
    
    return formatted;
  }

  /**
   * Get troubleshooting tips based on error type
   */
  private getTroubleshootingTips(error: any, context?: FormatContext): string {
    const errorMessage = typeof error === 'string' ? error : error.message || '';
    const lowerMessage = errorMessage.toLowerCase();
    
    let tips = `🔧 **Troubleshooting Tips:**\n\n`;
    
    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('connection') || 
        lowerMessage.includes('timeout') || lowerMessage.includes('fetch')) {
      tips += `• Check your internet connection\n`;
      tips += `• Verify the server is running and accessible\n`;
      tips += `• Check firewall and proxy settings\n`;
      tips += `• Try again after a few moments\n`;
      return tips;
    }
    
    // Authentication errors
    if (lowerMessage.includes('auth') || lowerMessage.includes('401') || 
        lowerMessage.includes('403') || lowerMessage.includes('token') ||
        lowerMessage.includes('permission') || lowerMessage.includes('access')) {
      tips += `• Verify your credentials are correct\n`;
      tips += `• Check if your token has expired\n`;
      tips += `• Ensure you have the necessary permissions\n`;
      tips += `• Contact your administrator for access\n`;
      return tips;
    }
    
    // File system errors
    if (lowerMessage.includes('file') || lowerMessage.includes('directory') || 
        lowerMessage.includes('path') || lowerMessage.includes('permission denied')) {
      tips += `• Check if the file or directory exists\n`;
      tips += `• Verify file permissions\n`;
      tips += `• Ensure you have write access if needed\n`;
      tips += `• Check disk space availability\n`;
      return tips;
    }
    
    // Database errors
    if (lowerMessage.includes('database') || lowerMessage.includes('sql') || 
        lowerMessage.includes('query') || lowerMessage.includes('constraint')) {
      tips += `• Verify database connection settings\n`;
      tips += `• Check if the database is running\n`;
      tips += `• Review the query syntax\n`;
      tips += `• Check for data consistency issues\n`;
      return tips;
    }
    
    // Generic tips
    tips += `• Check the error message for specific details\n`;
    tips += `• Verify input parameters and configurations\n`;
    tips += `• Check system logs for more information\n`;
    tips += `• Contact support if the issue persists\n`;
    
    return tips;
  }
}

export default ErrorFormatter;