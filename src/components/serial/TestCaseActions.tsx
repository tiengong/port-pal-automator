import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Play, 
  Square, 
  Pause, 
  RotateCcw, 
  Settings, 
  TestTube2, 
  Plus,
  Upload,
  Download,
  RefreshCw
} from "lucide-react";
import { TestCase } from "./TestCaseManager";

interface TestCaseActionsProps {
  currentTestCase: TestCase | null;
  connectedPorts: any[];
  onRunTestCase: (caseId: string) => void;
  onStopTestCase: (caseId: string) => void;
  onPauseTestCase: (caseId: string) => void;
  onResetTestCase: (caseId: string) => void;
  onEditTestCase: (testCase: TestCase) => void;
  onAddCommand: () => void;
  onAddSubcase: () => void;
  onSyncTestCases: () => void;
  onUploadTestCases: () => void;
  onDownloadTestCases: () => void;
}

export const TestCaseActions: React.FC<TestCaseActionsProps> = ({
  currentTestCase,
  connectedPorts,
  onRunTestCase,
  onStopTestCase,
  onPauseTestCase,
  onResetTestCase,
  onEditTestCase,
  onAddCommand,
  onAddSubcase,
  onSyncTestCases,
  onUploadTestCases,
  onDownloadTestCases
}) => {
  const isRunning = currentTestCase?.isRunning || false;
  const hasConnection = connectedPorts.length > 0;

  return (
    <div className="border-b border-border/50 p-4">
      <div className="flex items-center justify-between gap-4">
        {/* 左侧：测试执行控制 */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => currentTestCase && onRunTestCase(currentTestCase.id)}
                  disabled={!currentTestCase || !hasConnection || isRunning}
                  size="sm"
                  className="h-8"
                >
                  <Play className="w-3 h-3 mr-2" />
                  运行
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>运行当前测试用例</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => currentTestCase && onPauseTestCase(currentTestCase.id)}
                  disabled={!currentTestCase || !isRunning}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <Pause className="w-3 h-3 mr-2" />
                  暂停
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>暂停测试执行</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => currentTestCase && onStopTestCase(currentTestCase.id)}
                  disabled={!currentTestCase || !isRunning}
                  variant="destructive"
                  size="sm"
                  className="h-8"
                >
                  <Square className="w-3 h-3 mr-2" />
                  停止
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>停止测试执行</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => currentTestCase && onResetTestCase(currentTestCase.id)}
                  disabled={!currentTestCase}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <RotateCcw className="w-3 h-3 mr-2" />
                  重置
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>重置测试状态</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {!hasConnection && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              请先连接串口
            </Badge>
          )}
        </div>

        {/* 右侧：编辑和管理操作 */}
        <div className="flex items-center gap-2">
          {/* 添加命令菜单 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8" disabled={!currentTestCase}>
                <Plus className="w-3 h-3 mr-2" />
                添加
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="space-y-2">
                <Button
                  onClick={onAddCommand}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                >
                  <TestTube2 className="w-3 h-3 mr-2" />
                  添加命令
                </Button>
                <Button
                  onClick={onAddSubcase}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                >
                  <TestTube2 className="w-3 h-3 mr-2" />
                  添加子用例
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => currentTestCase && onEditTestCase(currentTestCase)}
                  disabled={!currentTestCase}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <Settings className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>编辑测试用例</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 同步和文件操作 */}
          <div className="h-4 w-px bg-border mx-1" />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onSyncTestCases}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>同步测试用例</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onUploadTestCases}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <Upload className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>上传测试用例</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onDownloadTestCases}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>下载测试用例</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};