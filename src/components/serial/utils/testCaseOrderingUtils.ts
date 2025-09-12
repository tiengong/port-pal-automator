/**
 * 测试用例排序和移动工具函数
 * 专注于子项排序、移动、层级管理等功能
 */

import { TestCase, TestCommand } from '../types';

/**
 * 生成子项排序顺序
 */
export const generateChildrenOrder = (
  commands: TestCommand[],
  subCases: TestCase[]
): Array<{ type: 'command' | 'subcase'; id: string; index: number }> => {
  const order: Array<{ type: 'command' | 'subcase'; id: string; index: number }> = [];
  
  // 添加命令
  commands.forEach((command, index) => {
    order.push({ type: 'command', id: command.id, index });
  });
  
  // 添加子用例
  subCases.forEach((subCase, index) => {
    order.push({ type: 'subcase', id: subCase.id, index });
  });
  
  return order;
};

/**
 * 获取排序后的子项
 */
export const getSortedChildren = (testCase: TestCase): Array<TestCommand | TestCase> => {
  if (!testCase.childrenOrder || testCase.childrenOrder.length === 0) {
    // 如果没有自定义排序，按默认顺序：先命令后子用例
    return [...testCase.commands, ...testCase.subCases];
  }
  
  const childrenMap = new Map<string, TestCommand | TestCase>();
  
  // 构建映射
  testCase.commands.forEach(cmd => childrenMap.set(cmd.id, cmd));
  testCase.subCases.forEach(subCase => childrenMap.set(subCase.id, subCase));
  
  // 按顺序返回
  return testCase.childrenOrder.map(item => childrenMap.get(item.id)).filter(Boolean) as Array<TestCommand | TestCase>;
};

/**
 * 更新子项排序
 */
export const updateChildrenOrder = (
  testCase: TestCase,
  newOrder: Array<{ type: 'command' | 'subcase'; id: string; index: number }>
): TestCase => {
  return {
    ...testCase,
    childrenOrder: newOrder
  };
};

/**
 * 移动项目（支持命令和子用例）
 */
export const moveItem = (
  testCases: TestCase[],
  sourceCaseId: string,
  sourceIndex: number,
  targetCaseId: string,
  targetIndex: number,
  itemType: 'command' | 'subcase'
): TestCase[] => {
  if (sourceCaseId === targetCaseId && sourceIndex === targetIndex) {
    return testCases; // 没有变化
  }
  
  // 找到源用例和目标用例
  const sourceCase = findTestCaseById(testCases, sourceCaseId);
  const targetCase = findTestCaseById(testCases, targetCaseId);
  
  if (!sourceCase || !targetCase) {
    console.warn('源用例或目标用例未找到');
    return testCases;
  }
  
  // 检查是否试图将用例移动到其子用例中（避免循环）
  if (itemType === 'subcase' && isDescendantOf(sourceCaseId, targetCaseId, testCases)) {
    console.warn('不能将用例移动到其子用例中');
    return testCases;
  }
  
  return testCases.map(testCase => {
    // 处理源用例（移除项目）
    if (testCase.id === sourceCaseId) {
      const updatedCase = { ...testCase };
      
      if (itemType === 'command') {
        const commands = [...testCase.commands];
        const [movedCommand] = commands.splice(sourceIndex, 1);
        updatedCase.commands = commands;
      } else {
        const subCases = [...testCase.subCases];
        const [movedSubCase] = subCases.splice(sourceIndex, 1);
        updatedCase.subCases = subCases;
      }
      
      return updatedCase;
    }
    
    // 处理目标用例（添加项目）
    if (testCase.id === targetCaseId) {
      const updatedCase = { ...testCase };
      
      if (itemType === 'command') {
        const commands = [...testCase.commands];
        const sourceCase = findTestCaseById(testCases, sourceCaseId)!;
        const movedCommand = sourceCase.commands[sourceIndex];
        
        if (movedCommand) {
          commands.splice(targetIndex, 0, movedCommand);
          updatedCase.commands = commands;
        }
      } else {
        const subCases = [...testCase.subCases];
        const sourceCase = findTestCaseById(testCases, sourceCaseId)!;
        const movedSubCase = sourceCase.subCases[sourceIndex];
        
        if (movedSubCase) {
          subCases.splice(targetIndex, 0, movedSubCase);
          updatedCase.subCases = subCases;
        }
      }
      
      return updatedCase;
    }
    
    return testCase;
  });
};

