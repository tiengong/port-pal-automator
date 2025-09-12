import { TestCase } from '../types';

/**
 * Find a test case by ID in a nested structure
 */
export const findTestCaseById = (id: string, testCases: TestCase[]): TestCase | null => {
  for (const testCase of testCases) {
    if (testCase.id === id) {
      return testCase;
    }
    const found = findTestCaseById(id, testCase.subCases);
    if (found) return found;
  }
  return null;
};

/**
 * Get the top-level parent of a test case
 */
export const getTopLevelParent = (caseId: string, testCases: TestCase[]): TestCase | null => {
  for (const testCase of testCases) {
    if (testCase.id === caseId) {
      return testCase;
    }
    const foundInSub = findTestCaseById(caseId, testCase.subCases);
    if (foundInSub) {
      return testCase; // Return the top-level parent
    }
  }
  return null;
};

/**
 * Find parent case of a given case
 */
export const findParentCase = (caseId: string, testCases: TestCase[]): TestCase | null => {
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
 * Update a test case by ID using an updater function
 */
export const updateCaseById = (testCases: TestCase[], caseId: string, updater: (testCase: TestCase) => TestCase): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === caseId) {
      return updater(testCase);
    }
    return {
      ...testCase,
      subCases: updateCaseById(testCase.subCases, caseId, updater)
    };
  });
};

/**
 * Add a sub-case to a test case by ID
 */
export const addSubCaseById = (testCases: TestCase[], parentId: string, newSubCase: TestCase): TestCase[] => {
  return testCases.map(testCase => {
    if (testCase.id === parentId) {
      return {
        ...testCase,
        subCases: [...testCase.subCases, newSubCase]
      };
    }
    return {
      ...testCase,
      subCases: addSubCaseById(testCase.subCases, parentId, newSubCase)
    };
  });
};

/**
 * Toggle expand state of a test case by ID
 */
export const toggleExpandById = (testCases: TestCase[], caseId: string): TestCase[] => {
  return updateCaseById(testCases, caseId, (testCase) => ({
    ...testCase,
    isExpanded: !testCase.isExpanded
  }));
};

/**
 * Find the path from root to a specific test case
 */
export const findCasePath = (caseId: string, testCases: TestCase[]): TestCase[] => {
  for (const testCase of testCases) {
    if (testCase.id === caseId) {
      return [testCase];
    }
    const subPath = findCasePath(caseId, testCase.subCases);
    if (subPath.length > 0) {
      return [testCase, ...subPath];
    }
  }
  return [];
};

/**
 * Delete a test case by ID
 */
export const deleteCaseById = (testCases: TestCase[], caseId: string): TestCase[] => {
  return testCases
    .filter(testCase => testCase.id !== caseId)
    .map(testCase => ({
      ...testCase,
      subCases: deleteCaseById(testCase.subCases, caseId)
    }));
};