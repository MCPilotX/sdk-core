/**
 * Format utility functions
 */

/**
 * Format a timestamp into a relative time string (e.g., "5 minutes ago", "2 hours ago")
 */
export function formatRelativeTime(timestamp: string | Date | number | undefined | null): string {
  if (!timestamp && timestamp !== 0) return '';
  
  let date: Date;
  if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    return '';
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return '';
  }
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  // Handle future dates
  if (diffMs < 0) {
    return 'just now';
  }
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (days < 30) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    const months = Math.floor(days / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Format an MCP server name for display (e.g., "github-mcp-server" -> "GitHub MCP Server")
 */
export function formatMCPServerName(name: string): string {
  if (!name) return '';
  
  // Handle special cases
  if (name.toLowerCase() === 'github') return 'GitHub';
  if (name.toLowerCase() === 'gitlab') return 'GitLab';
  if (name.toLowerCase() === 'docker') return 'Docker';
  
  // Split by common separators and capitalize each word
  return name
    .split(/[-_\s.]+/)
    .map(word => {
      if (word.length === 0) return word;
      // Handle acronyms (all uppercase)
      if (word === word.toUpperCase() && word.length <= 4) return word;
      // Capitalize first letter, lowercase rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
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

// Download file utility
function downloadFile(filename: string, content: string, type: string = 'text/plain'): void {
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
