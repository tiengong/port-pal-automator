import { TestCase, TestCommand } from '../types';

/**
 * Generate children order for sorting
 */
export const generateChildrenOrder = (children: (TestCase | TestCommand)[]): string[] => {
  return children.map(child => child.id);
};

/**
 * Get sorted children based on order
 */
export const getSortedChildren = (
  children: (TestCase | TestCommand)[],
  order: string[]
): (TestCase | TestCommand)[] => {
  const childMap = new Map(children.map(child => [child.id, child]));
  
  return order
    .map(id => childMap.get(id))
    .filter(Boolean) as (TestCase | TestCommand)[];
};

/**
 * Update children order after operations
 */
export const updateChildrenOrder = (
  children: (TestCase | TestCommand)[],
  newOrder: string[]
): (TestCase | TestCommand)[] => {
  return getSortedChildren(children, newOrder);
};

/**
 * Move an item in a list
 */
export const moveItem = <T>(
  items: T[],
  fromIndex: number,
  toIndex: number
): T[] => {
  const result = [...items];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
};

/**
 * Get case depth in the hierarchy
 */
export const getCaseDepth = (testCase: TestCase, testCases: TestCase[]): number => {
  let depth = 0;
  let currentCase = testCase;
  
  while (true) {
    const parent = findParentCase(currentCase.id, testCases);
    if (!parent) break;
    depth++;
    currentCase = parent;
  }
  
  return depth;
};

/**
 * Check if can add sub-case (prevent deep nesting)
 */
export const canAddSubCase = (testCase: TestCase, testCases: TestCase[], maxDepth: number = 5): boolean => {
  const currentDepth = getCaseDepth(testCase, testCases);
  return currentDepth < maxDepth;
};

/**
 * Find parent case of a given case
 */
const findParentCase = (caseId: string, testCases: TestCase[]): TestCase | null => {
  for (const testCase of testCases) {
    const subCase = testCase.subCases.find(sub => sub.id === caseId);
    if (subCase) {
      return testCase;
    }
    const foundInSub = findParentCase(caseId, testCase.subCases);
    if (foundInSub) return foundInSub;
  }
  return null;
};

/**
 * Check if a case is a stats case
 */
export const isStatsCase = (testCase: TestCase): boolean => {
  return testCase.name.includes('统计') || testCase.name.includes('Stats');
};

/**
 * Generate unique ID for new items
 */
let nextId = 1000;
export const generateUniqueId = (): string => {
  return `item_${++nextId}`;
};

/**
 * Check if command is selected
 */
export const isCommandSelected = (command: TestCommand): boolean => {
  return command.selected || false;
};

/**
 * Check if case has selected items
 */
export const hasSelectedItems = (testCase: TestCase): boolean => {
  const hasSelectedCommands = testCase.commands.some(cmd => cmd.selected);
  const hasSelectedSubCases = testCase.subCases.some(subCase => hasSelectedItems(subCase));
  return hasSelectedCommands || hasSelectedSubCases;
};