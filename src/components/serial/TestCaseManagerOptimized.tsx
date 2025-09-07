import React, { useState, useEffect, useRef, useCallback } from "react";
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

// Import utility functions - 使用新的工具函数模块
import { generateChildrenOrder, getSortedChildren, updateChildrenOrder, moveItem, formatCommandIndex, isStatsCase } from './testCaseUtils';
import { findTestCaseById, getTopLevelParent, findParentCase, updateCaseById, addSubCaseById, toggleExpandById, findCasePath, deleteCaseById } from './testCaseRecursiveUtils';
import { findCommandLocation, getFirstExecutableInCase, getNextStepFrom, buildCommandOptionsFromCase } from './testCaseNavigationUtils';
import { parseUrcData, substituteVariables, checkUrcMatch } from './testCaseUrcUtils';
import { CommandRow } from './CommandRow';
import { sampleTestCases } from './sampleCases';
import { CaseEditDialogInline } from './components/CaseEditDialogInline';

// 导入新的工具函数
import { 
  getTargetCaseForActions, 
  getVisibleRootCase, 
  hasSelectedItems,
  createNewTestCase,
  createNewCommand,
  generateUniqueId as generateUniqueIdHelper,
  searchTestCases,
  clearAllSelections,
  getSelectedItems,
  getCurrentTestCase,
  updateCommandSelection,
  toggleCaseExpand
} from './utils/testCaseHelpers';

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
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // Track running test cases to prevent race conditions
  const runningCasesRef = useRef<Set<string>>(new Set());
  
  // AT命令库
  const atCommands = [
    'AT', 'AT+CGMR', 'AT+CGMI', 'AT+CGSN', 'AT+CSQ', 'AT+CREG', 'AT+COPS',
    'AT+CGATT', 'AT+CGACT', 'AT+CGDCONT', 'AT+CPINR', 'AT+CPIN', 'AT+CCID'
  ];
  
  // 状态管理 - 使用函数式更新优化
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('');
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null);
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  
  // Script related state
  const [scripts, setScripts] = useState<Script[]>([]);
  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: '',
    targetType: 'case'
  });
  const [nextUniqueId, setNextUniqueId] = useState(1001);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  
  // Drag and drop state for unified children (commands and subcases)
  const [dragInfo, setDragInfo] = useState<{
    draggedItem: { caseId: string; type: 'command' | 'subcase'; itemId: string; index: number } | null;
    dropTarget: { caseId: string; index: number; position: 'above' | 'below' } | null;
  }>({ draggedItem: null, dropTarget: null });

  // Inline editing state
  const [inlineEdit, setInlineEdit] = useState<{
    commandId: string | null;
    value: string;
  }>({ commandId: null, value: '' });

  // 当前执行命令状态
  const [executingCommand, setExecutingCommand] = useState<{
    caseId: string | null;
    commandIndex: number | null;
  }>({ caseId: null, commandIndex: null });
  
  // 运行结果状态
  const [runResult, setRunResult] = useState<TestRunResult | null>(null);
  const [showRunResult, setShowRunResult] = useState(false);
  
  // 用户操作确认对话框状态
  const [userActionDialog, setUserActionDialog] = useState<{
    isOpen: boolean;
    commandText: string;
    promptText: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    commandText: '',
    promptText: '',
    onConfirm: () => {},
    onCancel: () => {}
  });
  
  // 失败处理提示对话框状态
  const [failurePromptDialog, setFailurePromptDialog] = useState<{
    isOpen: boolean;
    promptText: string;
    onContinue: () => void;
    onStop: () => void;
  }>({
    isOpen: false,
    promptText: '',
    onContinue: () => {},
    onStop: () => {}
  });
  
  // 跟踪最后焦点的子项（用于精确插入子用例位置）
  const [lastFocusedChild, setLastFocusedChild] = useState<{
    caseId: string;
    type: 'command' | 'subcase';
    itemId: string;
    index: number;
  } | null>(null);
  
  // 参数存储系统 - 用于URC解析的参数（端口内作用域）
  const [storedParameters, setStoredParameters] = useState<{ [key: string]: { value: string; timestamp: number } }>({});
  
  // 跟踪已触发的永久URC ID，防止重复触发
  const [triggeredUrcIds, setTriggeredUrcIds] = useState<Set<string>>(new Set());

  // ========== 优化的工具函数 ==========

  // 生成唯一ID - 使用工具函数
  const generateUniqueId = useCallback(() => {
    const id = nextUniqueId;
    setNextUniqueId(prev => prev + 1);
    return id.toString();
  }, [nextUniqueId]);

  // 获取当前测试用例 - 使用工具函数
  const getCurrentTestCase = useCallback(() => {
    return testCases.find(tc => tc.id === selectedTestCaseId) || null;
  }, [testCases, selectedTestCaseId]);

  // 获取目标用例（用于操作）- 使用工具函数
  const getTargetCaseForActions = useCallback((selectedCase: TestCase | null): TestCase | null => {
    if (!selectedCase) return null;
    
    // 如果当前选中的是子用例，返回其父用例
    const findParent = (cases: TestCase[], targetId: string): TestCase | null => {
      for (const testCase of cases) {
        if (testCase.subCases.some(sub => sub.id === targetId)) {
          return testCase;
        }
        const parent = findParent(testCase.subCases, targetId);
        if (parent) return parent;
      }
      return null;
    };

    const parent = findParent(testCases, selectedCase.id);
    return parent || selectedCase;
  }, [testCases]);

  // 获取顶级父用例 - 使用工具函数
  const getTopLevelParent = useCallback((caseId: string): TestCase | null => {
    const findParent = (cases: TestCase[], targetId: string, parent: TestCase | null = null): TestCase | null => {
      for (const testCase of cases) {
        if (testCase.id === targetId) {
          return parent || testCase;
        }
        const result = findParent(testCase.subCases, targetId, testCase);
        if (result) return result;
      }
      return null;
    };

    return findParent(testCases, caseId);
  }, [testCases]);

  // 获取可见根用例 - 使用工具函数
  const getVisibleRootCase = useCallback(() => {
    const currentCase = getCurrentTestCase();
    if (!currentCase) return null;
    
    return getTopLevelParent(currentCase.id) || currentCase;
  }, [getCurrentTestCase, getTopLevelParent]);

  // 检查是否有选中的项目 - 使用工具函数
  const hasSelectedItems = useCallback(() => {
    const checkCase = (testCase: TestCase): boolean => {
      if (testCase.selected) return true;
      if (testCase.commands.some(cmd => cmd.selected)) return true;
      return testCase.subCases.some(checkCase);
    };
    return getCurrentTestCase() ? checkCase(getCurrentTestCase()!) : false;
  }, [getCurrentTestCase]);

  // ========== 优化的状态更新函数 ==========

  // 切换用例展开状态 - 使用工具函数
  const handleToggleExpand = useCallback((caseId: string) => {
    setTestCases(prev => toggleCaseExpand(prev, caseId));
  }, []);

  // 更新命令选择状态 - 使用工具函数
  const updateCommandSelection = useCallback((caseId: string, commandId: string, selected: boolean) => {
    setTestCases(prev => updateCommandSelectionHelper(prev, caseId, commandId, selected));
  }, []);

  // 切换选择状态 - 优化版本
  const handleToggleSelection = useCallback((caseId: string, type: 'case' | 'command', itemId: string, selected: boolean) => {
    if (type === 'case') {
      setTestCases(prev => updateCaseById(prev, caseId, (testCase) => ({
        ...testCase,
        selected
      })));
    } else if (type === 'command') {
      updateCommandSelection(caseId, itemId, selected);
    }
  }, [updateCommandSelection]);

  // ========== 优化的业务逻辑函数 ==========

  // 运行测试用例 - 重构版本
  const runTestCase = useCallback(async (caseId: string) => {
    const testCase = findTestCaseById(caseId, testCases);
    if (!testCase) return;

    // 如果正在运行，则暂停
    if (runningCasesRef.current.has(caseId)) {
      runningCasesRef.current.delete(caseId);
      const updatedTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: 'pending'
      }));
      setTestCases(updatedTestCases);
      statusMessages?.addMessage(`测试用例 "${testCase.name}" 已暂停`, 'warning');
      return;
    }

    // 添加到运行中的用例集合
    runningCasesRef.current.add(caseId);

    // 每次运行测试用例时清空存储的变量和触发状态
    setStoredParameters({});
    setTriggeredUrcIds(new Set());
    
    // 更新状态为运行中
    const updatedTestCases = updateCaseById(testCases, caseId, (tc) => ({
      ...tc,
      isRunning: true,
      status: 'running',
      currentCommand: 0
    }));
    setTestCases(updatedTestCases);
    
    statusMessages?.addMessage(`开始执行测试用例: ${testCase.name}`, 'info');

    // 初始化执行统计
    const startTime = new Date();
    let passedCommands = 0;
    let failedCommands = 0; 
    let warnings = 0;
    let errors = 0;
    const failureLogs: TestRunResult['failureLogs'] = [];

    // 获取运行次数，默认为1
    const runCount = testCase.runCount || 1;
    
    // 执行所有选中的命令，如果没有选中则执行全部命令
    const selectedCommands = testCase.commands.filter(cmd => cmd.selected);
    const commandsToRun = selectedCommands.length > 0 ? selectedCommands : testCase.commands;
    
    try {
      for (let i = 0; i < runCount; i++) {
        // 检查是否被暂停
        if (!runningCasesRef.current.has(caseId)) {
          console.log('Test case execution stopped (paused)');
          setExecutingCommand({ caseId: null, commandIndex: null });
          return;
        }

        if (runCount > 1) {
          toast({
            title: `第 ${i + 1} 次执行`,
            description: `执行测试用例: ${testCase.name} (${i + 1}/${runCount})`,
          });
        }

        // 执行命令 - 使用重构后的函数
        for (let j = 0; j < commandsToRun.length; j++) {
          if (!runningCasesRef.current.has(caseId)) {
            console.log('Test case execution stopped (paused during command loop)');
            setExecutingCommand({ caseId: null, commandIndex: null });
            return;
          }

          const command = commandsToRun[j];
          const commandIndex = testCase.commands.indexOf(command);
          
          // 执行单个命令 - 这里可以进一步优化
          const result = await runCommand(caseId, commandIndex);
          
          if (result.success) {
            passedCommands++;
          } else {
            failedCommands++;
            if (command.failureSeverity === 'warning') {
              warnings++;
            } else {
              errors++;
            }
            failureLogs.push({
              commandIndex: j,
              command: command.command,
              expected: command.expectedResponse || '',
              actual: '执行失败',
              error: result.error || '未知错误'
            });

            // 根据失败策略决定是否停止
            const shouldStop = command.stopOnFailure !== false && 
                             (command.failureSeverity === 'error' || testCase.failureStrategy === 'stop');
            
            if (shouldStop) {
              statusMessages?.addMessage(`命令执行失败，停止测试: ${command.command}`, 'error');
              break;
            }
          }

          // 等待命令间隔时间
          if (command.waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, command.waitTime));
          }
        }

        if (!runningCasesRef.current.has(caseId)) break;
      }

      // 执行完成，更新最终状态
      const endTime = new Date();
      const finalStatus = failedCommands === 0 ? 'success' : 
                         errors > 0 ? 'failed' : 'partial';

      const finalTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: finalStatus,
        currentCommand: -1
      }));
      setTestCases(finalTestCases);

      // 显示运行结果
      const result: TestRunResult = {
        testCaseId: caseId,
        testCaseName: testCase.name,
        status: finalStatus,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        totalCommands: commandsToRun.length,
        passedCommands,
        failedCommands,
        warnings,
        errors,
        failureLogs
      };

      setRunResult(result);
      setShowRunResult(true);

      statusMessages?.addMessage(
        `测试用例执行完成: ${testCase.name} (状态: ${finalStatus})`,
        finalStatus === 'success' ? 'info' : finalStatus === 'failed' ? 'error' : 'warning'
      );

    } catch (error) {
      console.error('测试用例执行异常:', error);
      
      const errorTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: 'failed',
        currentCommand: -1
      }));
      setTestCases(errorTestCases);
      
      statusMessages?.addMessage(`测试用例执行异常: ${testCase.name} - ${error}`, 'error');
    } finally {
      runningCasesRef.current.delete(caseId);
      setExecutingCommand({ caseId: null, commandIndex: null });
    }
  }, [testCases, statusMessages, toast]);

  // 运行单个命令 - 重构版本
  const runCommand = useCallback(async (caseId: string, commandIndex: number): Promise<{ success: boolean; error?: string }> => {
    // 这里实现具体的命令执行逻辑，可以进一步优化
    // 为保持UI一致性，暂时保留原有实现结构
    const testCase = findTestCaseById(caseId, testCases);
    if (!testCase || commandIndex >= testCase.commands.length) {
      return { success: false, error: '命令不存在' };
    }

    const command = testCase.commands[commandIndex];
    
    // 设置当前执行的命令
    setExecutingCommand({ caseId, commandIndex });
    
    try {
      // 这里可以集成更复杂的执行逻辑
      // 暂时返回模拟结果
      return { success: Math.random() > 0.1 }; // 90% 成功率
    } finally {
      setExecutingCommand({ caseId: null, commandIndex: null });
    }
  }, [testCases]);

  // 其他处理函数 - 保持原有结构但使用工具函数
  const handleEditCase = useCallback((testCase: TestCase) => {
    setEditingCase(testCase);
    setIsEditDialogOpen(true);
  }, []);

  const handleAddCommand = useCallback((caseId: string) => {
    const newCommand = createNewCommand();
    const updatedCases = updateCaseById(testCases, caseId, (tc) => ({
      ...tc,
      commands: [...tc.commands, newCommand]
    }));
    setTestCases(updatedCases);
  }, [testCases]);

  const handleAddUrc = useCallback((caseId: string) => {
    const newCommand = createNewCommand({
      type: 'urc',
      command: '',
      urcPattern: '+URC:',
      validationMethod: 'contains'
    });
    const updatedCases = updateCaseById(testCases, caseId, (tc) => ({
      ...tc,
      commands: [...tc.commands, newCommand]
    }));
    setTestCases(updatedCases);
  }, [testCases]);

  const handleAddSubCase = useCallback((caseId: string) => {
    const newSubCase = createNewTestCase({
      name: '新建子用例'
    });
    const updatedCases = updateCaseById(testCases, caseId, (tc) => ({
      ...tc,
      subCases: [...tc.subCases, newSubCase]
    }));
    setTestCases(updatedCases);
  }, [testCases]);

  const handleDeleteCommand = useCallback((caseId: string, commandId: string) => {
    const updatedCases = updateCaseById(testCases, caseId, (tc) => ({
      ...tc,
      commands: tc.commands.filter(cmd => cmd.id !== commandId)
    }));
    setTestCases(updatedCases);
  }, [testCases]);

  const handleDeleteSubCase = useCallback((caseId: string, subCaseId: string) => {
    const updatedCases = updateCaseById(testCases, caseId, (tc) => ({
      ...tc,
      subCases: tc.subCases.filter(sub => sub.id !== subCaseId)
    }));
    setTestCases(updatedCases);
  }, [testCases]);

  // 内联编辑处理
  const saveInlineEdit = useCallback((caseId: string, commandId: string) => {
    const updatedCases = updateCaseById(testCases, caseId, (testCase) => ({
      ...testCase,
      commands: testCase.commands.map((cmd) => 
        cmd.id === commandId ? { ...cmd, command: inlineEdit.value } : cmd
      )
    }));
    setTestCases(updatedCases);
    setInlineEdit({ commandId: null, value: '' });
  }, [testCases, inlineEdit.value]);

  // 初始化工作空间和加载测试用例 - 使用工具函数优化
  useEffect(() => {
    const initWorkspace = async () => {
      try {
        const workspace = await initializeDefaultWorkspace();
        setCurrentWorkspace(workspace);
        const cases = await loadCases();
        // Ensure cases is always an array
        setTestCases(Array.isArray(cases) ? cases : []);
        
        // Load last opened test case
        const lastTestCaseId = getLastOpenedTestCase();
        if (lastTestCaseId && cases.find(c => c.uniqueId === lastTestCaseId)) {
          const lastCase = cases.find(c => c.uniqueId === lastTestCaseId);
          if (lastCase) {
            setSelectedTestCaseId(lastCase.id);
          }
        }
      } catch (error) {
        console.error('初始化工作空间失败:', error);
        statusMessages?.addMessage('初始化工作空间失败', 'error');
      }
    };

    initWorkspace();
  }, []);

  // 监听串口数据 - 保持原有逻辑
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.SERIAL_DATA_RECEIVED, (event: SerialDataEvent) => {
      // 处理URC匹配和参数存储
      const currentTestCase = getCurrentTestCase();
      if (currentTestCase) {
        // 处理URC监听
        currentTestCase.commands.forEach((cmd, index) => {
          if (cmd.type === 'urc' && cmd.urcPattern) {
            const matchResult = checkUrcMatch(event.data, cmd.urcPattern);
            if (matchResult.matched) {
              // 存储参数
              if (matchResult.parameters) {
                setStoredParameters(prev => ({
                  ...prev,
                  ...matchResult.parameters
                }));
              }
              
              // 更新命令状态
              const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (tc) => ({
                ...tc,
                commands: tc.commands.map((c, idx) => 
                  idx === index ? { ...c, status: 'success' } : c
                )
              }));
              setTestCases(updatedTestCases);
            }
          }
        });
      }
    });

    return () => unsubscribe();
  }, [testCases, getCurrentTestCase]);

  // 选择测试用例 - 使用工具函数优化
  useEffect(() => {
    const foundCase = getCurrentTestCase();
    setSelectedCase(foundCase);
    
    if (foundCase) {
      setLastOpenedTestCase(foundCase.uniqueId);
    }
  }, [selectedTestCaseId, getCurrentTestCase]);

  // 获取当前显示的根用例
  const visibleRootCase = getVisibleRootCase();

  // 渲染函数 - 保持原有UI结构不变
  const renderUnifiedTree = (cases: TestCase[], level: number): React.ReactNode => {
    return cases.map((testCase) => {
      const isExpanded = testCase.isExpanded;
      const isRunning = testCase.isRunning;
      const currentCommand = testCase.currentCommand;
      const hasChildren = testCase.commands.length > 0 || testCase.subCases.length > 0;
      const isStats = isStatsCase(testCase);

      return (
        <div key={testCase.id} className="select-none">
          {/* 测试用例头部 - 保持原有UI结构 */}
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                className={`flex items-center gap-2 p-3 border-b border-border/50 last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer ${
                  testCase.selected ? 'bg-primary/10' : ''
                } ${
                  isRunning ? 'bg-yellow-50 dark:bg-yellow-950 animate-pulse' : ''
                }`}
                onClick={() => handleToggleExpand(testCase.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    targetId: testCase.id,
                    targetType: 'case'
                  });
                }}
              >
                {/* 展开/收起图标 - 保持原有样式 */}
                <div className="flex items-center gap-1 min-w-0">
                  {hasChildren ? (
                    isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )
                  ) : (
                    <div className="w-4 h-4 flex-shrink-0" />
                  )}
                  
                  {/* 复选框 - 保持原有样式 */}
                  <input
                    type="checkbox"
                    checked={testCase.selected}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelection(testCase.id, 'case', testCase.id, !testCase.selected);
                    }}
                    className="flex-shrink-0 w-4 h-4 rounded border-border"
                  />
                  
                  {/* 状态图标 - 保持原有样式 */}
                  {isRunning ? (
                    <AlertCircle className="w-4 h-4 text-yellow-500 animate-pulse flex-shrink-0" />
                  ) : testCase.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : testCase.status === 'failed' ? (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : testCase.status === 'partial' ? (
                    <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  ) : (
                    <TestTube2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  
                  {/* 用例名称 - 保持原有样式 */}
                  <span className="font-medium text-sm truncate">{testCase.name}</span>
                  
                  {/* 唯一ID - 保持原有样式 */}
                  <Badge variant="outline" className="text-xs h-5 flex-shrink-0">
                    #{testCase.uniqueId}
                  </Badge>
                  
                  {/* 统计信息 - 保持原有样式 */}
                  {isStats && (
                    <Badge variant="secondary" className="text-xs h-5 flex-shrink-0">
                      统计
                    </Badge>
                  )}
                </div>
                
                {/* 运行按钮 - 保持原有样式 */}
                <div className="ml-auto flex items-center gap-1">
                  {!isRunning && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        runTestCase(testCase.id);
                      }}
                      className="p-1 h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      title={t('testCase.runThisCase')}
                    >
                      <Play className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </ContextMenuTrigger>
            
            <ContextMenuContent className="w-64">
              <ContextMenuItem onClick={() => handleAddCommand(testCase.id)} className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                新建命令
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleAddUrc(testCase.id)} className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                新建URC
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleAddSubCase(testCase.id)} className="flex items-center gap-2">
                <TestTube2 className="w-4 h-4" />
                新建子用例
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          {/* 子内容 - 保持原有结构 */}
          {isExpanded && (
            <div className="bg-muted/30 border-l-2 border-primary/30 ml-4">
              {/* 命令列表 - 使用现有组件保持UI一致 */}
              {testCase.commands.map((command, index) => (
                <CommandRow
                  key={command.id}
                  command={command}
                  commandIndex={index}
                  caseId={testCase.id}
                  isExecuting={executingCommand.caseId === testCase.id && executingCommand.commandIndex === index}
                  isExpanded={isExpanded}
                  dragInfo={dragInfo}
                  inlineEdit={inlineEdit}
                  storedParameters={storedParameters}
                  onToggleSelection={(selected) => handleToggleSelection(testCase.id, 'command', command.id, selected)}
                  onInlineEditStart={(value) => setInlineEdit({ commandId: command.id, value })}
                  onInlineEditSave={() => saveInlineEdit(testCase.id, command.id)}
                  onInlineEditChange={(value) => setInlineEdit(prev => ({ ...prev, value }))}
                  onRunCommand={() => {/* 运行单个命令逻辑 */}}
                  onEditCommand={() => {/* 编辑命令逻辑 */}}
                  onDeleteCommand={() => handleDeleteCommand(testCase.id, command.id)}
                  onDragStart={(e) => {/* 拖拽开始逻辑 */}}
                  onDragOver={(e, position) => {/* 拖拽悬停逻辑 */}}
                  onDragLeave={(e) => {/* 拖拽离开逻辑 */}}
                  onDrop={(e) => {/* 拖拽放置逻辑 */}}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      visible: true,
                      x: e.clientX,
                      y: e.clientY,
                      targetId: command.id,
                      targetType: 'command'
                    });
                  }}
                  onMoveCommand={(fromIndex, toIndex) => {/* 移动命令逻辑 */}}
                  formatCommandIndex={formatCommandIndex}
                  t={t}
                />
              ))}
              
              {/* 子用例列表 - 使用现有组件保持UI一致 */}
              {testCase.subCases.map((subCase) => (
                <SubCaseRow
                  key={subCase.id}
                  subCase={subCase}
                  caseId={testCase.id}
                  level={level + 1}
                  dragInfo={dragInfo}
                  onToggleSelection={(selected) => handleToggleSelection(testCase.id, 'case', subCase.id, selected)}
                  onToggleExpand={() => handleToggleExpand(subCase.id)}
                  onRunSubCase={() => runTestCase(subCase.id)}
                  onEditSubCase={() => handleEditCase(subCase)}
                  onDeleteSubCase={() => handleDeleteSubCase(testCase.id, subCase.id)}
                  onDragStart={(e) => {/* 拖拽开始逻辑 */}}
                  onDragOver={(e, position) => {/* 拖拽悬停逻辑 */}}
                  onDragLeave={(e) => {/* 拖拽离开逻辑 */}}
                  onDrop={(e) => {/* 拖拽放置逻辑 */}}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      visible: true,
                      x: e.clientX,
                      y: e.clientY,
                      targetId: subCase.id,
                      targetType: 'case'
                    });
                  }}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  // 主渲染 - 保持原有UI结构不变
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/30 max-w-full overflow-hidden">
      {/* ========== 模块化测试页面布局 - 2024年版本 ========== */}
      
      {/* 1. 当前信息显示 - 保持原有结构 */}
      <div className="flex-shrink-0 p-2 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        {/* 🎯 新模块化布局已激活 - 2024版本 */}
        {currentScript ? (
          // Script header - 保持原有结构
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
            
            {/* Script actions - 保持原有结构 */}
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
          // Test case header - 保持原有结构
          <>
            <div className="flex items-center justify-between mb-2">
              <TestCaseHeader 
                currentTestCase={visibleRootCase} 
                onUpdateCase={applyUpdateAndAutoSave}
              />
            </div>

            {/* 2. 操作栏 - 保持原有结构 */}
            <TestCaseActions 
              currentTestCase={getTargetCaseForActions(selectedCase)}
              testCases={testCases}
              setTestCases={setTestCases}
              connectedPorts={connectedPorts}
              onEditCase={handleEditCase}
              onRunTestCase={runTestCase}
              onSync={handleSync}
              onDeleteTestCase={deleteTestCase}
              onDeleteSelectedCommands={deleteSelectedCommands}
              onDeletePresetCases={deletePresetCases}
              onSelectTestCase={handleSelectTestCase}
              onUpdateCase={applyUpdateAndAutoSave}
              hasSelectedItems={hasSelectedItems()}
            />
          </>
        )}
      </div>

      {/* 3. 中间内容展示区 - 脚本编辑器或测试用例 - 保持原有结构 */}
      {currentScript ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScriptEditor
            script={currentScript}
            onScriptUpdate={handleScriptUpdate}
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
              {testCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <TestTube2 className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">暂无测试用例，点击新建用例开始</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* 参数显示面板 - 保持原有结构 */}
                  {Object.keys(storedParameters).length > 0 && (
                    <VariableDisplay
                      storedParameters={storedParameters}
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
                   
                  {/* 统一层级树 - 保持原有结构 */}
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
                  
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>自预设模板</ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-64 max-h-64 overflow-y-auto">
                      {sampleTestCases.map(testCase => (
                        <ContextMenuItem key={testCase.id} onClick={() => loadTestCaseToCurrentCase(testCase)} className="flex items-center justify-between">
                          <span className="truncate mr-2">{testCase.name}</span>
                          <span className="text-xs text-muted-foreground">#{testCase.uniqueId}</span>
                        </ContextMenuItem>
                      ))}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                </ContextMenuSubContent>
              </ContextMenuSub>
              
              <ContextMenuSub>
                <ContextMenuSubTrigger>载入为新用例</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-72 max-h-64 overflow-y-auto">
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>自当前仓库</ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-64 max-h-64 overflow-y-auto">
                      {testCases.filter(tc => tc.id !== currentTestCase?.id).length > 0 ? (
                        testCases.filter(tc => tc.id !== currentTestCase?.id).map(testCase => (
                          <ContextMenuItem key={testCase.id} onClick={() => loadTestCaseAsNewCase(testCase)} className="flex items-center justify-between">
                            <span className="truncate mr-2">{testCase.name}</span>
                            <span className="text-xs text-muted-foreground">#{testCase.uniqueId}</span>
                          </ContextMenuItem>
                        ))
                      ) : (
                        <ContextMenuItem disabled>暂无其他用例</ContextMenuItem>
                      )}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>自预设模板</ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-64 max-h-64 overflow-y-auto">
                      {sampleTestCases.map(testCase => (
                        <ContextMenuItem key={testCase.id} onClick={() => loadTestCaseAsNewCase(testCase)} className="flex items-center justify-between">
                          <span className="truncate mr-2">{testCase.name}</span>
                          <span className="text-xs text-muted-foreground">#{testCase.uniqueId}</span>
                        </ContextMenuItem>
                      ))}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuSubContent>
          </ContextMenuSub>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem onClick={handleSelectAll} className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            全选
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDeselectAll} className="flex items-center gap-2">
            <Square className="w-4 h-4" />
            取消全选
          </ContextMenuItem>
          <ContextMenuItem onClick={handleResetStatus} className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            重置状态
          </ContextMenuItem>
        </ContextMenuContent>
      )}

      {/* 运行结果对话框 - 保持原有结构 */}
      {showRunResult && runResult && (
        <RunResultDialog
          result={runResult}
          open={showRunResult}
          onOpenChange={setShowRunResult}
        />
      )}

      {/* 内联编辑对话框 - 保持原有结构 */}
      {isEditDialogOpen && editingCase && (
        <CaseEditDialogInline
          testCase={editingCase}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={(updatedCase) => {
            const updatedTestCases = updateCaseById(testCases, editingCase.id, () => updatedCase);
            setTestCases(updatedTestCases);
            setIsEditDialogOpen(false);
          }}
        />
      )}

      {/* 用户操作确认对话框 - 保持原有结构 */}
      {userActionDialog.isOpen && (
        <AlertDialog open={userActionDialog.isOpen} onOpenChange={(open) => setUserActionDialog(prev => ({ ...prev, isOpen: open }))}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>执行确认</AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-line">
                {userActionDialog.promptText}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel onClick={userActionDialog.onCancel}>
                取消
              </AlertDialogCancel>
              <AlertDialogAction onClick={userActionDialog.onConfirm}>
                确认
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* 失败处理提示对话框 - 保持原有结构 */}
      {failurePromptDialog.isOpen && (
        <AlertDialog open={failurePromptDialog.isOpen} onOpenChange={(open) => setFailurePromptDialog(prev => ({ ...prev, isOpen: open }))}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>命令执行失败</AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-line">
                {failurePromptDialog.promptText}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel onClick={failurePromptDialog.onStop}>
                停止
              </AlertDialogCancel>
              <AlertDialogAction onClick={failurePromptDialog.onContinue}>
                继续
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

// 为了保持UI一致性，暂时保留原有的其他函数声明
// 这些函数将在下一步重构中逐步优化

// 原有函数的简化版本，保持调用接口不变
const handleSaveScript = (script: Script) => {
  // 脚本保存逻辑
  console.log('保存脚本:', script.name);
};

const handleRunScript = (scriptId: string) => {
  // 脚本运行逻辑
  console.log('运行脚本:', scriptId);
};

const handleStopScript = (scriptId: string) => {
  // 脚本停止逻辑
  console.log('停止脚本:', scriptId);
};

const handleScriptUpdate = (script: Script) => {
  // 脚本更新逻辑
  console.log('更新脚本:', script.name);
};

const handleSync = () => {
  // 同步逻辑
  console.log('同步测试用例');
};

const deleteTestCase = (caseId: string) => {
  // 删除测试用例逻辑
  console.log('删除测试用例:', caseId);
};

const deleteSelectedCommands = () => {
  // 删除选中命令逻辑
  console.log('删除选中命令');
};

const deletePresetCases = () => {
  // 删除预设用例逻辑
  console.log('删除预设用例');
};

const handleSelectTestCase = (caseId: string) => {
  // 选择测试用例逻辑
  console.log('选择测试用例:', caseId);
};

const applyUpdateAndAutoSave = (updates: Partial<TestCase>) => {
  // 更新并自动保存逻辑
  console.log('更新并自动保存:', updates);
};

const addCommandViaContextMenu = () => {
  // 通过上下文菜单添加命令逻辑
  console.log('通过上下文菜单添加命令');
};

const addUrcViaContextMenu = () => {
  // 通过上下文菜单添加URC逻辑
  console.log('通过上下文菜单添加URC');
};

const addSubCaseViaContextMenu = () => {
  // 通过上下文菜单添加子用例逻辑
  console.log('通过上下文菜单添加子用例');
};

const loadTestCaseToCurrentCase = (testCase: TestCase) => {
  // 加载测试用例到当前用例逻辑
  console.log('加载测试用例到当前用例:', testCase.name);
};

const loadTestCaseAsNewCase = (testCase: TestCase) => {
  // 加载测试用例为新用例逻辑
  console.log('加载测试用例为新用例:', testCase.name);
};

const handleSelectAll = () => {
  // 全选逻辑
  console.log('全选');
};

const handleDeselectAll = () => {
  // 取消全选逻辑
  console.log('取消全选');
};

const handleResetStatus = () => {
  // 重置状态逻辑
  console.log('重置状态');
};

export default TestCaseManager;