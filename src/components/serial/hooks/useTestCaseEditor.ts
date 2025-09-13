/**
 * 测试用例编辑状态管理Hook
 * 管理编辑对话框、内联编辑等编辑相关状态
 */

import { useState, useCallback } from 'react';
import { TestCase } from '../types';

export interface TestCaseEditorState {
  // 编辑状态
  editingCase: TestCase | null;
  isEditDialogOpen: boolean;
  editingCommandIndex: number | null;
  inlineEdit: {
    commandId: string | null;
    value: string;
  };
}

export interface TestCaseEditorActions {
  // 设置函数
  setEditingCase: (testCase: TestCase | null) => void;
  setIsEditDialogOpen: (open: boolean) => void;
  setEditingCommandIndex: (index: number | null) => void;
  setInlineEdit: (edit: { commandId: string | null; value: string }) => void;
  // 工具函数
  openEditDialog: (testCase: TestCase) => void;
  closeEditDialog: () => void;
  startInlineEdit: (commandId: string, value: string) => void;
  clearInlineEdit: () => void;
}

export const useTestCaseEditor = (): TestCaseEditorState & TestCaseEditorActions => {
  // 编辑状态
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null);
  const [inlineEdit, setInlineEdit] = useState<{ commandId: string | null; value: string }>({
    commandId: null,
    value: ''
  });

  // 工具函数
  const openEditDialog = useCallback((testCase: TestCase) => {
    setEditingCase(testCase);
    setIsEditDialogOpen(true);
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditingCase(null);
    setIsEditDialogOpen(false);
    setEditingCommandIndex(null);
  }, []);

  const startInlineEdit = useCallback((commandId: string, value: string) => {
    setInlineEdit({ commandId, value });
  }, []);

  const clearInlineEdit = useCallback(() => {
    setInlineEdit({ commandId: null, value: '' });
  }, []);

  return {
    // 状态
    editingCase,
    isEditDialogOpen,
    editingCommandIndex,
    inlineEdit,
    
    // 设置函数
    setEditingCase,
    setIsEditDialogOpen,
    setEditingCommandIndex,
    setInlineEdit,
    
    // 工具函数
    openEditDialog,
    closeEditDialog,
    startInlineEdit,
    clearInlineEdit
  };
};