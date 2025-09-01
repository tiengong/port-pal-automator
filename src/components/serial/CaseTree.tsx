import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FolderPlus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { TestCase } from './types';
import { cn } from '@/lib/utils';

interface CaseTreeProps {
  cases: TestCase[];
  selectedId: string;
  onSelect: (caseId: string) => void;
  onToggleExpand: (caseId: string) => void;
  onAddSubCase: (parentId: string) => void;
  level?: number;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    case 'failed':
      return <XCircle className="w-3 h-3 text-red-500" />;
    case 'running':
      return <AlertCircle className="w-3 h-3 text-yellow-500 animate-pulse" />;
    case 'partial':
      return <Clock className="w-3 h-3 text-blue-500" />;
    default:
      return null;
  }
};

export const CaseTree: React.FC<CaseTreeProps> = ({
  cases,
  selectedId,
  onSelect,
  onToggleExpand,
  onAddSubCase,
  level = 0
}) => {
  return (
    <div className="space-y-1">
      {cases.map((testCase) => (
        <div key={testCase.id}>
          {/* 测试用例节点 */}
          <div
            className={cn(
              "flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group cursor-pointer",
              selectedId === testCase.id && "bg-primary/10 border border-primary/20"
            )}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
          >
            {/* 展开/折叠按钮 */}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                if (testCase.subCases.length > 0) {
                  onToggleExpand(testCase.id);
                }
              }}
            >
              {testCase.subCases.length > 0 ? (
                testCase.isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )
              ) : (
                <div className="w-3 h-3" /> // 占位符，保持对齐
              )}
            </Button>

            {/* 文件夹图标 */}
            <div className="flex-shrink-0">
              {testCase.subCases.length > 0 ? (
                testCase.isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-blue-500" />
                ) : (
                  <Folder className="w-4 h-4 text-blue-500" />
                )
              ) : (
                <Folder className="w-4 h-4 text-gray-500" />
              )}
            </div>

            {/* 用例名称和信息 */}
            <div
              className="flex-1 min-w-0 flex items-center gap-2"
              onClick={() => onSelect(testCase.id)}
            >
              <span className="font-medium text-sm truncate">
                {testCase.name}
              </span>
              
              {/* 唯一编号 */}
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {testCase.uniqueId}
              </Badge>

              {/* 命令计数 */}
              {testCase.commands.length > 0 && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {testCase.commands.length} 条命令
                </Badge>
              )}

              {/* 子用例计数 */}
              {testCase.subCases.length > 0 && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {testCase.subCases.length} 个子用例
                </Badge>
              )}

              {/* 状态指示器 */}
              {getStatusIcon(testCase.status)}
            </div>

            {/* 新增子用例按钮 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddSubCase(testCase.id);
                    }}
                  >
                    <FolderPlus className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>新增子用例</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* 递归渲染子用例 */}
          {testCase.isExpanded && testCase.subCases.length > 0 && (
            <CaseTree
              cases={testCase.subCases}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onAddSubCase={onAddSubCase}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
};