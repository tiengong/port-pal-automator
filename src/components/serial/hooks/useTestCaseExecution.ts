/**
 * 测试用例执行状态管理Hook
 * 管理测试执行、结果、状态等执行相关状态
 */

import { useState, useCallback } from 'react';
import { ExecutionResult } from '../types';

export interface TestCaseExecutionState {
  // 执行状态
  executionResults: ExecutionResult[];
  executingCommand: {
    caseId: string;
    commandIndex: number;
  } | null;
  isExecuting: boolean;
}

export interface TestCaseExecutionActions {
  // 设置函数
  setExecutionResults: (results: ExecutionResult[]) => void;
  setExecutingCommand: (command: { caseId: string; commandIndex: number } | null) => void;
  setIsExecuting: (executing: boolean) => void;
  // 工具函数
  startExecution: () => void;
  stopExecution: () => void;
  addExecutionResult: (result: ExecutionResult) => void;
  clearExecutionResults: () => void;
}

export const useTestCaseExecution = (): TestCaseExecutionState & TestCaseExecutionActions => {
  // 执行状态
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [executingCommand, setExecutingCommand] = useState<{ caseId: string; commandIndex: number } | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // 工具函数
  const startExecution = useCallback(() => {
    setIsExecuting(true);
    setExecutionResults([]);
  }, []);

  const stopExecution = useCallback(() => {
    setIsExecuting(false);
    setExecutingCommand(null);
  }, []);

  const addExecutionResult = useCallback((result: ExecutionResult) => {
    setExecutionResults(prev => [...prev, result]);
  }, []);

  const clearExecutionResults = useCallback(() => {
    setExecutionResults([]);
  }, []);

  return {
    // 状态
    executionResults,
    executingCommand,
    isExecuting,
    
    // 设置函数
    setExecutionResults,
    setExecutingCommand,
    setIsExecuting,
    
    // 工具函数
    startExecution,
    stopExecution,
    addExecutionResult,
    clearExecutionResults
  };
};