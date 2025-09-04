import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TestCaseHeader } from './TestCaseHeader';
import { TestCaseActions } from './TestCaseActions';
import { TestCaseSwitcher } from './TestCaseSwitcher';
import { CaseTree } from './CaseTree';
import { ExecutionEditor } from './editors/ExecutionEditor';
import { UrcEditor } from './editors/UrcEditor';
import { VariableDisplay } from '../VariableDisplay';
import { RunResultDialog } from './RunResultDialog';
import { TestCaseExecutor } from './components/TestCaseExecutor';
import { useTestCaseState } from './hooks/useTestCaseState';
import { useTestCaseOperations } from './hooks/useTestCaseOperations';
import { initializeDefaultWorkspace, loadCases, getCurrentWorkspace, getLastOpenedTestCase, setLastOpenedTestCase } from './workspace';
import { globalToast } from "@/hooks/useGlobalMessages";
import { eventBus, EVENTS, SerialDataEvent } from '@/lib/eventBus';
import { parseUrcData } from './utils/urcUtils';
import { findTestCaseById } from './utils/testCaseUtils';

interface TestCaseManagerProps {
  connectedPorts: Array<{
    port: any;
    params: any;
  }>;
  receivedData: string[];
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}

export const TestCaseManager: React.FC<TestCaseManagerProps> = ({
  connectedPorts,
  receivedData,
  statusMessages
}) => {
  const { t } = useTranslation();
  
  // Use custom hooks for state management
  const {
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
    runningCasesRef,
    contextMenuRef
  } = useTestCaseState();

  // Use custom hook for operations
  const {
    updateCommandSelection,
    saveInlineEdit,
    handleUnifiedReorder
  } = useTestCaseOperations(testCases, setTestCases, inlineEdit, setInlineEdit);

  // AT命令库
  const atCommands = [
    'AT', 'AT+CGMR', 'AT+CGMI', 'AT+CGSN', 'AT+CSQ', 'AT+CREG', 'AT+COPS',
    'AT+CGATT', 'AT+CGACT', 'AT+CGDCONT', 'AT+CPINR', 'AT+CPIN', 'AT+CCID'
  ];

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
        globalToast({
          title: t("testCase.initFailed"),
          description: t("testCase.initFailedDesc"),
          variant: "destructive"
        });
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

  // Handle serial data for URC processing
  useEffect(() => {
    const handleSerialData = (event: SerialDataEvent) => {
      // Process URC patterns and extract parameters
      testCases.forEach(testCase => {
        testCase.commands.forEach(command => {
          if (command.type === 'urc' && command.selected) {
            const extractedParams = parseUrcData(event.data, command);
            if (Object.keys(extractedParams).length > 0) {
              setStoredParameters(prev => ({ ...prev, ...extractedParams }));
              
              // Emit parameter extraction event
              eventBus.emit(EVENTS.PARAMETER_EXTRACTED, {
                commandId: command.id,
                parameters: extractedParams,
                sourceData: event.data
              });
            }
          }
        });
      });
    };

    const unsubscribe = eventBus.subscribe(EVENTS.SERIAL_DATA_RECEIVED, handleSerialData);
    return unsubscribe;
  }, [testCases, setStoredParameters]);

  // Get selected case for editing
  useEffect(() => {
    if (selectedTestCaseId) {
      const case_ = findTestCaseById(selectedTestCaseId, testCases);
      setSelectedCase(case_);
    }
  }, [selectedTestCaseId, testCases]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <TestCaseHeader
        currentWorkspace={currentWorkspace}
        onWorkspaceChange={handleWorkspaceChange}
      />

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-[300px_1fr] gap-4 p-4 overflow-hidden">
        {/* Left Panel - Test Case Tree and Actions */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <TestCaseActions
            testCases={testCases}
            setTestCases={setTestCases}
            selectedTestCaseId={selectedTestCaseId}
            nextUniqueId={nextUniqueId}
            setNextUniqueId={setNextUniqueId}
            runningCasesRef={runningCasesRef}
          />
          
          <TestCaseSwitcher
            testCases={testCases}
            selectedTestCaseId={selectedTestCaseId}
            setSelectedTestCaseId={setSelectedTestCaseId}
          />
          
          <div className="flex-1">
            <CaseTree
              testCases={testCases}
              setTestCases={setTestCases}
              selectedTestCaseId={selectedTestCaseId}
              setSelectedTestCaseId={setSelectedTestCaseId}
              executingCommand={executingCommand}
              dragInfo={dragInfo}
              setDragInfo={setDragInfo}
              onUnifiedReorder={handleUnifiedReorder}
              updateCommandSelection={updateCommandSelection}
              saveInlineEdit={saveInlineEdit}
              inlineEdit={inlineEdit}
              setInlineEdit={setInlineEdit}
              lastFocusedChild={lastFocusedChild}
              setLastFocusedChild={setLastFocusedChild}
              contextMenu={contextMenu}
              setContextMenu={setContextMenu}
              contextMenuRef={contextMenuRef}
              atCommands={atCommands}
            />
          </div>
        </div>

        {/* Right Panel - Editors and Variables */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {selectedCase && (
            <>
              <ExecutionEditor
                testCase={selectedCase}
                testCases={testCases}
                setTestCases={setTestCases}
                editingCommandIndex={editingCommandIndex}
                setEditingCommandIndex={setEditingCommandIndex}
                atCommands={atCommands}
              />
              
              <UrcEditor
                testCase={selectedCase}
                testCases={testCases}
                setTestCases={setTestCases}
                editingCommandIndex={editingCommandIndex}
                setEditingCommandIndex={setEditingCommandIndex}
              />
            </>
          )}
          
          <VariableDisplay
            variables={storedParameters}
            onClearVariable={(varName) => {
              setStoredParameters(prev => {
                const newParams = { ...prev };
                delete newParams[varName];
                return newParams;
              });
            }}
            onClearAll={() => setStoredParameters({})}
          />
        </div>
      </div>

      {/* Dialogs */}
      <RunResultDialog
        result={runResult}
        isOpen={showRunResult}
        onClose={() => setShowRunResult(false)}
      />

      {/* Headless Components */}
      <TestCaseExecutor
        testCases={testCases}
        setTestCases={setTestCases}
        executionResults={executionResults}
        setExecutionResults={setExecutionResults}
        executingCommand={executingCommand}
        setExecutingCommand={setExecutingCommand}
        storedParameters={storedParameters}
        setStoredParameters={setStoredParameters}
        runningCasesRef={runningCasesRef}
        onRunComplete={(result) => {
          setRunResult(result);
          setShowRunResult(true);
        }}
      />
    </div>
  );
};