import { TestCase, TestCommand, ContextMenuState } from '../types';
import { findTestCaseById, findCasePath, findParentCase } from './testCaseRecursiveUtils';
import { canAddSubCase, getCaseDepth } from './testCaseHelpers';
import { generateChildrenOrder, getSortedChildren } from './testCaseUtils';
import { globalToast } from '@/hooks/useGlobalMessages';

export interface ContextMenuOperations {
  addCommand: (targetCaseId: string, insertIndex?: number) => void;
  addUrc: (targetCaseId: string, insertIndex?: number) => void;
  addSubCase: (targetCaseId: string, insertIndex?: number) => void;
  toggleSelectAll: (targetCaseId: string) => void;
  runSelected: (targetCaseId: string) => void;
  deleteSelected: (targetCaseId: string) => void;
  exportCase: (targetCaseId: string) => void;
  importFromCase: (sourceCaseId: string, targetCaseId: string, mode: 'merge' | 'subcase') => void;
  importFromFile: (targetCaseId: string, mode: 'merge' | 'subcase') => void;
}

/**
 * Process context menu event and extract target information
 */
export const processContextMenuEvent = (
  e: React.MouseEvent,
  targetId: string,
  targetType: 'case' | 'command',
  testCases: TestCase[]
): ContextMenuState => {
  e.preventDefault();
  e.stopPropagation();
  
  // Get target path and insertion position
  const path = findCasePath(targetId, testCases);
  const targetPath = path ? path.map(tc => tc.id) : [];
  
  // Determine insertion position
  let insertIndex: number | undefined;
  let parentCaseId: string | undefined;
  
  if (targetType === 'command') {
    // Find command's parent case and index
    const commandLocation = findCommandLocation(targetId, testCases);
    if (commandLocation) {
      insertIndex = commandLocation.commandIndex;
      parentCaseId = commandLocation.caseId;
    }
  } else if (targetType === 'case') {
    // Find case's parent and index
    const caseLocation = findCaseInParent(testCases, targetId);
    if (caseLocation) {
      insertIndex = caseLocation.index;
      parentCaseId = caseLocation.parentId;
    }
  }
  
  return {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    targetId,
    targetType,
    insertIndex,
    parentCaseId,
    targetPath
  };
};

/**
 * Find a case's location within its parent
 */
const findCaseInParent = (cases: TestCase[], caseId: string): { parentId: string; index: number } | null => {
  for (const testCase of cases) {
    const subCaseIndex = testCase.subCases.findIndex(sub => sub.id === caseId);
    if (subCaseIndex !== -1) {
      return { parentId: testCase.id, index: subCaseIndex };
    }
    const found = findCaseInParent(testCase.subCases, caseId);
    if (found) return found;
  }
  return null;
};

/**
 * Find a command's location within test cases
 */
const findCommandLocation = (commandId: string, testCases: TestCase[]): { caseId: string; commandIndex: number } | null => {
  for (const testCase of testCases) {
    const commandIndex = testCase.commands.findIndex(cmd => cmd.id === commandId);
    if (commandIndex !== -1) {
      return { caseId: testCase.id, commandIndex };
    }
    const found = findCommandLocation(commandId, testCase.subCases);
    if (found) return found;
  }
  return null;
};

/**
 * Add a new command via context menu
 */
export const addCommandViaContextMenu = (
  contextMenu: ContextMenuState,
  currentTestCase: TestCase | null,
  selectedTestCaseId: string,
  testCases: TestCase[],
  setTestCases: (testCases: TestCase[]) => void,
  generateUniqueId: () => string
): void => {
  if (!currentTestCase) return;
  
  // Determine target case and insertion position
  let targetCaseId: string;
  let insertAtIndex: number | undefined;
  
  // Use precise insertion if context menu data is available
  if (contextMenu.visible && contextMenu.parentCaseId) {
    targetCaseId = contextMenu.parentCaseId;
    if (contextMenu.insertIndex !== undefined) {
      insertAtIndex = contextMenu.insertIndex + 1;
    }
  } else {
    // Fallback to selected test case or current test case
    targetCaseId = selectedTestCaseId && selectedTestCaseId !== currentTestCase.id 
      ? selectedTestCaseId 
      : currentTestCase.id;
  }
  
  const newCommand: TestCommand = {
    id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'execution',
    command: 'AT',
    validationMethod: 'none',
    waitTime: 1000,
    stopOnFailure: false,
    lineEnding: 'crlf',
    selected: false,
    status: 'pending'
  };
  
  const updatedTestCases = insertCommandIntoCase(testCases, targetCaseId, newCommand, insertAtIndex);
  setTestCases(updatedTestCases);
  
  const targetCase = findTestCaseById(targetCaseId, testCases);
  const targetCaseName = targetCase ? targetCase.name : '未知用例';
  
  globalToast({
    title: "新增命令",
    description: `已在 ${targetCaseName} 中添加新命令: ${newCommand.command}`,
  });
};

