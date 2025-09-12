/**
 * 测试用例工具函数模块
 * 包含TestCaseManager中重复使用的工具函数和逻辑
 */

import { TestCase, TestCommand } from '@/components/serial/types';
import { updateCaseById, findTestCaseById } from './testCaseRecursiveUtils';

/**
 * 检查测试用例是否有执行历史
 */
export const hasExecutionHistory = (testCase: TestCase): boolean => {
  // 检查用例本身的状态
  if (testCase.status !== 'pending' || testCase.currentCommand !== -1 || testCase.isRunning) {
    return true;
  }
  
  // 检查命令是否有执行记录
  if (testCase.commands.some(cmd => cmd.status !== 'pending')) {
    return true;
  }
  
  // 递归检查子用例
  if (testCase.subCases.some(subcase => hasExecutionHistory(subcase))) {
    return true;
  }
  
  return false;
};

/**
 * 重置测试用例执行状态
 */
export const resetExecutionStatus = (testCase: TestCase): TestCase => {
  return {
    ...testCase,
    status: 'pending',
    currentCommand: -1,
    isRunning: false,
    commands: testCase.commands.map(cmd => ({
      ...cmd,
      status: 'pending'
    })),
    subCases: testCase.subCases.map(subcase => resetExecutionStatus(subcase))
  };
};

/**
 * 获取测试用例统计信息
 */
export const getCaseStatistics = (testCase: TestCase) => {
  const stats = {
    total: 0,
    success: 0,
    failed: 0,
    pending: 0
  };

  const countCommands = (tc: TestCase) => {
    tc.commands.forEach(cmd => {
      stats.total++;
      if (cmd.status === 'success') stats.success++;
      else if (cmd.status === 'failed') stats.failed++;
      else stats.pending++;
    });
    
    tc.subCases.forEach(countCommands);
  };

  countCommands(testCase);
  return stats;
};

/**
 * 检查是否为统计用例
 */
export const isStatsCase = (testCase: TestCase): boolean => {
  return testCase.name.startsWith('[Stats] ');
};

/**
 * 格式化命令索引显示
 */
export const formatCommandIndex = (index: number): string => {
  return (index + 1).toString().padStart(2, '0');
};

/**
 * 获取状态图标配置
 */
export const getStatusIconConfig = (status: string) => {
  switch (status) {
    case 'success':
      return { color: 'text-green-500', title: '成功' };
    case 'failed':
      return { color: 'text-red-500', title: '失败' };
    case 'running':
      return { color: 'text-yellow-500', title: '运行中' };
    case 'partial':
      return { color: 'text-blue-500', title: '部分完成' };
    default:
      return { color: 'text-gray-400', title: '待执行' };
  }
};

/**
 * 生成子项顺序
 */
export const generateChildrenOrder = (commands: TestCommand[], subCases: TestCase[]) => {
  const order = [];
  
  commands.forEach((cmd, index) => {
    order.push({ type: 'command' as const, id: cmd.id, index });
  });
  
  subCases.forEach((subCase, index) => {
    order.push({ type: 'subcase' as const, id: subCase.id, index });
  });
  
  return order;
};

/**
 * 根据顺序获取排序后的子项
 */
export const getSortedChildren = (testCase: TestCase) => {
  if (!testCase.childrenOrder || testCase.childrenOrder.length === 0) {
    return {
      commands: [...testCase.commands],
      subCases: [...testCase.subCases]
    };
  }

  const commands: TestCommand[] = [];
  const subCases: TestCase[] = [];
  
  testCase.childrenOrder.forEach(item => {
    if (item.type === 'command') {
      const cmd = testCase.commands.find(c => c.id === item.id);
      if (cmd) commands.push(cmd);
    } else if (item.type === 'subcase') {
      const subCase = testCase.subCases.find(s => s.id === item.id);
      if (subCase) subCases.push(subCase);
    }
  });
  
  return { commands, subCases };
};

/**
 * 更新子项顺序
 */
