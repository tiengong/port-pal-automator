import { TestCase } from '../types';

export interface StepLocation {
  caseId: string;
  commandIndex: number;
}

/**
 * 获取当前选中的测试用例
 */
export const getCurrentTestCase = (testCases: TestCase[], selectedTestCaseId: string): TestCase | null => {
  return testCases.find(tc => tc.id === selectedTestCaseId) || null;
};

/**
 * 获取操作目标测试用例
 */
export const getTargetCaseForActions = (selectedCase: TestCase | null, testCases: TestCase[]): TestCase | null => {
  if (selectedCase) {
    return selectedCase;
  }
  
  // 如果没有选中的用例，返回第一个根用例
  return testCases.length > 0 ? testCases[0] : null;
};

/**
 * 获取顶级父用例
 */
export const getTopLevelParent = (caseId: string, testCases: TestCase[]): TestCase | null => {
  for (const testCase of testCases) {
    if (testCase.id === caseId) {
      return testCase;
    }
    
    const foundInSubCases = findInSubCases(caseId, testCase.subCases);
    if (foundInSubCases) {
      return testCase; // 返回顶级父用例，而不是找到的子用例
    }
  }
  return null;
};

/**
 * 获取可见的根用例
 */
export const getVisibleRootCase = (testCases: TestCase[], selectedTestCaseId: string): TestCase | null => {
  if (selectedTestCaseId && testCases.length > 0) {
    // 查找选中的用例是否在子用例中
    const findInAnySubCase = (cases: TestCase[]): TestCase | null => {
      for (const testCase of cases) {
        if (testCase.id === selectedTestCaseId) {
          return testCase;
        }
        const found = findInAnySubCase(testCase.subCases);
        if (found) return found;
      }
      return null;
    };
    
    const found = findInAnySubCase(testCases);
    if (found) {
      return found;
    }
  }
  
  return testCases.length > 0 ? testCases[0] : null;
};

/**
 * 查找测试用例路径
 */
export const findCasePath = (targetCaseId: string, testCases: TestCase[]): TestCase[] => {
  const path: TestCase[] = [];
  
  const findPath = (cases: TestCase[], currentPath: TestCase[]): boolean => {
    for (const testCase of cases) {
      const newPath = [...currentPath, testCase];
      
      if (testCase.id === targetCaseId) {
        path.push(...newPath);
        return true;
      }
      
      if (findPath(testCase.subCases, newPath)) {
        return true;
      }
    }
    return false;
  };
  
  findPath(testCases, []);
  return path;
};

/**
 * 获取测试用例深度
 */
export const getCaseDepth = (caseId: string, testCases: TestCase[]): number => {
  const findDepth = (cases: TestCase[], currentDepth: number): number => {
    for (const testCase of cases) {
      if (testCase.id === caseId) {
        return currentDepth;
      }
      
      const subDepth = findDepth(testCase.subCases, currentDepth + 1);
      if (subDepth !== -1) {
        return subDepth;
      }
    }
    return -1;
  };
  
  return findDepth(testCases, 0);
};

/**
 * 获取同级测试用例
 */
export const getSiblingCases = (caseId: string, testCases: TestCase[]): TestCase[] => {
  const findSiblings = (cases: TestCase[]): TestCase[] => {
    for (let i = 0; i < cases.length; i++) {
      if (cases[i].id === caseId) {
        return cases.filter((_, index) => index !== i);
      }
      
      const siblings = findSiblings(cases[i].subCases);
      if (siblings.length > 0) {
        return siblings;
      }
    }
    return [];
  };
  
  return findSiblings(testCases);
};

/**
 * 检查测试用例是否存在
 */
export const caseExists = (caseId: string, testCases: TestCase[]): boolean => {
  const search = (cases: TestCase[]): boolean => {
    return cases.some(testCase => 
      testCase.id === caseId || search(testCase.subCases)
    );
  };
  
  return search(testCases);
};

/**
 * 获取测试用例的父用例
 */
export const getParentCase = (caseId: string, testCases: TestCase[]): TestCase | null => {
  const findParent = (cases: TestCase[], parent: TestCase | null): TestCase | null => {
    for (const testCase of cases) {
      if (testCase.id === caseId) {
        return parent;
      }
      
      const found = findParent(testCase.subCases, testCase);
      if (found) return found;
    }
    return null;
  };
  
  return findParent(testCases, null);
};

// 辅助函数
const findInSubCases = (caseId: string, subCases: TestCase[]): TestCase | null => {
  for (const subCase of subCases) {
    if (subCase.id === caseId) {
      return subCase;
    }
    const found = findInSubCases(caseId, subCase.subCases);
    if (found) return found;
  }
  return null;
};

/**
 * 从给定位置获取下一步
 */
export const getNextStepFrom = (
  currentCaseId: string, 
  currentCommandIndex: number, 
  testCases: TestCase[]
): StepLocation | null => {
  const currentCase = testCases.find(tc => tc.id === currentCaseId);
  if (!currentCase) return null;

  // Check if there are more commands in the current case
  if (currentCommandIndex < currentCase.commands.length - 1) {
    return {
      caseId: currentCaseId,
      commandIndex: currentCommandIndex + 1
    };
  }

  // Check if there are sub-cases in the current case
  if (currentCase.subCases.length > 0) {
    // Return first command of first sub-case
    const firstSubCase = currentCase.subCases[0];
    if (firstSubCase.commands.length > 0) {
      return {
        caseId: firstSubCase.id,
        commandIndex: 0
      };
    }
  }

  // Look for parent case and find next sibling
  const parentCase = findParentCase(currentCaseId, testCases);
  if (parentCase) {
    const subCaseIndex = parentCase.subCases.findIndex(sub => sub.id === currentCaseId);
    if (subCaseIndex !== -1 && subCaseIndex < parentCase.subCases.length - 1) {
      const nextSubCase = parentCase.subCases[subCaseIndex + 1];
      if (nextSubCase.commands.length > 0) {
        return {
          caseId: nextSubCase.id,
          commandIndex: 0
        };
      }
    }
  }

  return null;
};

/**
 * Find parent case of a given case
 */
const findParentCase = (caseId: string, testCases: TestCase[]): TestCase | null => {
  for (const testCase of testCases) {
    const subCase = testCase.subCases.find(sub => sub.id === caseId);
    if (subCase) {
      return testCase;
    }
    const foundInSub = findParentCase(caseId, testCase.subCases);
    if (foundInSub) return foundInSub;
  }
  return null;
};