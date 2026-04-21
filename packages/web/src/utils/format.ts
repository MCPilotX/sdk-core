/**
 * Format utility functions
 */

// Format date time
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Format relative time
export function formatRelativeTime(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (!(d instanceof Date) || isNaN(d.getTime())) {
      return 'Unknown time';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return 'just now';
    } else if (diffMin < 60) {
      return `${diffMin} minutes ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hours ago`;
    } else if (diffDay < 7) {
      return `${diffDay} days ago`;
    } else {
      return formatDateTime(d);
    }
  } catch (error) {
    console.error('Error formatting relative time:', error, date);
    return 'Unknown time';
  }
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Format bytes (alias for formatFileSize)
export function formatBytes(bytes: number): string {
  return formatFileSize(bytes);
}

// Format duration
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours} hours ${minutes % 60} minutes`;
  } else if (minutes > 0) {
    return `${minutes} minutes ${seconds % 60} seconds`;
  } else {
    return `${seconds} seconds`;
  }
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Get status color
export function getStatusColor(status: string): string {
  switch (status) {
    case 'running':
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'stopped':
    case 'pulled':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'error':
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'not_pulled':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    case 'starting':
    case 'stopping':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

// Get status text
export function getStatusText(status: string): string {
  switch (status) {
    case 'not_pulled':
      return 'Not pulled';
    case 'pulled':
      return 'Pulled';
    case 'running':
      return 'Running';
    case 'stopped':
      return 'Stopped';
    case 'error':
      return 'Error';
    case 'starting':
      return 'Starting';
    case 'stopping':
      return 'Stopping';
    default:
      return status;
  }
}

// Format command display
export function formatCommand(command: string, args?: string[]): string {
  if (!args || args.length === 0) return command;
  return `${command} ${args.join(' ')}`;
}

// Safely display secret (show only part)
export function maskSecret(secret?: string): string {
  if (!secret) return 'Not set';
  if (secret.length <= 8) return '***';
  return `${secret.substring(0, 4)}***${secret.substring(secret.length - 4)}`;
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Deep merge objects
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      const sourceKey = key as keyof T;
      const sourceValue = source[sourceKey];
      const targetValue = target[sourceKey];
      
      if (isObject(sourceValue)) {
        if (!(key in target)) {
          (output as any)[key] = sourceValue;
        } else if (isObject(targetValue)) {
          output[sourceKey] = deepMerge(targetValue, sourceValue as any);
        } else {
          (output as any)[key] = sourceValue;
        }
      } else {
        (output as any)[key] = sourceValue;
      }
    });
  }
  
  return output;
}

// Download file utility
export function downloadFile(filename: string, content: string, type: string = 'text/plain'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export logs as CSV
export function exportLogsAsCSV(logs: any[], filename: string = 'logs.csv'): void {
  if (!logs || logs.length === 0) {
    console.warn('No logs to export');
    return;
  }

  // Define CSV headers
  const headers = ['Timestamp', 'Level', 'Source', 'Source Name', 'Message', 'Details'];
  
  // Convert logs to CSV rows
  const csvRows = logs.map(log => {
    const row = [
      `"${log.timestamp || ''}"`,
      `"${log.level || ''}"`,
      `"${log.source || ''}"`,
      `"${log.sourceName || ''}"`,
      `"${(log.message || '').replace(/"/g, '""')}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`
    ];
    return row.join(',');
  });

  // Combine headers and rows
  const csvContent = [headers.join(','), ...csvRows].join('\n');
  
  // Download the file
  downloadFile(filename, csvContent, 'text/csv');
}

// Export logs as JSON
export function exportLogsAsJSON(logs: any[], filename: string = 'logs.json'): void {
  if (!logs || logs.length === 0) {
    console.warn('No logs to export');
    return;
  }

  const jsonContent = JSON.stringify(logs, null, 2);
  downloadFile(filename, jsonContent, 'application/json');
}

/**
 * Format MCP server name to unified "owner/project" format
 * This function ensures consistent display of MCP server names across the application
 * 
 * @param serverName - The server name to format
 * @returns Formatted server name in "owner/project" format
 */
export function formatMCPServerName(serverName: string): string {
  if (!serverName || typeof serverName !== 'string') {
    return serverName || '';
  }

  // Remove common prefixes and normalize
  let normalized = serverName.trim();
  
  // Remove URL prefixes
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    // Extract the path part after the domain
    try {
      const url = new URL(normalized);
      normalized = url.pathname;
    } catch (e) {
      // If URL parsing fails, keep as is
    }
  }
  
  // Remove file:// prefix
  if (normalized.startsWith('file://')) {
    normalized = normalized.substring(7);
  }
  
  // Remove common registry prefixes
  const prefixes = ['github:', 'gitee:', 'direct:'];
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.substring(prefix.length);
      break;
    }
  }
  
  // Remove .json suffix
  if (normalized.endsWith('.json')) {
    normalized = normalized.substring(0, normalized.length - 5);
  }
  
  // Remove /mcp.json suffix
  if (normalized.endsWith('/mcp')) {
    normalized = normalized.substring(0, normalized.length - 4);
  }
  
  // Handle GitHub format: github/owner/repo or github/repo-name
  if (normalized.startsWith('github/')) {
    const parts = normalized.split('/');
    if (parts.length >= 3) {
      // github/owner/repo -> owner/repo
      return `${parts[1]}/${parts[2]}`;
    } else if (parts.length === 2) {
      // github/repo-name -> github/repo-name (keep as is since no owner)
      return normalized;
    }
  }
  
  // Handle Gitee format: owner/server from search results
  // Already in owner/server format, just ensure it's clean
  const parts = normalized.split('/');
  if (parts.length >= 2) {
    // Already has owner/project format
    return `${parts[0]}/${parts[1]}`;
  }
  
  // If we get here and it's a single name, check if it contains owner info
  // Some names might be like "owner-repo" or similar
  const dashIndex = normalized.indexOf('-');
  if (dashIndex > 0) {
    // Try to split by dash as owner-repo
    return normalized.replace('-', '/');
  }
  
  // Return as is if no transformation applied
  return normalized;
}

/**
 * Extract owner from MCP server name
 * 
 * @param serverName - The server name
 * @returns Owner part or empty string
 */
export function getMCPServerOwner(serverName: string): string {
  const formatted = formatMCPServerName(serverName);
  const parts = formatted.split('/');
  return parts.length >= 1 ? parts[0] : '';
}

/**
 * Extract project from MCP server name
 * 
 * @param serverName - The server name
 * @returns Project part or empty string
 */
export function getMCPServerProject(serverName: string): string {
  const formatted = formatMCPServerName(serverName);
  const parts = formatted.split('/');
  return parts.length >= 2 ? parts[1] : '';
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
