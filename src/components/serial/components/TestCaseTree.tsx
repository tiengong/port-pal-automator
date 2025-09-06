import React from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, PlayCircle, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { TestCase, TestCommand } from '../types';
import { CommandRow } from '../CommandRow';
import { getSortedChildren } from '../testCaseUtils';
import { updateCaseById, toggleExpandById } from '../testCaseRecursiveUtils';
import { 
  handleDragStart, 
  handleDragOver, 
  handleDragLeave, 
  handleDrop,
  isDragging,
  isDropTarget,
  getDropPosition,
  type DragDropContext 
} from '../logic/testCaseDragDrop';

interface TestCaseTreeProps {
  testCases: TestCase[];
  selectedTestCaseId: string | null;
  connectedPorts: Array<any>;
  executingCommand: string | null;
  // 状态更新函数
  setTestCases: (cases: TestCase[]) => void;
  setSelectedTestCaseId: (id: string) => void;
  setLastFocusedChild: (child: any) => void;
  // 事件处理函数
  onRunTestCase: (id: string) => void;
  onEditCase: (testCase: TestCase) => void;
  onEditCommand: (caseId: string, commandIndex: number) => void;
  onRunCommand: (caseId: string, commandIndex: number) => void;
  onUpdateCommandSelection: (caseId: string, commandId: string, selected: boolean) => void;
  onSaveInlineEdit: (caseId: string, commandId: string) => void;
  // 拖拽相关
  dragInfo: any;
  setDragInfo: (info: any) => void;
  // UI相关
  inlineEdit: any;
  setInlineEdit: (edit: any) => void;
  toast: (options: any) => void;
}

