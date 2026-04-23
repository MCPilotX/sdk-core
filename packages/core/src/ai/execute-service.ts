/**
 * Execute Service
 * 
 * Provides a unified interface for both CLI and Web to use the same underlying
 * execution capabilities as the CLI run command.
 * 
 * This service bridges the gap between:
 * 1. CLI's powerful run command (using CloudIntentEngine directly)
 * 2. Web's limited intent parsing (using IntentService)
 * 
 * Key features:
 * - Full CloudIntentEngine capabilities for both CLI and Web
 * - Automatic server management and connection
 * - Complete workflow execution with tracking
 * - Support for natural language, JSON files, and named workflows
 */

import { CloudIntentEngine } from './cloud-intent-engine';
import { getToolRegistry } from '../tool-registry/registry';
import { getProcessManager } from '../process-manager/manager';
import { getRegistryClient } from '../registry/client';
import { getWorkflowManager } from '../workflow/manager';
import { WorkflowEngine } from '../workflow/engine';
import { AutoStartManager } from '../utils/auto-start-manager';
import { getAIConfig } from '../utils/config';
import { createCloudIntentEngine } from '../utils/cloud-intent-engine-factory';
import { MCPClient } from '../mcp/client';
import { logger } from '../core/logger';
import type { AIConfig } from '../core/types';
import type { WorkflowStep } from '../workflow/types';

// Server connection info
interface ConnectedServer {
  name: string;
  client: MCPClient;
}

// Execution options
export interface UnifiedExecutionOptions {
  autoStart?: boolean;
  keepAlive?: boolean;
  silent?: boolean;
  simulate?: boolean;
  params?: Record<string, any>;
}

// Execution result
export interface UnifiedExecutionResult {
  success: boolean;
  result?: any;
  executionSteps?: any[];
  error?: string;
  statistics?: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalDuration: number;
    averageStepDuration: number;
  };
}

// Workflow execution result
export interface WorkflowExecutionResult {
  success: boolean;
  results?: any;
  error?: string;
}

/**
 * Execute Service
 */
