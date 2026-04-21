/**
 * Enhanced error handling utilities for InTorch
 */

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffFactor?: number;
  timeoutMs?: number;
}

export class ErrorHandler {
  /**
   * Execute a function with retry logic
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = { maxAttempts: 3, delayMs: 1000 }
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      try {
        if (options.timeoutMs) {
          return await this.withTimeout(fn, options.timeoutMs);
        }
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        if (attempt >= options.maxAttempts) {
          break;
        }
        
        const delay = options.delayMs * (options.backoffFactor || 1) ** (attempt - 1);
        console.warn(`⚠️  Attempt ${attempt}/${options.maxAttempts} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw this.enhanceError(lastError!);
  }

  /**
   * Execute a function with timeout
   */
  static async withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  }

  /**
   * Enhance error with additional context
   */
  static enhanceError(error: Error): Error {
    const enhancedError = new Error(error.message);
    enhancedError.name = error.name;
    enhancedError.stack = error.stack;
    
    // Add additional context based on error type
    if (error.message.includes('Cloud Intent Engine not initialized')) {
      enhancedError.message = `IntentOrch initialization failed: ${error.message}\n` +
        '💡 Please check:\n' +
        '1. Is AI configuration correct?\n' +
        '2. Is network connection working?\n' +
        '3. Try running with --simulate flag for testing';
    } else if (error.message.includes('timeout')) {
      enhancedError.message = `Operation timed out: ${error.message}\n` +
        '💡 Suggestions:\n' +
        '1. Check network connectivity\n' +
        '2. Increase timeout if needed\n' +
        '3. Try again later';
    } else if (error.message.includes('API key')) {
      enhancedError.message = `Authentication failed: ${error.message}\n` +
        '💡 Please check:\n' +
        '1. Is API key correct?\n' +
        '2. Is the API key still valid?\n' +
        '3. Run: intorch config set apiKey <your-api-key>';
    }
    
    return enhancedError;
  }

  /**
   * Graceful shutdown handler
   */
  static setupGracefulShutdown(cleanupFn: () => Promise<void>): void {
    const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
        try {
          await cleanupFn();
          console.log('✅ Cleanup completed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during cleanup:', error);
          process.exit(1);
        }
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught exception:', this.enhanceError(error));
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, _promise) => {
      console.error('💥 Unhandled promise rejection:', reason);
      process.exit(1);
    });
  }

  /**
   * Validate AI configuration
   */
  static validateAIConfig(aiConfig: any): string[] {
    const errors: string[] = [];
    
    if (!aiConfig.provider) {
      errors.push('AI provider is not set');
    }
    
    if (!aiConfig.apiKey) {
      errors.push('API key is not set');
    } else if (aiConfig.apiKey.length < 10) {
      errors.push('API key appears to be invalid (too short)');
    }
    
    return errors;
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: Error): string {
    const message = error.message;
    
    if (message.includes('network') || message.includes('connect')) {
      return 'Network connection issue detected. Please check your internet connection.';
    } else if (message.includes('authentication') || message.includes('API key')) {
      return 'Authentication failed. Please check your API key configuration.';
    } else if (message.includes('timeout')) {
      return 'Operation took too long. Please try again or check your network connection.';
    } else if (message.includes('not found')) {
      return 'Requested resource not found. Please check the server name or URL.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }
}