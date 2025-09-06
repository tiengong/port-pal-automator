import { useState } from 'react';
import { TestCase } from '../types';

export interface DialogState {
  isOpen: boolean;
  promptText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface FailurePromptDialogState {
  isOpen: boolean;
  promptText: string;
  onContinue: () => void;
  onStop: () => void;
}

export const useTestCaseDialogs = () => {
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null);
  const [showRunResult, setShowRunResult] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  
  const [userActionDialog, setUserActionDialog] = useState<DialogState>({
    isOpen: false,
    promptText: '',
    onConfirm: () => {},
    onCancel: () => {}
  });
  
  const [failurePromptDialog, setFailurePromptDialog] = useState<FailurePromptDialogState>({
    isOpen: false,
    promptText: '',
    onContinue: () => {},
    onStop: () => {}
  });

  const openUserActionDialog = (promptText: string, onConfirm: () => void, onCancel: () => void) => {
    setUserActionDialog({
      isOpen: true,
      promptText,
      onConfirm,
      onCancel
    });
  };

  const closeUserActionDialog = () => {
    setUserActionDialog(prev => ({ ...prev, isOpen: false }));
  };

  const openFailurePromptDialog = (promptText: string, onContinue: () => void, onStop: () => void) => {
    setFailurePromptDialog({
      isOpen: true,
      promptText,
      onContinue,
      onStop
    });
  };

  const closeFailurePromptDialog = () => {
    setFailurePromptDialog(prev => ({ ...prev, isOpen: false }));
  };

  const openRunResultDialog = (result: any) => {
    setRunResult(result);
    setShowRunResult(true);
  };

  const closeRunResultDialog = () => {
    setShowRunResult(false);
    setRunResult(null);
  };

  return {
    // Edit dialog
    editingCase,
    setEditingCase,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editingCommandIndex,
    setEditingCommandIndex,
    
    // Run result dialog
    showRunResult,
    runResult,
    openRunResultDialog,
    closeRunResultDialog,
    
    // User action dialog
    userActionDialog,
    openUserActionDialog,
    closeUserActionDialog,
    
    // Failure prompt dialog  
    failurePromptDialog,
    openFailurePromptDialog,
    closeFailurePromptDialog
  };
};