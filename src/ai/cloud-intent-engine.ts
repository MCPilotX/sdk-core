/**
 * Cloud LLM Intent Engine
 * Cloud LLM-based intent parsing and MCP capability auto-mapping engine
 *
 * Core capabilities:
 * 1. Decompose natural language instructions into atomic intents (with parameters)
 * 2. Infer dependencies between atomic intents (generate DAG)
 * 3. Select the most appropriate tool from MCP tools for each atomic intent
 * 4. Map intent parameters to tool input parameters
 * 5. Execute tool calls in dependency order
 */

import { logger } from '../core/logger';
import { AI, AIError, type AIConfig } from './ai';
import type { Tool } from '../mcp/types';
import { ParameterMapper, ValidationLevel, type ParameterMappingRule } from '../mcp/parameter-mapper';
import { intentorchDirectiveProcessor, type DirectiveProcessingResult } from './intentorch-directive-processor';

// ==================== Type Definitions ====================

/**
 * Atomic intent
 */
export interface AtomicIntent {
  id: string;           // Unique identifier, e.g., A1, A2
  type: string;         // Short action name, e.g., open_web, search, screenshot
  description: string;  // Human-readable step description
  parameters: Record<string, any>;  // Parameters extracted from instruction
}

/**
 * Dependency edge
 */
export interface DependencyEdge {
  from: string;  // Source intent ID
  to: string;    // Target intent ID
}

/**
 * Intent parsing result
 */
export interface IntentParseResult {
  intents: AtomicIntent[];
  edges: DependencyEdge[];
}

/**
 * Tool selection result
 */
export interface ToolSelectionResult {
  intentId: string;
  toolName: string;
  toolDescription: string;
  mappedParameters: Record<string, any>;
  confidence: number;
  serverId?: string;
  serverName?: string;
}

/**
 * Execution context
 */
export interface ExecutionContext {
  results: Map<string, any>;  // Intent ID -> execution result
  variables: Map<string, any>; // Variable storage
}

/**
 * Enhanced execution step result
 */
export interface EnhancedExecutionStep {
  intentId: string;
  intentDescription: string;
  intentType: string;
  intentParameters: Record<string, any>;
  toolName: string;
  toolDescription: string;
  mappedParameters: Record<string, any>;
  confidence: number;
  success: boolean;
  result?: any;
  error?: string;
  duration?: number;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Workflow plan (pre-execution)
 */
export interface WorkflowPlan {
  query: string;
  parsedIntents: AtomicIntent[];
  dependencies: DependencyEdge[];
  toolSelections: ToolSelectionResult[];
  executionOrder: string[];
  estimatedSteps: number;
  createdAt: Date;
}

/**
 * Enhanced execution result
 */
export interface EnhancedExecutionResult {
  success: boolean;
  finalResult?: any;

  // Parsing phase information
  parsedIntents: AtomicIntent[];
  dependencies: DependencyEdge[];

  // Tool selection information
  toolSelections: ToolSelectionResult[];

  // Execution results
  executionSteps: EnhancedExecutionStep[];

  // Statistics
  statistics: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalDuration: number;
    averageStepDuration: number;
    llmCalls: number;
    parsingTime?: number;
    toolSelectionTime?: number;
    executionTime?: number;
  };
}

/**
 * Execution result (legacy)
 */
export interface ExecutionResult {
  success: boolean;
  finalResult?: any;
  stepResults: Array<{
    intentId: string;
    toolName: string;
    success: boolean;
    result?: any;
    error?: string;
  }>;
}

// ==================== Configuration Interface ====================

export interface CloudIntentEngineConfig {
  llm: {
    provider: AIConfig['provider'];
    apiKey?: string;
    endpoint?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    maxRetries?: number;
  };
  execution: {
    maxConcurrentTools?: number;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
  };
  fallback: {
    enableKeywordMatching?: boolean;
    askUserOnFailure?: boolean;
    defaultTools?: Record<string, string>;  // Intent type -> default tool name
  };
  parameterMapping?: {
    validationLevel?: ValidationLevel;
    enableCompatibilityMappings?: boolean;
    logWarnings?: boolean;
    enforceRequired?: boolean;
  };
}

// ==================== Main Engine Class ====================

export class CloudIntentEngine {
  private ai: AI;
  private config: CloudIntentEngineConfig;
  private availableTools: Tool[] = [];
  private toolCache: Map<string, Tool> = new Map();

  constructor(config: CloudIntentEngineConfig) {
    this.config = {
      llm: {
        provider: 'openai',
        temperature: 0.1,
        maxTokens: 2048,
        timeout: 30000,
        maxRetries: 3,
        ...config.llm,
      },
      execution: {
        maxConcurrentTools: 10, // Increased from 3 to allow more concurrent tools
        timeout: 60000,
        retryAttempts: 2,
        retryDelay: 1000,
        ...config.execution,
      },
      fallback: {
        enableKeywordMatching: true,
        askUserOnFailure: false,
        defaultTools: {},
        ...config.fallback,
      },
    };

    this.ai = new AI();
  }

  /**
   * Initialize the engine
   */
  async initialize(): Promise<void> {
    try {
      // Configure AI service
      await this.ai.configure({
        provider: this.config.llm.provider,
        apiKey: this.config.llm.apiKey,
        endpoint: this.config.llm.endpoint,
        model: this.config.llm.model,
      });

      // Configure ParameterMapper if configuration is provided
      if (this.config.parameterMapping) {
        ParameterMapper.configure({
          validationLevel: this.config.parameterMapping.validationLevel,
          logWarnings: this.config.parameterMapping.logWarnings !== false,
          enforceRequired: this.config.parameterMapping.enforceRequired !== false,
        });
        logger.info('[CloudIntentEngine] ParameterMapper configured successfully');
      }

      logger.info('[CloudIntentEngine] Engine initialized successfully');
    } catch (error) {
      logger.error(`[CloudIntentEngine] Failed to initialize: ${error}`);
      throw error;
    }
  }

  /**
   * Set available tools list
   */
  setAvailableTools(tools: Tool[]): void {
    this.availableTools = tools;
    this.toolCache.clear();

    // Build tool cache
    tools.forEach(tool => {
      this.toolCache.set(tool.name, tool);
    });

    logger.info(`[CloudIntentEngine] Set ${tools.length} available tools`);
  }

