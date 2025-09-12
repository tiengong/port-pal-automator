/**
 * 测试用例执行相关工具函数
 * 专注于执行状态、历史记录、统计等功能
 */

import { TestCase, TestCommand } from '../types';

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
  const totalCommands = testCase.commands.length;
  const successCommands = testCase.commands.filter(cmd => cmd.status === 'success').length;
  const failedCommands = testCase.commands.filter(cmd => cmd.status === 'failed').length;
  const totalSubCases = testCase.subCases.length;
  
  // 递归统计子用例
  const subCaseStats = testCase.subCases.reduce((acc, subcase) => {
    const stats = getCaseStatistics(subcase);
    return {
      totalCommands: acc.totalCommands + stats.totalCommands,
      successCommands: acc.successCommands + stats.successCommands,
      failedCommands: acc.failedCommands + stats.failedCommands,
      totalSubCases: acc.totalSubCases + stats.totalSubCases
    };
  }, { totalCommands: 0, successCommands: 0, failedCommands: 0, totalSubCases: 0 });
  
  return {
    totalCommands: totalCommands + subCaseStats.totalCommands,
    successCommands: successCommands + subCaseStats.successCommands,
    failedCommands: failedCommands + subCaseStats.failedCommands,
    totalSubCases: totalSubCases + subCaseStats.totalSubCases
  };
};

/**
 * 判断是否为统计用例（包含特定标记）
 */
export const isStatsCase = (testCase: TestCase): boolean => {
  return testCase.name.includes('[统计]') || testCase.description?.includes('[统计]');
};

/**
 * 获取状态图标配置
 */
export const getStatusIconConfig = (status: string) => {
  switch (status) {
    case 'success':
      return { icon: '✓', color: 'text-green-600', bgColor: 'bg-green-100' };
    case 'failed':
      return { icon: '✗', color: 'text-red-600', bgColor: 'bg-red-100' };
    case 'running':
      return { icon: '⟳', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    case 'pending':
      return { icon: '○', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    case 'partial':
      return { icon: '◐', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    default:
      return { icon: '?', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
};

/**
 * 格式化命令索引显示
 */
export const formatCommandIndex = (index: number): string => {
  return index >= 0 ? `${index + 1}` : '';
};

/**
 * 获取执行状态统计
 */
export const getExecutionStats = (testCases: TestCase[]) => {
  let total = 0;
  let success = 0;
  let failed = 0;
  let running = 0;
  let pending = 0;
  
  const countStatus = (testCase: TestCase) => {
    total++;
    switch (testCase.status) {
      case 'success':
        success++;
        break;
      case 'failed':
        failed++;
        break;
      case 'running':
        running++;
        break;
      default:
        pending++;
        break;
    }
    
    // 递归统计子用例
    testCase.subCases.forEach(countStatus);
  };
  
  testCases.forEach(countStatus);
  
  return { total, success, failed, running, pending };
};

/**
 * 批量重置所有测试用例的执行状态
 */
export const resetAllExecutionStatus = (testCases: TestCase[]): TestCase[] => {
  return testCases.map(testCase => resetExecutionStatus(testCase));
};