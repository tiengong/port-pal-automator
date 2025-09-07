/**
 * 测试用例状态管理Hook
 * 统一管理TestCaseManager的所有状态
 */

import { useState, useCallback, useMemo } from 'react';
import { TestCase, TestCommand, ExecutionResult, ContextMenuState } from '../types';
import { Script } from '../types/ScriptTypes';

export interface TestCaseState {
  // 基础状态
  testCases: TestCase[];
  selectedCase: TestCase | null;
  selectedTestCaseId: string;
  currentWorkspace: any;
  
  // 编辑状态
  editingCase: TestCase | null;
  isEditDialogOpen: boolean;
  editingCommandIndex: number | null;
  inlineEdit: {
    commandId: string | null;
    value: string;
  };
  
  // 执行状态
  executionResults: ExecutionResult[];
  executingCommand: {
    caseId: string;
    commandIndex: number;
  } | null;
  isExecuting: boolean;
  
  // 用户交互状态
  waitingForUser: boolean;
  userPrompt: string;
  userActionDialog: {
    open: boolean;
    title: string;
    content: string;
    onConfirm: () => void;
    onCancel: () => void;
  };
  
  // 失败处理状态
  failurePromptDialog: {
    open: boolean;
    title: string;
    message: string;
    severity: 'warning' | 'error';
    onContinue: () => void;
    onStop: () => void;
    onRetry: () => void;
  };
  
  // 拖拽状态
  dragInfo: {
    isDragging: boolean;
    dragType: 'case' | 'command' | 'subcase' | null;
    dragItemId: string;
    dragSourceCaseId: string;
    dropTarget?: {
      caseId: string;
      itemId: string;
      itemType: 'command' | 'subcase';
      position: 'above' | 'below';
    };
  };
  
  // 上下文菜单状态
  contextMenu: ContextMenuState;
  
  // 焦点状态
  lastFocusedChild: {
    caseId: string;
    type: 'command' | 'subcase';
    itemId: string;
    index: number;
  } | null;
  
  // 脚本状态
  scripts: Script[];
  currentScript: Script | null;
  
  // 运行结果状态
  runResult: any | null;
  showRunResult: boolean;
  
  // 存储参数状态
  storedParameters: { [key: string]: { value: string; timestamp: number } };
  nextUniqueId: number;
}