  /**
   * Parse natural language instruction into atomic intents and dependencies
   * Enhanced to support @intentorch directives
   */
  async parseIntent(query: string): Promise<IntentParseResult> {
    logger.info(`[CloudIntentEngine] Parsing intent: "${query}"`);

    try {
      // Step 1: Process @intentorch directives
      const directiveResult = intentorchDirectiveProcessor.processQuery(query);

      // Step 2: Parse cleaned query with LLM
      const prompt = this.buildIntentParsePrompt(directiveResult.cleanedQuery);
      const llmResponse = await this.callLLM(prompt, {
        temperature: 0.1,
        maxTokens: 1024,
      });

      // Step 3: Parse LLM response
      const baseResult = this.parseIntentResponse(llmResponse);

      // Step 4: Enhance workflow with @intentorch directives if present
      let finalResult: IntentParseResult;
      if (directiveResult.hasDirectives) {
        logger.info(`[CloudIntentEngine] Enhancing workflow with ${directiveResult.directives.length} @intentorch directives`);
        finalResult = intentorchDirectiveProcessor.enhanceWorkflowWithDirectives(
          baseResult,
          directiveResult.directives,
        );
      } else {
        finalResult = baseResult;
      }

      logger.info(`[CloudIntentEngine] Parsed ${finalResult.intents.length} intents with ${finalResult.edges.length} dependencies`);
      if (directiveResult.hasDirectives) {
        logger.info(`[CloudIntentEngine] Includes ${directiveResult.directives.length} AI summary steps from @intentorch directives`);
      }

      return finalResult;
    } catch (error) {
      logger.error(`[CloudIntentEngine] Intent parsing failed: ${error}`);

      // Fallback: use simple rule-based parsing
      return this.fallbackIntentParse(query);
    }
  }

