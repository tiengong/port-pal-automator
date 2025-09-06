// TestCaseDialogs.tsx - Extract dialog components from TestCaseManager
import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ExecutionEditor } from '../editors/ExecutionEditor';
import { UrcEditor } from '../editors/UrcEditor';
import { RunResultDialog, TestRunResult } from '../RunResultDialog';
import { TestCase, TestCommand } from '../types';
import { buildCommandOptionsFromCase } from '../testCaseNavigationUtils';

interface TestCaseDialogsProps {
  // Command edit dialog
  editingCommandIndex: number | null;
  setEditingCommandIndex: (index: number | null) => void;
  currentTestCase: TestCase | null;
  onCommandUpdate: (caseId: string, commandIndex: number, updates: Partial<TestCommand>) => void;
  onCaseUpdate: (caseId: string, updates: Partial<TestCase>) => void;
  
  // Run result dialog
  showRunResult: boolean;
  setShowRunResult: (show: boolean) => void;
  runResult: TestRunResult | null;
  
  // User action dialog
  userActionDialog: {
    isOpen: boolean;
    commandText: string;
    promptText: string;
    onConfirm: () => void;
    onCancel: () => void;
  };
  setUserActionDialog: (dialog: any) => void;
  
  // Failure prompt dialog
  failurePromptDialog: {
    isOpen: boolean;
    promptText: string;
    onContinue: () => void;
    onStop: () => void;
  };
  setFailurePromptDialog: (dialog: any) => void;
}

export const TestCaseDialogs: React.FC<TestCaseDialogsProps> = ({
  editingCommandIndex,
  setEditingCommandIndex,
  currentTestCase,
  onCommandUpdate,
  onCaseUpdate,
  showRunResult,
  setShowRunResult,
  runResult,
  userActionDialog,
  setUserActionDialog,
  failurePromptDialog,
  setFailurePromptDialog
}) => {
  const handleSaveCommand = () => {
    setEditingCommandIndex(null);
    // Add any additional save logic here if needed
  };

  return (
    <>
      {/* 命令编辑对话框 */}
      <Dialog 
        open={editingCommandIndex !== null} 
        onOpenChange={(open) => !open && setEditingCommandIndex(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑命令</DialogTitle>
          </DialogHeader>
          {editingCommandIndex !== null && currentTestCase && (
            <div className="space-y-4">
              {currentTestCase.commands[editingCommandIndex]?.type === 'execution' ? (
                <ExecutionEditor
                  command={currentTestCase.commands[editingCommandIndex]}
                  onUpdate={(updates) => {
                    onCommandUpdate(currentTestCase.id, editingCommandIndex, updates);
                  }}
                />
              ) : (
                <UrcEditor
                  command={currentTestCase.commands[editingCommandIndex]}
                  onUpdate={(updates) => {
                    onCommandUpdate(currentTestCase.id, editingCommandIndex, updates);
                    // Auto-save logic can be handled by parent
                  }}
                  jumpOptions={{
                    commandOptions: buildCommandOptionsFromCase(currentTestCase)
                  }}
                />
              )}
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingCommandIndex(null)}>
                  取消
                </Button>
                <Button onClick={handleSaveCommand}>
                  保存
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 执行结果对话框 */}
      <RunResultDialog
        isOpen={showRunResult}
        onClose={() => setShowRunResult(false)}
        result={runResult}
      />

      {/* 用户操作确认对话框 */}
      <AlertDialog 
        open={userActionDialog.isOpen} 
        onOpenChange={(open) => setUserActionDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>操作前确认</AlertDialogTitle>
            <AlertDialogDescription>
              {userActionDialog.promptText}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel onClick={userActionDialog.onCancel}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={userActionDialog.onConfirm}>
              开始执行
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* 失败处理提示对话框 */}
      <AlertDialog 
        open={failurePromptDialog.isOpen} 
        onOpenChange={(open) => setFailurePromptDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>执行失败处理</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap">
              {failurePromptDialog.promptText}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel onClick={failurePromptDialog.onStop}>
              停止执行
            </AlertDialogCancel>
            <AlertDialogAction onClick={failurePromptDialog.onContinue}>
              继续执行
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};