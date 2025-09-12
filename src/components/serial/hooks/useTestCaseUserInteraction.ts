/**
 * 测试用例用户交互状态管理Hook
 * 管理用户动作、对话框、等待状态等交互相关状态
 */

import { useState, useCallback } from 'react';

export interface TestCaseUserInteractionState {
  // 用户交互状态
  waitingForUser: boolean;
  userPrompt: string;
  userActionDialog: {
    open: boolean;
    title: string;
    content: string;
    onConfirm: () => void;
    onCancel: () => void;
  };
  
  // 失败处理状态
  failurePromptDialog: {
    open: boolean;
    title: string;
    message: string;
    severity: 'warning' | 'error';
    onContinue: () => void;
    onStop: () => void;
    onRetry: () => void;
  };
}

export interface TestCaseUserInteractionActions {
  // 设置函数
  setWaitingForUser: (waiting: boolean) => void;
  setUserPrompt: (prompt: string) => void;
  setUserActionDialog: (dialog: TestCaseUserInteractionState['userActionDialog']) => void;
  setFailurePromptDialog: (dialog: TestCaseUserInteractionState['failurePromptDialog']) => void;
  // 工具函数
  showUserActionDialog: (
    title: string,
    content: string,
    onConfirm: () => void,
    onCancel: () => void
  ) => void;
  hideUserActionDialog: () => void;
  showFailurePromptDialog: (
    title: string,
    message: string,
    severity: 'warning' | 'error',
    onContinue: () => void,
    onStop: () => void,
    onRetry: () => void
  ) => void;
  hideFailurePromptDialog: () => void;
  resetUserInteraction: () => void;
}

export const useTestCaseUserInteraction = (): TestCaseUserInteractionState & TestCaseUserInteractionActions => {
  // 用户交互状态
  const [waitingForUser, setWaitingForUser] = useState<boolean>(false);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [userActionDialog, setUserActionDialog] = useState<TestCaseUserInteractionState['userActionDialog']>({
    open: false,
    title: '',
    content: '',
    onConfirm: () => {},
    onCancel: () => {}
  });
  
  // 失败处理状态
  const [failurePromptDialog, setFailurePromptDialog] = useState<TestCaseUserInteractionState['failurePromptDialog']>({
    open: false,
    title: '',
    message: '',
    severity: 'error',
    onContinue: () => {},
    onStop: () => {},
    onRetry: () => {}
  });

  // 工具函数
  const showUserActionDialog = useCallback((
    title: string,
    content: string,
    onConfirm: () => void,
    onCancel: () => void
  ) => {
    setUserActionDialog({
      open: true,
      title,
      content,
      onConfirm,
      onCancel
    });
  }, []);

  const hideUserActionDialog = useCallback(() => {
    setUserActionDialog(prev => ({ ...prev, open: false }));
  }, []);

  const showFailurePromptDialog = useCallback((
    title: string,
    message: string,
    severity: 'warning' | 'error',
    onContinue: () => void,
    onStop: () => void,
    onRetry: () => void
  ) => {
    setFailurePromptDialog({
      open: true,
      title,
      message,
      severity,
      onContinue,
      onStop,
      onRetry
    });
  }, []);

  const hideFailurePromptDialog = useCallback(() => {
    setFailurePromptDialog(prev => ({ ...prev, open: false }));
  }, []);

  const resetUserInteraction = useCallback(() => {
    setWaitingForUser(false);
    setUserPrompt('');
    hideUserActionDialog();
    hideFailurePromptDialog();
  }, [hideUserActionDialog, hideFailurePromptDialog]);

  return {
    // 状态
    waitingForUser,
    userPrompt,
    userActionDialog,
    failurePromptDialog,
    
    // 设置函数
    setWaitingForUser,
    setUserPrompt,
    setUserActionDialog,
    setFailurePromptDialog,
    
    // 工具函数
    showUserActionDialog,
    hideUserActionDialog,
    showFailurePromptDialog,
    hideFailurePromptDialog,
    resetUserInteraction
  };
};