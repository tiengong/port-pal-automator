import React, { memo, useCallback, useMemo } from 'react';
import { TestCase } from '@/components/serial/types';
import { DragDropWrapper } from './common/DragDropWrapper';
import { StatusIcon } from './common/StatusIcon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ChevronRight, PlayCircle, Settings } from 'lucide-react';
import { LEVEL_INDENT } from '@/components/serial/styles/common';

export interface TestCaseTreeViewProps {
  testCases: TestCase[];
  selectedCaseId: string;
  dragInfo: {
    isDragging: boolean;
    dragType: 'case' | 'command' | 'subcase' | null;
    dragItemId: string;
    dragSourceCaseId: string;
    dropTarget?: {
      caseId: string;
      position: 'above' | 'below';
    };
  };
  level?: number;
  parentCaseId?: string;
  onSelectCase: (caseId: string) => void;
  onToggleExpand: (caseId: string) => void;
  onUpdateCaseSelection: (caseId: string, selected: boolean) => void;
  onRunTestCase: (caseId: string) => void;
  onEditCase: (testCase: TestCase) => void;
  onSetLastFocusedChild: (caseId: string, type: 'case' | 'subcase', itemId: string, index: number) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, caseId: string, type: 'case' | 'subcase', itemId: string, index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, caseId: string, index: number, position: 'above' | 'below') => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const TestCaseTreeView: React.FC<TestCaseTreeViewProps> = memo(({
  testCases,
  selectedCaseId,
  dragInfo,
  level = 0,
  parentCaseId,
  onSelectCase,
  onToggleExpand,
  onUpdateCaseSelection,
  onRunTestCase,
  onEditCase,
  onSetLastFocusedChild,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  
  const renderTestCase = useCallback((testCase: TestCase, index: number) => {
    const isSelected = testCase.id === selectedCaseId;
    const isDragging = dragInfo.isDragging && dragInfo.dragItemId === testCase.id;
    const isDropTarget = dragInfo.dropTarget?.caseId === testCase.id;
    const dropPosition = dragInfo.dropTarget?.position || null;
    const hasChildren = testCase.subCases.length > 0 || testCase.commands.length > 0;

    const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      onDragStart(e, parentCaseId || testCase.id, level === 0 ? 'case' : 'subcase', testCase.id, index);
    }, [onDragStart, parentCaseId, testCase.id, index, level]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const position = e.clientY < midpoint ? 'above' : 'below';
      onDragOver(e, parentCaseId || testCase.id, index, position);
    }, [onDragOver, parentCaseId, testCase.id, index]);

    const handleToggleExpand = useCallback(() => onToggleExpand(testCase.id), [onToggleExpand, testCase.id]);
    const handleCheckboxChange = useCallback((checked: boolean) => onUpdateCaseSelection(testCase.id, checked), [onUpdateCaseSelection, testCase.id]);
    const handleClick = useCallback(() => {
      onSelectCase(testCase.id);
      onSetLastFocusedChild(parentCaseId || testCase.id, level === 0 ? 'case' : 'subcase', testCase.id, index);
    }, [onSelectCase, onSetLastFocusedChild, parentCaseId, testCase.id, index, level]);

    const handleRunTestCase = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onRunTestCase(testCase.id);
    }, [onRunTestCase, testCase.id]);

    const handleEditCase = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onEditCase(testCase);
    }, [onEditCase, testCase]);

    return (
      <React.Fragment key={testCase.id}>
        <DragDropWrapper
          isDragging={isDragging}
          isDropTarget={isDropTarget}
          dropPosition={dropPosition}
          level={level}
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="flex items-center gap-2">
            {/* 展开/折叠按钮 */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 flex-shrink-0"
              onClick={handleToggleExpand}
            >
              {hasChildren ? (
                testCase.isExpanded ? (
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
              checked={testCase.selected}
              onCheckedChange={handleCheckboxChange}
              className="flex-shrink-0 w-3.5 h-3.5"
            />
            
            {/* 用例内容 */}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
              <div className="flex items-center gap-2">
                <span className={`font-medium text-xs truncate ${
                  isSelected ? 'text-primary font-semibold' : ''
                }`}>
                  {testCase.name}
                </span>
                {testCase.isPreset && (
                  <span className="text-xs text-muted-foreground">
                    [预设]
                  </span>
                )}
              </div>
              {testCase.description && (
                <div className="text-xs text-muted-foreground truncate"
                  title={testCase.description}
                >
                  {testCase.description}
                </div>
              )}
            </div>
            
            {/* 状态指示器 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <StatusIcon status={testCase.status as any} />
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
                      onClick={handleRunTestCase}
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
                      onClick={handleEditCase}
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
        </DragDropWrapper>
        
        {/* 递归渲染子用例 */}
        {testCase.isExpanded && testCase.subCases.length > 0 && (
          <TestCaseTreeView
            testCases={testCase.subCases}
            selectedCaseId={selectedCaseId}
            dragInfo={dragInfo}
            level={level + 1}
            parentCaseId={testCase.id}
            onSelectCase={onSelectCase}
            onToggleExpand={onToggleExpand}
            onUpdateCaseSelection={onUpdateCaseSelection}
            onRunTestCase={onRunTestCase}
            onEditCase={onEditCase}
            onSetLastFocusedChild={onSetLastFocusedChild}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          />
        )}
      </React.Fragment>
    );
  }, [parentCaseId, onSelectCase, onToggleExpand, onUpdateCaseSelection, onRunTestCase, onEditCase, onSetLastFocusedChild, onDragStart, onDragOver, onDragLeave, onDrop, selectedCaseId, dragInfo]);

  return (
    <>
      {testCases.map(renderTestCase)}
    </>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只比较必要的属性
  return (
    prevProps.testCases === nextProps.testCases &&
    prevProps.selectedCaseId === nextProps.selectedCaseId &&
    prevProps.dragInfo === nextProps.dragInfo &&
    prevProps.level === nextProps.level &&
    prevProps.parentCaseId === nextProps.parentCaseId
  );
});