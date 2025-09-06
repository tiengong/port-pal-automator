// testCaseNavigationUtils.ts
import { TestCase, TestCommand } from './types';
import { findTestCaseById } from './testCaseRecursiveUtils';

// 查找命令在用例树中的位置
export const findCommandLocation = (commandId: string, cases: TestCase[]): { caseId: string; commandIndex: number } | null => {
  // Ensure cases is always an array to prevent iteration errors
  if (!Array.isArray(cases)) {
    return null;
  }
  
  for (const testCase of cases) {
    const commandIndex = testCase.commands.findIndex(cmd => cmd.id === commandId);
    if (commandIndex !== -1) {
      return { caseId: testCase.id, commandIndex };
    }
    
    // 递归查找子用例
    const found = findCommandLocation(commandId, testCase.subCases);
    if (found) return found;
  }
  return null;
};

// 获取用例中第一个可执行项
export const getFirstExecutableInCase = (testCase: TestCase): { caseId: string; commandIndex: number } | null => {
  if (testCase.commands.length > 0) {
    return { caseId: testCase.id, commandIndex: 0 };
  }
  
  // 如果当前用例没有命令，查找第一个子用例的第一条命令
  for (const subCase of testCase.subCases) {
    const first = getFirstExecutableInCase(subCase);
    if (first) return first;
  }
  
  return null;
};

// 获取指定位置的下一步
export const getNextStepFrom = (caseId: string, commandIndex: number, testCases: TestCase[]): { caseId: string; commandIndex: number } | null => {
  const targetCase = findTestCaseById(caseId, testCases);
  if (!targetCase) return null;
  
  // 尝试获取当前用例的下一条命令
  if (commandIndex + 1 < targetCase.commands.length) {
    return { caseId, commandIndex: commandIndex + 1 };
  }
  
  // 如果没有下一条命令，尝试进入第一个子用例
  if (targetCase.subCases.length > 0) {
    const first = getFirstExecutableInCase(targetCase.subCases[0]);
    if (first) return first;
  }
  
  return null;
};

// 构建跳转命令选项（仅限当前用例及其子用例的执行命令）
export const buildCommandOptionsFromCase = (testCase: TestCase | null, path: string[] = []): Array<{ id: string; label: string }> => {
  if (!testCase) return [];
  
  const pathName = [...path, testCase.name].join(' / ');
  const currentCaseOptions = testCase.commands
    .map((cmd, idx) => ({ cmd, idx }))
    .filter(({ cmd }) => cmd.type === 'execution')
    .map(({ cmd, idx }) => ({
      id: cmd.id,
      label: `${pathName} · ${idx + 1}. ${cmd.command}`
    }));
  
  const subCaseOptions = testCase.subCases.flatMap(subCase => 
    buildCommandOptionsFromCase(subCase, [...path, testCase.name])
  );
  
  return [...currentCaseOptions, ...subCaseOptions];
};