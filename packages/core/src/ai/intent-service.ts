/**
 * Uses local CloudIntentEngine for LLM-driven intent parsing
 */

import { CloudIntentEngine } from './cloud-intent-engine';
import { getToolRegistry } from '../tool-registry/registry';
import type { WorkflowStep } from '../workflow/types';
import type { AIConfig } from '../utils/config';
import { createCloudIntentEngine } from '../utils/cloud-intent-engine-factory';

export interface IntentParseRequest {
  intent: string;
  context?: {
    previousSteps?: any[];
    availableServers?: string[];
    userPreferences?: Record<string, any>;
  };
}

export interface IntentParseResponse {
  success: boolean;
  data?: {
    steps: WorkflowStep[];
    status: 'success' | 'capability_missing' | 'partial';
    confidence?: number;
    explanation?: string;
  };
  error?: string;
}

export class IntentService {
  private cloudIntentEngine: CloudIntentEngine;
  private toolRegistry: any;
  private aiConfig: AIConfig;
  private initPromise: Promise<void> | null = null;
  
  constructor(aiConfig?: AIConfig) {
    // Use provided AI config or load from environment variables as fallback
    this.aiConfig = aiConfig || this.loadConfigFromEnvironment();
    
    // Initialize CloudIntentEngine using the unified factory
    // Note: We'll create the engine in parseIntent to handle async initialization
    this.cloudIntentEngine = null as any; // Will be initialized in parseIntent
    
    // Get the tool registry instance
    this.toolRegistry = getToolRegistry();
  }
  
  /**
   * Load AI configuration from environment variables (fallback method)
   */
  private loadConfigFromEnvironment(): AIConfig {
    return {
      provider: process.env.LLM_PROVIDER as any || 'none',
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL || 'none'
    };
  }
  
  /**
   * Initialize the CloudIntentEngine if not already initialized
   */
  private async initializeEngine(): Promise<void> {
    if (!this.cloudIntentEngine) {
      // Create CloudIntentEngine using the unified factory
      this.cloudIntentEngine = await createCloudIntentEngine({
        aiConfig: this.aiConfig
      });
      console.log('[IntentService] CloudIntentEngine initialized using unified factory');
    }
  }
  
  async parseIntent(request: IntentParseRequest): Promise<IntentParseResponse> {
    const { intent, context } = request;
    
    try {
      console.log(`[IntentService] Parsing intent: "${intent}"`);
      
      // Initialize if needed
      if (!this.initPromise) {
        this.initPromise = (async () => {
          if (this.aiConfig.apiKey) {
            console.log(`[IntentService] Configuring AI with provider: ${this.aiConfig.provider || 'openai'}, model: ${this.aiConfig.model || 'gpt-3.5-turbo'}`);
            // AI configuration is handled by CloudIntentEngine factory
          }
          await this.toolRegistry.load();
          
          // Initialize the CloudIntentEngine
          await this.initializeEngine();
        })();
      }
      
      await this.initPromise;
      
      // Get all available tools from the registry
      const allTools = await this.toolRegistry.getAllTools();
      
      // Convert ToolMetadata to the format expected by @mcpilotx/core
      const tools = allTools.map((toolMetadata: any) => ({
        name: toolMetadata.name,
        description: toolMetadata.description,
        inputSchema: {
          type: 'object',
          properties: toolMetadata.parameters || {},
          required: Object.entries(toolMetadata.parameters || {})
            .filter(([_, schema]: [string, any]) => schema.required)
            .map(([name]) => name)
        }
      }));
      
      if (tools.length === 0) {
        return {
          success: true,
          data: {
            steps: [],
            status: 'capability_missing',
            confidence: 0,
            explanation: 'No MCP tools available. Please start some MCP servers first.'
          }
        };
      }
      
      console.log(`[IntentService] Found ${tools.length} available tools`);
      
      // Set available tools for the intent engine
      this.cloudIntentEngine.setAvailableTools(tools);
      
      // Parse and plan the intent using CloudIntentEngine (includes tool selection)
      console.log('[IntentService] Calling parseAndPlan...');
      const plan = await this.cloudIntentEngine.parseAndPlan(intent);
      console.log('[IntentService] parseAndPlan completed, plan structure:', {
        hasIntents: !!plan?.parsedIntents,
        intentCount: plan?.parsedIntents?.length || 0,
        hasToolSelections: !!plan?.toolSelections,
        toolSelectionCount: plan?.toolSelections?.length || 0,
        planKeys: plan ? Object.keys(plan) : []
      });
      
      // Convert the plan to workflow steps
      const steps = await this.convertToWorkflowSteps(plan, context);
      console.log('[IntentService] Converted to', steps.length, 'workflow steps');
      
      return {
        success: true,
        data: {
          steps,
          status: steps.length > 0 ? 'success' : 'partial',
          confidence: this.calculateConfidence(plan),
          explanation: this.generateExplanation(plan, tools.length)
        }
      };
      
    } catch (error: any) {
      console.error('[IntentService] Error parsing intent:', error);
      
      // Return error response when LLM fails
      return {
        success: false,
        error: `Failed to parse intent: ${error.message}`
      };
    }
  }
  