export const updateChildrenOrder = (testCase: TestCase, newOrder: Array<{ type: 'command' | 'subcase'; id: string; index: number }>): TestCase => {
  return {
    ...testCase,
    childrenOrder: newOrder
  };
};

/**
 * 移动项目
 */
export const moveItem = (
  testCase: TestCase,
  sourceIndex: number,
  targetIndex: number,
  sourceType: 'command' | 'subcase',
  targetType: 'command' | 'subcase'
): TestCase => {
  if (!testCase.childrenOrder) {
    testCase = { ...testCase, childrenOrder: generateChildrenOrder(testCase.commands, testCase.subCases) };
  }

  const newOrder = [...testCase.childrenOrder];
  const sourceItem = newOrder.find(item => item.type === sourceType && item.index === sourceIndex);
  
  if (!sourceItem) return testCase;

  // 移除源项目
  const filteredOrder = newOrder.filter(item => !(item.type === sourceType && item.index === sourceIndex));
  
  // 调整索引
  const adjustedOrder = filteredOrder.map(item => {
    if (item.type === sourceType && item.index > sourceIndex) {
      return { ...item, index: item.index - 1 };
    }
    if (item.type === targetType && item.index >= targetIndex) {
      return { ...item, index: item.index + 1 };
    }
    return item;
  });

  // 插入到目标位置
  const targetPosition = adjustedOrder.findIndex(item => item.type === targetType && item.index === targetIndex);
  const finalOrder = [
    ...adjustedOrder.slice(0, targetPosition),
    { ...sourceItem, type: targetType, index: targetIndex },
    ...adjustedOrder.slice(targetPosition)
  ];

  return {
    ...testCase,
    childrenOrder: finalOrder
  };
};

/**
 * 测试用例工具函数集合
 */
/**
 * 生成唯一ID
 */
export const generateUniqueId = (() => {
  let counter = 1001;
  return () => (counter++).toString();
})();

/**
 * 获取选中的项目
 */
export const getSelectedItems = (testCases: TestCase[]): {
  cases: TestCase[];
  commands: { caseId: string; command: TestCommand; index: number }[];
} => {
  const selectedCases: TestCase[] = [];
  const selectedCommands: { caseId: string; command: TestCommand; index: number }[] = [];

  const traverse = (cases: TestCase[]) => {
    cases.forEach(testCase => {
      if (testCase.selected) {
        selectedCases.push(testCase);
      }
      
      testCase.commands.forEach((command, index) => {
        if (command.selected) {
          selectedCommands.push({ caseId: testCase.id, command, index });
        }
      });
      
      if (testCase.subCases.length > 0) {
        traverse(testCase.subCases);
      }
    });
  };

  traverse(testCases);
  return { cases: selectedCases, commands: selectedCommands };
};

/**
 * 检查是否有选中的项目
 */
export const hasSelectedItems = (testCases: TestCase[]): boolean => {
  const { cases, commands } = getSelectedItems(testCases);
  return cases.length > 0 || commands.length > 0;
};

/**
 * 清除所有选中状态
 */
export const clearAllSelections = (testCases: TestCase[]): TestCase[] => {
  return testCases.map(testCase => ({
    ...testCase,
    selected: false,
    commands: testCase.commands.map(cmd => ({ ...cmd, selected: false })),
    subCases: clearAllSelections(testCase.subCases)
  }));
};

/**
 * 获取当前测试用例
 */
export const getCurrentTestCase = (testCases: TestCase[], selectedTestCaseId: string): TestCase | null => {
  return testCases.find(tc => tc.id === selectedTestCaseId) || null;
};

/**
 * 获取目标用例（用于操作）
 */
