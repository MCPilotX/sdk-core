/**
 * IntentOrch Directive Processor
 *
 * Minimalist implementation for processing @intentorch directives
 * Core capabilities:
 * 1. Extract @intentorch directive positions
 * 2. Clean queries (remove directive markers)
 * 3. Insert AI summary steps into workflows
 * 4. Generate Markdown-formatted AI summaries
 */

import { logger } from '../core/logger';
import { AtomicIntent, DependencyEdge, IntentParseResult } from './cloud-intent-engine';

/**
 * @intentorch directive definition
 */
export interface IntentorchDirective {
  position: number;           // Position in original query
  intentId?: string;          // Generated AI intent ID
  contextIntentId?: string;   // Associated context intent ID (previous intent)
}

/**
 * Directive processing result
 */
export interface DirectiveProcessingResult {
  cleanedQuery: string;               // Cleaned query (with @intentorch removed)
  directives: IntentorchDirective[];  // Extracted directives
  hasDirectives: boolean;             // Whether directives are present
}

/**
 * IntentOrch Directive Processor
 */
export class IntentorchDirectiveProcessor {
  private directivePattern = /@intentorch/gi;

  /**
   * Process query to extract @intentorch directives
   */
  processQuery(query: string): DirectiveProcessingResult {
    logger.info(`[IntentorchDirectiveProcessor] Processing query for @intentorch directives: "${query.substring(0, 100)}..."`);

    const directives: IntentorchDirective[] = [];
    let cleanedQuery = query;

    // Use a local regex to avoid global regex state issues
    const pattern = /@intentorch/gi;
    let match;

    // First, find all matches and their positions
    const matches: Array<{index: number, length: number}> = [];
    while ((match = pattern.exec(query)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
      });
    }

    // Process matches in reverse order to maintain correct positions when removing from query
    // But we need to store directives in original order
    const sortedMatches = [...matches].sort((a, b) => a.index - b.index);

    for (let i = 0; i < sortedMatches.length; i++) {
      const match = sortedMatches[i];
      const position = match.index;

      directives.push({
        position,
        intentId: `AI${i + 1}`,  // Generate AI intent ID, e.g., AI1, AI2
      });
    }

    // Remove directives from query in reverse order to maintain correct positions
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const position = match.index;

