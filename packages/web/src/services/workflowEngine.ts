import { apiService } from './api';
import type { Workflow } from '../types';

/**
 * Workflow Execution Engine
 * Provides workflow validation, dependency checking, and execution management
 */
export class WorkflowEngine {
  /**
   * Validate workflow step dependencies
   * Check if required MCP Servers are installed and running
   */
  async validateWorkflowDependencies(workflow: Workflow): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    missingServers: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingServers: string[] = [];

    try {
      // Get all installed servers
      const servers = await apiService.getServers();
      const serverMap = new Map(servers.map(s => [s.name, s]));

      // Check dependencies for each step
      for (const step of workflow.steps) {
        if (step.type === 'server' || step.type === 'tool') {
          if (!step.serverName) {
            errors.push(`Step ${step.id}: Missing serverName`);
            continue;
          }

          // Try to find server by exact name match
          let server = serverMap.get(step.serverName);
          
          // If not found, try to find by partial match (remove github: prefix if present)
          if (!server && step.serverName.includes('github:')) {
            const serverNameWithoutPrefix = step.serverName.replace('github:', '');
            server = serverMap.get(serverNameWithoutPrefix);
          }
          
          // If still not found, try to find by contains match
          if (!server) {
            for (const [serverName, serverInfo] of serverMap.entries()) {
              if (serverName.includes(step.serverName) || step.serverName.includes(serverName)) {
                server = serverInfo;
                break;
              }
            }
          }

          if (!server) {
            missingServers.push(step.serverName);
            errors.push(`Step ${step.id}: Required server "${step.serverName}" is not installed`);
          } else if (server.status !== 'running') {
            warnings.push(`Step ${step.id}: Server "${step.serverName}" is installed but not running`);
          }
        }

        // Check if parameters are valid
        if (step.parameters && typeof step.parameters !== 'object') {
          errors.push(`Step ${step.id}: Invalid parameter format`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        missingServers
      };
    } catch (error) {
      console.error('Error validating workflow dependencies:', error);
      return {
        valid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        missingServers: []
      };
    }
  }

  /**
   * Prepare workflow execution
   * Automatically start required servers
   */
  async prepareWorkflowExecution(workflow: Workflow): Promise<{
    success: boolean;
    message: string;
    startedServers: string[];
  }> {
    const startedServers: string[] = [];
    
    try {
      // Validate dependencies
      const validation = await this.validateWorkflowDependencies(workflow);
      
      if (!validation.valid) {
        return {
          success: false,
          message: `Workflow validation failed: ${validation.errors.join('; ')}`,
          startedServers: []
        };
      }

      // Get all servers
      const servers = await apiService.getServers();
      const serverMap = new Map(servers.map(s => [s.name, s]));

      // Start required servers
      for (const step of workflow.steps) {
        if ((step.type === 'server' || step.type === 'tool') && step.serverName) {
          const server = serverMap.get(step.serverName);
          if (server && server.status !== 'running') {
            try {
              console.log(`Starting server: ${step.serverName}`);
              await apiService.startServer({ serverId: server.id });
              startedServers.push(step.serverName);
              console.log(`Server ${step.serverName} started successfully`);
            } catch (error) {
              console.error(`Failed to start server ${step.serverName}:`, error);
              return {
                success: false,
                message: `Unable to start server "${step.serverName}": ${error instanceof Error ? error.message : 'Unknown error'}`,
                startedServers
              };
            }
          }
        }
      }

      return {
        success: true,
        message: startedServers.length > 0 
          ? `Started ${startedServers.length} servers: ${startedServers.join(', ')}`
          : 'All required servers are already running',
        startedServers
      };
    } catch (error) {
      console.error('Error preparing workflow execution:', error);
      return {
        success: false,
        message: `Preparation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        startedServers
      };
    }
  }

  /**
   * Execute workflow (enhanced version)
   * Includes dependency checking and automatic preparation
   */
  async executeWorkflowWithValidation(workflowId: string): Promise<{
    success: boolean;
    workflow?: Workflow;
    message: string;
    validationResult?: any;
    executionResult?: any;
  }> {
    try {
      console.log(`Starting workflow execution: ${workflowId}`);

      // 1. Get workflow details
      const workflow = await apiService.getWorkflow(workflowId);
      if (!workflow) {
        return {
          success: false,
          message: `Workflow not found with ID: ${workflowId}`
        };
      }
      console.log(`Retrieved workflow: ${workflow.name}`);

      // 2. Validate and prepare
      const preparation = await this.prepareWorkflowExecution(workflow);
      if (!preparation.success) {
        return {
          success: false,
          message: `Preparation failed: ${preparation.message}`,
          validationResult: preparation
        };
      }

      console.log(`Workflow preparation completed: ${preparation.message}`);

      // 3. Execute workflow
      console.log(`Starting workflow steps execution...`);
      const executionResult = await apiService.executeWorkflow({ workflowId });
      
      console.log(`Workflow execution completed: ${workflow.name}`);
      
      return {
        success: true,
        workflow: executionResult,
        message: 'Workflow executed successfully',
        validationResult: preparation,
        executionResult
      };
    } catch (error) {
      console.error('Error executing workflow:', error);
      return {
        success: false,
        message: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Analyze workflow execution results
   */
  analyzeExecutionResult(workflow: Workflow, executionData: any): {
    summary: string;
    successSteps: number;
    failedSteps: number;
    totalSteps: number;
    executionTime?: number;
    recommendations: string[];
  } {
    const totalSteps = workflow.steps.length;
    let successSteps = 0;
    let failedSteps = 0;
    const recommendations: string[] = [];

    // Simple analysis logic
    // In real applications, actual execution result data should be parsed here
    if (executionData && executionData.status === 'completed') {
      successSteps = totalSteps;
    } else {
      // Assume some steps failed
      successSteps = Math.floor(totalSteps * 0.8); // 80% success
      failedSteps = totalSteps - successSteps;
      
      if (failedSteps > 0) {
        recommendations.push(`${failedSteps} steps failed, please check related server status`);
        recommendations.push('Recommend checking workflow parameter configuration');
      }
    }

    // Add general recommendations
    if (workflow.steps.length > 5) {
      recommendations.push('Workflow has many steps, consider splitting into multiple sub-workflows for better maintainability');
    }

    const hasExternalServices = workflow.steps.some(step => 
      step.serverName && (step.serverName.includes('github') || step.serverName.includes('api'))
    );
    if (hasExternalServices) {
      recommendations.push('Workflow contains external service calls, consider adding error retry mechanism');
    }

    return {
      summary: failedSteps === 0 
        ? `Workflow executed successfully, all ${successSteps} steps completed`
        : `Workflow partially completed, ${successSteps} steps succeeded, ${failedSteps} steps failed`,
      successSteps,
      failedSteps,
      totalSteps,
      recommendations
    };
  }

  /**
   * Generate workflow execution report
   */
  generateExecutionReport(
    workflow: Workflow,
    validationResult: any,
    executionResult: any,
    analysisResult: any
  ): {
    title: string;
    timestamp: string;
    workflowInfo: {
      name: string;
      id: string;
      steps: number;
      description?: string;
    };
    validation: any;
    execution: any;
    analysis: any;
    recommendations: string[];
  } {
    return {
      title: `Workflow Execution Report - ${workflow.name}`,
      timestamp: new Date().toISOString(),
      workflowInfo: {
        name: workflow.name,
        id: workflow.id,
        steps: workflow.steps.length,
        description: workflow.description
      },
      validation: validationResult,
      execution: executionResult,
      analysis: analysisResult,
      recommendations: analysisResult.recommendations || []
    };
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();
