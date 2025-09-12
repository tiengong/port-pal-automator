/**
 * 测试用例基础状态管理Hook
 * 管理测试用例的基础数据和选择状态
 */

import { useState, useCallback, useMemo } from 'react';
import { TestCase } from '../types';

export interface TestCaseBaseState {
  // 基础状态
  testCases: TestCase[];
  selectedCase: TestCase | null;
  selectedTestCaseId: string;
  currentWorkspace: any;
}

export interface TestCaseBaseActions {
  // 设置函数
  setTestCases: (cases: TestCase[]) => void;
  setSelectedCase: (case: TestCase | null) => void;
  setSelectedTestCaseId: (id: string) => void;
  setCurrentWorkspace: (workspace: any) => void;
  // 工具函数
  updateTestCases: (updater: (cases: TestCase[]) => TestCase[]) => void;
  selectTestCase: (caseId: string) => void;
  getCurrentTestCase: () => TestCase | null;
}

export const useTestCaseBase = (): TestCaseBaseState & TestCaseBaseActions => {
  // 基础状态
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('');
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);

  // 计算属性
  const currentTestCase = useMemo(() => {
    return testCases.find(tc => tc.id === selectedTestCaseId) || null;
  }, [testCases, selectedTestCaseId]);

  // 工具函数
  const updateTestCases = useCallback((updater: (cases: TestCase[]) => TestCase[]) => {
    setTestCases(prev => updater([...prev]));
  }, []);

  const selectTestCase = useCallback((caseId: string) => {
    setSelectedTestCaseId(caseId);
    const foundCase = testCases.find(tc => tc.id === caseId) || null;
    setSelectedCase(foundCase);
  }, [testCases]);

  const getCurrentTestCase = useCallback(() => {
    return currentTestCase;
  }, [currentTestCase]);

  return {
    // 状态
    testCases,
    selectedCase,
    selectedTestCaseId,
    currentWorkspace,
    
    // 计算属性
    currentTestCase,
    
    // 设置函数
    setTestCases,
    setSelectedCase,
    setSelectedTestCaseId,
    setCurrentWorkspace,
    
    // 工具函数
    updateTestCases,
    selectTestCase,
    getCurrentTestCase
  };
};