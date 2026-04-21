/**
 * Execution Context Sharing System
 * Global context management for cross-tool workflow execution
 */

import { EventEmitter } from 'events';

export interface ContextVariable {
  name: string;
  value: any;
  type: string;
  source: string; // Tool name or system
  timestamp: number;
  metadata?: {
    description?: string;
    expiresAt?: number;
    ttl?: number; // Time to live in milliseconds
    scope?: 'workflow' | 'session' | 'global';
    tags?: string[];
  };
}

export interface ContextScope {
  id: string;
  name: string;
  parentScopeId?: string;
  variables: Map<string, ContextVariable>;
  createdAt: number;
  expiresAt?: number;
}

export interface ExecutionContext {
  workflowId: string;
  sessionId: string;
  scopes: Map<string, ContextScope>;
  currentScopeId: string;
  eventBus: EventEmitter;
}

export interface ContextManagerOptions {
  defaultTTL?: number; // Default time to live in milliseconds
  maxVariablesPerScope?: number;
  autoCleanupInterval?: number;
  enablePersistence?: boolean;
}

export interface ContextQuery {
  name?: string;
  type?: string;
  source?: string;
  scope?: string;
  tags?: string[];
  minTimestamp?: number;
  maxTimestamp?: number;
}

/**
 * Global Execution Context Manager
 * Manages shared context across tool executions in workflows
 */
