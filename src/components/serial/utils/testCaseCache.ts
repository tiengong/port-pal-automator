/**
 * TestCase缓存机制
 * 优化测试用例的查找、更新和遍历操作
 */

import { TestCase, TestCommand } from '../types';

export interface CachedTestCase {
  case: TestCase;
  parent: TestCase | null;
  depth: number;
  path: string[];
  commandMap: Map<string, { command: TestCommand; index: number }>;
}

export class TestCaseCache {
  private caseMap = new Map<string, CachedTestCase>();
  private commandToCaseMap = new Map<string, string>(); // commandId -> caseId
  private flattenedCases: CachedTestCase[] = [];
  private isValid = false;

  /**
   * 构建缓存
   */
  build(testCases: TestCase[]): void {
    this.clear();
    this.flattenedCases = this.flattenTestCases(testCases);
    this.isValid = true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.caseMap.clear();
    this.commandToCaseMap.clear();
    this.flattenedCases = [];
    this.isValid = false;
  }

  /**
   * 查找测试用例
   */
  findById(id: string): TestCase | undefined {
    if (!this.isValid) return undefined;
    return this.caseMap.get(id)?.case;
  }

  /**
   * 查找测试用例的完整信息
   */
  findCachedById(id: string): CachedTestCase | undefined {
    if (!this.isValid) return undefined;
    return this.caseMap.get(id);
  }

  /**
   * 查找命令所在的测试用例
   */
  findCaseByCommandId(commandId: string): TestCase | undefined {
    if (!this.isValid) return undefined;
    const caseId = this.commandToCaseMap.get(commandId);
    return caseId ? this.caseMap.get(caseId)?.case : undefined;
  }

  /**
   * 查找命令在测试用例中的位置
   */
  findCommandLocation(commandId: string): { caseId: string; commandIndex: number } | null {
    if (!this.isValid) return null;
    
    const caseId = this.commandToCaseMap.get(commandId);
    if (!caseId) return null;
    
    const cachedCase = this.caseMap.get(caseId);
    if (!cachedCase) return null;
    
    const commandInfo = cachedCase.commandMap.get(commandId);
    return commandInfo ? { caseId, commandIndex: commandInfo.index } : null;
  }

  /**
   * 获取所有测试用例（扁平化）
   */
  getAllCases(): TestCase[] {
    if (!this.isValid) return [];
    return this.flattenedCases.map(cached => cached.case);
  }

  /**
   * 获取指定深度的测试用例
   */
  getCasesByDepth(depth: number): TestCase[] {
    if (!this.isValid) return [];
    return this.flattenedCases
      .filter(cached => cached.depth === depth)
      .map(cached => cached.case);
  }

  /**
   * 获取子用例
   */
  getSubCases(parentId: string): TestCase[] {
    if (!this.isValid) return [];
    return this.flattenedCases
      .filter(cached => cached.parent?.id === parentId)
      .map(cached => cached.case);
  }

  /**
   * 获取测试用例深度
   */
  getCaseDepth(caseId: string): number {
    if (!this.isValid) return -1;
    return this.caseMap.get(caseId)?.depth ?? -1;
  }

  /**
   * 获取测试用例路径
   */
  getCasePath(caseId: string): string[] {
    if (!this.isValid) return [];
    return this.caseMap.get(caseId)?.path ?? [];
  }

  /**
   * 检查缓存是否有效
   */
  isCacheValid(): boolean {
    return this.isValid;
  }

  /**
   * 更新单个测试用例
   */
  updateCase(updatedCase: TestCase): boolean {
    if (!this.isValid) return false;
    
    const cachedCase = this.caseMap.get(updatedCase.id);
    if (!cachedCase) return false;
    
    // 更新缓存
    cachedCase.case = updatedCase;
    
    // 重新构建命令映射
    cachedCase.commandMap.clear();
    updatedCase.commands.forEach((command, index) => {
      cachedCase.commandMap.set(command.id, { command, index });
      this.commandToCaseMap.set(command.id, updatedCase.id);
    });
    
    return true;
  }

  /**
   * 扁平化测试用例树结构
   */
  private flattenTestCases(testCases: TestCase[], parent: TestCase | null = null, depth = 0, path: string[] = []): CachedTestCase[] {
    const result: CachedTestCase[] = [];
    
    for (const testCase of testCases) {
      const currentPath = [...path, testCase.id];
      const cachedCase: CachedTestCase = {
        case: testCase,
        parent,
        depth,
        path: currentPath,
        commandMap: new Map()
      };
      
      // 构建命令映射
      testCase.commands.forEach((command, index) => {
        cachedCase.commandMap.set(command.id, { command, index });
        this.commandToCaseMap.set(command.id, testCase.id);
      });
      
      // 添加到映射
      this.caseMap.set(testCase.id, cachedCase);
      result.push(cachedCase);
      
      // 递归处理子用例
      if (testCase.subCases.length > 0) {
        const subCases = this.flattenTestCases(testCase.subCases, testCase, depth + 1, currentPath);
        result.push(...subCases);
      }
    }
    
    return result;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    totalCases: number;
    totalCommands: number;
    maxDepth: number;
    isValid: boolean;
  } {
    if (!this.isValid) {
      return { totalCases: 0, totalCommands: 0, maxDepth: 0, isValid: false };
    }
    
    const maxDepth = Math.max(...this.flattenedCases.map(c => c.depth), 0);
    const totalCommands = this.commandToCaseMap.size;
    
    return {
      totalCases: this.flattenedCases.length,
      totalCommands,
      maxDepth,
      isValid: true
    };
  }
}

/**
 * 全局缓存实例
 */
export const testCaseCache = new TestCaseCache();