import { useCallback } from 'react';
import { TestCase, TestCommand } from '../types';
import { updateCaseById, findTestCaseById, getTopLevelParent } from '../testCaseRecursiveUtils';
import { scheduleAutoSave } from '../workspace';
import { useToast } from '@/hooks/use-toast';

export interface CommandOperationsProps {
  testCases: TestCase[];
  setTestCases: (cases: TestCase[]) => void;
  generateUniqueId: () => string;
}

export const useCommandOperations = ({
  testCases,
  setTestCases,
  generateUniqueId
}: CommandOperationsProps) => {
  const { toast } = useToast();

  // 添加新命令
  const addNewCommand = useCallback((caseId: string, commandType: 'execution' | 'urc' = 'execution') => {
    const newCommand: TestCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: commandType,
      command: commandType === 'execution' ? 'AT' : '',
      expectedResponse: '',
      validationMethod: 'equals',
      waitTime: 1000,
      selected: false,
      status: 'pending',
      stopOnFailure: false,
      lineEnding: 'crlf',
      timeout: 30000,
      maxAttempts: 1,
      retryDelay: 1000,
      failureSeverity: 'error',
      ...(commandType === 'urc' && {
        urcPattern: '+CREG:',
        urcMatchMode: 'startsWith',
        urcListenMode: 'once',
        urcListenTimeout: 10000,
        urcFailureHandling: 'stop'
      })
    };

    const updatedTestCases = updateCaseById(testCases, caseId, (testCase) => ({
      ...testCase,
      commands: [...testCase.commands, newCommand]
    }));
    setTestCases(updatedTestCases);

    // 自动保存更新后的用例
    const updatedCase = findTestCaseById(caseId, updatedTestCases);
    if (updatedCase) {
      const topLevelCase = getTopLevelParent(caseId, updatedTestCases);
      if (topLevelCase) {
        scheduleAutoSave(topLevelCase);
      }
    }

    toast({
      title: commandType === 'execution' ? "新增命令" : "新增URC",
      description: commandType === 'execution' 
        ? `已添加执行命令: ${newCommand.command}`
        : `已添加URC监听: ${newCommand.urcPattern}`,
    });
  }, [testCases, setTestCases, toast]);

  // 删除命令
  const deleteCommand = useCallback((caseId: string, commandIndex: number) => {
    const updatedTestCases = updateCaseById(testCases, caseId, (testCase) => ({
      ...testCase,
      commands: testCase.commands.filter((_, index) => index !== commandIndex)
    }));
    setTestCases(updatedTestCases);

    // 自动保存更新后的用例
    const updatedCase = findTestCaseById(caseId, updatedTestCases);
    if (updatedCase) {
      const topLevelCase = getTopLevelParent(caseId, updatedTestCases);
      if (topLevelCase) {
        scheduleAutoSave(topLevelCase);
      }
    }

    toast({
      title: "删除成功",
      description: "命令已删除",
    });
  }, [testCases, setTestCases, toast]);

  // 复制命令
  const duplicateCommand = useCallback((caseId: string, commandIndex: number) => {
    const targetCase = findTestCaseById(caseId, testCases);
    if (!targetCase || !targetCase.commands[commandIndex]) return;

    const originalCommand = targetCase.commands[commandIndex];
    const duplicatedCommand: TestCommand = {
      ...originalCommand,
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      selected: false,
      status: 'pending'
    };

    const updatedTestCases = updateCaseById(testCases, caseId, (testCase) => ({
      ...testCase,
      commands: [
        ...testCase.commands.slice(0, commandIndex + 1),
        duplicatedCommand,
        ...testCase.commands.slice(commandIndex + 1)
      ]
    }));
    setTestCases(updatedTestCases);

    // 自动保存更新后的用例
    const updatedCase = findTestCaseById(caseId, updatedTestCases);
    if (updatedCase) {
      const topLevelCase = getTopLevelParent(caseId, updatedTestCases);
      if (topLevelCase) {
        scheduleAutoSave(topLevelCase);
      }
    }

    toast({
      title: "复制成功",
      description: "命令已复制",
    });
  }, [testCases, setTestCases, toast]);

  // 更新命令
  const updateCommand = useCallback((caseId: string, commandIndex: number, updates: Partial<TestCommand>) => {
    const updatedTestCases = updateCaseById(testCases, caseId, (testCase) => ({
      ...testCase,
      commands: testCase.commands.map((cmd, idx) =>
        idx === commandIndex ? { ...cmd, ...updates } : cmd
      )
    }));
    setTestCases(updatedTestCases);

    // 自动保存更新后的用例
    const updatedCase = findTestCaseById(caseId, updatedTestCases);
    if (updatedCase) {
      const topLevelCase = getTopLevelParent(caseId, updatedTestCases);
      if (topLevelCase) {
        scheduleAutoSave(topLevelCase);
      }
    }
  }, [testCases, setTestCases]);

  return {
    addNewCommand,
    deleteCommand,
    duplicateCommand,
    updateCommand
  };
};