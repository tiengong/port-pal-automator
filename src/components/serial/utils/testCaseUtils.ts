import { TestCase, TestCommand } from "../types";

// 根据ID查找测试用例
export const findTestCaseById = (id: string, cases: TestCase[] = []): TestCase | null => {
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
export const getTopLevelParent = (targetId: string, cases: TestCase[] = []): TestCase | null => {
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

// 判断是否为统计用例（根据名称判断）
export const isStatsCase = (testCase: TestCase): boolean => {
  const statsKeywords = ['统计', 'stats', 'summary', '汇总', '总结'];
  return statsKeywords.some(keyword => 
    testCase.name.toLowerCase().includes(keyword.toLowerCase())
  );
};

// 递归更新测试用例
export const updateCaseById = (cases: TestCase[], targetId: string, updateFn: (testCase: TestCase) => TestCase): TestCase[] => {
  return cases.map(testCase => {
    if (testCase.id === targetId) {
      return updateFn(testCase);
    }
    if (testCase.subCases.length > 0) {
      return {
        ...testCase,
        subCases: updateCaseById(testCase.subCases, targetId, updateFn)
      };
    }
    return testCase;
  });
};

// 数组移动工具函数
export const moveItem = <T,>(array: T[], fromIndex: number, toIndex: number): T[] => {
  const newArray = [...array];
  const [movedItem] = newArray.splice(fromIndex, 1);
  newArray.splice(toIndex, 0, movedItem);
  return newArray;
};

// 生成或修复childrenOrder
export const generateChildrenOrder = (testCase: TestCase): Array<{ type: 'command' | 'subcase'; id: string; index: number }> => {
  if (testCase.childrenOrder && testCase.childrenOrder.length === testCase.commands.length + testCase.subCases.length) {
    // 验证现有顺序的有效性
    const commandIds = new Set(testCase.commands.map(cmd => cmd.id));
    const subcaseIds = new Set(testCase.subCases.map(subcase => subcase.id));
    
    const isValid = testCase.childrenOrder.every(item => {
      if (item.type === 'command') return commandIds.has(item.id);
      if (item.type === 'subcase') return subcaseIds.has(item.id);
      return false;
    });
    
    if (isValid) return testCase.childrenOrder;
  }
  
  // 重新生成顺序：先命令，后子用例
  const newOrder: Array<{ type: 'command' | 'subcase'; id: string; index: number }> = [];
  
  testCase.commands.forEach((cmd, index) => {
    newOrder.push({ type: 'command', id: cmd.id, index });
  });
  
  testCase.subCases.forEach((subcase, index) => {
    newOrder.push({ type: 'subcase', id: subcase.id, index });
  });
  
  return newOrder;
};

// 获取排序后的子项列表
export const getSortedChildren = (testCase: TestCase): Array<{ type: 'command' | 'subcase'; item: TestCommand | TestCase; index: number }> => {
  const order = generateChildrenOrder(testCase);
  
  return order.map(orderItem => {
    if (orderItem.type === 'command') {
      const command = testCase.commands.find(cmd => cmd.id === orderItem.id);
      return { type: 'command' as const, item: command!, index: orderItem.index };
    } else {
      const subcase = testCase.subCases.find(subcase => subcase.id === orderItem.id);
      return { type: 'subcase' as const, item: subcase!, index: orderItem.index };
    }
  }).filter(item => item.item); // 过滤掉找不到的项目
};

// 更新子项顺序
export const updateChildrenOrder = (testCase: TestCase, newOrder: Array<{ type: 'command' | 'subcase'; id: string; index: number }>): TestCase => {
  return {
    ...testCase,
    childrenOrder: newOrder
  };
};

// 格式化命令索引（支持子用例嵌套）
export const formatCommandIndex = (index: number, subIndex?: number): string => {
  return subIndex !== undefined ? `${index + 1}.${subIndex + 1}` : `${index + 1}`;
};

// 生成唯一编号
export const generateUniqueId = (nextUniqueId: number, setNextUniqueId: (fn: (prev: number) => number) => void) => {
  const id = nextUniqueId.toString();
  setNextUniqueId(prev => prev + 1);
  return id;
};