export const useTestCaseState = () => {
  // 基础状态
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('');
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  
  // 编辑状态
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null);
  const [inlineEdit, setInlineEdit] = useState<{ commandId: string | null; value: string }>({
    commandId: null,
    value: ''
  });
  
  // 执行状态
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [executingCommand, setExecutingCommand] = useState<{ caseId: string; commandIndex: number } | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  
  // 用户交互状态
  const [waitingForUser, setWaitingForUser] = useState<boolean>(false);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [userActionDialog, setUserActionDialog] = useState<{
    open: boolean;
    title: string;
    content: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    open: false,
    title: '',
    content: '',
    onConfirm: () => {},
    onCancel: () => {}
  });
  
  // 失败处理状态
  const [failurePromptDialog, setFailurePromptDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    severity: 'warning' | 'error';
    onContinue: () => void;
    onStop: () => void;
    onRetry: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    severity: 'error',
    onContinue: () => {},
    onStop: () => {},
    onRetry: () => {}
  });
  
  // 拖拽状态
  const [dragInfo, setDragInfo] = useState<{
    isDragging: boolean;
    dragType: 'case' | 'command' | 'subcase' | null;
    dragItemId: string;
    dragSourceCaseId: string;
    dropTarget?: {
      caseId: string;
      itemId: string;
      itemType: 'command' | 'subcase';
      position: 'above' | 'below';
    };
  }>({
    isDragging: false,
    dragType: null,
    dragItemId: '',
    dragSourceCaseId: '',
    dropTarget: undefined
  });
  
  // 上下文菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: '',
    targetType: 'case'
  });
  
  // 焦点状态
  const [lastFocusedChild, setLastFocusedChild] = useState<{
    caseId: string;
    type: 'command' | 'subcase';
    itemId: string;
    index: number;
  } | null>(null);
  
  // 脚本状态
  const [scripts, setScripts] = useState<Script[]>([]);
  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  
  // 运行结果状态
  const [runResult, setRunResult] = useState<any | null>(null);
  const [showRunResult, setShowRunResult] = useState<boolean>(false);
  
  // 存储参数状态
  const [storedParameters, setStoredParameters] = useState<{ [key: string]: { value: string; timestamp: number } }>({});
  const [nextUniqueId, setNextUniqueId] = useState<number>(1001);

  // 计算属性
  const currentTestCase = useMemo(() => {
    return testCases.find(tc => tc.id === selectedTestCaseId) || null;
  }, [testCases, selectedTestCaseId]);

  const hasSelectedItems = useMemo(() => {
    const checkCase = (testCase: TestCase): boolean => {
      if (testCase.selected) return true;
      if (testCase.commands.some(cmd => cmd.selected)) return true;
      return testCase.subCases.some(checkCase);
    };
    return currentTestCase ? checkCase(currentTestCase) : false;
  }, [currentTestCase]);

  // 工具函数
  const generateUniqueId = useCallback(() => {
    const id = nextUniqueId;
    setNextUniqueId(prev => prev + 1);
    return id.toString();
  }, [nextUniqueId]);

  const updateTestCases = useCallback((updater: (cases: TestCase[]) => TestCase[]) => {
    setTestCases(prev => updater([...prev]));
  }, []);

  const selectTestCase = useCallback((caseId: string) => {
    setSelectedTestCaseId(caseId);
    const foundCase = testCases.find(tc => tc.id === caseId) || null;
    setSelectedCase(foundCase);
  }, [testCases]);

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

  const startExecution = useCallback(() => {
    setIsExecuting(true);
    setExecutionResults([]);
  }, []);

  const stopExecution = useCallback(() => {
    setIsExecuting(false);
    setExecutingCommand(null);
    setWaitingForUser(false);
    setUserPrompt('');
  }, []);

  const showUserActionDialog = useCallback((
    title: string,
    content: string,
    onConfirm: () => void,
    onCancel: () => void
  ) => {
    setUserActionDialog({
      open: true,
      title,
      content,
      onConfirm,
      onCancel
    });
  }, []);

  const hideUserActionDialog = useCallback(() => {
    setUserActionDialog(prev => ({ ...prev, open: false }));
  }, []);

  const showFailurePromptDialog = useCallback((
    title: string,
    message: string,
    severity: 'warning' | 'error',
    onContinue: () => void,
    onStop: () => void,
    onRetry: () => void
  ) => {
    setFailurePromptDialog({
      open: true,
      title,
      message,
      severity,
      onContinue,
      onStop,
      onRetry
    });
  }, []);

  const hideFailurePromptDialog = useCallback(() => {
    setFailurePromptDialog(prev => ({ ...prev, open: false }));
  }, []);

  const startDrag = useCallback((
    dragType: 'case' | 'command' | 'subcase',
    dragItemId: string,
    dragSourceCaseId: string
  ) => {
    setDragInfo(prev => ({
      ...prev,
      isDragging: true,
      dragType,
      dragItemId,
      dragSourceCaseId
    }));
  }, []);

  const endDrag = useCallback(() => {
    setDragInfo(prev => ({
      ...prev,
      isDragging: false,
      dragType: null,
      dragItemId: '',
      dragSourceCaseId: '',
      dropTarget: undefined
    }));
  }, []);

  const setDropTarget = useCallback((
    caseId: string,
    itemId: string,
    itemType: 'command' | 'subcase',
    position: 'above' | 'below'
  ) => {
    setDragInfo(prev => ({
      ...prev,
      dropTarget: {
        caseId,
        itemId,
        itemType,
        position
      }
    }));
  }, []);

  const clearDropTarget = useCallback(() => {
    setDragInfo(prev => ({
      ...prev,
      dropTarget: undefined
    }));
  }, []);

  const showContextMenu = useCallback((
    x: number,
    y: number,
    targetId: string,
    targetType: 'case' | 'command'
  ) => {
    setContextMenu({
      visible: true,
      x,
      y,
      targetId,
      targetType
    });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  const setLastFocused = useCallback((
    caseId: string,
    type: 'command' | 'subcase',
    itemId: string,
    index: number
  ) => {
    setLastFocusedChild({ caseId, type, itemId, index });
  }, []);

  return {
    // 状态
    testCases,
    selectedCase,
    selectedTestCaseId,
    currentWorkspace,
    editingCase,
    isEditDialogOpen,
    editingCommandIndex,
    inlineEdit,
    executionResults,
    executingCommand,
    isExecuting,
    waitingForUser,
    userPrompt,
    userActionDialog,
    failurePromptDialog,
    dragInfo,
    contextMenu,
    lastFocusedChild,
    scripts,
    currentScript,
    runResult,
    showRunResult,
    storedParameters,
    nextUniqueId,
    
    // 计算属性
    currentTestCase,
    hasSelectedItems,
    
    // 设置函数
    setTestCases,
    setSelectedCase,
    setSelectedTestCaseId,
    setCurrentWorkspace,
    setEditingCase,
    setIsEditDialogOpen,
    setEditingCommandIndex,
    setInlineEdit,
    setExecutionResults,
    setExecutingCommand,
    setIsExecuting,
    setWaitingForUser,
    setUserPrompt,
    setUserActionDialog,
    setFailurePromptDialog,
    setDragInfo,
    setContextMenu,
    setLastFocusedChild,
    setScripts,
    setCurrentScript,
    setRunResult,
    setShowRunResult,
    setStoredParameters,
    setNextUniqueId,
    
    // 工具函数
    generateUniqueId,
    updateTestCases,
    selectTestCase,
    openEditDialog,
    closeEditDialog,
    startInlineEdit,
    clearInlineEdit,
    startExecution,
    stopExecution,
    showUserActionDialog,
    hideUserActionDialog,
    showFailurePromptDialog,
    hideFailurePromptDialog,
    startDrag,
    endDrag,
    setDropTarget,
    clearDropTarget,
    showContextMenu,
    hideContextMenu,
    setLastFocused
  };
};