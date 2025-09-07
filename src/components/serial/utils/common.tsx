import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

/**
 * 状态图标映射
 */
export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
    case 'failed':
      return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case 'running':
      return <AlertCircle className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />;
    case 'partial':
      return <AlertCircle className="w-3.5 h-3.5 text-blue-500" />;
    case 'pending':
      return <Clock className="w-3.5 h-3.5 text-gray-400" />;
    default:
      return null;
  }
};

/**
 * 拖拽相关样式
 */
export const getDragDropStyles = ({
  isDragging,
  isDropTarget,
  dropPosition,
  isExecuting,
  baseStyles = ''
}: {
  isDragging?: boolean;
  isDropTarget?: boolean;
  dropPosition?: 'above' | 'below' | null;
  isExecuting?: boolean;
  baseStyles?: string;
}) => {
  const styles = [baseStyles || 'p-2 hover:bg-muted/50 transition-colors cursor-move select-none'];
  
  if (isDragging) styles.push('opacity-50');
  if (isDropTarget && dropPosition === 'above') styles.push('border-t-2 border-primary');
  if (isDropTarget && dropPosition === 'below') styles.push('border-b-2 border-primary');
  if (isExecuting) styles.push('bg-primary/10 border border-primary/30 shadow-sm');
  
  return styles.join(' ');
};

/**
 * 层级缩进样式
 */
export const getLevelIndent = (level: number, unit: number = 12) => ({
  paddingLeft: `${level * unit}px`
});

/**
 * 拖拽位置计算
 */
export const calculateDropPosition = (e: React.DragEvent<HTMLDivElement>): 'above' | 'below' => {
  const rect = e.currentTarget.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  return e.clientY < midpoint ? 'above' : 'below';
};

/**
 * 文件处理工具函数
 */
export const fileUtils = {
  /**
   * 读取JSON文件
   */
  readJsonFile: (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },

  /**
   * 下载JSON文件
   */
  downloadJsonFile: (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * 创建文件输入元素
   */
  createFileInput: (accept: string, onChange: (file: File) => void): HTMLInputElement => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onChange(file);
    };
    return input;
  }
};

/**
 * 测试用例工具函数
 */
export const testCaseUtils = {
  /**
   * 检查测试用例是否有执行历史
   */
  hasExecutionHistory: (testCase: any): boolean => {
    // 检查用例本身的状态
    if (testCase.status !== 'pending' || testCase.currentCommand !== -1 || testCase.isRunning) {
      return true;
    }
    
    // 检查命令是否有执行记录
    if (testCase.commands?.some((cmd: any) => cmd.status !== 'pending')) {
      return true;
    }
    
    // 递归检查子用例
    if (testCase.subCases?.some((subcase: any) => testCaseUtils.hasExecutionHistory(subcase))) {
      return true;
    }
    
    return false;
  },

  /**
   * 重置用例执行状态
   */
  resetExecutionStatus: (testCase: any): any => {
    return {
      ...testCase,
      status: 'pending',
      currentCommand: -1,
      isRunning: false,
      commands: testCase.commands?.map((cmd: any) => ({
        ...cmd,
        status: 'pending'
      })) || [],
      subCases: testCase.subCases?.map((subcase: any) => testCaseUtils.resetExecutionStatus(subcase)) || []
    };
  },

  /**
   * 获取用例统计信息
   */
  getCaseStatistics: (testCase: any) => {
    const stats = {
      total: 0,
      success: 0,
      failed: 0,
      pending: 0
    };

    const countCommands = (tc: any) => {
      tc.commands?.forEach((cmd: any) => {
        stats.total++;
        if (cmd.status === 'success') stats.success++;
        else if (cmd.status === 'failed') stats.failed++;
        else stats.pending++;
      });
      
      tc.subCases?.forEach(countCommands);
    };

    countCommands(testCase);
    return stats;
  }
};

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * 节流函数
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};