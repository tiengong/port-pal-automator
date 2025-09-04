import { useState, useRef } from "react";
import { TestCase, ExecutionResult, ContextMenuState } from "../types";
import { TestRunResult } from "../RunResultDialog";

export const useTestCaseState = () => {
  // 状态管理
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
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
  
  // 运行结果状态
  const [runResult, setRunResult] = useState<TestRunResult | null>(null);
  const [showRunResult, setShowRunResult] = useState(false);
  
  // 跟踪最后焦点的子项（用于精确插入子用例位置）
  const [lastFocusedChild, setLastFocusedChild] = useState<{
    caseId: string;
    type: 'command' | 'subcase';
    itemId: string;
    index: number;
  } | null>(null);

  // Track running test cases to prevent race conditions
  const runningCasesRef = useRef<Set<string>>(new Set());
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // 参数存储系统 - 用于URC解析的参数（端口内作用域）
  const [storedParameters, setStoredParameters] = useState<{ [key: string]: { value: string; timestamp: number } }>({});
  
  // 跟踪已触发的永久URC ID，防止重复触发
  const [triggeredUrcIds, setTriggeredUrcIds] = useState<Set<string>>(new Set());

  return {
    // States
    testCases,
    setTestCases,
    selectedCase,
    setSelectedCase,
    selectedTestCaseId,
    setSelectedTestCaseId,
    editingCase,
    setEditingCase,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editingCommandIndex,
    setEditingCommandIndex,
    executionResults,
    setExecutionResults,
    waitingForUser,
    setWaitingForUser,
    userPrompt,
    setUserPrompt,
    contextMenu,
    setContextMenu,
    nextUniqueId,
    setNextUniqueId,
    currentWorkspace,
    setCurrentWorkspace,
    dragInfo,
    setDragInfo,
    inlineEdit,
    setInlineEdit,
    executingCommand,
    setExecutingCommand,
    runResult,
    setRunResult,
    showRunResult,
    setShowRunResult,
    lastFocusedChild,
    setLastFocusedChild,
    storedParameters,
    setStoredParameters,
    triggeredUrcIds,
    setTriggeredUrcIds,
    
    // Refs
    runningCasesRef,
    contextMenuRef
  };
};