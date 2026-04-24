/**
 * Output Formatting System - Type Definitions
 * 
 * A plugin-based, extensible output formatting architecture
 */

/**
 * Formatting context provides additional information for formatters
 * to make better formatting decisions
 */
export interface FormatContext {
  /** Original user query that triggered the execution */
  userQuery?: string;
  
  /** Tool name that generated the output */
  toolName?: string;
  
  /** Server name where the tool is hosted */
  serverName?: string;
  
  /** Full execution result metadata */
  executionResult?: any;
  
  /** User preferences for formatting */
  userPreferences?: {
    detailLevel: 'minimal' | 'standard' | 'detailed';
    language: string;
    format: 'text' | 'markdown' | 'html';
  };
  
  /** Device type for responsive formatting */
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Base interface for all output formatters
 */
export interface OutputFormatter {
  /**
   * Check if this formatter can handle the given data
   * @param data The data to format
   * @param context Formatting context
   * @returns boolean indicating if formatter can handle the data
   */
  canFormat(data: any, context?: FormatContext): boolean;
  
  /**
   * Format the data into a user-friendly string
   * @param data The data to format
   * @param context Formatting context
   * @returns Formatted string
   */
  format(data: any, context?: FormatContext): string;
  
  /**
   * Priority of this formatter (lower number = higher priority)
   * Default: 100
   */
  priority?: number;
  
  /**
   * Unique identifier for the formatter
   */
  id: string;
  
  /**
   * Human-readable name for the formatter
   */
  name: string;
  
  /**
   * Description of what this formatter does
   */
  description?: string;
  
  /**
   * Supported MIME types or content types
   */
  supportedTypes?: string[];
  
  /**
   * Supported tool name patterns (regex)
   */
  supportedTools?: RegExp[];
  
  /**
   * Confidence score for the match (0-1)
   * Used when multiple formatters claim to handle the same data
   */
  getConfidence?(data: any, context?: FormatContext): number;
}

/**
 * Formatter selection result
 */
export interface FormatterSelection {
  formatter: OutputFormatter;
  confidence: number;
  reason?: string;
}

/**
 * Formatter registry configuration
 */
export interface FormatterRegistryConfig {
  /** Selection strategy */
  selectionStrategy: 'priority-based' | 'confidence-based' | 'hybrid';
  
  /** Enable caching of formatter selections */
  cacheEnabled: boolean;
  
  /** Cache TTL in milliseconds */
  cacheTTL: number;
  
  /** Enable debug logging */
  debug: boolean;
  
  /** Default formatter to use when no match is found */
  defaultFormatterId?: string;
  
  /** Fallback chain of formatter IDs */
  fallbackChain?: string[];
}

/**
 * Formatter registration options
 */
export interface FormatterRegistrationOptions {
  /** Override priority */
  priority?: number;
  
  /** Whether to replace existing formatter with same ID */
  replace?: boolean;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Common data types for intelligent formatting
 */
export enum DataType {
  PLAIN_TEXT = 'plain-text',
  JSON = 'json',
  TABLE = 'table',
  TICKET_DATA = 'ticket-data',
  ERROR = 'error',
  SUCCESS = 'success',
  LOADING = 'loading',
  EMPTY = 'empty',
  COMPOSITE = 'composite',
  UNKNOWN = 'unknown'
}

/**
 * Special rendering types for integration with visualization libraries
 */
export enum RenderingType {
  /** Plain text output */
  TEXT = 'text',
  
  /** Markdown formatted text */
  MARKDOWN = 'markdown',
  
  /** HTML output */
  HTML = 'html',
  
  /** JSON data that should be rendered with json-beautiful-render */
  JSON_VISUAL = 'json-visual',
  
  /** Table data that could be rendered as a table component */
  TABLE_VISUAL = 'table-visual'
}

/**
 * Visual rendering metadata for integration with UI components
 */
export interface VisualRenderingMetadata {
  /** Type of visual rendering needed */
  renderingType: RenderingType;
  
  /** Raw data for visual rendering */
  rawData: any;
  
  /** Component-specific options */
  options?: Record<string, any>;
  
  /** Component to use for rendering (optional) */
  componentName?: string;
}

/**
 * Formatting result with metadata
 */
export interface FormattingResult {
  /** Formatted output string */
  output: string;
  
  /** Formatter used */
  formatterId: string;
  
  /** Data type detected */
  dataType: DataType;
  
  /** Confidence score */
  confidence: number;
  
  /** Performance metrics */
  metrics: {
    formattingTime: number;
    cacheHit: boolean;
  };
  
  /** Original data (reference) */
  originalData: any;
  
  /** Formatting context used */
  context?: FormatContext;
  
  /** Visual rendering metadata (if applicable) */
  visualRendering?: VisualRenderingMetadata;
}
