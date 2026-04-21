import { toOwnerProjectFormat, toDisplayString, toStorageFormat, isSameService as isSameServiceOPF } from './owner-project-format';

/**
 * Server name normalization utilities
 * Ensures unique identification of MCP services
 */

/**
 * Normalize server name to ensure uniqueness
 * Format: source:owner/project[@branch][:path]
 * 
 * Examples:
 * - "Joooook/12306-mcp" -> "github:Joooook/12306-mcp"
 * - "github:Joooook/12306-mcp" -> "github:Joooook/12306-mcp"
 * - "gitee:mcpilotx/mcp-server-hub:dist/12306-mcp" -> "gitee:mcpilotx/mcp-server-hub:dist/12306-mcp"
 * - "official/12306" -> "official:official/12306"
 */
export function normalizeServerName(serverName: string): string {
  // Use new unified format processing
  const format = toOwnerProjectFormat(serverName);
  
  // Determine prefix based on source
  let source = 'github'; // default
  
  if (serverName.includes(':')) {
    const parts = serverName.split(':');
    const possibleSource = parts[0];
    if (['github', 'gitee', 'official', 'local'].includes(possibleSource)) {
      source = possibleSource;
    }
  } else if (serverName.startsWith('official/')) {
    source = 'official';
  } else if (serverName.startsWith('./') || serverName.startsWith('/') || serverName.endsWith('.json')) {
    source = 'local';
  } else if (!serverName.includes('/')) {
    // Single name without slash: assume official registry
    source = 'official';
  } else {
    // owner/repo format: assume github
    source = 'github';
  }
  
  // Build normalized name
  let normalized = `${source}:${format.fullName}`;
  if (format.branch) {
    normalized += `@${format.branch}`;
  }
  if (format.path) {
    normalized += `:${format.path}`;
  }
  
  return normalized;
}

/**
 * Extract display name from normalized server name
 */
export function getDisplayName(serverName: string): string {
  return toDisplayString(serverName);
}

/**
 * Generate cache key from server name
 */
export function getCacheKey(serverName: string): string {
  return toStorageFormat(serverName);
}

/**
 * Check if two server names refer to the same service
 */
export function isSameService(name1: string, name2: string): boolean {
  return isSameServiceOPF(name1, name2);
}

/**
 * Parse server name into components
 */
export interface ServerNameComponents {
  source: string;
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
  original: string;
}

export function parseServerName(serverName: string): ServerNameComponents {
  const format = toOwnerProjectFormat(serverName);
  const normalized = normalizeServerName(serverName);
  const source = normalized.split(':')[0];
  
  return {
    source,
    owner: format.owner,
    repo: format.project,
    branch: format.branch,
    path: format.path,
    original: serverName
  };
}