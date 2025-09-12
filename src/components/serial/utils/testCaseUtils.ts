/**
 * 测试用例工具函数统一入口 (V2 - 架构重构版本)
 * 提供清晰模块边界的工具函数集合
 * 
 * 模块职责：
 * - testCaseExecutionUtils: 执行相关工具函数
 * - testCaseSelectionUtils: 选择状态管理工具函数  
 * - testCaseNavigationUtils: 导航定位工具函数
 * - testCaseOrderingUtils: 排序移动工具函数
 * - testCaseCoreUtils: 核心基础工具函数
 * - testCaseRecursiveUtils: 递归操作工具函数 (保留)
 * - testCaseUrcUtils: URC相关工具函数 (保留)
 */

// 执行相关工具函数
export * from './testCaseExecutionUtils';

// 选择状态管理工具函数
export * from './testCaseSelectionUtils';

// 导航定位工具函数
export * from './testCaseNavigationUtils';

// 排序移动工具函数
export * from './testCaseOrderingUtils';

// 核心基础工具函数
export * from './testCaseCoreUtils';

// 保留的原有工具函数 (避免破坏现有引用)
export * from './testCaseRecursiveUtils';
export * from './testCaseUrcUtils';

// 缓存机制
export * from './testCaseCache';

// 对象池机制
export * from './objectPool';

/**
 * 测试用例工具函数版本信息
 */
export const TEST_CASE_UTILS_VERSION = '2.0.0';

/**
 * 工具函数模块分类
 */
export const TestCaseUtilsModules = {
  EXECUTION: 'testCaseExecutionUtils',
  SELECTION: 'testCaseSelectionUtils', 
  NAVIGATION: 'testCaseNavigationUtils',
  ORDERING: 'testCaseOrderingUtils',
  CORE: 'testCaseCoreUtils',
  RECURSIVE: 'testCaseRecursiveUtils',
  URC: 'testCaseUrcUtils',
  CACHE: 'testCaseCache',
  POOL: 'objectPool'
} as const;

/**
 * 获取工具函数统计信息
 */
export const getUtilsStats = () => {
  // 这里可以添加工具函数使用统计
  return {
    version: TEST_CASE_UTILS_VERSION,
    modules: Object.keys(TestCaseUtilsModules),
    timestamp: Date.now()
  };
};