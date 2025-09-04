import { useCallback } from 'react';
import { TestCase } from '../types';
import { findTestCaseById, findCasePath } from '../testCaseRecursiveUtils';

export interface TestCaseActionsProps {
  testCases: TestCase[];
  setTestCases: (cases: TestCase[]) => void;
  generateUniqueId: () => string;
  setInlineEdit: (edit: { commandId: string | null; value: string }) => void;
  inlineEdit: { commandId: string | null; value: string };
}

export const useTestCaseActions = ({
  testCases,
  setTestCases,
  generateUniqueId,
  setInlineEdit,
  inlineEdit
}: TestCaseActionsProps) => {
  
  // 获取当前选中的测试用例（支持嵌套查找）
  const getCurrentTestCase = useCallback((selectedTestCaseId: string) => {
    if (!Array.isArray(testCases)) {
      return null;
    }
    
    if (selectedTestCaseId) {
      return findTestCaseById(selectedTestCaseId, testCases);
    }
    return testCases[0] || null;
  }, [testCases]);

  // 获取可见的根用例（当前选中用例的顶层祖先）
  const getVisibleRootCase = useCallback((selectedTestCaseId: string): TestCase | null => {
    if (!Array.isArray(testCases)) {
      return null;
    }
    
    if (selectedTestCaseId) {
      const casePath = findCasePath(selectedTestCaseId, testCases);
      if (casePath && casePath.length > 0) {
        return casePath[0]; // 返回路径的第一个元素（顶层祖先）
      }
    }
    return testCases[0] || null;
  }, [testCases]);

  return {
    getCurrentTestCase,
    getVisibleRootCase
  };
};