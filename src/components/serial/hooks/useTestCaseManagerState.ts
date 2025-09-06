import { useState, useRef } from 'react';
import { TestCase, ContextMenuState } from '../types';

// 测试用例管理器的所有状态
export const useTestCaseManagerState = () => {
  // 主要数据状态
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<string>('');
  
  // 编辑相关状态
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null);
  const [inlineEdit, setInlineEdit] = useState<{ commandId: string | null; value: string }>({
    commandId: null,
    value: ''
  });
  
  // 执行相关状态
  const [executionResults, setExecutionResults] = useState<any[]>([]);
  const [executingCommand, setExecutingCommand] = useState<string | null>(null);
  const [storedParameters, setStoredParameters] = useState<Record<string, { value: string; timestamp: number }>>({});
  const [triggeredUrcIds, setTriggeredUrcIds] = useState<Set<string>>(new Set());
  
  // UI交互状态
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: '',
    targetType: 'case'
  });
  const [dragInfo, setDragInfo] = useState<any>({ draggedItem: null, dropTarget: null });
  const [lastFocusedChild, setLastFocusedChild] = useState<any>(null);
  
  // ID管理
  const [nextUniqueId, setNextUniqueId] = useState(1);
  
  // Refs
  const runningCasesRef = useRef<Set<string>>(new Set());
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // 生成唯一ID
  const generateUniqueId = () => {
    const id = `tc_${nextUniqueId}`;
    setNextUniqueId(prev => prev + 1);
    return id;
  };

  return {
    // 数据状态
    testCases,
    setTestCases,
    selectedTestCaseId,
    setSelectedTestCaseId,
    currentWorkspace,
    setCurrentWorkspace,
    
    // 编辑状态
    editingCase,
    setEditingCase,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editingCommandIndex,
    setEditingCommandIndex,
    inlineEdit,
    setInlineEdit,
    
    // 执行状态
    executionResults,
    setExecutionResults,
    executingCommand,
    setExecutingCommand,
    storedParameters,
    setStoredParameters,
    triggeredUrcIds,
    setTriggeredUrcIds,
    
    // UI状态
    waitingForUser,
    setWaitingForUser,
    userPrompt,
    setUserPrompt,
    contextMenu,
    setContextMenu,
    dragInfo,
    setDragInfo,
    lastFocusedChild,
    setLastFocusedChild,
    
    // ID管理
    nextUniqueId,
    setNextUniqueId,
    generateUniqueId,
    
    // Refs
    runningCasesRef,
    contextMenuRef
  };
};