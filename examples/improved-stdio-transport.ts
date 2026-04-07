/**
 * Improved stdio transport handling solution
 * Handling non-standard MCP server output (outputs what shouldn't be output, doesn't output what should)
 */

import { MCPilotSDK } from '../src/index';

/**
 * Solution 1: Using intelligent buffering and message boundary detection
 * 
 * Problem: Some MCP servers output non-standard:
 * 1. Output non-JSON logs to stdout
 * 2. JSON messages may be split into multiple chunks
 * 3. Message boundaries are unclear
 * 
 * Solution: Implement intelligent message parser
 */
class ImprovedStdioHandler {
  private buffer: string = '';
  private inJsonMessage: boolean = false;
  private jsonDepth: number = 0;
  
  /**
   * Process raw output data
   */
  handleData(data: string): string[] {
    const messages: string[] = [];
    this.buffer += data;
    
    let i = 0;
    while (i < this.buffer.length) {
      const char = this.buffer[i];
      
      // Detect JSON start
      if (char === '{' && !this.inJsonMessage) {
        this.inJsonMessage = true;
        this.jsonDepth = 1;
      } 
      // Track JSON nesting depth
      else if (this.inJsonMessage) {
        if (char === '{') this.jsonDepth++;
        else if (char === '}') this.jsonDepth--;
        
        // JSON message ends
        if (this.jsonDepth === 0) {
          const message = this.buffer.substring(0, i + 1);
          if (this.isValidJson(message)) {
            messages.push(message);
          }
          this.buffer = this.buffer.substring(i + 1);
          this.inJsonMessage = false;
          i = -1; // Restart from beginning of buffer
        }
      }
      i++;
    }
    
    return messages;
  }
  
  /**
   * Validate JSON string
   */
  private isValidJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Solution 2: Using pattern-based filtering
 * 
 * Filter out known noise patterns before parsing
 */
class PatternFilterHandler {
  private noisePatterns = [
    /^DEBUG:/,
    /^INFO:/,
    /^TRACE:/,
    /^\[.*\]\s+INFO/,
    /^Processing/,
    /^Starting/,
    /^Completed/
  ];
  
  /**
   * Filter noise from data
   */
  filterNoise(data: string): string {
    const lines = data.split('\n');
    const filteredLines = lines.filter(line => {
      // Keep lines that might be JSON
      if (line.trim().startsWith('{') || line.trim().startsWith('[')) {
        return true;
      }
      
      // Filter out noise patterns
      for (const pattern of this.noisePatterns) {
        if (pattern.test(line)) {
          return false;
        }
      }
      
      // Keep other lines (might be partial JSON)
      return true;
    });
    
    return filteredLines.join('\n');
  }
}

/**
 * Solution 3: Complete improved transport implementation
 */
export class ImprovedStdioTransport {
  private handler: ImprovedStdioHandler;
  private filter: PatternFilterHandler;
  private messageCallbacks: Array<(message: any) => void> = [];
  
  constructor() {
    this.handler = new ImprovedStdioHandler();
    this.filter = new PatternFilterHandler();
  }
  
  /**
   * Process incoming data from stdio
   */
  processData(data: string): void {
    // Step 1: Filter noise
    const filteredData = this.filter.filterNoise(data);
    
    // Step 2: Parse messages
    const messages = this.handler.handleData(filteredData);
    
    // Step 3: Notify callbacks
    for (const message of messages) {
      try {
        const parsed = JSON.parse(message);
        this.notifyCallbacks(parsed);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    }
  }
  
  /**
   * Register message callback
   */
  onMessage(callback: (message: any) => void): void {
    this.messageCallbacks.push(callback);
  }
  
  /**
   * Notify all callbacks
   */
  private notifyCallbacks(message: any): void {
    for (const callback of this.messageCallbacks) {
      try {
        callback(message);
      } catch (error) {
        console.error('Callback error:', error);
      }
    }
  }
}

/**
 * Example usage with MCPilotSDK
 */
async function demonstrateImprovedTransport() {
  console.log('🚀 Demonstrating Improved Stdio Transport\n');
  
  const sdk = new MCPilotSDK();
  const transport = new ImprovedStdioTransport();
  
  // Set up message handler
  transport.onMessage((message) => {
    console.log('📨 Received message:', JSON.stringify(message, null, 2));
  });
  
  console.log('✅ Improved transport system ready');
  console.log('\nKey features:');
  console.log('1. Intelligent JSON message boundary detection');
  console.log('2. Pattern-based noise filtering');
  console.log('3. Robust error handling');
  console.log('4. Support for non-standard MCP server output');
  
  return transport;
}

// Export for use in other modules
export {
  ImprovedStdioHandler,
  PatternFilterHandler,
  ImprovedStdioTransport,
  demonstrateImprovedTransport
};