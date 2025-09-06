// serialLogUtils.ts - Extract common logging utilities
export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'sent' | 'received' | 'system' | 'error';
  data: string;
  format: 'utf8' | 'hex';
}

export interface MergedLogEntry extends LogEntry {
  portLabel: string;
}

// Generate unique log entry ID
export const generateLogId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Create log entry
export const createLogEntry = (
  type: LogEntry['type'], 
  data: string, 
  format: 'utf8' | 'hex' = 'utf8'
): LogEntry => {
  return {
    id: generateLogId(),
    timestamp: new Date(),
    type,
    data,
    format
  };
};

// Create merged log entry with port label
export const createMergedLogEntry = (
  entry: LogEntry, 
  portLabel: string
): MergedLogEntry => {
  return {
    ...entry,
    portLabel
  };
};

// Apply log line limit
export const applyLogLimit = <T extends LogEntry>(
  logs: T[], 
  maxLines: number
): T[] => {
  return logs.slice(-maxLines);
};

// Get text color for log types
export const getLogTextColor = (logType: LogEntry['type'], colorMode: string = 'color'): string => {
  if (colorMode === 'black') {
    return 'text-foreground';
  }
  
  // By type coloring
  switch (logType) {
    case 'sent': return 'text-blue-600 dark:text-blue-400';
    case 'received': return 'text-green-600 dark:text-green-400';
    case 'system': return 'text-yellow-600 dark:text-yellow-400';
    default: return 'text-foreground';
  }
};

// Get badge content for log types
export const getLogBadgeContent = (logType: LogEntry['type']): string => {
  switch (logType) {
    case 'sent': return '[TX]';
    case 'received': return '[RX]'; 
    case 'system': return '[SYS]';
    default: return '[?]';
  }
};

// Update statistics for logs
export interface LogStats {
  sentBytes: number;
  receivedBytes: number;
  totalLogs: number;
}

export const updateLogStats = (
  currentStats: LogStats | undefined,
  logType: LogEntry['type'],
  dataLength: number
): LogStats => {
  const stats = currentStats || { sentBytes: 0, receivedBytes: 0, totalLogs: 0 };
  
  return {
    totalLogs: stats.totalLogs + 1,
    receivedBytes: logType === 'received' ? stats.receivedBytes + dataLength : stats.receivedBytes,
    sentBytes: logType === 'sent' ? stats.sentBytes + dataLength : stats.sentBytes
  };
};

// Export logs to text format
export const exportLogsToText = (
  logs: { [portIndex: number]: LogEntry[] },
  showTimestamp: boolean = true,
  t: (key: string) => string
): string => {
  let content = '';
  Object.entries(logs).forEach(([portIndex, portLogs]) => {
    content += `=== ${t('terminal.port')} ${parseInt(portIndex) + 1} ===\n`;
    portLogs.forEach(log => {
      const timestamp = showTimestamp ? `[${log.timestamp.toLocaleTimeString()}] ` : '';
      const type = log.type === 'sent' ? t('terminal.sent') : 
                   log.type === 'received' ? t('terminal.received') : 
                   t('terminal.system');
      content += `${timestamp}${type}: ${log.data}\n`;
    });
    content += '\n';
  });
  return content;
};