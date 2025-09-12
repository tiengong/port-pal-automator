import { TestCase } from '../types';

export interface StepLocation {
  caseId: string;
  commandIndex: number;
}

/**
 * Get the next step from a given position in test cases
 */
export const getNextStepFrom = (
  currentCaseId: string, 
  currentCommandIndex: number, 
  testCases: TestCase[]
): StepLocation | null => {
  const currentCase = testCases.find(tc => tc.id === currentCaseId);
  if (!currentCase) return null;

  // Check if there are more commands in the current case
  if (currentCommandIndex < currentCase.commands.length - 1) {
    return {
      caseId: currentCaseId,
      commandIndex: currentCommandIndex + 1
    };
  }

  // Check if there are sub-cases in the current case
  if (currentCase.subCases.length > 0) {
    // Return first command of first sub-case
    const firstSubCase = currentCase.subCases[0];
    if (firstSubCase.commands.length > 0) {
      return {
        caseId: firstSubCase.id,
        commandIndex: 0
      };
    }
  }

  // Look for parent case and find next sibling
  const parentCase = findParentCase(currentCaseId, testCases);
  if (parentCase) {
    const subCaseIndex = parentCase.subCases.findIndex(sub => sub.id === currentCaseId);
    if (subCaseIndex !== -1 && subCaseIndex < parentCase.subCases.length - 1) {
      const nextSubCase = parentCase.subCases[subCaseIndex + 1];
      if (nextSubCase.commands.length > 0) {
        return {
          caseId: nextSubCase.id,
          commandIndex: 0
        };
      }
    }
  }

  return null;
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