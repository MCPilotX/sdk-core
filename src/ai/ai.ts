/**
 * Simplified AI Core Service
 * Focused on converting natural language to MCP tool calls
 */

import chalk from 'chalk';
import { logger } from '../core/logger';

// AI provider types
export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'deepseek'
  | 'ollama'
  | 'none';

// Simplified AI configuration
export interface SimpleAIConfig {
  provider: AIProvider;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  apiVersion?: string; // For Azure
  region?: string;     // For Azure
}

// Query result
export interface AskResult {
  type: 'tool_call' | 'suggestions' | 'error';
  tool?: ToolCall;
  suggestions?: string[];
  message?: string;
  help?: string;
  confidence?: number;
}

// Tool call
export interface ToolCall {
  service: string;
  tool: string;
  params: Record<string, any>;
}

// Intent analysis result
interface Intent {
  action: string;
  target: string;
  params: Record<string, any>;
  confidence: number;
}

// Simplified AI error
export class AIError extends Error {
  constructor(
    public code: string,
    override message: string,
    public category: 'config' | 'connection' | 'execution',
    public suggestions: string[] = [],
  ) {
    super(message);
    this.name = 'AIError';
  }
}

/**
 * Simplified AI Core Service
 */
export class SimpleAI {
  private config: SimpleAIConfig | null = null;
  private enabled: boolean = false;
  private client: any = null;

  constructor() {
    logger.info('[AI] Initializing simplified AI service');
  }

  /**
   * Configure AI service
   */
  async configure(config: SimpleAIConfig): Promise<void> {
    logger.info(`[AI] Configuring AI provider: ${config.provider}`);

    // Provider-specific validation
    switch (config.provider) {
      case 'openai':
      case 'anthropic':
      case 'google':
      case 'azure':
      case 'deepseek': {
        if (!config.apiKey) {
          throw new AIError(
            'AI_CONFIG_ERROR',
            `${config.provider} requires API key`,
            'config',
            [
              `Run: mcp ai configure ${config.provider} YOUR_API_KEY`,
              `Get ${config.provider} API key from their official website`,
            ],
          );
        }
        break;
      }

      case 'ollama':
        // Ollama can work without API key (local)
        break;

      case 'none':
        // No validation needed
        break;

      default:
        throw new AIError(
          'AI_CONFIG_ERROR',
          `Unsupported provider: ${config.provider}`,
          'config',
          [
            'Supported providers: openai, anthropic, google, azure, deepseek, ollama, none',
          ],
        );
    }

    this.config = config;

    // Initialize client
    await this.initializeClient();

    this.enabled = true;
    logger.info(`[AI] ${config.provider} configuration completed`);
  }

  /**
   * Initialize AI client
   */
  private async initializeClient(): Promise<void> {
    if (!this.config || this.config.provider === 'none') {
      this.enabled = false;
      return;
    }

    try {
      switch (this.config.provider) {
        case 'openai': {
          // Simplified OpenAI client
          this.client = {
            provider: 'openai',
            config: this.config,
            endpoint: 'https://api.openai.com/v1',
          };
          break;
        }

        case 'anthropic': {
          // Simplified Anthropic client
          this.client = {
            provider: 'anthropic',
            config: this.config,
            endpoint: 'https://api.anthropic.com/v1',
          };
          break;
        }

        case 'google': {
          // Simplified Google (Gemini) client
          this.client = {
            provider: 'google',
            config: this.config,
            endpoint: 'https://generativelanguage.googleapis.com/v1',
          };
          break;
        }

        case 'azure': {
          // Simplified Azure OpenAI client
          const azureEndpoint = this.config.endpoint || 'https://YOUR_RESOURCE.openai.azure.com';
          this.client = {
            provider: 'azure',
            config: this.config,
            endpoint: azureEndpoint,
            apiVersion: this.config.apiVersion || '2024-02-15-preview',
          };
          break;
        }

        case 'deepseek': {
          // Simplified DeepSeek client
          this.client = {
            provider: 'deepseek',
            config: this.config,
            endpoint: 'https://api.deepseek.com/v1',
          };
          break;
        }

        case 'ollama': {
          // Simplified Ollama client
          this.client = {
            provider: 'ollama',
            endpoint: this.config.endpoint || 'http://localhost:11434',
            config: this.config,
          };
          break;
        }

        default:
          this.enabled = false;
          return;
      }

      // Test connection
      await this.testConnection();

    } catch (error: any) {
      logger.warn(`[AI] Client initialization failed: ${error.message}`);
      this.enabled = false;
      throw new AIError(
        'AI_INIT_ERROR',
        `AI initialization failed: ${error.message}`,
        'connection',
        [
          'Check network connection',
          'Verify configuration',
          'Run: mcp ai test to test connection',
        ],
      );
    }
  }

