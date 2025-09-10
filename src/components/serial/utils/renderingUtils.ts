import React from 'react';
import { TestCase, TestCommand } from '../types';
import { getSortedChildren } from './testCaseUtils';
import { findTestCaseById } from './testCaseRecursiveUtils';
import { CheckCircle, XCircle, AlertCircle, PlayCircle, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Get status icon component based on status
 */
export const getStatusIcon = (status: string): React.ReactNode => {
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

/**
 * Get status badge class based on status
 */
export const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'running':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'partial':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Get status text for display
 */
export const getStatusText = (status: string): string => {
  switch (status) {
    case 'success':
      return '成功';
    case 'failed':
      return '失败';
    case 'running':
      return '运行中';
    case 'partial':
      return '部分成功';
    default:
      return '待执行';
  }
};

/**
 * Render test case row with consistent styling
 */
export interface TestCaseRowProps {
  testCase: TestCase;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onRun?: () => void;
  onCheckboxChange?: (checked: boolean) => void;
  showCheckbox?: boolean;
  disabled?: boolean;
  className?: string;
}

export const renderTestCaseRow = (props: TestCaseRowProps): React.ReactNode => {
  const {
    testCase,
    level,
    isSelected,
    isExpanded,
    onSelect,
    onToggleExpand,
    onRun,
    onCheckboxChange,
    showCheckbox = true,
    disabled = false,
    className = ''
  } = props;
  
  const baseClasses = `p-2 hover:bg-muted/50 transition-colors cursor-pointer select-none ${className}`;
  const selectedClasses = isSelected ? 'bg-primary/10 border-l-2 border-primary' : '';
  const disabledClasses = disabled ? 'opacity-50 pointer-events-none' : '';
  
  return (
    <div 
      className={`${baseClasses} ${selectedClasses} ${disabledClasses}`}
      style={{ paddingLeft: `${level * 12}px` }}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        {showCheckbox && onCheckboxChange && (
          <input
            type="checkbox"
            checked={testCase.selected}
            onChange={(e) => onCheckboxChange(e.target.checked)}
            className="flex-shrink-0 w-3.5 h-3.5"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-medium text-xs truncate ${
              isSelected ? 'text-primary' : ''
            }`}>
              {testCase.name}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {getStatusIcon(testCase.status)}
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {onRun && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRun();
              }}
              disabled={disabled}
              className="h-7 w-7 p-0 flex items-center justify-center bg-transparent hover:bg-muted rounded"
              title="运行"
            >
              <PlayCircle className="w-3.5 h-3.5" />
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="h-7 w-7 p-0 flex items-center justify-center bg-transparent hover:bg-muted rounded"
            title={isExpanded ? '折叠' : '展开'}
          >
            {testCase.subCases.length > 0 || testCase.commands.length > 0 ? (
              isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )
            ) : (
              <div className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Render sub-case row with drag and drop support
 */
export interface SubCaseRowProps {
  subCase: TestCase;
  parentCaseId: string;
  level: number;
  isSelected: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPosition: 'above' | 'below' | null;
  onSelect: () => void;
  onRun?: () => void;
  onCheckboxChange?: (checked: boolean) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export const renderSubCaseRow = (props: SubCaseRowProps): React.ReactNode => {
  const {
    subCase,
    level,
    isSelected,
    isDragging,
    isDropTarget,
    dropPosition,
    onSelect,
    onRun,
    onCheckboxChange,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop
  } = props;
  
  const baseClasses = `p-3 hover:bg-muted/50 transition-colors cursor-move select-none`;
  const draggingClasses = isDragging ? 'opacity-50' : '';
  const dropTargetClasses = [
    isDropTarget && dropPosition === 'above' ? 'border-t-2 border-primary' : '',
    isDropTarget && dropPosition === 'below' ? 'border-b-2 border-primary' : ''
  ].filter(Boolean).join(' ');
  
  return (
    <div 
      key={subCase.id}
      className={`${baseClasses} ${draggingClasses} ${dropTargetClasses}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 16}px` }}>
        {onCheckboxChange && (
          <input
            type="checkbox"
            checked={subCase.selected}
            onChange={(e) => onCheckboxChange(e.target.checked)}
            className="flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm truncate ${
              isSelected ? 'text-primary' : ''
            }`}>
              {subCase.name}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {getStatusIcon(subCase.status)}
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {onRun && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRun();
              }}
              className="h-8 w-8 p-0 flex items-center justify-center bg-transparent hover:bg-muted rounded"
              title="运行"
            >
              <PlayCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Render unified tree structure
 */
export interface UnifiedTreeProps {
  testCases: TestCase[];
  level: number;
  selectedTestCaseId: string;
  executingCommand: { caseId: string | null; commandIndex: number | null };
  dragInfo: any;
  onSelectCase: (caseId: string) => void;
  onRunCommand: (caseId: string, commandIndex: number) => void;
  onEditCommand: (caseId: string, commandIndex: number) => void;
  onUpdateCommandSelection: (caseId: string, commandId: string, selected: boolean) => void;
  onSetLastFocusedChild: (caseId: string, type: 'command' | 'subcase', itemId: string, index: number) => void;
  onContextMenu: (e: React.MouseEvent, targetId: string, targetType: 'case' | 'command') => void;
  onDragStart: (e: React.DragEvent, caseId: string, type: 'command' | 'subcase', itemId: string, index: number) => void;
  onDragOver: (e: React.DragEvent, caseId: string, index: number, position: 'above' | 'below') => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  inlineEdit: { commandId: string | null; value: string };
  setInlineEdit: (edit: { commandId: string | null; value: string }) => void;
  onSaveInlineEdit: (caseId: string, commandId: string) => void;
}

export const renderUnifiedTree = (props: UnifiedTreeProps): React.ReactNode[] => {
  const {
    testCases,
    level,
    selectedTestCaseId,
    executingCommand,
    dragInfo,
    onSelectCase,
    onRunCommand,
    onEditCommand,
    onUpdateCommandSelection,
    onSetLastFocusedChild,
    onContextMenu,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    inlineEdit,
    setInlineEdit,
    onSaveInlineEdit
  } = props;
  
  const elements: React.ReactNode[] = [];
  
  testCases.forEach((testCase) => {
    // For top-level cases (level === 0), don't render the case row itself, just its contents
    if (level === 0) {
      const sortedChildren = getSortedChildren(testCase);
      
      sortedChildren.forEach((child, sortedIndex) => {
        if (child.type === 'command') {
          const command = child.item as TestCommand;
          const originalIndex = testCase.commands.findIndex(cmd => cmd.id === command.id);
          
          // CommandRow component would be rendered here
          // This is a placeholder for the actual CommandRow rendering
          elements.push(
            <div key={command.id} className="command-row-placeholder">
              {/* CommandRow component would go here */}
              Command: {command.command} (Index: {originalIndex})
            </div>
          );
        } else if (child.type === 'subcase') {
          const subCase = child.item as TestCase;
          elements.push(...renderUnifiedTree({
            ...props,
            testCases: [subCase],
            level: level + 1
          }));
        }
      });
    } else {
      // For non-top-level cases, render the case normally
      elements.push(...renderCaseNode(testCase, level, props));
    }
  });
  
  return elements;
};

/**
 * Render case node with all its children
 */
const renderCaseNode = (testCase: TestCase, level: number, props: UnifiedTreeProps): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  
  // Render case row
  elements.push(
    renderTestCaseRow({
      testCase,
      level,
      isSelected: props.selectedTestCaseId === testCase.id,
      isExpanded: testCase.isExpanded,
      onSelect: () => props.onSelectCase(testCase.id),
      onToggleExpand: () => {
        // Toggle expand logic would go here
        console.log('Toggle expand for case:', testCase.id);
      },
      onRun: props.onRunCommand ? () => {
        // Run test case logic would go here
        console.log('Run test case:', testCase.id);
      } : undefined,
      showCheckbox: false
    })
  );
  
  // Render expanded contents
  if (testCase.isExpanded) {
    const sortedChildren = getSortedChildren(testCase);
    
    sortedChildren.forEach((child, sortedIndex) => {
      if (child.type === 'command') {
        const command = child.item as TestCommand;
        const originalIndex = testCase.commands.findIndex(cmd => cmd.id === command.id);
        
        // CommandRow component would be rendered here
        elements.push(
          <div key={command.id} className="command-row-placeholder">
            Command: {command.command} (Index: {originalIndex})
          </div>
        );
      } else if (child.type === 'subcase') {
        const subCase = child.item as TestCase;
        elements.push(...renderCaseNode(subCase, level + 1, props));
      }
    });
  }
  
  return elements;
};

/**
 * Format command index for display
 */
export const formatCommandIndex = (index: number, total: number): string => {
  const digits = total.toString().length;
  return (index + 1).toString().padStart(digits, '0');
};

/**
 * Get command type display name
 */
export const getCommandTypeDisplay = (type: string): string => {
  switch (type) {
    case 'execution':
      return '执行命令';
    case 'urc':
      return 'URC监听';
    default:
      return '未知类型';
  }
};

/**
 * Get validation method display name
 */
export const getValidationMethodDisplay = (method: string): string => {
  switch (method) {
    case 'none':
      return '无验证';
    case 'contains':
      return '包含';
    case 'equals':
      return '完全匹配';
    case 'regex':
      return '正则表达式';
    default:
      return method;
  }
};

/**
 * Get line ending display name
 */
export const getLineEndingDisplay = (lineEnding: string): string => {
  switch (lineEnding) {
    case 'crlf':
      return 'CRLF (\\r\\n)';
    case 'lf':
      return 'LF (\\n)';
    case 'cr':
      return 'CR (\\r)';
    case 'none':
      return '无';
    default:
      return lineEnding;
  }
};

/**
 * Truncate text for display
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (date: Date): string => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Get duration display
 */
export const getDurationDisplay = (duration: number): string => {
  if (duration < 1000) {
    return `${duration}ms`;
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
};