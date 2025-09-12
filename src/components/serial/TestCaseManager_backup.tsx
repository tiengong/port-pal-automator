import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "@/components/ui/context-menu";
import { 
  Plus, 
  Play, 
  Trash2, 
  Edit,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  TestTube2,
  Search,
  Upload,
  Download,
  CheckSquare,
  Square,
  PlayCircle,
  RotateCcw,
  Hash,
  Save,
  FileCode
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { globalToast } from "@/hooks/useGlobalMessages";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/contexts/SettingsContext";
import { TestCaseHeader } from './TestCaseHeader';
import { TestCaseActions } from './TestCaseActions';
import { TestCaseSwitcher } from './TestCaseSwitcher';
import { ScriptEditor } from './ScriptEditor';
import { ExecutionEditor } from './editors/ExecutionEditor';
import { UrcEditor } from './editors/UrcEditor';
import { VariableDisplay } from '../VariableDisplay';
import { RunResultDialog, TestRunResult } from './RunResultDialog';
import { TestCase, TestCommand, ExecutionResult, ContextMenuState } from './types';
import { Script } from './types/ScriptTypes';
import { eventBus, EVENTS, SerialDataEvent, SendCommandEvent } from '@/lib/eventBus';
import { initializeDefaultWorkspace, loadCases, saveCase, getCurrentWorkspace, fromPersistedCase, scheduleAutoSave, getLastOpenedTestCase, setLastOpenedTestCase } from './workspace';

// Import modular utilities
import { useTestCaseManager } from './hooks/useTestCaseManager';
import { executeTestCase, executeCommand } from './utils/testExecutionUtils';
import { setupUrcListeners } from './utils/urcHandlerUtils';

// Import utility functions
import { generateChildrenOrder, getSortedChildren, updateChildrenOrder, moveItem, formatCommandIndex, isStatsCase } from './testCaseUtils';
import { findTestCaseById, getTopLevelParent, findParentCase, updateCaseById, addSubCaseById, toggleExpandById, findCasePath, deleteCaseById } from './testCaseRecursiveUtils';
import { getCaseDepth, canAddSubCase, findCasePath as findCasePathUtil } from './utils/testCaseHelpers';
import { findCommandLocation, getFirstExecutableInCase, getNextStepFrom, buildCommandOptionsFromCase } from './testCaseNavigationUtils';
import { parseUrcData, substituteVariables, checkUrcMatch } from './testCaseUrcUtils';
import { CommandRow } from './CommandRow';
import { sampleTestCases } from './sampleCases';
import { CaseEditDialogInline } from './components/CaseEditDialogInline';

interface TestCaseManagerProps {
  connectedPorts: Array<{
    port: any;
    params: any;
  }>;
  receivedData: string[];
  statusMessages?: {
    addMessage: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
}

export const TestCaseManager: React.FC<TestCaseManagerProps> = ({
  connectedPorts,
  receivedData,
  statusMessages
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { settings } = useSettings();
  
  // Use the modular hook for all business logic
  const {
    state,
    handleSelectTestCase,
    handleEditCase,
    handleRunTestCase,
    handleDeleteTestCase,
    handleRunCommand,
    handleEditCommand,
    updateCommandSelection,
    handleContextMenu,
    addCommandViaContextMenu,
    addUrcViaContextMenu,
    addSubCaseViaContextMenu,
    handleCreateScript,
    handleDeleteScript,
    handleSelectScript,
    handleRunScript,
    handleStopScript,
    handleSaveScript,
    handleWorkspaceChange,
    getCurrentTestCase,
    getVisibleRootCase,
    getTargetCaseForActions,
    hasSelectedItems,
    generateUniqueId,
    setTestCases,
    setSelectedTestCaseId,
    setEditingCase,
    setIsEditDialogOpen,
    setEditingCommandIndex,
    setCurrentScript,
    setScripts,
    setRunResult,
    setShowRunResult,
    setStoredParameters,
    setTriggeredUrcIds,
    setContextMenu,
    setInlineEdit,
    setUserActionDialog,
    setFailurePromptDialog,
    setLastFocusedChild,
    setCurrentWorkspace,
    setNextUniqueId
  } = useTestCaseManager({
    connectedPorts,
    receivedData,
    statusMessages
  });

  // AT命令库
  const atCommands = [
    'AT', 'AT+CGMR', 'AT+CGMI', 'AT+CGSN', 'AT+CSQ', 'AT+CREG', 'AT+COPS',
    'AT+CGATT', 'AT+CGACT', 'AT+CGDCONT', 'AT+CPINR', 'AT+CPIN', 'AT+CCID'
  ];
  
  // Initialize sample data - this would be moved to the hook in a complete refactor
  useEffect(() => {
    if (state.testCases.length === 0) {
      setTestCases(sampleTestCases);
      setSelectedTestCaseId('case1');
      setNextUniqueId(1003);
    }
  }, []);

  // Use URC listeners from modular utilities
  useEffect(() => {
    const currentTestCase = getCurrentTestCase();
    if (!currentTestCase) return;
    
    const unsubscribe = setupUrcListeners({
      currentTestCase,
      testCases: state.testCases,
      storedParameters: state.storedParameters,
      triggeredUrcIds: state.triggeredUrcIds,
      onUpdateTestCases: setTestCases,
      onUpdateParameters: setStoredParameters,
      onUpdateTriggeredUrcIds: setTriggeredUrcIds,
      onExecuteCommand: async (caseId: string, commandIndex: number) => {
        await handleRunCommand(caseId, commandIndex);
      }
    });
    
    return unsubscribe;
  }, [getCurrentTestCase(), state.testCases, state.storedParameters, state.triggeredUrcIds]);
  
  // 统一重排序处理（命令和子用例）
  const handleUnifiedReorder = (testCase: TestCase, fromIndex: number, toIndex: number, position: 'above' | 'below') => {
    const sortedChildren = getSortedChildren(testCase);
    let targetIndex = toIndex;
    
    if (position === 'below') {
      targetIndex += 1;
    }
    
    // 如果拖拽的索引在目标索引之前，需要调整目标索引
    if (fromIndex < targetIndex) {
      targetIndex -= 1;
    }
    
    // 重新排列子项顺序
    const reorderedChildren = moveItem(sortedChildren, fromIndex, targetIndex);
    const newOrder = reorderedChildren.map((child, index) => ({
      type: child.type,
      id: child.type === 'command' ? (child.item as TestCommand).id : (child.item as TestCase).id,
      index
    }));
    
    const updatedTestCase = updateChildrenOrder(testCase, newOrder);
    const updatedTestCases = updateCaseById(testCases, testCase.id, () => updatedTestCase);
    setTestCases(updatedTestCases);
    
    // 自动保存更新后的用例
    scheduleAutoSave(updatedTestCase);
    
    toast({
      title: "重新排序成功",
      description: "子项顺序已更新"
    });
  };

  // 监听串口数据接收事件
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.SERIAL_DATA_RECEIVED, (event: SerialDataEvent) => {
      if (event.type === 'received') {
        // 检查是否有活跃的URC监听器
        if (currentTestCase) {
          currentTestCase.commands.forEach((command, commandIndex) => {
            if (command.type === 'urc' && command.selected && command.urcPattern) {
              const matches = checkUrcMatch(event.data, command);
              if (matches) {
                // 参数提取
                const extractedParams = parseUrcData(event.data, command);
                if (Object.keys(extractedParams).length > 0) {
                  // 更新存储的参数，同名变量使用最新值
                  setStoredParameters(prev => {
                    return { ...prev, ...extractedParams };
                  });
                  
                  eventBus.emit(EVENTS.PARAMETER_EXTRACTED, { 
                    commandId: command.id, 
                    parameters: extractedParams 
                  });
                  
                  toast({
                    title: "参数解析成功",
                    description: `提取参数: ${Object.entries(extractedParams).map(([k, v]) => `${k}=${v.value}`).join(', ')}`,
                  });
                }
                
                // 处理URC状态更新和跳转逻辑
                const isUrcAlreadyTriggered = triggeredUrcIds.has(command.id);
                
                // 更新URC状态
                const updatedCommands = currentTestCase.commands.map((cmd, idx) => {
                  if (idx === commandIndex) {
                    const newCmd = { ...cmd, status: 'success' as const };
                    
                    // 处理once模式：匹配后失活
                    if (cmd.urcListenMode === 'once') {
                      newCmd.selected = false;
                    }
                    
                    return newCmd;
                  }
                  return cmd;
                });
                
                const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
                  ...testCase,
                  commands: updatedCommands
                }));
                setTestCases(updatedTestCases);
                
                // 处理跳转逻辑（只有在未触发过或once模式下才执行）
                if (!isUrcAlreadyTriggered || command.urcListenMode === 'once') {
                  // 标记permanent URC为已触发
                  if (command.urcListenMode === 'permanent') {
                    setTriggeredUrcIds(prev => new Set([...prev, command.id]));
                  }
                  
                  // 执行跳转逻辑
                  switch (command.jumpConfig?.onReceived) {
                    case 'continue':
                      const nextStep = getNextStepFrom(currentTestCase.id, commandIndex, testCases);
                      if (nextStep) {
                        setTimeout(() => runCommand(nextStep.caseId, nextStep.commandIndex), 100);
                        toast({
                          title: "URC继续执行",
                          description: `已继续到下一步执行`,
                        });
                      } else {
                        toast({
                          title: "URC执行完成",
                          description: "没有更多步骤可执行",
                        });
                      }
                      break;
                      
                    case 'jump':
                      if (command.jumpConfig?.jumpTarget?.type === 'command' && command.jumpConfig?.jumpTarget?.targetId) {
                        const targetLocation = findCommandLocation(command.jumpConfig.jumpTarget.targetId, testCases);
                        if (targetLocation) {
                          setTimeout(() => runCommand(targetLocation.caseId, targetLocation.commandIndex), 100);
                          toast({
                            title: "URC跳转执行",
                            description: `已跳转到指定命令`,
                          });
                        } else {
                          toast({
                            title: "跳转失败",
                            description: "找不到目标命令",
                            variant: "destructive"
                          });
                        }
                      }
                      break;
                      
                    default:
                      // 默认情况：仅参数提取，不跳转
                      break;
                  }
                }
              }
            }
          });
        }
      }
    });
    
    return unsubscribe;
  }, [currentTestCase, testCases, triggeredUrcIds]);
  
  // 初始化示例数据
  useEffect(() => {
    const sampleTestCases: TestCase[] = [
      {
        id: 'case1',
        uniqueId: '1001',
        name: 'AT指令基础测试',
        description: '测试基本AT指令响应',
        isExpanded: false,
        isRunning: false,
        currentCommand: -1,
        selected: false,
        status: 'pending',
      failureStrategy: 'stop',
      onWarningFailure: 'continue',
      onErrorFailure: 'stop',
      subCases: [],
        commands: [
          {
            id: 'cmd1',
            type: 'execution',
            command: 'AT',
            expectedResponse: 'OK',
            validationMethod: 'contains',
            validationPattern: 'OK',
            waitTime: 2000,
            stopOnFailure: true,
            lineEnding: 'crlf',
            selected: false,
            status: 'pending'
          },
          {
            id: 'cmd2',
            type: 'execution',
            command: 'AT+CGMR',
            validationMethod: 'none',
            waitTime: 3000,
            stopOnFailure: false,
            lineEnding: 'crlf',
            selected: false,
            status: 'pending'
          }
        ]
      },
      {
        id: 'case2',
        uniqueId: '1002',
        name: '网络连接测试',
        description: '测试网络连接相关指令',
        isExpanded: false,
        isRunning: false,
        currentCommand: -1,
        selected: false,
        status: 'pending',
        failureStrategy: 'stop',
        onWarningFailure: 'continue',
        onErrorFailure: 'stop',
        subCases: [],
        commands: [
          {
            id: 'cmd3',
            type: 'execution',
            command: 'AT+CREG?',
            validationMethod: 'contains',
            validationPattern: '+CREG:',
            waitTime: 2000,
            stopOnFailure: true,
            lineEnding: 'crlf',
            selected: false,
            status: 'pending'
          },
          {
            id: 'cmd4',
            type: 'execution',
            command: 'AT+CSQ',
            validationMethod: 'regex',
            validationPattern: '\\+CSQ: \\d+,\\d+',
            waitTime: 2000,
            stopOnFailure: false,
            lineEnding: 'crlf',
            selected: false,
            status: 'pending'
          }
        ]
      }
    ];
    setTestCases(sampleTestCases);
    setNextUniqueId(1003);
    setSelectedTestCaseId('case1'); // 自动选择第一个测试用例
  }, []);

  console.log('TestCaseManager rendered with modular layout', { currentTestCase, testCases });

  // 运行测试用例
  // 运行测试用例 - 使用模块化执行函数
  const runTestCase = async (caseId: string) => {
    const testCase = findTestCaseById(caseId, state.testCases);
    if (!testCase) return;

    // 如果正在运行，则暂停
    if (state.runningCasesRef.current.has(caseId)) {
      state.runningCasesRef.current.delete(caseId);
      const updatedTestCases = updateCaseById(state.testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: 'pending'
      }));
      setTestCases(updatedTestCases);
      statusMessages?.addMessage(`测试用例 "${testCase.name}" 已暂停`, 'warning');
      return;
    }

    // 添加到运行中的用例集合
    state.runningCasesRef.current.add(caseId);

    // 每次运行测试用例时清空存储的变量和触发状态
    setStoredParameters({});
    setTriggeredUrcIds(new Set());
    
    // 更新状态为运行中
    const updatedTestCases = updateCaseById(state.testCases, caseId, (tc) => ({
      ...tc,
      isRunning: true,
      status: 'running',
      currentCommand: 0
    }));
    setTestCases(updatedTestCases);
    
    statusMessages?.addMessage(`开始执行测试用例: ${testCase.name}`, 'info');

    // 使用模块化的执行函数
    const executionContext = {
      storedParameters: state.storedParameters,
      triggeredUrcIds: state.triggeredUrcIds,
      runningCasesRef: state.runningCasesRef,
      statusMessages
    };

    // 执行所有选中的命令，如果没有选中则执行全部命令
    const selectedCommands = testCase.commands.filter(cmd => cmd.selected);
    const commandsToRun = selectedCommands.length > 0 ? selectedCommands : testCase.commands;

    await executeTestCase({
      testCase,
      caseId,
      commandsToRun,
      context: executionContext,
      onStatusUpdate: (updates) => {
        const updatedTestCases = updateCaseById(state.testCases, caseId, (tc) => ({
          ...tc,
          ...updates
        }));
        setTestCases(updatedTestCases);
      },
      onCommandExecute: async (caseId: string, commandIndex: number) => {
        return await runCommand(caseId, commandIndex);
      },
      onComplete: (result) => {
        setRunResult(result);
        setShowRunResult(true);
      }
    });
  };

  // 运行单个命令 - 返回执行结果
  // 运行单个命令 - 使用模块化执行函数
  const runCommand = async (caseId: string, commandIndex: number): Promise<{ success: boolean; error?: string }> => {
    const targetCase = findTestCaseById(caseId, state.testCases);
    if (!targetCase) return { success: false, error: '测试用例未找到' };
    
    const command = targetCase.commands[commandIndex];
    
    // 设置当前执行的命令高亮
    setExecutingCommand({ caseId, commandIndex });
    
    try {
      // 使用模块化的命令执行函数
      const result = await executeCommand(
        command,
        caseId,
        commandIndex,
        state.storedParameters,
        statusMessages
      );
      
      // 更新命令状态
      const updatedTestCases = updateCaseById(state.testCases, caseId, (tc) => ({
        ...tc,
        commands: tc.commands.map((cmd, idx) => 
          idx === commandIndex ? { ...cmd, status: result.success ? 'success' : 'failed' } : cmd
        )
      }));
      setTestCases(updatedTestCases);
      
      return result;
    } catch (error) {
      console.error('Command execution error:', error);
      return { success: false, error: error?.toString() || '命令执行失败' };
    } finally {
      // 清除高亮状态
      setTimeout(() => {
        setExecutingCommand({ caseId: null, commandIndex: null });
      }, command.waitTime || 1000);
    }
  };

  // 删除测试用例
  const deleteTestCase = (caseId: string) => {
    setTestCases(prev => prev.filter(tc => tc.id !== caseId));
    if (selectedTestCaseId === caseId) {
      setSelectedTestCaseId(testCases.length > 1 ? testCases.find(tc => tc.id !== caseId)?.id || '' : '');
    }
    globalToast({
      title: "删除成功",
      description: "测试用例已删除"
    });
  };

  // 删除预设用例
  const deletePresetCases = () => {
    const presetCases = testCases.filter(tc => tc.isPreset);
    
    if (presetCases.length === 0) {
      toast({
        title: "提示",
        description: "没有预设用例需要删除",
        variant: "default"
      });
      return;
    }
    
    const updatedTestCases = testCases.filter(tc => !tc.isPreset);
    setTestCases(updatedTestCases);
    
    // 如果当前选中的是预设用例，切换到第一个非预设用例
    if (currentTestCase && currentTestCase.isPreset) {
      const firstNonPreset = updatedTestCases[0];
      if (firstNonPreset) {
        setSelectedTestCaseId(firstNonPreset.id);
      } else {
        setSelectedTestCaseId('');
      }
    }
    
    globalToast({
      title: "删除成功",
      description: `已删除 ${presetCases.length} 个预设用例`
    });
  };

  // 编辑引用的测试用例
  const handleEditReferencedCase = (caseId: string) => {
    const referencedCase = testCases.find(tc => tc.id === caseId);
    if (referencedCase) {
      handleEditCase(referencedCase);
    }
  };

  // 同步测试用例
  const handleSync = () => {
    toast({
      title: "同步功能",
      description: "同步功能开发中...",
    });
  };

  // Script handlers
  const handleCreateScript = (script: Script) => {
    setScripts([...scripts, script]);
    setCurrentScript(script);
    toast({
      title: "脚本已创建",
      description: `已创建脚本: ${script.name}`
    });
  };

  const handleDeleteScript = (scriptId: string) => {
    const scriptToDelete = scripts.find(s => s.id === scriptId);
    setScripts(scripts.filter(s => s.id !== scriptId));
    if (currentScript?.id === scriptId) {
      setCurrentScript(null);
    }
    toast({
      title: "脚本已删除",
      description: scriptToDelete ? `已删除脚本: ${scriptToDelete.name}` : "脚本已删除"
    });
  };

  const handleSelectScript = (scriptId: string) => {
    const script = scripts.find(s => s.id === scriptId);
    setCurrentScript(script || null);
    // Clear test case selection when selecting a script
    if (script) {
      setSelectedTestCaseId('');
    }
  };

  const handleScriptUpdate = (updatedScript: Script) => {
    setScripts(scripts.map(s => s.id === updatedScript.id ? updatedScript : s));
    setCurrentScript(updatedScript);
  };

  const handleSaveScript = (script: Script) => {
    // TODO: Implement script saving logic
    console.log('Save script:', script);
  };

  const handleRunScript = (scriptId: string) => {
    const script = scripts.find(s => s.id === scriptId);
    if (script) {
      setScripts(scripts.map(s => 
        s.id === scriptId 
          ? { ...s, isRunning: true, status: 'running' }
          : s
      ));
      setCurrentScript(prev => prev?.id === scriptId ? { ...prev, isRunning: true, status: 'running' } : prev);
      
      // TODO: Implement actual script execution
      setTimeout(() => {
        setScripts(scripts.map(s => 
          s.id === scriptId 
            ? { ...s, isRunning: false, status: 'success', lastRunResult: {
                success: true,
                output: 'Script executed successfully',
                timestamp: new Date()
              } }
            : s
        ));
        setCurrentScript(prev => prev?.id === scriptId ? { 
          ...prev, 
          isRunning: false, 
          status: 'success',
          lastRunResult: {
            success: true,
            output: 'Script executed successfully',
            timestamp: new Date()
          }
        } : prev);
      }, 2000);
    }
  };

  // 统一自动保存入口（核心）
  const applyUpdateAndAutoSave = (caseId: string, updater: (c: TestCase) => TestCase) => {
    const updatedTestCases = updateCaseById(testCases, caseId, updater);
    setTestCases(updatedTestCases);
    
    // 找到被更新用例的顶层父用例
    const topLevelCase = getTopLevelParent(caseId, updatedTestCases);
    if (topLevelCase) {
      scheduleAutoSave(topLevelCase);
    }
  };

  console.log('TestCaseManager rendered with modular layout', { currentTestCase, testCases });
    let insertAtIndex: number | undefined;
    
    // 如果有上下文菜单状态，使用精确插入
    if (contextMenu.visible && contextMenu.parentCaseId) {
      targetCaseId = contextMenu.parentCaseId;
      // 如果有插入索引，在当前项目后插入
      if (contextMenu.insertIndex !== undefined) {
        insertAtIndex = contextMenu.insertIndex + 1;
      }
    } else {
      // 回退到原有逻辑：检查是否选中了子用例
      targetCaseId = selectedTestCaseId && selectedTestCaseId !== currentTestCase.id ? selectedTestCaseId : currentTestCase.id;
    }
    
    const newCommand: TestCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'execution',
      command: 'AT',
      validationMethod: 'none',
      waitTime: 1000,
      stopOnFailure: false,
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    };

    let updatedTestCases: TestCase[];
    
    if (insertAtIndex !== undefined) {
      // 在指定位置插入
      updatedTestCases = updateCaseById(testCases, targetCaseId, (testCase) => {
        const newCommands = [...testCase.commands];
        newCommands.splice(insertAtIndex, 0, newCommand);
        return {
          ...testCase,
          commands: newCommands
        };
      });
    } else {
      // 添加到末尾
      updatedTestCases = updateCaseById(testCases, targetCaseId, (testCase) => ({
        ...testCase,
        commands: [...testCase.commands, newCommand]
      }));
    }
    
    setTestCases(updatedTestCases);

    const targetCase = findTestCaseById(targetCaseId, testCases);
    const targetCaseName = targetCase ? targetCase.name : '未知用例';

    toast({
      title: "新增命令",
      description: `已在 ${targetCaseName} 中添加新命令: ${newCommand.command}`,
    });
    
    // 清除上下文菜单状态
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const addUrcViaContextMenu = () => {
    if (!currentTestCase) return;
    
    // 确定目标用例和插入位置
    let targetCaseId: string;
    let insertAtIndex: number | undefined;
    
    // 如果有上下文菜单状态，使用精确插入
    if (contextMenu.visible && contextMenu.parentCaseId) {
      targetCaseId = contextMenu.parentCaseId;
      // 如果有插入索引，在当前项目后插入
      if (contextMenu.insertIndex !== undefined) {
        insertAtIndex = contextMenu.insertIndex + 1;
      }
    } else {
      // 回退到原有逻辑：检查是否选中了子用例
      targetCaseId = selectedTestCaseId && selectedTestCaseId !== currentTestCase.id ? selectedTestCaseId : currentTestCase.id;
    }
    
    const newUrc: TestCommand = {
      id: `urc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'urc',
      command: 'URC监听',
      validationMethod: 'none',
      waitTime: 0,
      stopOnFailure: false,
      lineEnding: 'none',
      selected: true,
      status: 'pending',
      urcPattern: '+CREG:',
      urcMatchMode: 'startsWith',
      urcListenMode: 'once',
      urcListenTimeout: 10000,
      urcFailureHandling: 'stop'
    };

    let updatedTestCases: TestCase[];
    
    if (insertAtIndex !== undefined) {
      // 在指定位置插入
      updatedTestCases = updateCaseById(testCases, targetCaseId, (testCase) => {
        const newCommands = [...testCase.commands];
        newCommands.splice(insertAtIndex, 0, newUrc);
        return {
          ...testCase,
          commands: newCommands
        };
      });
    } else {
      // 添加到末尾
      updatedTestCases = updateCaseById(testCases, targetCaseId, (testCase) => ({
        ...testCase,
        commands: [...testCase.commands, newUrc]
      }));
    }
    
    setTestCases(updatedTestCases);

    const targetCase = findTestCaseById(targetCaseId, testCases);
    const targetCaseName = targetCase ? targetCase.name : '未知用例';

    toast({
      title: "新增URC",
      description: `已在 ${targetCaseName} 中添加URC监听: ${newUrc.urcPattern}`,
    });
    
    // 清除上下文菜单状态
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // 新建子用例 - 通过右键菜单，支持层级检查
  const addSubCaseViaContextMenu = () => {
    if (!currentTestCase) return;
    
    // 确定目标用例和插入位置
    let targetCaseId: string;
    let insertAtIndex: number | undefined;
    
    // 如果有上下文菜单状态，使用精确插入
    if (contextMenu.visible && contextMenu.parentCaseId) {
      targetCaseId = contextMenu.parentCaseId;
      // 如果有插入索引，在当前项目后插入
      if (contextMenu.insertIndex !== undefined) {
        insertAtIndex = contextMenu.insertIndex + 1;
      }
    } else {
      // 回退到原有逻辑：检查是否选中了子用例
      targetCaseId = selectedTestCaseId && selectedTestCaseId !== currentTestCase.id ? selectedTestCaseId : currentTestCase.id;
    }
    
    // 检查嵌套层级限制
    if (!canAddSubCase(targetCaseId, testCases)) {
      toast({
        title: "无法添加子用例",
        description: "已达到最大嵌套层级（3层）限制",
        variant: "destructive"
      });
      setContextMenu(prev => ({ ...prev, visible: false }));
      return;
    }
    
    const newSubCase: TestCase = {
      id: `subcase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uniqueId: generateUniqueId(),
      name: '新建子用例',
      description: '',
      commands: [],
      subCases: [],
      isExpanded: true,
      isRunning: false,
      currentCommand: -1,
      selected: false,
      status: 'pending',
      failureStrategy: 'stop',
      onWarningFailure: 'continue',
      onErrorFailure: 'stop'
    };

    const updatedTestCases = addSubCaseById(testCases, targetCaseId, newSubCase);
    setTestCases(updatedTestCases);
    
    const targetCase = findTestCaseById(targetCaseId, testCases);
    const targetCaseName = targetCase ? targetCase.name : '未知用例';
    
    // 保存更新后的用例
    const updatedCase = findTestCaseById(targetCaseId, updatedTestCases);
    if (updatedCase) {
      scheduleAutoSave(updatedCase);
    }

    toast({
      title: "新建子用例",
      description: `已在 ${targetCaseName} 中添加子用例: ${newSubCase.name}`,
    });
    
    // 清除上下文菜单状态
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // 全选/取消全选 - 通过右键菜单
  const toggleSelectAllViaContextMenu = () => {
    if (!currentTestCase) return;

    let targetCase: TestCase = currentTestCase;
    let targetCommands: TestCommand[] = [];
    let scopeDescription = "当前用例";

    if (lastFocusedChild) {
      if (lastFocusedChild.type === 'subcase') {
        // 如果选中的是子用例，全选该子用例内的所有命令
        const subCase = findTestCaseById(lastFocusedChild.itemId, testCases);
        if (subCase) {
          targetCase = subCase;
          targetCommands = subCase.commands;
          scopeDescription = `子用例"${subCase.name}"`;
        }
      } else if (lastFocusedChild.type === 'command') {
        // 如果选中的是命令，全选同级别的所有命令
        const parentCase = findTestCaseById(lastFocusedChild.caseId, testCases);
        if (parentCase) {
          targetCase = parentCase;
          targetCommands = parentCase.commands;
          scopeDescription = parentCase.id === currentTestCase.id ? "当前用例" : `子用例"${parentCase.name}"`;
        }
      }
    } else {
      // 什么都没选，全选当前用例的所有命令
      targetCommands = currentTestCase.commands;
    }

    if (targetCommands.length === 0) {
      toast({
        title: "无可选择项",
        description: `${scopeDescription}中没有命令可以选择`,
        variant: "default"
      });
      return;
    }

    // 检查是否全部已选中
    const allSelected = targetCommands.every(cmd => cmd.selected);
    const newSelectedState = !allSelected;

    // 更新选择状态
    const updatedTestCases = updateCaseById(testCases, targetCase.id, (testCase) => ({
      ...testCase,
      commands: testCase.commands.map(cmd => ({
        ...cmd,
        selected: newSelectedState
      }))
    }));

    setTestCases(updatedTestCases);

    toast({
      title: newSelectedState ? "全选完成" : "取消全选",
      description: `已${newSelectedState ? '选中' : '取消选中'}${scopeDescription}中的 ${targetCommands.length} 个命令`,
    });
  };

  // 运行选中项 - 通过右键菜单
  const runSelectedViaContextMenu = () => {
    if (!currentTestCase) return;

    if (lastFocusedChild) {
      if (lastFocusedChild.type === 'subcase') {
        // 运行选中的子用例
        const subCase = findTestCaseById(lastFocusedChild.itemId, testCases);
        if (subCase) {
          runTestCase(subCase.id);
          return;
        }
      } else if (lastFocusedChild.type === 'command') {
        // 运行选中命令所在的用例
        const parentCase = findTestCaseById(lastFocusedChild.caseId, testCases);
        if (parentCase) {
          runTestCase(parentCase.id);
          return;
        }
      }
    }

    // 默认运行当前用例
    runTestCase(currentTestCase.id);
  };

  const loadTestCaseToCurrentCase = (sourceCase: TestCase) => {
    if (!currentTestCase) return;

    const commandsToAdd = sourceCase.commands.map(cmd => ({
      ...cmd,
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      selected: false,
      status: 'pending' as const
    }));

    const updatedCommands = [...currentTestCase.commands, ...commandsToAdd];
    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
      ...testCase,
      commands: updatedCommands
    }));
    setTestCases(updatedTestCases);

    toast({
      title: "载入成功",
      description: `已载入 ${commandsToAdd.length} 个命令到当前用例`,
    });
  };

  // 深拷贝用例作为子用例
  const cloneCaseForSubcase = (src: TestCase): TestCase => {
    const cloneCmd = (cmd: TestCommand): TestCommand => ({
      ...cmd,
      id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      status: 'pending',
      selected: false
    });
    
    const cloneCase = (tc: TestCase): TestCase => ({
      ...tc,
      id: `case_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      uniqueId: '', // 子用例不需要唯一编号
      commands: tc.commands.map(cloneCmd),
      subCases: tc.subCases.map(cloneCase),
      isExpanded: false,
      isRunning: false,
      currentCommand: -1,
      selected: false,
      status: 'pending'
    });
    
    const cloned = cloneCase(src);
    cloned.uniqueId = generateUniqueId();
    return cloned;
  };

  // 以子用例方式载入到当前用例
  const loadTestCaseAsSubCaseToCurrentCase = (sourceCase: TestCase) => {
    if (!currentTestCase) {
      toast({
        title: "无法载入",
        description: "请先选择当前用例",
        variant: "destructive"
      });
      return;
    }
    
    const newSubCase = cloneCaseForSubcase(sourceCase);
    const updated = addSubCaseById(testCases, currentTestCase.id, newSubCase);
    setTestCases(updated);
    
    toast({
      title: "载入成功",
      description: `已以子用例方式载入：${sourceCase.name}`,
    });
  };

  // 从文件导入
  const importFromFile = (variant: 'merge' | 'subcase') => {
    if (!currentTestCase) {
      toast({
        title: "无法载入",
        description: "请先选择当前用例",
        variant: "destructive"
      });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string);
          let testCase: TestCase;

          // 检查是否为 PersistedTestCase 格式
          if (!jsonData.isRunning && !jsonData.currentCommand) {
            // 使用 fromPersistedCase 转换
            testCase = fromPersistedCase(jsonData);
          } else {
            // 假设是完整的 TestCase
            testCase = jsonData as TestCase;
          }

          if (variant === 'merge') {
            loadTestCaseToCurrentCase(testCase);
          } else {
            loadTestCaseAsSubCaseToCurrentCase(testCase);
          }
        } catch (error) {
          toast({
            title: "导入失败",
            description: "文件格式错误或不支持",
            variant: "destructive"
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // 检查是否有选中的命令或子用例
  const hasSelectedItems = (testCase: TestCase): boolean => {
    const hasSelectedCommands = testCase.commands.some(cmd => cmd.selected);
    const hasSelectedSubCases = testCase.subCases.some(subCase => subCase.selected);
    const hasSelectedInSubCases = testCase.subCases.some(subCase => hasSelectedItems(subCase));
    return hasSelectedCommands || hasSelectedSubCases || hasSelectedInSubCases;
  };

  const deleteSelectedCommands = () => {
    if (!currentTestCase) return;

    const countSelectedItems = (testCase: TestCase): { commands: number; cases: number } => {
      const selectedCommands = testCase.commands.filter(cmd => cmd.selected);
      const selectedSubCases = testCase.subCases.filter(subCase => subCase.selected);
      let totalCommands = selectedCommands.length;
      let totalCases = selectedSubCases.length;
      
      testCase.subCases.forEach(subCase => {
        const subCounts = countSelectedItems(subCase);
        totalCommands += subCounts.commands;
        totalCases += subCounts.cases;
      });
      
      return { commands: totalCommands, cases: totalCases };
    };

    const counts = countSelectedItems(currentTestCase);
    if (counts.commands === 0 && counts.cases === 0) {
      toast({
        title: "提示",
        description: "请先勾选要删除的命令或子用例",
      });
      return;
    }

    const removeSelectedItems = (testCase: TestCase): TestCase => ({
      ...testCase,
      commands: testCase.commands.filter(cmd => !cmd.selected),
      subCases: testCase.subCases
        .filter(subCase => !subCase.selected)
        .map(subCase => removeSelectedItems(subCase))
    });

    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, removeSelectedItems);
    setTestCases(updatedTestCases);

    let description = "";
    if (counts.commands > 0 && counts.cases > 0) {
      description = `已删除 ${counts.commands} 个命令和 ${counts.cases} 个子用例`;
    } else if (counts.commands > 0) {
      description = `已删除 ${counts.commands} 个命令`;
    } else {
      description = `已删除 ${counts.cases} 个子用例`;
    }

    globalToast({
      title: "删除成功",
      description: description
    });
  };

  const exportTestCase = () => {
    if (!currentTestCase) return;

    const dataStr = JSON.stringify(currentTestCase, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentTestCase.name}_${currentTestCase.uniqueId}.json`;
    link.click();
    
    URL.revokeObjectURL(url);

    toast({
      title: "导出成功",
      description: `测试用例已导出: ${currentTestCase.name}`,
    });
  };

  // 渲染子用例行（支持拖拽）
  const renderSubCaseRow = (subCase: TestCase, parentCaseId: string, level: number) => {
    const parentCase = findTestCaseById(parentCaseId, testCases);
    if (!parentCase) return null;
    
    const sortedChildren = getSortedChildren(parentCase);
    const childItem = sortedChildren.find(child => child.type === 'subcase' && (child.item as TestCase).id === subCase.id);
    if (!childItem) return null;
    
    const childIndex = sortedChildren.indexOf(childItem);
    const isDragging = dragInfo.draggedItem?.caseId === parentCaseId && dragInfo.draggedItem?.itemId === subCase.id;
    const isDropTarget = dragInfo.dropTarget?.caseId === parentCaseId && dragInfo.dropTarget?.index === childIndex;
    
    return (
      <div 
        key={subCase.id} 
        className={`p-3 hover:bg-muted/50 transition-colors cursor-move select-none ${
          isDragging ? 'opacity-50' : ''
        } ${
          isDropTarget && dragInfo.dropTarget?.position === 'above' ? 'border-t-2 border-primary' : ''
        } ${
          isDropTarget && dragInfo.dropTarget?.position === 'below' ? 'border-b-2 border-primary' : ''
        }`}
        draggable
        onDragStart={(e) => {
          setDragInfo(prev => ({
            ...prev,
            draggedItem: { caseId: parentCaseId, type: 'subcase', itemId: subCase.id, index: childIndex }
          }));
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', subCase.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          
          const rect = e.currentTarget.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          const position = e.clientY < midpoint ? 'above' : 'below';
          
          setDragInfo(prev => ({
            ...prev,
            dropTarget: { caseId: parentCaseId, index: childIndex, position }
          }));
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragInfo(prev => ({ ...prev, dropTarget: null }));
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          const { draggedItem, dropTarget } = dragInfo;
          
          if (draggedItem && dropTarget && draggedItem.caseId === dropTarget.caseId) {
            const targetCase = findTestCaseById(dropTarget.caseId, testCases);
            if (targetCase) {
              handleUnifiedReorder(targetCase, draggedItem.index, dropTarget.index, dropTarget.position);
            }
          }
          
          setDragInfo({ draggedItem: null, dropTarget: null });
        }}
      >
        <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 16}px` }}>

          {/* 复选框 */}
          <Checkbox
            checked={subCase.selected}
            onCheckedChange={(checked) => {
              const updatedTestCases = updateCaseById(testCases, subCase.id, (tc) => ({
                ...tc,
                selected: checked as boolean
              }));
              setTestCases(updatedTestCases);
            }}
            className="flex-shrink-0"
          />
          
          {/* 子用例内容 */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => {
              setSelectedTestCaseId(subCase.id);
              setLastFocusedChild({
                caseId: parentCaseId,
                type: 'subcase',
                itemId: subCase.id,
                index: childIndex
              });
            }}
          >
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm truncate ${
                selectedTestCaseId === subCase.id ? 'text-primary' : ''
              }`}>
                {subCase.name}
              </span>
            </div>
          </div>
          
          {/* 状态指示器 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusIcon(subCase.status)}
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => runTestCase(subCase.id)}
                    disabled={connectedPorts.length === 0}
                  >
                    <PlayCircle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>运行</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      const updatedTestCases = toggleExpandById(testCases, subCase.id);
                      setTestCases(updatedTestCases);
                    }}
                  >
                    {subCase.subCases.length > 0 || subCase.commands.length > 0 ? (
                      subCase.isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{subCase.isExpanded ? '折叠' : '展开'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    );
  };

  // 渲染测试用例节点
  const renderCaseNode = (testCase: TestCase, level: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    // 渲染用例行
    elements.push(
      <div key={testCase.id} className="p-2 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 12}px` }}>

          {/* 复选框 */}
          <Checkbox
            checked={testCase.selected}
            onCheckedChange={(checked) => {
              const updatedTestCases = updateCaseById(testCases, testCase.id, (tc) => ({
                ...tc,
                selected: checked as boolean
              }));
              setTestCases(updatedTestCases);
            }}
            className="flex-shrink-0 w-3.5 h-3.5"
          />
          
          {/* 用例内容 */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setSelectedTestCaseId(testCase.id)}
          >
            <div className="flex items-center gap-1.5">
              <span className={`font-medium text-xs truncate ${
                selectedTestCaseId === testCase.id ? 'text-primary' : ''
              }`}>
                {testCase.name}
              </span>
               

             </div>
          </div>
          
          {/* 状态指示器 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {getStatusIcon(testCase.status)}
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => runTestCase(testCase.id)}
                    disabled={connectedPorts.length === 0}
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>运行</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* 折叠展开按钮 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      const updatedTestCases = toggleExpandById(testCases, testCase.id);
                      setTestCases(updatedTestCases);
                    }}
                  >
                    {testCase.isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{testCase.isExpanded ? '折叠' : '展开'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
          </div>
        </div>
      </div>
    );

    // 渲染展开的内容（统一排序的命令和子用例）
    if (testCase.isExpanded) {
      const sortedChildren = getSortedChildren(testCase);
      
      sortedChildren.forEach((child, sortedIndex) => {
        if (child.type === 'command') {
          const command = child.item as TestCommand;
          const originalIndex = testCase.commands.findIndex(cmd => cmd.id === command.id);
          elements.push(
            <CommandRow
              key={command.id}
              command={command}
              caseId={testCase.id}
              commandIndex={originalIndex}
              level={level + 1}
              isDragging={dragInfo.draggedItem?.caseId === testCase.id && dragInfo.draggedItem?.itemId === command.id}
              isDropTarget={dragInfo.dropTarget?.caseId === testCase.id && dragInfo.dropTarget?.index === sortedIndex}
              dropPosition={dragInfo.dropTarget?.position || null}
              isExecuting={executingCommand.caseId === testCase.id && executingCommand.commandIndex === originalIndex}
              onDragStart={(e, caseId, type, itemId, index) => {
                setDragInfo(prev => ({
                  ...prev,
                  draggedItem: { caseId, type, itemId, index }
                }));
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', itemId);
              }}
              onDragOver={(e, caseId, index, position) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragInfo(prev => ({
                  ...prev,
                  dropTarget: { caseId, index, position }
                }));
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragInfo(prev => ({ ...prev, dropTarget: null }));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const { draggedItem, dropTarget } = dragInfo;
                
                if (draggedItem && dropTarget && draggedItem.caseId === dropTarget.caseId) {
                  const targetCase = findTestCaseById(dropTarget.caseId, testCases);
                  if (targetCase) {
                    handleUnifiedReorder(targetCase, draggedItem.index, dropTarget.index, dropTarget.position);
                  }
                } else if (draggedItem && dropTarget && draggedItem.caseId !== dropTarget.caseId) {
                  toast({
                    title: "不支持跨用例拖拽",
                    description: "只能在同一用例内重新排序"
                  });
                }
                
                setDragInfo({ draggedItem: null, dropTarget: null });
              }}
              onSelectCase={setSelectedTestCaseId}
              onUpdateCommandSelection={updateCommandSelection}
              onRunCommand={runCommand}
              onEditCommand={(caseId, commandIndex) => {
                setSelectedTestCaseId(caseId);
                setEditingCommandIndex(commandIndex);
              }}
              onSaveInlineEdit={saveInlineEdit}
              onSetLastFocusedChild={(caseId, type, itemId, index) => 
                setLastFocusedChild({ caseId, type, itemId, index })
              }
              onContextMenu={handleContextMenu}
              inlineEdit={inlineEdit}
              setInlineEdit={setInlineEdit}
            />
          );
        } else if (child.type === 'subcase') {
          const subCase = child.item as TestCase;
          elements.push(renderSubCaseRow(subCase, testCase.id, level + 1));
          
          // 如果子用例展开，递归渲染其内容
          if (subCase.isExpanded) {
            elements.push(...renderCaseNode(subCase, level + 2));
          }
        }
      });
    }
    
    return elements;
  };

  // 渲染统一树结构（顶级用例不显示，直接显示内容）
  const renderUnifiedTree = (cases: TestCase[], level: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    
    cases.forEach((testCase) => {
      // 对于顶级用例（level === 0），不渲染用例行本身，直接渲染其内容
      if (level === 0) {
        const sortedChildren = getSortedChildren(testCase);
        
        sortedChildren.forEach((child) => {
          if (child.type === 'command') {
            const command = child.item as TestCommand;
            const originalIndex = testCase.commands.findIndex(cmd => cmd.id === command.id);
            elements.push(
              <CommandRow
                key={command.id}
                command={command}
                caseId={testCase.id}
                commandIndex={originalIndex}
                level={0}
                isDragging={dragInfo.draggedItem?.caseId === testCase.id && dragInfo.draggedItem?.itemId === command.id}
                isDropTarget={dragInfo.dropTarget?.caseId === testCase.id && dragInfo.dropTarget?.index === child.index}
                dropPosition={dragInfo.dropTarget?.position || null}
                isExecuting={executingCommand.caseId === testCase.id && executingCommand.commandIndex === originalIndex}
                onDragStart={(e, caseId, type, itemId, index) => {
                  setDragInfo(prev => ({
                    ...prev,
                    draggedItem: { caseId, type, itemId, index }
                  }));
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', itemId);
                }}
                onDragOver={(e, caseId, index, position) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragInfo(prev => ({
                    ...prev,
                    dropTarget: { caseId, index, position }
                  }));
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragInfo(prev => ({ ...prev, dropTarget: null }));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const { draggedItem, dropTarget } = dragInfo;
                  
                  if (draggedItem && dropTarget && draggedItem.caseId === dropTarget.caseId) {
                    const targetCase = findTestCaseById(dropTarget.caseId, testCases);
                    if (targetCase) {
                      handleUnifiedReorder(targetCase, draggedItem.index, dropTarget.index, dropTarget.position);
                    }
                  } else if (draggedItem && dropTarget && draggedItem.caseId !== dropTarget.caseId) {
                    toast({
                      title: "不支持跨用例拖拽",
                      description: "只能在同一用例内重新排序"
                    });
                  }
                  
                  setDragInfo({ draggedItem: null, dropTarget: null });
                }}
                onSelectCase={setSelectedTestCaseId}
                onUpdateCommandSelection={updateCommandSelection}
                onRunCommand={runCommand}
                onEditCommand={(caseId, commandIndex) => {
                  setSelectedTestCaseId(caseId);
                  setEditingCommandIndex(commandIndex);
                }}
                onSaveInlineEdit={saveInlineEdit}
                onSetLastFocusedChild={(caseId, type, itemId, index) => 
                  setLastFocusedChild({ caseId, type, itemId, index })
                }
                onContextMenu={handleContextMenu}
                inlineEdit={inlineEdit}
                setInlineEdit={setInlineEdit}
              />
            );
          } else if (child.type === 'subcase') {
            const subCase = child.item as TestCase;
            elements.push(...renderCaseNode(subCase, level + 1));
          }
        });
      } else {
        // 对于非顶级用例，正常渲染
        elements.push(...renderCaseNode(testCase, level));
      }
    });
    
    return elements;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'running':
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />;
      case 'partial':
        return <AlertCircle className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/30 max-w-full overflow-hidden">
      {/* ========== 模块化测试页面布局 - 2024年版本 ========== */}
      
      {/* 1. 当前信息显示 */}
      <div className="flex-shrink-0 p-2 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        {/* 🎯 新模块化布局已激活 - 2024版本 */}
        {currentScript ? (
          // Script header
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  {currentScript.name}
                  <Badge variant="outline" className="text-xs h-5">
                    {currentScript.language.toUpperCase()}
                  </Badge>
                  <Badge 
                    variant={
                      currentScript.status === 'success' ? 'default' : 
                      currentScript.status === 'error' ? 'destructive' : 
                      currentScript.status === 'running' ? 'secondary' : 
                      'outline'
                    }
                    className="flex items-center gap-1 text-xs h-5"
                  >
                    {currentScript.status === 'success' && <CheckCircle className="w-3 h-3" />}
                    {currentScript.status === 'error' && <XCircle className="w-3 h-3" />}
                    {currentScript.status === 'running' && <AlertCircle className="w-3 h-3 animate-pulse" />}
                    {currentScript.status}
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground">
                  {currentScript.description || '无描述'}
                </p>
              </div>
            </div>
            
            {/* Script actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveScript(currentScript)}
                className="flex items-center gap-1 h-7 px-2"
              >
                <Save className="w-3.5 h-3.5" />
                保存
              </Button>
              
              <Button
                onClick={() => currentScript.isRunning ? handleStopScript(currentScript.id) : handleRunScript(currentScript.id)}
                disabled={currentScript.status === 'running'}
                variant={currentScript.isRunning ? "destructive" : "default"}
                size="sm"
                className="flex items-center gap-1 h-7 px-2"
              >
                {currentScript.isRunning ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    停止
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    运行
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Test case header
          <>
            <div className="flex items-center justify-between mb-2">
              <TestCaseHeader 
                currentTestCase={currentTestCase ? (getTopLevelParent(currentTestCase.id, state.testCases) || currentTestCase) : currentTestCase} 
                onUpdateCase={(caseId, updater) => {
                  // Implementation would use testCaseRecursiveUtils
                  console.log('Update case:', caseId);
                }}
              />
            </div>

            {/* 2. 操作栏 */}
            <TestCaseActions 
              currentTestCase={getTargetCaseForActions(currentTestCase)}
              testCases={state.testCases}
              setTestCases={setTestCases}
              connectedPorts={connectedPorts}
              onEditCase={handleEditCase}
              onRunTestCase={handleRunTestCase}
              onSync={() => {
                toast({
                  title: "同步功能",
                  description: "同步功能开发中...",
                });
              }}
              onDeleteTestCase={handleDeleteTestCase}
              onDeleteSelectedCommands={() => {
                // Implementation would use selection utils
                console.log('Delete selected commands');
              }}
              onDeletePresetCases={() => {
                // Implementation would use preset utils
                console.log('Delete preset cases');
              }}
              onSelectTestCase={handleSelectTestCase}
              onUpdateCase={(caseId, updater) => {
                // Implementation would use testCaseRecursiveUtils
                console.log('Update case:', caseId);
              }}
              hasSelectedItems={hasSelectedItems}
            />
          </>
        )}
      </div>

      {/* 3. 中间内容展示区 - 脚本编辑器或测试用例 */}
      {state.currentScript ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScriptEditor
            script={state.currentScript}
            onScriptUpdate={(updatedScript) => {
              setScripts(state.scripts.map(s => 
                s.id === updatedScript.id ? updatedScript : s
              ));
              setCurrentScript(updatedScript);
            }}
            onRunScript={handleRunScript}
            onStopScript={handleStopScript}
            onSaveScript={handleSaveScript}
            statusMessages={statusMessages}
          />
        </div>
      ) : (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              {state.testCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <TestTube2 className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">暂无测试用例，点击新建用例开始</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* 参数显示面板 - 根据设置显示 */}
                  {settings.testCaseSettings.showVariablePanel && Object.keys(state.storedParameters).length > 0 && (
                    <VariableDisplay
                      storedParameters={state.storedParameters}
                      onClearParameter={(key) => {
                        setStoredParameters(prev => {
                          const newParams = { ...prev };
                          delete newParams[key];
                          return newParams;
                        });
                        toast({
                          title: "参数已清除",
                          description: `已清除参数: ${key}`,
                        });
                      }}
                      onClearAll={() => {
                        setStoredParameters({});
                        toast({
                          title: "全部参数已清除",
                          description: "所有解析的参数已被清空",
                        });
                      }}
                    />
                  )}
                   
                  {/* 统一层级树 */}
                  <div className="border border-border rounded-lg bg-card">
                    <div className="divide-y divide-border">
                      {visibleRootCase ? renderUnifiedTree([visibleRootCase], 0) : []}
                    </div>
                  </div>
                </div>
              )}
            </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem onClick={addCommandViaContextMenu} className="flex items-center gap-2">
            <Hash className="w-4 h-4" />
            新建命令
          </ContextMenuItem>
          <ContextMenuItem onClick={addUrcViaContextMenu} className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            新建URC
          </ContextMenuItem>
          <ContextMenuItem onClick={addSubCaseViaContextMenu} className="flex items-center gap-2">
            <TestTube2 className="w-4 h-4" />
            新建子用例
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuSub>
            <ContextMenuSubTrigger className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              载入
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-64">
              <ContextMenuSub>
                <ContextMenuSubTrigger>载入到当前用例</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-72 max-h-64 overflow-y-auto">
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>自当前仓库</ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-64 max-h-64 overflow-y-auto">
                      {testCases.filter(tc => tc.id !== currentTestCase?.id).length > 0 ? (
                        testCases.filter(tc => tc.id !== currentTestCase?.id).map(testCase => (
                          <ContextMenuItem key={testCase.id} onClick={() => loadTestCaseToCurrentCase(testCase)} className="flex items-center justify-between">
                            <span className="truncate mr-2">{testCase.name}</span>
                            <span className="text-xs text-muted-foreground">#{testCase.uniqueId}</span>
                          </ContextMenuItem>
                        ))
                      ) : (
                        <ContextMenuItem disabled>暂无其他用例</ContextMenuItem>
                      )}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuItem onClick={() => importFromFile('merge')}>
                    自现有文件
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              
              <ContextMenuSub>
                <ContextMenuSubTrigger>以子用例方式载入到当前用例</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-72 max-h-64 overflow-y-auto">
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>自当前仓库</ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-64 max-h-64 overflow-y-auto">
                      {testCases.filter(tc => tc.id !== currentTestCase?.id).length > 0 ? (
                        testCases.filter(tc => tc.id !== currentTestCase?.id).map(testCase => (
                          <ContextMenuItem key={testCase.id} onClick={() => loadTestCaseAsSubCaseToCurrentCase(testCase)} className="flex items-center justify-between">
                            <span className="truncate mr-2">{testCase.name}</span>
                            <span className="text-xs text-muted-foreground">#{testCase.uniqueId}</span>
                          </ContextMenuItem>
                        ))
                      ) : (
                        <ContextMenuItem disabled>暂无其他用例</ContextMenuItem>
                      )}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuItem onClick={() => importFromFile('subcase')}>
                    自现有文件
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuSubContent>
          </ContextMenuSub>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem 
            onClick={toggleSelectAllViaContextMenu} 
            className="flex items-center gap-2"
            disabled={!currentTestCase || currentTestCase.commands.length === 0}
          >
            <CheckSquare className="w-4 h-4" />
            全选/取消全选
          </ContextMenuItem>
          
          <ContextMenuItem 
            onClick={runSelectedViaContextMenu} 
            className="flex items-center gap-2"
            disabled={!currentTestCase || connectedPorts.length === 0}
          >
            <Play className="w-4 h-4" />
            运行
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem 
            onClick={deleteSelectedCommands} 
            className="flex items-center gap-2 text-destructive"
            disabled={!currentTestCase}
          >
            <Trash2 className="w-4 h-4" />
            删除勾选的命令
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem 
            onClick={exportTestCase} 
            className="flex items-center gap-2"
            disabled={!currentTestCase}
          >
            <Download className="w-4 h-4" />
            导出用例到...
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      )}

      {/* 4. 测试用例切换区 */}
      <TestCaseSwitcher 
        testCases={state.testCases}
        currentTestCase={currentTestCase}
        onSelectTestCase={handleSelectTestCase}
        setTestCases={setTestCases}
        onDeleteTestCase={handleDeleteTestCase}
        onSync={() => {
          toast({
            title: "同步功能",
            description: "同步功能开发中...",
          });
        }}
        onWorkspaceChange={handleWorkspaceChange}
        scripts={state.scripts}
        currentScript={state.currentScript}
        onSelectScript={handleSelectScript}
        onCreateScript={handleCreateScript}
        onDeleteScript={handleDeleteScript}
      />

      {/* 编辑测试用例对话框 */}
      <CaseEditDialogInline
        isOpen={state.isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingCase={state.editingCase}
        setEditingCase={setEditingCase}
        onSave={(caseId, updatedCase) => {
          // Implementation would use testCaseRecursiveUtils
          console.log('Save case:', caseId, updatedCase.name);
          toast({
            title: "保存成功",
            description: "测试用例已更新",
          });
        }}
      />

      {/* 编辑命令对话框 */}
      <Dialog open={state.editingCommandIndex !== null} onOpenChange={() => setEditingCommandIndex(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {state.editingCommandIndex !== null && currentTestCase && 
                currentTestCase.commands[state.editingCommandIndex].type === 'execution' && '编辑命令配置'}
              {state.editingCommandIndex !== null && currentTestCase && 
                currentTestCase.commands[state.editingCommandIndex].type === 'urc' && '编辑URC配置'}
            </DialogTitle>
            <DialogDescription>
              配置详细属性，包括执行参数、验证规则、错误处理等
            </DialogDescription>
          </DialogHeader>
          
          {state.editingCommandIndex !== null && currentTestCase && (
            <div className="space-y-4">
              {currentTestCase.commands[state.editingCommandIndex].type === 'execution' && (
                <ExecutionEditor
                  command={currentTestCase.commands[state.editingCommandIndex]}
                  onUpdate={(updates) => {
                    // Implementation would use testCaseRecursiveUtils
                    console.log('Update execution command:', updates);
                  }}
                />
              )}
              {currentTestCase.commands[state.editingCommandIndex].type === 'urc' && (
                <UrcEditor
                  command={currentTestCase.commands[state.editingCommandIndex]}
                  onUpdate={(updates) => {
                    // Implementation would use testCaseRecursiveUtils
                    console.log('Update URC command:', updates);
                  }}
                  jumpOptions={{
                    // Implementation would use testCaseNavigationUtils
                    commandOptions: []
                  }}
                />
              )}
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingCommandIndex(null)}>
                  取消
                </Button>
                <Button onClick={() => {
                  setEditingCommandIndex(null);
                  toast({
                    title: "保存成功",
                    description: "命令配置已更新",
                  });
                }}>
                  保存
                </Button>
              </div>
            </div>
          )}
          </DialogContent>
        </Dialog>

        {/* 执行结果对话框 */}
        <RunResultDialog
          isOpen={state.showRunResult}
          onClose={() => setShowRunResult(false)}
          result={state.runResult}
        />

        {/* 用户操作确认对话框 */}
        <AlertDialog open={state.userActionDialog.isOpen} onOpenChange={(open) => 
          setUserActionDialog(prev => ({ ...prev, isOpen: open }))
        }>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>操作前确认</AlertDialogTitle>
              <AlertDialogDescription>
                {state.userActionDialog.promptText}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel onClick={state.userActionDialog.onCancel}>
                取消
              </AlertDialogCancel>
              <AlertDialogAction onClick={state.userActionDialog.onConfirm}>
                开始执行
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* 失败处理提示对话框 */}
        <AlertDialog open={state.failurePromptDialog.isOpen} onOpenChange={(open) => 
          setFailurePromptDialog(prev => ({ ...prev, isOpen: open }))
        }>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>执行失败处理</AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-wrap">
                {state.failurePromptDialog.promptText}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel onClick={state.failurePromptDialog.onStop}>
                停止执行
              </AlertDialogCancel>
              <AlertDialogAction onClick={state.failurePromptDialog.onContinue}>
                继续执行
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };
              </div>
            </div>
          )}
          </DialogContent>
        </Dialog>

        {/* 执行结果对话框 */}
        <RunResultDialog
          isOpen={showRunResult}
          onClose={() => setShowRunResult(false)}
          result={runResult}
        />

        {/* 用户操作确认对话框 */}
        <AlertDialog open={userActionDialog.isOpen} onOpenChange={(open) => 
          setUserActionDialog(prev => ({ ...prev, isOpen: open }))
        }>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>操作前确认</AlertDialogTitle>
              <AlertDialogDescription>
                {userActionDialog.promptText}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel onClick={userActionDialog.onCancel}>
                取消
              </AlertDialogCancel>
              <AlertDialogAction onClick={userActionDialog.onConfirm}>
                开始执行
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* 失败处理提示对话框 */}
        <AlertDialog open={failurePromptDialog.isOpen} onOpenChange={(open) => 
          setFailurePromptDialog(prev => ({ ...prev, isOpen: open }))
        }>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>执行失败处理</AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-wrap">
                {failurePromptDialog.promptText}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel onClick={failurePromptDialog.onStop}>
                停止执行
              </AlertDialogCancel>
              <AlertDialogAction onClick={failurePromptDialog.onContinue}>
                继续执行
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };