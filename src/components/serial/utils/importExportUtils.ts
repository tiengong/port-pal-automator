import { TestCase, TestCommand } from '../types';
import { fromPersistedCase } from '../workspace';
import { globalToast } from '@/hooks/useGlobalMessages';

/**
 * Export test case to JSON file
 */
export const exportTestCase = (testCase: TestCase): void => {
  if (!testCase) return;
  
  const dataStr = JSON.stringify(testCase, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${testCase.name}_${testCase.uniqueId}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  
  globalToast({
    title: "导出成功",
    description: `测试用例已导出: ${testCase.name}`,
  });
};

/**
 * Export multiple test cases to JSON file
 */
export const exportTestCases = (testCases: TestCase[]): void => {
  if (!testCases.length) return;
  
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    testCases: testCases
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `test_cases_export_${new Date().getTime()}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  
  globalToast({
    title: "批量导出成功",
    description: `已导出 ${testCases.length} 个测试用例`,
  });
};

/**
 * Import test case from JSON file
 */
export const importTestCaseFromFile = (
  file: File,
  onImport: (testCase: TestCase) => void,
  mode: 'merge' | 'subcase' = 'merge'
): void => {
  const reader = new FileReader();
  
  reader.onload = (event) => {
    try {
      const jsonData = JSON.parse(event.target?.result as string);
      let testCase: TestCase;
      
      // Handle different import formats
      if (Array.isArray(jsonData)) {
        // Array of test cases - import first one
        testCase = parseTestCaseData(jsonData[0]);
      } else if (jsonData.testCases && Array.isArray(jsonData.testCases)) {
        // Export format with metadata - import first test case
        testCase = parseTestCaseData(jsonData.testCases[0]);
      } else {
        // Single test case
        testCase = parseTestCaseData(jsonData);
      }
      
      if (testCase) {
        onImport(testCase);
        globalToast({
          title: "导入成功",
          description: `已导入测试用例: ${testCase.name}`,
        });
      } else {
        throw new Error('Invalid test case data');
      }
    } catch (error) {
      globalToast({
        title: "导入失败",
        description: "文件格式错误或数据损坏",
        variant: "destructive"
      });
    }
  };
  
  reader.readAsText(file);
};

/**
 * Parse test case data from various formats
 */
const parseTestCaseData = (data: any): TestCase | null => {
  try {
    // Check if it's a persisted test case format
    if (!data.isRunning && !data.currentCommand && data.id && data.name) {
      return fromPersistedCase(data);
    }
    
    // Assume it's a complete TestCase
    if (data.id && data.name && Array.isArray(data.commands)) {
      return data as TestCase;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing test case data:', error);
    return null;
  }
};

/**
 * Load test case to current case (merge mode)
 */
export const loadTestCaseToCurrentCase = (
  sourceCase: TestCase,
  currentCase: TestCase,
  testCases: TestCase[],
  setTestCases: (testCases: TestCase[]) => void,
  generateUniqueId: () => string
): void => {
  if (!currentCase) return;
  
  const commandsToAdd = sourceCase.commands.map(cmd => ({
    ...cmd,
    id: `cmd_${generateUniqueId()}`,
    selected: false,
    status: 'pending' as const
  }));
  
  const updatedCommands = [...currentCase.commands, ...commandsToAdd];
  const updatedTestCases = updateTestCaseCommands(testCases, currentCase.id, updatedCommands);
  
  setTestCases(updatedTestCases);
  
  globalToast({
    title: "载入成功",
    description: `已载入 ${commandsToAdd.length} 个命令到当前用例`,
  });
};

/**
 * Load test case as sub-case to current case
 */
export const loadTestCaseAsSubCaseToCurrentCase = (
  sourceCase: TestCase,
  currentCase: TestCase,
  testCases: TestCase[],
  setTestCases: (testCases: TestCase[]) => void,
  generateUniqueId: () => string
): void => {
  if (!currentCase) {
    globalToast({
      title: "无法载入",
      description: "请先选择当前用例",
      variant: "destructive"
    });
    return;
  }
  
  const newSubCase = cloneCaseForSubcase(sourceCase, generateUniqueId);
  const updatedTestCases = addSubCaseToCase(testCases, currentCase.id, newSubCase);
  
  setTestCases(updatedTestCases);
  
  globalToast({
    title: "载入成功",
    description: `已以子用例方式载入：${sourceCase.name}`,
  });
};

/**
 * Clone test case for use as sub-case
 */
const cloneCaseForSubcase = (sourceCase: TestCase, generateUniqueId: () => string): TestCase => {
  const cloneCmd = (cmd: TestCommand): TestCommand => ({
    ...cmd,
    id: `cmd_${generateUniqueId()}`,
    status: 'pending',
    selected: false
  });
  
  const cloneCase = (tc: TestCase): TestCase => ({
    ...tc,
    id: `case_${generateUniqueId()}`,
    uniqueId: generateUniqueId(),
    commands: tc.commands.map(cloneCmd),
    subCases: tc.subCases.map(cloneCase),
    isExpanded: false,
    isRunning: false,
    currentCommand: -1,
    selected: false,
    status: 'pending'
  });
  
  const cloned = cloneCase(sourceCase);
  cloned.uniqueId = generateUniqueId();
  return cloned;
};

/**
 * Update test case commands
 */
const updateTestCaseCommands = (testCases: TestCase[], caseId: string, commands: TestCommand[]): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === caseId) {
      return { ...testCase, commands };
    }
    
    // Handle nested cases
    if (testCase.subCases.length > 0) {
      return {
        ...testCase,
        subCases: updateTestCaseCommands(testCase.subCases, caseId, commands)
      };
    }
    
    return testCase;
  });
};

/**
 * Add sub-case to test case
 */
const addSubCaseToCase = (testCases: TestCase[], caseId: string, subCase: TestCase): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === caseId) {
      return { ...testCase, subCases: [...testCase.subCases, subCase] };
    }
    
    // Handle nested cases
    if (testCase.subCases.length > 0) {
      return {
        ...testCase,
        subCases: addSubCaseToCase(testCase.subCases, caseId, subCase)
      };
    }
    
    return testCase;
  });
};

/**
 * Create sample test case for demonstration
 */
export const createSampleTestCase = (): TestCase => {
  return {
    id: 'sample_001',
    uniqueId: '1001',
    name: '示例测试用例',
    description: '这是一个基础的测试用例示例',
    commands: [
      {
        id: 'cmd_001',
        type: 'execution',
        command: 'AT',
        validationMethod: 'contains',
        expectedResponse: 'OK',
        waitTime: 1000,
        stopOnFailure: false,
        lineEnding: 'crlf',
        selected: false,
        status: 'pending'
      }
    ],
    subCases: [],
    isExpanded: true,
    isRunning: false,
    currentCommand: -1,
    selected: false,
    status: 'pending',
    failureStrategy: 'stop',
    onWarningFailure: 'continue',
    onErrorFailure: 'stop'
  };
};

/**
 * Validate test case data
 */
export const validateTestCase = (testCase: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!testCase.id || typeof testCase.id !== 'string') {
    errors.push('测试用例ID无效');
  }
  
  if (!testCase.name || typeof testCase.name !== 'string') {
    errors.push('测试用例名称无效');
  }
  
  if (!Array.isArray(testCase.commands)) {
    errors.push('命令列表必须是数组');
  } else {
    testCase.commands.forEach((cmd: any, index: number) => {
      if (!cmd.id || typeof cmd.id !== 'string') {
        errors.push(`命令 ${index + 1} ID无效`);
      }
      if (!cmd.command || typeof cmd.command !== 'string') {
        errors.push(`命令 ${index + 1} 内容无效`);
      }
    });
  }
  
  if (!Array.isArray(testCase.subCases)) {
    errors.push('子用例列表必须是数组');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Generate import summary
 */
export const generateImportSummary = (testCase: TestCase): string => {
  const commandCount = testCase.commands.length;
  const subCaseCount = testCase.subCases.length;
  const totalCommands = countTotalCommands(testCase);
  
  return `${testCase.name} (${commandCount}命令, ${subCaseCount}子用例, 共${totalCommands}命令)`;
};

/**
 * Count total commands including sub-cases
 */
const countTotalCommands = (testCase: TestCase): number => {
  let total = testCase.commands.length;
  
  testCase.subCases.forEach(subCase => {
    total += countTotalCommands(subCase);
  });
  
  return total;
};