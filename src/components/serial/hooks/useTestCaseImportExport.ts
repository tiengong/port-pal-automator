import { useCallback } from 'react';
import { TestCase, TestCommand } from '../types';
import { updateCaseById, addSubCaseById } from '../testCaseRecursiveUtils';
import { useToast } from '@/hooks/use-toast';

export interface ImportExportProps {
  testCases: TestCase[];
  setTestCases: (cases: TestCase[]) => void;
  currentTestCase: TestCase | null;
  generateUniqueId: () => string;
}

export const useTestCaseImportExport = ({
  testCases,
  setTestCases,
  currentTestCase,
  generateUniqueId
}: ImportExportProps) => {
  const { toast } = useToast();

  // 深拷贝用例作为子用例
  const cloneCaseForSubcase = useCallback((src: TestCase): TestCase => {
    const cloneCmd = (cmd: TestCommand): TestCommand => ({
      ...cmd,
      id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      status: 'pending',
      selected: false
    });
    
    const cloneCase = (tc: TestCase): TestCase => ({
      ...tc,
      id: `case_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      uniqueId: '', // 子用例不需要唯一编号
      commands: tc.commands.map(cloneCmd),
      subCases: tc.subCases.map(cloneCase),
      isExpanded: false,
      isRunning: false,
      currentCommand: -1,
      selected: false,
      status: 'pending'
    });
    
    const cloned = cloneCase(src);
    cloned.uniqueId = generateUniqueId();
    return cloned;
  }, [generateUniqueId]);

  // 载入测试用例到当前用例
  const loadTestCaseToCurrentCase = useCallback((sourceCase: TestCase) => {
    if (!currentTestCase) return;

    const commandsToAdd = sourceCase.commands.map(cmd => ({
      ...cmd,
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      selected: false,
      status: 'pending' as const
    }));

    const updatedCommands = [...currentTestCase.commands, ...commandsToAdd];
    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
      ...testCase,
      commands: updatedCommands
    }));
    setTestCases(updatedTestCases);

    toast({
      title: "载入成功",
      description: `已载入 ${commandsToAdd.length} 个命令到当前用例`,
    });
  }, [currentTestCase, testCases, setTestCases, toast]);

  // 以子用例方式载入到当前用例
  const loadTestCaseAsSubCaseToCurrentCase = useCallback((sourceCase: TestCase) => {
    if (!currentTestCase) {
      toast({
        title: "无法载入",
        description: "请先选择当前用例",
        variant: "destructive"
      });
      return;
    }
    
    const newSubCase = cloneCaseForSubcase(sourceCase);
    const updated = addSubCaseById(testCases, currentTestCase.id, newSubCase);
    setTestCases(updated);
    
    toast({
      title: "载入成功",
      description: `已以子用例方式载入：${sourceCase.name}`,
    });
  }, [currentTestCase, testCases, setTestCases, toast, cloneCaseForSubcase]);

  // 从文件导入
  const importFromFile = useCallback((variant: 'merge' | 'subcase') => {
    if (!currentTestCase) {
      toast({
        title: "无法载入",
        description: "请先选择当前用例",
        variant: "destructive"
      });
      return;
    }

    // TODO: Implement file import logic
    console.log('Import from file:', variant);
  }, [currentTestCase, toast]);

  return {
    loadTestCaseToCurrentCase,
    loadTestCaseAsSubCaseToCurrentCase,
    importFromFile,
    cloneCaseForSubcase
  };
};