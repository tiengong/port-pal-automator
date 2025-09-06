import { TestCase } from '../types';
import { 
  initializeDefaultWorkspace, 
  loadCases, 
  getLastOpenedTestCase, 
  setLastOpenedTestCase 
} from '../workspace';

export interface WorkspaceContext {
  setCurrentWorkspace: (workspace: string) => void;
  setTestCases: (cases: TestCase[]) => void;
  setSelectedTestCaseId: (id: string | null) => void;
}

// 初始化工作空间
export const initWorkspace = async (context: WorkspaceContext) => {
  try {
    await initializeDefaultWorkspace();
    const testCasesData = await loadCases();
    context.setCurrentWorkspace('Default');
    context.setTestCases(Array.isArray(testCasesData) ? testCasesData : []);
    
    // 选择上次打开的测试用例
    const lastOpened = await getLastOpenedTestCase();
    const cases = Array.isArray(testCasesData) ? testCasesData : [];
    if (lastOpened && cases.some(c => c.id === lastOpened)) {
      context.setSelectedTestCaseId(lastOpened);
    } else if (cases.length > 0) {
      context.setSelectedTestCaseId(cases[0].id);
    }
  } catch (error) {
    console.error('Failed to initialize workspace:', error);
  }
};

// 处理工作空间变更
export const handleWorkspaceChange = async (context: WorkspaceContext) => {
  try {
    const testCasesData = await loadCases();
    context.setCurrentWorkspace('Default');
    context.setTestCases(Array.isArray(testCasesData) ? testCasesData : []);
    
    // 选择上次打开的测试用例或第一个可用的
    const lastOpened = await getLastOpenedTestCase();
    const cases = Array.isArray(testCasesData) ? testCasesData : [];
    if (lastOpened && cases.some(c => c.id === lastOpened)) {
      context.setSelectedTestCaseId(lastOpened);
    } else if (cases.length > 0) {
      context.setSelectedTestCaseId(cases[0].id);
    }
  } catch (error) {
    console.error('Failed to load workspace:', error);
  }
};

// 跟踪选中的测试用例变更
export const trackSelectedTestCase = (selectedTestCaseId: string | null) => {
  if (selectedTestCaseId) {
    setLastOpenedTestCase(selectedTestCaseId);
  }
};