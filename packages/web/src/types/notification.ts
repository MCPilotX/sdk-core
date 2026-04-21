// Notification related types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  source?: 'server' | 'process' | 'workflow' | 'system';
  sourceId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  enabled: boolean;
  desktopNotifications: boolean;
  soundEnabled: boolean;
  types: {
    info: boolean;
    success: boolean;
    warning: boolean;
    error: boolean;
    system: boolean;
  };
  sources: {
    server: boolean;
    process: boolean;
    workflow: boolean;
    system: boolean;
  };
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    info: number;
    success: number;
    warning: number;
    error: number;
    system: number;
  };
  bySource: {
    server: number;
    process: number;
    workflow: number;
    system: number;
  };
}