export const TestCaseTree: React.FC<TestCaseTreeProps> = ({
  testCases,
  selectedTestCaseId,
  connectedPorts,
  executingCommand,
  setTestCases,
  setSelectedTestCaseId,
  setLastFocusedChild,
  onRunTestCase,
  onEditCase,
  onEditCommand,
  onRunCommand,
  onUpdateCommandSelection,
  onSaveInlineEdit,
  dragInfo,
  setDragInfo,
  inlineEdit,
  setInlineEdit,
  toast
}) => {
  const dragDropContext: DragDropContext = {
    testCases,
    setTestCases,
    dragInfo,
    setDragInfo,
    toast
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  // 渲染子用例行（支持拖拽）
  const renderSubCaseRow = (subCase: TestCase, parentCaseId: string, level: number) => {
    const parentCase = testCases.find(tc => tc.id === parentCaseId);
    if (!parentCase) return null;
    
    const sortedChildren = getSortedChildren(parentCase);
    const childItem = sortedChildren.find(child => child.type === 'subcase' && (child.item as TestCase).id === subCase.id);
    if (!childItem) return null;
    
    const childIndex = sortedChildren.indexOf(childItem);
    const isDraggingItem = isDragging(dragInfo, parentCaseId, subCase.id);
    const isDropTargetItem = isDropTarget(dragInfo, parentCaseId, childIndex);
    
    return (
      <div 
        key={subCase.id}
        className={`border rounded-lg p-3 mb-2 transition-colors ${isDraggingItem ? 'opacity-50' : ''} ${
          isDropTargetItem ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
        }`}
        draggable
        onDragStart={(e) => handleDragStart(e, parentCaseId, 'subcase', subCase.id, childIndex, dragDropContext)}
        onDragOver={(e) => handleDragOver(e, parentCaseId, childIndex, 'below', dragDropContext)}
        onDragLeave={(e) => handleDragLeave(e, dragDropContext)}
        onDrop={(e) => handleDrop(e, dragDropContext)}
      >
        <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 16}px` }}>
          {/* 展开/折叠按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={() => {
              const updatedTestCases = toggleExpandById(testCases, subCase.id);
              setTestCases(updatedTestCases);
            }}
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
            onCheckedChange={(checked) => {
              const updatedTestCases = updateCaseById(testCases, subCase.id, (tc) => ({
                ...tc,
                selected: checked as boolean
              }));
              setTestCases(updatedTestCases);
            }}
            className="flex-shrink-0"
          />
          
          {/* 子用例内容 */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setSelectedTestCaseId(subCase.id)}
          >
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm truncate ${
                selectedTestCaseId === subCase.id ? 'text-primary' : ''
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
          </div>
        </div>
      </div>
    );
  };

  // 渲染测试用例节点
  const renderCaseNode = (testCase: TestCase, level: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    // 渲染用例行
    elements.push(
      <div key={testCase.id} className="p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 16}px` }}>
          {/* 展开/折叠按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={() => {
              const updatedTestCases = toggleExpandById(testCases, testCase.id);
              setTestCases(updatedTestCases);
            }}
          >
            {testCase.subCases.length > 0 || testCase.commands.length > 0 ? (
              testCase.isExpanded ? (
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
            checked={testCase.selected}
            onCheckedChange={(checked) => {
              const updatedTestCases = updateCaseById(testCases, testCase.id, (tc) => ({
                ...tc,
                selected: checked as boolean
              }));
              setTestCases(updatedTestCases);
            }}
            className="flex-shrink-0"
          />
          
          {/* 用例内容 */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setSelectedTestCaseId(testCase.id)}
          >
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm truncate ${
                selectedTestCaseId === testCase.id ? 'text-primary' : ''
              }`}>
                {testCase.name}
              </span>
            </div>
          </div>
          
          {/* 状态指示器 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusIcon(testCase.status)}
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
                    onClick={() => onRunTestCase(testCase.id)}
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
                    onClick={() => onEditCase(testCase)}
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

    // 渲染展开的内容（统一排序的命令和子用例）
    if (testCase.isExpanded) {
      const sortedChildren = getSortedChildren(testCase);
      
      sortedChildren.forEach((child, sortedIndex) => {
        if (child.type === 'command') {
          const command = child.item as TestCommand;
          const originalIndex = testCase.commands.findIndex(c => c.id === command.id);
          
          elements.push(
            <CommandRow
              key={command.id}
              command={command}
              caseId={testCase.id}
              commandIndex={originalIndex}
              level={level + 1}
              isDragging={isDragging(dragInfo, testCase.id, command.id)}
              isDropTarget={isDropTarget(dragInfo, testCase.id, sortedIndex)}
              dropPosition={getDropPosition(dragInfo)}
              isExecuting={executingCommand === `${testCase.id}-${originalIndex}`}
              onDragStart={(e, caseId, type, itemId, index) => 
                handleDragStart(e, caseId, type, itemId, index, dragDropContext)
              }
              onDragOver={(e, caseId, index, position) => 
                handleDragOver(e, caseId, index, position, dragDropContext)
              }
              onDragLeave={(e) => handleDragLeave(e, dragDropContext)}
              onDrop={(e) => handleDrop(e, dragDropContext)}
              onSelectCase={setSelectedTestCaseId}
              onUpdateCommandSelection={onUpdateCommandSelection}
              onRunCommand={onRunCommand}
              onEditCommand={onEditCommand}
              onSaveInlineEdit={onSaveInlineEdit}
              onSetLastFocusedChild={(caseId, type, itemId, index) =>
                setLastFocusedChild({ caseId, type, itemId, index })
              }
              inlineEdit={inlineEdit}
              setInlineEdit={setInlineEdit}
            />
          );
        } else if (child.type === 'subcase') {
          const subCase = child.item as TestCase;
          elements.push(renderSubCaseRow(subCase, testCase.id, level + 1));
          
          // 如果子用例展开，递归渲染其内容
          if (subCase.isExpanded) {
            elements.push(...renderCaseNode(subCase, level + 2));
          }
        }
      });
    }
    
    return elements;
  };

  // 渲染统一树结构（顶级用例不显示，直接显示内容）
  const renderUnifiedTree = (cases: TestCase[], level: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    cases.forEach((testCase) => {
      // 对于顶级用例（level === 0），不渲染用例行本身，直接渲染其内容
      if (level === 0) {
        const sortedChildren = getSortedChildren(testCase);
        
        sortedChildren.forEach((child) => {
          if (child.type === 'command') {
            const command = child.item as TestCommand;
            const originalIndex = testCase.commands.findIndex(c => c.id === command.id);
            
            elements.push(
              <CommandRow
                key={command.id}
                command={command}
                caseId={testCase.id}
                commandIndex={originalIndex}
                level={0}
                isDragging={isDragging(dragInfo, testCase.id, command.id)}
                isDropTarget={isDropTarget(dragInfo, testCase.id, child.index)}
                dropPosition={getDropPosition(dragInfo)}
                isExecuting={executingCommand === `${testCase.id}-${originalIndex}`}
                onDragStart={(e, caseId, type, itemId, index) => 
                  handleDragStart(e, caseId, type, itemId, index, dragDropContext)
                }
                onDragOver={(e, caseId, index, position) => 
                  handleDragOver(e, caseId, index, position, dragDropContext)
                }
                onDragLeave={(e) => handleDragLeave(e, dragDropContext)}
                onDrop={(e) => handleDrop(e, dragDropContext)}
                onSelectCase={setSelectedTestCaseId}
                onUpdateCommandSelection={onUpdateCommandSelection}
                onRunCommand={onRunCommand}
                onEditCommand={onEditCommand}
                onSaveInlineEdit={onSaveInlineEdit}
                onSetLastFocusedChild={(caseId, type, itemId, index) =>
                  setLastFocusedChild({ caseId, type, itemId, index })
                }
                inlineEdit={inlineEdit}
                setInlineEdit={setInlineEdit}
              />
            );
          } else if (child.type === 'subcase') {
            const subCase = child.item as TestCase;
            elements.push(...renderCaseNode(subCase, level + 1));
          }
        });
      } else {
        // 对于非顶级用例，正常渲染
        elements.push(...renderCaseNode(testCase, level));
      }
    });
    
    return elements;
  };

  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="divide-y divide-border">
        {renderUnifiedTree(testCases, 0)}
      </div>
    </div>
  );
};