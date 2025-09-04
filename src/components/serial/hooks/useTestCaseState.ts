// useTestCaseState.ts - Extract state management logic from TestCaseManager
import { useState, useEffect, useRef } from 'react';
import { TestCase, TestCommand, ExecutionResult, ContextMenuState } from '../types';
import { initializeDefaultWorkspace, loadCases, getCurrentWorkspace, getLastOpenedTestCase, setLastOpenedTestCase } from '../workspace';

export interface TestCaseState {
  testCases: TestCase[];
  selectedTestCaseId: string;
  editingCase: TestCase | null;
  isEditDialogOpen: boolean;
  editingCommandIndex: number | null;
  executionResults: ExecutionResult[];
  waitingForUser: boolean;
  userPrompt: string;
  contextMenu: ContextMenuState;
  nextUniqueId: number;
  currentWorkspace: any;
  dragInfo: {
    draggedItem: { caseId: string; type: 'command' | 'subcase'; itemId: string; index: number } | null;
    dropTarget: { caseId: string; index: number; position: 'above' | 'below' } | null;
  };
  inlineEdit: {
    commandId: string | null;
    value: string;
  };
  executingCommand: {
    caseId: string | null;
    commandIndex: number | null;
  };
  lastFocusedChild: {
    caseId: string;
    type: 'command' | 'subcase';
    itemId: string;
    index: number;
  } | null;
  storedParameters: { [key: string]: { value: string; timestamp: number } };
  triggeredUrcIds: Set<string>;
}

export const useTestCaseState = () => {
  const runningCasesRef = useRef<Set<string>>(new Set());
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('');
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null);
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: '',
    targetType: 'case'
  });
  const [nextUniqueId, setNextUniqueId] = useState(1001);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  
  // Drag and drop state for unified children (commands and subcases)
  const [dragInfo, setDragInfo] = useState<{
    draggedItem: { caseId: string; type: 'command' | 'subcase'; itemId: string; index: number } | null;
    dropTarget: { caseId: string; index: number; position: 'above' | 'below' } | null;
  }>({ draggedItem: null, dropTarget: null });

  // Inline editing state
  const [inlineEdit, setInlineEdit] = useState<{
    commandId: string | null;
    value: string;
  }>({ commandId: null, value: '' });

  // 当前执行命令状态
  const [executingCommand, setExecutingCommand] = useState<{
    caseId: string | null;
    commandIndex: number | null;
  }>({ caseId: null, commandIndex: null });
  
  // 跟踪最后焦点的子项（用于精确插入子用例位置）
  const [lastFocusedChild, setLastFocusedChild] = useState<{
    caseId: string;
    type: 'command' | 'subcase';
    itemId: string;
    index: number;
  } | null>(null);
  
  // 参数存储系统 - 用于URC解析的参数（端口内作用域）
  const [storedParameters, setStoredParameters] = useState<{ [key: string]: { value: string; timestamp: number } }>({});
  
  // 跟踪已触发的永久URC ID，防止重复触发
  const [triggeredUrcIds, setTriggeredUrcIds] = useState<Set<string>>(new Set());

  // Initialize workspace and load test cases
  useEffect(() => {
    const initWorkspace = async () => {
      try {
        const workspace = await initializeDefaultWorkspace();
        setCurrentWorkspace(workspace);
        const cases = await loadCases();
        // Ensure cases is always an array
        setTestCases(Array.isArray(cases) ? cases : []);
        
        // Load last opened test case
        const lastTestCaseId = getLastOpenedTestCase();
        if (lastTestCaseId && cases.find(c => c.uniqueId === lastTestCaseId)) {
          const lastCase = cases.find(c => c.uniqueId === lastTestCaseId);
          if (lastCase) {
            setSelectedTestCaseId(lastCase.id);
          }
        } else if (cases.length > 0 && !selectedTestCaseId) {
          setSelectedTestCaseId(cases[0].id);
          setLastOpenedTestCase(cases[0].uniqueId);
        }
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
        throw error;
      }
    };
    
    initWorkspace();
  }, []);

  // Handle workspace changes
  const handleWorkspaceChange = async () => {
    try {
      const workspace = getCurrentWorkspace();
      setCurrentWorkspace(workspace);
      const cases = await loadCases();
      // Ensure cases is always an array
      setTestCases(Array.isArray(cases) ? cases : []);
      
      // Load last opened test case for new workspace
      const lastTestCaseId = getLastOpenedTestCase();
      if (lastTestCaseId && cases.find(c => c.uniqueId === lastTestCaseId)) {
        const lastCase = cases.find(c => c.uniqueId === lastTestCaseId);
        if (lastCase) {
          setSelectedTestCaseId(lastCase.id);
        }
      } else {
        setSelectedTestCaseId(cases.length > 0 ? cases[0].id : '');
      }
    } catch (error) {
      console.error('Failed to reload workspace:', error);
    }
  };

  // Track selected test case changes and save last opened
  useEffect(() => {
    if (selectedTestCaseId && testCases.length > 0) {
      const selectedCase = testCases.find(c => c.id === selectedTestCaseId);
      if (selectedCase) {
        setLastOpenedTestCase(selectedCase.uniqueId);
      }
    }
  }, [selectedTestCaseId, testCases]);

  // Generate unique ID
  const generateUniqueId = () => {
    const id = nextUniqueId.toString();
    setNextUniqueId(prev => prev + 1);
    return id;
  };

  return {
    // State
    testCases,
    selectedTestCaseId,
    editingCase,
    isEditDialogOpen,
    editingCommandIndex,
    executionResults,
    waitingForUser,
    userPrompt,
    contextMenu,
    nextUniqueId,
    currentWorkspace,
    dragInfo,
    inlineEdit,
    executingCommand,
    lastFocusedChild,
    storedParameters,
    triggeredUrcIds,
    
    // Setters
    setTestCases,
    setSelectedTestCaseId,
    setEditingCase,
    setIsEditDialogOpen,
    setEditingCommandIndex,
    setExecutionResults,
    setWaitingForUser,
    setUserPrompt,
    setContextMenu,
    setNextUniqueId,
    setCurrentWorkspace,
    setDragInfo,
    setInlineEdit,
    setExecutingCommand,
    setLastFocusedChild,
    setStoredParameters,
    setTriggeredUrcIds,
    
    // Actions
    handleWorkspaceChange,
    generateUniqueId,
    
    // Refs
    runningCasesRef,
    contextMenuRef
  };
};