export class ExecuteService {
  private cloudIntentEngine: CloudIntentEngine | null = null;
  private connectedServers: Map<string, ConnectedServer> = new Map();
  private aiConfig: AIConfig | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    logger.debug('[ExecuteService] Creating service instance');
  }

  /**
   * Initialize the service with AI configuration
   */
  async initialize(aiConfig?: AIConfig): Promise<void> {
    logger.info('[ExecuteService] Initializing service');
    
    if (!this.initPromise) {
      this.initPromise = (async () => {
        // Use provided AI config or get from system
        this.aiConfig = aiConfig || await getAIConfig();
        
        if (!this.aiConfig.provider || !this.aiConfig.apiKey) {
          throw new Error('AI configuration not set. Please configure AI provider and API key.');
        }

        // Create CloudIntentEngine using the unified factory
        this.cloudIntentEngine = await createCloudIntentEngine({
          aiConfig: this.aiConfig
        });

        logger.debug('[ExecuteService] Service initialized successfully');
      })();
    }

    await this.initPromise;
  }

  /**
   * Execute natural language query (similar to CLI run command)
   */
  async executeNaturalLanguage(
    query: string,
    options: UnifiedExecutionOptions = {}
  ): Promise<UnifiedExecutionResult> {
    logger.info(`[ExecuteService] Executing natural language query: "${query.substring(0, 100)}..."`);
    
    try {
      // Ensure service is initialized
      await this.initialize();
      
      if (!this.cloudIntentEngine) {
        throw new Error('CloudIntentEngine not initialized');
      }

      // Handle auto-start if requested
      if (options.autoStart) {
        await this.handleAutoStart(query, options);
      }

      // Connect to running MCP servers or use simulation mode
      if (!options.simulate) {
        await this.connectToRunningServers(options);
      }

      // Get available tools and set them in the engine
      const tools = await this.getAvailableTools();
      this.cloudIntentEngine.setAvailableTools(tools);

      // Create tool executor
      const toolExecutor = this.createToolExecutor();

      // Parse and execute the workflow
      const plan = await this.cloudIntentEngine.parseAndPlan(query);
      
      const result = await this.cloudIntentEngine.executeWorkflowWithTracking(
        plan.parsedIntents,
        plan.toolSelections,
        plan.dependencies,
        toolExecutor
      );

      // Cleanup if not keeping connection alive
      if (!options.keepAlive) {
        await this.cleanupConnections();
      }

      return {
        success: result.success,
        result: result.finalResult,
        executionSteps: result.executionSteps,
        statistics: result.statistics,
        error: result.success ? undefined : result.finalResult
      };

    } catch (error: any) {
      logger.error(`[ExecuteService] Failed to execute natural language query: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute workflow from JSON file
   */
  async executeWorkflowFromFile(
    filePath: string,
    params: Record<string, any> = {},
    options: UnifiedExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    logger.info(`[ExecuteService] Executing workflow from file: ${filePath}`);
    
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(filePath, 'utf-8');
      const workflow = JSON.parse(data);
      
      return await this.executeWorkflow(workflow, params, options);
    } catch (error: any) {
      logger.error(`[ExecuteService] Failed to execute workflow from file: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute named workflow
   */
  async executeNamedWorkflow(
    workflowName: string,
    params: Record<string, any> = {},
    options: UnifiedExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    logger.info(`[ExecuteService] Executing named workflow: "${workflowName}"`);
    
    try {
      const workflowManager = getWorkflowManager();
      
      if (!await workflowManager.exists(workflowName)) {
        throw new Error(`Workflow "${workflowName}" not found`);
      }
      
      const workflow = await workflowManager.load(workflowName);
      return await this.executeWorkflow(workflow, params, options);
    } catch (error: any) {
      logger.error(`[ExecuteService] Failed to execute named workflow: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute workflow object
   */
  async executeWorkflow(
    workflow: any,
    params: Record<string, any> = {},
    options: UnifiedExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    logger.info(`[ExecuteService] Executing workflow: ${workflow.name || 'unnamed'}`);
    
    try {
      const workflowEngine = new WorkflowEngine();
      
      // Handle auto-start if requested
      if (options.autoStart) {
        await this.ensureServersForWorkflow(workflow, options);
      }

      // Connect to running servers if not in simulation mode
      if (!options.simulate) {
        await this.connectToRunningServers(options);
      }

      // Execute the workflow
      const results = await workflowEngine.execute(workflow, params);

      // Cleanup if not keeping connection alive
      if (!options.keepAlive) {
        await this.cleanupConnections();
      }

      return {
        success: true,
        results
      };
    } catch (error: any) {
      logger.error(`[ExecuteService] Failed to execute workflow: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse intent and return workflow steps (for Web UI)
   */
  async parseIntent(
    intent: string,
    context?: any
  ): Promise<{
    steps: WorkflowStep[];
    status: 'success' | 'capability_missing' | 'partial';
    confidence?: number;
    explanation?: string;
  }> {
    logger.info(`[ExecuteService] Parsing intent: "${intent.substring(0, 100)}..."`);
    
    try {
      // Ensure service is initialized
      await this.initialize();
      
      if (!this.cloudIntentEngine) {
        throw new Error('CloudIntentEngine not initialized');
      }

      // Get available tools
      const toolRegistry = getToolRegistry();
      await toolRegistry.load();
      const allTools = await toolRegistry.getAllTools();
      
      if (allTools.length === 0) {
        return {
          steps: [],
          status: 'capability_missing',
          confidence: 0,
          explanation: 'No MCP tools available. Please start some MCP servers first.'
        };
      }

      // Convert tools to CloudIntentEngine format
      const tools = allTools.map((toolMetadata: any) => ({
        name: toolMetadata.name,
        description: toolMetadata.description,
        inputSchema: {
          type: 'object' as const,
          properties: toolMetadata.parameters || {},
          required: Object.entries(toolMetadata.parameters || {})
            .filter(([_, schema]: [string, any]) => schema.required)
            .map(([name]) => name)
        }
      }));

      // Set available tools
      this.cloudIntentEngine.setAvailableTools(tools);

      // Parse and plan
      const plan = await this.cloudIntentEngine.parseAndPlan(intent);

      // Convert to workflow steps
      const steps: WorkflowStep[] = [];
      for (const atomicIntent of plan.parsedIntents) {
        const toolSelection = plan.toolSelections?.find(
          (selection: any) => selection.intentId === atomicIntent.id
        );

        if (toolSelection && toolSelection.toolName) {
          const serverId = await this.extractServerId(toolSelection.toolName, context);
          const step: WorkflowStep = {
            id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'tool',
            serverId: serverId,
            toolName: toolSelection.toolName,
            parameters: toolSelection.mappedParameters || atomicIntent.parameters
          };
          
          steps.push(step);
        }
      }

      const status = steps.length > 0 ? 'success' : 'partial';
      const confidence = this.calculateConfidence(plan);
      const explanation = this.generateExplanation(plan, tools.length);

      return {
        steps,
        status,
        confidence,
        explanation
      };

    } catch (error: any) {
      logger.error(`[ExecuteService] Failed to parse intent: ${error.message}`);
      return {
        steps: [],
        status: 'capability_missing',
        confidence: 0,
        explanation: `Failed to parse intent: ${error.message}`
      };
    }
  }

  // ==================== Private Methods ====================

  private async handleAutoStart(query: string, options: UnifiedExecutionOptions): Promise<void> {
    if (!options.autoStart) return;
    
    logger.debug('[ExecuteService] Handling auto-start');
    
    const autoStartManager = new AutoStartManager();
    const requiredServers = await autoStartManager.analyzeIntentForServers(query);
    
    if (requiredServers.length > 0) {
      const results = await autoStartManager.ensureServersRunning(requiredServers);
      
      if (!autoStartManager.areAllServersReady(results)) {
        throw new Error('Some required servers failed to start');
      }
      
      logger.debug(`[ExecuteService] Auto-started ${requiredServers.length} servers`);
    }
  }

  private async connectToRunningServers(options: UnifiedExecutionOptions): Promise<void> {
    const processManager = getProcessManager();
    const runningServers = await processManager.listRunning();
    
    if (runningServers.length === 0) {
      logger.warn('[ExecuteService] No running MCP servers found');
      return;
    }
    
    logger.debug(`[ExecuteService] Connecting to ${runningServers.length} running servers`);
    
    for (const server of runningServers) {
      try {
        const registryClient = getRegistryClient();
        const manifest = await registryClient.getCachedManifest(server.serverName);
        
        if (manifest) {
          await this.connectToServer(server.serverName, manifest);
        }
      } catch (error: any) {
        if (!options.silent) {
          logger.warn(`[ExecuteService] Failed to connect to ${server.serverName}: ${error.message}`);
        }
      }
    }
  }

  private async connectToServer(serverName: string, manifest: any): Promise<void> {
    if (this.connectedServers.has(serverName)) {
      return; // Already connected
    }
    
    try {
      const client = new MCPClient({
        transport: {
          type: 'stdio' as const,
          command: manifest.runtime.command,
          args: manifest.runtime.args || [],
          env: { ...process.env } as Record<string, string>
        }
      });

      await client.connect();
      
      this.connectedServers.set(serverName, {
        name: serverName,
        client
      });
      
      logger.debug(`[ExecuteService] Connected to server: ${serverName}`);
    } catch (error: any) {
      logger.error(`[ExecuteService] Failed to connect to server ${serverName}: ${error.message}`);
      throw error;
    }
  }

  private async getAvailableTools(): Promise<any[]> {
    const tools: any[] = [];
    
    for (const [name, server] of this.connectedServers) {
      try {
        const serverTools = await server.client.listTools();
        tools.push(...serverTools.map((tool: any) => ({
          ...tool,
          serverName: name
        })));
      } catch (error: any) {
        logger.error(`[ExecuteService] Failed to list tools for server ${name}: ${error.message}`);
      }
    }
    
    return tools;
  }

  private createToolExecutor(): (toolName: string, params: Record<string, any>) => Promise<any> {
    return async (toolName: string, params: Record<string, any>): Promise<any> => {
      // Find which server has this tool
      for (const [serverName, server] of this.connectedServers) {
        const serverTools = await server.client.listTools();
        const tool = serverTools.find((t: any) => t.name === toolName);
        
        if (tool) {
          logger.info(`[ExecuteService] Calling tool ${toolName} on server ${serverName}`);
          return await server.client.callTool(toolName, params);
        }
      }
      
      throw new Error(`Tool ${toolName} not found in any connected server`);
    };
  }

  private async ensureServersForWorkflow(workflow: any, options: UnifiedExecutionOptions): Promise<void> {
    const requiredServers = new Set<string>();
    
    for (const step of workflow.steps || []) {
      if (step.serverId || step.serverName) {
        requiredServers.add(step.serverId || step.serverName);
      }
    }
    
    if (requiredServers.size > 0) {
      const autoStartManager = new AutoStartManager();
      const results = await autoStartManager.ensureServersRunning(Array.from(requiredServers));
      
      if (!autoStartManager.areAllServersReady(results)) {
        throw new Error('Some required servers failed to start');
      }
    }
  }

  private async cleanupConnections(): Promise<void> {
    logger.debug('[ExecuteService] Cleaning up connections');
    
    const disconnectPromises: Promise<void>[] = [];
    for (const [name] of this.connectedServers) {
      disconnectPromises.push(this.disconnectServer(name));
    }
    
    await Promise.allSettled(disconnectPromises);
    this.connectedServers.clear();
  }

  private async disconnectServer(serverName: string): Promise<void> {
    const server = this.connectedServers.get(serverName);
    if (server) {
      try {
        await server.client.disconnect();
        logger.debug(`[ExecuteService] Disconnected from server: ${serverName}`);
      } catch (error: any) {
        logger.error(`[ExecuteService] Failed to disconnect from server ${serverName}: ${error.message}`);
      }
    }
  }

  private async extractServerId(toolName: string, context?: any): Promise<string> {
    // Try to get server name from tool registry
    try {
      const toolRegistry = getToolRegistry();
      const allTools = await toolRegistry.getAllTools();
      const toolMetadata = allTools.find((tool: any) => tool.name === toolName);
      
      if (toolMetadata && toolMetadata.serverName) {
        const serverName = toolMetadata.serverName;
        const actualServerName = serverName.replace(/^(github:|gitee:|gitlab:)/, '');
        return actualServerName;
      }
    } catch (error) {
      logger.warn(`[ExecuteService] Failed to get server from registry for tool "${toolName}":`, error);
    }
    
    // Fallback
    if (context?.availableServers && context.availableServers.length > 0) {
      return context.availableServers[0];
    }
    
    return 'generic-service';
  }

  private calculateConfidence(plan: any): number {
    if (!plan || !plan.parsedIntents || plan.parsedIntents.length === 0) {
      return 0;
    }
    
    let confidence = 0.5;
    confidence += plan.parsedIntents.length * 0.1;
    
    if (plan.toolSelections && plan.toolSelections.length > 0) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 0.95);
  }

  private generateExplanation(plan: any, toolCount: number): string {
    if (!plan || !plan.parsedIntents || plan.parsedIntents.length === 0) {
      return 'Unable to parse intent. Please try rephrasing your request.';
    }
    
    const intentCount = plan.parsedIntents.length;
    const toolSelectionCount = plan.toolSelections?.length || 0;
    
    let explanation = `Parsed ${intentCount} intent${intentCount > 1 ? 's' : ''} `;
    explanation += `from ${toolCount} available tool${toolCount > 1 ? 's' : ''}. `;
    
    if (toolSelectionCount > 0) {
      explanation += `Selected ${toolSelectionCount} tool${toolSelectionCount > 1 ? 's' : ''} for execution.`;
    } else {
      explanation += 'No specific tools selected. Using generic execution.';
    }
    
    return explanation;
  }
}

// Singleton instance for easy access
let unifiedExecutionServiceInstance: ExecuteService | null = null;

export function getExecuteService(): ExecuteService {
  if (!unifiedExecutionServiceInstance) {
    unifiedExecutionServiceInstance = new ExecuteService();
  }
  return unifiedExecutionServiceInstance;
}

export function createExecuteService(): ExecuteService {
  return new ExecuteService();
}