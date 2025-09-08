/**
 * 统一日志管理工具
 * 根据环境自动切换日志输出级别
 */

// 环境判断
const isDev = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development';
const logLevel = import.meta.env.VITE_LOG_LEVEL || (isDev ? 'debug' : 'error');
const enableDebug = import.meta.env.VITE_ENABLE_DEBUG === 'true' || isDev;

// 日志级别枚举
enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5
}

// 日志级别映射
const logLevelMap: Record<string, LogLevel> = {
  'trace': LogLevel.TRACE,
  'debug': LogLevel.DEBUG,
  'info': LogLevel.INFO,
  'warn': LogLevel.WARN,
  'error': LogLevel.ERROR,
  'silent': LogLevel.SILENT
};

const currentLogLevel = logLevelMap[logLevel] ?? (isDev ? LogLevel.DEBUG : LogLevel.ERROR);

// 性能监控工具
class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();

  static mark(name: string): void {
    if (!isDev) return;
    this.marks.set(name, performance.now());
  }

  static measure(name: string, startMark?: string): number | null {
    if (!isDev) return null;
    
    const endTime = performance.now();
    const startTime = startMark ? this.marks.get(startMark) : this.marks.get(name);
    
    if (startTime === undefined) return null;
    
    const duration = endTime - startTime;
    this.marks.delete(name);
    
    return duration;
  }
}

// 日志格式化工具
class LogFormatter {
  static formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (args.length > 0) {
      return `${prefix} ${message} ${args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')}`;
    }
    
    return `${prefix} ${message}`;
  }

  static formatError(error: Error | unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
    }
    return String(error);
  }
}

// 主要日志类
class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix ? `[${prefix}] ` : '';
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= currentLogLevel;
  }

  trace(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.TRACE)) return;
    
    const formattedMessage = LogFormatter.formatMessage('TRACE', `${this.prefix}${message}`, ...args);
    console.trace(formattedMessage);
  }

  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const formattedMessage = LogFormatter.formatMessage('DEBUG', `${this.prefix}${message}`, ...args);
    console.debug(formattedMessage);
  }

  info(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const formattedMessage = LogFormatter.formatMessage('INFO', `${this.prefix}${message}`, ...args);
    console.info(formattedMessage);
  }

  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const formattedMessage = LogFormatter.formatMessage('WARN', `${this.prefix}${message}`, ...args);
    console.warn(formattedMessage);
  }

  error(message: string, error?: Error | unknown, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    let formattedMessage = LogFormatter.formatMessage('ERROR', `${this.prefix}${message}`, ...args);
    
    if (error) {
      formattedMessage += `\n${LogFormatter.formatError(error)}`;
    }
    
    console.error(formattedMessage);
  }

  // 性能监控方法
  mark(name: string): void {
    if (!enableDebug) return;
    PerformanceMonitor.mark(`${this.prefix}${name}`);
  }

  measure(name: string, startMark?: string): number | null {
    if (!enableDebug) return null;
    return PerformanceMonitor.measure(`${this.prefix}${name}`, startMark ? `${this.prefix}${startMark}` : undefined);
  }

  // 分组日志
  group(label: string): void {
    if (!enableDebug) return;
    console.group(`${this.prefix}${label}`);
  }

  groupEnd(): void {
    if (!enableDebug) return;
    console.groupEnd();
  }

  // 表格日志
  table(data: any, columns?: string[]): void {
    if (!enableDebug) return;
    console.table(data, columns);
  }

  // 时间日志
  time(label: string): void {
    if (!enableDebug) return;
    console.time(`${this.prefix}${label}`);
  }

  timeEnd(label: string): void {
    if (!enableDebug) return;
    console.timeEnd(`${this.prefix}${label}`);
  }
}

// 创建全局日志实例
export const logger = new Logger();

// 创建特定模块的日志实例
export const createLogger = (prefix: string): Logger => {
  return new Logger(prefix);
};

// 序列化日志（用于发送到后端）
export const serializeLog = (level: string, message: string, ...args: any[]): string => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    args: args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ),
    userAgent: navigator.userAgent,
    url: window.location.href,
  });
};

// 日志级别工具函数
export const setLogLevel = (level: string): void => {
  const newLevel = logLevelMap[level];
  if (newLevel !== undefined) {
    // 这里可以添加逻辑来动态更新日志级别
    console.log(`[Logger] Log level set to: ${level}`);
  }
};

export const getLogLevel = (): string => {
  return Object.keys(logLevelMap).find(key => logLevelMap[key] === currentLogLevel) || 'info';
};

// 性能监控工具函数
export const performanceMonitor = {
  mark: (name: string) => logger.mark(name),
  measure: (name: string, startMark?: string) => logger.measure(name, startMark),
  time: (label: string) => logger.time(label),
  timeEnd: (label: string) => logger.timeEnd(label),
};