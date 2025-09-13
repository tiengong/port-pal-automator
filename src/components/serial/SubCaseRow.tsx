import React, { useState, useEffect, useRef } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlayCircle, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { TestCase } from './types';

interface SubCaseRowProps {
  subCase: TestCase;
  parentCaseId: string;
  level: number;
  isSelected: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPosition?: 'above' | 'below';
  onSelect: (caseId: string, selected: boolean) => void;
  onClick: () => void;
  onDoubleClick: () => void;
  onRunTestCase: (caseId: string) => void;
  onEditCase: (subCase: TestCase) => void;
  onToggleExpand: (caseId: string) => void;
  onUpdateCaseName: (caseId: string, newName: string) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  connectedPorts: Array<{
    port: any;
    params: any;
  }>;
}

export const SubCaseRow = React.memo<SubCaseRowProps>(({
  subCase,
  parentCaseId,
  level,
  isSelected,
  isDragging,
  isDropTarget,
  dropPosition,
  onSelect,
  onClick,
  onDoubleClick,
  onRunTestCase,
  onEditCase,
  onToggleExpand,
  onUpdateCaseName,
  getStatusIcon,
  connectedPorts
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(subCase.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Keep editing name in sync with subCase.name when not editing
  useEffect(() => {
    if (!isEditingName) {
      setEditingName(subCase.name);
    }
  }, [subCase.name, isEditingName]);

  // 自动聚焦输入框
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // 处理双击开始编辑
  const handleDoubleClick = () => {
    setIsEditingName(true);
    setEditingName(subCase.name);
  };

  // 处理名称保存
  const handleNameSave = () => {
    if (editingName.trim() !== subCase.name) {
      onUpdateCaseName(subCase.id, editingName.trim());
    }
    setIsEditingName(false);
  };

  // 处理输入框键盘事件
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditingName(subCase.name);
    }
  };

  // 处理输入框失焦
  const handleInputBlur = () => {
    handleNameSave();
  };

  return (
    <div
      className={`p-3 hover:bg-muted/50 transition-colors cursor-move select-none ${
        isDragging ? 'opacity-50' : ''
      } ${
        isDropTarget && dropPosition === 'above' ? 'border-t-2 border-primary' : ''
      } ${
        isDropTarget && dropPosition === 'below' ? 'border-b-2 border-primary' : ''
      }`}
      draggable
      onDragStart={(e) => {
        console.log('Drag start:', subCase.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        e.preventDefault();
        console.log('Drop event');
      }}
    >
      <div className="flex items-center gap-3 pl-4" style={{ paddingLeft: `${level * 20}px` }}>
        {/* 复选框 */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => {
            onSelect(subCase.id, checked as boolean);
          }}
          className="flex-shrink-0"
        />
        
        {/* 子用例内容 */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={onClick}
          onDoubleClick={handleDoubleClick}
        >
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onBlur={handleInputBlur}
                className="font-medium text-sm bg-transparent border-b border-primary outline-none focus:border-primary-dark truncate w-full"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={`font-medium text-sm truncate`}>
                {subCase.name}
              </span>
            )}
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
                  disabled={connectedPorts.length === 0}
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
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
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
              </TooltipTrigger>
              <TooltipContent>
                <p>{subCase.isExpanded ? '折叠' : '展开'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
});