export const getTargetCaseForActions = (selectedCase: TestCase | null, testCases: TestCase[]): TestCase | null => {
  if (!selectedCase) return null;
  
  // 如果当前选中的是子用例，返回其父用例
  const findParent = (cases: TestCase[], targetId: string): TestCase | null => {
    for (const testCase of cases) {
      if (testCase.subCases.some(sub => sub.id === targetId)) {
        return testCase;
      }
      const parent = findParent(testCase.subCases, targetId);
      if (parent) return parent;
    }
    return null;
  };

  const parent = findParent(testCases, selectedCase.id);
  return parent || selectedCase;
};

/**
 * 获取顶级父用例
 */
export const getTopLevelParent = (caseId: string, testCases: TestCase[]): TestCase | null => {
  const findParent = (cases: TestCase[], targetId: string, parent: TestCase | null = null): TestCase | null => {
    for (const testCase of cases) {
      if (testCase.id === targetId) {
        return parent || testCase;
      }
      const result = findParent(testCase.subCases, targetId, testCase);
      if (result) return result;
    }
    return null;
  };

  return findParent(testCases, caseId);
};

/**
 * 获取可见根用例
 */
export const getVisibleRootCase = (testCases: TestCase[], selectedTestCaseId: string): TestCase | null => {
  const currentCase = getCurrentTestCase(testCases, selectedTestCaseId);
  if (!currentCase) return null;
  
  return getTopLevelParent(currentCase.id, testCases) || currentCase;
};

/**
 * 更新命令选择状态
 */
export const updateCommandSelection = (
  testCases: TestCase[], 
  caseId: string, 
  commandId: string, 
  selected: boolean
): TestCase[] => {
  return updateCaseById(testCases, caseId, (testCase) => ({
    ...testCase,
    commands: testCase.commands.map(cmd => 
      cmd.id === commandId ? { ...cmd, selected } : cmd
    )
  }));
};

/**
 * 更新用例选择状态
 */
export const updateCaseSelection = (
  testCases: TestCase[], 
  caseId: string, 
  selected: boolean
): TestCase[] => {
  return updateCaseById(testCases, caseId, (testCase) => ({
    ...testCase,
    selected
  }));
};

/**
 * 切换用例展开状态
 */
export const toggleCaseExpand = (testCases: TestCase[], caseId: string): TestCase[] => {
  return updateCaseById(testCases, caseId, (testCase) => ({
    ...testCase,
    isExpanded: !testCase.isExpanded
  }));
};

/**
 * 获取运行统计
 */
export const getExecutionStats = (testCase: TestCase): {
  total: number;
  passed: number;
  failed: number;
  pending: number;
} => {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let pending = 0;

  const countCommands = (commands: TestCommand[]) => {
    commands.forEach(cmd => {
      total++;
      if (cmd.status === 'success') passed++;
      else if (cmd.status === 'failed') failed++;
      else pending++;
    });
  };

  const traverse = (testCase: TestCase) => {
    countCommands(testCase.commands);
    testCase.subCases.forEach(traverse);
  };

  traverse(testCase);
  return { total, passed, failed, pending };
};

/**
 * 创建新的测试用例
 */
export const createNewTestCase = (overrides: Partial<TestCase> = {}): TestCase => {
  const defaultTestCase: TestCase = {
    id: `case_${generateUniqueId()}`,
    uniqueId: generateUniqueId(),
    name: '新建测试用例',
    description: '',
    isExpanded: false,
    isRunning: false,
    currentCommand: -1,
    selected: false,
    status: 'pending',
    failureStrategy: 'stop',
    onWarningFailure: 'continue',
    onErrorFailure: 'stop',
    runCount: 1,
    runMode: 'continuous',
    commands: [],
    subCases: [],
    childrenOrder: []
  };

  return { ...defaultTestCase, ...overrides };
};

/**
 * 创建新的测试命令
 */
