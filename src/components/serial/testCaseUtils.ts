// testCaseUtils.ts - Utility functions for test case management

import { TestCase, TestCommand } from './types';

export interface SortedChildren {
  commands: TestCommand[];
  subCases: TestCase[];
}

/**
 * Get sorted children (commands and subcases) from a test case
 */
export const getSortedChildren = (testCase: TestCase): SortedChildren => {
  return {
    commands: testCase.commands || [],
    subCases: testCase.subCases || []
  };
};

/**
 * Update a test case by ID
 */
export const updateTestCaseById = (
  testCases: TestCase[], 
  caseId: string, 
  updates: Partial<TestCase>
): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === caseId) {
      return { ...testCase, ...updates };
    }
    // Recursively update subcases
    if (testCase.subCases?.length) {
      return {
        ...testCase,
        subCases: updateTestCaseById(testCase.subCases, caseId, updates)
      };
    }
    return testCase;
  });
};

/**
 * Generate children order for drag and drop
 */
export const generateChildrenOrder = (testCase: TestCase): string[] => {
  const result: string[] = [];
  testCase.commands?.forEach(cmd => result.push(cmd.id));
  testCase.subCases?.forEach(subCase => result.push(subCase.id));
  return result;
};

/**
 * Move item within array
 */
export const moveItem = <T>(array: T[], fromIndex: number, toIndex: number): T[] => {
  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
};

/**
 * Find a test case by ID (recursive search)
 */
export const findTestCaseById = (testCases: TestCase[], caseId: string): TestCase | null => {
  for (const testCase of testCases) {
    if (testCase.id === caseId) {
      return testCase;
    }
    if (testCase.subCases?.length) {
      const found = findTestCaseById(testCase.subCases, caseId);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Get all test cases in a flattened array (including subcases)
 */
export const getAllTestCases = (testCases: TestCase[]): TestCase[] => {
  const result: TestCase[] = [];
  
  const traverse = (cases: TestCase[]) => {
    for (const testCase of cases) {
      result.push(testCase);
      if (testCase.subCases?.length) {
        traverse(testCase.subCases);
      }
    }
  };
  
  traverse(testCases);
  return result;
};

/**
 * Count total commands in a test case (including subcases)
 */
export const getTotalCommandCount = (testCase: TestCase): number => {
  let count = testCase.commands?.length || 0;
  
  if (testCase.subCases?.length) {
    for (const subCase of testCase.subCases) {
      count += getTotalCommandCount(subCase);
    }
  }
  
  return count;
};

/**
 * Check if a test case has any running commands
 */
export const hasRunningCommands = (testCase: TestCase): boolean => {
  if (testCase.isRunning) return true;
  
  if (testCase.subCases?.length) {
    return testCase.subCases.some(hasRunningCommands);
  }
  
  return false;
};