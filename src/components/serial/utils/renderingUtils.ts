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
      return React.createElement(CheckCircle, { className: "w-3.5 h-3.5 text-green-500" });
    case 'failed':
      return React.createElement(XCircle, { className: "w-3.5 h-3.5 text-red-500" });
    case 'running':
      return React.createElement(AlertCircle, { className: "w-3.5 h-3.5 text-yellow-500 animate-pulse" });
    case 'partial':
      return React.createElement(AlertCircle, { className: "w-3.5 h-3.5 text-blue-500" });
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
  
  return React.createElement('div', {
    className: `${baseClasses} ${selectedClasses} ${disabledClasses}`,
    style: { paddingLeft: `${level * 12}px` },
    onClick: onSelect
  }, 
    React.createElement('div', { className: 'flex items-center gap-2' }, [
      showCheckbox && onCheckboxChange && React.createElement('input', {
        key: 'checkbox',
        type: 'checkbox',
        checked: testCase.selected,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onCheckboxChange(e.target.checked),
        className: 'flex-shrink-0 w-3.5 h-3.5',
        onClick: (e: React.MouseEvent) => e.stopPropagation()
      }),
      
      React.createElement('div', { key: 'content', className: 'flex-1 min-w-0' },
        React.createElement('div', { className: 'flex items-center gap-1.5' },
          React.createElement('span', {
            className: `font-medium text-xs truncate ${isSelected ? 'text-primary' : ''}`
          }, testCase.name)
        )
      ),
      
      React.createElement('div', { key: 'status', className: 'flex items-center gap-1 flex-shrink-0' }, 
        getStatusIcon(testCase.status)
      ),
      
      React.createElement('div', { key: 'actions', className: 'flex items-center gap-1 flex-shrink-0' }, [
        onRun && React.createElement('button', {
          key: 'run',
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onRun();
          },
          disabled,
          className: 'h-7 w-7 p-0 flex items-center justify-center bg-transparent hover:bg-muted rounded',
          title: '运行'
        }, React.createElement(PlayCircle, { className: 'w-3.5 h-3.5' })),
        
        React.createElement('button', {
          key: 'expand',
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleExpand();
          },
          className: 'h-7 w-7 p-0 flex items-center justify-center bg-transparent hover:bg-muted rounded',
          title: isExpanded ? '折叠' : '展开'
        }, testCase.subCases.length > 0 || testCase.commands.length > 0 ? (
          isExpanded ? 
            React.createElement(ChevronDown, { className: 'w-3.5 h-3.5' }) :
            React.createElement(ChevronRight, { className: 'w-3.5 h-3.5' })
        ) : React.createElement('div', { className: 'w-3.5 h-3.5' }))
      ].filter(Boolean))
    ].filter(Boolean))
  );
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