import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Play, Settings, TestTube2, Search, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

// Import modular components and hooks
import { useTestCaseState } from './hooks/useTestCaseState';
import { useTestCaseActions } from './hooks/useTestCaseActions';
import { useTestCaseDialogs } from './hooks/useTestCaseDialogs';
import { useTestCaseImportExport } from './hooks/useTestCaseImportExport';
import { useCommandOperations } from './hooks/useCommandOperations';
import { TestCaseList } from './components/TestCaseList';
import { DialogsContainer } from './components/DialogsContainer';
import { TestCaseHeader } from './TestCaseHeader';
import { TestCaseActions } from './TestCaseActions';
import { TestCaseSwitcher } from './TestCaseSwitcher';
import { VariableDisplay } from '../VariableDisplay';

// Import utility functions
import { findTestCaseById, getTopLevelParent, updateCaseById } from './testCaseRecursiveUtils';
import { buildCommandOptionsFromCase } from './testCaseNavigationUtils';
import { scheduleAutoSave } from './workspace';

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

export const TestCaseManagerRefactored: React.FC<TestCaseManagerProps> = ({
  connectedPorts,
  receivedData,
  statusMessages
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Use modular state management
  const testCaseState = useTestCaseState();
  
  // Use modular actions
  const testCaseActions = useTestCaseActions({
    testCases: testCaseState.testCases,
    setTestCases: testCaseState.setTestCases,
    generateUniqueId: testCaseState.generateUniqueId,
    setInlineEdit: testCaseState.setInlineEdit,
    inlineEdit: testCaseState.inlineEdit
  });
  
  // Use modular dialogs
  const dialogs = useTestCaseDialogs();
  
  // Use import/export functionality
  const importExport = useTestCaseImportExport({
    testCases: testCaseState.testCases,
    setTestCases: testCaseState.setTestCases,
    currentTestCase: testCaseActions.getCurrentTestCase(testCaseState.selectedTestCaseId || ''),
    generateUniqueId: testCaseState.generateUniqueId
  });
  
  // Use command operations
  const commandOps = useCommandOperations({
    testCases: testCaseState.testCases,
    setTestCases: testCaseState.setTestCases,
    generateUniqueId: testCaseState.generateUniqueId
  });

  // Get current test case
  const currentTestCase = testCaseActions.getCurrentTestCase(testCaseState.selectedTestCaseId || '');
  const visibleRootCase = testCaseActions.getVisibleRootCase(testCaseState.selectedTestCaseId || '');

  // Event handlers
  const handleRunTestCase = (caseId: string) => {
    // TODO: Implement test case execution
    console.log('Running test case:', caseId);
  };

  const handleEditCase = (testCase: any) => {
    dialogs.setEditingCase(testCase);
    dialogs.setIsEditDialogOpen(true);
  };

  const handleEditCommand = (caseId: string, commandIndex: number) => {
    dialogs.setEditingCommandIndex(commandIndex);
  };

  const handleDeleteCommand = (caseId: string, commandIndex: number) => {
    commandOps.deleteCommand(caseId, commandIndex);
  };

  const handleDuplicateCommand = (caseId: string, commandIndex: number) => {
    commandOps.duplicateCommand(caseId, commandIndex);
  };

  const handleAddCommand = (type: 'execution' | 'urc' = 'execution') => {
    if (currentTestCase) {
      commandOps.addNewCommand(currentTestCase.id, type);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 space-y-4 p-4 border-b">
        <TestCaseHeader 
          connectedPorts={connectedPorts}
          currentWorkspace={testCaseState.currentWorkspace}
          onWorkspaceChange={testCaseState.handleWorkspaceChange}
        />
        
        <TestCaseSwitcher
          testCases={testCaseState.testCases}
          selectedTestCaseId={testCaseState.selectedTestCaseId}
          onSelectTestCase={testCaseState.setSelectedTestCaseId}
        />
        
        <TestCaseActions
          currentTestCase={currentTestCase}
          connectedPorts={connectedPorts}
          onCreateTestCase={() => {}}
          onImportTestCase={() => {}}
          onExportTestCase={() => {}}
          onDeleteTestCase={() => {}}
          onRunAllTestCases={() => {}}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Test Cases List */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Test Cases</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAddCommand('execution')}
                disabled={!currentTestCase}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Command
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddCommand('urc')}
                disabled={!currentTestCase}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add URC
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {visibleRootCase && (
              <TestCaseList
                testCases={[visibleRootCase]}
                selectedTestCaseId={testCaseState.selectedTestCaseId}
                connectedPorts={connectedPorts}
                setTestCases={testCaseState.setTestCases}
                setSelectedTestCaseId={testCaseState.setSelectedTestCaseId}
                onRunTestCase={handleRunTestCase}
                onEditCase={handleEditCase}
                onEditCommand={handleEditCommand}
                onDeleteCommand={handleDeleteCommand}
                onDuplicateCommand={handleDuplicateCommand}
                contextMenu={testCaseState.contextMenu}
                setContextMenu={testCaseState.setContextMenu}
                dragInfo={testCaseState.dragInfo}
                setDragInfo={testCaseState.setDragInfo}
                inlineEdit={testCaseState.inlineEdit}
                setInlineEdit={testCaseState.setInlineEdit}
                executingCommand={testCaseState.executingCommand}
              />
            )}
          </div>
        </div>

        {/* Variables Panel */}
        <div className="w-80 flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <VariableDisplay
                storedParameters={testCaseState.storedParameters}
                onParameterUpdate={(key, value) => {
                  testCaseState.setStoredParameters(prev => ({
                    ...prev,
                    [key]: value
                  }));
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <DialogsContainer
        editingCommandIndex={dialogs.editingCommandIndex}
        setEditingCommandIndex={dialogs.setEditingCommandIndex}
        currentTestCase={currentTestCase}
        testCases={testCaseState.testCases}
        setTestCases={testCaseState.setTestCases}
        showRunResult={dialogs.showRunResult}
        runResult={dialogs.runResult}
        onCloseRunResult={dialogs.closeRunResultDialog}
        userActionDialog={dialogs.userActionDialog}
        failurePromptDialog={dialogs.failurePromptDialog}
        updateCaseById={updateCaseById}
        getTopLevelParent={getTopLevelParent}
        scheduleAutoSave={scheduleAutoSave}
        buildCommandOptionsFromCase={buildCommandOptionsFromCase}
      />
    </div>
  );
};