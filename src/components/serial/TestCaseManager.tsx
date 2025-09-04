import React, { useState, useEffect, useRef } from 'react';
import { Plus, Play, Pause, Save, Upload, Trash2, Settings, ChevronRight, ChevronDown, CheckCircle, XCircle, Clock, AlertTriangle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { toast } from '@/hooks/use-toast';
import { TestCase, TestCommand, ExecutionResult, ContextMenuState } from './types';
import { ExecutionEditor } from './editors/ExecutionEditor';
import { UrcEditor } from './editors/UrcEditor';
import { RunResultDialog } from './RunResultDialog';
import { TestCaseHeader } from './TestCaseHeader';
import { TestCaseActions } from './TestCaseActions';
import { TestCaseSwitcher } from './TestCaseSwitcher';
import { useStatusMessages } from '@/hooks/useStatusMessages';
import { eventBus, EVENTS, SerialDataEvent } from '@/lib/eventBus';
import { 
  initializeDefaultWorkspace, 
  loadCases, 
  saveCase, 
  scheduleAutoSave 
} from './workspace';

interface TestCaseManagerProps {
  connectedPorts: any[];
  receivedData: string[];
}

interface TestRunResult {
  testCaseId: string;
  testCaseName: string;
  status: 'success' | 'failed' | 'partial';
  startTime: Date;
  endTime: Date;
  duration: number;
  totalCommands: number;
  passedCommands: number;
  failedCommands: number;
  warnings: number;
  errors: number;
  failureLogs: Array<{
    commandIndex: number;
    commandText: string;
    error: string;
    timestamp: Date;
  }>;
}

const TestCaseManager: React.FC<TestCaseManagerProps> = ({
  connectedPorts,
  receivedData
}) => {
  // State management
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [runResult, setRunResult] = useState<TestRunResult | null>(null);
  const [showRunResult, setShowRunResult] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetId: '',
    targetType: 'case'
  });
  
  // Editing states
  const [editingCommand, setEditingCommand] = useState<TestCommand | null>(null);
  const [showExecutionEditor, setShowExecutionEditor] = useState(false);
  const [showUrcEditor, setShowUrcEditor] = useState(false);
  
  // Execution states
  const [executingCommand, setExecutingCommand] = useState<{
    caseId: string | null;
    commandIndex: number | null;
  }>({ caseId: null, commandIndex: null });
  
  // URC and parameter management
  const [storedParameters, setStoredParameters] = useState<{[key: string]: string}>({});
  const [triggeredUrcIds, setTriggeredUrcIds] = useState<Set<string>>(new Set());
  
  // Refs
  const runningCasesRef = useRef<Set<string>>(new Set());
  
  // Hooks
  const statusMessages = useStatusMessages();

  // Initialize workspace
  useEffect(() => {
    const initWorkspace = async () => {
      try {
        await initializeDefaultWorkspace();
        const savedCases = await loadCases();
        setTestCases(savedCases);
        
        // Set first case as selected if no case is selected
        if (savedCases.length > 0 && !selectedCase) {
          setSelectedCase(savedCases[0]);
        }
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
        statusMessages?.addMessage('工作空间初始化失败', 'error');
      }
    };
    
    initWorkspace();
  }, []);

