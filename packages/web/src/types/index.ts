// MCP Server related types
export interface MCPServer {
  id: string;
  name: string;
  version: string;
  description?: string;
  runtime: {
    type: string;
    command: string;
    args?: string[];
    env?: string[];
  };
  capabilities?: {
    tools?: any[];
  };
  status: 'not_pulled' | 'pulled' | 'running' | 'stopped' | 'error';
  pulledAt?: string;
  lastStartedAt?: string;
}

export interface ProcessInfo {
  pid: number;
  serverId: string;
  serverName: string;
  status: 'running' | 'stopped' | 'error';
  startedAt: string;
  cpuUsage?: number;
  memoryUsage?: number;
  logPath?: string;
}

export interface Config {
  ai: {
    provider?: string;
    apiKey?: string;
    model?: string;
  };
  registry: {
    default: string;
    fallback: string;
  };
}

export interface Secret {
  name: string;
  value?: string;
  lastUpdated: string;
  description?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
}

export interface WorkflowStep {
  id: string;
  type: 'server' | 'tool' | 'condition' | 'loop';
  serverName?: string;
  toolName?: string;
  parameters?: Record<string, any>;
  nextSteps?: string[];
  condition?: string;
}

export interface SystemStats {
  totalServers: number;
  runningServers: number;
  totalProcesses: number;
  diskUsage: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// API request types
export interface PullServerRequest {
  serverName: string;
}

export interface StartServerRequest {
  serverId: string;
}

export interface StopProcessRequest {
  pid: number;
}

export interface UpdateConfigRequest {
  config: Partial<Config>;
}

export interface CreateSecretRequest {
  name: string;
  value: string;
  description?: string;
}

export interface ExecuteWorkflowRequest {
  workflowId: string;
  parameters?: Record<string, any>;
}

// Notification related types
export * from './notification';
