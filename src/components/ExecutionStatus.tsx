
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import { ExecutionLog } from '@/hooks/useExecutionLogs';

interface ExecutionStatusProps {
  latestLog: ExecutionLog | null;
}

export const ExecutionStatus: React.FC<ExecutionStatusProps> = ({ latestLog }) => {
  if (!latestLog) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/70">就绪</span>
      </div>
    );
  }

  const getIcon = () => {
    switch (latestLog.type) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-success" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-destructive" />;
      case 'warning':
        return <AlertCircle className="w-3 h-3 text-warning" />;
      default:
        return <Info className="w-3 h-3 text-primary" />;
    }
  };

  const getTextColor = () => {
    switch (latestLog.type) {
      case 'success':
        return 'text-success';
      case 'error':
        return 'text-destructive';
      case 'warning':
        return 'text-warning';
      default:
        return 'text-primary';
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('zh-CN', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="flex items-center gap-2">
      {getIcon()}
      <span className={`text-xs font-medium ${getTextColor()}`}>
        {latestLog.message}
      </span>
      {latestLog.details && (
        <span className="text-xs text-muted-foreground">
          - {latestLog.details}
        </span>
      )}
      <Badge variant="outline" className="text-xs px-1.5 py-0.5 ml-2">
        {formatTime(latestLog.timestamp)}
      </Badge>
    </div>
  );
};