// ... keep existing code (auto-save when test cases change)

  // Utility functions
  const generateUniqueId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const findTestCaseById = (id: string): TestCase | null => {
    for (const testCase of testCases) {
      if (testCase.id === id) return testCase;
      for (const subCase of testCase.subCases) {
        const found = findSubCaseById(subCase, id);
        if (found) return found;
      }
    }
    return null;
  };
  
  const findSubCaseById = (testCase: TestCase, id: string): TestCase | null => {
    if (testCase.id === id) return testCase;
    for (const subCase of testCase.subCases) {
      const found = findSubCaseById(subCase, id);
      if (found) return found;
    }
    return null;
  };

  const updateCaseById = (cases: TestCase[], id: string, updater: (tc: TestCase) => TestCase): TestCase[] => {
    return cases.map(testCase => {
      if (testCase.id === id) {
        return updater(testCase);
      }
      if (testCase.subCases.length > 0) {
        return {
          ...testCase,
          subCases: updateCaseById(testCase.subCases, id, updater)
        };
      }
      return testCase;
    });
  };

  // Variable substitution
  const substituteVariables = (text: string): string => {
    let result = text;
    Object.entries(storedParameters).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });
    return result;
  };

  // Command execution
  const runCommand = async (command: TestCommand, commandIndex: number, caseId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Update command status to running
      const updatedCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        commands: tc.commands.map((cmd, idx) => 
          cmd.id === command.id ? { ...cmd, status: 'running' } : cmd
        )
      }));
      setTestCases(updatedCases);
      setExecutingCommand({ caseId, commandIndex });

      // Substitute variables in command
      const processedCommand = substituteVariables(command.command);

      // Execute the command based on type
      if (command.type === 'execution') {
        // Send command via event bus
        eventBus.emit(EVENTS.SEND_COMMAND, {
          command: processedCommand,
          format: command.dataFormat === 'hex' ? 'hex' : 'utf8',
          lineEnding: command.lineEnding,
          targetPort: 'ALL'
        });

        // Wait for response or timeout
        const timeout = command.timeout || 5000;
        const maxAttempts = command.maxAttempts || 1;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, timeout));
          
          // Simple validation for now - in real implementation, you'd check actual responses
          const success = Math.random() > 0.3; // Simulate success/failure
          
          if (success || attempt === maxAttempts) {
            const finalUpdatedCases = updateCaseById(testCases, caseId, (tc) => ({
              ...tc,
              commands: tc.commands.map((cmd) => 
                cmd.id === command.id ? { 
                  ...cmd, 
                  status: success ? 'success' : 'failed' 
                } : cmd
              )
            }));
            setTestCases(finalUpdatedCases);
            
            return { 
              success, 
              error: success ? undefined : command.failureMessage || '命令执行失败'
            };
          }
        }
      }

      return { success: true };
    } catch (error) {
      // Update command status to failed
      const failedUpdatedCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        commands: tc.commands.map((cmd) => 
          cmd.id === command.id ? { ...cmd, status: 'failed' } : cmd
        )
      }));
      setTestCases(failedUpdatedCases);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  };

  // Main execution function
  const runAutoMode = async (caseId: string) => {
    const testCase = findTestCaseById(caseId);
    if (!testCase) return;

    // Toggle pause/resume
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

    // Start execution
    runningCasesRef.current.add(caseId);
    setStoredParameters({});
    setTriggeredUrcIds(new Set());
    
    const updatedTestCases = updateCaseById(testCases, caseId, (tc) => ({
      ...tc,
      isRunning: true,
      status: 'running',
      currentCommand: 0
    }));
    setTestCases(updatedTestCases);
    
    statusMessages?.addMessage(`开始执行测试用例: ${testCase.name}`, 'info');

    // Execution statistics
    const startTime = new Date();
    let passedCommands = 0;
    let failedCommands = 0;
    let warnings = 0;
    let errors = 0;
    const failureLogs: TestRunResult['failureLogs'] = [];

    // Get commands to run
    const selectedCommands = testCase.commands.filter(cmd => cmd.selected);
    const commandsToRun = selectedCommands.length > 0 ? selectedCommands : testCase.commands;
    const runCount = testCase.runCount || 1;
    
    try {
      // Execute for specified number of runs
      for (let i = 0; i < runCount; i++) {
        if (!runningCasesRef.current.has(caseId)) {
          setExecutingCommand({ caseId: null, commandIndex: null });
          return;
        }

        if (runCount > 1) {
          toast({
            title: `第 ${i + 1} 次执行`,
            description: `执行测试用例: ${testCase.name} (${i + 1}/${runCount})`,
          });
        }

        // Execute commands sequentially
        for (let j = 0; j < commandsToRun.length; j++) {
          if (!runningCasesRef.current.has(caseId)) {
            setExecutingCommand({ caseId: null, commandIndex: null });
            return;
          }

          const command = commandsToRun[j];
          const commandIndex = testCase.commands.indexOf(command);
          
          // Handle user confirmation if required
          if (command.requiresUserAction) {
            const shouldContinue = await new Promise<boolean>((resolve) => {
              const userConfirmed = window.confirm(
                `即将执行命令: ${command.command}\n${command.userPrompt || ''}\n\n是否继续？`
              );
              resolve(userConfirmed);
            });
            
            if (!shouldContinue) {
              statusMessages?.addMessage(`测试用例执行已停止 (用户取消)`, 'warning');
              failureLogs.push({
                commandIndex,
                commandText: command.command,
                error: '用户取消执行',
                timestamp: new Date()
              });
              failedCommands++;
              break;
            }
          }

          // Execute command
          const commandResult = await runCommand(command, commandIndex, caseId);
          
          // Handle result
          if (!commandResult.success) {
            const testCaseValidationLevel = testCase.validationLevel || 'error';
            const commandFailureSeverity = command.failureSeverity || 'error';
            
            const shouldTreatAsFailed = testCaseValidationLevel === 'error' || commandFailureSeverity === 'error';
            
            if (shouldTreatAsFailed) {
              failedCommands++;
              const failureHandling = testCase.failureHandling || 'stop';
              
              if (failureHandling === 'stop') {
                statusMessages?.addMessage(`测试用例执行已停止 (命令失败)`, 'error');
                failureLogs.push({
                  commandIndex,
                  commandText: command.command,
                  error: commandResult.error || '命令执行失败',
                  timestamp: new Date()
                });
                
                if (commandFailureSeverity === 'error') {
                  errors++;
                } else {
                  warnings++;
                }
                break;
              } else if (failureHandling === 'prompt') {
                const shouldContinue = window.confirm(
                  `命令执行失败: ${command.command}\n错误: ${commandResult.error || '未知错误'}\n\n是否继续执行？`
                );
                
                if (!shouldContinue) {
                  statusMessages?.addMessage(`测试用例执行已停止 (用户选择停止)`, 'warning');
                  failureLogs.push({
                    commandIndex,
                    commandText: command.command,
                    error: commandResult.error || '用户选择停止执行',
                    timestamp: new Date()
                  });
                  
                  if (commandFailureSeverity === 'error') {
                    errors++;
                  } else {
                    warnings++;
                  }
                  break;
                }
                
                statusMessages?.addMessage(`命令失败，用户选择继续执行`, 'warning');
                failureLogs.push({
                  commandIndex,
                  commandText: command.command,
                  error: commandResult.error || '命令执行失败，用户选择继续',
                  timestamp: new Date()
                });
                
                if (commandFailureSeverity === 'error') {
                  errors++;
                } else {
                  warnings++;
                }
              }
            } else {
              statusMessages?.addMessage(
                `命令出现${commandFailureSeverity}但根据校验等级(${testCaseValidationLevel})继续执行: ${command.command}`, 
                'info'
              );
              
              errors++;
              passedCommands++;
            }
          } else {
            passedCommands++;
          }
          
          // Wait between commands
          if (command.waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, command.waitTime));
          }
        }
      }
      
      // Execution completed
      runningCasesRef.current.delete(caseId);
      setExecutingCommand({ caseId: null, commandIndex: null });
      
      const finalStatus = failedCommands === 0 ? 'success' : 
                         passedCommands === 0 ? 'failed' : 'partial';
      
      const finalTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: finalStatus
      }));
      setTestCases(finalTestCases);

      // Create execution result
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

      setRunResult(result);
      setShowRunResult(true);

      statusMessages?.addMessage(
        `测试用例 "${testCase.name}" 执行完成`, 
        finalStatus === 'success' ? 'success' : 'warning'
      );
    } catch (error) {
      // Handle execution error
      runningCasesRef.current.delete(caseId);
      setExecutingCommand({ caseId: null, commandIndex: null });
      
      const errorTestCases = updateCaseById(testCases, caseId, (tc) => ({
        ...tc,
        isRunning: false,
        status: 'failed'
      }));
      setTestCases(errorTestCases);

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
        failedCommands: failedCommands + 1,
        warnings,
        errors: errors + 1,
        failureLogs: [
          ...failureLogs,
          {
            commandIndex: -1,
            commandText: '执行异常',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date()
          }
        ]
      };

      setRunResult(errorResult);
      setShowRunResult(true);
      statusMessages?.addMessage(`测试用例执行异常: ${error}`, 'error');
    } finally {
      runningCasesRef.current.delete(caseId);
      setExecutingCommand({ caseId: null, commandIndex: null });
    }
  };

  // Test case management
  const handleAddTestCase = () => {
    const newCase: TestCase = {
      id: generateUniqueId(),
      uniqueId: `TC${Date.now()}`,
      name: '新测试用例',
      description: '',
      commands: [],
      subCases: [],
      isExpanded: true,
      isRunning: false,
      currentCommand: -1,
      selected: false,
      status: 'pending',
      failureHandling: 'stop',
      validationLevel: 'error',
      runMode: 'auto',
      runCount: 1
    };
    
    setTestCases([...testCases, newCase]);
    setSelectedCase(newCase);
  };

  const handleEditCase = (testCase: TestCase) => {
    setEditingCase({ ...testCase });
    setShowEditDialog(true);
  };

  const handleSaveCase = () => {
    if (!editingCase) return;
    
    const updatedCases = updateCaseById(testCases, editingCase.id, () => editingCase);
    setTestCases(updatedCases);
    
    if (selectedCase?.id === editingCase.id) {
      setSelectedCase(editingCase);
    }
    
    setShowEditDialog(false);
    setEditingCase(null);
  };

  const handleDeleteCase = (caseId: string) => {
    const filteredCases = testCases.filter(tc => tc.id !== caseId);
    setTestCases(filteredCases);
    
    if (selectedCase?.id === caseId) {
      setSelectedCase(filteredCases.length > 0 ? filteredCases[0] : null);
    }
  };

  // Command management
  const handleAddCommand = (type: 'execution' | 'urc') => {
    if (!selectedCase) return;
    
    const newCommand: TestCommand = {
      id: generateUniqueId(),
      type,
      command: '',
      validationMethod: 'none',
      waitTime: 1000,
      maxAttempts: 1,
      failureSeverity: 'error',
      lineEnding: 'crlf',
      selected: false,
      status: 'pending'
    };
    
    setEditingCommand(newCommand);
    if (type === 'execution') {
      setShowExecutionEditor(true);
    } else {
      setShowUrcEditor(true);
    }
  };

  const handleSaveCommand = (command: TestCommand) => {
    if (!selectedCase) return;
    
    const updatedCase = {
      ...selectedCase,
      commands: selectedCase.commands.some(cmd => cmd.id === command.id)
        ? selectedCase.commands.map(cmd => cmd.id === command.id ? command : cmd)
        : [...selectedCase.commands, command]
    };
    
    const updatedCases = updateCaseById(testCases, selectedCase.id, () => updatedCase);
    setTestCases(updatedCases);
    setSelectedCase(updatedCase);
    
    setShowExecutionEditor(false);
    setShowUrcEditor(false);
    setEditingCommand(null);
  };

  // Render functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'partial': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <div className="w-4 h-4" />;
    }
  };

  const renderTestCase = (testCase: TestCase) => (
    <div key={testCase.id} className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const updatedCases = updateCaseById(testCases, testCase.id, (tc) => ({
                ...tc,
                isExpanded: !tc.isExpanded
              }));
              setTestCases(updatedCases);
            }}
          >
            {testCase.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
          {getStatusIcon(testCase.status)}
          <span className="font-medium">{testCase.name}</span>
          {testCase.isRunning && <Clock className="w-4 h-4 text-blue-500 animate-spin" />}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runAutoMode(testCase.id)}
            disabled={testCase.commands.length === 0}
          >
            {testCase.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {testCase.isRunning ? '暂停' : '运行'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditCase(testCase)}
          >
            <Settings className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteCase(testCase.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {testCase.isExpanded && (
        <div className="ml-6 space-y-2">
          {testCase.commands.map((command, index) => (
            <div key={command.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  checked={command.selected}
                  onCheckedChange={(checked) => {
                    const updatedCase = {
                      ...testCase,
                      commands: testCase.commands.map(cmd => 
                        cmd.id === command.id ? { ...cmd, selected: !!checked } : cmd
                      )
                    };
                    const updatedCases = updateCaseById(testCases, testCase.id, () => updatedCase);
                    setTestCases(updatedCases);
                    if (selectedCase?.id === testCase.id) {
                      setSelectedCase(updatedCase);
                    }
                  }}
                />
                {getStatusIcon(command.status)}
                <span className="text-sm font-mono">{command.command}</span>
                <span className="text-xs text-gray-500">({command.type})</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingCommand(command);
                  if (command.type === 'execution') {
                    setShowExecutionEditor(true);
                  } else {
                    setShowUrcEditor(true);
                  }
                }}
              >
                <Settings className="w-3 h-3" />
              </Button>
            </div>
          ))}
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddCommand('execution')}
            >
              <Plus className="w-4 h-4 mr-1" />
              添加执行命令
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddCommand('urc')}
            >
              <Plus className="w-4 h-4 mr-1" />
              添加URC监听
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">测试用例管理</h2>
        <Button onClick={handleAddTestCase}>
          <Plus className="w-4 h-4 mr-2" />
          新建测试用例
        </Button>
      </div>

      {/* Test Cases List */}
      <div className="flex-1 overflow-auto space-y-4">
        {testCases.map(renderTestCase)}
        {testCases.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            暂无测试用例，点击"新建测试用例"开始创建
          </div>
        )}
      </div>

      {/* Edit Case Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑测试用例</DialogTitle>
          </DialogHeader>
          
          {editingCase && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="caseName">用例名称</Label>
                <Input
                  id="caseName"
                  value={editingCase.name}
                  onChange={(e) => setEditingCase({...editingCase, name: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="caseDescription">用例描述</Label>
                <Textarea
                  id="caseDescription"
                  value={editingCase.description}
                  onChange={(e) => setEditingCase({...editingCase, description: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="failureHandling">失败处理</Label>
                  <Select
                    value={editingCase.failureHandling}
                    onValueChange={(value: 'stop' | 'continue' | 'prompt') => 
                      setEditingCase({...editingCase, failureHandling: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stop">停止执行</SelectItem>
                      <SelectItem value="continue">继续执行</SelectItem>
                      <SelectItem value="prompt">询问用户</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="validationLevel">校验等级</Label>
                  <Select
                    value={editingCase.validationLevel}
                    onValueChange={(value: 'warning' | 'error') => 
                      setEditingCase({...editingCase, validationLevel: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warning">警告</SelectItem>
                      <SelectItem value="error">错误</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="runCount">运行次数</Label>
                <Input
                  id="runCount"
                  type="number"
                  min="1"
                  value={editingCase.runCount || 1}
                  onChange={(e) => setEditingCase({...editingCase, runCount: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveCase}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Command Editors */}
      {showExecutionEditor && editingCommand && (
        <ExecutionEditor
          command={editingCommand}
          onUpdate={(updates) => {
            const updatedCommand = { ...editingCommand, ...updates };
            handleSaveCommand(updatedCommand);
          }}
        />
      )}

      {showUrcEditor && editingCommand && (
        <UrcEditor
          command={editingCommand}
          onUpdate={(updates) => {
            const updatedCommand = { ...editingCommand, ...updates };
            handleSaveCommand(updatedCommand);
          }}
        />
      )}

      {/* Run Result Dialog */}
      {runResult && (
        <RunResultDialog
          result={runResult}
          isOpen={showRunResult}
          onClose={() => setShowRunResult(false)}
        />
      )}
    </div>
  );
};

export default TestCaseManager;