export class ExecutionContextManager extends EventEmitter {
  private contexts: Map<string, ExecutionContext> = new Map();
  private options: ContextManagerOptions;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: ContextManagerOptions = {}) {
    super();
    this.options = {
      defaultTTL: 3600000, // 1 hour
      maxVariablesPerScope: 1000,
      autoCleanupInterval: 300000, // 5 minutes
      enablePersistence: false,
      ...options,
    };

    // Start auto cleanup if enabled
    if (this.options.autoCleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpiredVariables().catch(error => {
          this.emit('error', error);
        });
      }, this.options.autoCleanupInterval);
    }
  }

  /**
   * Create a new execution context
   */
  createContext(workflowId: string, sessionId: string): ExecutionContext {
    const rootScope: ContextScope = {
      id: 'root',
      name: 'Root Scope',
      variables: new Map(),
      createdAt: Date.now(),
    };

    const context: ExecutionContext = {
      workflowId,
      sessionId,
      scopes: new Map([['root', rootScope]]),
      currentScopeId: 'root',
      eventBus: new EventEmitter(),
    };

    this.contexts.set(this.getContextKey(workflowId, sessionId), context);
    this.emit('contextCreated', { workflowId, sessionId });

    return context;
  }

  /**
   * Get or create execution context
   */
  getOrCreateContext(workflowId: string, sessionId: string): ExecutionContext {
    const key = this.getContextKey(workflowId, sessionId);
    let context = this.contexts.get(key);

    if (!context) {
      context = this.createContext(workflowId, sessionId);
    }

    return context;
  }

  /**
   * Get execution context
   */
  getContext(workflowId: string, sessionId: string): ExecutionContext | null {
    const key = this.getContextKey(workflowId, sessionId);
    return this.contexts.get(key) || null;
  }

  /**
   * Delete execution context
   */
  deleteContext(workflowId: string, sessionId: string): boolean {
    const key = this.getContextKey(workflowId, sessionId);
    const context = this.contexts.get(key);

    if (context) {
      context.eventBus.removeAllListeners();
      this.contexts.delete(key);
      this.emit('contextDeleted', { workflowId, sessionId });
      return true;
    }

    return false;
  }

  /**
   * Create a new scope within context
   */
  createScope(
    workflowId: string,
    sessionId: string,
    scopeName: string,
    parentScopeId: string = 'root',
  ): ContextScope {
    const context = this.getContext(workflowId, sessionId);
    if (!context) {
      throw new Error(`Context not found for workflow ${workflowId}, session ${sessionId}`);
    }

    const parentScope = context.scopes.get(parentScopeId);
    if (!parentScope) {
      throw new Error(`Parent scope ${parentScopeId} not found`);
    }

    const scopeId = `${parentScopeId}.${scopeName}`;
    const scope: ContextScope = {
      id: scopeId,
      name: scopeName,
      parentScopeId,
      variables: new Map(),
      createdAt: Date.now(),
    };

    context.scopes.set(scopeId, scope);
    this.emit('scopeCreated', { workflowId, sessionId, scopeId });

    return scope;
  }

  /**
   * Set variable in context
   */
  setVariable(
    workflowId: string,
    sessionId: string,
    variable: Omit<ContextVariable, 'timestamp'> & {
      scopeId?: string;
      ttl?: number;
    },
  ): void {
    const context = this.getContext(workflowId, sessionId);
    if (!context) {
      throw new Error(`Context not found for workflow ${workflowId}, session ${sessionId}`);
    }

    const scopeId = variable.scopeId || context.currentScopeId;
    const scope = context.scopes.get(scopeId);
    if (!scope) {
      throw new Error(`Scope ${scopeId} not found`);
    }

    // Check variable limit
    if (scope.variables.size >= (this.options.maxVariablesPerScope || 1000)) {
      this.emit('warning', {
        message: `Scope ${scopeId} reached variable limit`,
        workflowId,
        sessionId,
        scopeId,
      });
      // Remove oldest variable
      const oldestKey = Array.from(scope.variables.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0]?.[0];
      if (oldestKey) {
        scope.variables.delete(oldestKey);
      }
    }

    const ttl = variable.ttl || this.options.defaultTTL;
    const expiresAt = ttl ? Date.now() + ttl : undefined;

    const contextVariable: ContextVariable = {
      ...variable,
      timestamp: Date.now(),
      metadata: {
        ...variable.metadata,
        expiresAt,
        ttl,
        scope: variable.metadata?.scope || 'workflow',
      },
    };

    scope.variables.set(variable.name, contextVariable);

    // Emit event for variable change
    context.eventBus.emit('variableChanged', {
      name: variable.name,
      value: variable.value,
      scopeId,
      timestamp: contextVariable.timestamp,
    });

    this.emit('variableSet', {
      workflowId,
      sessionId,
      scopeId,
      variable: contextVariable,
    });
  }

  /**
   * Get variable from context
   */
  getVariable(
    workflowId: string,
    sessionId: string,
    variableName: string,
    scopeId?: string,
  ): ContextVariable | null {
    const context = this.getContext(workflowId, sessionId);
    if (!context) {
      return null;
    }

    // If scopeId is provided, check that specific scope
    if (scopeId) {
      const scope = context.scopes.get(scopeId);
      if (!scope) {
        return null;
      }
      return scope.variables.get(variableName) || null;
    }

    // Search through scopes from current to root
    let currentScopeId = context.currentScopeId;
    while (currentScopeId) {
      const scope = context.scopes.get(currentScopeId);
      if (!scope) {break;}

      const variable = scope.variables.get(variableName);
      if (variable) {
        // Check if variable is expired
        if (this.isVariableExpired(variable)) {
          this.cleanupVariable(workflowId, sessionId, currentScopeId, variableName);
          return null;
        }
        return variable;
      }

      // Move to parent scope
      currentScopeId = scope.parentScopeId || '';
    }

    return null;
  }

  /**
   * Get all variables matching query
   */
  queryVariables(
    workflowId: string,
    sessionId: string,
    query: ContextQuery,
  ): ContextVariable[] {
    const context = this.getContext(workflowId, sessionId);
    if (!context) {
      return [];
    }

    const results: ContextVariable[] = [];

    for (const [scopeId, scope] of context.scopes) {
      for (const variable of scope.variables.values()) {
        // Check if variable matches query
        if (this.matchesQuery(variable, scopeId, query)) {
          // Check if variable is expired
          if (this.isVariableExpired(variable)) {
            this.cleanupVariable(workflowId, sessionId, scopeId, variable.name);
            continue;
          }
          results.push(variable);
        }
      }
    }

    return results;
  }

  /**
   * Delete variable from context
   */
  deleteVariable(
    workflowId: string,
    sessionId: string,
    variableName: string,
    scopeId?: string,
  ): boolean {
    const context = this.getContext(workflowId, sessionId);
    if (!context) {
      return false;
    }

    if (scopeId) {
      const scope = context.scopes.get(scopeId);
      if (!scope) {
        return false;
      }
      const deleted = scope.variables.delete(variableName);
      if (deleted) {
        context.eventBus.emit('variableDeleted', { name: variableName, scopeId });
        this.emit('variableDeleted', { workflowId, sessionId, scopeId, variableName });
      }
      return deleted;
    }

    // Search through scopes from current to root
    let currentScopeId = context.currentScopeId;
    while (currentScopeId) {
      const scope = context.scopes.get(currentScopeId);
      if (!scope) {break;}

      if (scope.variables.has(variableName)) {
        scope.variables.delete(variableName);
        context.eventBus.emit('variableDeleted', { name: variableName, scopeId: currentScopeId });
        this.emit('variableDeleted', { workflowId, sessionId, scopeId: currentScopeId, variableName });
        return true;
      }

      currentScopeId = scope.parentScopeId || '';
    }

    return false;
  }

  /**
   * Clear all variables in scope
   */
  clearScope(
    workflowId: string,
    sessionId: string,
    scopeId: string,
  ): number {
    const context = this.getContext(workflowId, sessionId);
    if (!context) {
      return 0;
    }

    const scope = context.scopes.get(scopeId);
    if (!scope) {
      return 0;
    }

    const count = scope.variables.size;
    scope.variables.clear();

    context.eventBus.emit('scopeCleared', { scopeId });
    this.emit('scopeCleared', { workflowId, sessionId, scopeId, count });

    return count;
  }

  /**
   * Switch current scope
   */
  switchScope(
    workflowId: string,
    sessionId: string,
    scopeId: string,
  ): boolean {
    const context = this.getContext(workflowId, sessionId);
    if (!context) {
      return false;
    }

    if (!context.scopes.has(scopeId)) {
      return false;
    }

    const previousScopeId = context.currentScopeId;
    context.currentScopeId = scopeId;

    context.eventBus.emit('scopeSwitched', {
      previousScopeId,
      currentScopeId: scopeId,
    });

    this.emit('scopeSwitched', {
      workflowId,
      sessionId,
      previousScopeId,
      currentScopeId: scopeId,
    });

    return true;
  }

  /**
   * Get current scope
   */
  getCurrentScope(
    workflowId: string,
    sessionId: string,
  ): ContextScope | null {
    const context = this.getContext(workflowId, sessionId);
    if (!context) {
      return null;
    }

    return context.scopes.get(context.currentScopeId) || null;
  }

  /**
   * Get all scopes in context
   */
  getAllScopes(
    workflowId: string,
    sessionId: string,
  ): ContextScope[] {
    const context = this.getContext(workflowId, sessionId);
    if (!context) {
      return [];
    }

    return Array.from(context.scopes.values());
  }

  /**
   * Cleanup expired variables
   */
  private async cleanupExpiredVariables(): Promise<void> {
    const cleanupStats = {
      totalVariables: 0,
      expiredVariables: 0,
      cleanedContexts: 0,
    };

    for (const [_contextKey, context] of this.contexts) {
      let contextExpiredCount = 0;

      for (const [scopeId, scope] of context.scopes) {
        const expiredVariables: string[] = [];

        for (const [variableName, variable] of scope.variables) {
          cleanupStats.totalVariables++;
          if (this.isVariableExpired(variable)) {
            expiredVariables.push(variableName);
            cleanupStats.expiredVariables++;
            contextExpiredCount++;
          }
        }

        // Remove expired variables
        for (const variableName of expiredVariables) {
          scope.variables.delete(variableName);
          context.eventBus.emit('variableExpired', { name: variableName, scopeId });
        }
      }

      if (contextExpiredCount > 0) {
        cleanupStats.cleanedContexts++;
      }
    }

    if (cleanupStats.expiredVariables > 0) {
      this.emit('cleanupCompleted', cleanupStats);
    }
  }

  /**
   * Check if variable is expired
   */
  private isVariableExpired(variable: ContextVariable): boolean {
    const expiresAt = variable.metadata?.expiresAt;
    if (!expiresAt) {
      return false;
    }
    return Date.now() > expiresAt;
  }

  /**
   * Cleanup a specific variable
   */
  private cleanupVariable(
    workflowId: string,
    sessionId: string,
    scopeId: string,
    variableName: string,
  ): void {
    const context = this.getContext(workflowId, sessionId);
    if (!context) {
      return;
    }

    const scope = context.scopes.get(scopeId);
    if (!scope) {
      return;
    }

    scope.variables.delete(variableName);
    context.eventBus.emit('variableExpired', { name: variableName, scopeId });
  }

  /**
   * Check if variable matches query
   */
  private matchesQuery(
    variable: ContextVariable,
    scopeId: string,
    query: ContextQuery,
  ): boolean {
    if (query.name && variable.name !== query.name) {
      return false;
    }
    if (query.type && variable.type !== query.type) {
      return false;
    }
    if (query.source && variable.source !== query.source) {
      return false;
    }
    if (query.scope && scopeId !== query.scope) {
      return false;
    }
    if (query.tags && query.tags.length > 0) {
      const variableTags = variable.metadata?.tags || [];
      if (!query.tags.every(tag => variableTags.includes(tag))) {
        return false;
      }
    }
    if (query.minTimestamp && variable.timestamp < query.minTimestamp) {
      return false;
    }
    if (query.maxTimestamp && variable.timestamp > query.maxTimestamp) {
      return false;
    }
    return true;
  }

  /**
   * Generate context key
   */
  private getContextKey(workflowId: string, sessionId: string): string {
    return `${workflowId}:${sessionId}`;
  }

  /**
   * Stop cleanup interval
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

/**
 * Factory function to create execution context manager
 */
export function createExecutionContextManager(options?: ContextManagerOptions): ExecutionContextManager {
  return new ExecutionContextManager(options);
}
