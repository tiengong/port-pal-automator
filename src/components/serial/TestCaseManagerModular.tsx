import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// UI Components
import { TestCaseHeader } from './TestCaseHeader';
import { TestCaseActions } from './TestCaseActions';
import { TestCaseSwitcher } from './TestCaseSwitcher';
import { ScriptEditor } from './ScriptEditor';
import { ExecutionEditor } from './editors/ExecutionEditor';
import { UrcEditor } from './editors/UrcEditor';
import { VariableDisplay } from '../VariableDisplay';
import { RunResultDialog, TestRunResult } from './RunResultDialog';
import { CommandRow } from './CommandRow';
import { SubCaseRow } from './SubCaseRow';
import { CaseEditDialogInline } from './components/CaseEditDialogInline';

// Custom Hooks
import { useTestCaseState } from './hooks/useTestCaseState';
import { useTestCaseExecution } from './hooks/useTestCaseExecution';
import { useTestCaseDragDrop } from './hooks/useTestCaseDragDrop';

// Utils
import { 
  getTargetCaseForActions, 
  getVisibleRootCase, 
  hasSelectedItems,
  createNewTestCase,
  createNewCommand,
  generateUniqueId,
  formatCommandIndex,
  isStatsCase,
  searchTestCases,
  clearAllSelections,
  getSelectedItems,
  getCurrentTestCase,
  getTopLevelParent,
  updateCommandSelection,
  toggleCaseExpand
} from './utils/testCaseHelpers';

// Workspace
import { 
  initializeDefaultWorkspace, 
  loadCases, 
  saveCase, 
  getCurrentWorkspace, 
  fromPersistedCase, 
  scheduleAutoSave, 
  getLastOpenedTestCase, 
  setLastOpenedTestCase 
} from './workspace';

// Event Bus
import { eventBus, EVENTS, SerialDataEvent, SendCommandEvent } from '@/lib/eventBus';

// Types
import { TestCase, TestCommand, ExecutionResult, ContextMenuState } from './types';
import { Script } from './types/ScriptTypes';

// Utility functions
import { 
  generateChildrenOrder as generateChildrenOrderUtil, 
  getSortedChildren, 
  updateChildrenOrder, 
  moveItem, 
  formatCommandIndex as formatCommandIndexUtil
} from './testCaseUtils';
import { 
  findTestCaseById, 
  getTopLevelParent as getTopLevelParentUtil, 
  findParentCase, 
  updateCaseById, 
  addSubCaseById, 
  toggleExpandById, 
  findCasePath, 
  deleteCaseById 
} from './testCaseRecursiveUtils';
import { 
  findCommandLocation, 
  getFirstExecutableInCase, 
  getNextStepFrom, 
  buildCommandOptionsFromCase 
} from './testCaseNavigationUtils';
import { 
  parseUrcData, 
  substituteVariables, 
  checkUrcMatch 
} from './testCaseUrcUtils';

