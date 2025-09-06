import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface TestRunResult {
  testCaseId: string;
  testCaseName: string;
  status: 'success' | 'failed' | 'partial';
  startTime: Date;
  endTime: Date;
  duration: number;
  totalCommands: number;
  passedCommands: number;
  failedCommands: number;
  warnings: number;
  errors: number;
  failureLogs: {
    commandIndex: number;
    commandText: string;
    error: string;
    timestamp: Date;
  }[];
}

interface RunResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: TestRunResult | null;
}

export const RunResultDialog: React.FC<RunResultDialogProps> = ({
  isOpen,
  onClose,
  result
}) => {
  const { t } = useTranslation();

  if (!result) return null;

  const getStatusIcon = () => {
    switch (result.status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'partial':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (result.status) {
      case 'success':
        return 'text-success border-success/20 bg-success/10';
      case 'failed':
        return 'text-destructive border-destructive/20 bg-destructive/10';
      case 'partial':
        return 'text-warning border-warning/20 bg-warning/10';
      default:
        return 'text-muted-foreground border-border bg-secondary';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    return `${seconds}.${milliseconds.toString().padStart(3, '0')}s`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            测试执行结果
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 测试用例信息 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{result.testCaseName}</h4>
              <Badge className={`${getStatusColor()} border`}>
                {result.status === 'success' ? '成功' : 
                 result.status === 'failed' ? '失败' : '部分成功'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>开始时间: {result.startTime.toLocaleTimeString()}</div>
              <div>结束时间: {result.endTime.toLocaleTimeString()}</div>
              <div>执行时长: {formatDuration(result.duration)}</div>
              <div>总命令数: {result.totalCommands}</div>
            </div>
          </div>

          {/* 执行统计 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-success/10 border border-success/20 rounded-md">
              <div className="text-2xl font-bold text-success">{result.passedCommands}</div>
              <div className="text-sm text-muted-foreground">成功</div>
            </div>
            <div className="text-center p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="text-2xl font-bold text-destructive">{result.failedCommands}</div>
              <div className="text-sm text-muted-foreground">失败</div>
            </div>
            <div className="text-center p-3 bg-warning/10 border border-warning/20 rounded-md">
              <div className="text-2xl font-bold text-warning">{result.warnings}</div>
              <div className="text-sm text-muted-foreground">警告</div>
            </div>
            <div className="text-center p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="text-2xl font-bold text-destructive">{result.errors}</div>
              <div className="text-sm text-muted-foreground">错误</div>
            </div>
          </div>

          {/* 失败日志 */}
          {result.failureLogs.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" />
                失败详情 ({result.failureLogs.length})
              </h4>
              <ScrollArea className="h-40 w-full border rounded-md">
                <div className="p-3 space-y-2">
                  {result.failureLogs.map((log, index) => (
                    <div key={index} className="p-2 bg-destructive/5 border border-destructive/20 rounded text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-destructive">
                          命令 #{log.commandIndex + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-muted-foreground mb-1">
                        <code className="bg-secondary px-1 rounded">{log.commandText}</code>
                      </div>
                      <div className="text-destructive">{log.error}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* 成功提示 */}
          {result.status === 'success' && result.failureLogs.length === 0 && (
            <div className="p-4 bg-success/10 border border-success/20 rounded-md text-center">
              <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-success font-medium">所有命令执行成功！</p>
              <p className="text-sm text-muted-foreground mt-1">
                共执行 {result.totalCommands} 条命令，耗时 {formatDuration(result.duration)}
              </p>
            </div>
          )}

          {/* 关闭按钮 */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};