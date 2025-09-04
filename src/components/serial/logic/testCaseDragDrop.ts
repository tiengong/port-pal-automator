import { TestCase, TestCommand } from '../types';
import { getSortedChildren, updateChildrenOrder, moveItem } from '../testCaseUtils';
import { updateCaseById } from '../testCaseRecursiveUtils';
import { scheduleAutoSave } from '../workspace';

export interface DragDropContext {
  testCases: TestCase[];
  setTestCases: (cases: TestCase[]) => void;
  dragInfo: any;
  setDragInfo: (info: any) => void;
  toast: (options: any) => void;
}

// 统一重排序处理（命令和子用例）
export const handleUnifiedReorder = (
  testCase: TestCase, 
  fromIndex: number, 
  toIndex: number, 
  position: 'above' | 'below',
  context: DragDropContext
) => {
  const sortedChildren = getSortedChildren(testCase);
  let targetIndex = toIndex;
  
  if (position === 'below') {
    targetIndex += 1;
  }
  
  // 如果拖拽的索引在目标索引之前，需要调整目标索引
  if (fromIndex < targetIndex) {
    targetIndex -= 1;
  }
  
  // 重新排列子项顺序
  const reorderedChildren = moveItem(sortedChildren, fromIndex, targetIndex);
  const newOrder = reorderedChildren.map((child, index) => ({
    type: child.type,
    id: child.type === 'command' ? (child.item as TestCommand).id : (child.item as TestCase).id,
    index
  }));
  
  const updatedTestCase = updateChildrenOrder(testCase, newOrder);
  const updatedTestCases = updateCaseById(context.testCases, testCase.id, () => updatedTestCase);
  context.setTestCases(updatedTestCases);
  
  // 自动保存更新后的用例
  scheduleAutoSave(updatedTestCase);
  
  context.toast({
    title: "重新排序成功",
    description: "子项顺序已更新"
  });
};

// 开始拖拽
export const handleDragStart = (
  e: React.DragEvent<HTMLDivElement>,
  caseId: string,
  type: 'command' | 'subcase',
  itemId: string,
  index: number,
  context: DragDropContext
) => {
  context.setDragInfo({
    ...context.dragInfo,
    draggedItem: { caseId, type, itemId, index }
  });
  e.dataTransfer.effectAllowed = 'move';
};

// 拖拽悬停
export const handleDragOver = (
  e: React.DragEvent<HTMLDivElement>,
  caseId: string,
  index: number,
  position: 'above' | 'below',
  context: DragDropContext
) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  context.setDragInfo({
    ...context.dragInfo,
    dropTarget: { caseId, index, position }
  });
};

// 拖拽离开
export const handleDragLeave = (
  e: React.DragEvent<HTMLDivElement>,
  context: DragDropContext
) => {
  // 只有当离开的是直接子元素时才清除dropTarget
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    context.setDragInfo({
      ...context.dragInfo,
      dropTarget: null
    });
  }
};

// 完成拖拽
export const handleDrop = (
  e: React.DragEvent<HTMLDivElement>,
  context: DragDropContext,
  onReorder?: (testCase: TestCase, fromIndex: number, toIndex: number, position: 'above' | 'below') => void
) => {
  e.preventDefault();
  const { draggedItem, dropTarget } = context.dragInfo;
  
  if (draggedItem && dropTarget && draggedItem.caseId === dropTarget.caseId) {
    if (onReorder) {
      // 使用自定义重排序逻辑
      const targetCase = context.testCases.find(tc => tc.id === dropTarget.caseId);
      if (targetCase) {
        onReorder(targetCase, draggedItem.index, dropTarget.index, dropTarget.position);
      }
    } else {
      // 使用默认重排序逻辑
      const targetCase = context.testCases.find(tc => tc.id === dropTarget.caseId);
      if (targetCase) {
        handleUnifiedReorder(targetCase, draggedItem.index, dropTarget.index, dropTarget.position, context);
      }
    }
  } else if (draggedItem && dropTarget && draggedItem.caseId !== dropTarget.caseId) {
    context.toast({
      title: "不支持跨用例拖拽",
      description: "只能在同一个测试用例内重新排序",
      variant: "destructive"
    });
  }
  
  context.setDragInfo({ draggedItem: null, dropTarget: null });
};

// 检查是否正在拖拽
export const isDragging = (
  dragInfo: any,
  caseId: string,
  itemId: string
): boolean => {
  return dragInfo?.draggedItem?.caseId === caseId && dragInfo?.draggedItem?.itemId === itemId;
};

// 检查是否为拖拽目标
export const isDropTarget = (
  dragInfo: any,
  caseId: string,
  index: number
): boolean => {
  return dragInfo?.dropTarget?.caseId === caseId && dragInfo?.dropTarget?.index === index;
};

// 获取拖拽位置
export const getDropPosition = (dragInfo: any): 'above' | 'below' | null => {
  return dragInfo?.dropTarget?.position || null;
};