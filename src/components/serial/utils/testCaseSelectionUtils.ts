/**
 * 测试用例选择状态管理工具函数
 * 专注于选择状态、清除选择、获取选择项目等功能
 */

import { TestCase, TestCommand } from '../types';

/**
 * 获取所有选中的项目（测试用例和命令）
 */
export const getSelectedItems = (testCases: TestCase[]): {
  cases: TestCase[];
  commands: Array<{ caseId: string; command: TestCommand; commandIndex: number }>;
} => {
  const selectedCases: TestCase[] = [];
  const selectedCommands: Array<{ caseId: string; command: TestCommand; commandIndex: number }> = [];

  const processCase = (testCase: TestCase, parentCaseId?: string) => {
    const currentCaseId = parentCaseId || testCase.id;
    
    if (testCase.selected) {
      selectedCases.push(testCase);
    }
    
    testCase.commands.forEach((command, index) => {
      if (command.selected) {
        selectedCommands.push({
          caseId: currentCaseId,
          command,
          commandIndex: index
        });
      }
    });
    
    testCase.subCases.forEach(subcase => processCase(subcase, currentCaseId));
  };

  testCases.forEach(testCase => processCase(testCase));
  
  return { cases: selectedCases, commands: selectedCommands };
};

/**
 * 检查是否存在选中的项目
 */
export const hasSelectedItems = (testCases: TestCase[]): boolean => {
  return testCases.some(testCase => {
    if (testCase.selected) return true;
    if (testCase.commands.some(cmd => cmd.selected)) return true;
    return testCase.subCases.some(hasSelectedItems);
  });
};

/**
 * 清除所有选择状态
 */
export const clearAllSelections = (testCases: TestCase[]): TestCase[] => {
  return testCases.map(testCase => ({
    ...testCase,
    selected: false,
    commands: testCase.commands.map(cmd => ({
      ...cmd,
      selected: false
    })),
    subCases: clearAllSelections(testCase.subCases)
  }));
};

/**
 * 更新命令选择状态
 */
export const updateCommandSelection = (
  testCases: TestCase[],
  caseId: string,
  commandIndex: number,
  selected: boolean
): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === caseId) {
      return {
        ...testCase,
        commands: testCase.commands.map((cmd, idx) => 
          idx === commandIndex ? { ...cmd, selected } : cmd
        )
      };
    }
    
    return {
      ...testCase,
      subCases: updateCommandSelection(testCase.subCases, caseId, commandIndex, selected)
    };
  });
};

/**
 * 更新测试用例选择状态
 */
export const updateCaseSelection = (
  testCases: TestCase[],
  caseId: string,
  selected: boolean
): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === caseId) {
      return { ...testCase, selected };
    }
    
    return {
      ...testCase,
      subCases: updateCaseSelection(testCase.subCases, caseId, selected)
    };
  });
};

/**
 * 全选/取消全选所有项目
 */
export const setAllSelections = (
  testCases: TestCase[],
  selected: boolean
): TestCase[] => {
  return testCases.map(testCase => ({
    ...testCase,
    selected,
    commands: testCase.commands.map(cmd => ({
      ...cmd,
      selected
    })),
    subCases: setAllSelections(testCase.subCases, selected)
  }));
};

/**
 * 获取选中的测试用例数量
 */
export const getSelectedCaseCount = (testCases: TestCase[]): number => {
  let count = 0;
  
  const countSelected = (testCase: TestCase) => {
    if (testCase.selected) count++;
    testCase.subCases.forEach(countSelected);
  };
  
  testCases.forEach(countSelected);
  return count;
};

/**
 * 获取选中的命令数量
 */
export const getSelectedCommandCount = (testCases: TestCase[]): number => {
  let count = 0;
  
  const countCommands = (testCase: TestCase) => {
    count += testCase.commands.filter(cmd => cmd.selected).length;
    testCase.subCases.forEach(countCommands);
  };
  
  testCases.forEach(countCommands);
  return count;
};