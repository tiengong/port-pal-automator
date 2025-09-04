// useTestCaseActions.ts - Extract action logic from TestCaseManager
import { useCallback } from 'react';
import { TestCase, TestCommand } from '../types';
import { 
  updateCaseById, 
  findTestCaseById, 
  findParentCase, 
  addSubCaseById, 
  toggleExpandById, 
  findCasePath, 
  deleteCaseById 
} from '../testCaseRecursiveUtils';
import { 
  generateChildrenOrder, 
  getSortedChildren, 
  updateChildrenOrder, 
  moveItem, 
  isStatsCase 
} from '../testCaseUtils';
import { scheduleAutoSave } from '../workspace';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface TestCaseActionsProps {
  testCases: TestCase[];
  setTestCases: (cases: TestCase[]) => void;
  generateUniqueId: () => string;
  setInlineEdit: (edit: { commandId: string | null; value: string }) => void;
  inlineEdit: { commandId: string | null; value: string };
}

export const useTestCaseActions = ({
  testCases,
  setTestCases,
  generateUniqueId,
  setInlineEdit,
  inlineEdit
}: TestCaseActionsProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();

  // 统一重排序处理（命令和子用例）
  const handleUnifiedReorder = useCallback((
    testCase: TestCase, 
    fromIndex: number, 
    toIndex: number, 
    position: 'above' | 'below'
  ) => {
    const sortedChildren = getSortedChildren(testCase);
    let targetIndex = toIndex;
    
    if (position === 'below') {
      targetIndex += 1;
    }
    
    // 如果拖拽的索引在目标索引之前，需要调整目标索引
    if (fromIndex < targetIndex) {
      targetIndex -= 1;
    }
    
    // 重新排列子项顺序
    const reorderedChildren = moveItem(sortedChildren, fromIndex, targetIndex);
    const newOrder = reorderedChildren.map((child, index) => ({
      type: child.type,
      id: child.type === 'command' ? (child.item as TestCommand).id : (child.item as TestCase).id,
      index
    }));
    
    const updatedTestCase = updateChildrenOrder(testCase, newOrder);
    const updatedTestCases = updateCaseById(testCases, testCase.id, () => updatedTestCase);
    setTestCases(updatedTestCases);
    
    // 自动保存更新后的用例
    scheduleAutoSave(updatedTestCase);
    
    toast({
      title: "重新排序成功",
      description: "子项顺序已更新"
    });
  }, [testCases, setTestCases, toast]);

  // 更新命令选中状态（支持嵌套）
  const updateCommandSelection = useCallback((
    caseId: string, 
    commandId: string, 
    selected: boolean
  ) => {
    const updatedTestCases = updateCaseById(testCases, caseId, (testCase) => ({
      ...testCase,
      commands: testCase.commands.map(cmd =>
        cmd.id === commandId ? { ...cmd, selected } : cmd
      )
    }));
    setTestCases(updatedTestCases);
  }, [testCases, setTestCases]);

  // 保存内联编辑
  const saveInlineEdit = useCallback((caseId: string, commandId: string) => {
    if (inlineEdit.commandId === commandId && inlineEdit.value.trim()) {
      const updatedTestCases = updateCaseById(testCases, caseId, (testCase) => ({
        ...testCase,
        commands: testCase.commands.map(cmd =>
          cmd.id === commandId 
            ? { ...cmd, [cmd.type === 'urc' ? 'urcPattern' : 'command']: inlineEdit.value.trim() }
            : cmd
        )
      }));
      setTestCases(updatedTestCases);
      
      // 自动保存更新后的用例
      const updatedCase = findTestCaseById(caseId, testCases);
      if (updatedCase) {
        scheduleAutoSave(updatedCase);
      }
      
      toast({
        title: t("testCase.modifySuccess"),
        description: t("testCase.modifySuccessDesc")
      });
    }
    setInlineEdit({ commandId: null, value: '' });
  }, [testCases, setTestCases, inlineEdit, setInlineEdit, toast, t]);

  // 获取用于操作的目标用例（统计用例使用其父用例）
  const getTargetCaseForActions = useCallback((selectedCase: TestCase | null): TestCase | null => {
    if (!selectedCase) return null;
    
    if (isStatsCase(selectedCase)) {
      const parent = findParentCase(selectedCase.id, testCases);
      return parent || selectedCase;
    }
    
    return selectedCase;
  }, [testCases]);

  // 获取当前选中的测试用例（支持嵌套查找）
  const getCurrentTestCase = useCallback((selectedTestCaseId: string) => {
    // Ensure testCases is always an array
    if (!Array.isArray(testCases)) {
      return null;
    }
    
    if (selectedTestCaseId) {
      return findTestCaseById(selectedTestCaseId, testCases);
    }
    return testCases[0] || null;
  }, [testCases]);

  // 获取可见的根用例（当前选中用例的顶层祖先）
  const getVisibleRootCase = useCallback((selectedTestCaseId: string): TestCase | null => {
    // Ensure testCases is always an array
    if (!Array.isArray(testCases)) {
      return null;
    }
    
    if (selectedTestCaseId) {
      const casePath = findCasePath(selectedTestCaseId, testCases);
      if (casePath && casePath.length > 0) {
        return casePath[0]; // 返回路径的第一个元素（顶层祖先）
      }
    }
    return testCases[0] || null;
  }, [testCases]);

  return {
    handleUnifiedReorder,
    updateCommandSelection,
    saveInlineEdit,
    getTargetCaseForActions,
    getCurrentTestCase,
    getVisibleRootCase
  };
};