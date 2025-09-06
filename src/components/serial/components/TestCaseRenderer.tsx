import React from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, PlayCircle, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { TestCase, TestCommand } from '../types';
import { CommandRow } from '../CommandRow';
import { getSortedChildren } from '../testCaseUtils';
import { updateCaseById, toggleExpandById } from '../testCaseRecursiveUtils';

interface TestCaseRendererProps {
  testCase: TestCase;
  level: number;
  selectedTestCaseId: string | null;
  connectedPorts: Array<any>;
  testCases: TestCase[];
  setTestCases: (cases: TestCase[]) => void;
  setSelectedTestCaseId: (id: string) => void;
  onRunTestCase: (id: string) => void;
  onEditCase: (testCase: TestCase) => void;
  onEditCommand: (caseId: string, commandIndex: number) => void;
  onDeleteCommand: (caseId: string, commandIndex: number) => void;
  onDuplicateCommand: (caseId: string, commandIndex: number) => void;
  contextMenu: any;
  setContextMenu: (menu: any) => void;
  dragInfo: any;
  setDragInfo: (info: any) => void;
  inlineEdit: any;
  setInlineEdit: (edit: any) => void;
  executingCommand: string | null;
}

export const TestCaseRenderer: React.FC<TestCaseRendererProps> = ({
  testCase,
  level,
  selectedTestCaseId,
  connectedPorts,
  testCases,
  setTestCases,
  setSelectedTestCaseId,
  onRunTestCase,
  onEditCase,
  onEditCommand,
  onDeleteCommand,
  onDuplicateCommand,
  contextMenu,
  setContextMenu,
  dragInfo,
  setDragInfo,
  inlineEdit,
  setInlineEdit,
  executingCommand
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const renderTestCaseItem = () => (
    <div 
      key={testCase.id}
      className={`border rounded-lg p-3 mb-2 transition-colors ${
        selectedTestCaseId === testCase.id 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:border-primary/50'
      }`}
    >
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

  const renderExpandedContent = () => {
    if (!testCase.isExpanded) return null;

    const sortedChildren = getSortedChildren(testCase);
    
    return (
      <div className="ml-4 space-y-2 mt-2">
        {sortedChildren.map((child, index) => {
          if (child.type === 'command') {
            const command = child.item as TestCommand;
            return (
              <CommandRow
                key={command.id}
                command={command}
                caseId={testCase.id}
                commandIndex={testCase.commands.findIndex(c => c.id === command.id)}
                level={level + 1}
                isDragging={dragInfo?.type === 'command' && dragInfo?.itemId === command.id}
                isDropTarget={false}
                dropPosition={null}
                isExecuting={executingCommand === command.id}
                onDragStart={() => {}}
                onDragOver={() => {}}
                onDragLeave={() => {}}
                onDrop={() => {}}
                onSelectCase={() => setSelectedTestCaseId(testCase.id)}
                onUpdateCommandSelection={() => {}}
                onRunCommand={() => {}}
                onEditCommand={onEditCommand}
                onSaveInlineEdit={() => {}}
                onSetLastFocusedChild={() => {}}
                inlineEdit={inlineEdit}
                setInlineEdit={setInlineEdit}
              />
            );
          } else {
            // Render sub-case
            const subCase = child.item as TestCase;
            return (
              <TestCaseRenderer
                key={subCase.id}
                testCase={subCase}
                level={level + 1}
                selectedTestCaseId={selectedTestCaseId}
                connectedPorts={connectedPorts}
                testCases={testCases}
                setTestCases={setTestCases}
                setSelectedTestCaseId={setSelectedTestCaseId}
                onRunTestCase={onRunTestCase}
                onEditCase={onEditCase}
                onEditCommand={onEditCommand}
                onDeleteCommand={onDeleteCommand}
                onDuplicateCommand={onDuplicateCommand}
                contextMenu={contextMenu}
                setContextMenu={setContextMenu}
                dragInfo={dragInfo}
                setDragInfo={setDragInfo}
                inlineEdit={inlineEdit}
                setInlineEdit={setInlineEdit}
                executingCommand={executingCommand}
              />
            );
          }
        })}
      </div>
    );
  };

  return (
    <div>
      {renderTestCaseItem()}
      {renderExpandedContent()}
    </div>
  );
};