  private async convertToWorkflowSteps(parseResult: any, context?: any): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = [];
    
    // Check if we have a valid parse result
    if (!parseResult || !parseResult.parsedIntents || parseResult.parsedIntents.length === 0) {
      return steps;
    }
    
    // Convert each atomic intent to a workflow step
    for (const atomicIntent of parseResult.parsedIntents) {
      const stepId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Find the best matching tool for this intent
      const toolSelection = parseResult.toolSelections?.find(
        (selection: any) => selection.intentId === atomicIntent.id
      );
      
      if (toolSelection && toolSelection.toolName) {
        const serverId = await this.extractServerId(toolSelection.toolName, context);
        const step: WorkflowStep = {
          id: stepId,
          type: 'tool', // Add type field for frontend compatibility
          serverId: serverId,
          toolName: toolSelection.toolName,
          parameters: await this.adaptParameters(atomicIntent.parameters, { name: toolSelection.toolName })
        };
        
        steps.push(step);
      }
    }
    
    return steps;
  }
  
  private async extractServerId(toolName: string, context?: any): Promise<string> {
    console.log(`[IntentService] extractServerId called for tool: "${toolName}"`);
    
    // First, try to get server name from tool registry
    try {
      console.log(`[IntentService] Trying to get all tools from registry...`);
      const allTools = await this.toolRegistry.getAllTools();
      console.log(`[IntentService] Got ${allTools ? (Array.isArray(allTools) ? allTools.length : 'non-array') : 'null'} tools from registry`);
      
      if (allTools && Array.isArray(allTools)) {
        console.log(`[IntentService] Looking for tool "${toolName}" in ${allTools.length} tools`);
        const toolMetadata = allTools.find((tool: any) => tool.name === toolName);
        
        if (toolMetadata) {
          console.log(`[IntentService] Found tool metadata for "${toolName}":`, {
            hasServerName: !!toolMetadata.serverName,
            serverName: toolMetadata.serverName,
            toolName: toolMetadata.name,
            description: toolMetadata.description
          });
          
          if (toolMetadata.serverName) {
            // Extract actual server name from serverName field
            // serverName format might be like "github:Joooook/12306-mcp" or "Joooook/12306-mcp"
            const serverName = toolMetadata.serverName;
            // Remove prefix like "github:" if present
            const actualServerName = serverName.replace(/^(github:|gitee:|gitlab:)/, '');
            console.log(`[IntentService] Found server for tool "${toolName}": ${actualServerName} (original: ${serverName})`);
            return actualServerName;
          } else {
            console.warn(`[IntentService] Tool "${toolName}" found in registry but serverName is missing`);
          }
        } else {
          console.warn(`[IntentService] Tool "${toolName}" not found in registry. Available tools:`, 
            allTools.map((t: any) => t.name).slice(0, 10));
        }
      } else {
        console.warn(`[IntentService] getAllTools() returned non-array or null:`, allTools);
      }
    } catch (error) {
      console.warn(`[IntentService] Failed to get server from registry for tool "${toolName}":`, error);
    }
    
    // Fallback: Try to extract server ID from tool name or context
    if (context?.availableServers && context.availableServers.length > 0) {
      console.log(`[IntentService] Trying context.availableServers (${context.availableServers.length} servers):`, context.availableServers);
      // Look for a server that might match the tool
      for (const server of context.availableServers) {
        if (toolName.includes(server) || server.includes(toolName.split('.')[0])) {
          console.log(`[IntentService] Found matching server in context: ${server}`);
          return server;
        }
      }
      
      // Return the first available server as fallback
      console.log(`[IntentService] No matching server found, using first available: ${context.availableServers[0]}`);
      return context.availableServers[0];
    } else {
      console.log(`[IntentService] No context.availableServers provided`);
    }
    
    // Ultimate fallback - use generic service
    console.warn(`[IntentService] Using generic-service as fallback for tool "${toolName}"`);
    return 'generic-service';
  }
  
  private async adaptParameters(intentParams: Record<string, any>, tool: any): Promise<Record<string, any>> {
    const toolName = tool.name || '';
    
    console.log(`[IntentService] adaptParameters called for tool: "${toolName}"`);
    console.log(`[IntentService] Intent params:`, JSON.stringify(intentParams, null, 2));
    
    const adapted: Record<string, any> = {};
    
    try {
      // Get actual tool metadata from registry
      const allTools = await this.toolRegistry.getAllTools();
      const toolMetadata = allTools.find((t: any) => t.name === toolName);
      
      if (toolMetadata && toolMetadata.parameters) {
        const actualSchema = toolMetadata.parameters;
        const actualParamNames = Object.keys(actualSchema);
        console.log(`[IntentService] Actual tool schema properties:`, actualParamNames);
        
        // Track which intent parameters have been mapped
        const mappedIntentKeys = new Set<string>();
        
        // First pass: direct matches with actual parameter names
        for (const [intentKey, intentValue] of Object.entries(intentParams)) {
          console.log(`[IntentService] Processing intent parameter: "${intentKey}" = "${intentValue}"`);
          
          // 1. Check direct match with actual parameter name
          if (actualSchema[intentKey]) {
            adapted[intentKey] = intentValue;
            mappedIntentKeys.add(intentKey);
            console.log(`[IntentService]   ✓ Direct match: "${intentKey}" -> "${intentKey}" (actual schema)`);
            continue;
          }
          
          // 2. If not mapped, try case-insensitive and underscore/hyphen variations
          let mapped = false;
          const intentKeyLower = intentKey.toLowerCase().replace(/[_-]/g, '');
          for (const schemaKey of actualParamNames) {
            const schemaKeyLower = schemaKey.toLowerCase().replace(/[_-]/g, '');
            if (intentKeyLower === schemaKeyLower) {
              adapted[schemaKey] = intentValue;
              mappedIntentKeys.add(intentKey);
              console.log(`[IntentService]   ✓ Normalized match: "${intentKey}" -> "${schemaKey}" (after normalization)`);
              mapped = true;
              break;
            }
          }
          
          // 3. If still not mapped, try partial matches
          if (!mapped) {
            const intentKeyLower = intentKey.toLowerCase();
            for (const schemaKey of actualParamNames) {
              const schemaKeyLower = schemaKey.toLowerCase();
              if (intentKeyLower.includes(schemaKeyLower) || schemaKeyLower.includes(intentKeyLower)) {
                adapted[schemaKey] = intentValue;
                mappedIntentKeys.add(intentKey);
                console.log(`[IntentService]   ✓ Partial match: "${intentKey}" -> "${schemaKey}" (partial match)`);
                mapped = true;
                break;
              }
            }
          }
          
          // 4. If still not mapped, try description matching
          if (!mapped) {
            for (const [schemaKey, paramSchema] of Object.entries(actualSchema)) {
              const paramInfo = paramSchema as any;
              // Check if intent key matches parameter description
              if (paramInfo.description && paramInfo.description.toLowerCase().includes(intentKey.toLowerCase())) {
                adapted[schemaKey] = intentValue;
                mappedIntentKeys.add(intentKey);
                console.log(`[IntentService]   ✓ Description match: "${intentKey}" -> "${schemaKey}" (via description)`);
                mapped = true;
                break;
              }
            }
          }
          
          if (!mapped) {
            console.log(`[IntentService]   ✗ No match found for parameter: "${intentKey}"`);
          }
        }
        
        // Remove any parameters that don't match the actual schema
        // (e.g., remove from_station if we have fromStation)
        const finalAdapted: Record<string, any> = {};
        for (const [key, value] of Object.entries(adapted)) {
          if (actualSchema[key]) {
            finalAdapted[key] = value;
          } else {
            console.log(`[IntentService]   ✗ Removing parameter "${key}" - not in actual schema`);
          }
        }
        
        // Second pass: handle date format conversion for any parameter that looks like a date
        for (const [key, value] of Object.entries(finalAdapted)) {
          if (typeof value === 'string') {
            // Check if this parameter name suggests it's a date
            const keyLower = key.toLowerCase();
            const isDateParam = keyLower.includes('date') || 
                               keyLower.includes('time') ||
                               keyLower.includes('day') ||
                               keyLower.includes('month') ||
                               keyLower.includes('year');
            
            // Also check if the value looks like a date
            const looksLikeDate = this.looksLikeDate(value);
            
            if (isDateParam || looksLikeDate) {
              const normalizedDate = this.normalizeDate(value);
              if (normalizedDate !== value) {
                finalAdapted[key] = normalizedDate;
                console.log(`[IntentService] Normalized date parameter "${key}": "${value}" -> "${normalizedDate}"`);
              }
            }
          }
        }
        
        // Third pass: ensure required parameters are present
        this.ensureRequiredParameters(finalAdapted, actualSchema, toolName);
        
        console.log(`[IntentService] Final adapted parameters:`, JSON.stringify(finalAdapted, null, 2));
        return finalAdapted;
        
      } else {
        console.warn(`[IntentService] No metadata found for tool "${toolName}", using intent params as-is`);
        // Fallback: filter intent params to only include valid ones
        const filteredParams: Record<string, any> = {};
        for (const [key, value] of Object.entries(intentParams)) {
          // Keep the parameter if it looks reasonable
          if (key && value !== undefined && value !== null) {
            filteredParams[key] = value;
          }
        }
        console.log(`[IntentService] Fallback parameters:`, JSON.stringify(filteredParams, null, 2));
        return filteredParams;
      }
      
    } catch (error) {
      console.warn(`[IntentService] Failed to get tool metadata for "${toolName}":`, error);
      // Fallback to using intent params as-is (filtered)
      const filteredParams: Record<string, any> = {};
      for (const [key, value] of Object.entries(intentParams)) {
        if (key && value !== undefined && value !== null) {
          filteredParams[key] = value;
        }
      }
      console.log(`[IntentService] Error fallback parameters:`, JSON.stringify(filteredParams, null, 2));
      return filteredParams;
    }
  }
  
  /**
   * Check if a string looks like a date
   */
  private looksLikeDate(str: string): boolean {
    if (!str || typeof str !== 'string') {
      return false;
    }
    
    const trimmed = str.trim().toLowerCase();
    
    // Check for relative dates (expanded list)
    const relativeDates = [
      '今天', '明天', '后天', '大后天', '昨天', '前天',
      'today', 'tomorrow', 'yesterday', 'day after tomorrow', 'day before yesterday',
      'now', 'now()', 'next week', 'next month', 'next year',
      'this week', 'this month', 'this year',
      'last week', 'last month', 'last year'
    ];
    if (relativeDates.includes(trimmed)) {
      return true;
    }
    
    // Check for Chinese date format
    if (/^\d{4}年\d{1,2}月\d{1,2}日$/.test(trimmed)) {
      return true;
    }
    
    // Check for yyyy-MM-dd format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return true;
    }
    
    // Check for other date formats
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) { // MM/DD/YYYY
      return true;
    }
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(trimmed)) { // YYYY/MM/DD
      return true;
    }
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) { // MM-DD-YYYY
      return true;
    }
    
    // Check for common date patterns
    if (trimmed.includes('/') || trimmed.includes('-') || trimmed.includes('年') || trimmed.includes('月') || trimmed.includes('日')) {
      return true;
    }
    
    // Check for weekdays
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
                     '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
    if (weekdays.includes(trimmed)) {
      return true;
    }
    
    // Try to parse with Date object (more robust)
    try {
      // Try parsing as ISO string
      const isoParsed = new Date(trimmed);
      if (!isNaN(isoParsed.getTime())) {
        return true;
      }
      
      // Try parsing with Date.parse
      const timestamp = Date.parse(trimmed);
      if (!isNaN(timestamp)) {
        return true;
      }
    } catch {
      return false;
    }
    
    return false;
  }
  
  /**
   * Format a Date object as yyyy-MM-dd string (local date, not UTC)
   */
  private formatDateAsYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Normalize date string to yyyy-MM-dd format
   */
  private normalizeDate(dateStr: string): string {
    if (!dateStr || typeof dateStr !== 'string') {
      return dateStr;
    }
    
    // Remove whitespace
    const trimmed = dateStr.trim();
    
    // Check if already in yyyy-MM-dd format
    const yyyyMmDdRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (yyyyMmDdRegex.test(trimmed)) {
      return trimmed;
    }
    
    // Try to parse various date formats
    try {
      // Handle Chinese date formats like "2026年5月6日"
      const chineseMatch = trimmed.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
      if (chineseMatch) {
        const [, year, month, day] = chineseMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Handle relative dates (expanded list)
      const relativeDates: Record<string, number> = {
        // Chinese relative dates
        '今天': 0, '明天': 1, '后天': 2, '大后天': 3,
        '昨天': -1, '前天': -2,
        
        // English relative dates
        'today': 0, 'tomorrow': 1, 'day after tomorrow': 2,
        'yesterday': -1, 'day before yesterday': -2,
        'now': 0, 'now()': 0,
        
        // Week-based relative dates (simplified)
        'next week': 7, 'this week': 0, 'last week': -7,
        'next month': 30, 'this month': 0, 'last month': -30,
        'next year': 365, 'this year': 0, 'last year': -365
      };
      
      const trimmedLower = trimmed.toLowerCase();
      if (relativeDates[trimmedLower] !== undefined) {
        const today = new Date();
        const daysToAdd = relativeDates[trimmedLower];
        today.setDate(today.getDate() + daysToAdd);
        return this.formatDateAsYYYYMMDD(today);
      }
      
      // Handle weekdays (simplified - next occurrence)
      const weekdays: Record<string, number> = {
        'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 
        'friday': 5, 'saturday': 6, 'sunday': 0,
        '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4,
        '星期五': 5, '星期六': 6, '星期日': 0, '星期天': 0
      };
      
      if (weekdays[trimmedLower] !== undefined) {
        const today = new Date();
        const targetDay = weekdays[trimmedLower];
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd < 0) {
          daysToAdd += 7; // Next week
        } else if (daysToAdd === 0) {
          daysToAdd = 7; // Same day, next week
        }
        
        today.setDate(today.getDate() + daysToAdd);
        return this.formatDateAsYYYYMMDD(today);
      }
      
      // Try to parse with Date object (more robust)
      // First try Date.parse which handles many formats
      const timestamp = Date.parse(trimmed);
      if (!isNaN(timestamp)) {
        const parsedDate = new Date(timestamp);
        return this.formatDateAsYYYYMMDD(parsedDate);
      }
      
      // Try parsing as new Date
      const parsedDate = new Date(trimmed);
      if (!isNaN(parsedDate.getTime())) {
        return this.formatDateAsYYYYMMDD(parsedDate);
      }
      
      // Try parsing common date formats
      // MM/DD/YYYY or DD/MM/YYYY
      const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (slashMatch) {
        const [, month, day, year] = slashMatch;
        const monthNum = parseInt(month);
        const dayNum = parseInt(day);
        const yearNum = parseInt(year);
        
        // Try MM/DD/YYYY (US format) first
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          // Use local date to avoid timezone issues
          const usDate = new Date(yearNum, monthNum - 1, dayNum);
          if (!isNaN(usDate.getTime())) {
            return this.formatDateAsYYYYMMDD(usDate);
          }
        }
        
        // Try DD/MM/YYYY (European format)
        if (dayNum >= 1 && dayNum <= 12 && monthNum >= 1 && monthNum <= 31) {
          // Use local date to avoid timezone issues
          const euDate = new Date(yearNum, dayNum - 1, monthNum);
          if (!isNaN(euDate.getTime())) {
            return this.formatDateAsYYYYMMDD(euDate);
          }
        }
      }
      
      // DD-MM-YYYY
      const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (dashMatch) {
        const [, day, month, year] = dashMatch;
        // Try DD-MM-YYYY (European format)
        const euDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(euDate.getTime())) {
          return this.formatDateAsYYYYMMDD(euDate);
        }
        // If that fails, try MM-DD-YYYY (US format)
        const usDate = new Date(parseInt(year), parseInt(day) - 1, parseInt(month));
        if (!isNaN(usDate.getTime())) {
          return this.formatDateAsYYYYMMDD(usDate);
        }
      }
      
      // YYYY/MM/DD
      const yyyySlashMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
      if (yyyySlashMatch) {
        const [, year, month, day] = yyyySlashMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return this.formatDateAsYYYYMMDD(date);
        }
      }
      
    } catch (error) {
      // If parsing fails, return original
    }
    
    return trimmed;
  }
  
  /**
   * Ensure required parameters are present
   */
  private ensureRequiredParameters(adaptedParams: Record<string, any>, actualSchema: Record<string, any>, toolName: string): void {
    console.log(`[IntentService] Checking required parameters for tool: "${toolName}"`);
    
    const missingParams: string[] = [];
    
    for (const [paramName, paramSchema] of Object.entries(actualSchema)) {
      const paramInfo = paramSchema as any;
      if (paramInfo.required && !adaptedParams[paramName]) {
        missingParams.push(paramName);
        console.log(`[IntentService]   ⚠️  Missing required parameter: "${paramName}"`);
      }
    }
    
    if (missingParams.length > 0) {
      console.log(`[IntentService]   ⚠️  Tool "${toolName}" requires parameters: ${missingParams.join(', ')}`);
    } else {
      console.log(`[IntentService]   ✓ All required parameters present for tool: "${toolName}"`);
    }
  }
  
  private calculateConfidence(parseResult: any): number {
    if (!parseResult || !parseResult.parsedIntents || parseResult.parsedIntents.length === 0) {
      return 0;
    }
    
    // Simple confidence calculation based on:
    // 1. Number of intents parsed
    // 2. Whether tools were selected
    // 3. Parameter extraction completeness
    
    let confidence = 0.5; // Base confidence
    
    // Increase confidence for each successfully parsed intent
    confidence += parseResult.parsedIntents.length * 0.1;
    
    // Increase confidence if tools were selected
    if (parseResult.toolSelections && parseResult.toolSelections.length > 0) {
      confidence += 0.2;
    }
    
    // Cap at 0.95 (never 100% certain with LLM)
    return Math.min(confidence, 0.95);
  }
  
  private generateExplanation(parseResult: any, toolCount: number): string {
    if (!parseResult || !parseResult.parsedIntents || parseResult.parsedIntents.length === 0) {
      return 'Unable to parse intent. Please try rephrasing your request.';
    }
    
    const intentCount = parseResult.parsedIntents.length;
    const toolSelectionCount = parseResult.toolSelections?.length || 0;
    
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

// Singleton instance
let intentServiceInstance: IntentService | null = null;
let currentAIConfig: AIConfig | null = null;

/**
 * Get the singleton instance of IntentService
 * Optionally provide AI configuration
 */
export function getIntentService(aiConfig?: AIConfig): IntentService {
  if (!intentServiceInstance) {
    intentServiceInstance = new IntentService(aiConfig);
    currentAIConfig = aiConfig || null;
  } else if (aiConfig) {
    // If instance already exists but new config is provided,
    // check if config has changed
    const configChanged = !currentAIConfig || 
      currentAIConfig.provider !== aiConfig.provider ||
      currentAIConfig.apiKey !== aiConfig.apiKey ||
      currentAIConfig.model !== aiConfig.model;
    
    if (configChanged) {
      console.log('[IntentService] AI configuration changed, creating new instance');
      intentServiceInstance = new IntentService(aiConfig);
      currentAIConfig = aiConfig;
    }
  }
  return intentServiceInstance!;
}

/**
 * Create a new instance of UniversalIntentService with specific AI configuration
 * Useful for testing or when multiple configurations are needed
 */
export function createIntentService(aiConfig?: AIConfig): IntentService {
  return new IntentService(aiConfig);
}
