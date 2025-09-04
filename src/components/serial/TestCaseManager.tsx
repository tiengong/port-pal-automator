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
  Hash
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { globalToast } from "@/hooks/useGlobalMessages";
import { useTranslation } from "react-i18next";
import { TestCaseHeader } from './TestCaseHeader';
import { TestCaseActions } from './TestCaseActions';
import { TestCaseSwitcher } from './TestCaseSwitcher';
import { ExecutionEditor } from './editors/ExecutionEditor';
import { UrcEditor } from './editors/UrcEditor';
import { VariableDisplay } from '../VariableDisplay';
import { RunResultDialog, TestRunResult } from './RunResultDialog';
import { TestCase, TestCommand, ExecutionResult, ContextMenuState } from './types';
import { eventBus, EVENTS, SerialDataEvent, SendCommandEvent } from '@/lib/eventBus';
import { initializeDefaultWorkspace, loadCases, saveCase, getCurrentWorkspace, fromPersistedCase, scheduleAutoSave, getLastOpenedTestCase, setLastOpenedTestCase } from './workspace';

// Import utility functions
import { generateChildrenOrder, getSortedChildren, updateChildrenOrder, moveItem, formatCommandIndex, isStatsCase } from './testCaseUtils';
import { findTestCaseById, getTopLevelParent, findParentCase, updateCaseById, addSubCaseById, toggleExpandById, findCasePath, deleteCaseById } from './testCaseRecursiveUtils';
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
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // Track running test cases to prevent race conditions
  const runningCasesRef = useRef<Set<string>>(new Set());
  
  // AT命令库
  const atCommands = [
    'AT', 'AT+CGMR', 'AT+CGMI', 'AT+CGSN', 'AT+CSQ', 'AT+CREG', 'AT+COPS',
    'AT+CGATT', 'AT+CGACT', 'AT+CGDCONT', 'AT+CPINR', 'AT+CPIN', 'AT+CCID'
  ];
  
  // 状态管理
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('');
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null);
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
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
  
  // Initialize workspace and load test cases
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
        } else if (cases.length > 0 && !selectedTestCaseId) {
          setSelectedTestCaseId(cases[0].id);
          setLastOpenedTestCase(cases[0].uniqueId);
        }
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
        globalToast({
          title: t("testCase.initFailed"),
          description: t("testCase.initFailedDesc"),
          variant: "destructive"
        });
      }
    };
    
    initWorkspace();
  }, []);
  
  // Handle workspace changes
  const handleWorkspaceChange = async () => {
    try {
      const workspace = getCurrentWorkspace();
      setCurrentWorkspace(workspace);
      const cases = await loadCases();
      // Ensure cases is always an array
      setTestCases(Array.isArray(cases) ? cases : []);
      
      // Load last opened test case for new workspace
      const lastTestCaseId = getLastOpenedTestCase();
      if (lastTestCaseId && cases.find(c => c.uniqueId === lastTestCaseId)) {
        const lastCase = cases.find(c => c.uniqueId === lastTestCaseId);
        if (lastCase) {
          setSelectedTestCaseId(lastCase.id);
        }
      } else {
        setSelectedTestCaseId(cases.length > 0 ? cases[0].id : '');
      }
    } catch (error) {
      console.error('Failed to reload workspace:', error);
    }
  };
  
  // Track selected test case changes and save last opened
  useEffect(() => {
    if (selectedTestCaseId && testCases.length > 0) {
      const selectedCase = testCases.find(c => c.id === selectedTestCaseId);
      if (selectedCase) {
        setLastOpenedTestCase(selectedCase.uniqueId);
      }
    }
  }, [selectedTestCaseId, testCases]);
  
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
  
  // 更新命令选中状态（支持嵌套）
  const updateCommandSelection = (caseId: string, commandId: string, selected: boolean) => {
    const updatedTestCases = updateCaseById(testCases, caseId, (testCase) => ({
      ...testCase,
      commands: testCase.commands.map(cmd =>
        cmd.id === commandId ? { ...cmd, selected } : cmd
      )
    }));
    setTestCases(updatedTestCases);
  };

  // 生成唯一编号
  const generateUniqueId = () => {
    const id = nextUniqueId.toString();
    setNextUniqueId(prev => prev + 1);
    return id;
  };

  // 保存内联编辑
  const saveInlineEdit = (caseId: string, commandId: string) => {
    if (inlineEdit.commandId === commandId && inlineEdit.value.trim()) {
      const updatedTestCases = updateCaseById(testCases, caseId, (testCase) => ({
        ...testCase,
        commands: testCase.commands.map(cmd =>
          cmd.id === commandId 
            ? { ...cmd, [cmd.type === 'urc' ? 'urcPattern' : 'command']: inlineEdit.value.trim() }
            : cmd
        )
      }));
      setTestCases(updatedTestCases);
      
      // 自动保存更新后的用例
      const updatedCase = findTestCaseById(caseId, testCases);
      if (updatedCase) {
        scheduleAutoSave(updatedCase);
      }
      
      toast({
        title: t("testCase.modifySuccess"),
        description: t("testCase.modifySuccessDesc")
      });
    }
    setInlineEdit({ commandId: null, value: '' });
  };

  // 获取用于操作的目标用例（统计用例使用其父用例）
  const getTargetCaseForActions = (selectedCase: TestCase | null): TestCase | null => {
    if (!selectedCase) return null;
    
    if (isStatsCase(selectedCase)) {
      const parent = findParentCase(selectedCase.id, testCases);
      return parent || selectedCase;
    }
    
    return selectedCase;
  };

  // 获取当前选中的测试用例（支持嵌套查找）
  const getCurrentTestCase = () => {
    // Ensure testCases is always an array
    if (!Array.isArray(testCases)) {
      return null;
    }
    
    if (selectedTestCaseId) {
      return findTestCaseById(selectedTestCaseId, testCases);
    }
    return testCases[0] || null;
  };
  
  // 获取可见的根用例（当前选中用例的顶层祖先）
  const getVisibleRootCase = (): TestCase | null => {
    // Ensure testCases is always an array
    if (!Array.isArray(testCases)) {
      return null;
    }
    
    if (selectedTestCaseId) {
      const casePath = findCasePath(selectedTestCaseId, testCases);
      if (casePath && casePath.length > 0) {
        return casePath[0]; // 返回路径的第一个元素（顶层祖先）
      }
    }
    return testCases[0] || null;
  };
  
  const currentTestCase = getCurrentTestCase();
  const visibleRootCase = getVisibleRootCase();

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
                    let newCmd = { ...cmd, status: 'success' as const };
                    
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
    setTestCases(sampleTestCases);
    setNextUniqueId(1003);
    setSelectedTestCaseId('case1'); // 自动选择第一个测试用例
  }, []);

  console.log('TestCaseManager rendered with modular layout', { currentTestCase, testCases });

  // 运行测试用例 - 支持自动模式和单步模式
  const runTestCase = async (caseId: string) => {
    const testCase = findTestCaseById(caseId, testCases);
    if (!testCase) return;

    // 检查是否有正在运行的用例
    if (runningCasesRef.current.has(caseId)) {
      // 暂停执行
      runningCasesRef.current.delete(caseId);
      const pausedTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false
      }));
      setTestCases(pausedTestCases);
      statusMessages?.addMessage(`测试用例 "${testCase.name}" 已暂停`, 'warning');
      return;
    }

    // 单步模式处理
    if (testCase.runMode === 'single') {
      return await runSingleStepMode(caseId, testCase);
    }

    // 自动模式处理
    return await runAutoMode(caseId, testCase);
  };

  // 单步模式执行
  const runSingleStepMode = async (caseId: string, testCase: TestCase) => {
    const commandsToRun = testCase.commands.filter(cmd => cmd.selected);
    
    if (commandsToRun.length === 0) {
      statusMessages?.addMessage('请先选择要执行的命令', 'warning');
      return;
    }

    const currentIndex = testCase.currentCommand;
    
    // 如果执行完成，重置状态
    if (currentIndex >= commandsToRun.length) {
      const resetTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        status: 'pending',
        currentCommand: -1,
        commands: tc.commands.map(cmd => ({
          ...cmd,
          status: 'pending'
        }))
      }));
      setTestCases(resetTestCases);
      statusMessages?.addMessage(`单步模式已重置，可重新开始执行`, 'info');
      return;
    }

    // 确定要执行的命令索引
    let targetIndex = currentIndex === -1 ? 0 : currentIndex;
    
    if (targetIndex >= commandsToRun.length) {
      // 执行完成，显示结果
      const endTime = new Date();
      const result: TestRunResult = {
        testCaseId: caseId,
        testCaseName: testCase.name,
        status: 'success',
        startTime: new Date(Date.now() - 1000), // 简化的开始时间
        endTime,
        duration: 1000,
        totalCommands: commandsToRun.length,
        passedCommands: commandsToRun.filter(cmd => cmd.status === 'success').length,
        failedCommands: commandsToRun.filter(cmd => cmd.status === 'failed').length,
        warnings: 0,
        errors: 0,
        failureLogs: []
      };
      
      setRunResult(result);
      setShowRunResult(true);
      statusMessages?.addMessage(`单步模式执行完成`, 'success');
      return;
    }

    const command = commandsToRun[targetIndex];
    const commandIndex = testCase.commands.indexOf(command);
    
    statusMessages?.addMessage(`单步模式：执行第 ${targetIndex + 1}/${commandsToRun.length} 条命令`, 'info');
    
    // 更新当前执行状态
    const runningTestCases = updateCaseById(testCases, caseId, (tc) => ({
      ...tc,
      isRunning: true,
      currentCommand: targetIndex
    }));
    setTestCases(runningTestCases);
    runningCasesRef.current.add(caseId);

    try {
      // 执行单个命令
      const commandResult = await runCommand(caseId, commandIndex);
      
      // 更新命令状态和进度
      const updatedTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        currentCommand: targetIndex + 1,
        commands: tc.commands.map((cmd, idx) => 
          idx === commandIndex 
            ? { ...cmd, status: commandResult.success ? 'success' : 'failed' }
            : cmd
        )
      }));
      setTestCases(updatedTestCases);
      
      runningCasesRef.current.delete(caseId);
      
      if (commandResult.success) {
        statusMessages?.addMessage(`命令执行成功，点击继续执行下一步`, 'success');
      } else {
        statusMessages?.addMessage(`命令执行失败：${commandResult.error}`, 'error');
      }
      
    } catch (error) {
      runningCasesRef.current.delete(caseId);
      const errorTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        currentCommand: targetIndex + 1
      }));
      setTestCases(errorTestCases);
      statusMessages?.addMessage(`单步执行出错: ${error}`, 'error');
    }
  };

  // 自动模式执行
  const runAutoMode = async (caseId: string, testCase: TestCase) => {
    const commandsToRun = testCase.commands.filter(cmd => cmd.selected);
    
    if (commandsToRun.length === 0) {
      statusMessages?.addMessage('没有选中的命令需要执行', 'warning');
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

    try {
      // 运行指定次数
      const runCount = testCase.runCount || 1;
      for (let i = 0; i < runCount; i++) {
        // 检查是否被暂停
        if (!runningCasesRef.current.has(caseId)) {
          console.log('Test case execution stopped (paused during run loop)');
          setExecutingCommand({ caseId: null, commandIndex: null });
          return;
        }

        if (runCount > 1) {
          toast({
            title: `第 ${i + 1} 次执行`,
            description: `执行测试用例: ${testCase.name} (${i + 1}/${runCount})`,
          });
        }

        // 执行命令
        console.log('Run clicked', { caseId, count: commandsToRun.length });

        for (let j = 0; j < commandsToRun.length; j++) {
          // 检查是否被暂停
          if (!runningCasesRef.current.has(caseId)) {
            console.log('Test case execution stopped (paused during command loop)');
            setExecutingCommand({ caseId: null, commandIndex: null });
            return;
          }

          const command = commandsToRun[j];
          const commandIndex = testCase.commands.indexOf(command);
          
          console.log(`Executing command ${j + 1}/${commandsToRun.length}: ${command.command}`);
          
          // 运行命令并获取结果
          const commandResult = await runCommand(caseId, commandIndex);
          
          // 统计执行结果
          if (commandResult.success) {
            passedCommands++;
          } else {
            // 根据失败严重程度统计
            const severity = command.failureSeverity || 'error';
            if (severity === 'error') {
              failedCommands++;
              errors++;
            } else {
              warnings++;
            }
            // 记录失败日志
            failureLogs.push({
              commandIndex: j,
              commandText: command.command,
              error: commandResult.error || '命令执行失败',
              timestamp: new Date()
            });
          }
          
          // 根据命令结果和用例级失败策略决定是否继续
          if (!commandResult.success) {
            // 获取命令失败的严重级别
            const severity = command.failureSeverity || 'error';
            
            // 确定用例级别的处理策略
            let caseAction: 'stop' | 'continue' | 'prompt';
            if (severity === 'error') {
              caseAction = testCase.onErrorFailure || testCase.failureStrategy || 'stop';
            } else {
              caseAction = testCase.onWarningFailure || testCase.failureStrategy || 'continue';
            }
            
            // 根据用例策略执行相应的操作
            if (caseAction === 'stop') {
              statusMessages?.addMessage(`命令失败（${severity}级），停止执行测试用例`, 'error');
              runningCasesRef.current.delete(caseId);
              setExecutingCommand({ caseId: null, commandIndex: null });
              
              // 停止执行时也要显示测试结果
              const endTime = new Date();
              const result: TestRunResult = {
                testCaseId: caseId,
                testCaseName: testCase.name,
                status: 'failed',
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
              
              // 更新测试用例状态并显示结果对话框
              const stoppedTestCases = updateCaseById(testCases, caseId, (tc) => ({
                ...tc,
                isRunning: false,
                status: 'failed'
              }));
              setTestCases(stoppedTestCases);
              
              setRunResult(result);
              setShowRunResult(true);
              
              return;
            } else if (caseAction === 'prompt') {
              // 显示用户确认对话框
              const promptText = command.failurePrompt || `命令执行失败（${severity}级）: ${command.command}\n\n是否继续执行测试用例？`;
              
              try {
                await new Promise<void>((resolve, reject) => {
                  setFailurePromptDialog({
                    isOpen: true,
                    promptText,
                    onContinue: () => {
                      setFailurePromptDialog(prev => ({ ...prev, isOpen: false }));
                      statusMessages?.addMessage(`用户选择继续执行`, 'info');
                      resolve();
                    },
                    onStop: () => {
                      setFailurePromptDialog(prev => ({ ...prev, isOpen: false }));
                      statusMessages?.addMessage(`用户选择停止执行`, 'warning');
                      runningCasesRef.current.delete(caseId);
                      setExecutingCommand({ caseId: null, commandIndex: null });
                      
                      // 用户选择停止时也要显示测试结果
                      const endTime = new Date();
                      const result: TestRunResult = {
                        testCaseId: caseId,
                        testCaseName: testCase.name,
                        status: 'failed',
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
                      
                      const stoppedTestCases = updateCaseById(testCases, caseId, (tc) => ({
                        ...tc,
                        isRunning: false,
                        status: 'failed'
                      }));
                      setTestCases(stoppedTestCases);
                      
                      setRunResult(result);
                      setShowRunResult(true);
                      
                      reject(new Error('用户选择停止执行'));
                    }
                  });
                });
                // 用户选择继续，继续执行下一条命令
                statusMessages?.addMessage(`继续执行下一条命令`, 'info');
              } catch (error) {
                // 用户选择停止，结果对话框已在onStop中显示，这里直接返回
                return;
              }
            } else {
              // continue - 继续执行下一条命令
              statusMessages?.addMessage(`命令失败（${severity}级），但继续执行下一条`, 'warning');
            }
          }
          
          // 命令间等待时间
          if (command.waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, command.waitTime));
          }
        }
      }

      // 执行完成，清除运行状态
      runningCasesRef.current.delete(caseId);
      setExecutingCommand({ caseId: null, commandIndex: null });
      
      // 确定最终状态 - 根据检测等级决定失败条件
      const level = testCase.validationLevel || 'error';
      let finalStatus: 'success' | 'failed' | 'partial';
      
      if (errors > 0) {
        finalStatus = 'failed';
      } else if (warnings > 0) {
        finalStatus = 'partial';
      } else {
        finalStatus = 'success';
      }
      
      const finalTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: finalStatus
      }));
      setTestCases(finalTestCases);

      // 创建执行结果
      const endTime = new Date();
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

      // 显示结果对话框
      setRunResult(result);
      setShowRunResult(true);

      statusMessages?.addMessage(`测试用例 "${testCase.name}" 执行完成`, finalStatus === 'success' ? 'success' : 'warning');
    } catch (error) {
      // 执行出错，清除运行状态并显示结果
      runningCasesRef.current.delete(caseId);
      setExecutingCommand({ caseId: null, commandIndex: null });
      const errorTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: 'failed'
      }));
      setTestCases(errorTestCases);

      // 创建错误执行结果
      const endTime = new Date();
      const errorResult: TestRunResult = {
        testCaseId: caseId,
        testCaseName: testCase.name,
        status: 'failed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        totalCommands: commandsToRun.length,
        passedCommands,
        failedCommands,
        warnings,
        errors,
        failureLogs: [
          ...failureLogs,
          {
            commandIndex: -1,
            commandText: '系统错误',
            error: error?.toString() || '未知错误',
            timestamp: new Date()
          }
        ]
      };

      setRunResult(errorResult);
      setShowRunResult(true);

      statusMessages?.addMessage(`测试用例执行出错: ${error}`, 'error');
    }
  };

  // 运行单个命令 - 返回执行结果
  const runCommand = async (caseId: string, commandIndex: number): Promise<{ success: boolean; error?: string }> => {
    const targetCase = findTestCaseById(caseId, testCases);
    if (!targetCase) return { success: false, error: '测试用例未找到' };
    
    const command = targetCase.commands[commandIndex];
    
    // 检查是否需要用户操作前确认
    if (command.requiresUserAction) {
      const promptText = command.userPrompt || `即将执行命令: ${command.command}\n\n是否继续？`;
      
      const userConfirmed = await new Promise<boolean>((resolve) => {
        setUserActionDialog({
          isOpen: true,
          commandText: command.command,
          promptText,
          onConfirm: () => {
            setUserActionDialog(prev => ({ ...prev, isOpen: false }));
            resolve(true);
          },
          onCancel: () => {
            setUserActionDialog(prev => ({ ...prev, isOpen: false }));
            resolve(false);
          }
        });
      });
      
      if (!userConfirmed) {
        return { success: false, error: '用户取消执行' };
      }
    }
    
    // 设置当前执行的命令高亮
    setExecutingCommand({ caseId, commandIndex });
    
    if (command.type === 'execution') {
      // 执行命令前进行变量替换
      const substitutedCommand = substituteVariables(command.command, storedParameters);
      
      // 如果有验证方法且不是none，使用重试逻辑
      if (command.validationMethod && command.validationMethod !== 'none') {
        const maxAttempts = command.failureHandling === 'retry' ? (command.maxAttempts || 3) : 1;
        let success = false;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          // 发送命令
          const sendEvent: SendCommandEvent = {
            command: substitutedCommand,
            format: command.dataFormat === 'hex' ? 'hex' : 'utf8',
            lineEnding: command.lineEnding,
            targetPort: 'ALL'
          };
          
          console.log(`Attempt ${attempt}/${maxAttempts}: Emitting SEND_COMMAND`, sendEvent);
          eventBus.emit(EVENTS.SEND_COMMAND, sendEvent);
          
          // 等待响应并验证
          const timeout = command.timeout || 5000;
          const responsePromise = new Promise<boolean>((resolve) => {
            let responseData = '';
            const timeoutId = setTimeout(() => resolve(false), timeout);
            
            const unsubscribe = eventBus.subscribe(EVENTS.SERIAL_DATA_RECEIVED, (data: any) => {
              if (data.type === 'received') {
                responseData += data.data;
                
                // 根据验证方法检查响应
                let isValid = false;
                const expectedResponse = command.expectedResponse || '';
                
                switch (command.validationMethod) {
                  case 'contains':
                    isValid = responseData.includes(expectedResponse);
                    break;
                  case 'equals':
                    isValid = responseData.trim() === expectedResponse.trim();
                    break;
                  case 'regex':
                    try {
                      const pattern = command.validationPattern || expectedResponse;
                      const regex = new RegExp(pattern);
                      isValid = regex.test(responseData);
                    } catch (e) {
                      console.error('Invalid regex pattern:', e);
                      isValid = false;
                    }
                    break;
                }
                
                if (isValid) {
                  clearTimeout(timeoutId);
                  unsubscribe();
                  resolve(true);
                }
              }
            });
          });
          
          const attemptSuccess = await responsePromise;
          if (attemptSuccess) {
            success = true;
            break;
          } else if (attempt < maxAttempts) {
            statusMessages?.addMessage(`命令执行失败，正在重试 (${attempt}/${maxAttempts})`, 'warning');
            await new Promise(resolve => setTimeout(resolve, 1000)); // 重试间隔
          }
        }
        
        if (success) {
          // 更新命令状态为成功
          const updatedTestCases = updateCaseById(testCases, caseId, (tc) => ({
            ...tc,
            commands: tc.commands.map((cmd, idx) => 
              idx === commandIndex ? { ...cmd, status: 'success' } : cmd
            )
          }));
          setTestCases(updatedTestCases);
          statusMessages?.addMessage(`执行命令: ${substitutedCommand} - 成功`, 'success');
        } else {
          // 更新命令状态为失败
          const updatedTestCases = updateCaseById(testCases, caseId, (tc) => ({
            ...tc,
            commands: tc.commands.map((cmd, idx) => 
              idx === commandIndex ? { ...cmd, status: 'failed' } : cmd
            )
          }));
          setTestCases(updatedTestCases);
          
          // 根据失败严重性显示提示
          const severity = command.failureSeverity || 'error';
          const message = `命令执行失败: ${substitutedCommand}`;
          statusMessages?.addMessage(message, severity === 'error' ? 'error' : 'warning');
        }
        
        return success ? { success: true } : { success: false, error: '命令执行失败' };
      } else {
        // 无验证的命令，直接发送
        const sendEvent: SendCommandEvent = {
          command: substitutedCommand,
          format: command.dataFormat === 'hex' ? 'hex' : 'utf8',
          lineEnding: command.lineEnding,
          targetPort: 'ALL'
        };
        
        console.log('Emitting SEND_COMMAND', sendEvent);
        eventBus.emit(EVENTS.SEND_COMMAND, sendEvent);
        statusMessages?.addMessage(`执行命令: ${substitutedCommand}`, 'info');
        return { success: true };
      }
    } else if (command.type === 'urc') {
      // URC 监听逻辑
      statusMessages?.addMessage(`URC监听: ${command.urcPattern}`, 'info');
      
      // 如果是一次性监听且配置了超时时间，设置超时检查
      if (command.urcListenMode === 'once' && command.urcListenTimeout) {
        const timeoutPromise = new Promise<{ success: boolean; error?: string }>((resolve) => {
          setTimeout(() => {
            if (!triggeredUrcIds.has(command.id)) {
              // URC 超时失败
              const severity = command.failureSeverity || 'error';
              
              // 更新命令状态为失败
              const updatedTestCases = updateCaseById(testCases, caseId, (tc) => ({
                ...tc,
                commands: tc.commands.map((cmd, idx) => 
                  idx === commandIndex ? { ...cmd, status: 'failed' } : cmd
                )
              }));
              setTestCases(updatedTestCases);
              
              statusMessages?.addMessage(`URC监听超时失败（${severity}级）: ${command.urcPattern}`, severity === 'error' ? 'error' : 'warning');
              resolve({ success: false, error: `URC监听超时（${command.urcListenTimeout}ms）` });
            }
          }, command.urcListenTimeout);
        });
        
        return timeoutPromise;
      }
      
      return { success: true };
    }
    
    // 模拟执行时间后清除高亮
    setTimeout(() => {
      setExecutingCommand({ caseId: null, commandIndex: null });
    }, command.waitTime || 1000);
    
    return { success: true };
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

  // 编辑测试用例
  const handleEditCase = (testCase: TestCase) => {
    setEditingCase(testCase);
    setIsEditDialogOpen(true);
  };

  // 选择测试用例
  const handleSelectTestCase = (caseId: string) => {
    setSelectedTestCaseId(caseId);
  };

  // 右击菜单功能
  const addCommandViaContextMenu = () => {
    if (!currentTestCase) return;
    
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

    const updatedCommands = [...currentTestCase.commands, newCommand];
    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
      ...testCase,
      commands: updatedCommands
    }));
    setTestCases(updatedTestCases);

    toast({
      title: "新增命令",
      description: `已添加新命令: ${newCommand.command}`,
    });
  };

  const addUrcViaContextMenu = () => {
    if (!currentTestCase) return;
    
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

    const updatedCommands = [...currentTestCase.commands, newUrc];
    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
      ...testCase,
      commands: updatedCommands
    }));
    setTestCases(updatedTestCases);

    toast({
      title: "新增URC",
      description: `已添加URC监听: ${newUrc.urcPattern}`,
    });
  };

  // ... keep existing code (all remaining functions and render logic)

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* 1. 页面头部 */}
      <TestCaseHeader 
        currentTestCase={currentTestCase}
        storedParameters={storedParameters}
      />
      
      {/* 2. 操作按钮栏 */}
      <TestCaseActions 
        currentTestCase={currentTestCase}
        testCases={testCases}
        setTestCases={setTestCases}
        connectedPorts={connectedPorts}
        onEditCase={handleEditCase}
        onRunTestCase={runTestCase}
        onSync={handleSync}
        onDeleteTestCase={deleteTestCase}
        onDeletePresetCases={deletePresetCases}
        onUpdateCase={applyUpdateAndAutoSave}
        onSelectTestCase={handleSelectTestCase}
        hasSelectedItems={(testCase) => testCase.commands.some(cmd => cmd.selected)}
      />

      {/* 3. 分隔线 */}
      <Separator className="my-1" />

      {/* 测试用例切换区 */}
      <TestCaseSwitcher 
        testCases={testCases}
        currentTestCase={currentTestCase}
        onSelectTestCase={handleSelectTestCase}
        setTestCases={setTestCases}
        onDeleteTestCase={deleteTestCase}
        onSync={handleSync}
        onWorkspaceChange={handleWorkspaceChange}
      />

      {/* 编辑测试用例对话框 */}
      <CaseEditDialogInline
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingCase={editingCase}
        setEditingCase={setEditingCase}
        onSave={(caseId, updatedCase) => {
          applyUpdateAndAutoSave(caseId, () => updatedCase);
          toast({
            title: "保存成功",
            description: "测试用例已更新",
          });
        }}
      />

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