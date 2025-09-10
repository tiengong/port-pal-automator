import { TestCase, TestCommand } from '../types';
import { generateChildrenOrder, getSortedChildren, moveItem } from './testCaseUtils';
import { updateChildrenOrder } from './testCaseUtils';
import { globalToast } from '@/hooks/useGlobalMessages';

export interface DragItem {
  caseId: string;
  type: 'command' | 'subcase';
  itemId: string;
  index: number;
}

export interface DropTarget {
  caseId: string;
  index: number;
  position: 'above' | 'below';
}

export interface DragDropContext {
  draggedItem: DragItem | null;
  dropTarget: DropTarget | null;
}

/**
 * Handle drag start event
 */
export const handleDragStart = (
  e: React.DragEvent,
  caseId: string,
  type: 'command' | 'subcase',
  itemId: string,
  index: number,
  setDragInfo: (info: DragDropContext) => void
): void => {
  setDragInfo({
    draggedItem: { caseId, type, itemId, index },
    dropTarget: null
  });
  
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', itemId);
  
  // Add visual feedback
  e.currentTarget.classList.add('opacity-50');
};

/**
 * Handle drag over event
 */
export const handleDragOver = (
  e: React.DragEvent,
  caseId: string,
  index: number,
  setDragInfo: (info: DragDropContext) => void
): void => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  const rect = e.currentTarget.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  const position = e.clientY < midpoint ? 'above' : 'below';
  
  setDragInfo(prev => ({
    ...prev,
    dropTarget: { caseId, index, position }
  }));
};

/**
 * Handle drag leave event
 */
export const handleDragLeave = (
  e: React.DragEvent,
  setDragInfo: (info: DragDropContext) => void
): void => {
  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
    setDragInfo(prev => ({ ...prev, dropTarget: null }));
  }
};

/**
 * Handle drop event for reordering
 */
export const handleDrop = (
  e: React.DragEvent,
  dragInfo: DragDropContext,
  testCases: TestCase[],
  setTestCases: (testCases: TestCase[]) => void,
  setDragInfo: (info: DragDropContext) => void
): void => {
  e.preventDefault();
  
  const { draggedItem, dropTarget } = dragInfo;
  
  if (!draggedItem || !dropTarget) return;
  
  // Check if dropping in the same case
  if (draggedItem.caseId === dropTarget.caseId) {
    handleSameCaseReorder({
      draggedItem,
      dropTarget,
      testCases,
      setTestCases
    });
  } else {
    // Cross-case drag - show error message
    globalToast({
      title: "不支持跨用例拖拽",
      description: "只能在同一用例内重新排序"
    });
  }
  
  // Reset drag info
  setDragInfo({ draggedItem: null, dropTarget: null });
  
  // Remove visual feedback
  e.currentTarget.classList.remove('opacity-50');
};

/**
 * Handle reordering within the same test case
 */
const handleSameCaseReorder = (options: {
  draggedItem: DragItem;
  dropTarget: DropTarget;
  testCases: TestCase[];
  setTestCases: (testCases: TestCase[]) => void;
}): void => {
  const { draggedItem, dropTarget, testCases, setTestCases } = options;
  
  const targetCase = testCases.find(tc => tc.id === dropTarget.caseId);
  if (!targetCase) return;
  
  const sortedChildren = getSortedChildren(targetCase);
  let targetIndex = dropTarget.index;
  
  // Adjust target index based on drop position
  if (dropTarget.position === 'below') {
    targetIndex += 1;
  }
  
  // Adjust target index if dragged item is before target
  if (draggedItem.index < targetIndex) {
    targetIndex -= 1;
  }
  
  // Reorder children
  const reorderedChildren = moveItem(sortedChildren, draggedItem.index, targetIndex);
  const newOrder = reorderedChildren.map((child, index) => ({
    type: child.type,
    id: child.type === 'command' ? (child.item as TestCommand).id : (child.item as TestCase).id,
    index
  }));
  
  const updatedTestCase = updateChildrenOrder(targetCase, newOrder);
  const updatedTestCases = updateTestCaseById(testCases, targetCase.id, updatedTestCase);
  
  setTestCases(updatedTestCases);
  
  globalToast({
    title: "重新排序成功",
    description: "子项顺序已更新"
  });
};

/**
 * Update test case by ID
 */
const updateTestCaseById = (testCases: TestCase[], caseId: string, updater: (testCase: TestCase) => TestCase): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === caseId) {
      return updater(testCase);
    }
    
    // Handle nested cases
    if (testCase.subCases.length > 0) {
      return {
        ...testCase,
        subCases: updateTestCaseById(testCase.subCases, caseId, updater)
      };
    }
    
    return testCase;
  });
};

/**
 * Handle drag end event
 */
export const handleDragEnd = (
  setDragInfo: (info: DragDropContext) => void
): void => {
  setDragInfo({ draggedItem: null, dropTarget: null });
};

/**
 * Check if item is being dragged
 */
export const isItemDragging = (
  dragInfo: DragDropContext,
  caseId: string,
  itemId: string
): boolean => {
  return dragInfo.draggedItem?.caseId === caseId && dragInfo.draggedItem?.itemId === itemId;
};

/**
 * Check if item is a drop target
 */
export const isDropTarget = (
  dragInfo: DragDropContext,
  caseId: string,
  index: number
): boolean => {
  return dragInfo.dropTarget?.caseId === caseId && dragInfo.dropTarget?.index === index;
};

/**
 * Get drop position for visual feedback
 */
export const getDropPosition = (
  dragInfo: DragDropContext,
  caseId: string,
  index: number
): 'above' | 'below' | null => {
  if (dragInfo.dropTarget?.caseId === caseId && dragInfo.dropTarget?.index === index) {
    return dragInfo.dropTarget.position;
  }
  return null;
};

/**
 * Get drag drop CSS classes
 */
export const getDragDropClasses = (
  dragInfo: DragDropContext,
  caseId: string,
  itemId: string,
  index: number
): string => {
  const classes: string[] = [];
  
  if (isItemDragging(dragInfo, caseId, itemId)) {
    classes.push('opacity-50');
  }
  
  const dropPosition = getDropPosition(dragInfo, caseId, index);
  if (dropPosition === 'above') {
    classes.push('border-t-2', 'border-primary');
  } else if (dropPosition === 'below') {
    classes.push('border-b-2', 'border-primary');
  }
  
  return classes.join(' ');
};

/**
 * Validate drag drop operation
 */
export const validateDragDrop = (
  draggedItem: DragItem,
  dropTarget: DropTarget
): { valid: boolean; error?: string } => {
  // Cannot drag to same position
  if (draggedItem.caseId === dropTarget.caseId && draggedItem.index === dropTarget.index) {
    return { valid: false, error: "Cannot drop at same position" };
  }
  
  // Cannot drag to invalid index
  if (dropTarget.index < 0) {
    return { valid: false, error: "Invalid drop position" };
  }
  
  return { valid: true };
};

/**
 * Initialize drag drop state
 */
export const initializeDragDropState = (): DragDropContext => ({
  draggedItem: null,
  dropTarget: null
});

/**
 * Clean up drag drop state
 */
export const cleanupDragDropState = (): DragDropContext => ({
  draggedItem: null,
  dropTarget: null
});