      // Remove @intentorch directive from query
      cleanedQuery = cleanedQuery.substring(0, position) +
                     cleanedQuery.substring(position + match.length);
    }

    // Clean up extra whitespace
    cleanedQuery = cleanedQuery.replace(/\s+/g, ' ').trim();

    logger.info(`[IntentorchDirectiveProcessor] Found ${directives.length} @intentorch directives`);
    logger.debug(`[IntentorchDirectiveProcessor] Cleaned query: "${cleanedQuery}"`);

    return {
      cleanedQuery,
      directives,
      hasDirectives: directives.length > 0,
    };
  }

  /**
   * Enhance workflow by replacing AI analysis steps with @intentorch enhanced steps
   */
  enhanceWorkflowWithDirectives(
    baseResult: IntentParseResult,
    directives: IntentorchDirective[],
  ): IntentParseResult {
    if (directives.length === 0) {
      return baseResult;
    }

    logger.info(`[IntentorchDirectiveProcessor] Enhancing workflow with ${directives.length} @intentorch directives`);

    const enhancedIntents: AtomicIntent[] = [...baseResult.intents];
    const enhancedEdges: DependencyEdge[] = [...baseResult.edges];

    // For each directive, find and replace the corresponding AI analysis intent
    directives.forEach((directive, index) => {
      const aiIntentId = `AI${index + 1}`;

      // Find the AI analysis intent to replace (usually the intent after data retrieval)
      const aiAnalysisIntentIndex = this.findAIAnalysisIntentIndex(enhancedIntents, directive.position);

      if (aiAnalysisIntentIndex !== -1) {
        // Replace the existing AI analysis intent with @intentorch enhanced intent
        const contextIntentId = this.findContextIntentIdForReplacement(enhancedIntents, aiAnalysisIntentIndex);

        const enhancedIntent: AtomicIntent = {
          id: enhancedIntents[aiAnalysisIntentIndex].id, // Keep the same ID
          type: 'intentorch_ai_summary',
          description: 'Generate high-quality Markdown-formatted summary analysis using IntentOrch AI',
          parameters: {
            content: contextIntentId ? `{{${contextIntentId}}}` : 'No context available',
            format: 'markdown',
            analysisType: 'summary',
            contextIntentId: contextIntentId,
            enhancedByIntentorch: true,
          },
        };

        // Replace the intent
        enhancedIntents[aiAnalysisIntentIndex] = enhancedIntent;

        logger.debug(`[IntentorchDirectiveProcessor] Replaced intent at index ${aiAnalysisIntentIndex} with @intentorch enhanced intent`);
        logger.debug(`[IntentorchDirectiveProcessor] Enhanced intent ${enhancedIntent.id} will receive context from ${contextIntentId}`);

        // Update intentId in directive
        directive.intentId = enhancedIntent.id;
      } else {
        // Fallback: add new intent if no AI analysis intent found
        logger.warn(`[IntentorchDirectiveProcessor] No AI analysis intent found for directive at position ${directive.position}, adding new intent`);

        const contextIntentId = this.findContextIntentId(enhancedIntents, directive.position);

        const aiIntent: AtomicIntent = {
          id: aiIntentId,
          type: 'intentorch_ai_summary',
          description: 'Generate Markdown-formatted summary analysis using IntentOrch AI',
          parameters: {
            content: contextIntentId ? `{{${contextIntentId}}}` : 'No context available',
            format: 'markdown',
            analysisType: 'summary',
            contextIntentId: contextIntentId,
          },
        };

        enhancedIntents.push(aiIntent);

        if (contextIntentId) {
          enhancedEdges.push({
            from: contextIntentId,
            to: aiIntentId,
          });
        }

        directive.intentId = aiIntentId;
      }
    });

    logger.info(`[IntentorchDirectiveProcessor] Enhanced workflow: ${enhancedIntents.length} intents, ${enhancedEdges.length} edges`);

    return {
      intents: enhancedIntents,
      edges: enhancedEdges,
    };
  }

  /**
   * Find AI analysis intent index to replace
   * Looks for intents that involve analysis, summary, or AI processing
   */
  private findAIAnalysisIntentIndex(intents: AtomicIntent[], directivePosition: number): number {
    const analysisKeywords = ['analyze', 'analysis', 'summary', 'summarize', 'review', 'evaluate', 'assess', 'generate'];

    for (let i = 0; i < intents.length; i++) {
      const intent = intents[i];
      const descriptionLower = intent.description.toLowerCase();
      const typeLower = intent.type.toLowerCase();

      // Check if this intent involves analysis or summary
      const isAnalysisIntent = analysisKeywords.some(keyword =>
        descriptionLower.includes(keyword) || typeLower.includes(keyword),
      );

      // Also check for AI-related intent types
      const isAIIntent = typeLower.includes('ai_') || typeLower.includes('_ai') ||
                         typeLower.includes('analyze') || typeLower.includes('summary');

      if (isAnalysisIntent || isAIIntent) {
        return i;
      }
    }

    // If no analysis intent found, return the intent after data retrieval intents
    const dataRetrievalKeywords = ['get', 'fetch', 'retrieve', 'read', 'obtain'];
    for (let i = 0; i < intents.length; i++) {
      const intent = intents[i];
      const descriptionLower = intent.description.toLowerCase();

      if (dataRetrievalKeywords.some(keyword => descriptionLower.includes(keyword))) {
        // Return the next intent if it exists
        if (i + 1 < intents.length) {
          return i + 1;
        }
      }
    }

    return -1;
  }

  /**
   * Find context intent ID for replacement
   * For AI analysis intents, context is usually from data retrieval intents
   */
  private findContextIntentIdForReplacement(intents: AtomicIntent[], aiAnalysisIndex: number): string | undefined {
    if (aiAnalysisIndex <= 0) {
      return undefined;
    }

    // Look for data retrieval intents before the AI analysis intent
    const dataRetrievalKeywords = ['get', 'fetch', 'retrieve', 'read', 'obtain', 'list'];

    for (let i = aiAnalysisIndex - 1; i >= 0; i--) {
      const intent = intents[i];
      const descriptionLower = intent.description.toLowerCase();

      if (dataRetrievalKeywords.some(keyword => descriptionLower.includes(keyword))) {
        return intent.id;
      }
    }

    // If no data retrieval intent found, use the previous intent
    return intents[aiAnalysisIndex - 1].id;
  }

  /**
   * Find associated context intent ID (original implementation)
   * Simple strategy: use the last non-AI intent as context
   */
  private findContextIntentId(intents: AtomicIntent[], directivePosition: number): string | undefined {
    // Filter out non-AI intents
    const nonAIIntents = intents.filter(intent => !intent.type.startsWith('intentorch_'));

    if (nonAIIntents.length === 0) {
      return undefined;
    }

    // Use the last non-AI intent as context
    return nonAIIntents[nonAIIntents.length - 1].id;
  }

  /**
   * Build AI summary prompt
   */
  buildAISummaryPrompt(context: any, analysisType: string = 'summary'): string {
    // 如果context是字符串且包含[object Object]，尝试从执行上下文中获取实际数据
    let contentToAnalyze = context;

    if (typeof context === 'string' && context.includes('[object Object]')) {
      // 尝试从变量替换中获取实际数据
      contentToAnalyze = 'Content not properly formatted. Please check data source.';
    } else if (context && typeof context === 'object') {
      // 如果是对象，使用JSON.stringify
      contentToAnalyze = JSON.stringify(context, null, 2);
    }

    const prompts = {
      summary: `Please analyze the following content and generate a comprehensive Markdown-formatted summary report:

## Content to Analyze
${contentToAnalyze}

## Requirements
1. Extract and highlight the key points
2. Identify important information and patterns
3. Provide a structured summary with clear sections
4. Use appropriate Markdown formatting

Please output only the Markdown-formatted summary, without any additional explanations.`,
    };

    return prompts[analysisType as keyof typeof prompts] || prompts.summary;
  }

  /**
   * Format AI result for workflow consumption
   * Returns a standardized format that can be easily accessed by subsequent steps
   */
  formatAIResult(aiResponse: string, format: string = 'markdown'): any {
    const baseResult = {
      success: true,
      content: aiResponse,
      summary: aiResponse, // Alias for easier access
      format: format,
      metadata: {
        generatedAt: new Date().toISOString(),
        source: 'intentorch_ai_summary',
      },
    };

    // Add format-specific fields
    if (format === 'markdown') {
      return {
        ...baseResult,
        markdown: aiResponse, // Another alias for markdown content
      };
    }

    return baseResult;
  }

  /**
   * Validate directive syntax
   */
  validateDirectives(query: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unclosed directives (for future expansion)
    // Currently only @intentorch, no complex validation needed

    if (query.includes('@intentorch') && !query.match(this.directivePattern)) {
      errors.push('Possible directive syntax error detected');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instance
export const intentorchDirectiveProcessor = new IntentorchDirectiveProcessor();
