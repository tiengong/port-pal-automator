import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface RunResult {
  runId: string;
  testCaseName: string;
  status: 'pass' | 'fail';
  errorCount: number;
  warningCount: number;
  failureLogs: string[];
  startTime: Date;
  endTime: Date;
}

interface RunResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: RunResult | null;
}

export const RunResultDialog: React.FC<RunResultDialogProps> = ({
  open,
  onOpenChange,
  result
}) => {
  if (!result) return null;

  const duration = result.endTime.getTime() - result.startTime.getTime();
  const durationText = duration < 1000 
    ? `${duration}ms` 
    : `${(duration / 1000).toFixed(1)}s`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {result.status === 'pass' ? (
              <CheckCircle className="w-6 h-6 text-success" />
            ) : (
              <XCircle className="w-6 h-6 text-destructive" />
            )}
            <div className="flex flex-col">
              <span className="text-lg">
                测试结果: {result.status === 'pass' ? '通过' : '失败'}
              </span>
              <span className="text-sm text-muted-foreground font-normal">
                {result.testCaseName} - 执行时间: {durationText}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 统计信息 */}
          <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant={result.status === 'pass' ? 'default' : 'destructive'} className="h-6">
                {result.status === 'pass' ? '通过' : '失败'}
              </Badge>
            </div>
            
            {result.errorCount > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm">
                  <span className="font-medium text-destructive">{result.errorCount}</span> 个错误
                </span>
              </div>
            )}
            
            {result.warningCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-sm">
                  <span className="font-medium text-warning">{result.warningCount}</span> 个异常
                </span>
              </div>
            )}
          </div>

          {/* 失败日志 */}
          {result.failureLogs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">失败详情:</h4>
              <ScrollArea className="max-h-60 w-full border rounded-lg">
                <div className="p-4 space-y-2">
                  {result.failureLogs.map((log, index) => (
                    <div key={index} className="text-sm text-destructive bg-destructive/5 p-2 rounded border-l-2 border-destructive/20">
                      {log}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};