/**
 * 测试用例管理器组合Hook (V2 - 架构重构版本)
 * 将状态管理拆分为多个专用hooks，降低耦合度
 */

import { useMemo } from 'react';
import { TestCase } from '../types';
import { useTestCaseBase } from './useTestCaseBase';
import { useTestCaseEditor } from './useTestCaseEditor';
import { useTestCaseExecution } from './useTestCaseExecution';
import { useTestCaseUserInteraction } from './useTestCaseUserInteraction';
import { useTestCaseDrag } from './useTestCaseDrag';
import { useTestCaseScripts } from './useTestCaseScripts';
import { useTestCaseMisc } from './useTestCaseMisc';

export const useTestCaseManagerV2 = () => {
  // 基础状态管理
  const base = useTestCaseBase();
  
  // 编辑状态管理
  const editor = useTestCaseEditor();
  
  // 执行状态管理
  const execution = useTestCaseExecution();
  
  // 用户交互状态管理
  const userInteraction = useTestCaseUserInteraction();
  
  // 拖拽状态管理
  const drag = useTestCaseDrag();
  
  // 脚本状态管理
  const scripts = useTestCaseScripts();
  
  // 其他状态管理
  const misc = useTestCaseMisc();

  // 计算属性 - 是否有选中的项目
  const hasSelectedItems = useMemo(() => {
    const checkCase = (testCase: TestCase): boolean => {
      if (testCase.selected) return true;
      if (testCase.commands.some(cmd => cmd.selected)) return true;
      return testCase.subCases.some(checkCase);
    };
    return base.currentTestCase ? checkCase(base.currentTestCase) : false;
  }, [base.currentTestCase]);

  // 组合所有状态管理
  return {
    // 基础状态
    ...base,
    
    // 编辑状态
    ...editor,
    
    // 执行状态
    ...execution,
    
    // 用户交互状态
    ...userInteraction,
    
    // 拖拽状态
    ...drag,
    
    // 脚本状态
    ...scripts,
    
    // 其他状态
    ...misc,
    
    // 计算属性
    hasSelectedItems,
    
    // 工具函数 - 重置所有状态
    resetAll: () => {
      base.setTestCases([]);
      base.setSelectedCase(null);
      base.setSelectedTestCaseId('');
      
      editor.closeEditDialog();
      editor.clearInlineEdit();
      
      execution.stopExecution();
      execution.clearExecutionResults();
      
      userInteraction.resetUserInteraction();
      
      drag.endDrag();
      
      scripts.clearRunResult();
      
      misc.hideContextMenu();
      misc.setLastFocusedChild(null);
    }
  };
};