// Sample cases
import { sampleTestCases } from './sampleCases';

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
  
  // 使用状态管理Hook
  const {
    state,
    setTestCases,
    setSelectedCase,
    setSelectedTestCaseId,
    setEditingCase,
    setIsEditDialogOpen,
    setEditingCommandIndex,
    setExecutionResults,
    setScripts,
    setCurrentScript,
    setWaitingForUser,
    setUserPrompt,
    setContextMenu,
    setNextUniqueId,
    setCurrentWorkspace,
    setDragInfo,
    setInlineEdit,
    setExecutingCommand,
    setRunResult,
    setShowRunResult,
    setUserActionDialog,
    setFailurePromptDialog,
    setLastFocusedChild,
    setStoredParameters,
    setTriggeredUrcIds,
    currentTestCase,
    hasSelectedItems: hasSelected
  } = useTestCaseState();

  // 使用执行Hook
  const execution = useTestCaseExecution({
    onStatusUpdate: (message, type) => statusMessages?.addMessage(message, type),
    onCommandUpdate: (caseId, commandIndex, updates) => {
      // 更新命令状态 - 使用工具函数
      const updatedCases = updateCaseById(state.testCases, caseId, (testCase) => ({
        ...testCase,
        commands: testCase.commands.map((cmd, idx) => 
          idx === commandIndex ? { ...cmd, ...updates } : cmd
        )
      }));
      setTestCases(updatedCases);
    },
    onCaseUpdate: (caseId, updates) => {
      // 更新用例状态 - 使用工具函数
      const updatedCases = updateCaseById(state.testCases, caseId, (testCase) => ({ ...testCase, ...updates }));
      setTestCases(updatedCases);
    }
  });

  // 使用拖拽Hook
  const dragDrop = useTestCaseDragDrop({
    testCases: state.testCases,
    setTestCases,
    setDragInfo
  });

  // 初始化工作空间和加载测试用例
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

  // 监听串口数据
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENTS.SERIAL_DATA_RECEIVED, (event: SerialDataEvent) => {
      // 处理URC匹配和参数存储
      if (state.currentTestCase) {
        const currentTestCase = state.currentTestCase;
        
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
              const updatedCases = state.testCases.map(tc => 
                tc.id === currentTestCase.id
                  ? {
                      ...tc,
                      commands: tc.commands.map((c, idx) => 
                        idx === index ? { ...c, status: 'success' } : c
                      )
                    }
                  : tc
              );
              setTestCases(updatedCases);
            }
          }
        });
      }
    });

    return () => unsubscribe();
  }, [state.currentTestCase, state.testCases]);

  // 核心功能函数 - 使用工具函数重构
  const handleSelectTestCase = (caseId: string) => {
    setSelectedTestCaseId(caseId);
    const foundCase = getCurrentTestCase(state.testCases, caseId);
    setSelectedCase(foundCase);
    
    if (foundCase) {
      setLastOpenedTestCase(foundCase.uniqueId);
    }
  };

  const handleToggleExpand = (caseId: string) => {
    const updatedCases = toggleCaseExpand(state.testCases, caseId);
    setTestCases(updatedCases);
  };

  const handleToggleSelection = (caseId: string, type: 'case' | 'command', itemId: string, selected: boolean) => {
    if (type === 'case') {
      const updatedCases = updateCaseSelection(state.testCases, caseId, selected);
      setTestCases(updatedCases);
    } else if (type === 'command') {
      const updatedCases = updateCommandSelection(state.testCases, caseId, itemId, selected);
      setTestCases(updatedCases);
    }
  };

  const handleRunTestCase = async (caseId: string) => {
    const testCase = findTestCaseById(caseId, state.testCases);
    if (!testCase) return;

    // 如果正在运行，则暂停
    if (runningCasesRef.current.has(caseId)) {
      runningCasesRef.current.delete(caseId);
      const updatedCases = updateCaseById(state.testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: 'pending'
      }));
      setTestCases(updatedCases);
      statusMessages?.addMessage(`测试用例 "${testCase.name}" 已暂停`, 'warning');
      return;
    }

    runningCasesRef.current.add(caseId);
    
    // 清空存储的参数和触发状态
    setStoredParameters({});
    setTriggeredUrcIds(new Set());
    
    // 更新状态为运行中
    const updatedCases = updateCaseById(state.testCases, caseId, (tc) => ({
      ...tc,
      isRunning: true,
      status: 'running',
      currentCommand: 0
    }));
    setTestCases(updatedCases);
    
    statusMessages?.addMessage(`开始执行测试用例: ${testCase.name}`, 'info');

    try {
      await execution.executeTestCase(testCase);
    } catch (error) {
      console.error('执行测试用例失败:', error);
      statusMessages?.addMessage(`执行测试用例失败: ${testCase.name}`, 'error');
    } finally {
      runningCasesRef.current.delete(caseId);
    }
  };

  // 简化的事件处理函数
  const handleEditCase = (testCase: TestCase) => {
    setEditingCase(testCase);
    setIsEditDialogOpen(true);
  };

  const handleAddCommand = (caseId: string) => {
    const newCommand = createNewCommand();
    const updatedCases = updateCaseById(state.testCases, caseId, (tc) => ({
      ...tc,
      commands: [...tc.commands, newCommand]
    }));
    setTestCases(updatedCases);
  };

  const handleAddUrc = (caseId: string) => {
    const newCommand = createNewCommand({
      type: 'urc',
      command: '',
      urcPattern: '+URC:',
      validationMethod: 'contains'
    });
    const updatedCases = updateCaseById(state.testCases, caseId, (tc) => ({
      ...tc,
      commands: [...tc.commands, newCommand]
    }));
    setTestCases(updatedCases);
  };

  const handleAddSubCase = (caseId: string) => {
    const newSubCase = createNewTestCase({
      name: '新建子用例'
    });
    const updatedCases = updateCaseById(state.testCases, caseId, (tc) => ({
      ...tc,
      subCases: [...tc.subCases, newSubCase]
    }));
    setTestCases(updatedCases);
  };

  const handleDeleteCommand = (caseId: string, commandId: string) => {
    const updatedCases = updateCaseById(state.testCases, caseId, (tc) => ({
      ...tc,
      commands: tc.commands.filter(cmd => cmd.id !== commandId)
    }));
    setTestCases(updatedCases);
  };

  const handleRunCommand = async (caseId: string, commandIndex: number) => {
    const testCase = findTestCaseById(caseId, state.testCases);
    if (!testCase) return;
    
    const command = testCase.commands[commandIndex];
    if (!command) return;

    // 设置执行状态
    setExecutingCommand({ caseId, commandIndex });
    
    try {
      // 执行命令（简化的实现，实际应该调用完整的执行逻辑）
      if (command.type === 'execution') {
        // 发送命令事件
        const sendEvent: SendCommandEvent = {
          command: command.command,
          format: command.dataFormat === 'hex' ? 'hex' : 'utf8',
          lineEnding: command.lineEnding,
          targetPort: 'ALL'
        };
        eventBus.emit(EVENTS.SEND_COMMAND, sendEvent);
        statusMessages?.addMessage(`执行命令: ${command.command}`, 'info');
      } else if (command.type === 'urc') {
        // URC监听逻辑
        statusMessages?.addMessage(`开始监听URC: ${command.urcPattern}`, 'info');
      }
      
      // 模拟命令执行完成
      setTimeout(() => {
        const updatedCases = updateCaseById(state.testCases, caseId, (tc) => ({
          ...tc,
          commands: tc.commands.map((cmd, idx) => 
            idx === commandIndex ? { ...cmd, status: 'success' as const } : cmd
          )
        }));
        setTestCases(updatedCases);
        setExecutingCommand({ caseId: '', commandIndex: -1 });
        statusMessages?.addMessage(`命令执行完成: ${command.command}`, 'success');
      }, 1000);
      
    } catch (error) {
      console.error('执行命令失败:', error);
      setExecutingCommand({ caseId: '', commandIndex: -1 });
      statusMessages?.addMessage(`执行命令失败: ${command.command}`, 'error');
    }
  };

  const handleEditCommand = (caseId: string, commandIndex: number) => {
    // 使用现有的编辑机制，设置编辑命令索引并打开编辑对话框
    setEditingCommandIndex(commandIndex);
    setEditingCase(findTestCaseById(caseId, state.testCases));
    setIsEditDialogOpen(true);
  };

  const handleDeleteSubCase = (caseId: string, subCaseId: string) => {
    const updatedCases = updateCaseById(state.testCases, caseId, (tc) => ({
      ...tc,
      subCases: tc.subCases.filter(sub => sub.id !== subCaseId)
    }));
    setTestCases(updatedCases);
  };

  // 内联编辑处理
  const handleInlineEditStart = (commandId: string, value: string) => {
    setInlineEdit({ commandId, value });
  };

  const handleInlineEditSave = (caseId: string, commandId: string) => {
    const updatedCases = updateCaseById(state.testCases, caseId, (tc) => ({
      ...tc,
      commands: tc.commands.map(cmd => 
        cmd.id === commandId ? { ...cmd, command: state.inlineEdit.value } : cmd
      )
    }));
    setTestCases(updatedCases);
    setInlineEdit({ commandId: null, value: '' });
  };

  const handleInlineEditChange = (value: string) => {
    setInlineEdit(prev => ({ ...prev, value }));
  };

  const handleContextMenu = (e: React.MouseEvent, targetId: string, targetType: 'case' | 'command') => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetId,
      targetType
    });
  };

  // 获取当前显示的根用例
  const visibleRootCase = getVisibleRootCase(state.testCases, state.selectedTestCaseId);

  // 渲染函数 - 保持原有UI结构
  const renderUnifiedTree = (cases: TestCase[], level: number): React.ReactNode => {
    return cases.map((testCase) => {
      const isExpanded = testCase.isExpanded;
      const isRunning = testCase.isRunning;
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
                onContextMenu={(e) => handleContextMenu(e, testCase.id, 'case')}
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
                        handleRunTestCase(testCase.id);
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
                <ContextMenu key={command.id}>
                  <ContextMenuTrigger asChild>
                    <CommandRow
                      command={command}
                      commandIndex={index}
                      caseId={testCase.id}
                      isExecuting={state.executingCommand.caseId === testCase.id && state.executingCommand.commandIndex === index}
                      isExpanded={isExpanded}
                      dragInfo={state.dragInfo}
                      inlineEdit={state.inlineEdit}
                      storedParameters={state.storedParameters}
                      onToggleSelection={(selected) => handleToggleSelection(testCase.id, 'command', command.id, selected)}
                      onInlineEditStart={(value) => handleInlineEditStart(command.id, value)}
                      onInlineEditSave={() => handleInlineEditSave(testCase.id, command.id)}
                      onInlineEditChange={handleInlineEditChange}
                      onRunCommand={() => {/* 运行单个命令逻辑 */}}
                      onEditCommand={() => {/* 编辑命令逻辑 */}}
                      onDeleteCommand={() => handleDeleteCommand(testCase.id, command.id)}
                      onDragStart={(e) => {/* 拖拽开始逻辑 */}}
                      onDragOver={(e, position) => {/* 拖拽悬停逻辑 */}}
                      onDragLeave={(e) => {/* 拖拽离开逻辑 */}}
                      onDrop={(e) => {/* 拖拽放置逻辑 */}}
                      onContextMenu={(e) => handleContextMenu(e, command.id, 'command')}
                      onMoveCommand={(fromIndex, toIndex) => {/* 移动命令逻辑 */}}
                      formatCommandIndex={formatCommandIndex}
                      t={t}
                    />
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-64">
                    <ContextMenuItem onClick={() => handleRunCommand(testCase.id, index)} className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      运行命令
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleEditCommand(testCase.id, index)} className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      编辑命令
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleDeleteCommand(testCase.id, command.id)} className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      删除命令
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => handleAddCommand(testCase.id)} className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      新建命令
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleAddUrc(testCase.id)} className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      新建URC
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
              
              {/* 子用例列表 - 使用现有组件保持UI一致 */}
              {testCase.subCases.map((subCase) => (
                <SubCaseRow
                  key={subCase.id}
                  subCase={subCase}
                  caseId={testCase.id}
                  level={level + 1}
                  dragInfo={state.dragInfo}
                  onToggleSelection={(selected) => handleToggleSelection(testCase.id, 'case', subCase.id, selected)}
                  onToggleExpand={() => handleToggleExpand(subCase.id)}
                  onRunSubCase={() => handleRunTestCase(subCase.id)}
                  onEditSubCase={() => handleEditCase(subCase)}
                  onDeleteSubCase={() => handleDeleteSubCase(testCase.id, subCase.id)}
                  onDragStart={(e) => {/* 拖拽开始逻辑 */}}
                  onDragOver={(e, position) => {/* 拖拽悬停逻辑 */}}
                  onDragLeave={(e) => {/* 拖拽离开逻辑 */}}
                  onDrop={(e) => {/* 拖拽放置逻辑 */}}
                  onContextMenu={(e) => handleContextMenu(e, subCase.id, 'case')}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  // 获取当前显示的根用例
  const visibleRootCase = getVisibleRootCase(state.testCases, state.selectedTestCaseId);

  // 主渲染 - 保持原有UI结构
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/30 max-w-full overflow-hidden">
      {/* ========== 模块化测试页面布局 - 2024年版本 ========== */}
      
      {/* 1. 当前信息显示 - 保持原有结构 */}
      <div className="flex-shrink-0 p-2 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        {/* 🎯 新模块化布局已激活 - 2024版本 */}
        {state.currentScript ? (
          // Script header - 保持原有结构
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  {state.currentScript.name}
                  <Badge variant="outline" className="text-xs h-5">
                    {state.currentScript.language.toUpperCase()}
                  </Badge>
                  <Badge 
                    variant={
                      state.currentScript.status === 'success' ? 'default' : 
                      state.currentScript.status === 'error' ? 'destructive' : 
                      state.currentScript.status === 'running' ? 'secondary' : 
                      'outline'
                    }
                    className="flex items-center gap-1 text-xs h-5"
                  >
                    {state.currentScript.status === 'success' && <CheckCircle className="w-3 h-3" />}
                    {state.currentScript.status === 'error' && <XCircle className="w-3 h-3" />}
                    {state.currentScript.status === 'running' && <AlertCircle className="w-3 h-3 animate-pulse" />}
                    {state.currentScript.status}
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground">
                  {state.currentScript.description || '无描述'}
                </p>
              </div>
            </div>
            
            {/* Script actions - 保持原有结构 */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {/* 保存脚本逻辑 */}}
                className="flex items-center gap-1 h-7 px-2"
              >
                <Save className="w-3.5 h-3.5" />
                保存
              </Button>
              
              <Button
                onClick={() => {/* 运行/停止脚本逻辑 */}}
                disabled={state.currentScript.status === 'running'}
                variant={state.currentScript.isRunning ? "destructive" : "default"}
                size="sm"
                className="flex items-center gap-1 h-7 px-2"
              >
                {state.currentScript.isRunning ? (
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
                onUpdateCase={(updates) => {
                  if (visibleRootCase) {
                    const updatedCases = updateCaseById(state.testCases, visibleRootCase.id, (tc) => ({ ...tc, ...updates }));
                    setTestCases(updatedCases);
                  }
                }}
              />
            </div>

            {/* 2. 操作栏 - 保持原有结构 */}
            <TestCaseActions 
              currentTestCase={getTargetCaseForActions(state.selectedCase, state.testCases)}
              testCases={state.testCases}
              setTestCases={setTestCases}
              connectedPorts={connectedPorts}
              onEditCase={handleEditCase}
              onRunTestCase={handleRunTestCase}
              onSync={() => {/* 同步逻辑 */}}
              onDeleteTestCase={() => {/* 删除测试用例逻辑 */}}
              onDeleteSelectedCommands={() => {/* 删除选中命令逻辑 */}}
              onDeletePresetCases={() => {/* 删除预设用例逻辑 */}}
              onSelectTestCase={handleSelectTestCase}
              onUpdateCase={(updates) => {
                const updatedCases = state.testCases.map(tc => 
                  tc.id === state.selectedTestCaseId ? { ...tc, ...updates } : tc
                );
                setTestCases(updatedCases);
              }}
              hasSelectedItems={hasSelected}
            />
          </>
        )}
      </div>

      {/* 3. 中间内容展示区 - 脚本编辑器或测试用例 - 保持原有结构 */}
      {state.currentScript ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScriptEditor
            script={state.currentScript}
            onScriptUpdate={(script) => setCurrentScript(script)}
            onRunScript={(id) => {/* 运行脚本逻辑 */}}
            onStopScript={(id) => {/* 停止脚本逻辑 */}}
            onSaveScript={(script) => {/* 保存脚本逻辑 */}}
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
                  {/* 参数显示面板 - 保持原有结构 */}
                  {Object.keys(state.storedParameters).length > 0 && (
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
                   
                  {/* 统一层级树 - 保持原有结构 */}
                  <div className="border border-border rounded-lg bg-card">
                    <div className="divide-y divide-border">                      {visibleRootCase ? renderUnifiedTree([visibleRootCase], 0) : []}
                    </div>
                  </div>
                </div>
              )}
            </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem onClick={() => {/* 新建命令逻辑 */}} className="flex items-center gap-2">
            <Hash className="w-4 h-4" />
            新建命令
          </ContextMenuItem>
          <ContextMenuItem onClick={() => {/* 新建URC逻辑 */}} className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            新建URC
          </ContextMenuItem>
          <ContextMenuItem onClick={() => {/* 新建子用例逻辑 */}} className="flex items-center gap-2">
            <TestTube2 className="w-4 h-4" />
            新建子用例
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      )}

      {/* 运行结果对话框 - 保持原有结构 */}
      {state.showRunResult && state.runResult && (
        <RunResultDialog
          result={state.runResult}
          open={state.showRunResult}
          onOpenChange={(open) => setShowRunResult(open)}
        />
      )}

      {/* 内联编辑对话框 - 保持原有结构 */}
      {state.isEditDialogOpen && state.editingCase && (
        <CaseEditDialogInline
          testCase={state.editingCase}
          isOpen={state.isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={(updatedCase) => {
            const updatedCases = updateCaseById(state.testCases, state.editingCase.id, () => updatedCase);
            setTestCases(updatedCases);
            setIsEditDialogOpen(false);
          }}
        />
      )}

      {/* 用户操作确认对话框 - 保持原有结构 */}
      {state.userActionDialog.isOpen && (
        <AlertDialog open={state.userActionDialog.isOpen} onOpenChange={(open) => setUserActionDialog(prev => ({ ...prev, isOpen: open }))}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>执行确认</AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-line">
                {state.userActionDialog.promptText}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel onClick={state.userActionDialog.onCancel}>
                取消
              </AlertDialogCancel>
              <AlertDialogAction onClick={state.userActionDialog.onConfirm}>
                确认
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* 失败处理提示对话框 - 保持原有结构 */}
      {state.failurePromptDialog.isOpen && (
        <AlertDialog open={state.failurePromptDialog.isOpen} onOpenChange={(open) => setFailurePromptDialog(prev => ({ ...prev, isOpen: open }))}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>命令执行失败</AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-line">
                {state.failurePromptDialog.promptText}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel onClick={state.failurePromptDialog.onStop}>
                停止
              </AlertDialogCancel>
              <AlertDialogAction onClick={state.failurePromptDialog.onContinue}>
                继续
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default TestCaseManager;