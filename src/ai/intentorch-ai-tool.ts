/**
 * IntentOrch AI Tool
 * 
 * Tool implementation for processing intentorch_ai_summary intents
 * Generates Markdown-formatted summaries using AI
 */

import { logger } from '../core/logger';
import { AI } from './ai';

/**
 * AI Tool configuration
 */
export interface IntentorchAIToolConfig {
  ai: AI;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}

/**
 * AI Tool execution result
 */
export interface IntentorchAIToolResult {
  success: boolean;
  content: string;
  format: 'markdown' | 'text' | 'html';
  metadata: {
    generatedAt: string;
    model?: string;
    tokenCount?: number;
    processingTime?: number;
  };
}

/**
 * IntentOrch AI Tool
 */
export class IntentorchAITool {
  private ai: AI;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: IntentorchAIToolConfig) {
    this.ai = config.ai;
    this.defaultTemperature = config.defaultTemperature || 0.3;
    this.defaultMaxTokens = config.defaultMaxTokens || 2048;
  }

  /**
   * Execute AI summary tool
   */
  async execute(
    context: any,
    options?: {
      format?: 'markdown' | 'text' | 'html';
      analysisType?: 'summary' | 'review' | 'analysis';
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<IntentorchAIToolResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`[IntentorchAITool] Executing AI summary with context type: ${typeof context}`);
      logger.debug(`[IntentorchAITool] Context value: ${JSON.stringify(context, null, 2).substring(0, 200)}...`);
      
      // Build prompt based on analysis type
      const prompt = this.buildPrompt(context, options?.analysisType || 'summary');
      
      logger.debug(`[IntentorchAITool] Generated prompt (first 300 chars): ${prompt.substring(0, 300)}...`);
      
      // Call AI service - uses system-configured model
      const aiResponse = await this.ai.generateText(prompt, {
        temperature: options?.temperature || this.defaultTemperature,
        maxTokens: options?.maxTokens || this.defaultMaxTokens,
      });
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`[IntentorchAITool] AI summary generated in ${processingTime}ms`);
      logger.debug(`[IntentorchAITool] AI response (first 200 chars): ${aiResponse.substring(0, 200)}...`);
      
      return {
        success: true,
        content: aiResponse,
        format: options?.format || 'markdown',
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTime,
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[IntentorchAITool] Failed to generate AI summary: ${errorMessage}`);
      
      return {
        success: false,
        content: `Error generating AI summary: ${errorMessage}`,
        format: options?.format || 'markdown',
        metadata: {
          generatedAt: new Date().toISOString(),
        }
      };
    }
  }

  /**
   * Build prompt for AI analysis
   */
  private buildPrompt(context: any, analysisType: string): string {
    const contextStr = typeof context === 'string' 
      ? context 
      : JSON.stringify(context, null, 2);

    const prompts = {
      summary: `Please analyze the following content and generate a comprehensive Markdown-formatted summary report.

## Content to Analyze
${contextStr}

## Requirements
1. Extract and highlight the key points
2. Identify important information and patterns
3. Provide a structured summary with clear sections
4. Use appropriate Markdown formatting:
   - Headings for main sections
   - Bullet points for lists
   - Bold/italic for emphasis
   - Code blocks if technical content is present
   - Tables if data comparison is needed

5. Focus on clarity and conciseness
6. Avoid unnecessary commentary or meta-discussion

## Output Format
Please output only the Markdown-formatted summary, without any additional explanations or disclaimers.`,

      review: `Please review the following content and provide a critical analysis in Markdown format.

## Content to Review
${contextStr}

## Review Requirements
1. Identify strengths and positive aspects
2. Point out areas for improvement or concerns
3. Provide specific, actionable suggestions
4. Assess overall quality and completeness
5. Use Markdown formatting for clear presentation

Please output only the review analysis in Markdown format.`,

      analysis: `Please perform a detailed analysis of the following content and present findings in Markdown format.

## Content for Analysis
${contextStr}

## Analysis Requirements
1. Break down the content into key components
2. Analyze relationships and dependencies
3. Identify patterns, trends, or anomalies
4. Provide insights and interpretations
5. Use Markdown formatting to organize the analysis

Please output only the analysis in Markdown format.`
    };

    return prompts[analysisType as keyof typeof prompts] || prompts.summary;
  }

  /**
   * Validate context for AI processing
   */
  validateContext(context: any): { valid: boolean; error?: string } {
    if (context === undefined || context === null) {
      return {
        valid: false,
        error: 'Context is undefined or null'
      };
    }

    if (typeof context === 'string' && context.trim().length === 0) {
      return {
        valid: false,
        error: 'Context string is empty'
      };
    }

    if (typeof context === 'object' && Object.keys(context).length === 0) {
      return {
        valid: false,
        error: 'Context object is empty'
      };
    }

    return { valid: true };
  }

  /**
   * Format result for tool output
   * Returns a standardized format that can be easily accessed by subsequent workflow steps
   */
  formatResult(result: IntentorchAIToolResult): any {
    if (result.success) {
      return {
        success: true,
        content: result.content,
        summary: result.content, // Alias for easier access
        format: result.format,
        metadata: result.metadata,
        // Add format-specific fields for easier variable substitution
        ...(result.format === 'markdown' ? { markdown: result.content } : {}),
        // Add a standardized field for workflow consumption
        workflowResult: {
          type: 'ai_summary',
          content: result.content,
          format: result.format,
          source: 'intentorch_ai_tool'
        }
      };
    } else {
      return {
        success: false,
        error: result.content,
        metadata: result.metadata,
        workflowResult: {
          type: 'error',
          error: result.content,
          source: 'intentorch_ai_tool'
        }
      };
    }
  }
}

// Singleton instance factory
let instance: IntentorchAITool | null = null;

export function getIntentorchAITool(ai: AI): IntentorchAITool {
  if (!instance) {
    instance = new IntentorchAITool({
      ai,
      defaultTemperature: 0.3,
      defaultMaxTokens: 2048
    });
  }
  return instance;
}
