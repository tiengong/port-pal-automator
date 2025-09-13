// testCaseRecursiveUtils.ts - Recursive utilities for test case operations

import { TestCase, TestCommand } from './types';
import { updateTestCaseById } from './testCaseUtils';

export interface TestCaseLocation {
  caseId: string;
  case: TestCase;
  path: string[];
  depth: number;
}

/**
 * Recursively find all test cases and their locations
 */
export const getAllTestCaseLocations = (testCases: TestCase[], basePath: string[] = []): TestCaseLocation[] => {
  const locations: TestCaseLocation[] = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const path = [...basePath, i.toString()];
    
    locations.push({
      caseId: testCase.id,
      case: testCase,
      path,
      depth: basePath.length
    });
    
    // Recursively process subcases
    if (testCase.subCases?.length) {
      const subLocations = getAllTestCaseLocations(testCase.subCases, path);
      locations.push(...subLocations);
    }
  }
  
  return locations;
};

/**
 * Update test case by ID - alias for updateTestCaseById
 */
export const updateCaseById = (
  testCases: TestCase[],
  caseId: string,
  updates: Partial<TestCase>
): TestCase[] => {
  return updateTestCaseById(testCases, caseId, updates);
};

/**
 * Update a test case using its path
 */
export const updateTestCaseByPath = (
  testCases: TestCase[],
  path: string[],
  updates: Partial<TestCase>
): TestCase[] => {
  if (path.length === 0) return testCases;
  
  const [firstIndex, ...remainingPath] = path;
  const index = parseInt(firstIndex);
  
  return testCases.map((testCase, i) => {
    if (i === index) {
      if (remainingPath.length === 0) {
        // This is the target case
        return { ...testCase, ...updates };
      } else {
        // Continue down the path
        return {
          ...testCase,
          subCases: updateTestCaseByPath(testCase.subCases || [], remainingPath, updates)
        };
      }
    }
    return testCase;
  });
};

/**
 * Find test case by path
 */
export const findTestCaseByPath = (testCases: TestCase[], path: string[]): TestCase | null => {
  if (path.length === 0) return null;
  
  const [firstIndex, ...remainingPath] = path;
  const index = parseInt(firstIndex);
  
  if (index >= testCases.length || index < 0) return null;
  
  const testCase = testCases[index];
  
  if (remainingPath.length === 0) {
    return testCase;
  }
  
  return findTestCaseByPath(testCase.subCases || [], remainingPath);
};

/**
 * Get the maximum depth of nested test cases
 */
export const getMaxDepth = (testCases: TestCase[]): number => {
  let maxDepth = 0;
  
  const traverse = (cases: TestCase[], currentDepth: number) => {
    maxDepth = Math.max(maxDepth, currentDepth);
    
    for (const testCase of cases) {
      if (testCase.subCases?.length) {
        traverse(testCase.subCases, currentDepth + 1);
      }
    }
  };
  
  traverse(testCases, 0);
  return maxDepth;
};