  /**
   * Test AI connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config || this.config.provider === 'none') {
      return {
        success: false,
        message: 'AI not configured',
      };
    }

    try {
      switch (this.config.provider) {
        case 'openai': {
          // Simple OpenAI connection test
          const openaiTest = await this.testOpenAIConnection();
          return openaiTest;
        }

        case 'anthropic': {
          // Simple Anthropic connection test
          const anthropicTest = await this.testAnthropicConnection();
          return anthropicTest;
        }

        case 'google': {
          // Simple Google connection test
          const googleTest = await this.testGoogleConnection();
          return googleTest;
        }

        case 'azure': {
          // Simple Azure connection test
          const azureTest = await this.testAzureConnection();
          return azureTest;
        }

        case 'deepseek': {
          // Simple DeepSeek connection test
          const deepseekTest = await this.testDeepSeekConnection();
          return deepseekTest;
        }

        case 'ollama': {
          // Simple Ollama connection test
          const ollamaTest = await this.testOllamaConnection();
          return ollamaTest;
        }

        default:
          return {
            success: false,
            message: `Unsupported provider: ${this.config.provider}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
      };
    }
  }

  /**
   * Test OpenAI connection
   */
  private async testOpenAIConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config?.apiKey) {
      return {
        success: false,
        message: 'Missing API key',
      };
    }

    try {
      // Simple HTTP request test
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return {
          success: true,
          message: 'OpenAI connection OK',
        };
      } else {
        return {
          success: false,
          message: `API returned error: ${response.status}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Network error: ${error.message}`,
      };
    }
  }

  /**
   * Test Anthropic connection
   */
  private async testAnthropicConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config?.apiKey) {
      return {
        success: false,
        message: 'Missing API key',
      };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Anthropic connection OK',
        };
      } else {
        return {
          success: false,
          message: `API returned error: ${response.status}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Network error: ${error.message}`,
      };
    }
  }

  /**
   * Test Google (Gemini) connection
   */
  private async testGoogleConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config?.apiKey) {
      return {
        success: false,
        message: 'Missing API key',
      };
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${this.config.apiKey}`);

      if (response.ok) {
        return {
          success: true,
          message: 'Google Gemini connection OK',
        };
      } else {
        return {
          success: false,
          message: `API returned error: ${response.status}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Network error: ${error.message}`,
      };
    }
  }

  /**
   * Test Azure OpenAI connection
   */
  private async testAzureConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config?.apiKey || !this.config?.endpoint) {
      return {
        success: false,
        message: 'Missing API key or endpoint',
      };
    }

    try {
      const apiVersion = this.config.apiVersion || '2024-02-15-preview';
      const endpoint = this.config.endpoint.replace(/\/$/, '');
      const url = `${endpoint}/openai/deployments?api-version=${apiVersion}`;

      const response = await fetch(url, {
        headers: {
          'api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Azure OpenAI connection OK',
        };
      } else {
        return {
          success: false,
          message: `API returned error: ${response.status}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Network error: ${error.message}`,
      };
    }
  }

  /**
   * Test DeepSeek connection
   */
  private async testDeepSeekConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config?.apiKey) {
      return {
        success: false,
        message: 'Missing API key',
      };
    }

    try {
      const response = await fetch('https://api.deepseek.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return {
          success: true,
          message: 'DeepSeek connection OK',
        };
      } else {
        return {
          success: false,
          message: `API returned error: ${response.status}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Network error: ${error.message}`,
      };
    }
  }

  /**
   * Test Ollama connection
   */
  private async testOllamaConnection(): Promise<{ success: boolean; message: string }> {
    const endpoint = this.config?.endpoint || 'http://localhost:11434';

    try {
      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return {
          success: true,
          message: `Ollama connection OK (${endpoint})`,
        };
      } else {
        return {
          success: false,
          message: `Ollama service error: ${response.status}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Cannot connect to Ollama: ${error.message}`,
      };
    }
  }

  /**
   * Process natural language query
   */
  async ask(query: string): Promise<AskResult> {
    logger.info(`[AI] Processing query: "${query}"`);

    // Check if AI is enabled
    if (!this.enabled || !this.config || this.config.provider === 'none') {
      throw new AIError(
        'AI_NOT_CONFIGURED',
        'AI provider not configured. Please call configureAI() with a valid API key.',
        'config',
        [
          'Run: mcpilot.configureAI({ provider: "openai", apiKey: "YOUR_API_KEY" })',
          'Get OpenAI API key: https://platform.openai.com/api-keys',
          'Or use Ollama: mcpilot.configureAI({ provider: "ollama", endpoint: "http://localhost:11434" })',
        ],
      );
    }

    try {
      // 1. Analyze intent
      const intent = await this.analyzeIntent(query);

      // 2. Map to tool call
      const toolCall = this.mapIntentToTool(intent);

      // 3. Return tool call
      return {
        type: 'tool_call',
        tool: toolCall,
        confidence: intent.confidence,
      };
    } catch (error: any) {
      logger.warn(`[AI] Intent analysis failed: ${error.message}`);

      // Fallback to command suggestions when AI fails
      return this.getFallbackSuggestions(query);
    }
  }

  /**
   * Analyze intent (simplified version)
   */
  private async analyzeIntent(query: string): Promise<Intent> {
    // Simplified intent analysis: keyword matching

    const queryLower = query.toLowerCase();

    // Common intent patterns
    const patterns = [
      // File operations
      {
        regex: /(list|show|display).*(file|directory|folder)/i,
        action: 'list',
        target: 'files',
        confidence: 0.8,
      },
      {
        regex: /(read|view|open).*file/i,
        action: 'read',
        target: 'file',
        confidence: 0.7,
      },

      // Service operations
      {
        regex: /(start|launch|run).*service/i,
        action: 'start',
        target: 'service',
        confidence: 0.9,
      },
      {
        regex: /(stop|halt|terminate).*service/i,
        action: 'stop',
        target: 'service',
        confidence: 0.9,
      },
      {
        regex: /(status|check).*service/i,
        action: 'status',
        target: 'service',
        confidence: 0.8,
      },

      // General queries
      {
        regex: /(help|what can you do)/i,
        action: 'help',
        target: 'general',
        confidence: 0.9,
      },
    ];

    // Find matching pattern
    for (const pattern of patterns) {
      if (pattern.regex.test(query)) {
        return {
          action: pattern.action,
          target: pattern.target,
          params: this.extractParams(query),
          confidence: pattern.confidence,
        };
      }
    }

    // If no match, use LLM analysis (if available)
    if (this.config?.provider !== 'none' && this.client) {
      return await this.analyzeWithLLM(query);
    }

    // Default intent
    return {
      action: 'unknown',
      target: 'unknown',
      params: {},
      confidence: 0.3,
    };
  }

  /**
   * Analyze intent with LLM (optional)
   */
  private async analyzeWithLLM(query: string): Promise<Intent> {
    if (!this.config || !this.client) {
      throw new AIError(
        'AI_NOT_CONFIGURED',
        'AI not configured for LLM analysis',
        'config',
      );
    }

    logger.info(`[AI] Analyzing intent with ${this.config.provider}`);

    try {
      // Call actual AI API based on provider
      const response = await this.callAIAPI(query);

      // Parse response to extract intent
      const intent = this.parseAIResponse(response, query);

      return intent;

    } catch (error: any) {
      logger.warn(`[AI] LLM analysis failed: ${error.message}`);

      // Fallback to default intent
      return {
        action: 'analyze',
        target: 'query',
        params: { query },
        confidence: 0.3,
      };
    }
  }

  /**
   * Call AI API based on provider
   */
  private async callAIAPI(query: string): Promise<any> {
    if (!this.config || !this.client) {
      throw new AIError('AI_NOT_CONFIGURED', 'AI not configured', 'config');
    }

    const provider = this.config.provider;
    const apiKey = this.config.apiKey;
    const model = this.config.model || this.getDefaultModel(provider);

    switch (provider) {
      case 'openai':
        return await this.callOpenAI(query, apiKey!, model);

      case 'anthropic':
        return await this.callAnthropic(query, apiKey!, model);

      case 'google':
        return await this.callGoogle(query, apiKey!, model);

      case 'azure':
        return await this.callAzure(query, apiKey!, model);

      case 'deepseek':
        return await this.callDeepSeek(query, apiKey!, model);

      case 'ollama':
        return await this.callOllama(query, model);

      default:
        throw new AIError('UNSUPPORTED_PROVIDER', `Unsupported provider: ${provider}`, 'config');
    }
  }

  /**
   * Get default model for provider
   */
  private getDefaultModel(provider: AIProvider): string {
    switch (provider) {
      case 'openai': return 'gpt-3.5-turbo';
      case 'anthropic': return 'claude-3-haiku-20240307';
      case 'google': return 'gemini-pro';
      case 'azure': return 'gpt-35-turbo';
      case 'deepseek': return 'deepseek-chat';
      case 'ollama': return 'llama2';
      default: return 'unknown';
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(query: string, apiKey: string, model: string): Promise<any> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an intent analyzer. Extract action, target, and parameters from user queries.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        max_tokens: 100,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(query: string, apiKey: string, model: string): Promise<any> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Analyze this query for intent: ${query}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Call Google (Gemini) API
   */
  private async callGoogle(query: string, apiKey: string, model: string): Promise<any> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Analyze this query for intent: ${query}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Call Azure OpenAI API
   */
  private async callAzure(query: string, apiKey: string, model: string): Promise<any> {
    const endpoint = this.config?.endpoint || 'https://YOUR_RESOURCE.openai.azure.com';
    const apiVersion = this.config?.apiVersion || '2024-02-15-preview';

    const url = `${endpoint}/openai/deployments/${model}/chat/completions?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are an intent analyzer. Extract action, target, and parameters from user queries.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        max_tokens: 100,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Call DeepSeek API
   */
  private async callDeepSeek(query: string, apiKey: string, model: string): Promise<any> {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an intent analyzer. Extract action, target, and parameters from user queries.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        max_tokens: 100,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Call Ollama API
   */
  private async callOllama(query: string, model: string): Promise<any> {
    const endpoint = this.config?.endpoint || 'http://localhost:11434';

    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: `Analyze this query for intent: ${query}`,
        stream: false,
        options: {
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Parse AI response to extract intent
   */
  private parseAIResponse(response: any, query: string): Intent {
    // Default intent
    const defaultIntent: Intent = {
      action: 'analyze',
      target: 'query',
      params: { query },
      confidence: 0.5,
    };

    if (!response) {
      return defaultIntent;
    }

    try {
      // Extract text from different provider responses
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
      }

      if (!text) {
        return defaultIntent;
      }

      // Simple parsing - in real implementation, this would be more sophisticated
      const textLower = text.toLowerCase();

      // Extract action
      let action = 'analyze';
      if (textLower.includes('list') || textLower.includes('show')) {
        action = 'list';
      } else if (textLower.includes('read') || textLower.includes('view')) {
        action = 'read';
      } else if (textLower.includes('start') || textLower.includes('launch')) {
        action = 'start';
      } else if (textLower.includes('stop') || textLower.includes('terminate')) {
        action = 'stop';
      } else if (textLower.includes('status') || textLower.includes('check')) {
        action = 'status';
      } else if (textLower.includes('help')) {
        action = 'help';
      }

      // Extract target
      let target = 'query';
      if (textLower.includes('file') || textLower.includes('directory')) {
        target = 'files';
      } else if (textLower.includes('service')) {
        target = 'service';
      }

      // Extract parameters
      const params = this.extractParams(query);

      // Calculate confidence based on response quality
      const confidence = text.length > 20 ? 0.7 : 0.4;

      return {
        action,
        target,
        params,
        confidence,
      };

    } catch (error) {
      logger.warn(`[AI] Failed to parse AI response: ${error}`);
      return defaultIntent;
    }
  }

  /**
   * Extract parameters from query
   */
  private extractParams(query: string): Record<string, any> {
    const params: Record<string, any> = {};

    // Extract path parameter
    const pathMatch = query.match(/(\/[^\s]+|\.[^\s]+)/);
    if (pathMatch) {
      params.path = pathMatch[0];
    }

    // Extract service name
    const serviceMatch = query.match(/([a-zA-Z0-9_-]+)\s+service/i);
    if (serviceMatch) {
      params.service = serviceMatch[1];
    }

    return params;
  }

  /**
   * Map intent to tool call
   */
  private mapIntentToTool(intent: Intent): ToolCall {
    // Simplified mapping logic

    switch (intent.action) {
      case 'list':
        return {
          service: 'filesystem',
          tool: 'list_directory',
          params: { path: intent.params.path || '.' },
        };

      case 'read':
        return {
          service: 'filesystem',
          tool: 'read_file',
          params: { path: intent.params.path || 'README.md' },
        };

      case 'start':
        return {
          service: 'service_manager',
          tool: 'start_service',
          params: { name: intent.params.service || 'default' },
        };

      case 'stop':
        return {
          service: 'service_manager',
          tool: 'stop_service',
          params: { name: intent.params.service || 'default' },
        };

      case 'status':
        return {
          service: 'service_manager',
          tool: 'get_status',
          params: { name: intent.params.service },
        };

      case 'help':
        return {
          service: 'system',
          tool: 'show_help',
          params: {},
        };

      default:
        return {
          service: 'system',
          tool: 'unknown',
          params: { intent },
        };
    }
  }

  /**
   * Get fallback suggestions (when AI is not available)
   */
  private getFallbackSuggestions(query: string): AskResult {
    const suggestions: string[] = [];

    // Analyze query to provide traditional command suggestions
    const queryLower = query.toLowerCase();

    if (queryLower.includes('file') || queryLower.includes('directory')) {
      suggestions.push('mcp service list');
      suggestions.push('List files: ls or dir');
    }

    if (queryLower.includes('service') && queryLower.includes('start')) {
      suggestions.push('mcp service start <service-name>');
    }

    if (queryLower.includes('service') && queryLower.includes('stop')) {
      suggestions.push('mcp service stop <service-name>');
    }

    if (queryLower.includes('status') || queryLower.includes('check')) {
      suggestions.push('mcp service status');
    }

    if (suggestions.length === 0) {
      suggestions.push('mcp --help to see all commands');
      suggestions.push('mcp service --help to see service commands');
    }

    return {
      type: 'suggestions',
      message: 'AI feature not enabled or configured incorrectly',
      suggestions,
      help: 'You can:',
    };
  }

  /**
   * Get AI status
   */
  getStatus(): {
    enabled: boolean;
    provider: string;
    configured: boolean;
    } {
    return {
      enabled: this.enabled,
      provider: this.config?.provider || 'none',
      configured: !!this.config && this.config.provider !== 'none',
    };
  }

  /**
   * Call raw LLM API with custom messages and options
   * This method supports advanced use cases like function calling, JSON mode, etc.
   */
  async callRawAPI(options: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'text' | 'json_object' };
    functions?: Array<{
      name: string;
      description?: string;
      parameters: Record<string, any>;
    }>;
    functionCall?: 'auto' | 'none' | { name: string };
  }): Promise<any> {
    // Check if AI is enabled
    if (!this.enabled || !this.config || this.config.provider === 'none') {
      throw new AIError(
        'AI_NOT_CONFIGURED',
        'AI provider not configured. Please call configure() with a valid API key.',
        'config',
        [
          'Run: mcpilot.configureAI({ provider: "openai", apiKey: "YOUR_API_KEY" })',
          'Get OpenAI API key: https://platform.openai.com/api-keys',
          'Or use Ollama: mcpilot.configureAI({ provider: "ollama", endpoint: "http://localhost:11434" })',
        ],
      );
    }

    try {
      const provider = this.config.provider;
      const apiKey = this.config.apiKey;
      const model = this.config.model || this.getDefaultModel(provider);

      // Prepare request based on provider
      switch (provider) {
        case 'openai':
          return await this.callOpenAIRaw(options, apiKey!, model);
        
        case 'anthropic':
          return await this.callAnthropicRaw(options, apiKey!, model);
        
        case 'google':
          return await this.callGoogleRaw(options, apiKey!, model);
        
        case 'azure':
          return await this.callAzureRaw(options, apiKey!, model);
        
        case 'deepseek':
          return await this.callDeepSeekRaw(options, apiKey!, model);
        
        case 'ollama':
          return await this.callOllamaRaw(options, model);
        
        default:
          throw new AIError(
            'UNSUPPORTED_PROVIDER',
            `Raw API calls not supported for provider: ${provider}`,
            'execution'
          );
      }
    } catch (error: any) {
      logger.error(`[AI] Raw API call failed: ${error.message}`);
      throw new AIError(
        'API_CALL_FAILED',
        `Raw API call failed: ${error.message}`,
        'execution'
      );
    }
  }

  /**
   * Call OpenAI raw API
   */
  private async callOpenAIRaw(
    options: any,
    apiKey: string,
    model: string
  ): Promise<any> {
    const requestBody: any = {
      model,
      messages: options.messages,
      temperature: options.temperature || 0.1,
      max_tokens: options.maxTokens || 1024,
    };

    // Add response format if specified
    if (options.responseFormat) {
      requestBody.response_format = options.responseFormat;
    }

    // Add functions if specified
    if (options.functions && options.functions.length > 0) {
      requestBody.functions = options.functions;
      requestBody.function_call = options.functionCall || 'auto';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Call Anthropic raw API
   */
  private async callAnthropicRaw(
    options: any,
    apiKey: string,
    model: string
  ): Promise<any> {
    // Anthropic has different API structure
    const requestBody: any = {
      model,
      max_tokens: options.maxTokens || 1024,
      messages: options.messages,
      temperature: options.temperature || 0.1,
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Call Google raw API
   */
  private async callGoogleRaw(
    options: any,
    apiKey: string,
    model: string
  ): Promise<any> {
    // Google Gemini API structure
    const requestBody: any = {
      contents: options.messages.map((msg: any) => ({
        parts: [{ text: msg.content }],
        role: msg.role === 'user' ? 'user' : 'model',
      })),
      generationConfig: {
        temperature: options.temperature || 0.1,
        maxOutputTokens: options.maxTokens || 1024,
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Call Azure OpenAI raw API
   */
  private async callAzureRaw(
    options: any,
    apiKey: string,
    model: string
  ): Promise<any> {
    const endpoint = this.config?.endpoint || 'https://YOUR_RESOURCE.openai.azure.com';
    const apiVersion = this.config?.apiVersion || '2024-02-15-preview';

    const url = `${endpoint}/openai/deployments/${model}/chat/completions?api-version=${apiVersion}`;

    const requestBody: any = {
      messages: options.messages,
      temperature: options.temperature || 0.1,
      max_tokens: options.maxTokens || 1024,
    };

    // Azure OpenAI supports functions
    if (options.functions && options.functions.length > 0) {
      requestBody.functions = options.functions;
      requestBody.function_call = options.functionCall || 'auto';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Call DeepSeek raw API
   */
  private async callDeepSeekRaw(
    options: any,
    apiKey: string,
    model: string
  ): Promise<any> {
    const requestBody: any = {
      model,
      messages: options.messages,
      temperature: options.temperature || 0.1,
      max_tokens: options.maxTokens || 1024,
    };

    // DeepSeek supports response format
    if (options.responseFormat) {
      requestBody.response_format = options.responseFormat;
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Call Ollama raw API
   */
  private async callOllamaRaw(
    options: any,
    model: string
  ): Promise<any> {
    const endpoint = this.config?.endpoint || 'http://localhost:11434';

    // Ollama has different API structure
    const requestBody: any = {
      model,
      prompt: options.messages[options.messages.length - 1]?.content || '',
      stream: false,
      options: {
        temperature: options.temperature || 0.1,
        num_predict: options.maxTokens || 1024,
      },
    };

    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Reset configuration
   */
  reset(): void {
    this.config = null;
    this.enabled = false;
    this.client = null;
    logger.info('[AI] Configuration reset');
  }

  /**
   * Get friendly error message
   */
  static getFriendlyError(error: AIError): string {
    const lines = [
      chalk.red(`❌ ${error.message}`),
      chalk.gray(`Error code: ${error.code}`),
    ];

    if (error.suggestions.length > 0) {
      lines.push(chalk.yellow('\n🔧 Fix suggestions:'));
      error.suggestions.forEach((suggestion, i) => {
        lines.push(`  ${i + 1}. ${suggestion}`);
      });
    }

    return lines.join('\n');
  }
}
