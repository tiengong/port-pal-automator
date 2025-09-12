import { useState, useEffect, useRef, useCallback } from 'react';
import { TestCase, TestCommand, TestRunResult, ContextMenuState } from '../types';
import { Script } from '../types/ScriptTypes';
import { eventBus, EVENTS } from '@/lib/eventBus';
import { globalToast } from '@/hooks/useGlobalMessages';
import { useTranslation } from 'react-i18next';

// Import utility functions
import { executeTestCase, executeCommand, ExecutionContext } from '../utils/testExecutionUtils';
import { setupUrcListeners, UrcHandlerContext } from '../utils/urcHandlerUtils';
import { 
  processContextMenuEvent, 
  addCommandViaContextMenu as addCommandViaContextMenuUtil,
  addUrcViaContextMenu as addUrcViaContextMenuUtil,
  addSubCaseViaContextMenu as addSubCaseViaContextMenuUtil,
  toggleSelectAllViaContextMenu as toggleSelectAllViaContextMenuUtil,
  deleteSelectedCommands as deleteSelectedCommandsUtil
} from '../utils/contextMenuUtils';
import { 
  initializeDragDropState, 
  cleanupDragDropState,
  handleDragStart as handleDragStartUtil,
  handleDragOver as handleDragOverUtil,
  handleDragLeave as handleDragLeaveUtil,
  handleDrop as handleDropUtil,
  handleDragEnd as handleDragEndUtil,
  DragDropContext
} from '../utils/dragDropUtils';
import { 
  exportTestCase, 
  loadTestCaseToCurrentCase as loadTestCaseToCurrentCaseUtil, 
  loadTestCaseAsSubCaseToCurrentCase as loadTestCaseAsSubCaseToCurrentCaseUtil,
  importTestCaseFromFile 
} from '../utils/importExportUtils';
import { createNewScript, executeScript, stopScript, selectScript, deleteScript } from '../utils/scriptManagementUtils';

// Import workspace utilities
import { 
  initializeDefaultWorkspace, 
  loadCases, 
  saveCase, 
  getCurrentWorkspace, 
  fromPersistedCase, 
  scheduleAutoSave, 
  getLastOpenedTestCase, 
  setLastOpenedTestCase 
} from '../workspace';

// Import test case utilities
import { 
  generateChildrenOrder, 
  getSortedChildren, 
  updateChildrenOrder, 
  moveItem 
} from '../utils/testCaseUtils';

import { 
  findTestCaseById, 
  getTopLevelParent, 
  findParentCase, 
  updateCaseById, 
  addSubCaseById, 
  toggleExpandById, 
  findCasePath, 
  deleteCaseById 
} from '../utils/testCaseRecursiveUtils';

import { 
  getCaseDepth, 
  canAddSubCase 
} from '../utils/testCaseHelpers';

import { 
  findCommandLocation, 
  getFirstExecutableInCase, 
  getNextStepFrom, 
  buildCommandOptionsFromCase 
} from '../utils/testCaseNavigationUtils';

import { 
  parseUrcData, 
  substituteVariables, 
  checkUrcMatch 
} from '../utils/testCaseUrcUtils';

export interface TestCaseManagerState {
  // Test cases state
  testCases: TestCase[];
  selectedTestCaseId: string;
  editingCase: TestCase | null;
  isEditDialogOpen: boolean;
  editingCommandIndex: number | null;
  
  // Script state
  scripts: Script[];
  currentScript: Script | null;
  
  // Execution state
  executionResults: any[];
  executingCommand: { caseId: string | null; commandIndex: number | null };
  runResult: TestRunResult | null;
  showRunResult: boolean;
  
  // URC and parameter state
  storedParameters: { [key: string]: { value: string; timestamp: number } };
  triggeredUrcIds: Set<string>;
  
  // UI state
  waitingForUser: boolean;
  userPrompt: string;
  contextMenu: ContextMenuState;
  dragInfo: DragDropContext;
  inlineEdit: { commandId: string | null; value: string };
  
  // Dialog state
  userActionDialog: any;
  failurePromptDialog: any;
  