export const createNewCommand = (overrides: Partial<TestCommand> = {}): TestCommand => {
  const defaultCommand: TestCommand = {
    id: `cmd_${generateUniqueId()}`,
    type: 'execution',
    command: 'AT',
    expectedResponse: 'OK',
    validationMethod: 'contains',
    validationPattern: 'OK',
    waitTime: 2000,
    stopOnFailure: true,
    lineEnding: 'crlf',
    dataFormat: 'utf8',
    failureSeverity: 'error',
    maxAttempts: 1,
    retryDelay: 1000,
    selected: false,
    status: 'pending'
  };

  return { ...defaultCommand, ...overrides };
};

/**
 * 验证测试用例
 */
export const validateTestCase = (testCase: TestCase): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!testCase.name.trim()) {
    errors.push('用例名称不能为空');
  }

  if (testCase.commands.length === 0 && testCase.subCases.length === 0) {
    errors.push('用例至少需要包含一个命令或子用例');
  }

  testCase.commands.forEach((cmd, index) => {
    if (!cmd.command.trim()) {
      errors.push(`第 ${index + 1} 条命令不能为空`);
    }
  });

  return { valid: errors.length === 0, errors };
};

/**
 * 复制测试用例
 */
export const duplicateTestCase = (testCase: TestCase): TestCase => {
  return {
    ...testCase,
    id: `case_${generateUniqueId()}`,
    uniqueId: generateUniqueId(),
    name: `${testCase.name} (副本)`,
    isRunning: false,
    currentCommand: -1,
    status: 'pending',
    selected: false,
    commands: testCase.commands.map(cmd => ({
      ...cmd,
      id: `cmd_${generateUniqueId()}`,
      selected: false,
      status: 'pending'
    })),
    subCases: testCase.subCases.map(subCase => duplicateTestCase(subCase))
  };
};

/**
 * 搜索测试用例
 */
export const searchTestCases = (testCases: TestCase[], query: string): TestCase[] => {
  if (!query.trim()) return testCases;

  const lowerQuery = query.toLowerCase();
  
  const matches = (testCase: TestCase): boolean => {
    // 检查用例本身
    if (testCase.name.toLowerCase().includes(lowerQuery) || 
        testCase.description.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    // 检查命令
    if (testCase.commands.some(cmd => 
        cmd.command.toLowerCase().includes(lowerQuery) ||
        cmd.expectedResponse?.toLowerCase().includes(lowerQuery))) {
      return true;
    }
    
    // 检查子用例
    return testCase.subCases.some(matches);
  };

  const filterAndExpand = (cases: TestCase[]): TestCase[] => {
    return cases.map(testCase => {
      const hasMatchInChildren = testCase.subCases.some(matches);
      const filteredSubCases = filterAndExpand(testCase.subCases.filter(matches));
      
      if (matches(testCase) || hasMatchInChildren) {
        return {
          ...testCase,
          isExpanded: hasMatchInChildren ? true : testCase.isExpanded,
          subCases: filteredSubCases
        };
      }
      
      return null;
    }).filter(Boolean) as TestCase[];
  };

  return filterAndExpand(testCases);
};

/**
 * 查找用例路径（从根到目标用例）
 */
export const findCasePath = (caseId: string, testCases: TestCase[]): TestCase[] | null => {
  const findPath = (cases: TestCase[], targetId: string, path: TestCase[] = []): TestCase[] | null => {
    for (const testCase of cases) {
      const currentPath = [...path, testCase];
      if (testCase.id === targetId) {
        return currentPath;
      }
      const subPath = findPath(testCase.subCases, targetId, currentPath);
      if (subPath) return subPath;
    }
    return null;
  };

  return findPath(testCases, caseId);
};

/**
 * 获取用例嵌套深度
 */
export const getCaseDepth = (caseId: string, testCases: TestCase[]): number => {
  const path = findCasePath(caseId, testCases);
  return path ? path.length - 1 : 0;
};

/**
 * 检查是否可以添加子用例（限制最大嵌套层级）
 */
export const canAddSubCase = (parentCaseId: string, testCases: TestCase[]): boolean => {
  const currentDepth = getCaseDepth(parentCaseId, testCases);
  return currentDepth < 3; // 限制最大深度为3（根→子→子）
};