import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ExecutionEditor } from '../editors/ExecutionEditor';
import { UrcEditor } from '../editors/UrcEditor';
import { RunResultDialog } from '../RunResultDialog';
import { TestCase } from '../types';
import { useToast } from '@/hooks/use-toast';

interface DialogsContainerProps {
  // Edit command dialog
  editingCommandIndex: number | null;
  setEditingCommandIndex: (index: number | null) => void;
  currentTestCase: TestCase | null;
  testCases: TestCase[];
  setTestCases: (cases: TestCase[]) => void;
  
  // Run result dialog
  showRunResult: boolean;
  runResult: any;
  onCloseRunResult: () => void;
  
  // User action dialog
  userActionDialog: {
    isOpen: boolean;
    promptText: string;
    onConfirm: () => void;
    onCancel: () => void;
  };
  
  // Failure prompt dialog
  failurePromptDialog: {
    isOpen: boolean;
    promptText: string;
    onContinue: () => void;
    onStop: () => void;
  };
  
  // Utility functions
  updateCaseById: (cases: TestCase[], id: string, updater: (testCase: TestCase) => TestCase) => TestCase[];
  getTopLevelParent: (id: string, cases: TestCase[]) => TestCase | null;
  scheduleAutoSave: (testCase: TestCase) => void;
  buildCommandOptionsFromCase: (testCase: TestCase) => Array<any>;
}

export const DialogsContainer: React.FC<DialogsContainerProps> = ({
  editingCommandIndex,
  setEditingCommandIndex,
  currentTestCase,
  testCases,
  setTestCases,
  showRunResult,
  runResult,
  onCloseRunResult,
  userActionDialog,
  failurePromptDialog,
  updateCaseById,
  getTopLevelParent,
  scheduleAutoSave,
  buildCommandOptionsFromCase
}) => {
  const { toast } = useToast();

  const handleCommandUpdate = (updates: any) => {
    if (!currentTestCase || editingCommandIndex === null) return;
    
    const updatedCommands = [...currentTestCase.commands];
    updatedCommands[editingCommandIndex] = {
      ...updatedCommands[editingCommandIndex],
      ...updates
    };
    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
      ...testCase,
      commands: updatedCommands
    }));
    setTestCases(updatedTestCases);
    
    // 自动保存更新后的用例
    const topLevelCase = getTopLevelParent(currentTestCase.id, updatedTestCases);
    if (topLevelCase) {
      scheduleAutoSave(topLevelCase);
    }
  };

  return (
    <>
      {/* 命令编辑对话框 */}
      <Dialog open={editingCommandIndex !== null} onOpenChange={(open) => {
        if (!open) setEditingCommandIndex(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>编辑命令</DialogTitle>
            <DialogDescription>
              配置详细属性，包括执行参数、验证规则、错误处理等
            </DialogDescription>
          </DialogHeader>
          
          {editingCommandIndex !== null && currentTestCase && (
            <div className="space-y-4">
              {currentTestCase.commands[editingCommandIndex].type === 'execution' && (
                <ExecutionEditor
                  command={currentTestCase.commands[editingCommandIndex]}
                  onUpdate={handleCommandUpdate}
                />
              )}
              {currentTestCase.commands[editingCommandIndex].type === 'urc' && (
                <UrcEditor
                  command={currentTestCase.commands[editingCommandIndex]}
                  onUpdate={handleCommandUpdate}
                  jumpOptions={{
                    commandOptions: buildCommandOptionsFromCase(currentTestCase)
                  }}
                />
              )}
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingCommandIndex(null)}>
                  取消
                </Button>
                <Button onClick={() => {
                  setEditingCommandIndex(null);
                  toast({
                    title: "保存成功",
                    description: "命令配置已更新",
                  });
                }}>
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
        onClose={onCloseRunResult}
        result={runResult}
      />

      {/* 用户操作确认对话框 */}
      <AlertDialog open={userActionDialog.isOpen}>
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
      <AlertDialog open={failurePromptDialog.isOpen}>
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