/**
 * Add a new URC command via context menu
 */
export const addUrcViaContextMenu = (
  contextMenu: ContextMenuState,
  currentTestCase: TestCase | null,
  selectedTestCaseId: string,
  testCases: TestCase[],
  setTestCases: (testCases: TestCase[]) => void
): void => {
  if (!currentTestCase) return;
  
  // Determine target case and insertion position
  let targetCaseId: string;
  let insertAtIndex: number | undefined;
  
  if (contextMenu.visible && contextMenu.parentCaseId) {
    targetCaseId = contextMenu.parentCaseId;
    if (contextMenu.insertIndex !== undefined) {
      insertAtIndex = contextMenu.insertIndex + 1;
    }
  } else {
    targetCaseId = selectedTestCaseId && selectedTestCaseId !== currentTestCase.id 
      ? selectedTestCaseId 
      : currentTestCase.id;
  }
  
  const newUrc: TestCommand = {
    id: `urc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'urc',
    command: 'URC监听',
    validationMethod: 'none',
    waitTime: 0,
    stopOnFailure: false,
    lineEnding: 'none',
    selected: true,
    status: 'pending',
    urcPattern: '+CREG:',
    urcMatchMode: 'startsWith',
    urcListenMode: 'once',
    urcListenTimeout: 10000,
    urcFailureHandling: 'stop'
  };
  
  const updatedTestCases = insertCommandIntoCase(testCases, targetCaseId, newUrc, insertAtIndex);
  setTestCases(updatedTestCases);
  
  const targetCase = findTestCaseById(targetCaseId, testCases);
  const targetCaseName = targetCase ? targetCase.name : '未知用例';
  
  globalToast({
    title: "新增URC",
    description: `已在 ${targetCaseName} 中添加URC监听: ${newUrc.urcPattern}`,
  });
};

/**
 * Add a new sub-case via context menu
 */
export const addSubCaseViaContextMenu = (
  contextMenu: ContextMenuState,
  currentTestCase: TestCase | null,
  selectedTestCaseId: string,
  testCases: TestCase[],
  setTestCases: (testCases: TestCase[]) => void,
  generateUniqueId: () => string
): void => {
  if (!currentTestCase) return;
  
  // Determine target case and insertion position
  let targetCaseId: string;
  let insertAtIndex: number | undefined;
  
  if (contextMenu.visible && contextMenu.parentCaseId) {
    targetCaseId = contextMenu.parentCaseId;
    if (contextMenu.insertIndex !== undefined) {
      insertAtIndex = contextMenu.insertIndex + 1;
    }
  } else {
    targetCaseId = selectedTestCaseId && selectedTestCaseId !== currentTestCase.id 
      ? selectedTestCaseId 
      : currentTestCase.id;
  }
  
  // Check nesting level limit
  if (!canAddSubCase(targetCaseId, testCases)) {
    globalToast({
      title: "无法添加子用例",
      description: "已达到最大嵌套层级（3层）限制",
      variant: "destructive"
    });
    return;
  }
  
  const newSubCase: TestCase = {
    id: `subcase_${generateUniqueId()}`,
    uniqueId: generateUniqueId(),
    name: '新建子用例',
    description: '',
    commands: [],
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
  
  const updatedTestCases = insertSubCaseIntoCase(testCases, targetCaseId, newSubCase, insertAtIndex);
  setTestCases(updatedTestCases);
  
  const targetCase = findTestCaseById(targetCaseId, testCases);
  const targetCaseName = targetCase ? targetCase.name : '未知用例';
  
  globalToast({
    title: "新建子用例",
    description: `已在 ${targetCaseName} 中添加子用例: ${newSubCase.name}`,
  });
};

/**
 * Insert command into case at specified position
 */
const insertCommandIntoCase = (
  testCases: TestCase[],
  targetCaseId: string,
  newCommand: TestCommand,
  insertAtIndex?: number
): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === targetCaseId) {
      if (insertAtIndex !== undefined) {
        const newCommands = [...testCase.commands];
        newCommands.splice(insertAtIndex, 0, newCommand);
        return { ...testCase, commands: newCommands };
      } else {
        return { ...testCase, commands: [...testCase.commands, newCommand] };
      }
    }
    
    // Handle nested cases
    if (testCase.subCases.length > 0) {
      return {
        ...testCase,
        subCases: insertCommandIntoCase(testCase.subCases, targetCaseId, newCommand, insertAtIndex)
      };
    }
    
    return testCase;
  });
};

/**
 * Insert sub-case into case at specified position
 */
const insertSubCaseIntoCase = (
  testCases: TestCase[],
  targetCaseId: string,
  newSubCase: TestCase,
  insertAtIndex?: number
): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === targetCaseId) {
      if (insertAtIndex !== undefined) {
        const newSubCases = [...testCase.subCases];
        newSubCases.splice(insertAtIndex, 0, newSubCase);
        return { ...testCase, subCases: newSubCases };
      } else {
        return { ...testCase, subCases: [...testCase.subCases, newSubCase] };
      }
    }
    
    // Handle nested cases
    if (testCase.subCases.length > 0) {
      return {
        ...testCase,
        subCases: insertSubCaseIntoCase(testCase.subCases, targetCaseId, newSubCase, insertAtIndex)
      };
    }
    
    return testCase;
  });
};

/**
 * Toggle select all commands in a test case
 */
export const toggleSelectAllViaContextMenu = (
  targetCaseId: string,
  lastFocusedChild: { caseId: string; type: 'command' | 'subcase'; itemId: string; index: number } | null,
  testCases: TestCase[],
  setTestCases: (testCases: TestCase[]) => void
): void => {
  const targetCase = findTestCaseById(targetCaseId, testCases);
  if (!targetCase) return;
  
  let targetCommands: TestCommand[] = [];
  let scopeDescription = "当前用例";
  
  if (lastFocusedChild) {
    if (lastFocusedChild.type === 'subcase') {
      // If subcase is focused, select all commands in that subcase
      const subCase = findTestCaseById(lastFocusedChild.itemId, testCases);
      if (subCase) {
        targetCommands = subCase.commands;
        scopeDescription = `子用例"${subCase.name}"`;
      }
    } else if (lastFocusedChild.type === 'command') {
      // If command is focused, select all commands at the same level
      const parentCase = findTestCaseById(lastFocusedChild.caseId, testCases);
      if (parentCase) {
        targetCommands = parentCase.commands;
        scopeDescription = parentCase.id === targetCaseId ? "当前用例" : `子用例"${parentCase.name}"`;
      }
    }
  } else {
    // No focus, select all commands in current case
    targetCommands = targetCase.commands;
  }
  
  if (targetCommands.length === 0) {
    globalToast({
      title: "无可选择项",
      description: `${scopeDescription}中没有命令可以选择`,
      variant: "default"
    });
    return;
  }
  
  // Check if all are selected
  const allSelected = targetCommands.every(cmd => cmd.selected);
  const newSelectedState = !allSelected;
  
  // Update selection state
  const updatedTestCases = updateCommandsSelection(testCases, targetCaseId, targetCommands.map(cmd => cmd.id), newSelectedState);
  setTestCases(updatedTestCases);
  
  globalToast({
    title: newSelectedState ? "全选完成" : "取消全选",
    description: `已${newSelectedState ? '选中' : '取消选中'}${scopeDescription}中的 ${targetCommands.length} 个命令`,
  });
};

/**
 * Update selection state for specific commands
 */
const updateCommandsSelection = (
  testCases: TestCase[],
  targetCaseId: string,
  commandIds: string[],
  selected: boolean
): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === targetCaseId) {
      const updatedCommands = testCase.commands.map(cmd => 
        commandIds.includes(cmd.id) ? { ...cmd, selected } : cmd
      );
      return { ...testCase, commands: updatedCommands };
    }
    
    // Handle nested cases
    if (testCase.subCases.length > 0) {
      return {
        ...testCase,
        subCases: updateCommandsSelection(testCase.subCases, targetCaseId, commandIds, selected)
      };
    }
    
    return testCase;
  });
};

/**
 * Delete selected commands and sub-cases
 */
export const deleteSelectedCommands = (
  currentTestCase: TestCase | null,
  testCases: TestCase[],
  setTestCases: (testCases: TestCase[]) => void
): void => {
  if (!currentTestCase) return;
  
  const countSelectedItems = (testCase: TestCase): { commands: number; cases: number } => {
    const selectedCommands = testCase.commands.filter(cmd => cmd.selected);
    const selectedSubCases = testCase.subCases.filter(subCase => subCase.selected);
    let totalCommands = selectedCommands.length;
    let totalCases = selectedSubCases.length;
    
    testCase.subCases.forEach(subCase => {
      const subCounts = countSelectedItems(subCase);
      totalCommands += subCounts.commands;
      totalCases += subCounts.cases;
    });
    
    return { commands: totalCommands, cases: totalCases };
  };
  
  const counts = countSelectedItems(currentTestCase);
  if (counts.commands === 0 && counts.cases === 0) {
    globalToast({
      title: "提示",
      description: "请先勾选要删除的命令或子用例",
    });
    return;
  }
  
  const removeSelectedItems = (testCase: TestCase): TestCase => ({
    ...testCase,
    commands: testCase.commands.filter(cmd => !cmd.selected),
    subCases: testCase.subCases
      .filter(subCase => !subCase.selected)
      .map(subCase => removeSelectedItems(subCase))
  });
  
  const updatedTestCases = updateTestCaseById(testCases, currentTestCase.id, removeSelectedItems);
  setTestCases(updatedTestCases);
  
  let description = "";
  if (counts.commands > 0 && counts.cases > 0) {
    description = `已删除 ${counts.commands} 个命令和 ${counts.cases} 个子用例`;
  } else if (counts.commands > 0) {
    description = `已删除 ${counts.commands} 个命令`;
  } else {
    description = `已删除 ${counts.cases} 个子用例`;
  }
  
  globalToast({
    title: "删除成功",
    description: description
  });
};

/**
 * Update test case by ID with transformation function
 */
const updateTestCaseById = (testCases: TestCase[], caseId: string, updater: (testCase: TestCase) => TestCase): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === caseId) {
      return updater(testCase);
    }
    
    if (testCase.subCases.length > 0) {
      return {
        ...testCase,
        subCases: updateTestCaseById(testCase.subCases, caseId, updater)
      };
    }
    
    return testCase;
  });
};

/**
 * Get context menu items based on current state
 */
export const getContextMenuItems = (
  contextMenu: ContextMenuState,
  currentTestCase: TestCase | null,
  connectedPorts: Array<{ port: any; params: any }>,
  hasSelectedItems: boolean
) => {
  const items = [
    {
      id: 'add-command',
      label: '新建命令',
      icon: 'Hash',
      action: () => 'addCommand',
      disabled: !currentTestCase
    },
    {
      id: 'add-urc',
      label: '新建URC',
      icon: 'Search',
      action: () => 'addUrc',
      disabled: !currentTestCase
    },
    {
      id: 'add-subcase',
      label: '新建子用例',
      icon: 'TestTube2',
      action: () => 'addSubCase',
      disabled: !currentTestCase
    }
  ];
  
  const separator = { id: 'separator-1', type: 'separator' };
  
  const operationItems = [
    {
      id: 'toggle-select-all',
      label: '全选/取消全选',
      icon: 'CheckSquare',
      action: () => 'toggleSelectAll',
      disabled: !currentTestCase || !currentTestCase.commands.length
    },
    {
      id: 'run-selected',
      label: '运行',
      icon: 'Play',
      action: () => 'runSelected',
      disabled: !currentTestCase || connectedPorts.length === 0
    }
  ];
  
  const deleteItems = [
    {
      id: 'delete-selected',
      label: '删除勾选的命令',
      icon: 'Trash2',
      action: () => 'deleteSelected',
      disabled: !currentTestCase || !hasSelectedItems,
      variant: 'destructive' as const
    }
  ];
  
  const exportItems = [
    {
      id: 'export-case',
      label: '导出用例到...',
      icon: 'Download',
      action: () => 'exportCase',
      disabled: !currentTestCase
    }
  ];
  
  return [
    ...items,
    separator,
    ...operationItems,
    { id: 'separator-2', type: 'separator' },
    ...deleteItems,
    { id: 'separator-3', type: 'separator' },
    ...exportItems
  ];
};