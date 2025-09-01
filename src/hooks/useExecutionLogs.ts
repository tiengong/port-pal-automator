
import { useState, useCallback } from 'react';

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export const useExecutionLogs = () => {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);

  const addLog = useCallback((type: ExecutionLog['type'], message: string, details?: string) => {
    const newLog: ExecutionLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      message,
      details
    };
    
    setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep only last 50 logs
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const getLatestLog = useCallback(() => {
    return logs[0] || null;
  }, [logs]);

  return {
    logs,
    addLog,
    clearLogs,
    getLatestLog
  };
};
