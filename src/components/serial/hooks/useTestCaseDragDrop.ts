/**
 * 测试用例拖拽逻辑Hook
 * 处理测试用例的拖拽、排序、重新组织等
 */

import { useCallback } from 'react';
import { TestCase, TestCommand } from '../types';
import { updateCaseById } from '../testCaseRecursiveUtils';
import { generateChildrenOrder, getSortedChildren, moveItem } from '../testCaseUtils';

export interface DragDropOptions {
  testCases: TestCase[];
  setTestCases: (cases: TestCase[]) => void;
  setDragInfo: (info: any) => void;
}

export const useTestCaseDragDrop = ({
  testCases,
  setTestCases,
  setDragInfo
}: DragDropOptions) => {
  /**
   * 处理拖拽开始
   */
  const handleDragStart = useCallback((
    e: React.DragEvent<HTMLDivElement>,
    caseId: string,
    type: 'case' | 'command' | 'subcase',
    itemId: string,
    index: number
  ) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type,
      itemId,
      sourceCaseId: caseId,
      index
    }));

    setDragInfo({
      isDragging: true,
      dragType: type,
      dragItemId: itemId,
      dragSourceCaseId: caseId,
      dropTarget: undefined
    });
  }, [setDragInfo]);

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = useCallback((
    e: React.DragEvent<HTMLDivElement>,
    caseId: string,
    index: number,
    position: 'above' | 'below'
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    setDragInfo((prev: any) => ({
      ...prev,
      dropTarget: {
        caseId,
        itemId: '', // 将在具体组件中设置
        itemType: 'command', // 将在具体组件中设置
        position
      }
    }));
  }, [setDragInfo]);

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    setDragInfo((prev: any) => ({
      ...prev,
      dropTarget: undefined
    }));
  }, [setDragInfo]);

  /**
   * 处理放置
   */
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { type, itemId, sourceCaseId } = dragData;
      
      // 清除拖拽状态
      setDragInfo({
        isDragging: false,
        dragType: null,
        dragItemId: '',
        dragSourceCaseId: '',
        dropTarget: undefined
      });

      // 执行实际的放置逻辑
      handleItemDrop(type, itemId, sourceCaseId);
    } catch (error) {
      console.error('拖拽数据解析失败:', error);
    }
  }, [setDragInfo]);

  /**
   * 处理项目放置
   */
  const handleItemDrop = useCallback((
    dragType: 'case' | 'command' | 'subcase',
    dragItemId: string,
    sourceCaseId: string
  ) => {
    // 获取当前拖拽信息
    const currentDragInfo = (setDragInfo as any).currentDragInfo;
    if (!currentDragInfo?.dropTarget) return;

    const { caseId: targetCaseId, position } = currentDragInfo.dropTarget;

    // 在同一用例内重新排序
    if (sourceCaseId === targetCaseId) {
      handleInternalReorder(sourceCaseId, dragItemId, position);
    } else {
      // 跨用例移动（复杂场景，暂时不支持）
      console.log('跨用例移动暂不支持');
    }
  }, []);

  /**
   * 处理内部重新排序
   */
  const handleInternalReorder = useCallback((
    caseId: string,
    itemId: string,
    position: 'above' | 'below'
  ) => {
    const testCase = testCases.find(tc => tc.id === caseId);
    if (!testCase) return;

    // 查找项目的当前位置
    const currentIndex = testCase.commands.findIndex(cmd => cmd.id === itemId);
    if (currentIndex === -1) return;

    // 计算目标位置
    let targetIndex = position === 'above' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0) targetIndex = 0;
    if (targetIndex >= testCase.commands.length) targetIndex = testCase.commands.length - 1;

    if (targetIndex === currentIndex) return;

    // 执行重新排序
    const reorderedCommands = [...testCase.commands];
    const [movedCommand] = reorderedCommands.splice(currentIndex, 1);
    reorderedCommands.splice(targetIndex, 0, movedCommand);

    // 更新用例
    const updatedTestCases = updateCaseById(testCases, caseId, (tc) => ({
      ...tc,
      commands: reorderedCommands
    }));

    setTestCases(updatedTestCases);
  }, [testCases, setTestCases]);

  /**
   * 统一重新排序（支持命令和子用例）
   */
  const handleUnifiedReorder = useCallback((
    testCase: TestCase,
    fromIndex: number,
    toIndex: number,
    position: 'above' | 'below'
  ) => {
    if (!testCase.childrenOrder || testCase.childrenOrder.length === 0) {
      // 如果没有自定义顺序，使用默认顺序
      return;
    }

    const { commands, subCases } = getSortedChildren(testCase);
    const allItems = [...commands, ...subCases];

    if (fromIndex === toIndex) return;

    // 计算目标位置
    let targetIndex = position === 'above' ? toIndex : toIndex + 1;
    if (fromIndex < targetIndex) {
      targetIndex--; // 调整因为移除元素导致的索引变化
    }

    // 重新排序
    const [movedItem] = allItems.splice(fromIndex, 1);
    allItems.splice(targetIndex, 0, movedItem);

    // 生成新的顺序
    const newOrder = allItems.map((item, index) => {
      const isCommand = commands.includes(item as TestCommand);
      return {
        type: isCommand ? 'command' as const : 'subcase' as const,
        id: item.id,
        index: isCommand ? (item as TestCommand).id === testCase.commands.find(c => c.id === item.id)?.id ? 
               testCase.commands.findIndex(c => c.id === item.id) : 0 :
               testCase.subCases.findIndex(s => s.id === item.id)
      };
    });

    // 更新用例
    const updatedTestCases = updateCaseById(testCases, testCase.id, (tc) => ({
      ...tc,
      childrenOrder: newOrder
    }));

    setTestCases(updatedTestCases);
  }, [testCases, setTestCases]);

  /**
   * 更新拖拽目标信息
   */
  const updateDropTarget = useCallback((
    caseId: string,
    itemId: string,
    itemType: 'command' | 'subcase',
    position: 'above' | 'below'
  ) => {
    setDragInfo((prev: any) => ({
      ...prev,
      dropTarget: {
        caseId,
        itemId,
        itemType,
        position
      }
    }));
  }, [setDragInfo]);

  /**
   * 结束拖拽
   */
  const endDrag = useCallback(() => {
    setDragInfo({
      isDragging: false,
      dragType: null,
      dragItemId: '',
      dragSourceCaseId: '',
      dropTarget: undefined
    });
  }, [setDragInfo]);

  return {
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleInternalReorder,
    handleUnifiedReorder,
    updateDropTarget,
    endDrag
  };
};