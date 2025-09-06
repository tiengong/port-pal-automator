import { useState, useEffect, useRef } from 'react';
import { TestCase, ContextMenuState } from '../types';
import { initializeDefaultWorkspace, loadCases, getLastOpenedTestCase, setLastOpenedTestCase } from '../workspace';

export const useTestCaseState = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null);
  const [executionResults, setExecutionResults] = useState<any[]>([]);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: '',
    targetType: 'case'
  });
  const [nextUniqueId, setNextUniqueId] = useState(1);
  const [currentWorkspace, setCurrentWorkspace] = useState<string>('');
  const [dragInfo, setDragInfo] = useState<any>(null);
  const [inlineEdit, setInlineEdit] = useState<{ commandId: string | null; value: string }>({
    commandId: null,
    value: ''
  });
  const [executingCommand, setExecutingCommand] = useState<string | null>(null);
  const [lastFocusedChild, setLastFocusedChild] = useState<any>(null);
  const [storedParameters, setStoredParameters] = useState<Record<string, string>>({});
  const [triggeredUrcIds, setTriggeredUrcIds] = useState<Set<string>>(new Set());
  
  const runningCasesRef = useRef<Set<string>>(new Set());
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Initialize workspace on mount
  useEffect(() => {
    const initWorkspace = async () => {
      try {
        await initializeDefaultWorkspace();
        const testCases = await loadCases();
        setCurrentWorkspace('Default');
        setTestCases(Array.isArray(testCases) ? testCases : []);
        
        // Select last opened test case
        const lastOpened = await getLastOpenedTestCase();
        const cases = Array.isArray(testCases) ? testCases : [];
        if (lastOpened && cases.some(c => c.id === lastOpened)) {
          setSelectedTestCaseId(lastOpened);
        } else if (cases.length > 0) {
          setSelectedTestCaseId(cases[0].id);
        }
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
      }
    };
    
    initWorkspace();
  }, []);

  // Handle workspace changes
  const handleWorkspaceChange = async () => {
    try {
      const testCases = await loadCases();
      setCurrentWorkspace('Default');
      setTestCases(Array.isArray(testCases) ? testCases : []);
      
      // Select last opened test case or first available
      const lastOpened = await getLastOpenedTestCase();
      const cases = Array.isArray(testCases) ? testCases : [];
      if (lastOpened && cases.some(c => c.id === lastOpened)) {
        setSelectedTestCaseId(lastOpened);
      } else if (cases.length > 0) {
        setSelectedTestCaseId(cases[0].id);
      }
    } catch (error) {
      console.error('Failed to load workspace:', error);
    }
  };

  // Track selected test case changes
  useEffect(() => {
    if (selectedTestCaseId) {
      setLastOpenedTestCase(selectedTestCaseId);
    }
  }, [selectedTestCaseId]);

  // Generate unique ID
  const generateUniqueId = () => {
    const id = `tc_${nextUniqueId}`;
    setNextUniqueId(prev => prev + 1);
    return id;
  };

  return {
    testCases,
    setTestCases,
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
    lastFocusedChild,
    setLastFocusedChild,
    storedParameters,
    setStoredParameters,
    triggeredUrcIds,
    setTriggeredUrcIds,
    runningCasesRef,
    contextMenuRef,
    handleWorkspaceChange,
    generateUniqueId
  };
};