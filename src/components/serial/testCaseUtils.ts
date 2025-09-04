// testCaseUtils.ts
import { TestCase, TestCommand } from './types';

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

// 数组移动工具函数
export const moveItem = <T,>(array: T[], fromIndex: number, toIndex: number): T[] => {
  const newArray = [...array];
  const [movedItem] = newArray.splice(fromIndex, 1);
  newArray.splice(toIndex, 0, movedItem);
  return newArray;
};

// 格式化命令索引（支持子用例嵌套）
export const formatCommandIndex = (index: number, subIndex?: number): string => {
  return subIndex !== undefined ? `${index + 1}.${subIndex + 1}` : `${index + 1}`;
};

// 判断是否为统计用例（根据名称判断）
export const isStatsCase = (testCase: TestCase): boolean => {
  return testCase.name.includes('统计') || testCase.name.includes('统计用例');
};