import React, { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { globalToast } from "@/hooks/useGlobalMessages";
import { useTranslation } from "react-i18next";
import { FileCode } from "lucide-react";

// UI Components
import { TestCaseHeader } from './TestCaseHeader';
import { TestCaseActions } from './TestCaseActions';
import { VariableDisplay } from '../VariableDisplay';
import { RunResultDialog } from './RunResultDialog';
import { ScriptEditor } from './ScriptEditor';

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
  searchTestCases,
  clearAllSelections
} from './utils/testCaseHelpers';

// Workspace
import { 
  initializeDefaultWorkspace, 
  loadCases, 
  saveCase, 
  getLastOpenedTestCase, 
  setLastOpenedTestCase 
} from './workspace';

// Event Bus
import { eventBus, EVENTS } from '@/lib/eventBus';

// Types
import { TestCase, TestCommand } from './types';
import { Script } from './types/ScriptTypes';

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

export const TestCaseManagerRefactored: React.FC<TestCaseManagerProps> = ({
  connectedPorts,
  receivedData,
  statusMessages
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  
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
      // 更新命令状态
      const updatedCases = state.testCases.map(tc => 
        tc.id === caseId 
          ? { 
              ...tc, 
              commands: tc.commands.map((cmd, idx) => 
                idx === commandIndex ? { ...cmd, ...updates } : cmd
              ) 
            }
          : tc
      );
      setTestCases(updatedCases);
    },
    onCaseUpdate: (caseId, updates) => {
      // 更新用例状态
      const updatedCases = state.testCases.map(tc => 
        tc.id === caseId ? { ...tc, ...updates } : tc
      );
      setTestCases(updatedCases);
    }
  });

  // 使用拖拽Hook
  const dragDrop = useTestCaseDragDrop({
    testCases: state.testCases,
    setTestCases,
    setDragInfo
  });

  // Track running test cases to prevent race conditions
  const runningCasesRef = useRef<Set<string>>(new Set());

  // AT命令库
  const atCommands = [
    'AT', 'AT+CGMR', 'AT+CGMI', 'AT+CGSN', 'AT+CSQ', 'AT+CREG', 'AT+COPS',
    'AT+CGATT', 'AT+CGACT', 'AT+CGDCONT', 'AT+CPINR', 'AT+CPIN', 'AT+CCID'
  ];

  // 初始化工作空间和加载测试用例
  useEffect(() => {
    const initWorkspace = async () => {
      try {
        const workspace = await initializeDefaultWorkspace();
        setCurrentWorkspace(workspace);
        const cases = await loadCases();
        setTestCases(Array.isArray(cases) ? cases : []);
        
        // 加载最后打开的测试用例
        const lastTestCaseId = getLastOpenedTestCase();
        if (lastTestCaseId) {
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
    const unsubscribe = eventBus.subscribe(EVENTS.SERIAL_DATA_RECEIVED, (event) => {
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

  // 核心功能函数
  const handleSelectTestCase = (caseId: string) => {
    setSelectedTestCaseId(caseId);
    const foundCase = state.testCases.find(tc => tc.id === caseId) || null;
    setSelectedCase(foundCase);
    
    if (foundCase) {
      setLastOpenedTestCase(foundCase.uniqueId);
    }
  };

  const handleToggleExpand = (caseId: string) => {
    const updatedCases = state.testCases.map(tc => 
      tc.id === caseId ? { ...tc, isExpanded: !tc.isExpanded } : tc
    );
    setTestCases(updatedCases);
  };

  const handleToggleSelection = (caseId: string, type: 'case' | 'command', itemId: string, selected: boolean) => {
    if (type === 'case') {
      const updatedCases = state.testCases.map(tc => 
        tc.id === caseId ? { ...tc, selected } : tc
      );
      setTestCases(updatedCases);
    } else if (type === 'command') {
      // 更新命令选择状态
      const updatedCases = state.testCases.map(tc => ({
        ...tc,
        commands: tc.commands.map(cmd => 
          cmd.id === itemId ? { ...cmd, selected } : cmd
        )
      }));
      setTestCases(updatedCases);
    }
  };

  const handleRunTestCase = async (caseId: string) => {
    const testCase = state.testCases.find(tc => tc.id === caseId);
    if (!testCase) return;

    // 如果正在运行，则暂停
    if (runningCasesRef.current.has(caseId)) {
      runningCasesRef.current.delete(caseId);
      const updatedCases = state.testCases.map(tc => 
        tc.id === caseId ? { ...tc, isRunning: false, status: 'pending' } : tc
      );
      setTestCases(updatedCases);
      statusMessages?.addMessage(`测试用例 "${testCase.name}" 已暂停`, 'warning');
      return;
    }

    runningCasesRef.current.add(caseId);
    
    // 清空存储的参数和触发状态
    setStoredParameters({});
    setTriggeredUrcIds(new Set());
    
    // 更新状态为运行中
    const updatedCases = state.testCases.map(tc => 
      tc.id === caseId ? { ...tc, isRunning: true, status: 'running', currentCommand: 0 } : tc
    );
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

  const handleEditCase = (testCase: TestCase) => {
    setEditingCase(testCase);
    setIsEditDialogOpen(true);
  };

  const handleAddCommand = (caseId: string) => {
    const newCommand = createNewCommand();
    const updatedCases = state.testCases.map(tc => 
      tc.id === caseId 
        ? { ...tc, commands: [...tc.commands, newCommand] }
        : tc
    );
    setTestCases(updatedCases);
  };

  const handleAddUrc = (caseId: string) => {
    const newCommand = createNewCommand({
      type: 'urc',
      command: '',
      urcPattern: '+URC:',
      validationMethod: 'contains'
    });
    const updatedCases = state.testCases.map(tc => 
      tc.id === caseId 
        ? { ...tc, commands: [...tc.commands, newCommand] }
        : tc
    );
    setTestCases(updatedCases);
  };

  const handleAddSubCase = (caseId: string) => {
    const newSubCase = createNewTestCase({
      name: '新建子用例'
    });
    const updatedCases = state.testCases.map(tc => 
      tc.id === caseId 
        ? { ...tc, subCases: [...tc.subCases, newSubCase] }
        : tc
    );
    setTestCases(updatedCases);
  };

  const handleDeleteCommand = (caseId: string, commandId: string) => {
    const updatedCases = state.testCases.map(tc => 
      tc.id === caseId 
        ? { ...tc, commands: tc.commands.filter(cmd => cmd.id !== commandId) }
        : tc
    );
    setTestCases(updatedCases);
  };

  const handleDeleteSubCase = (caseId: string, subCaseId: string) => {
    const updatedCases = state.testCases.map(tc => 
      tc.id === caseId 
        ? { ...tc, subCases: tc.subCases.filter(sub => sub.id !== subCaseId) }
        : tc
    );
    setTestCases(updatedCases);
  };

  const handleInlineEditStart = (commandId: string, value: string) => {
    setInlineEdit({ commandId, value });
  };

  const handleInlineEditSave = (caseId: string, commandId: string) => {
    const updatedCases = state.testCases.map(tc => 
      tc.id === caseId 
        ? {
            ...tc,
            commands: tc.commands.map(cmd => 
              cmd.id === commandId ? { ...cmd, command: state.inlineEdit.value } : cmd
            )
          }
        : tc
    );
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

  // 渲染主组件
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/30 max-w-full overflow-hidden">
      {/* 头部区域 */}
      <div className="flex-shrink-0 p-2 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        {state.currentScript ? (
          // 脚本头部
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  {state.currentScript.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {state.currentScript.description || '无描述'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          // 测试用例头部
          <>
            <div className="flex items-center justify-between mb-2">
              <TestCaseHeader 
                currentTestCase={visibleRootCase} 
                onUpdateCase={(updates) => {
                  if (visibleRootCase) {
                    const updatedCases = state.testCases.map(tc => 
                      tc.id === visibleRootCase.id ? { ...tc, ...updates } : tc
                    );
                    setTestCases(updatedCases);
                  }
                }}
              />
            </div>
            
            <TestCaseActions 
              currentTestCase={getTargetCaseForActions(state.selectedCase, state.testCases)}
              testCases={state.testCases}
              setTestCases={setTestCases}
              connectedPorts={connectedPorts}
              onEditCase={handleEditCase}
              onRunTestCase={handleRunTestCase}
              onSelectTestCase={handleSelectTestCase}
              hasSelectedItems={hasSelected}
            />
          </>
        )}
      </div>

      {/* 内容区域 */}
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
        <div className="flex-1 min-h-0 overflow-y-auto p-2">          
          {/* 参数显示面板 */}
          {Object.keys(state.storedParameters).length > 0 && (
            <VariableDisplay
              storedParameters={state.storedParameters}
              onClearParameter={(key) => {
                setStoredParameters(prev => {
                  const newParams = { ...prev };
                  delete newParams[key];
                  return newParams;
                });
              }}
              onClearAll={() => setStoredParameters({})}
            />
          )}
          
          {/* 测试用例树形视图 */}
          <div className="border border-border rounded-lg bg-card">
            <div className="divide-y divide-border">
              {state.testCases.map((testCase) => (
                <div key={testCase.id} className="select-none">
                  {/* 测试用例头部 */}
                  <div
                    className={`flex items-center gap-2 p-3 border-b border-border/50 last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer ${
                      testCase.selected ? 'bg-primary/10' : ''
                    } ${
                      testCase.isRunning ? 'bg-yellow-50 dark:bg-yellow-950 animate-pulse' : ''
                    }`}
                    onClick={() => handleToggleExpand(testCase.id)}
                    onContextMenu={(e) => handleContextMenu(e, testCase.id, 'case')}
                  >
                    {/* 这里可以添加更复杂的树形视图组件 */}
                    <span className="font-medium text-sm truncate">{testCase.name}</span>
                  </div>
                  
                  {/* 子内容 */}
                  {testCase.isExpanded && (
                    <div className="bg-muted/30 border-l-2 border-primary/30 ml-4">
                      {/* 命令列表 */}
                      {testCase.commands.map((command, index) => (
                        <div key={command.id} className="p-2 border-b border-border/50 last:border-b-0">
                          <span className="text-sm">{command.command}</span>
                        </div>
                      ))}
                      
                      {/* 子用例列表 */}
                      {testCase.subCases.map((subCase) => (
                        <div key={subCase.id} className="p-2 border-b border-border/50 last:border-b-0">
                          <span className="text-sm">{subCase.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 运行结果对话框 */}
      {state.showRunResult && state.runResult && (
        <RunResultDialog
          result={state.runResult}
          open={state.showRunResult}
          onOpenChange={(open) => setShowRunResult(open)}
        />
      )}

      {/* 用户操作对话框 */}
      {state.userActionDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">执行确认</h3>
            <p className="text-sm text-muted-foreground mb-4">{state.userActionDialog.promptText}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={state.userActionDialog.onCancel}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted"
              >
                取消
              </button>
              <button
                onClick={state.userActionDialog.onConfirm}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 失败处理对话框 */}
      {state.failurePromptDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">命令执行失败</h3>
            <p className="text-sm text-muted-foreground mb-4">{state.failurePromptDialog.promptText}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={state.failurePromptDialog.onStop}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted"
              >
                停止
              </button>
              <button
                onClick={state.failurePromptDialog.onContinue}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                继续
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestCaseManagerRefactored;