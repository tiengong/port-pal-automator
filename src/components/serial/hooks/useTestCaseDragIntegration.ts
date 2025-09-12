/**
 * 测试用例拖拽集成Hook
 * 集成拖拽状态管理和拖拽逻辑处理
 */

import { useTestCaseDrag } from './useTestCaseDrag';
import { useTestCaseDragDrop } from './useTestCaseDragDrop';
import { TestCase } from '../types';

export const useTestCaseDragIntegration = ({
  testCases,
  setTestCases
}: {
  testCases: TestCase[];
  setTestCases: (cases: TestCase[]) => void;
}) => {
  // 拖拽状态管理
  const dragState = useTestCaseDrag();
  
  // 拖拽逻辑处理
  const dragDropLogic = useTestCaseDragDrop({
    testCases,
    setTestCases,
    setDragInfo: dragState.setDragInfo,
    dragInfo: dragState.dragInfo
  });

  return {
    // 拖拽状态
    dragInfo: dragState.dragInfo,
    
    // 拖拽处理函数
    handleDragStart: dragDropLogic.handleDragStart,
    handleDragOver: dragDropLogic.handleDragOver,
    handleDragLeave: dragDropLogic.handleDragLeave,
    handleDrop: dragDropLogic.handleDrop,
    
    // 拖拽状态管理函数
    setDragInfo: dragState.setDragInfo,
    startDrag: dragState.startDrag,
    endDrag: dragState.endDrag,
    setDropTarget: dragState.setDropTarget,
    clearDropTarget: dragState.clearDropTarget
  };
};