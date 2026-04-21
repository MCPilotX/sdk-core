/**
 * IntentOrch - MCP 生态的 Docker
 * 
 * 让开发者像管理容器一样管理 MCP Server
 * 
 * 主要功能：
 * 1. MCP Server 生命周期管理
 * 2. 自然语言意图解析和执行
 * 3. 工作流编排和跟踪
 * 4. 运行时适配和检测
 * 
 * @package @mcpilotx/intentorch
 * @version 0.1.0
 */

// ==================== 核心模块 ====================
export { ConfigManager } from './core';
export type { RuntimeType, ServiceConfig, Config, AIConfig, DetectionResult } from './core';

// ==================== AI 模块 ====================
export { AI, AIConfigManager, CloudIntentEngine } from './ai';
export type { AskResult, IntentResult, CloudIntentEngineConfig } from './ai';

// ==================== MCP 模块 ====================
export { MCPClient, ToolRegistry } from './mcp';
export type { Tool, ToolCall, ToolMetadata } from './mcp';

// ==================== 运行时模块 ====================
export { RuntimeDetector, RuntimeAdapter } from './runtime';

// ==================== 工具注册表 ====================
export { ToolRegistry as ToolRegistryModule } from './tool-registry';

// ==================== 进程管理 ====================
export { ProcessManager, ProcessStore } from './process-manager';

// ==================== 密钥管理 ====================
export { SecretManager } from './secret';

// ==================== 工作流模块 ====================
export * from './workflow';

// ==================== 工具函数 ====================
export * from './utils';

// ==================== 类型定义 ====================
export * from './types';

// ==================== CLI 工具 ====================
// 注意：CLI 模块通常不直接导出，通过 bin/intorch.js 使用

/**
 * 获取 IntentOrch 版本信息
 */
export function getVersion(): string {
  return '0.1.0';
}

/**
 * 获取系统状态
 */
export async function getSystemStatus() {
  return {
    version: getVersion(),
    timestamp: new Date().toISOString(),
    modules: {
      core: 'available',
      ai: 'available',
      mcp: 'available',
      runtime: 'available',
      workflow: 'available',
    },
    capabilities: {
      intentParsing: true,
      workflowOrchestration: true,
      mcpServerManagement: true,
      runtimeDetection: true,
    },
  };
}

/**
 * 初始化 IntentOrch 系统
 */
export async function initialize(_config?: any) {
  console.log(`[IntentOrch] Initializing version ${getVersion()}`);
  
  // 这里可以添加初始化逻辑
  // 例如：加载配置、初始化服务等
  
  return {
    success: true,
    version: getVersion(),
    message: 'IntentOrch initialized successfully',
  };
}

// ==================== 工具函数导出 ====================
export { getProcessManager } from './process-manager/manager';
export { getRegistryClient } from './registry/client';
export { getWorkflowManager } from './workflow/manager';
export { getToolRegistry } from './tool-registry/registry';
export { getIntentService } from './ai/intent-service';
export { getAIConfig, getConfigManager } from './utils/config';
export { AutoStartManager } from './utils/auto-start-manager';
export { printError } from './utils/cli-error';
export { PROGRAM_NAME, PROGRAM_DESCRIPTION, PROGRAM_VERSION } from './utils/constants';
export { AIProviders, AIProvider, RegistrySources, RegistrySource } from './core/constants';
export { getSecretManager } from './secret/manager';
export { toLightweightManifest, supportsDynamicDiscovery } from './types/lightweight-manifest';
export { getDisplayName } from './utils/server-name';
export { DaemonClient } from './daemon/client';
export { DaemonServer } from './daemon/server';
export { ensureInTorchDir, getDaemonPidPath, getDaemonLogPath, getLogPath } from './utils/paths';
export type { DaemonConfig } from './daemon/types';

// ==================== 默认导出 ====================
import { intentorch as adapter } from './ai/intentorch-adapter';

const intentorch = {
  getVersion,
  getSystemStatus,
  initialize,
  // Add adapter methods
  configureAI: adapter.configureAI.bind(adapter),
  initCloudIntentEngine: adapter.initCloudIntentEngine.bind(adapter),
  connectMCPServer: adapter.connectMCPServer.bind(adapter),
  parseAndPlanWorkflow: adapter.parseAndPlanWorkflow.bind(adapter),
  executeWorkflowWithTracking: adapter.executeWorkflowWithTracking.bind(adapter),
  getConnectedServers: adapter.getConnectedServers.bind(adapter),
  disconnectMCPServer: adapter.disconnectMCPServer.bind(adapter),
  cleanup: adapter.cleanup.bind(adapter),
};

export default intentorch;
