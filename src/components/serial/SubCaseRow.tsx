// SubCaseRow.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, PlayCircle, Settings } from "lucide-react";
import { TestCase } from "./types";

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
  onSetLastFocusedChild
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <AlertCircle className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div 
      key={subCase.id} 
      className={`p-3 hover:bg-muted/50 transition-colors cursor-move select-none ${
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
      <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 16}px` }}>
        {/* 展开/折叠按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 flex-shrink-0"
          onClick={() => onToggleExpand(subCase.id)}
        >
          {subCase.subCases.length > 0 || subCase.commands.length > 0 ? (
            subCase.isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </Button>

        {/* 复选框 */}
        <Checkbox
          checked={subCase.selected}
          onCheckedChange={(checked) => onUpdateCaseSelection(subCase.id, checked as boolean)}
          className="flex-shrink-0"
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
            <span className={`font-medium text-sm truncate ${
              subCase.id === subCase.id ? 'text-primary' : ''
            }`}>
              {subCase.name}
            </span>
          </div>
        </div>
        
        {/* 状态指示器 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {getStatusIcon(subCase.status)}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onRunTestCase(subCase.id)}
                >
                  <PlayCircle className="w-4 h-4" />
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
                  className="h-8 w-8 p-0"
                  onClick={() => onEditCase(subCase)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>设置</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};