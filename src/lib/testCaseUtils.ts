import { TestCase, TestCommand } from "@/components/serial/types";
import { getNextUniqueId, fromPersistedCase } from "@/components/serial/workspace";

/**
 * 标准化导入的测试用例数据
 * 处理持久化格式转换和基本结构验证
 */
export const normalizeImportedCases = (rawCases: any[]): TestCase[] => {
  const validCases: TestCase[] = [];
  
  for (const rawCase of rawCases) {
    try {
      // 基本结构验证
      if (!rawCase || typeof rawCase !== 'object') {
        continue;
      }
      
      let testCase: TestCase;
      
      // 检查是否为持久化格式（缺少运行时字段）
      const isPersisted = !('isExpanded' in rawCase) || !('isRunning' in rawCase) || !('currentCommand' in rawCase);
      
      if (isPersisted) {
        // 转换持久化格式
        testCase = fromPersistedCase(rawCase);
      } else {
        // 已经是运行时格式，进行验证
        testCase = rawCase as TestCase;
      }
      
      // 验证必要字段
      if (!testCase.id || !testCase.name) {
        continue;
      }
      
      // 确保数组字段存在
      testCase.commands = Array.isArray(testCase.commands) ? testCase.commands : [];
      testCase.subCases = Array.isArray(testCase.subCases) ? testCase.subCases : [];
      
      // 确保运行时字段存在
      if (typeof testCase.isExpanded !== 'boolean') testCase.isExpanded = false;
      if (typeof testCase.isRunning !== 'boolean') testCase.isRunning = false;
      if (typeof testCase.currentCommand !== 'number') testCase.currentCommand = -1;
      if (typeof testCase.selected !== 'boolean') testCase.selected = false;
      if (!testCase.status) testCase.status = 'pending';
      
      // 递归处理命令
      testCase.commands = normalizeCommands(testCase.commands);
      
      // 递归处理子用例
      if (testCase.subCases.length > 0) {
        testCase.subCases = normalizeImportedCases(testCase.subCases);
      }
      
      validCases.push(testCase);
    } catch (error) {
      // 跳过无效的用例
      continue;
    }
  }
  
  return validCases;
};

/**
 * 标准化命令数据
 */
const normalizeCommands = (commands: any[]): TestCommand[] => {
  if (!Array.isArray(commands)) return [];
  
  return commands.filter(cmd => {
    return cmd && typeof cmd === 'object' && cmd.id && cmd.type;
  }).map(cmd => ({
    ...cmd,
    selected: typeof cmd.selected === 'boolean' ? cmd.selected : false,
    status: cmd.status || 'pending'
  }));
};

/**
 * 确保所有测试用例具有唯一的ID和uniqueId
 * 处理与现有用例的冲突
 */
export const ensureUniqueIds = async (newCases: TestCase[], existingCases: TestCase[]): Promise<TestCase[]> => {
  const existingIds = new Set(existingCases.map(tc => tc.id));
  const existingUniqueIds = new Set(existingCases.map(tc => tc.uniqueId));
  const processedIds = new Set<string>();
  const processedUniqueIds = new Set<string>();
  
  const processedCases: TestCase[] = [];
  
  for (const testCase of newCases) {
    const processedCase = await processTestCaseIds(
      testCase, 
      existingIds, 
      existingUniqueIds, 
      processedIds, 
      processedUniqueIds
    );
    processedCases.push(processedCase);
  }
  
  return processedCases;
};

/**
 * 递归处理测试用例及其子用例的ID唯一性
 */
const processTestCaseIds = async (
  testCase: TestCase, 
  existingIds: Set<string>, 
  existingUniqueIds: Set<string>,
  processedIds: Set<string>,
  processedUniqueIds: Set<string>
): Promise<TestCase> => {
  const processedCase = { ...testCase };
  
  // 处理ID冲突
  if (existingIds.has(processedCase.id) || processedIds.has(processedCase.id)) {
    processedCase.id = `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  processedIds.add(processedCase.id);
  
  // 处理uniqueId冲突
  if (existingUniqueIds.has(processedCase.uniqueId) || processedUniqueIds.has(processedCase.uniqueId)) {
    processedCase.uniqueId = await getNextUniqueId();
  }
  processedUniqueIds.add(processedCase.uniqueId);
  
  // 处理命令ID冲突
  const commandIds = new Set<string>();
  processedCase.commands = processedCase.commands.map(cmd => {
    const processedCmd = { ...cmd };
    if (commandIds.has(processedCmd.id)) {
      processedCmd.id = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    commandIds.add(processedCmd.id);
    return processedCmd;
  });
  
  // 递归处理子用例
  if (processedCase.subCases.length > 0) {
    const processedSubCases: TestCase[] = [];
    for (const subCase of processedCase.subCases) {
      const processedSubCase = await processTestCaseIds(
        subCase, 
        existingIds, 
        existingUniqueIds, 
        processedIds, 
        processedUniqueIds
      );
      processedSubCases.push(processedSubCase);
    }
    processedCase.subCases = processedSubCases;
  }
  
  return processedCase;
};

/**
 * 安全的setTestCases包装器，确保总是传递数组
 */
export const createSafeSetTestCases = (originalSetTestCases: (cases: TestCase[]) => void) => {
  return (cases: TestCase[] | any) => {
    if (Array.isArray(cases)) {
      originalSetTestCases(cases);
    } else {
      console.warn('Attempted to set testCases with non-array value:', cases);
      originalSetTestCases([]);
    }
  };
};