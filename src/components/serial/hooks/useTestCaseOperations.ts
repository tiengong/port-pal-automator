import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { TestCase, TestCommand } from "../types";
import { updateCaseById, findTestCaseById, getSortedChildren, moveItem, updateChildrenOrder } from "../utils/testCaseUtils";
import { scheduleAutoSave } from "../workspace";

export const useTestCaseOperations = (
  testCases: TestCase[],
  setTestCases: (cases: TestCase[]) => void,
  inlineEdit: { commandId: string | null; value: string },
  setInlineEdit: (edit: { commandId: string | null; value: string }) => void
) => {
  const { toast } = useToast();
  const { t } = useTranslation();

  // 更新命令选中状态（支持嵌套）
  const updateCommandSelection = (caseId: string, commandId: string, selected: boolean) => {
    const updatedTestCases = updateCaseById(testCases, caseId, (testCase) => ({
      ...testCase,
      commands: testCase.commands.map(cmd =>
        cmd.id === commandId ? { ...cmd, selected } : cmd
      )
    }));
    setTestCases(updatedTestCases);
  };

  // 保存内联编辑
  const saveInlineEdit = (caseId: string, commandId: string) => {
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
      const updatedCase = findTestCaseById(caseId, updatedTestCases);
      if (updatedCase) {
        scheduleAutoSave(updatedCase);
      }
      
      toast({
        title: t("testCase.modifySuccess"),
        description: t("testCase.modifySuccessDesc")
      });
    }
    setInlineEdit({ commandId: null, value: '' });
  };

  // 统一重排序处理（命令和子用例）
  const handleUnifiedReorder = (testCase: TestCase, fromIndex: number, toIndex: number, position: 'above' | 'below') => {
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
  };

  return {
    updateCommandSelection,
    saveInlineEdit,
    handleUnifiedReorder
  };
};