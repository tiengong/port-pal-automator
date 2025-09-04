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

// Import new modular components and hooks - temporarily disabled for stability
// import { useTestCaseState } from './hooks/useTestCaseState';
// import { useTestCaseActions } from './hooks/useTestCaseActions';
// import { useTestCaseExecution } from './hooks/useTestCaseExecution';
// import { TestCaseDialogs } from './components/TestCaseDialogs';

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
  
  // Original working state management
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCommandIndex, setEditingCommandIndex] = useState<number | null>(null);
  const [executionResults, setExecutionResults] = useState<any[]>([]);
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: '',
    targetType: 'case'
  });
  const [nextUniqueId, setNextUniqueId] = useState(1);
  const [currentWorkspace, setCurrentWorkspace] = useState<string>('');
  const [dragInfo, setDragInfo] = useState<any>(null);
  const [inlineEdit, setInlineEdit] = useState<{ commandId: string | null; value: string }>({
    commandId: null,
    value: ''
  });
  const [executingCommand, setExecutingCommand] = useState<string | null>(null);
  const [lastFocusedChild, setLastFocusedChild] = useState<any>(null);
  const [storedParameters, setStoredParameters] = useState<Record<string, string>>({});
  const [triggeredUrcIds, setTriggeredUrcIds] = useState<Set<string>>(new Set());
  
  const runningCasesRef = useRef<Set<string>>(new Set());
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // Generate unique ID function
  const generateUniqueId = () => {
    const id = `tc_${nextUniqueId}`;
    setNextUniqueId(prev => prev + 1);
    return id;
  };
  
  // Initialize workspace and load test cases  
  useEffect(() => {
  } = testCaseActions;
  
  // Get current test case and visible root
  const getCurrentTestCase = () => getTestCase(selectedTestCaseId);
  const getVisibleRootCase = () => getVisibleRoot(selectedTestCaseId);
  
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
  
  // Initialize workspace and load test cases - use handler from hook
  useEffect(() => {
    // The useTestCaseState hook already handles initialization
  }, []);
  
  // Handle workspace changes - use handler from hook
  const handleWorkspaceChangeLocal = handleWorkspaceChange;
  
  // Track selected test case changes and save last opened - use existing hook logic
  
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
                  setStoredParameters(prev => ({
                    ...prev,
                    ...extractedParams
                  }));
                  
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
  const runTestCase = async (caseId: string) => {
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
          setExecutingCommand(null);
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
          
          // 单步模式检查 - 每个命令执行前需要用户确认
          if (testCase.runMode === 'single') {
            try {
              await new Promise<void>((resolve, reject) => {
                setUserActionDialog({
                  isOpen: true,
                  commandText: command.command,
                  promptText: `单步模式执行确认\n\n即将执行第 ${j + 1}/${commandsToRun.length} 条命令:\n${command.command}\n\n是否继续执行？`,
                  onConfirm: () => {
                    setUserActionDialog(prev => ({ ...prev, isOpen: false }));
                    statusMessages?.addMessage(`单步模式：用户确认执行命令 ${j + 1}`, 'info');
                    resolve();
                  },
                  onCancel: () => {
                    setUserActionDialog(prev => ({ ...prev, isOpen: false }));
                    statusMessages?.addMessage(`单步模式：用户取消执行`, 'warning');
                    runningCasesRef.current.delete(caseId);
                    setExecutingCommand({ caseId: null, commandIndex: null });
                    reject(new Error('用户取消单步执行'));
                  }
                });
              });
            } catch (error) {
              // 用户取消执行，显示当前执行结果
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
              
              return;
            }
          }
          
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
          setExecutingCommand(null);
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
          {/* 展开/折叠按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
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
                    onClick={() => handleEditCase(subCase)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>设置</p>
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
      <div key={testCase.id} className="p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 16}px` }}>
          {/* 展开/折叠按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={() => {
              const updatedTestCases = toggleExpandById(testCases, testCase.id);
              setTestCases(updatedTestCases);
            }}
          >
            {testCase.subCases.length > 0 || testCase.commands.length > 0 ? (
              testCase.isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </Button>

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
            className="flex-shrink-0"
          />
          
          {/* 用例内容 */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setSelectedTestCaseId(testCase.id)}
          >
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm truncate ${
                selectedTestCaseId === testCase.id ? 'text-primary' : ''
              }`}>
                {testCase.name}
              </span>
               

             </div>
          </div>
          
          {/* 状态指示器 */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
                    className="h-8 w-8 p-0"
                    onClick={() => runTestCase(testCase.id)}
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
                    onClick={() => handleEditCase(testCase)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>设置</p>
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
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <AlertCircle className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/30 max-w-full overflow-hidden">
      {/* ========== 模块化测试页面布局 - 2024年版本 ========== */}
      
      {/* 1. 当前测试用例信息显示 */}
      <div className="flex-shrink-0 p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        {/* 🎯 新模块化布局已激活 - 2024版本 */}
        <div className="flex items-center justify-between mb-4">
          <TestCaseHeader 
            currentTestCase={currentTestCase ? (getTopLevelParent(currentTestCase.id, testCases) || currentTestCase) : currentTestCase} 
            onUpdateCase={applyUpdateAndAutoSave}
          />
        </div>

        {/* 2. 操作栏 */}
        <TestCaseActions 
          currentTestCase={getTargetCaseForActions(currentTestCase)}
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
          onAddSubCase={(parentId: string) => {
            const newSubCase: TestCase = {
              id: `subcase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              uniqueId: generateUniqueId(),
              name: '新建子用例',
              description: '',
              commands: [],
              subCases: [],
              isExpanded: true, // 新建子用例默认展开
              isRunning: false,
              currentCommand: -1,
              selected: false,
              status: 'pending',
              failureStrategy: 'stop',
              onWarningFailure: 'continue',
              onErrorFailure: 'stop'
            };

            // 获取目标父用例
            const parentCase = findTestCaseById(parentId, testCases);
            if (!parentCase) return;

            let insertIndex = -1; // 默认插入到末尾

            // 如果有最后焦点的子项且属于同一父用例，在其后插入
            if (lastFocusedChild && lastFocusedChild.caseId === parentId) {
              const sortedChildren = getSortedChildren(parentCase);
              const focusedChildIndex = sortedChildren.findIndex(child => 
                child.type === lastFocusedChild.type && 
                (child.type === 'command' ? (child.item as TestCommand).id : (child.item as TestCase).id) === lastFocusedChild.itemId
              );
              if (focusedChildIndex >= 0) {
                insertIndex = focusedChildIndex + 1;
              }
            } else {
              // 如果没有焦点子项，尝试在最后一个选中的命令之后插入
              const sortedChildren = getSortedChildren(parentCase);
              const lastSelectedCommandIndex = sortedChildren.reduce((lastIndex, child, index) => {
                if (child.type === 'command' && (child.item as TestCommand).selected) {
                  return index;
                }
                return lastIndex;
              }, -1);
              
              if (lastSelectedCommandIndex >= 0) {
                insertIndex = lastSelectedCommandIndex + 1;
              }
            }

            // 添加子用例到指定位置
            const updatedTestCases = updateCaseById(testCases, parentId, (testCase) => {
              const newSubCases = [...testCase.subCases, newSubCase];
              
              // 更新childrenOrder以反映新的插入位置
              let newOrder = generateChildrenOrder(testCase);
              
              if (insertIndex >= 0 && insertIndex < newOrder.length) {
                // 在指定位置插入
                const subcaseOrderItem = { type: 'subcase' as const, id: newSubCase.id, index: testCase.subCases.length };
                newOrder.splice(insertIndex, 0, subcaseOrderItem);
                
                // 重新调整后续项的索引
                newOrder = newOrder.map((item, idx) => ({
                  ...item,
                  index: idx
                }));
              } else {
                // 添加到末尾
                newOrder.push({ type: 'subcase', id: newSubCase.id, index: testCase.subCases.length });
              }

              return {
                ...testCase,
                subCases: newSubCases,
                childrenOrder: newOrder
              };
            });

            setTestCases(updatedTestCases);

            // 保存更新后的用例
            const updatedCase = findTestCaseById(parentId, updatedTestCases);
            if (updatedCase) {
              scheduleAutoSave(updatedCase);
            }

            toast({
              title: "新增子用例",
              description: `已添加子用例: ${newSubCase.name}`,
            });
          }}
          onUpdateCase={applyUpdateAndAutoSave}
          hasSelectedItems={hasSelectedItems}
        />
      </div>

      {/* 3. 中间测试用例展示区 */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 max-h-[calc(100vh-320px)]">
            {testCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <TestTube2 className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm">暂无测试用例，点击新建用例开始</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 参数显示面板 */}
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
          <ContextMenuSub>
            <ContextMenuSubTrigger className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              新建
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              <ContextMenuItem onClick={addCommandViaContextMenu} className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                新建命令
              </ContextMenuItem>
              <ContextMenuItem onClick={addUrcViaContextMenu} className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                新建URC
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          
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

      {/* 4. 测试用例切换区 */}
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

      {/* 编辑命令对话框 */}
      <Dialog open={editingCommandIndex !== null} onOpenChange={() => setEditingCommandIndex(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCommandIndex !== null && currentTestCase && 
                currentTestCase.commands[editingCommandIndex].type === 'execution' && '编辑命令配置'}
              {editingCommandIndex !== null && currentTestCase && 
                currentTestCase.commands[editingCommandIndex].type === 'urc' && '编辑URC配置'}
            </DialogTitle>
            <DialogDescription>
              配置详细属性，包括执行参数、验证规则、错误处理等
            </DialogDescription>
          </DialogHeader>
          
          {editingCommandIndex !== null && currentTestCase && (
            <div className="space-y-4">
              {currentTestCase.commands[editingCommandIndex].type === 'execution' && (
                <ExecutionEditor
                  command={currentTestCase.commands[editingCommandIndex]}
                  onUpdate={(updates) => {
                    const updatedCommands = [...currentTestCase.commands];
                    updatedCommands[editingCommandIndex] = {
                      ...updatedCommands[editingCommandIndex],
                      ...updates
                    };
                    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
                      ...testCase,
                      commands: updatedCommands
                    }));
                    setTestCases(updatedTestCases);
                    
                    // 自动保存更新后的用例
                    const topLevelCase = getTopLevelParent(currentTestCase.id, updatedTestCases);
                    if (topLevelCase) {
                      scheduleAutoSave(topLevelCase);
                    }
                  }}
                />
              )}
              {currentTestCase.commands[editingCommandIndex].type === 'urc' && (
                <UrcEditor
                  command={currentTestCase.commands[editingCommandIndex]}
                  onUpdate={(updates) => {
                    const updatedCommands = [...currentTestCase.commands];
                    updatedCommands[editingCommandIndex] = {
                      ...updatedCommands[editingCommandIndex],
                      ...updates
                    };
                    const updatedTestCases = updateCaseById(testCases, currentTestCase.id, (testCase) => ({
                      ...testCase,
                      commands: updatedCommands
                    }));
                    setTestCases(updatedTestCases);
                    
                    // 自动保存更新后的用例
                    const topLevelCase = getTopLevelParent(currentTestCase.id, updatedTestCases);
                    if (topLevelCase) {
                      scheduleAutoSave(topLevelCase);
                    }
                  }}
                  jumpOptions={{
                    commandOptions: buildCommandOptionsFromCase(currentTestCase)
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