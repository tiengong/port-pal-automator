import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TestTube2, Clock, CheckCircle2, XCircle, Pause } from "lucide-react";

interface TestCase {
  id: string;
  uniqueId: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'paused';
  isRunning: boolean;
  currentCommand: number;
  commands: any[];
}

interface TestCaseHeaderProps {
  currentTestCase: TestCase | null;
}

export const TestCaseHeader: React.FC<TestCaseHeaderProps> = ({ currentTestCase }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="w-4 h-4 text-warning animate-spin" />;
      case 'passed':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-muted-foreground" />;
      default:
        return <TestTube2 className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'passed':
        return 'default'; // 使用 default 替代 success
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (!currentTestCase) {
    return (
      <Card className="mx-4 mt-4 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-center text-muted-foreground">
            <TestTube2 className="w-5 h-5 mr-2" />
            <span>请选择一个测试用例</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-4 mt-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {currentTestCase.name}
              </h3>
              <Badge 
                variant={getStatusVariant(currentTestCase.status)} 
                className={`flex items-center gap-1 text-xs px-2 py-1 ${
                  currentTestCase.status === 'running' ? 'bg-warning/10 text-warning border-warning/20' :
                  currentTestCase.status === 'passed' ? 'bg-success/10 text-success border-success/20' :
                  currentTestCase.status === 'paused' ? 'bg-secondary/10 text-secondary-foreground' : ''
                }`}
              >
                {getStatusIcon(currentTestCase.status)}
                {currentTestCase.status === 'running' ? '运行中' : 
                 currentTestCase.status === 'passed' ? '通过' :
                 currentTestCase.status === 'failed' ? '失败' :
                 currentTestCase.status === 'paused' ? '暂停' : '待执行'}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {currentTestCase.description || '暂无描述'}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>用例编号:</span>
                <span className="font-mono text-primary">{currentTestCase.uniqueId}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>命令数量:</span>
                <span className="font-medium">{currentTestCase.commands.length}</span>
              </div>
              {currentTestCase.isRunning && (
                <div className="flex items-center gap-1">
                  <span>当前步骤:</span>
                  <span className="font-medium text-warning">
                    {currentTestCase.currentCommand + 1}/{currentTestCase.commands.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};