/**
 * 在指定位置插入新项目
 */
export const insertItem = (
  testCases: TestCase[],
  targetCaseId: string,
  targetIndex: number,
  newItem: TestCommand | TestCase,
  itemType: 'command' | 'subcase'
): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === targetCaseId) {
      const updatedCase = { ...testCase };
      
      if (itemType === 'command') {
        const commands = [...testCase.commands];
        commands.splice(targetIndex, 0, newItem as TestCommand);
        updatedCase.commands = commands;
      } else {
        const subCases = [...testCase.subCases];
        subCases.splice(targetIndex, 0, newItem as TestCase);
        updatedCase.subCases = subCases;
      }
      
      return updatedCase;
    }
    
    return {
      ...testCase,
      subCases: insertItem(testCase.subCases, targetCaseId, targetIndex, newItem, itemType)
    };
  });
};

/**
 * 删除指定项目
 */
export const removeItem = (
  testCases: TestCase[],
  caseId: string,
  itemIndex: number,
  itemType: 'command' | 'subcase'
): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === caseId) {
      const updatedCase = { ...testCase };
      
      if (itemType === 'command') {
        const commands = [...testCase.commands];
        commands.splice(itemIndex, 1);
        updatedCase.commands = commands;
      } else {
        const subCases = [...testCase.subCases];
        subCases.splice(itemIndex, 1);
        updatedCase.subCases = subCases;
      }
      
      return updatedCase;
    }
    
    return {
      ...testCase,
      subCases: removeItem(testCase.subCases, caseId, itemIndex, itemType)
    };
  });
};

/**
 * 交换两个项目的位置
 */
export const swapItems = (
  testCases: TestCase[],
  caseId: string,
  index1: number,
  index2: number,
  itemType: 'command' | 'subcase'
): TestCase[] => {
  if (index1 === index2) return testCases;
  
  return testCases.map(testCase => {
    if (testCase.id === caseId) {
      const updatedCase = { ...testCase };
      
      if (itemType === 'command') {
        const commands = [...testCase.commands];
        [commands[index1], commands[index2]] = [commands[index2], commands[index1]];
        updatedCase.commands = commands;
      } else {
        const subCases = [...testCase.subCases];
        [subCases[index1], subCases[index2]] = [subCases[index2], subCases[index1]];
        updatedCase.subCases = subCases;
      }
      
      return updatedCase;
    }
    
    return {
      ...testCase,
      subCases: swapItems(testCase.subCases, caseId, index1, index2, itemType)
    };
  });
};

/**
 * 检查是否为子孙用例（避免循环引用）
 */
const isDescendantOf = (descendantId: string, ancestorId: string, testCases: TestCase[]): boolean => {
  const findDescendant = (cases: TestCase[]): boolean => {
    return cases.some(testCase => {
      if (testCase.id === descendantId) return true;
      if (testCase.id === ancestorId) return false; // 找到了祖先但没有找到目标，停止搜索这个分支
      return findDescendant(testCase.subCases);
    });
  };
  
  // 首先在祖先的同级中查找
  for (const testCase of testCases) {
    if (testCase.id === ancestorId) {
      return findDescendant(testCase.subCases);
    }
  }
  
  return false;
};

// 从testCaseRecursiveUtils导入的辅助函数（避免循环依赖）
const findTestCaseById = (testCases: TestCase[], caseId: string): TestCase | null => {
  for (const testCase of testCases) {
    if (testCase.id === caseId) {
      return testCase;
    }
    const found = findTestCaseById(testCase.subCases, caseId);
    if (found) return found;
  }
  return null;
};