  /**
   * Select the most appropriate tool for each intent
   */
  async selectTools(intents: AtomicIntent[]): Promise<ToolSelectionResult[]> {
    logger.info(`[CloudIntentEngine] Selecting tools for ${intents.length} intents`);

    const results: ToolSelectionResult[] = [];

    // Process intents in parallel (limited by concurrency)
    const batchSize = this.config.execution.maxConcurrentTools || 3;
    for (let i = 0; i < intents.length; i += batchSize) {
      const batch = intents.slice(i, i + batchSize);
      const batchPromises = batch.map(intent => this.selectToolForIntent(intent));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    // Count selection results
    const successfulSelections = results.filter(r => r.confidence > 0.5).length;
    logger.info(`[CloudIntentEngine] Tool selection completed: ${successfulSelections}/${intents.length} successful`);

    return results;
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(
    intents: AtomicIntent[],
    toolSelections: ToolSelectionResult[],
    edges: DependencyEdge[],
    toolExecutor: (toolName: string, params: Record<string, any>) => Promise<any>,
  ): Promise<ExecutionResult> {
    logger.info(`[CloudIntentEngine] Executing workflow with ${intents.length} steps`);

    const context: ExecutionContext = {
      results: new Map(),
      variables: new Map(),
    };

    const stepResults: ExecutionResult['stepResults'] = [];

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(intents, edges);

    // Topological sort
    const executionOrder = this.topologicalSort(dependencyGraph);

    if (!executionOrder) {
      return {
        success: false,
        stepResults: [],
        finalResult: 'Circular dependency detected in workflow',
      };
    }

    // Execute in order
    for (const intentId of executionOrder) {
      const intent = intents.find(i => i.id === intentId);
      const toolSelection = toolSelections.find(s => s.intentId === intentId);

      if (!intent || !toolSelection) {
        stepResults.push({
          intentId,
          toolName: 'unknown',
          success: false,
          error: 'Intent or tool selection not found',
        });
        continue;
      }

      try {
        // Prepare parameters (support variable substitution)
        const resolvedParams = this.resolveParameters(
          toolSelection.mappedParameters,
          context,
        );

        // Execute tool
        const result = await toolExecutor(toolSelection.toolName, resolvedParams);

        // Save result to context
        context.results.set(intentId, result);

        stepResults.push({
          intentId,
          toolName: toolSelection.toolName,
          success: true,
          result,
        });

        logger.info(`[CloudIntentEngine] Step ${intentId} (${toolSelection.toolName}) completed successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        stepResults.push({
          intentId,
          toolName: toolSelection.toolName,
          success: false,
          error: errorMessage,
        });

        logger.error(`[CloudIntentEngine] Step ${intentId} (${toolSelection.toolName}) failed: ${errorMessage}`);

        // Decide whether to continue based on configuration
        if (this.config.execution.retryAttempts) {
          // Retry logic can be added here
        }
      }
    }

    // Calculate final result
    const success = stepResults.every(step => step.success);
    const finalResult = success ? context.results.get(executionOrder[executionOrder.length - 1]) : undefined;

    return {
      success,
      finalResult,
      stepResults,
    };
  }

  /**
   * Parse and plan workflow (without execution)
   */
  async parseAndPlan(query: string): Promise<WorkflowPlan> {
    logger.info(`[CloudIntentEngine] Parsing and planning workflow: "${query}"`);

    const startTime = Date.now();

    try {
      // Parse intent
      const intentResult = await this.parseIntent(query);

      // Select tools
      const toolSelections = await this.selectTools(intentResult.intents);

      // Build dependency graph and get execution order
      const dependencyGraph = this.buildDependencyGraph(intentResult.intents, intentResult.edges);
      const executionOrder = this.topologicalSort(dependencyGraph);

      if (!executionOrder) {
        throw new Error('Circular dependency detected in workflow');
      }

      const plan: WorkflowPlan = {
        query,
        parsedIntents: intentResult.intents,
        dependencies: intentResult.edges,
        toolSelections,
        executionOrder,
        estimatedSteps: intentResult.intents.length,
        createdAt: new Date(),
      };

      const duration = Date.now() - startTime;
      logger.info(`[CloudIntentEngine] Workflow plan created in ${duration}ms with ${intentResult.intents.length} steps`);

      return plan;
    } catch (error) {
      logger.error(`[CloudIntentEngine] Failed to parse and plan workflow: ${error}`);
      throw error;
    }
  }

  /**
   * Execute workflow with enhanced tracking
   */
  async executeWorkflowWithTracking(
    intents: AtomicIntent[],
    toolSelections: ToolSelectionResult[],
    edges: DependencyEdge[],
    toolExecutor: (toolName: string, params: Record<string, any>) => Promise<any>,
    callbacks?: {
      onStepStarted?: (step: { intentId: string; toolName: string; intentDescription: string }) => void;
      onStepCompleted?: (step: EnhancedExecutionStep) => void;
      onStepFailed?: (step: EnhancedExecutionStep) => void;
    },
  ): Promise<EnhancedExecutionResult> {
    logger.info(`[CloudIntentEngine] Executing workflow with enhanced tracking for ${intents.length} steps`);

    const startTime = Date.now();
    const context: ExecutionContext = {
      results: new Map(),
      variables: new Map(),
    };

    const executionSteps: EnhancedExecutionStep[] = [];

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(intents, edges);

    // Topological sort
    const executionOrder = this.topologicalSort(dependencyGraph);

    if (!executionOrder) {
      return {
        success: false,
        parsedIntents: intents,
        dependencies: edges,
        toolSelections,
        executionSteps: [],
        statistics: {
          totalSteps: intents.length,
          successfulSteps: 0,
          failedSteps: intents.length,
          totalDuration: Date.now() - startTime,
          averageStepDuration: 0,
          llmCalls: 0,
        },
        finalResult: 'Circular dependency detected in workflow',
      };
    }

    let successfulSteps = 0;
    let failedSteps = 0;
    let totalStepDuration = 0;

    // Execute in order
    for (const intentId of executionOrder) {
      const intent = intents.find(i => i.id === intentId);
      const toolSelection = toolSelections.find(s => s.intentId === intentId);

      if (!intent || !toolSelection) {
        const errorStep: EnhancedExecutionStep = {
          intentId,
          intentDescription: 'Unknown intent',
          intentType: 'unknown',
          intentParameters: {},
          toolName: 'unknown',
          toolDescription: 'No tool selected',
          mappedParameters: {},
          confidence: 0,
          success: false,
          error: 'Intent or tool selection not found',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 0,
        };

        executionSteps.push(errorStep);
        failedSteps++;
        continue;
      }

      const stepStartTime = Date.now();
      const stepStartedAt = new Date();

      // Notify step started
      if (callbacks?.onStepStarted) {
        callbacks.onStepStarted({
          intentId,
          toolName: toolSelection.toolName,
          intentDescription: intent.description,
        });
      }

      try {
        // Prepare parameters (support variable substitution)
        const resolvedParams = this.resolveParameters(
          toolSelection.mappedParameters,
          context,
        );

        // Execute tool
        const result = await toolExecutor(toolSelection.toolName, resolvedParams);

        // Save result to context
        context.results.set(intentId, result);

        const stepDuration = Date.now() - stepStartTime;
        totalStepDuration += stepDuration;

        const successStep: EnhancedExecutionStep = {
          intentId,
          intentDescription: intent.description,
          intentType: intent.type,
          intentParameters: intent.parameters,
          toolName: toolSelection.toolName,
          toolDescription: toolSelection.toolDescription,
          mappedParameters: toolSelection.mappedParameters,
          confidence: toolSelection.confidence,
          success: true,
          result,
          startedAt: stepStartedAt,
          completedAt: new Date(),
          duration: stepDuration,
        };

        executionSteps.push(successStep);
        successfulSteps++;

        // Notify step completed
        if (callbacks?.onStepCompleted) {
          callbacks.onStepCompleted(successStep);
        }

        logger.info(`[CloudIntentEngine] Step ${intentId} (${toolSelection.toolName}) completed in ${stepDuration}ms`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stepDuration = Date.now() - stepStartTime;
        totalStepDuration += stepDuration;

        const failedStep: EnhancedExecutionStep = {
          intentId,
          intentDescription: intent.description,
          intentType: intent.type,
          intentParameters: intent.parameters,
          toolName: toolSelection.toolName,
          toolDescription: toolSelection.toolDescription,
          mappedParameters: toolSelection.mappedParameters,
          confidence: toolSelection.confidence,
          success: false,
          error: errorMessage,
          startedAt: stepStartedAt,
          completedAt: new Date(),
          duration: stepDuration,
        };

        executionSteps.push(failedStep);
        failedSteps++;

        // Notify step failed
        if (callbacks?.onStepFailed) {
          callbacks.onStepFailed(failedStep);
        }

        logger.error(`[CloudIntentEngine] Step ${intentId} (${toolSelection.toolName}) failed in ${stepDuration}ms: ${errorMessage}`);

        // Decide whether to continue based on configuration
        if (this.config.execution.retryAttempts) {
          // Retry logic can be added here
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    const averageStepDuration = executionSteps.length > 0 ? totalStepDuration / executionSteps.length : 0;

    // Calculate final result
    const success = executionSteps.every(step => step.success);
    const finalResult = success ? context.results.get(executionOrder[executionOrder.length - 1]) : undefined;

    return {
      success,
      finalResult,
      parsedIntents: intents,
      dependencies: edges,
      toolSelections,
      executionSteps,
      statistics: {
        totalSteps: intents.length,
        successfulSteps,
        failedSteps,
        totalDuration,
        averageStepDuration,
        llmCalls: 0, // This would need to be tracked during parsing and tool selection
      },
    };
  }

  /**
   * Preview workflow plan (parse and select tools only)
   */
  async previewPlan(query: string): Promise<WorkflowPlan> {
    return await this.parseAndPlan(query);
  }

  /**
   * Confirm and execute workflow plan
   */
  async confirmAndExecute(
    plan: WorkflowPlan,
    toolExecutor: (toolName: string, params: Record<string, any>) => Promise<any>,
    callbacks?: {
      onStepStarted?: (step: { intentId: string; toolName: string; intentDescription: string }) => void;
      onStepCompleted?: (step: EnhancedExecutionStep) => void;
      onStepFailed?: (step: EnhancedExecutionStep) => void;
    },
  ): Promise<EnhancedExecutionResult> {
    logger.info(`[CloudIntentEngine] Confirming and executing workflow plan with ${plan.estimatedSteps} steps`);

    return await this.executeWorkflowWithTracking(
      plan.parsedIntents,
      plan.toolSelections,
      plan.dependencies,
      toolExecutor,
      callbacks,
    );
  }

  // ==================== Private Methods ====================

  /**
   * Build intent parsing prompt
   */
  private buildIntentParsePrompt(query: string): string {
    return `You are a workflow parser. Please decompose the following natural language instruction into atomic intents and infer their dependencies.

User instruction: "${query}"

Please output JSON format with the following fields:
1. "intents": Array of atomic intents, each containing:
   - "id": Unique identifier (e.g., A1, A2, A3...)
   - "type": Short action name (e.g., open_web, search, screenshot, send_email, send_to_slack, fetch_pr_details, fetch_pr_changes)
   - "description": Human-readable step description
   - "parameters": Parameter dictionary extracted from instruction

2. "edges": Array of dependency edges, each containing:
   - "from": Source intent ID
   - "to": Target intent ID

IMPORTANT RULES FOR PARAMETERS:
1. When an intent depends on the output of another intent, use variable reference format: {{intentId}} or {{intentId.field}}
   Example: If intent A3 needs content from intent A2, use {"content": "{{A2}}"}
   Example: If intent A4 needs summary from intent A3, use {"message": "{{A3.summary}}"} or {"report_content": "{{A3}}"}
   
2. NEVER use hardcoded text like "来自 A3 的输出" or "output from A3". Always use variable references.

3. For send_to_slack intent type:
   - Use {"channel": "#channel-name", "message": "{{previous_intent}}"} or {"channel": "#channel-name", "report_content": "{{previous_intent}}"}
   - The message/report_content should reference the intent that generates the content

4. For fetch_pr_details intent type:
   - Use {"repository": "owner/repo", "pr_number": number}

5. For fetch_pr_changes intent type:
   - Use {"repository": "owner/repo", "pr_number": number}

Dependencies should be inferred based on common sense (e.g., open webpage before searching, get results before taking screenshot).

Example output for "Analyze GitHub PR and send to Slack":
{
  "intents": [
    {"id": "A1", "type": "fetch_pr_details", "description": "Get PR details from GitHub", "parameters": {"repository": "facebook/react", "pr_number": 1}},
    {"id": "A2", "type": "fetch_pr_changes", "description": "Get PR file changes", "parameters": {"repository": "facebook/react", "pr_number": 1}},
    {"id": "A3", "type": "analyze_content", "description": "Analyze PR content and generate summary", "parameters": {"content": "{{A1}} and {{A2}}"}},
    {"id": "A4", "type": "send_to_slack", "description": "Send analysis report to Slack", "parameters": {"channel": "#intentorch", "report_content": "{{A3}}"}}
  ],
  "edges": [
    {"from": "A1", "to": "A3"},
    {"from": "A2", "to": "A3"},
    {"from": "A3", "to": "A4"}
  ]
}

Output only JSON, no other content.`;
  }

  /**
   * Call LLM
   */
  private async callLLM(prompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    try {
      // Use AI's raw API call
      const response = await this.ai.callRawAPI({
        messages: [
          {
            role: 'system',
            content: 'You are a workflow parser, please output strictly in JSON format as required.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: options?.temperature || 0.1,
        maxTokens: options?.maxTokens || 1024,
        responseFormat: { type: 'json_object' },
      });

      // Extract text content from response based on provider
      let text = '';

      if (response.choices && response.choices[0]?.message?.content) {
        // OpenAI, Azure, DeepSeek format
        text = response.choices[0].message.content;
      } else if (response.content && response.content[0]?.text) {
        // Anthropic format
        text = response.content[0].text;
      } else if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
        // Google format
        text = response.candidates[0].content.parts[0].text;
      } else if (response.response) {
        // Ollama format
        text = response.response;
      } else if (response.text) {
        // Generic format
        text = response.text;
      }

      if (!text) {
        throw new Error('Empty response from LLM');
      }

      return text;
    } catch (error) {
      logger.error(`[CloudIntentEngine] LLM call failed: ${error}`);
      throw error;
    }
  }

  /**
   * Parse intent response
   */
  private parseIntentResponse(response: string): IntentParseResult {
    try {
      // Extract JSON part (handle possible extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!Array.isArray(parsed.intents) || !Array.isArray(parsed.edges)) {
        throw new Error('Invalid response structure');
      }

      return {
        intents: parsed.intents,
        edges: parsed.edges,
      };
    } catch (error) {
      logger.error(`[CloudIntentEngine] Failed to parse intent response: ${error}`);
      throw error;
    }
  }

  /**
   * Fallback: use simple rule-based intent parsing
   */
  private fallbackIntentParse(query: string): IntentParseResult {
    const queryLower = query.toLowerCase();
    const intents: AtomicIntent[] = [];
    const edges: DependencyEdge[] = [];

    let intentCounter = 1;

    // Simple rule matching
    if (queryLower.includes('open') && queryLower.includes('web')) {
      intents.push({
        id: `A${intentCounter++}`,
        type: 'open_web',
        description: 'Open webpage',
        parameters: { url: this.extractUrl(query) || 'https://www.example.com' },
      });
    }

    if (queryLower.includes('search')) {
      intents.push({
        id: `A${intentCounter++}`,
        type: 'search',
        description: 'Search content',
        parameters: { keyword: this.extractKeyword(query) || 'default' },
      });

      // Add dependency if there's an open web intent
      if (intents.some(i => i.type === 'open_web')) {
        edges.push({ from: 'A1', to: 'A2' });
      }
    }

    if (queryLower.includes('screenshot') || queryLower.includes('capture')) {
      intents.push({
        id: `A${intentCounter++}`,
        type: 'screenshot',
        description: 'Take screenshot',
        parameters: {},
      });

      // Add dependency if there's a search intent
      if (intents.some(i => i.type === 'search')) {
        const searchIntent = intents.find(i => i.type === 'search');
        const screenshotIntent = intents.find(i => i.type === 'screenshot');
        if (searchIntent && screenshotIntent) {
          edges.push({ from: searchIntent.id, to: screenshotIntent.id });
        }
      }
    }

    // If no intent matched, create a generic intent
    if (intents.length === 0) {
      intents.push({
        id: 'A1',
        type: 'process',
        description: 'Process query',
        parameters: { query },
      });
    }

    return { intents, edges };
  }

  /**
   * Select tool for a single intent with enhanced error handling and fallback strategies
   */
  private async selectToolForIntent(intent: AtomicIntent): Promise<ToolSelectionResult> {
    // If tool list is empty, return default result
    if (this.availableTools.length === 0) {
      logger.warn(`[CloudIntentEngine] No tools available for intent ${intent.id}: ${intent.description}`);
      return {
        intentId: intent.id,
        toolName: 'unknown',
        toolDescription: 'No tools available',
        mappedParameters: intent.parameters,
        confidence: 0,
      };
    }

    // Strategy 1: Try LLM-based tool selection first
    try {
      logger.debug(`[CloudIntentEngine] Attempting LLM-based tool selection for intent ${intent.id}`);

      // Build tool selection prompt
      const prompt = this.buildToolSelectionPrompt(intent);

      // Call LLM to select tool
      const llmResponse = await this.callLLM(prompt, {
        temperature: 0.1,
        maxTokens: 512,
      });

      // Parse tool selection result
      const selection = this.parseToolSelectionResponse(llmResponse, intent);

      // Validate the selected tool exists
      const toolExists = this.availableTools.some(tool => tool.name === selection.toolName);
      if (!toolExists) {
        logger.warn(`[CloudIntentEngine] LLM selected non-existent tool '${selection.toolName}', falling back to keyword matching`);
        throw new Error(`Tool '${selection.toolName}' not found in available tools`);
      }

      logger.info(`[CloudIntentEngine] LLM selected tool '${selection.toolName}' for intent ${intent.id} with confidence ${selection.confidence}`);
      return selection;
    } catch (error) {
      logger.warn(`[CloudIntentEngine] LLM tool selection failed for intent ${intent.id}: ${error}`);

      // Strategy 2: Try semantic keyword matching with improved heuristics
      try {
        logger.debug(`[CloudIntentEngine] Attempting semantic keyword matching for intent ${intent.id}`);
        const semanticMatch = this.semanticToolSelection(intent);
        if (semanticMatch.confidence > 0.5) {
          logger.info(`[CloudIntentEngine] Semantic matching selected tool '${semanticMatch.toolName}' for intent ${intent.id} with confidence ${semanticMatch.confidence}`);
          return semanticMatch;
        }
      } catch (semanticError) {
        logger.debug(`[CloudIntentEngine] Semantic matching failed: ${semanticError}`);
      }

      // Strategy 3: Fallback to basic keyword matching
      logger.debug(`[CloudIntentEngine] Falling back to basic keyword matching for intent ${intent.id}`);
      const fallbackMatch = this.fallbackToolSelection(intent);

      if (fallbackMatch.confidence > 0.3) {
        logger.info(`[CloudIntentEngine] Keyword matching selected tool '${fallbackMatch.toolName}' for intent ${intent.id} with confidence ${fallbackMatch.confidence}`);
        return fallbackMatch;
      }

      // Strategy 4: Try to find any tool that can handle the intent type
      logger.debug(`[CloudIntentEngine] Attempting intent-type based matching for intent ${intent.id}`);
      const typeBasedMatch = this.intentTypeBasedToolSelection(intent);
      if (typeBasedMatch.confidence > 0.2) {
        logger.info(`[CloudIntentEngine] Type-based matching selected tool '${typeBasedMatch.toolName}' for intent ${intent.id} with confidence ${typeBasedMatch.confidence}`);
        return typeBasedMatch;
      }

      // Last resort: Return unknown tool with intent parameters
      logger.warn(`[CloudIntentEngine] No suitable tool found for intent ${intent.id}: ${intent.description}`);
      return {
        intentId: intent.id,
        toolName: 'unknown',
        toolDescription: 'No suitable tool found for this intent',
        mappedParameters: intent.parameters,
        confidence: 0,
      };
    }
  }

  /**
   * Build tool selection prompt
   */
  private buildToolSelectionPrompt(intent: AtomicIntent): string {
    // Format tool list as string
    const toolsDescription = this.availableTools.map(tool => {
      return `- ${tool.name}: ${tool.description}\n  Input parameters: ${JSON.stringify(tool.inputSchema)}`;
    }).join('\n\n');

    return `Please select the most appropriate tool for the following intent:

Intent description: ${intent.description}
Intent type: ${intent.type}
Intent parameters: ${JSON.stringify(intent.parameters, null, 2)}

Available tools:
${toolsDescription}

Please select the best matching tool and map intent parameters to tool parameters.
Output JSON format:
{
  "tool_name": "selected_tool_name",
  "arguments": {
    // Map intent parameters to tool parameters
  },
  "confidence": 0.9 // Matching confidence (0-1)
}

Output only JSON, no other content.`;
  }

  /**
   * Parse tool selection response
   */
  private parseToolSelectionResponse(response: string, intent: AtomicIntent): ToolSelectionResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!parsed.tool_name || !parsed.arguments || typeof parsed.confidence !== 'number') {
        throw new Error('Invalid tool selection response structure');
      }

      // Get tool details from cache
      const tool = this.toolCache.get(parsed.tool_name);

      return {
        intentId: intent.id,
        toolName: parsed.tool_name,
        toolDescription: tool?.description || 'No description available',
        mappedParameters: parsed.arguments,
        confidence: parsed.confidence,
      };
    } catch (error) {
      logger.error(`[CloudIntentEngine] Failed to parse tool selection response: ${error}`);
      throw error;
    }
  }

  /**
   * Fallback tool selection using keyword matching
   */
  private fallbackToolSelection(intent: AtomicIntent): ToolSelectionResult {
    // Simple keyword matching
    const intentLower = intent.description.toLowerCase();
    let bestMatch: { tool: Tool; score: number } | null = null;

    for (const tool of this.availableTools) {
      let score = 0;

      // Check tool name
      if (tool.name.toLowerCase().includes(intent.type.toLowerCase())) {
        score += 3;
      }

      // Check tool description
      if (tool.description.toLowerCase().includes(intent.type.toLowerCase())) {
        score += 2;
      }

      // Check for keyword matches
      const keywords = ['open', 'search', 'read', 'write', 'create', 'delete', 'list', 'get'];
      for (const keyword of keywords) {
        if (intentLower.includes(keyword) && tool.description.toLowerCase().includes(keyword)) {
          score += 1;
        }
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { tool, score };
      }
    }

    if (bestMatch) {
      return {
        intentId: intent.id,
        toolName: bestMatch.tool.name,
        toolDescription: bestMatch.tool.description,
        mappedParameters: this.simpleParameterMapping(intent.parameters, bestMatch.tool),
        confidence: Math.min(bestMatch.score / 5, 0.7), // Normalize to 0-0.7 range
      };
    }

    // Use default tool if configured
    const defaultToolName = this.config.fallback.defaultTools?.[intent.type];
    if (defaultToolName) {
      const defaultTool = this.availableTools.find(t => t.name === defaultToolName);
      if (defaultTool) {
        return {
          intentId: intent.id,
          toolName: defaultTool.name,
          toolDescription: defaultTool.description,
          mappedParameters: intent.parameters,
          confidence: 0.3,
        };
      }
    }

    // Return unknown tool
    return {
      intentId: intent.id,
      toolName: 'unknown',
      toolDescription: 'No matching tool found',
      mappedParameters: intent.parameters,
      confidence: 0,
    };
  }

  /**
   * Semantic tool selection with improved heuristics (Generic version)
   */
  private semanticToolSelection(intent: AtomicIntent): ToolSelectionResult {
    const intentLower = intent.description.toLowerCase();
    const intentTypeLower = intent.type.toLowerCase();

    // Generic semantic categories - no service-specific logic
    const genericSemanticCategories: Record<string, string[]> = {
      // Generic operation categories
      'data_retrieval': ['get', 'fetch', 'retrieve', 'read', 'obtain', 'acquire'],
      'data_creation': ['create', 'make', 'generate', 'write', 'add', 'insert'],
      'data_update': ['update', 'modify', 'edit', 'change', 'adjust'],
      'data_deletion': ['delete', 'remove', 'erase', 'clear', 'drop'],
      'data_listing': ['list', 'show', 'display', 'enumerate', 'browse'],
      'communication': ['send', 'post', 'message', 'notify', 'alert', 'share'],
      'analysis': ['analyze', 'review', 'evaluate', 'assess', 'check', 'examine'],
      'search': ['search', 'find', 'lookup', 'query', 'discover'],
      'file_operations': ['file', 'document', 'content', 'text', 'data'],
      'network_operations': ['url', 'web', 'http', 'network', 'connect'],
    };

    // Generic action verbs
    const genericActionVerbs = [
      'get', 'list', 'create', 'update', 'delete', 'send', 'post',
      'analyze', 'generate', 'read', 'write', 'open', 'close', 'start',
      'stop', 'run', 'execute', 'call', 'invoke', 'fetch', 'retrieve',
    ];

    let bestMatch: { tool: Tool; score: number } | null = null;

    for (const tool of this.availableTools) {
      let score = 0;
      const toolNameLower = tool.name.toLowerCase();
      const toolDescLower = tool.description.toLowerCase();

      // 1. Check if intent type is in tool name or description
      if (toolNameLower.includes(intentTypeLower) || toolDescLower.includes(intentTypeLower)) {
        score += 4;
      }

      // 2. Check generic semantic category matches
      for (const [category, keywords] of Object.entries(genericSemanticCategories)) {
        const hasIntentKeyword = keywords.some(keyword => intentLower.includes(keyword));
        const hasToolKeyword = keywords.some(keyword =>
          toolNameLower.includes(keyword) || toolDescLower.includes(keyword),
        );

        if (hasIntentKeyword && hasToolKeyword) {
          score += 3;
        }
      }

      // 3. Check generic action verb matches
      for (const verb of genericActionVerbs) {
        if (intentLower.includes(verb) && (toolNameLower.includes(verb) || toolDescLower.includes(verb))) {
          score += 2;
        }
      }

      // 4. Check parameter compatibility (using generic parameter mapping)
      const intentParamKeys = Object.keys(intent.parameters);
      if (tool.inputSchema?.properties) {
        const toolParamKeys = Object.keys(tool.inputSchema.properties);
        const matchingParams = intentParamKeys.filter(param =>
          toolParamKeys.some(toolParam =>
            param.toLowerCase() === toolParam.toLowerCase() ||
            this.areParametersCompatibleGeneric(param, toolParam),
          ),
        );

        if (matchingParams.length > 0) {
          score += matchingParams.length;
        }
      }

      // 5. Check semantic overlap between tool description and intent description
      const intentWords = new Set(intentLower.split(/\W+/).filter(w => w.length > 2));
      const toolDescWords = new Set(toolDescLower.split(/\W+/).filter(w => w.length > 2));
      const overlappingWords = [...intentWords].filter(word => toolDescWords.has(word));
      if (overlappingWords.length > 0) {
        score += overlappingWords.length;
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { tool, score };
      }
    }

    if (bestMatch) {
      const normalizedScore = Math.min(bestMatch.score / 15, 0.8); // Adjust normalization factor
      return {
        intentId: intent.id,
        toolName: bestMatch.tool.name,
        toolDescription: bestMatch.tool.description,
        mappedParameters: this.simpleParameterMapping(intent.parameters, bestMatch.tool),
        confidence: normalizedScore,
      };
    }

    // No semantic match found
    throw new Error('No semantic match found');
  }

  /**
   * Generic parameter compatibility check (Generic version)
   */
  private areParametersCompatibleGeneric(intentParam: string, toolParam: string): boolean {
    const intentParamLower = intentParam.toLowerCase();
    const toolParamLower = toolParam.toLowerCase();

    // 1. Direct match
    if (intentParamLower === toolParamLower) {
      return true;
    }

    // 2. Generic parameter mappings
    const genericParamMappings: Record<string, string[]> = {
      // Data identifiers
      'id': ['id', 'identifier', 'uid', 'uuid', 'key'],
      'name': ['name', 'title', 'label', 'display_name'],
      'description': ['description', 'desc', 'info', 'details'],

      // Data content
      'content': ['content', 'text', 'body', 'data', 'message', 'value'],
      'text': ['text', 'content', 'message', 'body', 'data'],
      'data': ['data', 'content', 'payload', 'body', 'value'],

      // File operations
      'file': ['file', 'path', 'filename', 'filepath', 'location'],
      'path': ['path', 'filepath', 'directory', 'folder', 'location'],
      'directory': ['directory', 'folder', 'path', 'location'],

      // Network operations
      'url': ['url', 'uri', 'link', 'address', 'endpoint'],
      'address': ['address', 'url', 'uri', 'endpoint', 'location'],

      // Search operations
      'query': ['query', 'search', 'q', 'filter', 'term', 'keyword'],
      'search': ['search', 'query', 'q', 'filter', 'term', 'keyword'],

      // Time related
      'time': ['time', 'timestamp', 'date', 'datetime', 'when'],
      'date': ['date', 'datetime', 'timestamp', 'time'],

      // Quantity related
      'count': ['count', 'number', 'amount', 'quantity', 'total'],
      'limit': ['limit', 'max', 'maximum', 'count', 'size'],
    };

    // 3. Check generic mappings
    if (genericParamMappings[intentParamLower]) {
      return genericParamMappings[intentParamLower].includes(toolParamLower);
    }

    // 4. Check reverse mappings
    for (const [key, values] of Object.entries(genericParamMappings)) {
      if (values.includes(intentParamLower) && values.includes(toolParamLower)) {
        return true;
      }
    }

    // 5. Fuzzy matching
    const normalizedIntentParam = intentParamLower.replace(/_/g, '').replace(/-/g, '');
    const normalizedToolParam = toolParamLower.replace(/_/g, '').replace(/-/g, '');

    return (
      // Contains relationship
      normalizedIntentParam.includes(normalizedToolParam) ||
      normalizedToolParam.includes(normalizedIntentParam) ||
      // Simple edit distance
      this.calculateSimpleSimilarity(intentParamLower, toolParamLower) > 0.7 ||
      // Common prefix/suffix
      intentParamLower.startsWith(toolParamLower.substring(0, 3)) ||
      toolParamLower.startsWith(intentParamLower.substring(0, 3))
    );
  }

  /**
   * Calculate simple string similarity (0-1)
   */
  private calculateSimpleSimilarity(str1: string, str2: string): number {
    if (str1 === str2) {return 1.0;}

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    // If length difference is too large, similarity is low
    if (longer.length - shorter.length > 3) {
      return 0.0;
    }

    // Calculate common characters
    let commonChars = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        commonChars++;
      }
    }

    return commonChars / longer.length;
  }

  /**
   * Generic intent type based tool selection
   */
  private intentTypeBasedToolSelection(intent: AtomicIntent): ToolSelectionResult {
    // Generic intent type to tool pattern mappings
    const genericIntentTypeToToolPatterns: Record<string, string[]> = {
      // Data retrieval patterns
      'get_data': ['get', 'fetch', 'retrieve', 'read', 'obtain'],
      'list_data': ['list', 'show', 'display', 'enumerate', 'browse'],
      'create_data': ['create', 'make', 'generate', 'write', 'add'],
      'update_data': ['update', 'modify', 'edit', 'change', 'adjust'],
      'delete_data': ['delete', 'remove', 'erase', 'clear', 'drop'],

      // Communication patterns
      'send_message': ['send', 'post', 'message', 'notify', 'alert'],
      'receive_message': ['receive', 'get_message', 'read_message', 'fetch_message'],

      // Analysis patterns
      'analyze_content': ['analyze', 'review', 'evaluate', 'assess', 'check'],
      'summarize_content': ['summarize', 'abstract', 'condense', 'extract'],
      'generate_content': ['generate', 'create', 'write', 'compose'],

      // File operations
      'read_file': ['read', 'get', 'fetch', 'open', 'load'],
      'write_file': ['write', 'create', 'save', 'update', 'modify'],
      'list_files': ['list', 'show', 'display', 'browse', 'enumerate'],

      // Network operations
      'open_url': ['open', 'browse', 'navigate', 'visit', 'go'],
      'fetch_url': ['fetch', 'get', 'retrieve', 'download', 'load'],
      'search_web': ['search', 'find', 'lookup', 'query', 'discover'],

      // System operations
      'execute_command': ['execute', 'run', 'call', 'invoke', 'start'],
      'check_status': ['status', 'check', 'verify', 'validate', 'test'],
    };

    // Extract base intent type (remove suffixes like _with_ai, _to_slack, etc.)
    const baseIntentType = intent.type.replace(/_with_[a-z]+$/, '').replace(/_to_[a-z]+$/, '');

    // Get patterns for the base intent type
    const patterns = genericIntentTypeToToolPatterns[baseIntentType] || [];

    // Also try the full intent type
    const fullPatterns = genericIntentTypeToToolPatterns[intent.type] || [];
    const allPatterns = [...new Set([...patterns, ...fullPatterns])];

    for (const pattern of allPatterns) {
      const matchingTool = this.availableTools.find(tool =>
        tool.name.toLowerCase().includes(pattern.toLowerCase()) ||
        tool.description.toLowerCase().includes(pattern.toLowerCase()),
      );

      if (matchingTool) {
        return {
          intentId: intent.id,
          toolName: matchingTool.name,
          toolDescription: matchingTool.description,
          mappedParameters: this.simpleParameterMapping(intent.parameters, matchingTool),
          confidence: 0.4, // Lower confidence for type-based matching
        };
      }
    }

    // Try to find any tool that mentions the intent type or base type
    for (const tool of this.availableTools) {
      const toolNameLower = tool.name.toLowerCase();
      const toolDescLower = tool.description.toLowerCase();

      if (toolNameLower.includes(intent.type.toLowerCase()) ||
          toolDescLower.includes(intent.type.toLowerCase()) ||
          toolNameLower.includes(baseIntentType.toLowerCase()) ||
          toolDescLower.includes(baseIntentType.toLowerCase())) {
        return {
          intentId: intent.id,
          toolName: tool.name,
          toolDescription: tool.description,
          mappedParameters: this.simpleParameterMapping(intent.parameters, tool),
          confidence: 0.3,
        };
      }
    }

    // No type-based match found
    throw new Error('No type-based match found');
  }

  /**
   * Enhanced parameter mapping using ParameterMapper
   */
  private simpleParameterMapping(intentParams: Record<string, any>, tool: Tool): Record<string, any> {
    // Use ParameterMapper for intelligent parameter mapping
    return ParameterMapper.mapParameters(
      tool.name,
      tool.inputSchema,
      intentParams,
    );
  }

  /**
   * Extract URL from query
   */
  private extractUrl(query: string): string | null {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = query.match(urlRegex);
    return match ? match[0] : null;
  }

  /**
   * Extract keyword from query
   */
  private extractKeyword(query: string): string | null {
    // Simple extraction: look for content after "search for" or similar phrases
    const patterns = [
      /search\s+for\s+["']?([^"'\s]+)["']?/i,
      /search\s+["']?([^"'\s]+)["']?/i,
      /find\s+["']?([^"'\s]+)["']?/i,
      /look\s+for\s+["']?([^"'\s]+)["']?/i,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Build dependency graph
   */
  private buildDependencyGraph(intents: AtomicIntent[], edges: DependencyEdge[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    // Initialize graph with all intents
    intents.forEach(intent => {
      graph.set(intent.id, new Set());
    });

    // Add edges
    edges.forEach(edge => {
      const dependencies = graph.get(edge.to);
      if (dependencies) {
        dependencies.add(edge.from);
      }
    });

    return graph;
  }

  /**
   * Topological sort (Kahn's algorithm)
   */
  private topologicalSort(graph: Map<string, Set<string>>): string[] | null {
    const sorted: string[] = [];
    const indegree = new Map<string, number>();
    const queue: string[] = [];

    // Calculate indegree for each node
    graph.forEach((dependencies, node) => {
      indegree.set(node, dependencies.size);
      if (dependencies.size === 0) {
        queue.push(node);
      }
    });

    // Process nodes with zero indegree
    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);

      // Decrease indegree of neighbors
      graph.forEach((dependencies, neighbor) => {
        if (dependencies.has(node)) {
          const newIndegree = (indegree.get(neighbor) || 0) - 1;
          indegree.set(neighbor, newIndegree);

          if (newIndegree === 0) {
            queue.push(neighbor);
          }
        }
      });
    }

    // Check for cycles
    if (sorted.length !== graph.size) {
      return null; // Cycle detected
    }

    return sorted;
  }

  /**
   * Resolve parameters with variable substitution
   */
  private resolveParameters(
    parameters: Record<string, any>,
    context: ExecutionContext,
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string') {
        // Enhanced variable substitution with multiple formats
        // Format 1: {{intentId.field}} - direct field access
        // Format 2: {{intentId}} - get the entire result object
        // Format 3: {{intentId.workflowResult}} - get workflow result
        const varMatch = value.match(/\{\{([A-Za-z0-9_]+)(?:\.([A-Za-z0-9_]+))?\}\}/);
        if (varMatch) {
          const [, intentId, field] = varMatch;
          const result = context.results.get(intentId);

          if (result) {
            if (!field) {
              // If no field specified, extract the most useful content from the result
              resolved[key] = this.extractUsefulContent(result, intentId);
            } else if (typeof result === 'object' && field in result) {
              // If field exists in result, return it
              resolved[key] = result[field];
            } else {
              // Try to find the field in nested structures
              const nestedValue = this.findNestedValue(result, field);
              if (nestedValue !== undefined) {
                resolved[key] = nestedValue;
              } else {
                // Keep original if substitution fails
                resolved[key] = value;
              }
            }
          } else {
            // Keep original if intent result not found
            resolved[key] = value;
          }
        } else {
          resolved[key] = value;
        }
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Find nested value in object using dot notation or common field names
   */
  private findNestedValue(obj: any, field: string): any {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }

    // Try direct access first
    if (field in obj) {
      return obj[field];
    }

    // Try common aliases for AI results
    const commonAliases: Record<string, string[]> = {
      'content': ['summary', 'markdown', 'text', 'result', 'output'],
      'summary': ['content', 'markdown', 'text', 'result'],
      'result': ['content', 'summary', 'output', 'workflowResult'],
      'output': ['content', 'summary', 'result'],
    };

    // Check if field has aliases
    if (field in commonAliases) {
      for (const alias of commonAliases[field]) {
        if (alias in obj) {
          return obj[alias];
        }
      }
    }

    // Try dot notation for nested access
    if (field.includes('.')) {
      const parts = field.split('.');
      let current = obj;
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          return undefined;
        }
      }
      return current;
    }

    return undefined;
  }

  /**
   * Get available tools
   */
  getAvailableTools(): any[] {
    return [...this.availableTools];
  }

  /**
   * Extract useful content from result object for variable substitution
   * This method intelligently extracts the most relevant content from different types of tool results
   */
  private extractUsefulContent(result: any, intentId: string): any {
    logger.debug(`[CloudIntentEngine] extractUsefulContent called for intent ${intentId}, result type: ${typeof result}`);

    if (!result) {
      logger.debug('[CloudIntentEngine] Result is null or undefined');
      return result;
    }

    // If result is already a string, return it
    if (typeof result === 'string') {
      logger.debug(`[CloudIntentEngine] Result is string, length: ${result.length}`);
      return result;
    }

    // If result is an object, try to extract the most useful content
    if (typeof result === 'object') {
      logger.debug(`[CloudIntentEngine] Result is object, keys: ${Object.keys(result).join(', ')}`);

      // Check for common result structures

      // 1. GitHub MCP tool results (content array with text)
      if (Array.isArray(result.content) && result.content.length > 0) {
        logger.debug(`[CloudIntentEngine] Found content array with ${result.content.length} items`);
        const firstContent = result.content[0];
        if (firstContent && firstContent.text) {
          logger.debug(`[CloudIntentEngine] First content has text property, length: ${firstContent.text.length}`);
          try {
            // Try to parse JSON text
            const parsed = JSON.parse(firstContent.text);
            logger.debug('[CloudIntentEngine] Successfully parsed JSON from text');
            // Return the parsed JSON object for AI analysis
            return parsed;
          } catch (error) {
            logger.debug(`[CloudIntentEngine] Failed to parse JSON: ${error}`);
            // If not JSON, return the text as-is
            return firstContent.text;
          }
        }
      }

      // 2. AI tool results (with summary or content field)
      if (result.summary) {
        logger.debug('[CloudIntentEngine] Found summary field');
        return result.summary;
      }
      if (result.content && typeof result.content === 'string') {
        logger.debug(`[CloudIntentEngine] Found string content field, length: ${result.content.length}`);
        return result.content;
      }
      if (result.markdown) {
        logger.debug('[CloudIntentEngine] Found markdown field');
        return result.markdown;
      }
      if (result.text) {
        logger.debug('[CloudIntentEngine] Found text field');
        return result.text;
      }

      // 3. Standardized workflow result format
      if (result.workflowResult && result.workflowResult.content) {
        logger.debug('[CloudIntentEngine] Found workflowResult.content');
        return result.workflowResult.content;
      }

      // 4. For other objects, return the object as-is (will be JSON.stringify'd by AI tool)
      logger.debug('[CloudIntentEngine] No specific content found, returning object as-is');
      return result;
    }

    // For any other type, return as-is
    logger.debug(`[CloudIntentEngine] Result is other type: ${typeof result}`);
    return result;
  }

  /**
   * Get engine status
   */
  getStatus(): {
    initialized: boolean;
    toolsCount: number;
    llmProvider: string;
    llmConfigured: boolean;
    } {
    return {
      initialized: this.ai.getStatus().enabled,
      toolsCount: this.availableTools.length,
      llmProvider: this.config.llm.provider,
      llmConfigured: !!this.config.llm.apiKey,
    };
  }
}
