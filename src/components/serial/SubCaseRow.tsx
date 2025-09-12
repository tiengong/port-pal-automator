// SubCaseRow.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, PlayCircle, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { TestCase } from "./types";
import { CommandRow } from "./CommandRow";
import { cn } from "@/lib/utils";

interface SubCaseRowProps {
  subCase: TestCase;
  parentCaseId: string;
  level: number;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPosition: 'above' | 'below' | null;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, caseId: string, type: 'subcase', itemId: string, index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, caseId: string, index: number, position: 'above' | 'below') => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onSelectCase: (caseId: string) => void;
  onToggleExpand: (caseId: string) => void;
  onUpdateCaseSelection: (caseId: string, selected: boolean) => void;
  onRunTestCase: (caseId: string) => void;
  onEditCase: (testCase: TestCase) => void;
  onSetLastFocusedChild: (caseId: string, type: 'subcase', itemId: string, index: number) => void;
  // 新增：递归渲染子用例所需的props
  onRunCommand?: (caseId: string, commandIndex: number) => void;
  onEditCommand?: (caseId: string, commandIndex: number) => void;
  onDeleteCommand?: (caseId: string, commandId: string) => void;
  onToggleCommandSelection?: (caseId: string, commandId: string, selected: boolean) => void;
  onInlineEditStart?: (commandId: string, value: string) => void;
  onInlineEditSave?: (caseId: string, commandId: string) => void;
  onInlineEditChange?: (value: string) => void;
  onMoveCommand?: (fromIndex: number, toIndex: number) => void;
  onContextMenuCommand?: (e: React.MouseEvent, commandId: string, targetType: 'command') => void;
  onAddSubCase?: (caseId: string) => void;
  onAddCommand?: (caseId: string) => void;
  onAddUrc?: (caseId: string) => void;
  storedParameters?: { [key: string]: { value: string; timestamp: number } };
  executingCommand?: { caseId: string; commandIndex: number };
  inlineEdit?: { commandId: string | null; value: string };
  dragInfo?: any;
  formatCommandIndex?: (index: number) => string;
  t?: (key: string) => string;
}

export const SubCaseRow: React.FC<SubCaseRowProps> = ({
  subCase,
  parentCaseId,
  level,
  isDragging,
  isDropTarget,
  dropPosition,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelectCase,
  onToggleExpand,
  onUpdateCaseSelection,
  onRunTestCase,
  onEditCase,
  onSetLastFocusedChild,
  // 新增props
  onRunCommand,
  onEditCommand,
  onDeleteCommand,
  onToggleCommandSelection,
  onInlineEditStart,
  onInlineEditSave,
  onInlineEditChange,
  onMoveCommand,
  onContextMenuCommand,
  onAddSubCase,
  onAddCommand,
  onAddUrc,
  storedParameters,
  executingCommand,
  inlineEdit,
  dragInfo,
  formatCommandIndex,
  t
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'running':
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />;
      case 'partial':
        return <AlertCircle className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div 
      key={subCase.id} 
      className={`p-2 hover:bg-muted/50 transition-colors cursor-move select-none ${
        isDragging ? 'opacity-50' : ''
      } ${
        isDropTarget && dropPosition === 'above' ? 'border-t-2 border-primary' : ''
      } ${
        isDropTarget && dropPosition === 'below' ? 'border-b-2 border-primary' : ''
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, parentCaseId, 'subcase', subCase.id, 0)}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const position = e.clientY < midpoint ? 'above' : 'below';
        
        onDragOver(e, parentCaseId, 0, position);
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 12}px` }}>
        {/* 展开/折叠按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 flex-shrink-0"
          onClick={() => onToggleExpand(subCase.id)}
        >
          {subCase.subCases.length > 0 || subCase.commands.length > 0 ? (
            subCase.isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )
          ) : (
            <div className="w-3.5 h-3.5" />
          )}
        </Button>

        {/* 复选框 */}
        <Checkbox
          checked={subCase.selected}
          onCheckedChange={(checked) => onUpdateCaseSelection(subCase.id, checked as boolean)}
          className="flex-shrink-0 w-3.5 h-3.5"
        />
        
        {/* 子用例内容 */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => {
            onSelectCase(subCase.id);
            onSetLastFocusedChild(parentCaseId, 'subcase', subCase.id, 0);
          }}
        >
          <div className="flex items-center gap-2">
            <span className={`font-medium text-xs truncate ${
              subCase.id === subCase.id ? 'text-primary' : ''
            }`}>
              {subCase.name}
            </span>
          </div>
        </div>
        
        {/* 状态指示器 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {getStatusIcon(subCase.status)}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onRunTestCase(subCase.id)}
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>运行</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onEditCase(subCase)}
                >
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>设置</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* 子用例的内容由外部统一渲染逻辑处理，不再内部递归 */}
      {/* 这样可以避免双重渲染问题 */}
    </div>
  );
};