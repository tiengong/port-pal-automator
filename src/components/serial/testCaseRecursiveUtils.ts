// testCaseRecursiveUtils.ts
import { TestCase, TestCommand } from './types';

// 根据ID查找测试用例
export const findTestCaseById = (id: string, cases: TestCase[]): TestCase | null => {
  // Ensure cases is always an array to prevent iteration errors
  if (!Array.isArray(cases)) {
    return null;
  }
  
  for (const testCase of cases) {
    if (testCase.id === id || testCase.uniqueId === id) {
      return testCase;
    }
    const found = findTestCaseById(id, testCase.subCases);
    if (found) return found;
  }
  return null;
};

// 获取测试用例的顶层父用例
export const getTopLevelParent = (targetId: string, cases: TestCase[]): TestCase | null => {
  if (!Array.isArray(cases)) {
    return null;
  }
  
  for (const testCase of cases) {
    // 如果是顶层用例，直接返回
    if (testCase.id === targetId || testCase.uniqueId === targetId) {
      return testCase;
    }
    
    // 如果在子用例中找到，返回顶层父用例
    const found = findTestCaseById(targetId, testCase.subCases);
    if (found) {
      return testCase; // 返回顶层父用例
    }
  }
  return null;
};

// 查找指定用例的直接父用例
export const findParentCase = (targetId: string, testCases: TestCase[]): TestCase | null => {
  const findParent = (cases: TestCase[]): TestCase | null => {
    for (const testCase of cases) {
      // 检查直接子用例
      if (testCase.subCases.some(subCase => subCase.id === targetId)) {
        return testCase;
      }
      // 递归检查更深层的子用例
      const found = findParent(testCase.subCases);
      if (found) return found;
    }
    return null;
  };

  return findParent(testCases);
};

// 递归更新测试用例
export const updateCaseById = (cases: TestCase[], id: string, updater: (testCase: TestCase) => TestCase): TestCase[] => {
  // Ensure cases is always an array to prevent iteration errors
  if (!Array.isArray(cases)) {
    return [];
  }
  
  return cases.map(testCase => {
    if (testCase.id === id) {
      return updater(testCase);
    }
    if (testCase.subCases.length > 0) {
      return {
        ...testCase,
        subCases: updateCaseById(testCase.subCases, id, updater)
      };
    }
    return testCase;
  });
};

// 递归添加子用例
export const addSubCaseById = (cases: TestCase[], parentId: string, newCase: TestCase): TestCase[] => {
  // Ensure cases is always an array to prevent iteration errors
  if (!Array.isArray(cases)) {
    return [];
  }
  
  return cases.map(testCase => {
    if (testCase.id === parentId) {
      return {
        ...testCase,
        subCases: [...testCase.subCases, newCase],
        isExpanded: true // 自动展开以显示新添加的子用例
      };
    }
    if (testCase.subCases.length > 0) {
      return {
        ...testCase,
        subCases: addSubCaseById(testCase.subCases, parentId, newCase)
      };
    }
    return testCase;
  });
};

// 递归展开/折叠
export const toggleExpandById = (cases: TestCase[], id: string): TestCase[] => {
  // Ensure cases is always an array to prevent iteration errors
  if (!Array.isArray(cases)) {
    return [];
  }
  
  return cases.map(testCase => {
    if (testCase.id === id) {
      return { ...testCase, isExpanded: !testCase.isExpanded };
    }
    if (testCase.subCases.length > 0) {
      return {
        ...testCase,
        subCases: toggleExpandById(testCase.subCases, id)
      };
    }
    return testCase;
  });
};

// 查找用例路径（从根到目标节点的完整路径）
export const findCasePath = (targetId: string, cases: TestCase[], path: TestCase[] = []): TestCase[] | null => {
  // Ensure cases is always an array to prevent iteration errors
  if (!Array.isArray(cases)) {
    return null;
  }
  
  for (const testCase of cases) {
    const currentPath = [...path, testCase];
    
    if (testCase.id === targetId) {
      return currentPath;
    }
    
    const found = findCasePath(targetId, testCase.subCases, currentPath);
    if (found) return found;
  }
  return null;
};

// 递归删除测试用例（支持删除嵌套的子用例）
export const deleteCaseById = (cases: TestCase[], caseId: string): TestCase[] => {
  const deleteCaseFromArray = (cases: TestCase[]): TestCase[] => {
    return cases.filter(testCase => {
      if (testCase.id === caseId) {
        return false;
      }
      testCase.subCases = deleteCaseFromArray(testCase.subCases);
      return true;
    });
  };

  return deleteCaseFromArray(cases);
};