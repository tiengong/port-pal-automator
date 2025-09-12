/**
 * 测试用例其他状态管理Hook
 * 管理剩余的状态：存储参数、唯一ID、上下文菜单、焦点状态
 */

import { useState, useCallback } from 'react';
import { ContextMenuState } from '../types';

export interface TestCaseMiscState {
  // 存储参数状态
  storedParameters: { [key: string]: { value: string; timestamp: number } };
  nextUniqueId: number;
  
  // 上下文菜单状态
  contextMenu: ContextMenuState;
  
  // 焦点状态
  lastFocusedChild: {
    caseId: string;
    type: 'command' | 'subcase';
    itemId: string;
    index: number;
  } | null;
}

export interface TestCaseMiscActions {
  // 设置函数
  setStoredParameters: (params: { [key: string]: { value: string; timestamp: number } }) => void;
  setNextUniqueId: (id: number) => void;
  setContextMenu: (menu: ContextMenuState) => void;
  setLastFocusedChild: (child: TestCaseMiscState['lastFocusedChild']) => void;
  // 工具函数
  generateUniqueId: () => string;
  updateStoredParameters: (params: { [key: string]: { value: string; timestamp: number } }) => void;
  showContextMenu: (
    x: number,
    y: number,
    targetId: string,
    targetType: 'case' | 'command'
  ) => void;
  hideContextMenu: () => void;
}

export const useTestCaseMisc = (): TestCaseMiscState & TestCaseMiscActions => {
  // 存储参数状态
  const [storedParameters, setStoredParameters] = useState<{ [key: string]: { value: string; timestamp: number } }>({});
  const [nextUniqueId, setNextUniqueId] = useState<number>(1001);
  
  // 上下文菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: '',
    targetType: 'case'
  });
  
  // 焦点状态
  const [lastFocusedChild, setLastFocusedChild] = useState<TestCaseMiscState['lastFocusedChild']>(null);

  // 工具函数
  const generateUniqueId = useCallback(() => {
    const id = nextUniqueId.toString();
    setNextUniqueId(prev => prev + 1);
    return id;
  }, [nextUniqueId]);

  const updateStoredParameters = useCallback((params: { [key: string]: { value: string; timestamp: number } }) => {
    setStoredParameters(prev => ({ ...prev, ...params }));
  }, []);

  const showContextMenu = useCallback((
    x: number,
    y: number,
    targetId: string,
    targetType: 'case' | 'command'
  ) => {
    setContextMenu({
      visible: true,
      x,
      y,
      targetId,
      targetType
    });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    // 状态
    storedParameters,
    nextUniqueId,
    contextMenu,
    lastFocusedChild,
    
    // 设置函数
    setStoredParameters,
    setNextUniqueId,
    setContextMenu,
    setLastFocusedChild,
    
    // 工具函数
    generateUniqueId,
    updateStoredParameters,
    showContextMenu,
    hideContextMenu
  };
};