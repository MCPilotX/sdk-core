/**
 * Owner/Project format unification utilities
 * Ensures consistent owner/project format throughout the system
 */

/**
 * Standardized Owner/Project format
 * Format: owner/project[@branch][:path]
 * Examples:
 * - Joooook/12306-mcp
 * - mcpilotx/mcp-server-hub@main
 * - github/github-mcp-server:dist/mcp.json
 */
export interface OwnerProjectFormat {
  owner: string;
  project: string;
  branch?: string;
  path?: string;
  fullName: string; // owner/project
  qualifiedName: string; // owner/project[@branch][:path]
}

/**
 * Convert various server name formats to unified owner/project format
 */
export function toOwnerProjectFormat(serverName: string): OwnerProjectFormat {
  // Input validation
  if (serverName === null || serverName === undefined) {
    throw new Error('Server name cannot be null or undefined');
  }
  
  if (typeof serverName !== 'string') {
    throw new Error(`Server name must be a string, got ${typeof serverName}`);
  }
  
  if (serverName.trim() === '') {
    throw new Error('Server name cannot be empty');
  }
  
  // 1. Handle source:owner/project format
  let normalized = serverName;
  if (serverName.includes(':')) {
    const parts = serverName.split(':');
    if (parts.length >= 2) {
      // If source is github/gitee/official, keep owner/project part
      const source = parts[0];
      const rest = parts.slice(1).join(':');
      
      // For official registry, format might be official:official/12306
      if (source === 'official' && rest.startsWith('official/')) {
        normalized = rest;
      } else {
        normalized = rest;
      }
    }
  }
  
  // 2. Extract branch and path
  let baseName = normalized;
  let branch: string | undefined;
  let path: string | undefined;
  
  // Extract path first
  if (baseName.includes(':')) {
    const [nameWithBranch, pathPart] = baseName.split(':', 2);
    baseName = nameWithBranch;
    path = pathPart;
  }
  
  // Extract branch next
  if (baseName.includes('@')) {
    const [name, branchPart] = baseName.split('@', 2);
    baseName = name;
    branch = branchPart;
  }
  
  // 3. Validate owner/project format
  if (!baseName.includes('/')) {
    // If no slash, assume official registry shorthand
    baseName = `official/${baseName}`;
  }
  
  const [owner, project] = baseName.split('/', 2);
  
  // 4. Build qualified name
  let qualifiedName = `${owner}/${project}`;
  if (branch) {
    qualifiedName += `@${branch}`;
  }
  if (path) {
    qualifiedName += `:${path}`;
  }
  
  return {
    owner,
    project,
    branch,
    path,
    fullName: `${owner}/${project}`,
    qualifiedName
  };
}

/**
 * Convert owner/project format to display string
 * Used for CLI output and UI display
 */
export function toDisplayString(serverName: string): string {
  const format = toOwnerProjectFormat(serverName);
  return format.qualifiedName;
}

/**
 * Convert owner/project format to normalized storage format
 * Used for cache keys, file storage, etc.
 */
export function toStorageFormat(serverName: string): string {
  const format = toOwnerProjectFormat(serverName);
  // Remove special characters for filename safety
  return format.qualifiedName
    .replace(/[^a-zA-Z0-9_\-@:./]/g, '_')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

/**
 * Check if two server names refer to the same service
 */
export function isSameService(name1: string, name2: string): boolean {
  const format1 = toOwnerProjectFormat(name1);
  const format2 = toOwnerProjectFormat(name2);
  
  // Compare owner and project (ignore branch and path)
  return format1.fullName === format2.fullName;
}

/**
 * Extract owner/project format from URL
 */
export function extractFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // GitHub raw URL pattern
    if (url.includes('raw.githubusercontent.com')) {
      const match = pathname.match(/^\/([^\/]+)\/([^\/]+)\/(?:raw\/)?(?:[^\/]+\/)?(.+)$/);
      if (match) {
        const [, owner, repo, rest] = match;
        // Remove possible mcp.json suffix
        const serviceName = rest.replace(/\/mcp\.json$/, '').replace(/\.json$/, '');
        return `${owner}/${repo}:${serviceName}`;
      }
    }
    
    // Gitee raw URL pattern
    if (url.includes('gitee.com')) {
      const match = pathname.match(/^\/([^\/]+)\/([^\/]+)\/(?:raw\/)?(?:[^\/]+\/)?(.+)$/);
      if (match) {
        const [, owner, repo, rest] = match;
        const serviceName = rest.replace(/\/mcp\.json$/, '').replace(/\.json$/, '');
        return `${owner}/${repo}:${serviceName}`;
      }
    }
    
    // Generic URL pattern
    const segments = pathname.split('/').filter(s => s);
    if (segments.length >= 2) {
      const owner = segments[0];
      const repo = segments[1];
      return `${owner}/${repo}`;
    }
  } catch (error) {
    // URL parsing failed
  }
  
  return null;
}

/**
 * Validate if it's a valid owner/project format
 */
export function isValidFormat(serverName: string): boolean {
  try {
    const format = toOwnerProjectFormat(serverName);
    return format.owner.length > 0 && format.project.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get friendly service name (for logs and UI)
 */
export function getFriendlyName(serverName: string): string {
  const format = toOwnerProjectFormat(serverName);
  
  // Remove common suffixes
  let friendlyName = format.project;
  const suffixes = ['-mcp', '-server', '-service', '-tool'];
  
  for (const suffix of suffixes) {
    if (friendlyName.endsWith(suffix)) {
      friendlyName = friendlyName.slice(0, -suffix.length);
      break;
    }
  }
  
  return friendlyName;
}

/**
 * Example usage (for documentation/testing)
 */
export function exampleUsage(): void {
  const examples = [
    'Joooook/12306-mcp',
    'github:Joooook/12306-mcp',
    'gitee:mcpilotx/mcp-server-hub:dist/12306-mcp',
    'official/12306',
    'official:official/12306',
    'mcp/12306',
    'https://raw.githubusercontent.com/Joooook/12306-mcp/main/mcp.json'
  ];
  
  console.log('Owner/Project format unification examples:');
  console.log('='.repeat(60));
  
  for (const example of examples) {
    const format = toOwnerProjectFormat(example);
    console.log(`Input: ${example}`);
    console.log(`  Display format: ${toDisplayString(example)}`);
    console.log(`  Storage format: ${toStorageFormat(example)}`);
    console.log(`  Friendly name: ${getFriendlyName(example)}`);
    console.log(`  Components: owner=${format.owner}, project=${format.project}, branch=${format.branch || 'none'}, path=${format.path || 'none'}`);
    console.log();
  }
}