/**
 * 测试用例脚本状态管理Hook
 * 管理脚本相关状态
 */

import { useState, useCallback } from 'react';
import { Script } from '../types/ScriptTypes';

export interface TestCaseScriptState {
  // 脚本状态
  scripts: Script[];
  currentScript: Script | null;
  
  // 运行结果状态
  runResult: any | null;
  showRunResult: boolean;
}

export interface TestCaseScriptActions {
  // 设置函数
  setScripts: (scripts: Script[]) => void;
  setCurrentScript: (script: Script | null) => void;
  setRunResult: (result: any) => void;
  setShowRunResult: (show: boolean) => void;
  // 工具函数
  clearRunResult: () => void;
}

export const useTestCaseScripts = (): TestCaseScriptState & TestCaseScriptActions => {
  // 脚本状态
  const [scripts, setScripts] = useState<Script[]>([]);
  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  
  // 运行结果状态
  const [runResult, setRunResult] = useState<any>(null);
  const [showRunResult, setShowRunResult] = useState<boolean>(false);

  // 工具函数
  const clearRunResult = useCallback(() => {
    setRunResult(null);
    setShowRunResult(false);
  }, []);

  return {
    // 状态
    scripts,
    currentScript,
    runResult,
    showRunResult,
    
    // 设置函数
    setScripts,
    setCurrentScript,
    setRunResult,
    setShowRunResult,
    
    // 工具函数
    clearRunResult
  };
};