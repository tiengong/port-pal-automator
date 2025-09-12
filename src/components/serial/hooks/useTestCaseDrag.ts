/**
 * 测试用例拖拽状态管理Hook
 * 管理拖拽操作相关状态
 */

import { useState, useCallback } from 'react';

export interface TestCaseDragState {
  // 拖拽状态
  dragInfo: {
    isDragging: boolean;
    dragType: 'case' | 'command' | 'subcase' | null;
    dragItemId: string;
    dragSourceCaseId: string;
    dropTarget?: {
      caseId: string;
      itemId: string;
      itemType: 'command' | 'subcase';
      position: 'above' | 'below';
    };
  };
}

export interface TestCaseDragActions {
  // 设置函数
  setDragInfo: (info: TestCaseDragState['dragInfo']) => void;
  // 工具函数
  startDrag: (
    dragType: 'case' | 'command' | 'subcase',
    dragItemId: string,
    dragSourceCaseId: string
  ) => void;
  endDrag: () => void;
  setDropTarget: (
    caseId: string,
    itemId: string,
    itemType: 'command' | 'subcase',
    position: 'above' | 'below'
  ) => void;
  clearDropTarget: () => void;
}

export const useTestCaseDrag = (): TestCaseDragState & TestCaseDragActions => {
  // 拖拽状态
  const [dragInfo, setDragInfo] = useState<TestCaseDragState['dragInfo']>({
    isDragging: false,
    dragType: null,
    dragItemId: '',
    dragSourceCaseId: '',
    dropTarget: undefined
  });

  // 工具函数
  const startDrag = useCallback((
    dragType: 'case' | 'command' | 'subcase',
    dragItemId: string,
    dragSourceCaseId: string
  ) => {
    setDragInfo(prev => ({
      ...prev,
      isDragging: true,
      dragType,
      dragItemId,
      dragSourceCaseId
    }));
  }, []);

  const endDrag = useCallback(() => {
    setDragInfo(prev => ({
      ...prev,
      isDragging: false,
      dragType: null,
      dragItemId: '',
      dragSourceCaseId: '',
      dropTarget: undefined
    }));
  }, []);

  const setDropTarget = useCallback((
    caseId: string,
    itemId: string,
    itemType: 'command' | 'subcase',
    position: 'above' | 'below'
  ) => {
    setDragInfo(prev => ({
      ...prev,
      dropTarget: {
        caseId,
        itemId,
        itemType,
        position
      }
    }));
  }, []);

  const clearDropTarget = useCallback(() => {
    setDragInfo(prev => ({
      ...prev,
      dropTarget: undefined
    }));
  }, []);

  return {
    // 状态
    dragInfo,
    
    // 设置函数
    setDragInfo,
    
    // 工具函数
    startDrag,
    endDrag,
    setDropTarget,
    clearDropTarget
  };
};