  // Workspace state
  currentWorkspace: string | null;
  nextUniqueId: number;
  lastFocusedChild: { caseId: string; type: 'command' | 'subcase'; itemId: string; index: number } | null;
  
  // Running cases tracking
  runningCasesRef: React.MutableRefObject<Set<string>>;
}

export interface TestCaseManagerProps {
  connectedPorts: Array<{ port: any; params: any }>;
  receivedData: string[];
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}

export interface UseTestCaseManagerReturn {
  state: TestCaseManagerState;
  
  // Test case operations
  handleSelectTestCase: (caseId: string) => void;
  handleEditCase: (testCase: TestCase) => void;
  handleRunTestCase: (caseId: string) => Promise<void>;
  handleDeleteTestCase: (caseId: string) => void;
  updateCaseName: (caseId: string, name: string) => void;
  
  // Command operations
  handleRunCommand: (caseId: string, commandIndex: number) => Promise<{ success: boolean; error?: string }>;
  handleEditCommand: (caseId: string, commandIndex: number) => void;
  updateCommandSelection: (caseId: string, commandId: string, selected: boolean) => void;
  updateCaseSelection: (caseId: string, selected: boolean) => void;
  updateSubCaseSelection: (parentCaseId: string, subCaseId: string, selected: boolean) => void;
  toggleCaseExpand: (caseId: string) => void;
  
  // Context menu operations
  handleContextMenu: (e: React.MouseEvent, targetId: string, targetType: 'case' | 'command') => void;
  addCommandViaContextMenu: () => void;
  addUrcViaContextMenu: () => void;
  addSubCaseViaContextMenu: () => void;
  toggleSelectAllViaContextMenu: () => void;
  deleteSelectedCommands: () => void;
  
  // Drag and drop operations
  handleDragStart: (e: React.DragEvent, caseId: string, type: 'command' | 'subcase', itemId: string, index: number) => void;
  handleDragOver: (e: React.DragEvent, caseId: string, index: number) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  
  // Import/Export operations
  exportCurrentTestCase: () => void;
  importFromFile: (mode: 'merge' | 'subcase') => void;
  loadTestCaseToCurrentCase: (sourceCase: TestCase) => void;
  loadTestCaseAsSubCaseToCurrentCase: (sourceCase: TestCase) => void;
  
  // Script operations
  handleCreateScript: (script: Script) => void;
  handleDeleteScript: (scriptId: string) => void;
  handleSelectScript: (scriptId: string) => void;
  handleRunScript: (scriptId: string) => void;
  handleStopScript: (scriptId: string) => void;
  handleSaveScript: (script: Script) => void;
  
  // Workspace operations
  handleWorkspaceChange: () => Promise<void>;
  
  // Utility functions
  getCurrentTestCase: () => TestCase | null;
  getVisibleRootCase: () => TestCase | null;
  getTargetCaseForActions: (selectedCase: TestCase | null) => TestCase | null;
  hasSelectedItems: (testCase: TestCase) => boolean;
  generateUniqueId: () => string;
  
  // State updates
  setTestCases: (testCases: TestCase[]) => void;
  setSelectedTestCaseId: (id: string) => void;
  setEditingCase: (testCase: TestCase | null) => void;
  setIsEditDialogOpen: (open: boolean) => void;
  setEditingCommandIndex: (index: number | null) => void;
  setCurrentScript: (script: Script | null) => void;
  setScripts: (scripts: Script[]) => void;
  setRunResult: (result: TestRunResult | null) => void;
  setShowRunResult: (show: boolean) => void;
  setStoredParameters: (params: { [key: string]: { value: string; timestamp: number } }) => void;
  setTriggeredUrcIds: (ids: Set<string>) => void;
  setContextMenu: (menu: ContextMenuState) => void;
  setDragInfo: (info: DragDropContext) => void;
  setInlineEdit: (edit: { commandId: string | null; value: string }) => void;
  setUserActionDialog: (dialog: any) => void;
  setFailurePromptDialog: (dialog: any) => void;
  setLastFocusedChild: (child: { caseId: string; type: 'command' | 'subcase'; itemId: string; index: number } | null) => void;
  setCurrentWorkspace: (workspace: string | null) => void;
  setNextUniqueId: (id: number) => void;
  setExecutingCommand: (command: { caseId: string | null; commandIndex: number | null }) => void;
}

/**
 * Main hook for test case management
 */
export const useTestCaseManager = (props: TestCaseManagerProps): UseTestCaseManagerReturn => {
  const { connectedPorts, receivedData, statusMessages } = props;
  const { t } = useTranslation();
  const runningCasesRef = useRef<Set<string>>(new Set());
  
  // Initialize state
  const [state, setState] = useState<TestCaseManagerState>({
    testCases: [],
    selectedTestCaseId: '',
    editingCase: null,
    isEditDialogOpen: false,
    editingCommandIndex: null,
    scripts: [],
    currentScript: null,
    executionResults: [],
    executingCommand: { caseId: null, commandIndex: null },
    runResult: null,
    showRunResult: false,
    storedParameters: {},
    triggeredUrcIds: new Set(),
    waitingForUser: false,
    userPrompt: '',
    contextMenu: {
      visible: false,
      x: 0,
      y: 0,
      targetId: '',
      targetType: 'case',
      insertIndex: undefined,
      parentCaseId: undefined,
      targetPath: undefined
    },
    dragInfo: initializeDragDropState(),
    inlineEdit: { commandId: null, value: '' },
    userActionDialog: {
      isOpen: false,
      commandText: '',
      promptText: '',
      onConfirm: () => {},
      onCancel: () => {}
    },
    failurePromptDialog: {
      isOpen: false,
      promptText: '',
      onContinue: () => {},
      onStop: () => {}
    },
    currentWorkspace: null,
    nextUniqueId: 1001,
    lastFocusedChild: null,
    runningCasesRef
  });
  
  // State setters
  const setTestCases = useCallback((testCases: TestCase[]) => {
    setState(prev => ({ ...prev, testCases }));
  }, []);
  
  const setSelectedTestCaseId = useCallback((id: string) => {
    setState(prev => ({ ...prev, selectedTestCaseId: id }));
  }, []);
  
  const setEditingCase = useCallback((testCase: TestCase | null) => {
    setState(prev => ({ ...prev, editingCase: testCase }));
  }, []);
  
  const setIsEditDialogOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, isEditDialogOpen: open }));
  }, []);
  
  const setEditingCommandIndex = useCallback((index: number | null) => {
    setState(prev => ({ ...prev, editingCommandIndex: index }));
  }, []);
  
  const setCurrentScript = useCallback((script: Script | null) => {
    setState(prev => ({ ...prev, currentScript: script }));
  }, []);
  
  const setScripts = useCallback((scripts: Script[]) => {
    setState(prev => ({ ...prev, scripts }));
  }, []);
  
  const setRunResult = useCallback((result: TestRunResult | null) => {
    setState(prev => ({ ...prev, runResult: result }));
  }, []);
  
  const setShowRunResult = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showRunResult: show }));
  }, []);
  
  const setStoredParameters = useCallback((params: { [key: string]: { value: string; timestamp: number } }) => {
    setState(prev => ({ ...prev, storedParameters: params }));
  }, []);
  
  const setTriggeredUrcIds = useCallback((ids: Set<string>) => {
    setState(prev => ({ ...prev, triggeredUrcIds: ids }));
  }, []);
  
  const setContextMenu = useCallback((menu: ContextMenuState) => {
    setState(prev => ({ ...prev, contextMenu: menu }));
  }, []);
  
  const setDragInfo = useCallback((info: DragDropContext) => {
    setState(prev => ({ ...prev, dragInfo: info }));
  }, []);
  
  const setInlineEdit = useCallback((edit: { commandId: string | null; value: string }) => {
    setState(prev => ({ ...prev, inlineEdit: edit }));
  }, []);
  
  const setUserActionDialog = useCallback((dialog: any) => {
    setState(prev => ({ ...prev, userActionDialog: dialog }));
  }, []);
  
  const setFailurePromptDialog = useCallback((dialog: any) => {
    setState(prev => ({ ...prev, failurePromptDialog: dialog }));
  }, []);
  
  const setLastFocusedChild = useCallback((child: { caseId: string; type: 'command' | 'subcase'; itemId: string; index: number } | null) => {
    setState(prev => ({ ...prev, lastFocusedChild: child }));
  }, []);
  
  const setCurrentWorkspace = useCallback((workspace: string | null) => {
    setState(prev => ({ ...prev, currentWorkspace: workspace }));
  }, []);
  
  const setNextUniqueId = useCallback((id: number) => {
    setState(prev => ({ ...prev, nextUniqueId: id }));
  }, []);
  
  // Utility functions - 修复竞态条件，使用函数式更新
  const generateUniqueId = useCallback(() => {
    let generatedId: string;
    setState(prev => {
      generatedId = prev.nextUniqueId.toString();
      return { ...prev, nextUniqueId: prev.nextUniqueId + 1 };
    });
    return generatedId!;
  }, []);
  
  const getCurrentTestCase = useCallback(() => {
    if (!Array.isArray(state.testCases)) return null;
    
    if (state.selectedTestCaseId) {
      return findTestCaseById(state.selectedTestCaseId, state.testCases);
    }
    return state.testCases[0] || null;
  }, [state.testCases, state.selectedTestCaseId]);
  
  const getVisibleRootCase = useCallback(() => {
    if (!Array.isArray(state.testCases)) return null;
    
    if (state.selectedTestCaseId) {
      const casePath = findCasePath(state.selectedTestCaseId, state.testCases);
      if (casePath && casePath.length > 0) {
        return casePath[0]; // Return top-level ancestor
      }
    }
    return state.testCases[0] || null;
  }, [state.testCases, state.selectedTestCaseId]);
  
  const getTargetCaseForActions = useCallback((selectedCase: TestCase | null): TestCase | null => {
    if (!selectedCase) return null;
    
    // Add logic for stats cases if needed
    return selectedCase;
  }, []);
  
  const hasSelectedItems = useCallback((testCase: TestCase): boolean => {
    const hasSelectedCommands = testCase.commands.some(cmd => cmd.selected);
    const hasSelectedSubCases = testCase.subCases.some(subCase => subCase.selected);
    const hasSelectedInSubCases = testCase.subCases.some(subCase => hasSelectedItems(subCase));
    return hasSelectedCommands || hasSelectedSubCases || hasSelectedInSubCases;
  }, []);
  
  // Test case operations
  const handleSelectTestCase = useCallback((caseId: string) => {
    setSelectedTestCaseId(caseId);
    // Clear script selection when selecting a test case
    setCurrentScript(null);
  }, []);
  
  const handleEditCase = useCallback((testCase: TestCase) => {
    setEditingCase(testCase);
    setIsEditDialogOpen(true);
  }, []);

  const updateCaseName = useCallback((caseId: string, name: string) => {
    setTestCases(updateCaseById(state.testCases, caseId, (testCase) => ({
      ...testCase,
      name: name.trim()
    })));
    
    toast({
      title: "名称已更新",
      description: `测试用例名称已更新为: ${name.trim()}`,
    });
  }, [state.testCases, toast]);
  
  const handleRunTestCase = useCallback(async (caseId: string) => {
    const testCase = findTestCaseById(caseId, state.testCases);
    if (!testCase) return;

    // 如果正在运行，则暂停
    if (state.runningCasesRef.current.has(caseId)) {
      state.runningCasesRef.current.delete(caseId);
      setTestCases(updateCaseById(state.testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: 'pending'
      })));
      statusMessages?.addMessage(`测试用例 "${testCase.name}" 已暂停`, 'warning');
      return;
    }

    // 添加到运行中的用例集合
    state.runningCasesRef.current.add(caseId);

    // 每次运行测试用例时清空存储的变量和触发状态
    setStoredParameters({});
    setTriggeredUrcIds(new Set());
    
    // 更新状态为运行中
    setTestCases(updateCaseById(state.testCases, caseId, (tc) => ({
      ...tc,
      isRunning: true,
      status: 'running',
      currentCommand: 0
    })));
    
    statusMessages?.addMessage(`开始执行测试用例: ${testCase.name}`, 'info');

    // 使用模块化的执行函数
    const executionContext: ExecutionContext = {
      storedParameters: state.storedParameters,
      triggeredUrcIds: state.triggeredUrcIds,
      runningCasesRef: state.runningCasesRef,
      statusMessages
    };

    // 执行所有选中的命令，如果没有选中则执行全部命令
    const selectedCommands = testCase.commands.filter(cmd => cmd.selected);
    const commandsToRun = selectedCommands.length > 0 ? selectedCommands : testCase.commands;

    await executeTestCase({
      testCase,
      caseId,
      commandsToRun,
      context: executionContext,
      onStatusUpdate: (updates) => {
        setTestCases(updateCaseById(state.testCases, caseId, (tc) => ({
          ...tc,
          ...updates
        })));
      },
      onCommandExecute: async (caseId: string, commandIndex: number) => {
        return await handleRunCommand(caseId, commandIndex);
      },
      onComplete: (result) => {
        setRunResult(result);
        setShowRunResult(true);
      }
    });
  }, [state.testCases, state.storedParameters, state.triggeredUrcIds, state.runningCasesRef, statusMessages]);
  
  const handleDeleteTestCase = useCallback((caseId: string) => {
    setTestCases(state.testCases.filter(tc => tc.id !== caseId));
    if (state.selectedTestCaseId === caseId) {
      setSelectedTestCaseId(state.testCases.length > 1 ? state.testCases.find(tc => tc.id !== caseId)?.id || '' : '');
    }
    
    globalToast({
      title: "删除成功",
      description: "测试用例已删除"
    });
  }, [state.testCases, state.selectedTestCaseId]);
  
  // Command operations
  const handleRunCommand = useCallback(async (caseId: string, commandIndex: number): Promise<{ success: boolean; error?: string }> => {
    const targetCase = findTestCaseById(caseId, state.testCases);
    if (!targetCase) return { success: false, error: '测试用例未找到' };
    
    const command = targetCase.commands[commandIndex];
    if (!command) return { success: false, error: '命令未找到' };
    
    // 设置当前执行的命令高亮
    setState(prev => ({
      ...prev,
      executingCommand: { caseId, commandIndex }
    }));
    
    try {
      // 使用模块化的命令执行函数
      const result = await executeCommand(
        command,
        caseId,
        commandIndex,
        state.storedParameters,
        statusMessages
      );
      
      // 更新命令状态
      const updatedTestCases = updateCaseById(state.testCases, caseId, (tc) => ({
        ...tc,
        commands: tc.commands.map((cmd, idx) => 
          idx === commandIndex ? { ...cmd, status: result.success ? 'success' : 'failed' } : cmd
        )
      }));
      setTestCases(updatedTestCases);
      
      return result;
    } catch (error) {
      console.error('Command execution error:', error);
      return { success: false, error: error?.toString() || '命令执行失败' };
    } finally {
      // 清除高亮状态 - 添加清理机制防止竞态条件
      const timeoutId = setTimeout(() => {
        setState(prev => ({
          ...prev,
          executingCommand: { caseId: null, commandIndex: null }
        }));
      }, command.waitTime || 1000);
      
      // 返回清理函数，防止组件卸载后的状态更新
      return () => clearTimeout(timeoutId);
    }
  }, [state.testCases, state.storedParameters, statusMessages]);
  
  const handleEditCommand = useCallback((caseId: string, commandIndex: number) => {
    setSelectedTestCaseId(caseId);
    setEditingCommandIndex(commandIndex);
  }, []);
  
  const updateCommandSelection = useCallback((caseId: string, commandId: string, selected: boolean) => {
    const updatedTestCases = updateCaseById(state.testCases, caseId, (testCase) => ({
      ...testCase,
      commands: testCase.commands.map(cmd =>
        cmd.id === commandId ? { ...cmd, selected } : cmd
      )
    }));
    setTestCases(updatedTestCases);
  }, [state.testCases]);
  
  // Context menu operations
  const handleContextMenu = useCallback((e: React.MouseEvent, targetId: string, targetType: 'case' | 'command') => {
    const menuState = processContextMenuEvent(e, targetId, targetType, state.testCases);
    setContextMenu(menuState);
  }, [state.testCases]);
  
  const addCommandViaContextMenu = useCallback(() => {
    addCommandViaContextMenuUtil(
      state.contextMenu,
      getCurrentTestCase(),
      state.selectedTestCaseId,
      state.testCases,
      setTestCases,
      generateUniqueId
    );
  }, [state.contextMenu, state.selectedTestCaseId, state.testCases, generateUniqueId]);
  
  const addUrcViaContextMenu = useCallback(() => {
    addUrcViaContextMenuUtil(
      state.contextMenu,
      getCurrentTestCase(),
      state.selectedTestCaseId,
      state.testCases,
      setTestCases
    );
  }, [state.contextMenu, state.selectedTestCaseId, state.testCases]);
  
  const addSubCaseViaContextMenu = useCallback(() => {
    addSubCaseViaContextMenuUtil(
      state.contextMenu,
      getCurrentTestCase(),
      state.selectedTestCaseId,
      state.testCases,
      setTestCases,
      generateUniqueId
    );
  }, [state.contextMenu, state.selectedTestCaseId, state.testCases, generateUniqueId]);

  const toggleSelectAllViaContextMenu = useCallback(() => {
    const currentCase = getCurrentTestCase();
    if (currentCase) {
      toggleSelectAllViaContextMenuUtil(
        currentCase.id,
        state.lastFocusedChild,
        state.testCases,
        setTestCases
      );
    }
  }, [getCurrentTestCase, state.lastFocusedChild, state.testCases]);

  const deleteSelectedCommands = useCallback(() => {
    const currentCase = getCurrentTestCase();
    if (currentCase) {
      deleteSelectedCommandsUtil(
        currentCase,
        state.testCases,
        setTestCases
      );
    }
  }, [getCurrentTestCase, state.testCases]);

  const updateCaseSelection = useCallback((caseId: string, selected: boolean) => {
    const updatedTestCases = updateCaseById(state.testCases, caseId, (testCase) => ({
      ...testCase,
      selected
    }));
    setTestCases(updatedTestCases);
  }, [state.testCases]);

  const updateSubCaseSelection = useCallback((parentCaseId: string, subCaseId: string, selected: boolean) => {
    const updatedTestCases = updateCaseById(state.testCases, parentCaseId, (testCase) => ({
      ...testCase,
      subCases: testCase.subCases.map(subCase => 
        subCase.id === subCaseId ? { ...subCase, selected } : subCase
      )
    }));
    setTestCases(updatedTestCases);
  }, [state.testCases]);

  const toggleCaseExpand = useCallback((caseId: string) => {
    const updatedTestCases = toggleExpandById(state.testCases, caseId);
    setTestCases(updatedTestCases);
  }, [state.testCases]);
  
  // Drag and drop operations
  const handleDragStart = useCallback((e: React.DragEvent, caseId: string, type: 'command' | 'subcase', itemId: string, index: number) => {
    handleDragStartUtil(e, caseId, type, itemId, index, setDragInfo);
  }, [setDragInfo]);
  
  const handleDragOver = useCallback((e: React.DragEvent, caseId: string, index: number) => {
    handleDragOverUtil(e, caseId, index, setDragInfo);
  }, [setDragInfo]);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    handleDragLeaveUtil(e, setDragInfo);
  }, [setDragInfo]);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    handleDropUtil(e, state.dragInfo, state.testCases, setTestCases, setDragInfo);
  }, [state.dragInfo, state.testCases]);
  
  // Import/Export operations
  const exportCurrentTestCase = useCallback(() => {
    const currentCase = getCurrentTestCase();
    if (currentCase) {
      exportTestCase(currentCase);
    }
  }, [getCurrentTestCase]);
  
  const importFromFile = useCallback((mode: 'merge' | 'subcase') => {
    const currentCase = getCurrentTestCase();
    if (!currentCase) {
      globalToast({
        title: "无法导入",
        description: "请先选择当前用例",
        variant: "destructive"
      });
      return;
    }
    
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        importTestCaseFromFile(file, (importedCase) => {
          if (mode === 'merge') {
            loadTestCaseToCurrentCaseUtil(importedCase, currentCase, state.testCases, setTestCases);
          } else if (mode === 'subcase') {
            loadTestCaseAsSubCaseToCurrentCaseUtil(importedCase, currentCase, state.testCases, setTestCases, generateUniqueId);
          }
        }, mode);
      }
    };
    input.click();
  }, [getCurrentTestCase, state.testCases, generateUniqueId]);
  
  const loadTestCaseToCurrentCase = useCallback((sourceCase: TestCase) => {
    const currentCase = getCurrentTestCase();
    if (currentCase) {
      loadTestCaseToCurrentCase(sourceCase, currentCase, state.testCases, setTestCases);
    }
  }, [getCurrentTestCase, state.testCases]);
  
  const loadTestCaseAsSubCaseToCurrentCase = useCallback((sourceCase: TestCase) => {
    const currentCase = getCurrentTestCase();
    if (currentCase) {
      loadTestCaseAsSubCaseToCurrentCase(sourceCase, currentCase, state.testCases, setTestCases, generateUniqueId);
    }
  }, [getCurrentTestCase, state.testCases, generateUniqueId]);
  
  // Script operations
  const handleCreateScript = useCallback((script: Script) => {
    setScripts([...state.scripts, script]);
    setCurrentScript(script);
    
    globalToast({
      title: "脚本已创建",
      description: `已创建脚本: ${script.name}`
    });
  }, [state.scripts]);
  
  const handleDeleteScript = useCallback((scriptId: string) => {
    deleteScript(scriptId, state.scripts, setScripts, state.currentScript, setCurrentScript);
  }, [state.scripts, state.currentScript]);
  
  const handleSelectScript = useCallback((scriptId: string) => {
    selectScript(scriptId, state.scripts, setCurrentScript, setSelectedTestCaseId);
  }, [state.scripts]);
  
  const handleRunScript = useCallback((scriptId: string) => {
    const script = state.scripts.find(s => s.id === scriptId);
    if (script) {
      executeScript(script, (updates) => {
        setScripts(state.scripts.map(s => 
          s.id === scriptId ? { ...s, ...updates } : s
        ));
        if (state.currentScript?.id === scriptId) {
          setCurrentScript({ ...state.currentScript, ...updates });
        }
      }, statusMessages);
    }
  }, [state.scripts, state.currentScript, statusMessages]);
  
  const handleStopScript = useCallback((scriptId: string) => {
    const script = state.scripts.find(s => s.id === scriptId);
    if (script) {
      stopScript(script, (updates) => {
        setScripts(state.scripts.map(s => 
          s.id === scriptId ? { ...s, ...updates } : s
        ));
        if (state.currentScript?.id === scriptId) {
          setCurrentScript({ ...state.currentScript, ...updates });
        }
      }, statusMessages);
    }
  }, [state.scripts, state.currentScript, statusMessages]);
  
  const handleSaveScript = useCallback((script: Script) => {
    saveScript(script, (savedScript) => {
      setScripts(state.scripts.map(s => 
        s.id === savedScript.id ? savedScript : s
      ));
      if (state.currentScript?.id === savedScript.id) {
        setCurrentScript(savedScript);
      }
    });
  }, [state.scripts, state.currentScript]);
  
  // Workspace operations
  const handleWorkspaceChange = useCallback(async () => {
    try {
      const workspace = getCurrentWorkspace();
      setCurrentWorkspace(workspace ?? null);
      const cases = await loadCases();
      setTestCases(Array.isArray(cases) ? cases : []);
    } catch (error) {
      console.error('Failed to reload workspace:', error);
    }
  }, []);
  
  // Initialize workspace and load test cases
  useEffect(() => {
    const initWorkspace = async () => {
      try {
        const workspace = await initializeDefaultWorkspace();
        setCurrentWorkspace(workspace ?? null);
        const cases = await loadCases();
        setTestCases(Array.isArray(cases) ? cases : []);
        
        // Load last opened test case
        const lastTestCaseId = getLastOpenedTestCase();
        if (lastTestCaseId && cases.find(c => c.uniqueId === lastTestCaseId)) {
          const lastCase = cases.find(c => c.uniqueId === lastTestCaseId);
          if (lastCase) {
            setSelectedTestCaseId(lastCase.id);
          }
        } else if (cases.length > 0 && !state.selectedTestCaseId) {
          setSelectedTestCaseId(cases[0].id);
          setLastOpenedTestCase(cases[0].uniqueId);
        }
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
        globalToast({
          title: t("testCase.initFailed"),
          description: t("testCase.initFailedDesc"),
          variant: "destructive"
        });
      }
    };
    
    initWorkspace();
  }, []);
  
  // Track selected test case changes and save last opened
  useEffect(() => {
    if (state.selectedTestCaseId && state.testCases.length > 0) {
      const selectedCase = state.testCases.find(c => c.id === state.selectedTestCaseId);
      if (selectedCase) {
        setLastOpenedTestCase(selectedCase.uniqueId);
      }
    }
  }, [state.selectedTestCaseId, state.testCases]);
  
  // Setup URC listeners
  useEffect(() => {
    if (!getCurrentTestCase()) return;
    
    const urcContext: UrcHandlerContext = {
      currentTestCase: getCurrentTestCase(),
      testCases: state.testCases,
      storedParameters: state.storedParameters,
      triggeredUrcIds: state.triggeredUrcIds,
      onUpdateTestCases: setTestCases,
      onUpdateParameters: setStoredParameters,
      onUpdateTriggeredUrcIds: setTriggeredUrcIds,
      onExecuteCommand: async (caseId: string, commandIndex: number) => {
        await handleRunCommand(caseId, commandIndex);
      }
    };
    
    const unsubscribe = setupUrcListeners(urcContext);
    return unsubscribe;
  }, [state.testCases.length, state.storedParameters, state.triggeredUrcIds]);
  
  return {
    state,
    
    // Test case operations
    handleSelectTestCase,
    handleEditCase,
    handleRunTestCase,
    handleDeleteTestCase,
    updateCaseName,
    
    // Command operations
    handleRunCommand,
    handleEditCommand,
    updateCommandSelection,
    updateCaseSelection,
    updateSubCaseSelection,
    toggleCaseExpand,
    
    // Context menu operations
    handleContextMenu,
    addCommandViaContextMenu,
    addUrcViaContextMenu,
    addSubCaseViaContextMenu,
    toggleSelectAllViaContextMenu,
    deleteSelectedCommands,
    
    // Drag and drop operations
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    
    // Import/Export operations
    exportCurrentTestCase,
    importFromFile,
    loadTestCaseToCurrentCase,
    loadTestCaseAsSubCaseToCurrentCase,
    
    // Script operations
    handleCreateScript,
    handleDeleteScript,
    handleSelectScript,
    handleRunScript,
    handleStopScript,
    handleSaveScript,
    
    // Workspace operations
    handleWorkspaceChange,
    
    // Utility functions
    getCurrentTestCase,
    getVisibleRootCase,
    getTargetCaseForActions,
    hasSelectedItems,
    generateUniqueId,
    
    // State setters
    setTestCases,
    setSelectedTestCaseId,
    setEditingCase,
    setIsEditDialogOpen,
    setEditingCommandIndex,
    setCurrentScript,
    setScripts,
    setRunResult,
    setShowRunResult,
    setStoredParameters,
    setTriggeredUrcIds,
    setContextMenu,
    setDragInfo,
    setInlineEdit,
    setUserActionDialog,
    setFailurePromptDialog,
    setLastFocusedChild,
    setCurrentWorkspace,
    setNextUniqueId,
    setExecutingCommand: (command: { caseId: string | null; commandIndex: number | null }) => {
      setState(prev => ({
        ...prev,
        executingCommand: command
      }));
    },
    
    // 新增：更新命令的函数
    updateCommand: (caseId: string, commandIndex: number, updates: Partial<TestCommand>) => {
      const updatedTestCases = updateCaseById(state.testCases, caseId, (testCase) => ({
        ...testCase,
        commands: testCase.commands.map((cmd, idx) => 
          idx === commandIndex ? { ...cmd, ...updates } : cmd
        )
      }));
      setTestCases(updatedTestCases);
    }
  };
};